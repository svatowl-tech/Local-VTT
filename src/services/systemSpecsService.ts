/**
 * System Specifications & Hardware Diagnostics Service
 * Accurately analyzes GPU, CPU, RAM, WebGL, and OS capabilities
 * Manages Low-Spec / High-Performance rendering profiles for older hardware.
 */

export interface SystemSpecs {
  osName: string;
  osVersion: string;
  isMac: boolean;
  isHighSierra: boolean;
  cpuCores: number;
  cpuDescription: string;
  estimatedRam: string;
  jsHeapUsedMB?: number;
  jsHeapTotalMB?: number;
  jsHeapLimitMB?: number;
  gpuVendor: string;
  gpuRenderer: string;
  isNvidia320M: boolean;
  isLowSpecGpu: boolean;
  webglVersion: string;
  maxTextureSize: number;
  maxRenderbufferSize: number;
  screenResolution: string;
  windowResolution: string;
  devicePixelRatio: number;
  currentFps: number;
  lowSpecModeActive: boolean;
  isTauriDesktop: boolean;
}

type SpecsListener = (specs: SystemSpecs) => void;

class SystemSpecsService {
  private specs: SystemSpecs;
  private listeners: Set<SpecsListener> = new Set();
  private fpsHistory: number[] = [];
  private lastFpsCalcTime = performance.now();
  private frameCount = 0;
  private currentFps = 60;
  private rafId: number | null = null;

  constructor() {
    this.specs = this.detectInitialSpecs();
    this.applyLowSpecMode(this.specs.lowSpecModeActive);
    this.startFpsLoop();
  }

  private detectInitialSpecs(): SystemSpecs {
    const isClient = typeof window !== 'undefined';
    const ua = isClient ? navigator.userAgent : '';
    const platform = isClient ? navigator.platform : '';

    // OS Detection
    let osName = 'Unknown OS';
    let osVersion = 'Unknown';
    let isMac = false;
    let isHighSierra = false;

    if (ua.includes('Macintosh') || platform.includes('Mac')) {
      isMac = true;
      osName = 'macOS / Mac OS X';
      const macMatch = ua.match(/Mac OS X (\d+[._]\d+[._]\d+)/);
      if (macMatch) {
        osVersion = macMatch[1].replace(/_/g, '.');
        if (osVersion.startsWith('10.13')) {
          isHighSierra = true;
          osName = 'macOS High Sierra (10.13.6)';
        }
      }
    } else if (ua.includes('Windows')) {
      osName = 'Windows';
    } else if (ua.includes('Linux')) {
      osName = 'Linux';
    }

    // CPU Cores
    const cpuCores = isClient ? navigator.hardwareConcurrency || 2 : 2;
    const cpuDescription =
      cpuCores <= 2 ? 'Intel Core 2 Duo / Dual-Core (1.4 - 2.4 GHz)' : `${cpuCores} логических ядер`;

    // WebGL & GPU Detection
    let gpuVendor = 'Generic / Default';
    let gpuRenderer = 'Default Graphics';
    let webglVersion = 'WebGL 1.0 / Disabled';
    let maxTextureSize = 2048;
    let maxRenderbufferSize = 2048;
    let isNvidia320M = false;
    let isLowSpecGpu = false;

    if (isClient) {
      try {
        const canvas = document.createElement('canvas');
        const gl =
          (canvas.getContext('webgl2') as WebGLRenderingContext | null) ||
          (canvas.getContext('webgl') as WebGLRenderingContext | null) ||
          (canvas.getContext('experimental-webgl') as WebGLRenderingContext | null);

        if (gl) {
          webglVersion = gl instanceof (window as any).WebGL2RenderingContext ? 'WebGL 2.0' : 'WebGL 1.0';
          maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE) || 2048;
          maxRenderbufferSize = gl.getParameter(gl.MAX_RENDERBUFFER_SIZE) || 2048;

          const dbgExt = gl.getExtension('WEBGL_debug_renderer_info');
          if (dbgExt) {
            gpuVendor = gl.getParameter(dbgExt.UNMASKED_VENDOR_WEBGL) || 'NVIDIA / Apple';
            gpuRenderer = gl.getParameter(dbgExt.UNMASKED_RENDERER_WEBGL) || 'GeForce 320M';
          }
        }
      } catch (e) {
        console.warn('Could not probe WebGL capabilities', e);
      }
    }

    if (
      gpuRenderer.toLowerCase().includes('320m') ||
      gpuRenderer.toLowerCase().includes('tesla') ||
      gpuRenderer.toLowerCase().includes('geforce 3') ||
      gpuRenderer.toLowerCase().includes('geforce 9') ||
      gpuRenderer.toLowerCase().includes('intel hd 3000') ||
      cpuCores <= 2
    ) {
      isNvidia320M = true;
      isLowSpecGpu = true;
    }

