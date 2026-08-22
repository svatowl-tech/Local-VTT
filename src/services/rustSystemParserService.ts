import {
  UniversalParseResult,
  UniversalParsedEntity,
  SystemDataItem,
} from '../types/systemDataTypes';
import { tauriWindowManager } from './tauriWindowManager';

export interface ParseExecutionReport {
  engine: 'rust_tauri' | 'typescript_fallback';
  elapsedMs: number;
  entitiesCount: number;
  formatDescription: string;
}

class RustSystemParserService {
  /**
   * Checks whether the high-performance Tauri Rust native backend is available
   */
  public isRustAvailable(): boolean {
    return tauriWindowManager.isTauri();
  }

  /**
   * Universal Parse Raw Text / JSON / CSV:
   * 1. Runs ultra-fast Rust parsing via Tauri invoke (`parse_system_raw_data`).
   * 2. Falls back to TypeScript parsing engine if Tauri is unavailable or on failure.
   */
  public async parseRawData(options: {
    rawData: string;
    filename?: string;
    formatHint?: string;
    defaultSystem?: string;
    suggestedCategory?: string;
  }): Promise<{ result: UniversalParseResult; report: ParseExecutionReport }> {
    const startTime = performance.now();

    // 1. Try Rust Tauri Parser
    if (this.isRustAvailable()) {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        const rustResult: any = await invoke('parse_system_raw_data', {
          data: options.rawData,
          format: options.formatHint || null,
          filename: options.filename || null,
          defaultSystem: options.defaultSystem || null,
        });

        if (rustResult && (rustResult.success || (rustResult.entities && rustResult.entities.length > 0))) {
          const elapsedMs = Math.round((performance.now() - startTime) * 100) / 100;
          return {
            result: rustResult as UniversalParseResult,
            report: {
              engine: 'rust_tauri',
              elapsedMs,
              entitiesCount: rustResult.entities?.length || 0,
              formatDescription: rustResult.formatDescription || 'Rust Native Parser',
            },
          };
        }
      } catch (rustErr) {
        console.warn('Rust parse_system_raw_data error, switching to TypeScript fallback:', rustErr);
      }
    }

