/**
 * Logger Service - In-App Console & Diagnostic Log Interceptor
 * Intercepts console methods safely without crashing older WebKit runtimes.
 */

export type LogLevel = 'info' | 'warn' | 'error' | 'debug' | 'success';

export interface LogEntry {
  id: string;
  timestamp: Date;
  level: LogLevel;
  message: string;
  data?: any[];
  stack?: string;
}

type LogListener = (logs: LogEntry[]) => void;

class LoggerService {
  private logs: LogEntry[] = [];
  private maxLogs = 600;
  private listeners: Set<LogListener> = new Set();
  private originalConsole = {
    log: console.log.bind(console),
    warn: console.warn.bind(console),
    error: console.error.bind(console),
    info: console.info.bind(console),
    debug: console.debug.bind(console),
  };
  private isInitialized = false;

  public init() {
    if (this.isInitialized || typeof window === 'undefined') return;
    this.isInitialized = true;

    // Capture global unhandled errors
    window.addEventListener('error', (event) => {
      this.addEntry(
        'error',
        `Uncaught error: ${event.message} (${event.filename}:${event.lineno}:${event.colno})`,
        undefined,
        event.error?.stack
      );
    });

    window.addEventListener('unhandledrejection', (event) => {
      this.addEntry(
        'error',
        `Unhandled Promise Rejection: ${event.reason?.message || event.reason}`,
        undefined,
        event.reason?.stack
      );
    });

    // Intercept console.log
    console.log = (...args: any[]) => {
      this.originalConsole.log(...args);
      this.addEntry('info', this.formatArgs(args), args);
    };

    // Intercept console.warn
    console.warn = (...args: any[]) => {
      this.originalConsole.warn(...args);
      this.addEntry('warn', this.formatArgs(args), args);
    };

    // Intercept console.error
    console.error = (...args: any[]) => {
      this.originalConsole.error(...args);
      const stack = args.find((a) => a instanceof Error)?.stack;
      this.addEntry('error', this.formatArgs(args), args, stack);
    };

    // Intercept console.info
    console.info = (...args: any[]) => {
      this.originalConsole.info(...args);
      this.addEntry('info', this.formatArgs(args), args);
    };

    // Intercept console.debug
    console.debug = (...args: any[]) => {
      this.originalConsole.debug(...args);
      this.addEntry('debug', this.formatArgs(args), args);
    };

    this.addEntry('success', 'AetherMap Logger & Diagnostics Subsystem initialized.');
  }

  private formatArgs(args: any[]): string {
    return args
      .map((arg) => {
        if (typeof arg === 'string') return arg;
        if (arg instanceof Error) return `${arg.name}: ${arg.message}`;
        try {
          return JSON.stringify(arg, null, 2);
        } catch {
          return String(arg);
        }
      })
      .join(' ');
  }

  public addEntry(level: LogLevel, message: string, data?: any[], stack?: string) {
    const entry: LogEntry = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      timestamp: new Date(),
      level,
      message,
      data,
      stack,
    };

    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    this.notify();
  }

  public getLogs(): LogEntry[] {
    return [...this.logs];
  }

  public clear() {
    this.logs = [];
    this.addEntry('info', 'Журнал консоли очищен.');
    this.notify();
  }

  public subscribe(listener: LogListener): () => void {
    this.listeners.add(listener);
    listener([...this.logs]);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    const copy = [...this.logs];
    this.listeners.forEach((listener) => {
      try {
        listener(copy);
      } catch (e) {
        this.originalConsole.error('Error notifying log listener', e);
      }
    });
  }

  public executeCode(code: string): { success: boolean; result?: any; error?: string } {
    try {
      this.addEntry('info', `> ${code}`);
      // Evaluate within a safe scope
      const fn = new Function(`
        try {
          return (${code});
        } catch (e) {
          return eval(${JSON.stringify(code)});
        }
      `);
      const result = fn();
      const formatted = result !== undefined ? this.formatArgs([result]) : 'undefined';
      this.addEntry('success', `< ${formatted}`);
      return { success: true, result };
    } catch (err: any) {
      const errorMsg = err?.message || String(err);
      this.addEntry('error', `< Error: ${errorMsg}`, undefined, err?.stack);
      return { success: false, error: errorMsg };
    }
  }

  public exportLogs(): string {
    return JSON.stringify(
      {
        exportedAt: new Date().toISOString(),
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
        logs: this.logs.map((l) => ({
          time: l.timestamp.toLocaleTimeString(),
          level: l.level.toUpperCase(),
          message: l.message,
          stack: l.stack,
        })),
      },
      null,
      2
    );
  }
}

export const loggerService = new LoggerService();
