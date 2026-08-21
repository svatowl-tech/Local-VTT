import React, { useState, useEffect } from 'react';
import { CameraFrame, MapItem, GridSettings } from '../types';
import {
  Lock,
  Unlock,
  Crosshair,
  Tv,
  RotateCw,
  Grid3X3,
  Plus,
  Minus,
  Link as LinkIcon,
  Unlink,
  Trash2,
  AlertTriangle,
  Check,
} from 'lucide-react';
import { setCameraAspectRatio } from '../services/apiClient';

interface Props {
  camera: CameraFrame;
  activeMap?: MapItem;
  grid?: GridSettings;
  onUpdateCamera: (cameraPartial: Partial<CameraFrame>) => void;
  onClearWorkspace?: () => void;
}

export const CameraControlsPanel: React.FC<Props> = ({
  camera,
  activeMap,
  grid,
  onUpdateCamera,
  onClearWorkspace,
}) => {
  // Grid cell size in pixels (default 50px per cell)
  const cellSize = grid?.size && grid.size > 0 ? grid.size : activeMap?.gridSize || 50;

  // State for maintaining aspect ratio when changing cell count
  const [keepAspectRatio, setKeepAspectRatio] = useState<boolean>(true);
  const [confirmClear, setConfirmClear] = useState<boolean>(false);
  const [clearSuccessFeedback, setClearSuccessFeedback] = useState<boolean>(false);

  // Local state for cell inputs to allow fluid typing
  const currentCellsW = Math.round((camera.width / cellSize) * 10) / 10;
  const currentCellsH = Math.round((camera.height / cellSize) * 10) / 10;

  const [inputCellsW, setInputCellsW] = useState<string>(String(currentCellsW));
  const [inputCellsH, setInputCellsH] = useState<string>(String(currentCellsH));

  useEffect(() => {
    setInputCellsW(String(Math.round((camera.width / cellSize) * 10) / 10));
    setInputCellsH(String(Math.round((camera.height / cellSize) * 10) / 10));
  }, [camera.width, camera.height, cellSize]);

  useEffect(() => {
    if (!confirmClear) return;
    const timer = setTimeout(() => setConfirmClear(false), 4000);
    return () => clearTimeout(timer);
  }, [confirmClear]);

  const handleExecuteClear = () => {
    if (onClearWorkspace) {
      onClearWorkspace();
      setConfirmClear(false);
      setClearSuccessFeedback(true);
      setTimeout(() => setClearSuccessFeedback(false), 2500);
    }
  };

  const handleAspectRatioChange = async (ratio: number) => {
    try {
      const res = await setCameraAspectRatio(ratio);
      onUpdateCamera(res.camera);
    } catch {
      // Local update fallback
      const baseWidth = ratio === 16 / 9 ? 960 : ratio === 16 / 10 ? 960 : 800;
      onUpdateCamera({
        aspectRatio: ratio,
        width: baseWidth,
        height: Math.round(baseWidth / ratio),
      });
    }
  };

  const applyCellWidth = (targetCellsW: number) => {
    if (isNaN(targetCellsW) || targetCellsW <= 0) return;
    const newWidthPx = Math.round(targetCellsW * cellSize);

    if (keepAspectRatio) {
      const ratio = camera.aspectRatio || 16 / 9;
      const newHeightPx = Math.round(newWidthPx / ratio);
      onUpdateCamera({
        width: newWidthPx,
        height: newHeightPx,
      });
    } else {
      const currentHeightPx = camera.height;
      const newRatio = newWidthPx / (currentHeightPx || 1);
      onUpdateCamera({
        width: newWidthPx,
        aspectRatio: newRatio,
      });
    }
  };

  const applyCellHeight = (targetCellsH: number) => {
    if (isNaN(targetCellsH) || targetCellsH <= 0) return;
    const newHeightPx = Math.round(targetCellsH * cellSize);

    if (keepAspectRatio) {
      const ratio = camera.aspectRatio || 16 / 9;
      const newWidthPx = Math.round(newHeightPx * ratio);
      onUpdateCamera({
        width: newWidthPx,
        height: newHeightPx,
      });
    } else {
      const currentWidthPx = camera.width;
      const newRatio = currentWidthPx / (newHeightPx || 1);
      onUpdateCamera({
        height: newHeightPx,
        aspectRatio: newRatio,
      });
    }
  };

  const applyCellDimensions = (presetW: number, presetH: number) => {
    const newW = Math.round(presetW * cellSize);
    const newH = Math.round(presetH * cellSize);
    onUpdateCamera({
      width: newW,
      height: newH,
      aspectRatio: newW / newH,
    });
  };

  const centerOnActiveMap = () => {
    if (!activeMap) return;
    const mapCenterX = activeMap.position.x + (activeMap.width * activeMap.scale.x) / 2;
    const mapCenterY = activeMap.position.y + (activeMap.height * activeMap.scale.y) / 2;

    onUpdateCamera({
      x: Math.round(mapCenterX - camera.width / 2),
      y: Math.round(mapCenterY - camera.height / 2),
    });
  };

  return (
    <div className="w-full text-zinc-200 select-none flex flex-col space-y-3 font-sans">
      {/* Panel Header */}
      <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2">
        <div className="flex items-center space-x-1.5 text-xs font-semibold text-cyan-400">
          <Tv className="w-4 h-4" />
          <span>Камера игроков (Win 2)</span>
        </div>

        <button
          onClick={() => onUpdateCamera({ locked: !camera.locked })}
          className={`p-1.5 rounded-lg transition-all ${
            camera.locked
              ? 'bg-red-500/20 text-red-400 border border-red-500/30'
              : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700 border border-zinc-700/50'
          }`}
          title={camera.locked ? 'Разблокировать перемещение рамки' : 'Заблокировать перемещение рамки'}
        >
          {camera.locked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Aspect Ratio Selector */}
      <div className="flex flex-col space-y-1">
        <span className="text-[10px] font-mono uppercase text-zinc-400 tracking-wider">
          Соотношение сторон
        </span>
        <div className="grid grid-cols-3 gap-1">
          {[
            { label: '16:9', value: 16 / 9 },
            { label: '16:10', value: 16 / 10 },
            { label: '4:3', value: 4 / 3 },
          ].map((item) => (
            <button
              key={item.label}
              onClick={() => handleAspectRatioChange(item.value)}
              className={`py-1 rounded-lg text-xs font-mono transition-all border ${
                Math.abs(camera.aspectRatio - item.value) < 0.05
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 font-bold shadow-sm'
                  : 'bg-zinc-800/60 text-zinc-400 border-zinc-800 hover:bg-zinc-800'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid Cell Dimensions Controls */}
      <div className="p-2.5 bg-zinc-950/70 border border-zinc-800 rounded-xl space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1.5 text-[11px] font-semibold text-zinc-300">
            <Grid3X3 className="w-3.5 h-3.5 text-cyan-400" />
            <span>Размер рамки в клетках</span>
          </div>

          {/* Aspect Ratio Lock Toggle */}
          <button
            onClick={() => setKeepAspectRatio((v) => !v)}
            className={`flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] font-mono transition-colors border ${
              keepAspectRatio
                ? 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30'
                : 'bg-zinc-800 text-zinc-400 border-zinc-700'
            }`}
            title={keepAspectRatio ? 'Пропорции сохранены' : 'Свободное изменение сторон'}
          >
            {keepAspectRatio ? <LinkIcon className="w-3 h-3 text-cyan-400" /> : <Unlink className="w-3 h-3 text-zinc-500" />}
            <span>{keepAspectRatio ? 'Связан' : 'Раздельно'}</span>
          </button>
        </div>

        {/* Cell Inputs Grid */}
        <div className="grid grid-cols-2 gap-2">
          {/* Width in Cells */}
          <div className="flex flex-col space-y-1">
            <label className="text-[10px] text-zinc-400 font-mono">
              Длина (клеток)
            </label>
            <div className="flex items-center space-x-1 bg-zinc-900 border border-zinc-800 rounded-lg p-1">
              <button
                onClick={() => applyCellWidth(Math.max(1, currentCellsW - 1))}
                className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-zinc-100 transition-colors"
                title="-1 клетка"
              >
                <Minus className="w-3 h-3" />
              </button>
              <input
                type="number"
                step="0.5"
                min="1"
                value={inputCellsW}
                onChange={(e) => setInputCellsW(e.target.value)}
                onBlur={() => applyCellWidth(parseFloat(inputCellsW))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    applyCellWidth(parseFloat(inputCellsW));
                  }
                }}
                className="w-full bg-transparent text-center text-xs font-mono font-bold text-cyan-300 focus:outline-none"
              />
              <button
                onClick={() => applyCellWidth(currentCellsW + 1)}
                className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-zinc-100 transition-colors"
                title="+1 клетка"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Height in Cells */}
          <div className="flex flex-col space-y-1">
            <label className="text-[10px] text-zinc-400 font-mono">
              Ширина (клеток)
            </label>
            <div className="flex items-center space-x-1 bg-zinc-900 border border-zinc-800 rounded-lg p-1">
              <button
                onClick={() => applyCellHeight(Math.max(1, currentCellsH - 1))}
                className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-zinc-100 transition-colors"
                title="-1 клетка"
              >
                <Minus className="w-3 h-3" />
              </button>
              <input
                type="number"
                step="0.5"
                min="1"
                value={inputCellsH}
                onChange={(e) => setInputCellsH(e.target.value)}
                onBlur={() => applyCellHeight(parseFloat(inputCellsH))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    applyCellHeight(parseFloat(inputCellsH));
                  }
                }}
                className="w-full bg-transparent text-center text-xs font-mono font-bold text-cyan-300 focus:outline-none"
              />
              <button
                onClick={() => applyCellHeight(currentCellsH + 1)}
                className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-zinc-100 transition-colors"
                title="+1 клетка"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>

        {/* Quick Cell Presets */}
        <div className="space-y-1 pt-1">
          <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-wider">
            Пресеты клеток
          </span>
          <div className="grid grid-cols-4 gap-1">
            {[
              { label: '16 × 9', w: 16, h: 9 },
              { label: '20 × 11', w: 20, h: 11.25 },
              { label: '24 × 13.5', w: 24, h: 13.5 },
              { label: '30 × 17', w: 30, h: 16.875 },
            ].map((preset) => (
              <button
                key={preset.label}
                onClick={() => applyCellDimensions(preset.w, preset.h)}
                className="py-1 px-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 rounded text-[10px] font-mono text-zinc-300 text-center transition-colors truncate"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Size Badge */}
        <div className="flex items-center justify-between pt-1 text-[10px] font-mono text-zinc-400 border-t border-zinc-800/60">
          <span>{Math.round(camera.width)} × {Math.round(camera.height)} px</span>
          <span className="text-zinc-500">1 кл = {cellSize}px</span>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-col space-y-1.5 pt-0.5">
        <div className="grid grid-cols-2 gap-1.5">
          <button
            type="button"
            id="camera-center-on-map-btn"
            onClick={centerOnActiveMap}
            disabled={!activeMap}
            className="flex items-center justify-center space-x-1 py-1.5 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-xs text-zinc-200 rounded-lg border border-zinc-700/60 transition-colors shadow-sm cursor-pointer"
            title="Центрировать камеру на активной карте"
          >
            <Crosshair className="w-3.5 h-3.5 text-amber-400" />
            <span>На карту</span>
          </button>

          <button
            type="button"
            id="camera-rotate-90-btn"
            onClick={() =>
              onUpdateCamera({
                rotation: (camera.rotation + 90) % 360,
              })
            }
            className="flex items-center justify-center space-x-1 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-200 rounded-lg border border-zinc-700/60 transition-colors shadow-sm cursor-pointer"
            title="Повернуть рамку камеры на 90°"
          >
            <RotateCw className="w-3.5 h-3.5 text-cyan-400" />
            <span>Поворот 90°</span>
          </button>
        </div>

        {/* Clear Workspace Button (Clears all drawings, spells, effects, props, keeping base map and player camera) */}
        {onClearWorkspace && (
          <div>
            {!confirmClear && !clearSuccessFeedback && (
              <button
                type="button"
                id="clear-workspace-btn"
                onClick={() => setConfirmClear(true)}
                className="w-full flex items-center justify-center space-x-1.5 py-1.5 px-2 bg-red-950/40 hover:bg-red-900/60 text-red-300 hover:text-red-100 rounded-lg border border-red-800/40 hover:border-red-600/60 text-xs transition-all shadow-sm group cursor-pointer"
                title="Очистить рабочую область от всех рисунков, заклинаний, эффектов и декораций (сохраняет карту и камеру игроков)"
              >
                <Trash2 className="w-3.5 h-3.5 text-red-400 group-hover:scale-110 transition-transform" />
                <span className="font-medium">Очистить карту</span>
              </button>
            )}

            {confirmClear && (
              <div
                id="clear-workspace-confirm-box"
                className="flex items-center space-x-1 p-1 bg-red-950/90 border border-red-500/80 rounded-lg animate-in fade-in zoom-in-95 duration-150"
              >
                <div className="flex-1 px-1.5 text-[11px] text-red-200 font-semibold flex items-center space-x-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span className="truncate">Удалить всё кроме карты?</span>
                </div>
                <button
                  type="button"
                  id="confirm-clear-workspace-btn"
                  onClick={handleExecuteClear}
                  className="px-2 py-1 bg-red-600 hover:bg-red-500 text-white text-[11px] font-bold rounded shadow transition-colors shrink-0 cursor-pointer"
                >
                  Да
                </button>
                <button
                  type="button"
                  id="cancel-clear-workspace-btn"
                  onClick={() => setConfirmClear(false)}
                  className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[11px] rounded transition-colors shrink-0 cursor-pointer"
                >
                  Нет
                </button>
              </div>
            )}

            {clearSuccessFeedback && (
              <div
                id="clear-workspace-success-box"
                className="w-full flex items-center justify-center space-x-1.5 py-1.5 bg-emerald-950/80 border border-emerald-500/60 text-emerald-300 rounded-lg text-xs font-semibold animate-in fade-in duration-200"
              >
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>Карта очищена!</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