    // 2. TypeScript Fallback via Backend API / Universal Parser
    try {
      const res = await fetch('/api/systems/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rawText: options.rawData,
          filename: options.filename || 'raw-data.txt',
          targetSystemId: options.defaultSystem,
          suggestedCategory: options.suggestedCategory,
        }),
      });

      if (res.ok) {
        const tsResult: UniversalParseResult = await res.json();
        const elapsedMs = Math.round((performance.now() - startTime) * 100) / 100;
        return {
          result: tsResult,
          report: {
            engine: 'typescript_fallback',
            elapsedMs,
            entitiesCount: tsResult.entities?.length || 0,
            formatDescription: tsResult.formatDescription || 'TypeScript Fallback Parser',
          },
        };
      }
    } catch (tsErr) {
      console.warn('TypeScript server parser fallback error:', tsErr);
    }

    // 3. Last-resort simple client-side parser fallback
    const elapsedMs = Math.round((performance.now() - startTime) * 100) / 100;
    const fallbackResult = this.clientSideEmergencyFallback(options.rawData, options.filename, options.defaultSystem);
    return {
      result: fallbackResult,
      report: {
        engine: 'typescript_fallback',
        elapsedMs,
        entitiesCount: fallbackResult.entities.length,
        formatDescription: fallbackResult.formatDescription,
      },
    };
  }

  /**
   * Universal Parse File:
   * Reads file and invokes Rust native parser first, with TS fallback.
   */
  public async parseFile(
    file: File,
    targetSystemId?: string,
    suggestedCategory?: string
  ): Promise<{ result: UniversalParseResult; report: ParseExecutionReport }> {
    const rawText = await file.text();
    return this.parseRawData({
      rawData: rawText,
      filename: file.name,
      defaultSystem: targetSystemId,
      suggestedCategory,
    });
  }

  /**
   * Fast disk scanner in Rust:
   * Scans system directory directly in native Rust when in Tauri, fallback to TS.
   */
  public async scanSystemDirectory(
    systemsDir: string,
    systemId?: string
  ): Promise<SystemDataItem[]> {
    if (this.isRustAvailable()) {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        const rustItems: any = await invoke('scan_and_parse_system_directory', {
          systemsDir,
          systemId: systemId || null,
        });

        if (Array.isArray(rustItems)) {
          return rustItems.map((item) => ({
            id: item.id,
            systemId: item.systemId,
            category: item.category,
            name: item.name,
            source: item.source || 'Rust Disk Scanner',
            format: item.format || 'json',
            fileSize: item.fileSize || 0,
            mtime: item.mtime || Date.now(),
            relativePath: item.relativePath || '',
            summary: item.summary,
            tags: item.tags || [],
            data: item.data,
          }));
        }
      } catch (err) {
        console.warn('Rust scan_and_parse_system_directory error, using TS fallback:', err);
      }
    }

    // Fallback: fetch from TS server
    try {
      const url = systemId
        ? `/api/systems/${encodeURIComponent(systemId)}/items`
        : '/api/systems';
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        return json.items || [];
      }
    } catch (e) {
      console.warn('TS scan fallback error:', e);
    }

    return [];
  }

  /**
   * Fast Disk Import:
   * Writes parsed entities to disk in Rust, fallback to TS server API.
   */
  public async importEntities(
    targetDir: string,
    systemId: string,
    entities: UniversalParsedEntity[]
  ): Promise<{ success: boolean; importedCount: number; errors: string[] }> {
    if (this.isRustAvailable()) {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        const rustImport: any = await invoke('import_parsed_entities_rust', {
          targetDir,
          systemId,
          entities,
        });

        if (rustImport) {
          return {
            success: rustImport.success ?? true,
            importedCount: rustImport.importedCount ?? entities.length,
            errors: rustImport.errors || [],
          };
        }
      } catch (err) {
        console.warn('Rust import_parsed_entities_rust failed, fallback to TS:', err);
      }
    }

    // Fallback TS server endpoint
    try {
      const res = await fetch('/api/systems/import-parsed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemId,
          entities,
        }),
      });

      if (res.ok) {
        const json = await res.json();
        return {
          success: json.success ?? true,
          importedCount: json.importedCount ?? entities.length,
          errors: json.errors || [],
        };
      }
    } catch (e: any) {
      return {
        success: false,
        importedCount: 0,
        errors: [e.message || 'TS Import failed'],
      };
    }

    return {
      success: false,
      importedCount: 0,
      errors: ['Failed to import entities'],
    };
  }

  /**
   * Minimal client-side emergency parser if both Rust and Backend fail
   */
  private clientSideEmergencyFallback(
    rawData: string,
    filename?: string,
    defaultSystem?: string
  ): UniversalParseResult {
    let cleanName = (filename || 'Entity').replace(/\.[^/.]+$/, '').replace(/_/g, ' ');
    let format = 'generic_json';
    let entities: UniversalParsedEntity[] = [];

    try {
      const json = JSON.parse(rawData);
      if (Array.isArray(json)) {
        entities = json.map((item, idx) => ({
          id: `emergency-item-${idx}`,
          name: item.name || `${cleanName} #${idx + 1}`,
          category: item.category || 'general',
          sourceFormat: 'generic_json',
          sourceSystem: defaultSystem,
          summary: 'JSON объект (Client Fallback)',
          tags: ['Fallback', 'JSON'],
          rawContent: item,
          suggestedFilename: `item_${idx + 1}.json`,
        }));
      } else {
        entities = [
          {
            id: 'emergency-item-1',
            name: json.name || cleanName,
            category: json.category || 'general',
            sourceFormat: 'generic_json',
            sourceSystem: defaultSystem,
            summary: 'JSON объект (Client Fallback)',
            tags: ['Fallback', 'JSON'],
            rawContent: json,
            suggestedFilename: `${cleanName.toLowerCase().replace(/\s+/g, '_')}.json`,
          },
        ];
      }
    } catch {
      entities = [
        {
          id: 'emergency-doc-1',
          name: cleanName,
          category: 'rules',
          sourceFormat: 'markdown_doc',
          sourceSystem: defaultSystem,
          summary: rawData.slice(0, 120),
          description: rawData,
          tags: ['Текст', 'Документ'],
          suggestedFilename: `${cleanName.toLowerCase().replace(/\s+/g, '_')}.md`,
        },
      ];
    }

    return {
      success: entities.length > 0,
      sourceFormat: format as any,
      formatDescription: 'Emergency Client-Side Fallback Parser',
      totalEntitiesFound: entities.length,
      entities,
      errors: [],
      warnings: ['Использован аварийный клиентский парсер'],
      stats: {
        charactersCount: 0,
        monstersCount: 0,
        spellsCount: 0,
        itemsCount: 0,
        rulesCount: entities.length,
        tablesCount: 0,
        otherCount: 0,
      },
    };
  }
}

export const rustSystemParserService = new RustSystemParserService();
