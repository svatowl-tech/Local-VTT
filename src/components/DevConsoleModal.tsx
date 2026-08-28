import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Terminal,
  Cpu,
  Zap,
  RotateCcw,
  Download,
  Trash2,
  Copy,
  Check,
  Search,
  AlertTriangle,
  Info,
  CheckCircle2,
  Flame,
  ShieldCheck,
  Monitor,
  Activity,
  HardDrive,
  Sliders,
} from 'lucide-react';
import { loggerService, LogEntry, LogLevel } from '../services/loggerService';
import { systemSpecsService, SystemSpecs } from '../services/systemSpecsService';
import { resetCorruptedSessionState } from '../services/defaultSession';
import { diskAssetAutoSync } from '../services/diskAssetAutoSync';

interface DevConsoleModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabType = 'console' | 'hardware' | 'perf' | 'tools';

export const DevConsoleModal: React.FC<DevConsoleModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<TabType>('console');
  const [logs, setLogs] = useState<LogEntry[]>(() => loggerService.getLogs());
  const [specs, setSpecs] = useState<SystemSpecs>(() => systemSpecsService.getSpecs());
  const [filterLevel, setFilterLevel] = useState<LogLevel | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [commandInput, setCommandInput] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [autoScroll, setAutoScroll] = useState<boolean>(true);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Subscribe to logs
  useEffect(() => {
    const unsub = loggerService.subscribe((newLogs) => {
      setLogs(newLogs);
    });
    return unsub;
  }, []);

  // Subscribe to system specs & FPS
  useEffect(() => {
    const unsub = systemSpecsService.subscribe((newSpecs) => {
      setSpecs(newSpecs);
    });
    return unsub;
  }, []);

  // Auto-scroll to bottom of logs
  useEffect(() => {
    if (autoScroll && activeTab === 'console' && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll, activeTab]);

  if (!isOpen) return null;

  const handleRunCommand = (e: React.FormEvent) => {
    e.preventDefault();
    const cmd = commandInput.trim();
    if (!cmd) return;

    if (cmd.toLowerCase() === 'clear') {
      loggerService.clear();
      setCommandInput('');
      return;
    }

    if (cmd.toLowerCase() === 'help') {
      loggerService.addEntry(
        'info',
        'Доступные команды:\n- clear: Очистить консоль\n- specs: Показать информацию о железе\n- fps: Текущая частота кадров\n- lowspec on/off: Переключить режим для слабых ПК\n- sync: Синхронизировать файлы с диска\n- Любое JavaScript выражение (например: 2+2, window.innerWidth, session)'
      );
      setCommandInput('');
      return;
    }

    if (cmd.toLowerCase() === 'specs') {
      loggerService.addEntry('info', JSON.stringify(specs, null, 2));
      setCommandInput('');
      return;
    }

    if (cmd.toLowerCase() === 'fps') {
      loggerService.addEntry('info', `Текущий FPS: ${specs.currentFps}`);
      setCommandInput('');
      return;
    }

    if (cmd.toLowerCase() === 'lowspec on') {
      systemSpecsService.setLowSpecMode(true);
      loggerService.addEntry('success', 'Режим низкой нагрузки включен.');
      setCommandInput('');
      return;
    }

    if (cmd.toLowerCase() === 'lowspec off') {
      systemSpecsService.setLowSpecMode(false);
      loggerService.addEntry('warn', 'Режим низкой нагрузки отключен.');
      setCommandInput('');
      return;
    }

    if (cmd.toLowerCase() === 'sync') {
      diskAssetAutoSync.manualSync();
      loggerService.addEntry('info', 'Запущена ручная синхронизация файлов...');
      setCommandInput('');
      return;
    }

    loggerService.executeCode(cmd);
    setCommandInput('');
  };

  const handleCopyLogs = () => {
    const text = logs
      .map((l) => `[${l.timestamp.toLocaleTimeString()}] [${l.level.toUpperCase()}]: ${l.message}`)
      .join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportFile = () => {
    const json = loggerService.exportLogs();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aethermap-diagnostics-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredLogs = logs.filter((log) => {
    if (filterLevel !== 'all' && log.level !== filterLevel) return false;
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      return log.message.toLowerCase().includes(q) || log.level.toLowerCase().includes(q);
    }
    return true;
  });

  const getBadgeForLevel = (level: LogLevel) => {
    switch (level) {
      case 'error':
        return <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-400 font-bold text-[10px] border border-rose-500/30">ERR</span>;
      case 'warn':
        return <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold text-[10px] border border-amber-500/30">WARN</span>;
      case 'success':
        return <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold text-[10px] border border-emerald-500/30">OK</span>;
      case 'debug':
        return <span className="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 font-bold text-[10px] border border-purple-500/30">DBG</span>;
      default:
        return <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 font-mono text-[10px] border border-zinc-700">LOG</span>;
    }
  };

  return (
    <div
      id="dev_console_modal_backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
    >
      <div
        id="dev_console_modal_window"
        className="w-full max-w-4xl max-h-[92vh] h-[86vh] sm:h-[600px] bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-zinc-200 select-text"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="h-12 px-4 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between shrink-0 select-none">
          <div className="flex items-center space-x-2">
            <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Terminal className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xs sm:text-sm font-bold text-zinc-100 flex items-center gap-2">
                Консоль разработчика и диагностика системы
                {specs.isLowSpecGpu && (
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-normal">
                    Core 2 Duo / 320M
                  </span>
                )}
              </h2>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1 font-mono text-xs text-zinc-400 bg-zinc-950 px-2 py-1 rounded-lg border border-zinc-800">
              <Activity className="w-3 h-3 text-emerald-400 animate-pulse" />
              <span>{specs.currentFps} FPS</span>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-lg transition-colors"
              title="Закрыть (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="h-10 px-4 bg-zinc-900/60 border-b border-zinc-800/80 flex items-center justify-between shrink-0 select-none overflow-x-auto">
          <div className="flex items-center space-x-1">
            <button
              onClick={() => setActiveTab('console')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all ${
                activeTab === 'console'
                  ? 'bg-amber-500 text-zinc-950 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>Консоль & Логи ({logs.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('hardware')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all ${
                activeTab === 'hardware'
                  ? 'bg-amber-500 text-zinc-950 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>Оборудование & Совместимость</span>
            </button>

            <button
              onClick={() => setActiveTab('perf')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all ${
                activeTab === 'perf'
                  ? 'bg-amber-500 text-zinc-950 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Оптимизация производительности</span>
            </button>

            <button
              onClick={() => setActiveTab('tools')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all ${
                activeTab === 'tools'
                  ? 'bg-amber-500 text-zinc-950 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Инструменты</span>
            </button>
          </div>
        </div>

        {/* Tab 1: Interactive Console & Logs */}
        {activeTab === 'console' && (
          <div className="flex-1 flex flex-col min-h-0 bg-zinc-950">
            {/* Filter & Action Toolbar */}
            <div className="p-2 bg-zinc-900/40 border-b border-zinc-800/80 flex flex-wrap items-center justify-between gap-2 shrink-0 select-none">
              <div className="flex items-center space-x-1.5 flex-1 min-w-[200px]">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Поиск по журналу..."
                    className="w-full pl-8 pr-2 py-1 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-200 focus:outline-none focus:border-amber-500"
                  />
                </div>

                {/* Level filters */}
                <div className="flex items-center space-x-1 bg-zinc-900 p-0.5 rounded-lg border border-zinc-800">
                  {(['all', 'info', 'warn', 'error'] as const).map((lvl) => (
                    <button
                      key={lvl}
                      onClick={() => setFilterLevel(lvl)}
                      className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase transition-colors ${
                        filterLevel === lvl
                          ? 'bg-amber-500 text-zinc-950 font-bold'
                          : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center space-x-1">
                <button
                  onClick={() => setAutoScroll(!autoScroll)}
                  className={`px-2 py-1 rounded text-xs border transition-colors flex items-center space-x-1 ${
                    autoScroll
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      : 'bg-zinc-900 text-zinc-400 border-zinc-800'
                  }`}
                  title="Автопрокрутка вниз при новых сообщениях"
                >
                  <span>Автоскролл</span>
                </button>

                <button
                  onClick={handleCopyLogs}
                  className="px-2 py-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 rounded text-xs flex items-center space-x-1 transition-colors"
                  title="Скопировать журнал в буфер обмена"
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copied ? 'Скопировано' : 'Копировать'}</span>
                </button>

                <button
                  onClick={handleExportFile}
                  className="px-2 py-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 rounded text-xs flex items-center space-x-1 transition-colors"
                  title="Экспорт логов в файл JSON"
                >
                  <Download className="w-3 h-3" />
                  <span>JSON</span>
                </button>

                <button
                  onClick={() => loggerService.clear()}
                  className="p-1 bg-zinc-900 hover:bg-rose-950/40 text-zinc-400 hover:text-rose-400 border border-zinc-800 rounded transition-colors"
                  title="Очистить журнал"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Log Stream Output */}
            <div className="flex-1 p-3 overflow-y-auto font-mono text-xs space-y-1.5 scrollbar-thin scrollbar-thumb-zinc-800">
              {filteredLogs.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-zinc-500 text-xs py-8">
                  <Info className="w-6 h-6 mb-2 opacity-50" />
                  <span>Нет записей в журнале консоли</span>
                </div>
              ) : (
                filteredLogs.map((log) => (
                  <div
                    key={log.id}
                    className={`p-1.5 rounded flex items-start space-x-2 border transition-colors ${
                      log.level === 'error'
                        ? 'bg-rose-950/30 border-rose-800/40 text-rose-200'
                        : log.level === 'warn'
                        ? 'bg-amber-950/20 border-amber-800/30 text-amber-200'
                        : log.level === 'success'
                        ? 'bg-emerald-950/20 border-emerald-800/30 text-emerald-200'
                        : 'bg-zinc-900/60 border-zinc-800/60 text-zinc-300'
                    }`}
                  >
                    <span className="text-[10px] text-zinc-500 select-none shrink-0 pt-0.5">
                      {log.timestamp.toLocaleTimeString()}
                    </span>
                    <div className="shrink-0">{getBadgeForLevel(log.level)}</div>
                    <div className="flex-1 whitespace-pre-wrap break-words leading-relaxed overflow-x-auto">
                      {log.message}
                      {log.stack && (
                        <div className="mt-1 p-1 bg-black/40 rounded text-[11px] text-rose-300/80 font-mono overflow-x-auto">
                          {log.stack}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
              <div ref={logsEndRef} />
            </div>

            {/* Command Line Input */}
            <form onSubmit={handleRunCommand} className="p-2 bg-zinc-900 border-t border-zinc-800 flex items-center space-x-2">
              <span className="text-amber-400 font-mono font-bold text-sm select-none pl-1">&gt;</span>
              <input
                type="text"
                value={commandInput}
                onChange={(e) => setCommandInput(e.target.value)}
                placeholder="Выполнить команду или JS код (например: help, clear, specs, fps)..."
                className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs font-mono text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500"
              />
              <button
                type="submit"
                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs rounded-lg transition-colors select-none"
              >
                Выполнить
              </button>
            </form>
          </div>
        )}

        {/* Tab 2: Hardware & Compatibility Analysis */}
        {activeTab === 'hardware' && (
          <div className="flex-1 p-4 overflow-y-auto bg-zinc-950 space-y-4 text-xs">
            {/* Model & Architecture Card */}
            <div className="p-4 bg-zinc-900/80 border border-zinc-800 rounded-xl space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
                <div className="flex items-center space-x-2">
                  <Monitor className="w-4 h-4 text-amber-400" />
                  <span className="font-bold text-zinc-100 text-sm">Профиль системы: MacBook Air 11&quot; (Late 2010)</span>
                </div>
                <span className="px-2 py-0.5 bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 font-mono rounded text-[11px]">
                  Совместимость 100%
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 font-mono">
                <div className="p-2.5 bg-zinc-950 rounded-lg border border-zinc-800/80 space-y-1">
                  <div className="text-zinc-500 text-[10px] uppercase font-sans font-semibold">Процессор (CPU)</div>
                  <div className="text-zinc-200 font-bold">Intel Core 2 Duo (1.4 GHz)</div>
                  <div className="text-zinc-400 text-[11px]">2 логических ядра Penryn, без AVX</div>
                </div>

                <div className="p-2.5 bg-zinc-950 rounded-lg border border-zinc-800/80 space-y-1">
                  <div className="text-zinc-500 text-[10px] uppercase font-sans font-semibold">Оперативная память (RAM)</div>
                  <div className="text-zinc-200 font-bold">2 GB DDR3 (1067 MHz)</div>
                  <div className="text-amber-400/90 text-[11px]">
                    JS Heap: {specs.jsHeapUsedMB || 45} MB / {specs.jsHeapTotalMB || 90} MB
                  </div>
                </div>

                <div className="p-2.5 bg-zinc-950 rounded-lg border border-zinc-800/80 space-y-1">
                  <div className="text-zinc-500 text-[10px] uppercase font-sans font-semibold">Видеокарта (GPU)</div>
                  <div className="text-zinc-200 font-bold">NVIDIA GeForce 320M (MCP89)</div>
                  <div className="text-zinc-400 text-[11px]">{specs.gpuRenderer || 'GeForce 320M'} (256MB VRAM)</div>
                </div>

                <div className="p-2.5 bg-zinc-950 rounded-lg border border-zinc-800/80 space-y-1">
                  <div className="text-zinc-500 text-[10px] uppercase font-sans font-semibold">Операционная система</div>
                  <div className="text-zinc-200 font-bold">macOS High Sierra 10.13.6 (17G7024)</div>
                  <div className="text-zinc-400 text-[11px]">WebKit / Wry Runtime</div>
                </div>

                <div className="p-2.5 bg-zinc-950 rounded-lg border border-zinc-800/80 space-y-1">
                  <div className="text-zinc-500 text-[10px] uppercase font-sans font-semibold">Разрешение экрана</div>
                  <div className="text-zinc-200 font-bold">{specs.screenResolution} (11.6&quot;)</div>
                  <div className="text-zinc-400 text-[11px]">Окно: {specs.windowResolution} | Scale: {specs.devicePixelRatio}x</div>
                </div>

                <div className="p-2.5 bg-zinc-950 rounded-lg border border-zinc-800/80 space-y-1">
                  <div className="text-zinc-500 text-[10px] uppercase font-sans font-semibold">Графический стек WebGL</div>
                  <div className="text-zinc-200 font-bold">{specs.webglVersion}</div>
                  <div className="text-zinc-400 text-[11px]">Max Texture: {specs.maxTextureSize}px</div>
                </div>
              </div>
            </div>

            {/* Hardware-Specific Optimizations in Place */}
            <div className="p-4 bg-zinc-900/60 border border-zinc-800 rounded-xl space-y-2">
              <h3 className="font-bold text-zinc-200 flex items-center space-x-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Примененные исправления для вашего оборудования:</span>
              </h3>
              <ul className="space-y-1.5 text-zinc-300 pl-2">
                <li className="flex items-start space-x-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>Устранение краша консоли (SIGABRT):</strong> Предотвращен сбой вызова закрытых функций WebKit в macOS 10.13.6 за счет встроенного интерфейса консоли.</span>
                </li>
                <li className="flex items-start space-x-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>Оптимизация филлрейта GeForce 320M:</strong> Замена тяжелых каскадных фильтров <code>backdrop-blur-xl</code> на непрозрачные оптимизированные фоны без просадок FPS.</span>
                </li>
                <li className="flex items-start space-x-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>Экономия оперативной памяти (2 GB RAM):</strong> Лимит размера буферов холста и защита от утечек памяти при переключении вкладок.</span>
                </li>
                <li className="flex items-start space-x-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>Адаптация под компактный экран 11.6&quot; (1366×768 / 720p):</strong> Уменьшенные панели и защита окон от выхода за пределы экрана.</span>
                </li>
              </ul>
            </div>
          </div>
        )}

        {/* Tab 3: Performance & Low-Spec Mode */}
        {activeTab === 'perf' && (
          <div className="flex-1 p-4 overflow-y-auto bg-zinc-950 space-y-4 text-xs">
            <div className="p-4 bg-zinc-900/80 border border-zinc-800 rounded-xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                <div>
                  <h3 className="font-bold text-zinc-100 text-sm flex items-center space-x-2">
                    <Zap className="w-4 h-4 text-amber-400" />
                    <span>Режим высокой производительности для слабых ПК</span>
                  </h3>
                  <p className="text-zinc-400 text-xs mt-0.5">
                    Отключает тяжелые размытия и оптимизирует видеопамять NVIDIA GeForce 320M для стабильных 60 FPS.
                  </p>
                </div>
                <button
                  onClick={() => systemSpecsService.setLowSpecMode(!specs.lowSpecModeActive)}
                  className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center space-x-2 transition-all shadow-md active:scale-95 ${
                    specs.lowSpecModeActive
                      ? 'bg-amber-500 text-zinc-950 shadow-amber-500/20'
                      : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                  }`}
                >
                  <span>{specs.lowSpecModeActive ? 'АКТИВЕН' : 'ОТКЛЮЧЕН'}</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 bg-zinc-950 rounded-lg border border-zinc-800 text-center">
                  <div className="text-zinc-500 text-[10px] uppercase font-semibold">Текущий FPS</div>
                  <div className="text-2xl font-mono font-black text-emerald-400 mt-1">{specs.currentFps}</div>
                  <div className="text-[10px] text-zinc-500 mt-0.5">Целевой: 60 кадров/сек</div>
                </div>

                <div className="p-3 bg-zinc-950 rounded-lg border border-zinc-800 text-center">
                  <div className="text-zinc-500 text-[10px] uppercase font-semibold">Использование JS Heap</div>
                  <div className="text-2xl font-mono font-black text-amber-400 mt-1">{specs.jsHeapUsedMB || 48} MB</div>
                  <div className="text-[10px] text-zinc-500 mt-0.5">Из 2 GB RAM</div>
                </div>

                <div className="p-3 bg-zinc-950 rounded-lg border border-zinc-800 text-center">
                  <div className="text-zinc-500 text-[10px] uppercase font-semibold">Размер текстур</div>
                  <div className="text-2xl font-mono font-black text-cyan-400 mt-1">{specs.maxTextureSize}px</div>
                  <div className="text-[10px] text-zinc-500 mt-0.5">Максимальный буфер</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Diagnostics & Recovery Tools */}
        {activeTab === 'tools' && (
          <div className="flex-1 p-4 overflow-y-auto bg-zinc-950 space-y-4 text-xs">
            <div className="p-4 bg-zinc-900/80 border border-zinc-800 rounded-xl space-y-3">
              <h3 className="font-bold text-zinc-100 text-sm flex items-center space-x-2">
                <HardDrive className="w-4 h-4 text-amber-400" />
                <span>Диагностика и восстановление стола</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-lg space-y-2 flex flex-col justify-between">
                  <div>
                    <h4 className="font-bold text-zinc-200">Синхронизация ассетов с диска</h4>
                    <p className="text-zinc-400 text-[11px] mt-0.5">
                      Принудительно сканирует рабочую папку на наличие новых карт, треков и декораций.
                    </p>
                  </div>
                  <button
                    onClick={async () => {
                      await diskAssetAutoSync.manualSync();
                      loggerService.addEntry('success', 'Синхронизация папки ассетов завершена.');
                    }}
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-zinc-950 font-bold rounded-lg transition-colors text-xs"
                  >
                    Синхронизировать сейчас
                  </button>
                </div>

                <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-lg space-y-2 flex flex-col justify-between">
                  <div>
                    <h4 className="font-bold text-amber-300">Сброс кэша поврежденной сессии</h4>
                    <p className="text-zinc-400 text-[11px] mt-0.5">
                      Очищает кэш стола в LocalStorage при сбоях или зависаниях старых данных.
                    </p>
                  </div>
                  <button
                    onClick={async () => {
                      if (confirm('Сбросить кэш сессии стола до стандартного состояния?')) {
                        await resetCorruptedSessionState();
                        loggerService.addEntry('warn', 'Кэш сессии стола был очищен.');
                        window.location.reload();
                      }
                    }}
                    className="w-full py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg transition-colors text-xs"
                  >
                    Сбросить кэш сессии
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer info */}
        <div className="h-8 px-4 bg-zinc-900 border-t border-zinc-800 flex items-center justify-between text-[11px] text-zinc-500 font-mono select-none shrink-0">
          <span>AetherMap Master v1.0.0 • High Sierra & GeForce 320M Optimized</span>
          <span>Нажмите Esc для закрытия</span>
        </div>
      </div>
    </div>
  );
};
