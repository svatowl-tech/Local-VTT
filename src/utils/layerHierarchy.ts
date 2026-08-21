import { LayerStackConfig, TabletopLayerId, LayerItemConfig, MapItem, ObjectLayerType } from '../types';
import { DEFAULT_LAYERS_CONFIG } from '../services/defaultSession';

export function getLayerConfigMap(layersConfig?: LayerStackConfig): Record<string, LayerItemConfig> {
  const layers = layersConfig?.layers && layersConfig.layers.length > 0
    ? layersConfig.layers
    : DEFAULT_LAYERS_CONFIG.layers;

  const map: Record<string, LayerItemConfig> = {};
  for (const layer of layers) {
    map[layer.id] = layer;
  }
  return map;
}

export function getLayerZIndex(layerId: string, layersConfig?: LayerStackConfig): number {
  const configMap = getLayerConfigMap(layersConfig);
  const layer = configMap[layerId];
  if (!layer) return 100;
  return layer.order * 10;
}

export function getLayerOpacity(layerId: string, layersConfig?: LayerStackConfig): number {
  const configMap = getLayerConfigMap(layersConfig);
  const layer = configMap[layerId];
  return layer ? layer.opacity : 1;
}

export function isLayerVisible(layerId: string, layersConfig?: LayerStackConfig): boolean {
  const configMap = getLayerConfigMap(layersConfig);
  const layer = configMap[layerId];
  return layer ? layer.visible : true;
}

export function isLayerLocked(layerId: string, layersConfig?: LayerStackConfig): boolean {
  const configMap = getLayerConfigMap(layersConfig);
  const layer = configMap[layerId];
  return layer ? layer.locked : false;
}

export function mapObjectLayerToTabletopLayer(objLayer?: ObjectLayerType): string {
  if (!objLayer) return 'maps';
  switch (objLayer) {
    case 'background':
      return 'maps';
    case 'props':
      return 'props';
    case 'overhead':
      return 'overhead';
    case 'above-fog':
      return 'laser'; // Floats above fog of war
    default:
      return objLayer; // Return custom layer id directly
  }
}

export function filterMapsByObjectLayer(maps: MapItem[], layerType: ObjectLayerType): MapItem[] {
  return maps.filter((m) => {
    if (layerType === 'background') {
      return !m.layer || m.layer === 'background';
    }
    return m.layer === layerType;
  });
}

export function getCustomLayers(layersConfig?: LayerStackConfig): LayerItemConfig[] {
  const layers = layersConfig?.layers || DEFAULT_LAYERS_CONFIG.layers;
  return layers.filter((l) => l.isCustom);
}

export const COLOR_THEMES: Record<string, { color: string; bg: string; border: string; label: string }> = {
  amber: { color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30', label: 'Янтарный' },
  blue: { color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30', label: 'Синий' },
  emerald: { color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', label: 'Изумрудный' },
  purple: { color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/30', label: 'Фиолетовый' },
  rose: { color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/30', label: 'Розовый' },
  cyan: { color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/30', label: 'Бирюзовый' },
  orange: { color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/30', label: 'Оранжевый' },
  indigo: { color: 'text-indigo-400', bg: 'bg-indigo-500/10', border: 'border-indigo-500/30', label: 'Индиго' },
  yellow: { color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', label: 'Желтый' },
  zinc: { color: 'text-zinc-300', bg: 'bg-zinc-500/15', border: 'border-zinc-500/30', label: 'Серый' },
};
