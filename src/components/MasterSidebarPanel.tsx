import React, { useState, memo } from 'react';
import {
  TabletopSessionState,
  MapItem,
  ActiveTool,
  ToolSettings,
  CameraFrame,
  FogState,
  PlayerBlackoutState,
} from '../types';
import {
  Tv,
  EyeOff,
  Lock,
  SlidersHorizontal,
  ChevronRight,
} from 'lucide-react';
import { CameraControlsPanel } from './CameraControlsPanel';
import { FogOfWarPanel } from './FogOfWarPanel';
import { PlayerCurtainPanel } from './PlayerCurtainPanel';

interface Props {
  session: TabletopSessionState;
  activeMap?: MapItem;
  activeTool: ActiveTool;
  setActiveTool: (tool: ActiveTool) => void;
  toolSettings: ToolSettings;
  handleUpdateToolSettings: (settings: Partial<ToolSettings>) => void;
  onUpdateCamera: (cam: Partial<CameraFrame>) => void;
  onClearWorkspace?: () => void;
  onUpdateFog: (fog: Partial<FogState>) => void;
  handleResetFog: (fillWithFog: boolean) => void;
  onTogglePlayerBlackout?: () => void;
  onUpdatePlayerBlackout?: (b: Partial<PlayerBlackoutState>) => void;
  isMinimized?: boolean;
  onToggleMinimize?: () => void;
  onStartDrag?: (e: React.MouseEvent) => void;
}

const MemoizedCameraControlsPanel = memo(CameraControlsPanel);
const MemoizedFogOfWarPanel = memo(FogOfWarPanel);

export const MasterSidebarPanel: React.FC<Props> = ({
  session,
  activeMap,
  activeTool,
  setActiveTool,
  toolSettings,
  handleUpdateToolSettings,
  onUpdateCamera,
  onClearWorkspace,
  onUpdateFog,
  handleResetFog,
  onTogglePlayerBlackout,
  onUpdatePlayerBlackout,
  isMinimized,
  onToggleMinimize,
  onStartDrag,
}) => {
  const [activeTab, setActiveTab] = useState<'camera' | 'fog' | 'curtain'>('camera');
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);

  if (isMinimized) {
    return (
      <div
        onMouseDown={onStartDrag}
        className="cursor-grab active:cursor-grabbing w-14 h-14 bg-zinc-950/95 backdrop-blur-xl border-2 border-amber-500/50 hover:border-amber-400 rounded-2xl shadow-2xl flex flex-col items-center justify-center p-1.5 transition-all duration-200 hover:scale-110 hover:shadow-amber-500/20 hover:bg-zinc-900 group select-none relative"
        title="Панель управления сценой (кликните, чтобы открыть; зажмите, чтобы переместить)"
      >
        <div className="absolute inset-0 bg-amber-500/10 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
        {session.playerBlackout?.enabled && (
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
          </span>
        )}
        <div className="w-7 h-7 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 group-hover:bg-amber-500 group-hover:text-zinc-950 transition-all duration-200 shadow-sm">
          <SlidersHorizontal className="w-4 h-4" />
        </div>
        <span className="text-[8px] font-bold text-amber-300/90 group-hover:text-amber-300 tracking-tight mt-0.5 truncate max-w-full">
          Пульт
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-start space-x-2 w-full h-full select-none">
      {/* Toggle Sidebar Button */}
      <button
        onClick={() => setIsSidebarOpen((v) => !v)}
        className="p-2 bg-zinc-900/95 backdrop-blur-md border border-zinc-800 rounded-xl text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800 transition-all shadow-xl"
        title={isSidebarOpen ? 'Свернуть боковую панель' : 'Развернуть боковую панель'}
      >
        {isSidebarOpen ? <ChevronRight className="w-4 h-4" /> : <SlidersHorizontal className="w-4 h-4" />}
      </button>

      {/* Unified Sidebar Container */}
      {isSidebarOpen && (
        <div className="w-full max-h-[calc(100vh-5.5rem)] flex flex-col bg-zinc-900/95 backdrop-blur-md border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden">
          {/* Tab Navigation Header */}
          <div className="flex items-center bg-zinc-950/80 p-1 border-b border-zinc-800/80">
            <button
              onClick={() => setActiveTab('camera')}
              className={`flex-1 flex items-center justify-center space-x-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'camera'
                  ? 'bg-zinc-800 text-cyan-400 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Tv className="w-3.5 h-3.5" />
              <span>Камера</span>
            </button>

            <button
              onClick={() => setActiveTab('fog')}
              className={`flex-1 flex items-center justify-center space-x-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'fog'
                  ? 'bg-zinc-800 text-amber-400 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <EyeOff className="w-3.5 h-3.5" />
              <span>Туман</span>
            </button>

            <button
              onClick={() => setActiveTab('curtain')}
              className={`flex-1 flex items-center justify-center space-x-1 py-1.5 rounded-lg text-xs font-semibold transition-all relative ${
                activeTab === 'curtain'
                  ? 'bg-zinc-800 text-amber-300 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Заглушка</span>
              {session.playerBlackout?.enabled && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              )}
            </button>
          </div>

          {/* Tab Content Container */}
          <div className="p-3 overflow-y-auto max-h-[calc(100vh-8.5rem)]">
            {activeTab === 'camera' && (
              <MemoizedCameraControlsPanel
                camera={session.camera}
                activeMap={activeMap}
                grid={session.grid}
                onUpdateCamera={onUpdateCamera}
                onClearWorkspace={onClearWorkspace}
              />
            )}

            {activeTab === 'fog' && (
              <MemoizedFogOfWarPanel
                fog={session.fog}
                activeTool={activeTool}
                onSelectTool={setActiveTool}
                onUpdateFog={onUpdateFog}
                fogBrushRadius={toolSettings.brushSize * 2}
                onChangeBrushRadius={(r) => handleUpdateToolSettings({ brushSize: Math.round(r / 2) })}
                onResetFog={handleResetFog}
              />
            )}

            {activeTab === 'curtain' && (
              <PlayerCurtainPanel
                blackout={session.playerBlackout}
                onToggleBlackout={onTogglePlayerBlackout}
                onUpdateBlackout={onUpdatePlayerBlackout}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
};
