import { tauriWindowManager } from './tauriWindowManager';
import {
  NormalizedStats,
  NormalizedAction,
  NormalizedTrait,
} from '../types/systemDataTypes';

export interface SystemReferenceSearchItem {
  id: string;
  systemId: string;
  systemName: string;
  name: string;
  originalName?: string;
  category: string;
  format: string;
  summary: string;
  snippet?: string;
  score: number;
  matchType: string;
  tags: string[];
  relativePath: string;
  img?: string;
  tokenImg?: string;
  stats?: NormalizedStats;
  actions?: NormalizedAction[];
  traits?: NormalizedTrait[];
  spells?: Array<{ name: string; level?: number; school?: string; description?: string }>;
  items?: Array<{ name: string; quantity?: number; weight?: number; description?: string }>;
  tableData?: {
    headers?: string[];
    rows?: string[][];
    formula?: string;
    results?: Array<{ range: [number, number]; text: string }>;
  };
  data?: any;
}

export interface SystemReferenceSearchResult {
  success: boolean;
  query: string;
  totalMatches: number;
  elapsedMs: number;
  engine: string;
  categoryCounts: Record<string, number>;
  results: SystemReferenceSearchItem[];
}

export interface SearchOptions {
  query: string;
  systemId?: string;
  category?: string;
  limit?: number;
}

class RustSystemSearchService {
  private memoryCache: Map<string, { result: SystemReferenceSearchResult; timestamp: number }> = new Map();
  private customMemoryRuleRegistry: Map<string, SystemReferenceSearchItem> = new Map();
  private cacheTTL = 15000; // 15 seconds

  public isRustAvailable(): boolean {
    return tauriWindowManager.isTauri();
  }

  public clearCache(): void {
    this.memoryCache.clear();
  }

  public registerRuleItem(item: SystemReferenceSearchItem): void {
    if (!item.id) return;
    this.customMemoryRuleRegistry.set(item.id, item);
    this.clearCache();
  }

  public registerRuleBatch(items: SystemReferenceSearchItem[]): void {
    items.forEach((item) => {
      if (item.id) this.customMemoryRuleRegistry.set(item.id, item);
    });
    this.clearCache();
  }

  public getRuleItemById(id: string): SystemReferenceSearchItem | undefined {
    return this.customMemoryRuleRegistry.get(id);
  }

  /**
   * High-speed search with Rust Tauri Native Execution & TS Fallback
   */
  public async search(options: SearchOptions): Promise<SystemReferenceSearchResult> {
    const cacheKey = `${options.query}_${options.systemId || 'all'}_${options.category || 'all'}_${options.limit || 60}`;
    const cached = this.memoryCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.result;
    }

    const startTime = performance.now();
    const q = (options.query || '').trim().toLowerCase();

    // Filter local memory registry items matching query
    const memoryMatches: SystemReferenceSearchItem[] = [];
    if (this.customMemoryRuleRegistry.size > 0) {
      for (const item of this.customMemoryRuleRegistry.values()) {
        if (options.systemId && options.systemId !== 'all' && item.systemId !== options.systemId) continue;
        if (options.category && options.category !== 'all' && item.category !== options.category) continue;
        if (!q || item.name.toLowerCase().includes(q) || item.summary.toLowerCase().includes(q)) {
          memoryMatches.push(item);
        }
      }
    }

    // 1. Try Native Rust Engine
    if (this.isRustAvailable()) {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        const rustResult: any = await invoke('search_system_reference', {
          query: options.query || '',
          systemId: options.systemId || null,
          category: options.category || null,
          limit: options.limit || 60,
          systemsDir: 'assets/systems',
        });

        if (rustResult && rustResult.success) {
          const merged = [...memoryMatches, ...(rustResult.results || [])];
          const finalResult: SystemReferenceSearchResult = {
            success: true,
            query: rustResult.query || options.query,
            totalMatches: merged.length,
            elapsedMs: rustResult.elapsedMs || Math.round((performance.now() - startTime) * 100) / 100,
            engine: '⚡ Rust Native Engine (Tauri)',
            categoryCounts: rustResult.categoryCounts || {},
            results: merged,
          };

          this.memoryCache.set(cacheKey, { result: finalResult, timestamp: Date.now() });
          return finalResult;
        }
      } catch (rustErr) {
        console.warn('Rust search_system_reference error, falling back to TypeScript:', rustErr);
      }
    }

    // 2. Fallback to TypeScript Node.js backend
    try {
      const params = new URLSearchParams();
      if (options.query) params.append('q', options.query);
      if (options.systemId && options.systemId !== 'all') params.append('systemId', options.systemId);
      if (options.category && options.category !== 'all') params.append('category', options.category);
      if (options.limit) params.append('limit', options.limit.toString());

      const res = await fetch(`/api/systems/search?${params.toString()}`);
      if (res.ok) {
        const tsResult: SystemReferenceSearchResult = await res.json();
        tsResult.results = [...memoryMatches, ...(tsResult.results || [])];
        tsResult.totalMatches = tsResult.results.length;
        tsResult.engine = '⚡ TS Backend Engine (Fallback)';
        this.memoryCache.set(cacheKey, { result: tsResult, timestamp: Date.now() });
        return tsResult;
      }
    } catch (tsErr) {
      console.warn('TypeScript server search fallback error:', tsErr);
    }

    // 3. Emergency fallback if server is offline
    const elapsedMs = Math.round((performance.now() - startTime) * 100) / 100;
    return {
      success: true,
      query: options.query,
      totalMatches: memoryMatches.length,
      elapsedMs,
      engine: 'Local Memory Ingested Registry',
      categoryCounts: {},
      results: memoryMatches,
    };
  }
}

export const rustSystemSearchService = new RustSystemSearchService();
