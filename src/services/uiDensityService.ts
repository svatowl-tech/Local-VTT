export type UiDensityMode = 'auto' | 'compact' | 'comfortable';
export type UiScalePercent = 85 | 90 | 100 | 110;

export interface UiDensitySettings {
  mode: UiDensityMode;
  scale: UiScalePercent;
}

const STORAGE_KEY = 'aethermap_ui_density_settings_v1';

class UiDensityService {
  private settings: UiDensitySettings = {
    mode: 'auto',
    scale: 100,
  };
  private isSmallScreenCached: boolean = false;
  private listeners: Set<(settings: UiDensitySettings, isCompact: boolean) => void> = new Set();

  constructor() {
    this.loadSettings();
    if (typeof window !== 'undefined') {
      this.checkScreenSize();
      window.addEventListener('resize', () => {
        const prevSmall = this.isSmallScreenCached;
        this.checkScreenSize();
        if (prevSmall !== this.isSmallScreenCached && this.settings.mode === 'auto') {
          this.notify();
        }
      });
    }
  }

  private checkScreenSize(): boolean {
    if (typeof window === 'undefined') return false;
    // 720p resolution is 1280x720; 11" laptops often use 1366x768 or 1280x800
    const isSmall = window.innerWidth <= 1366 || window.innerHeight <= 768;
    this.isSmallScreenCached = isSmall;
    return isSmall;
  }

  private loadSettings() {
    if (typeof window === 'undefined') return;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.mode) this.settings.mode = parsed.mode;
        if (parsed.scale) this.settings.scale = parsed.scale;
      }
    } catch (e) {
      console.warn('Failed to load UI density settings:', e);
    }
  }

  private saveSettings() {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings));
    } catch (e) {}
  }

  public getSettings(): UiDensitySettings {
    return { ...this.settings };
  }

  public isCompactActive(): boolean {
    if (this.settings.mode === 'compact') return true;
    if (this.settings.mode === 'comfortable') return false;
    // 'auto' mode
    return this.isSmallScreenCached;
  }

  public setMode(mode: UiDensityMode) {
    this.settings.mode = mode;
    this.saveSettings();
    this.notify();
  }

  public setScale(scale: UiScalePercent) {
    this.settings.scale = scale;
    this.saveSettings();
    this.notify();
  }

  public subscribe(callback: (settings: UiDensitySettings, isCompact: boolean) => void): () => void {
    this.listeners.add(callback);
    callback(this.settings, this.isCompactActive());
    return () => {
      this.listeners.delete(callback);
    };
  }

  private notify() {
    const isCompact = this.isCompactActive();
    this.listeners.forEach((cb) => cb(this.settings, isCompact));
  }
}

export const uiDensityService = new UiDensityService();