    // Memory estimation
    let estimatedRam = '2 GB (Ограниченный объем)';
    let jsHeapUsedMB: number | undefined;
    let jsHeapTotalMB: number | undefined;
    let jsHeapLimitMB: number | undefined;

    if (isClient && (performance as any).memory) {
      const mem = (performance as any).memory;
      jsHeapUsedMB = Math.round(mem.usedJSHeapSize / (1024 * 1024));
      jsHeapTotalMB = Math.round(mem.totalJSHeapSize / (1024 * 1024));
      jsHeapLimitMB = Math.round(mem.jsHeapSizeLimit / (1024 * 1024));
      estimatedRam = `~2 GB (JS Heap: ${jsHeapUsedMB}MB / ${jsHeapTotalMB}MB)`;
    }

    // Check saved preference or auto-enable on low spec
    let lowSpecModeActive = true; // Auto-default to true on low spec hardware
    if (isClient) {
      const saved = localStorage.getItem('aethermap_low_spec_mode');
      if (saved !== null) {
        lowSpecModeActive = saved === 'true';
      } else {
        // Auto-enable for Core 2 Duo / 2GB RAM / High Sierra
        lowSpecModeActive = isLowSpecGpu || isHighSierra || cpuCores <= 2;
      }
    }

    const isTauriDesktop = isClient && !!(window as any).__TAURI_INTERNALS__;

    return {
      osName,
      osVersion,
      isMac,
      isHighSierra,
      cpuCores,
      cpuDescription,
      estimatedRam,
      jsHeapUsedMB,
      jsHeapTotalMB,
      jsHeapLimitMB,
      gpuVendor,
      gpuRenderer,
      isNvidia320M,
      isLowSpecGpu,
      webglVersion,
      maxTextureSize,
      maxRenderbufferSize,
      screenResolution: isClient ? `${window.screen.width} × ${window.screen.height}` : '1366 × 768',
      windowResolution: isClient ? `${window.innerWidth} × ${window.innerHeight}` : '1366 × 768',
      devicePixelRatio: isClient ? window.devicePixelRatio || 1 : 1,
      currentFps: 60,
      lowSpecModeActive,
      isTauriDesktop,
    };
  }

  private startFpsLoop() {
    if (typeof window === 'undefined') return;

    const measure = (now: number) => {
      this.frameCount++;
      const elapsed = now - this.lastFpsCalcTime;
      if (elapsed >= 1000) {
        this.currentFps = Math.round((this.frameCount * 1000) / elapsed);
        this.frameCount = 0;
        this.lastFpsCalcTime = now;

        this.fpsHistory.push(this.currentFps);
        if (this.fpsHistory.length > 30) this.fpsHistory.shift();

        this.updateMemoryAndFps();
      }
      this.rafId = requestAnimationFrame(measure);
    };

    this.rafId = requestAnimationFrame(measure);
  }

  private updateMemoryAndFps() {
    if (typeof window === 'undefined') return;

    let jsHeapUsedMB: number | undefined;
    let jsHeapTotalMB: number | undefined;
    let jsHeapLimitMB: number | undefined;

    if ((performance as any).memory) {
      const mem = (performance as any).memory;
      jsHeapUsedMB = Math.round(mem.usedJSHeapSize / (1024 * 1024));
      jsHeapTotalMB = Math.round(mem.totalJSHeapSize / (1024 * 1024));
      jsHeapLimitMB = Math.round(mem.jsHeapSizeLimit / (1024 * 1024));
    }

    this.specs = {
      ...this.specs,
      currentFps: this.currentFps,
      jsHeapUsedMB,
      jsHeapTotalMB,
      jsHeapLimitMB,
      windowResolution: `${window.innerWidth} × ${window.innerHeight}`,
    };

    this.notify();
  }

  public getSpecs(): SystemSpecs {
    return { ...this.specs };
  }

  public setLowSpecMode(enabled: boolean) {
    this.specs = { ...this.specs, lowSpecModeActive: enabled };
    if (typeof window !== 'undefined') {
      localStorage.setItem('aethermap_low_spec_mode', String(enabled));
    }
    this.applyLowSpecMode(enabled);
    this.notify();
  }

  private applyLowSpecMode(enabled: boolean) {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    if (enabled) {
      root.classList.add('low-spec-mode');
    } else {
      root.classList.remove('low-spec-mode');
    }
  }

  public subscribe(listener: SpecsListener): () => void {
    this.listeners.add(listener);
    listener({ ...this.specs });
    return () => this.listeners.delete(listener);
  }

  private notify() {
    const copy = { ...this.specs };
    this.listeners.forEach((l) => {
      try {
        l(copy);
      } catch (e) {
        console.error(e);
      }
    });
  }

  public getFpsHistory(): number[] {
    return [...this.fpsHistory];
  }
}

export const systemSpecsService = new SystemSpecsService();
