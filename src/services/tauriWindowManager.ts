/**
 * Tauri Window & Projection Display Manager
 * Controls secondary window lifecycle, multi-monitor projection,
 * and OS-level click-through (mouse pass-through) management.
 */

export interface WindowProjectionConfig {
  clickThrough: boolean;
  fullscreen: boolean;
  alwaysOnTop: boolean;
  isOpen: boolean;
}

type ProjectionCallback = (config: WindowProjectionConfig) => void;

class TauriWindowManager {
  private config: WindowProjectionConfig = {
    clickThrough: false,
    fullscreen: false,
    alwaysOnTop: false,
    isOpen: false,
  };

  private listeners: Set<ProjectionCallback> = new Set();
  private broadcastChannel: BroadcastChannel | null = null;

  constructor() {
    // Initialize cross-tab/window broadcast channel
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.broadcastChannel = new BroadcastChannel('aethermap_window_sync');
        this.broadcastChannel.onmessage = (event) => {
          if (event.data && typeof event.data === 'object' && event.data.type === 'WINDOW_CONFIG_SYNC') {
            this.config = { ...this.config, ...event.data.payload };
            this.notify();
          }
        };
      } catch (e) {
        console.warn('BroadcastChannel not available:', e);
      }
    }

    // Load saved preferences
    if (typeof window !== 'undefined') {
      const savedCt = localStorage.getItem('aethermap_click_through');
      if (savedCt !== null) {
        this.config.clickThrough = savedCt === 'true';
      }
    }

    // Listen for Tauri native events if inside Tauri runtime
    this.initTauriListeners();
  }

  private async initTauriListeners() {
    if (typeof window === 'undefined') return;
    try {
      // @ts-ignore
      if (window.__TAURI_INTERNALS__) {
        const { listen } = await import('@tauri-apps/api/event');
        await listen<boolean>('player-click-through-changed', (event) => {
          this.config.clickThrough = event.payload;
          localStorage.setItem('aethermap_click_through', String(event.payload));
          this.notify();
        });

        await listen('player-click-through-toggle', () => {
          this.setClickThrough(!this.config.clickThrough);
        });
      }
    } catch (e) {
      console.warn('Tauri event listener setup skipped:', e);
    }
  }

  public isTauri(): boolean {
    if (typeof window === 'undefined') return false;
    // @ts-ignore
    return !!(window.__TAURI_INTERNALS__ || (window as any).__TAURI__);
  }

  public getConfig(): WindowProjectionConfig {
    return { ...this.config };
  }

  public subscribe(callback: ProjectionCallback): () => void {
    this.listeners.add(callback);
    callback(this.getConfig());
    return () => this.listeners.delete(callback);
  }

  private notify() {
    const cfg = this.getConfig();
    this.listeners.forEach((cb) => {
      try {
        cb(cfg);
      } catch (err) {
        console.error('Error in window manager listener:', err);
      }
    });

    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage({
          type: 'WINDOW_CONFIG_SYNC',
          payload: cfg,
        });
      } catch (e) {
        // ignore
      }
    }
  }

  /**
   * Opens the secondary player projection window on desktop or browser
   */
  public async openPlayerWindow(customUrl: string = '/?view=player'): Promise<boolean> {
    this.config.isOpen = true;
    this.notify();

    if (this.isTauri()) {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        await invoke('open_player_window', { clickThrough: this.config.clickThrough });
        return true;
      } catch (err) {
        console.warn('Tauri open_player_window failed, fallback to WebviewWindow:', err);
        try {
          const { WebviewWindow } = await import('@tauri-apps/api/webviewWindow');
          const win = new WebviewWindow('player', {
            url: customUrl,
            title: 'AetherMap - Player Projection Display',
            width: 1920,
            height: 1080,
            transparent: true,
          });
          if (this.config.clickThrough) {
            await win.setIgnoreCursorEvents(true);
          }
          return true;
        } catch (e) {
          console.error('WebviewWindow creation error:', e);
        }
      }
    }

    // Web Fallback: open popup window
    if (typeof window !== 'undefined') {
      const targetUrl = window.location.origin
        ? `${window.location.origin}${customUrl}`
        : customUrl;
      const opened = window.open(
        targetUrl,
        'AetherMapPlayerWindow',
        'width=1920,height=1080,menubar=no,toolbar=no,location=no,status=no'
      );
      return !!opened;
    }

    return false;
  }

  /**
   * Enables or disables Click-Through mode (Mouse Pass-Through)
   * When true, all mouse clicks pass through the player window to the desktop/table beneath it.
   */
  public async setClickThrough(enabled: boolean): Promise<boolean> {
    this.config.clickThrough = enabled;
    if (typeof window !== 'undefined') {
      localStorage.setItem('aethermap_click_through', String(enabled));
    }
    this.notify();

    if (this.isTauri()) {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        await invoke('set_player_click_through', { ignoreCursor: enabled });
        return true;
      } catch (err) {
        console.warn('Rust set_player_click_through error:', err);
        try {
          const { getCurrentWebviewWindow } = await import('@tauri-apps/api/webviewWindow');
          const currentWin = getCurrentWebviewWindow();
          if (currentWin.label === 'player' || currentWin.label === 'player-window') {
            await currentWin.setIgnoreCursorEvents(enabled);
            return true;
          }
        } catch (e) {
          console.error('Direct window setIgnoreCursorEvents failed:', e);
        }
      }
    }

    return true;
  }

  /**
   * Checks if current window is the player projection window
   */
  public isPlayerWindow(): boolean {
    if (typeof window === 'undefined') return false;

    // 1. Check URL path, query params, hash
    const path = window.location.pathname.toLowerCase();
    const search = window.location.search.toLowerCase();
    const hash = window.location.hash.toLowerCase();

    if (
      path === '/player' ||
      path.endsWith('/player') ||
      path.includes('/player') ||
      search.includes('view=player') ||
      search.includes('mode=player') ||
      search.includes('player=true') ||
      hash.includes('player')
    ) {
      return true;
    }

    // 2. Check Tauri window label if available
    try {
      // @ts-ignore
      if (window.__TAURI_METADATA__ && window.__TAURI_METADATA__.__currentWindow) {
        // @ts-ignore
        const label = window.__TAURI_METADATA__.__currentWindow.label;
        if (label === 'player' || label === 'player-window') {
          return true;
        }
      }
    } catch (e) {
      // ignore
    }

    return false;
  }

  /**
   * Toggles click-through mode
   */
  public async toggleClickThrough(): Promise<boolean> {
    return this.setClickThrough(!this.config.clickThrough);
  }
}

export const tauriWindowManager = new TauriWindowManager();
