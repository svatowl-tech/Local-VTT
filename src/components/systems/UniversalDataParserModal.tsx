import React, { useState } from 'react';
import {
  FileCode,
  Upload,
  Sparkles,
  FileText,
  CheckCircle2,
  AlertTriangle,
  FolderInput,
  Database,
  ArrowRight,
  RefreshCw,
  Search,
  Check,
  X,
  Swords,
  Shield,
  Zap,
  Book,
  FileSpreadsheet,
  FileCheck,
  ChevronDown,
  Layers,
} from 'lucide-react';
import {
  UniversalParseResult,
  UniversalParsedEntity,
  TTRPGSystemManifest,
} from '../../types/systemDataTypes';
import { systemContentService } from '../../services/systemContentService';
import { rustSystemParserService, ParseExecutionReport } from '../../services/rustSystemParserService';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  targetSystemId: string;
  systems: TTRPGSystemManifest[];
  onImportComplete?: () => void;
}

export const UniversalDataParserModal: React.FC<Props> = ({
  isOpen,
  onClose,
  targetSystemId: initialSystemId,
  systems,
  onImportComplete,
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'text'>('upload');
  const [selectedSystemId, setSelectedSystemId] = useState<string>(initialSystemId || 'dnd5e');
  const [suggestedCategory, setSuggestedCategory] = useState<string>('');
  const [rawTextInput, setRawTextInput] = useState<string>('');
  const [isParsing, setIsParsing] = useState<boolean>(false);
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [parseResult, setParseResult] = useState<UniversalParseResult | null>(null);
  const [executionReport, setExecutionReport] = useState<ParseExecutionReport | null>(null);
  const [selectedEntityIds, setSelectedEntityIds] = useState<Set<string>>(new Set());
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [activePreviewEntity, setActivePreviewEntity] = useState<UniversalParsedEntity | null>(null);

  if (!isOpen) return null;

  const isRustReady = rustSystemParserService.isRustAvailable();

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    setIsParsing(true);
    setStatusMessage({ type: 'info', text: `Идёт сверхбыстрый анализ и парсинг файла «${file.name}»...` });
    setParseResult(null);
    setExecutionReport(null);
    setActivePreviewEntity(null);

    try {
      const { result, report } = await rustSystemParserService.parseFile(
        file,
        selectedSystemId,
        suggestedCategory || undefined
      );

      setParseResult(result);
      setExecutionReport(report);

      if (result.success && result.entities.length > 0) {
        // Select all entities by default
        setSelectedEntityIds(new Set(result.entities.map((ent) => ent.id)));
        setActivePreviewEntity(result.entities[0]);
        setStatusMessage({
          type: 'success',
          text: `Успешно распознан формат «${result.formatDescription}»! Найдено сущностей: ${result.totalEntitiesFound} (Время: ${report.elapsedMs} мс).`,
        });
      } else {
        setStatusMessage({
          type: 'error',
          text: result.errors[0] || 'Не удалось распознать сущности в данном файле.',
        });
      }
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: `Ошибка при парсинге: ${err?.message || err}`,
      });
    } finally {
      setIsParsing(false);
      e.target.value = '';
    }
  };

  const handleParseRawText = async () => {
    if (!rawTextInput.trim()) {
      setStatusMessage({ type: 'error', text: 'Пожалуйста, вставьте текст или JSON данные для парсинга.' });
      return;
    }

    setIsParsing(true);
    setStatusMessage({ type: 'info', text: 'Идёт распознавание структуры текста...' });
    setParseResult(null);
    setExecutionReport(null);
    setActivePreviewEntity(null);

    try {
      const { result, report } = await rustSystemParserService.parseRawData({
        rawData: rawTextInput,
        defaultSystem: selectedSystemId,
        suggestedCategory: suggestedCategory || undefined,
      });

      setParseResult(result);
      setExecutionReport(report);

      if (result.success && result.entities.length > 0) {
        setSelectedEntityIds(new Set(result.entities.map((ent) => ent.id)));
        setActivePreviewEntity(result.entities[0]);
        setStatusMessage({
          type: 'success',
          text: `Распознано сущностей: ${result.totalEntitiesFound} (${result.formatDescription}) за ${report.elapsedMs} мс`,
        });
      } else {
        setStatusMessage({
          type: 'error',
          text: result.errors[0] || 'Не удалось извлечь структурированные данные.',
        });
      }
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: `Ошибка разбора: ${err?.message || err}`,
      });
    } finally {
      setIsParsing(false);
    }
  };

  const toggleEntitySelection = (id: string) => {
    const next = new Set(selectedEntityIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedEntityIds(next);
  };

  const toggleAll = () => {
    if (!parseResult) return;
    if (selectedEntityIds.size === parseResult.entities.length) {
      setSelectedEntityIds(new Set());
    } else {
      setSelectedEntityIds(new Set(parseResult.entities.map((e) => e.id)));
    }
  };

  const handleImportToSystem = async () => {
    if (!parseResult) return;
    const toImport = parseResult.entities.filter((e) => selectedEntityIds.has(e.id));
    if (toImport.length === 0) {
      setStatusMessage({ type: 'error', text: 'Выберите хотя бы одну сущность для импорта.' });
      return;
    }

    setIsImporting(true);
    setStatusMessage({
      type: 'info',
      text: `Сохранение ${toImport.length} сущностей в системную директорию «${selectedSystemId}»...`,
    });

    try {
      const res = await systemContentService.importEntities(selectedSystemId, toImport);
      setStatusMessage({
        type: 'success',
        text: `Успешно импортировано ${res.importedCount} файлов в ролевую систему!`,
      });

      if (onImportComplete) {
        onImportComplete();
      }
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: `Ошибка сохранения на диск: ${err?.message || err}`,
      });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-zinc-200 text-xs">
        {/* Header */}
        <div className="p-5 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/60">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/40 text-amber-300 rounded-2xl">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-bold text-sm text-zinc-100">Универсальный парсер данных TTRPG</h3>
                <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-full text-[10px] font-mono">
                  Foundry • Roll20 • 5eTools • PDF • Text • XML
                </span>
                {isRustReady ? (
                  <span className="px-2 py-0.5 bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 rounded-full text-[10px] font-mono font-bold flex items-center space-x-1">
                    <span>⚡ Rust Tauri Engine</span>
                  </span>
                ) : (
                  <span className="px-2 py-0.5 bg-amber-500/10 text-amber-300 border border-amber-500/30 rounded-full text-[10px] font-mono">
                    TS Fallback Active
                  </span>
                )}
              </div>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                Сверхбыстрый нативный движок парсинга на Rust с отказоустойчивым TypeScript fallback.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-xl transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Target System Selection & Mode Tabs */}
        <div className="p-4 bg-zinc-900/30 border-b border-zinc-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setActiveTab('upload')}
              className={`px-3.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center space-x-2 ${
                activeTab === 'upload'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Загрузить файл (Любой формат)</span>
            </button>
            <button
              onClick={() => setActiveTab('text')}
              className={`px-3.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center space-x-2 ${
                activeTab === 'text'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
              }`}
            >
              <FileCode className="w-3.5 h-3.5" />
              <span>Вставить текст / JSON</span>
            </button>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-zinc-400 text-[11px] whitespace-nowrap">Целевая система:</span>
            <select
              value={selectedSystemId}
              onChange={(e) => setSelectedSystemId(e.target.value)}
              className="px-3 py-1.5 bg-zinc-900 border border-zinc-700 rounded-xl text-zinc-100 text-xs font-semibold focus:outline-none focus:border-amber-500 cursor-pointer"
            >
              {systems.map((sys) => (
                <option key={sys.id} value={sys.id}>
                  {sys.name} ({sys.shortName || sys.id})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Status Message */}
        {statusMessage && (
          <div
            className={`px-4 py-2.5 border-b text-xs flex items-center space-x-2 ${
              statusMessage.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : statusMessage.type === 'error'
                ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
            }`}
          >
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            ) : statusMessage.type === 'error' ? (
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
            ) : (
              <RefreshCw className="w-4 h-4 shrink-0 text-amber-400 animate-spin" />
            )}
            <span className="font-medium">{statusMessage.text}</span>
          </div>
        )}

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* TAB 1: FILE UPLOAD DROPZONE */}
          {activeTab === 'upload' && !parseResult && (
            <div className="space-y-4">
              <label className="border-2 border-dashed border-zinc-700 hover:border-amber-500/80 bg-zinc-900/40 hover:bg-zinc-900/80 rounded-3xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all space-y-3">
                <div className="p-4 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-2xl">
                  <Upload className="w-8 h-8" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-zinc-100">
                    Перетащите или выберите любой файл для парсинга
                  </h4>
                  <p className="text-[11px] text-zinc-400 mt-1 max-w-md mx-auto">
                    Поддерживаются экспорты Foundry VTT (.json, .db), Roll20 Character Sheets (.json), 5eTools базы данных, PDF книги правил, GURPS (.gcs, .xml), Cyberpunk, текстовые статблоки и Markdown.
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-1.5 text-[10px] text-zinc-400 pt-2 font-mono">
                  <span className="px-2 py-0.5 bg-zinc-800 rounded-md">.json</span>
                  <span className="px-2 py-0.5 bg-zinc-800 rounded-md">.pdf</span>
                  <span className="px-2 py-0.5 bg-zinc-800 rounded-md">.txt</span>
                  <span className="px-2 py-0.5 bg-zinc-800 rounded-md">.md</span>
                  <span className="px-2 py-0.5 bg-zinc-800 rounded-md">.xml / .gcs</span>
                  <span className="px-2 py-0.5 bg-zinc-800 rounded-md">.yaml / .yml</span>
                  <span className="px-2 py-0.5 bg-zinc-800 rounded-md">.csv / .tsv</span>
                </div>
                <input
                  type="file"
                  onChange={handleFileUpload}
                  className="hidden"
                  accept=".json,.pdf,.txt,.md,.markdown,.xml,.gcs,.yaml,.yml,.csv,.tsv,.db,.jsonl"
                />
              </label>

              {/* Supported Ecosystem Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div className="p-3 bg-zinc-900/50 border border-zinc-800/80 rounded-2xl space-y-1">
                  <div className="flex items-center space-x-2 text-amber-400 font-bold text-xs">
                    <Database className="w-4 h-4" />
                    <span>Foundry VTT & Roll20</span>
                  </div>
                  <p className="text-[11px] text-zinc-400">
                    Парсит экспорт акторов, предметов, спеллов, компендиумов, журналов и RollTable без ручной конвертации.
                  </p>
                </div>

                <div className="p-3 bg-zinc-900/50 border border-zinc-800/80 rounded-2xl space-y-1">
                  <div className="flex items-center space-x-2 text-cyan-400 font-bold text-xs">
                    <FileText className="w-4 h-4" />
                    <span>PDF Книги и Модули</span>
                  </div>
                  <p className="text-[11px] text-zinc-400">
                    Извлекает текст страниц, находит монстров, заклинания и правила с сохранением номеров страниц.
                  </p>
                </div>

                <div className="p-3 bg-zinc-900/50 border border-zinc-800/80 rounded-2xl space-y-1">
                  <div className="flex items-center space-x-2 text-emerald-400 font-bold text-xs">
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>5eTools, GURPS & XML</span>
                  </div>
                  <p className="text-[11px] text-zinc-400">
                    Автоматическая очистка тегов, поддержка листов персонажей GCS XML и таблиц лута CSV.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: RAW TEXT / JSON INPUT */}
          {activeTab === 'text' && !parseResult && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-zinc-300 font-bold text-xs">
                  Вставьте статблок, JSON данные или текст правил:
                </label>
                <span className="text-[10px] text-zinc-500 font-mono">
                  {rawTextInput.length} символов
                </span>
              </div>
              <textarea
                value={rawTextInput}
                onChange={(e) => setRawTextInput(e.target.value)}
                placeholder="Пример: Goblin, Armor Class 15, Hit Points 7 (2d6), Speed 30 ft. STR 8 DEX 14... или JSON экспорт Foundry..."
                className="w-full h-64 p-4 bg-zinc-900 border border-zinc-800 rounded-2xl font-mono text-xs text-zinc-200 focus:outline-none focus:border-amber-500 resize-none shadow-inner"
              />
              <div className="flex justify-end space-x-2">
                <button
                  onClick={() => setRawTextInput('')}
                  className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 rounded-xl font-bold cursor-pointer"
                >
                  Очистить
                </button>
                <button
                  onClick={handleParseRawText}
                  disabled={isParsing || !rawTextInput.trim()}
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-zinc-950 rounded-xl font-bold flex items-center space-x-2 shadow-sm cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Распознать и распарсить</span>
                </button>
              </div>
            </div>
          )}

          {/* PARSED RESULTS VIEW & INSPECTOR */}
          {parseResult && (
            <div className="space-y-4">
              {/* Parse Summary Bar */}
              <div className="p-4 bg-zinc-900/80 border border-zinc-800 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-sm text-zinc-100">
                      Распознано сущностей: {parseResult.totalEntitiesFound}
                    </span>
                    <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 font-mono text-[10px] rounded-full border border-amber-500/30">
                      {parseResult.formatDescription}
                    </span>
                    {executionReport && (
                      <span className={`px-2 py-0.5 font-mono text-[10px] rounded-full border font-bold flex items-center space-x-1 ${
                        executionReport.engine === 'rust_tauri'
                          ? 'bg-cyan-950/40 text-cyan-300 border-cyan-500/40'
                          : 'bg-zinc-800 text-zinc-300 border-zinc-700'
                      }`}>
                        <span>{executionReport.engine === 'rust_tauri' ? '⚡ Rust Engine' : '⚡ TS Engine'}</span>
                        <span className="text-zinc-400">({executionReport.elapsedMs} мс)</span>
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-[10px] text-zinc-400">
                    {parseResult.stats.monstersCount > 0 && (
                      <span className="px-2 py-0.5 bg-zinc-800 rounded-md text-zinc-300">
                        Монстров: {parseResult.stats.monstersCount}
                      </span>
                    )}
                    {parseResult.stats.spellsCount > 0 && (
                      <span className="px-2 py-0.5 bg-zinc-800 rounded-md text-zinc-300">
                        Заклинаний: {parseResult.stats.spellsCount}
                      </span>
                    )}
                    {parseResult.stats.itemsCount > 0 && (
                      <span className="px-2 py-0.5 bg-zinc-800 rounded-md text-zinc-300">
                        Предметов: {parseResult.stats.itemsCount}
                      </span>
                    )}
                    {parseResult.stats.rulesCount > 0 && (
                      <span className="px-2 py-0.5 bg-zinc-800 rounded-md text-zinc-300">
                        Правил: {parseResult.stats.rulesCount}
                      </span>
                    )}
                    {parseResult.stats.tablesCount > 0 && (
                      <span className="px-2 py-0.5 bg-zinc-800 rounded-md text-zinc-300">
                        Таблиц: {parseResult.stats.tablesCount}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => {
                      setParseResult(null);
                      setActivePreviewEntity(null);
                    }}
                    className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl font-bold cursor-pointer"
                  >
                    Загрузить другой
                  </button>
                  <button
                    onClick={handleImportToSystem}
                    disabled={isImporting || selectedEntityIds.size === 0}
                    className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-zinc-950 rounded-xl font-bold flex items-center space-x-1.5 shadow-sm cursor-pointer"
                  >
                    <FolderInput className="w-3.5 h-3.5" />
                    <span>Импортировать ({selectedEntityIds.size}) на диск</span>
                  </button>
                </div>
              </div>

              {/* Master-Detail Split Grid */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                {/* Left column: Entities List */}
                <div className="md:col-span-5 space-y-2 max-h-96 overflow-y-auto pr-1">
                  <div className="flex items-center justify-between pb-1 px-1">
                    <button
                      onClick={toggleAll}
                      className="text-[11px] font-bold text-amber-400 hover:underline cursor-pointer"
                    >
                      {selectedEntityIds.size === parseResult.entities.length
                        ? 'Снять выбор со всех'
                        : 'Выбрать все'}
                    </button>
                    <span className="text-[10px] text-zinc-500 font-mono">
                      Выбрано {selectedEntityIds.size} из {parseResult.entities.length}
                    </span>
                  </div>

                  {parseResult.entities.map((entity, idx) => {
                    const isSelected = selectedEntityIds.has(entity.id);
                    const isPreview = activePreviewEntity?.id === entity.id;

                    return (
                      <div
                        key={`${entity.id}-${idx}`}
                        onClick={() => setActivePreviewEntity(entity)}
                        className={`p-2.5 rounded-xl border flex items-start space-x-2.5 cursor-pointer transition-all ${
                          isPreview
                            ? 'bg-amber-500/15 border-amber-500/60 text-zinc-100 ring-1 ring-amber-500/40'
                            : 'bg-zinc-900/60 border-zinc-800 hover:bg-zinc-850 text-zinc-300'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleEntitySelection(entity.id);
                          }}
                          className={`w-4 h-4 mt-0.5 rounded flex items-center justify-center border transition-all ${
                            isSelected
                              ? 'bg-amber-500 border-amber-400 text-zinc-950'
                              : 'border-zinc-700 bg-zinc-950'
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                        </button>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs truncate text-zinc-100">
                              {entity.name}
                            </span>
                            <span className="text-[9px] px-1.5 py-0.2 bg-zinc-800 text-zinc-400 rounded uppercase font-mono">
                              {entity.category}
                            </span>
                          </div>
                          <p className="text-[10px] text-zinc-400 truncate mt-0.5">
                            {entity.summary}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Right column: Detailed Preview */}
                <div className="md:col-span-7 bg-zinc-900/70 border border-zinc-800 rounded-2xl p-4 space-y-3 max-h-96 overflow-y-auto shadow-inner">
                  {activePreviewEntity ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                        <div>
                          <h4 className="font-bold text-sm text-zinc-100">
                            {activePreviewEntity.name}
                          </h4>
                          <span className="text-[10px] text-amber-400 font-mono">
                            Категория: {activePreviewEntity.category} • Формат: {activePreviewEntity.sourceFormat}
                          </span>
                        </div>
                        <span className="px-2 py-0.5 bg-zinc-800 text-zinc-300 rounded font-mono text-[10px]">
                          {activePreviewEntity.suggestedFilename}
                        </span>
                      </div>

                      {/* Stats Overview */}
                      {activePreviewEntity.stats && (
                        <div className="grid grid-cols-3 gap-2 bg-zinc-950/80 p-2.5 rounded-xl border border-zinc-850 font-mono text-[11px]">
                          <div>
                            <span className="text-zinc-500 text-[10px] block">ХИТЫ (HP):</span>
                            <span className="text-emerald-400 font-bold">
                              {activePreviewEntity.stats.hp ?? '—'}
                              {activePreviewEntity.stats.hitDice && ` (${activePreviewEntity.stats.hitDice})`}
                            </span>
                          </div>
                          <div>
                            <span className="text-zinc-500 text-[10px] block">КД (AC):</span>
                            <span className="text-amber-400 font-bold">
                              {activePreviewEntity.stats.ac ?? '—'}
                            </span>
                          </div>
                          <div>
                            <span className="text-zinc-500 text-[10px] block">СКОРОСТЬ:</span>
                            <span className="text-cyan-400 font-bold">
                              {activePreviewEntity.stats.speed ?? '30 ft'}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Attributes */}
                      {activePreviewEntity.stats?.attributes && (
                        <div className="flex items-center justify-between bg-zinc-950/50 p-2 rounded-xl border border-zinc-850 font-mono text-[10px] text-center">
                          {Object.entries(activePreviewEntity.stats.attributes).map(([attr, val]) => (
                            <div key={attr} className="px-1">
                              <div className="text-zinc-500 uppercase">{attr}</div>
                              <div className="font-bold text-zinc-200 text-xs">{val}</div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Actions */}
                      {activePreviewEntity.actions && activePreviewEntity.actions.length > 0 && (
                        <div className="space-y-1.5">
                          <h5 className="font-bold text-[11px] text-zinc-300">Действия и атаки:</h5>
                          {activePreviewEntity.actions.map((act, i) => (
                            <div key={i} className="p-2 bg-zinc-950/60 rounded-lg border border-zinc-850 text-[11px]">
                              <span className="font-bold text-amber-300">{act.name}</span>
                              {act.damage && <span className="text-rose-400 ml-2">({act.damage})</span>}
                              <p className="text-zinc-400 mt-0.5">{act.description}</p>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Description / Full Text */}
                      {activePreviewEntity.description && (
                        <div className="space-y-1">
                          <h5 className="font-bold text-[11px] text-zinc-300">Описание:</h5>
                          <div className="p-2.5 bg-zinc-950/80 rounded-xl text-[11px] text-zinc-300 whitespace-pre-wrap max-h-48 overflow-y-auto font-sans leading-relaxed">
                            {activePreviewEntity.description}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-8 text-center text-zinc-500">
                      Выберите сущность слева для подробного просмотра
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-900/60 flex items-center justify-between">
          <div className="text-[11px] text-zinc-400 flex items-center space-x-2">
            <Layers className="w-4 h-4 text-amber-400" />
            <span>
              Файлы сохраняются в директорию <code className="text-amber-300 font-mono">/assets/systems/{selectedSystemId}/</code>
            </span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-xl font-bold transition-all cursor-pointer"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
};
