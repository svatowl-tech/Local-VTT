import React, { useState, useRef } from 'react';
import { uploadCustomMap } from '../services/apiClient';
import { MapItem } from '../types';
import { FloatingWindow } from './FloatingWindow';
import {
  Upload,
  FileVideo,
  FileImage,
  CheckCircle2,
  X,
  Loader2,
  ShieldCheck,
  Cpu,
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onMapUploaded: (mapItem: MapItem) => void;
  categories?: string[];
  zIndex?: number;
  onFocus?: () => void;
}

export const CustomMapUploadModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onMapUploaded,
  categories = ['Подземелья', 'Города', 'Природа', 'Боссы', 'Здания'],
  zIndex = 50,
  onFocus,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('Без категории');
  const [customCategoryInput, setCustomCategoryInput] = useState<string>('');
  const [isCreatingCategory, setIsCreatingCategory] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleFile = async (file: File) => {
    setLoading(true);
    setError(null);

    const targetCategory = isCreatingCategory && customCategoryInput.trim()
      ? customCategoryInput.trim()
      : selectedCategory;

    try {
      const uploadedMap = await uploadCustomMap(file, targetCategory);
      onMapUploaded(uploadedMap);
      setLoading(false);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to upload and parse map on backend');
      setLoading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = () => {
    setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <FloatingWindow
      id="custom-map-upload-panel"
      title="Загрузка карт и медиа"
      isOpen={isOpen}
      onClose={onClose}
      icon={Upload}
      defaultPosition={{ x: 100, y: 70 }}
      defaultSize={{ width: 480, height: 480 }}
      minWidth={340}
      minHeight={300}
      zIndex={zIndex}
      onFocus={onFocus}
    >
      <div className="flex-1 flex flex-col overflow-hidden text-zinc-100 p-4 space-y-3">
        {/* Category Selection Toolbar */}
        <div className="flex flex-col space-y-1.5 shrink-0">
          <label className="text-xs font-semibold text-zinc-300 flex items-center justify-between">
            <span>Категория для карты:</span>
            <button
              type="button"
              onClick={() => setIsCreatingCategory(!isCreatingCategory)}
              className="text-[11px] text-amber-400 hover:text-amber-300 underline font-medium"
            >
              {isCreatingCategory ? 'Выбрать существующую' : '+ Создать новую папку'}
            </button>
          </label>

          {isCreatingCategory ? (
            <input
              type="text"
              placeholder="Введите название новой категории..."
              value={customCategoryInput}
              onChange={(e) => setCustomCategoryInput(e.target.value)}
              className="w-full bg-zinc-950 border border-amber-500/50 rounded-xl px-3 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-amber-400"
            />
          ) : (
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-zinc-700"
            >
              <option value="Без категории">📂 Без категории</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  📁 {cat}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Drag and Drop Zone */}
        <div className="flex-1 flex flex-col justify-center">
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`flex-1 min-h-[180px] border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
              dragActive
                ? 'border-emerald-400 bg-emerald-500/10'
                : 'border-zinc-800 hover:border-zinc-700 bg-zinc-950/60'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*,.mp4,.webm,.mov,.png,.jpg,.jpeg,.webp,.gif,.svg"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFile(e.target.files[0]);
                }
              }}
            />

            {loading ? (
              <div className="flex flex-col items-center space-y-3">
                <Loader2 className="w-10 h-10 text-emerald-400 animate-spin" />
                <div className="text-sm font-semibold text-zinc-200">
                  Обработка на сервере...
                </div>
                <div className="flex items-center space-x-1.5 text-xs text-zinc-400 font-mono bg-zinc-900 px-2.5 py-1 rounded border border-zinc-800">
                  <Cpu className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                  <span>SHA-256 Checksum & Metadata</span>
                </div>
              </div>
            ) : (
              <>
                <div className="flex space-x-2 mb-2">
                  <div className="p-2.5 bg-zinc-900 rounded-xl border border-zinc-800 text-amber-400">
                    <FileImage className="w-5 h-5" />
                  </div>
                  <div className="p-2.5 bg-zinc-900 rounded-xl border border-zinc-800 text-cyan-400">
                    <FileVideo className="w-5 h-5" />
                  </div>
                </div>

                <h3 className="font-semibold text-xs text-zinc-200">
                  Перетащите изображение или видео карты сюда
                </h3>
                <p className="text-[11px] text-zinc-400 mt-1">
                  Поддержка MP4, WEBM, PNG, JPG, WEBP, GIF, SVG
                </p>
                <button className="mt-3 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold text-xs rounded-lg transition-all shadow-md">
                  Выбрать файл
                </button>
              </>
            )}
          </div>

          {error && (
            <div className="mt-2 p-2.5 bg-red-500/10 border border-red-500/30 rounded-xl text-red-300 text-xs flex items-center space-x-2 shrink-0">
              <X className="w-4 h-4 text-red-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Backend Specs */}
          <div className="mt-3 pt-2 border-t border-zinc-800/80 flex items-center justify-between text-[11px] text-zinc-400 shrink-0">
            <div className="flex items-center space-x-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Парсинг и хэширование на сервере</span>
            </div>
            <span className="font-mono text-zinc-400">Fast Backend</span>
          </div>
        </div>
      </div>
    </FloatingWindow>
  );
};
