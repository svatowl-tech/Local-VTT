/**
 * Legacy Polyfills for macOS 10.13 (High Sierra) / Safari 11 / WebKit
 * Ensures full ECMAScript and Web API compatibility for older runtimes.
 */

// 1. globalThis
if (typeof globalThis === 'undefined') {
  (window as any).globalThis = window;
}

// 2. Array.prototype.flat and flatMap
if (!Array.prototype.flat) {
  Array.prototype.flat = function (depth = 1) {
    return (function flatten(arr: any[], d: number): any[] {
      return d > 0
        ? arr.reduce((acc, val) => acc.concat(Array.isArray(val) ? flatten(val, d - 1) : val), [])
        : arr.slice();
    })(this as any[], depth);
  };
}

if (!Array.prototype.flatMap) {
  (Array.prototype as any).flatMap = function (callback: any, thisArg?: any) {
    return (this as any[]).map(callback, thisArg).flat();
  };
}

// 3. Array.prototype.at and String.prototype.at
if (!Array.prototype.at) {
  (Array.prototype as any).at = function (n: number) {
    n = Math.trunc(n) || 0;
    if (n < 0) n += this.length;
    if (n < 0 || n >= this.length) return undefined;
    return this[n];
  };
}

if (!String.prototype.at) {
  (String.prototype as any).at = function (n: number) {
    n = Math.trunc(n) || 0;
    if (n < 0) n += this.length;
    if (n < 0 || n >= this.length) return '';
    return this.charAt(n);
  };
}

// 4. Object.fromEntries
if (!Object.fromEntries) {
  (Object as any).fromEntries = function (entries: any) {
    if (!entries) return {};
    const obj: any = {};
    for (const pair of entries) {
      if (Object(pair) !== pair) continue;
      obj[pair[0]] = pair[1];
    }
    return obj;
  };
}

// 5. Object.hasOwn
if (!(Object as any).hasOwn) {
  (Object as any).hasOwn = function (obj: any, prop: any) {
    if (obj == null) return false;
    return Object.prototype.hasOwnProperty.call(obj, prop);
  };
}

// 6. Promise.allSettled and Promise.any
if (!(Promise as any).allSettled) {
  (Promise as any).allSettled = function (promises: Iterable<any>) {
    return Promise.all(
      Array.from(promises).map((p) =>
        Promise.resolve(p).then(
          (value) => ({ status: 'fulfilled' as const, value }),
          (reason) => ({ status: 'rejected' as const, reason })
        )
      )
    );
  };
}

if (!(Promise as any).any) {
  (Promise as any).any = function (promises: Iterable<any>) {
    return new Promise((resolve, reject) => {
      const arr = Array.from(promises);
      const errors: any[] = [];
      let rejectedCount = 0;
      if (arr.length === 0) {
        return reject(new AggregateError([], 'All promises were rejected'));
      }
      arr.forEach((p, idx) => {
        Promise.resolve(p).then(resolve, (err) => {
          errors[idx] = err;
          rejectedCount++;
          if (rejectedCount === arr.length) {
            const AggregateErrClass = (window as any).AggregateError || Error;
            reject(new AggregateErrClass(errors, 'All promises were rejected'));
          }
        });
      });
    });
  };
}

// 7. String.prototype.replaceAll
if (!String.prototype.replaceAll) {
  String.prototype.replaceAll = function (searchValue: any, replaceValue: any) {
    if (searchValue instanceof RegExp) {
      if (!searchValue.global) {
        throw new TypeError('replaceAll must be called with a global RegExp');
      }
      return this.replace(searchValue, replaceValue);
    }
    return this.split(searchValue).join(replaceValue);
  };
}

// 8. queueMicrotask
if (typeof window !== 'undefined' && typeof window.queueMicrotask !== 'function') {
  window.queueMicrotask = function (callback: () => void) {
    Promise.resolve().then(callback).catch((err) => setTimeout(() => { throw err; }, 0));
  };
}

// 9. requestIdleCallback & cancelIdleCallback
if (typeof window !== 'undefined') {
  if (typeof (window as any).requestIdleCallback !== 'function') {
    (window as any).requestIdleCallback = function (cb: any) {
      const start = Date.now();
      return setTimeout(() => {
        cb({
          didTimeout: false,
          timeRemaining: () => Math.max(0, 50 - (Date.now() - start)),
        });
      }, 1);
    };
  }
  if (typeof (window as any).cancelIdleCallback !== 'function') {
    (window as any).cancelIdleCallback = function (id: any) {
      clearTimeout(id);
    };
  }
}

// 10. crypto.randomUUID
if (typeof window !== 'undefined') {
  if (!window.crypto) {
    (window as any).crypto = {};
  }
  if (typeof (window.crypto as any).randomUUID !== 'function') {
    (window.crypto as any).randomUUID = function () {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      });
    };
  }
}

// 11. structuredClone
if (typeof window !== 'undefined' && typeof (window as any).structuredClone !== 'function') {
  (window as any).structuredClone = function (obj: any) {
    if (obj === undefined) return undefined;
    return JSON.parse(JSON.stringify(obj));
  };
}

// 12. AudioContext fallback for webkitAudioContext
if (typeof window !== 'undefined') {
  (window as any).AudioContext = (window as any).AudioContext || (window as any).webkitAudioContext;
}

// 13. ResizeObserver polyfill
if (typeof window !== 'undefined' && typeof (window as any).ResizeObserver !== 'function') {
  (window as any).ResizeObserver = class {
    private callback: any;
    private targets: Set<Element> = new Set();
    private intervalId: any = null;

    constructor(callback: any) {
      this.callback = callback;
    }

    observe(target: Element) {
      if (!target) return;
      this.targets.add(target);
      const rect = target.getBoundingClientRect();
      this.callback([{ target, contentRect: rect }], this);

      if (!this.intervalId) {
        this.intervalId = setInterval(() => {
          for (const el of this.targets) {
            const currentRect = el.getBoundingClientRect();
            this.callback([{ target: el, contentRect: currentRect }], this);
          }
        }, 1000);
      }
    }

    unobserve(target: Element) {
      this.targets.delete(target);
      if (this.targets.size === 0 && this.intervalId) {
        clearInterval(this.intervalId);
        this.intervalId = null;
      }
    }

    disconnect() {
      this.targets.clear();
      if (this.intervalId) {
        clearInterval(this.intervalId);
        this.intervalId = null;
      }
    }
  };
}

// 14. Clipboard fallback
if (typeof window !== 'undefined' && navigator && !navigator.clipboard) {
  (navigator as any).clipboard = {
    writeText: async function (text: string) {
      try {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.left = '-999999px';
        textarea.style.top = '-999999px';
        textarea.setAttribute('readonly', '');
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        const success = document.execCommand('copy');
        document.body.removeChild(textarea);
        return success;
      } catch (err) {
        console.warn('Fallback clipboard copy failed:', err);
        return false;
      }
    },
    readText: async function () {
      return '';
    },
  };
}

export {};
