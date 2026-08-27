import React, { useState, useEffect, useRef } from 'react';
import { generateDungeon, drawDungeonToDataURL, DungeonOptions } from '../utils/dungeonGenerator';
import { 
  X, 
  Dices, 
  Download, 
  Layers, 
  ArrowUp, 
  ArrowDown, 
  Armchair, 
  SunMedium, 
  Palette, 
  Sparkles,
  CheckCircle2,
  FileDown,
  Building2,
  Grid,
  MapPin,
  Settings2,
  Move,
  RotateCcw,
  FileCode,
  Castle,
  Home,
  LayoutGrid,
  CheckSquare,
  Square,
  RefreshCw,
  Skull
} from 'lucide-react';
import { MapItem } from '../types';
import { DraggableResizablePanel } from './DraggableResizablePanel';
import { NpcRawData, TreasureRawData, LootRawData, MerchantRawData, TravelingMerchantRawData, StationaryShopRawData, EquipmentRawData, MagicItemRawData, MonsterRawData } from '../types/generatorTypes';
import { NpcCardView } from './generators/NpcCardView';
import { TreasureCardView } from './generators/TreasureCardView';
import { LootCardView } from './generators/LootCardView';
import { MerchantCardView } from './generators/MerchantCardView';
import { TravelingMerchantView } from './generators/TravelingMerchantView';
import { StationaryShopView } from './generators/StationaryShopView';
import { EquipmentCardView } from './generators/EquipmentCardView';
import { MagicItemCardView } from './generators/MagicItemCardView';
import { MonsterCardView } from './generators/MonsterCardView';
import { monsterGeneratorService } from '../services/monsterGeneratorService';
import { playUniversalSfx } from '../utils/sfxAudio';

interface HouseFloorInfo {
  index: number;
  label: string;
  name: string;
  isBasement: boolean;
}

interface HouseInfo {
  name: string;
  hasBasement: boolean;
  numFloors: number;
  floors: HouseFloorInfo[];
  currentFloor: number;
}

interface Props {
  onClose: () => void;
  onImportDungeon: (mapItem: MapItem) => void;
  onImportMultipleMaps?: (mapItems: MapItem[]) => void;
}

export const DungeonGeneratorPanel: React.FC<Props> = ({ onClose, onImportDungeon, onImportMultipleMaps }) => {
  type GeneratorTab = 'dungeon' | 'city' | 'village' | 'house' | 'tavern' | 'monster' | 'npc' | 'loot' | 'treasure' | 'merchant' | 'shop' | 'equipment' | 'magic_items';
  
  const GENERATOR_TABS: { id: GeneratorTab; label: string; icon: React.ReactNode }[] = [
    { id: 'dungeon', label: 'Подземелье', icon: <Castle className="w-3.5 h-3.5 shrink-0" /> },
    { id: 'tavern', label: 'Таверна', icon: <Home className="w-3.5 h-3.5 shrink-0" /> },
    { id: 'city', label: 'Город', icon: <Building2 className="w-3.5 h-3.5 shrink-0" /> },
    { id: 'village', label: 'Деревня', icon: <MapPin className="w-3.5 h-3.5 shrink-0" /> },
    { id: 'house', label: 'Дом', icon: <Home className="w-3.5 h-3.5 shrink-0" /> },
    { id: 'monster', label: 'Бестиарий / Монстр', icon: <Skull className="w-3.5 h-3.5 shrink-0 text-rose-400" /> },
    { id: 'npc', label: 'NPC', icon: <Dices className="w-3.5 h-3.5 shrink-0" /> },
    { id: 'loot', label: 'Лут', icon: <Sparkles className="w-3.5 h-3.5 shrink-0" /> },
    { id: 'treasure', label: 'Сокровища', icon: <Sparkles className="w-3.5 h-3.5 shrink-0" /> },
    { id: 'merchant', label: 'Странствующий торговец', icon: <Dices className="w-3.5 h-3.5 shrink-0" /> },
    { id: 'shop', label: 'Стационарная лавка', icon: <Building2 className="w-3.5 h-3.5 shrink-0" /> },
    { id: 'equipment', label: 'Экипировка', icon: <Settings2 className="w-3.5 h-3.5 shrink-0" /> },
    { id: 'magic_items', label: 'Магия (по Школам)', icon: <Sparkles className="w-3.5 h-3.5 shrink-0" /> },
  ];

  const [activeTab, setActiveTab] = useState<GeneratorTab>('dungeon');
  const [visitedTabs, setVisitedTabs] = useState<Record<string, boolean>>(() => ({
    dungeon: true,
  }));

  useEffect(() => {
    setVisitedTabs(prev => prev[activeTab] ? prev : { ...prev, [activeTab]: true });

    const iframeMap: Record<string, React.RefObject<HTMLIFrameElement | null>> = {
      tavern: tavernIframeRef,
      city: cityIframeRef,
      village: villageIframeRef,
      house: houseIframeRef,
    };
    const targetRef = iframeMap[activeTab];
    if (targetRef && targetRef.current && targetRef.current.contentWindow) {
      try {
        targetRef.current.contentWindow.dispatchEvent(new Event('resize'));
      } catch (e) {
        // ignore cross-origin error
      }
    }
  }, [activeTab]);
  
  // Tavern state
  const tavernIframeRef = useRef<HTMLIFrameElement | null>(null);
  const [tavernNotification, setTavernNotification] = useState<string | null>(null);
  const [isImportingTavern, setIsImportingTavern] = useState(false);

  // City state
  const cityIframeRef = useRef<HTMLIFrameElement | null>(null);
  const [cityNotification, setCityNotification] = useState<string | null>(null);
  const [isImportingCity, setIsImportingCity] = useState(false);

  // Village state
  const villageIframeRef = useRef<HTMLIFrameElement | null>(null);
  const [villageNotification, setVillageNotification] = useState<string | null>(null);
  const [isImportingVillage, setIsImportingVillage] = useState(false);

  // House (Dwellings) state
  const houseIframeRef = useRef<HTMLIFrameElement | null>(null);
  const [houseNotification, setHouseNotification] = useState<string | null>(null);
  const [isImportingHouse, setIsImportingHouse] = useState(false);
  const [houseInfo, setHouseInfo] = useState<HouseInfo | null>(null);
  const [selectedFloors, setSelectedFloors] = useState<Record<number, boolean>>({});
  const [multiFloorPlacement, setMultiFloorPlacement] = useState<'horizontal' | 'grid' | 'stacked'>('horizontal');
  const [batchImportProgress, setBatchImportProgress] = useState<{ current: number; total: number; houseName: string } | null>(null);
  const batchFloorsAccumulator = useRef<MapItem[]>([]);

  // Listen to export messages from Watabou generator iframes
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'TAVERN_MAP_EXPORT') {
        const { dataUrl, filename, width, height } = event.data;
        if (!dataUrl) return;

        const mapWidth = width || 1400;
        const mapHeight = height || 1400;

        const newMap: MapItem = {
          id: `tavern_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
          name: filename ? `Таверна: ${filename}` : `Таверна (${mapWidth}x${mapHeight})`,
          type: 'image',
          url: dataUrl,
          width: mapWidth,
          height: mapHeight,
          aspectRatio: mapWidth / mapHeight,
          position: { x: 0, y: 0 },
          scale: { x: 1, y: 1 },
          rotation: 0,
          zIndex: 1,
          opacity: 1,
          hash: `tavern_${Date.now()}`,
          fileSize: 0,
          format: 'image/png',
          gridSize: 70,
          gridOffset: { x: 0, y: 0 },
          category: 'Таверны',
          layer: 'background',
          locked: false,
          hiddenFromPlayers: false,
        };

        onImportDungeon(newMap);
        setIsImportingTavern(false);
        setTavernNotification('План таверны успешно импортирован на игровой стол!');
        setTimeout(() => setTavernNotification(null), 4000);
      } else if (event.data && event.data.type === 'CITY_MAP_EXPORT') {
        const { dataUrl, filename, width, height, format } = event.data;
        if (!dataUrl) return;

        const mapWidth = width || 2048;
        const mapHeight = height || 2048;

        const newMap: MapItem = {
          id: `city_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
          name: filename ? `Город: ${filename}` : `Город (${mapWidth}x${mapHeight})`,
          type: 'image',
          url: dataUrl,
          width: mapWidth,
          height: mapHeight,
          aspectRatio: mapWidth / mapHeight,
          position: { x: 0, y: 0 },
          scale: { x: 1, y: 1 },
          rotation: 0,
          zIndex: 1,
          opacity: 1,
          hash: `city_${Date.now()}`,
          fileSize: 0,
          format: format === 'svg' ? 'image/svg+xml' : 'image/png',
          gridSize: 70,
          gridOffset: { x: 0, y: 0 },
          category: 'Города',
          layer: 'background',
          locked: false,
          hiddenFromPlayers: false,
        };

        onImportDungeon(newMap);
        setIsImportingCity(false);
        setCityNotification('Карта города успешно импортирована на игровой стол!');
        setTimeout(() => setCityNotification(null), 4000);
      } else if (event.data && event.data.type === 'VILLAGE_MAP_EXPORT') {
        const { dataUrl, filename, width, height, format } = event.data;
        if (!dataUrl) return;

        const mapWidth = width || 2048;
        const mapHeight = height || 2048;

        const newMap: MapItem = {
          id: `village_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
          name: filename ? `Деревня: ${filename}` : `Деревня (${mapWidth}x${mapHeight})`,
          type: 'image',
          url: dataUrl,
          width: mapWidth,
          height: mapHeight,
          aspectRatio: mapWidth / mapHeight,
          position: { x: 0, y: 0 },
          scale: { x: 1, y: 1 },
          rotation: 0,
          zIndex: 1,
          opacity: 1,
          hash: `village_${Date.now()}`,
          fileSize: 0,
          format: format === 'svg' ? 'image/svg+xml' : 'image/png',
          gridSize: 70,
          gridOffset: { x: 0, y: 0 },
          category: 'Деревни',
          layer: 'background',
          locked: false,
          hiddenFromPlayers: false,
        };

        onImportDungeon(newMap);
        setIsImportingVillage(false);
        setVillageNotification('Карта деревни успешно импортирована на игровой стол!');
        setTimeout(() => setVillageNotification(null), 4000);
      } else if (event.data && event.data.type === 'DWELLINGS_INFO_RESPONSE') {
        const info: HouseInfo = event.data.info;
        if (info) {
          setHouseInfo(info);
          setSelectedFloors(prev => {
            const next: Record<number, boolean> = { ...prev };
            info.floors.forEach(f => {
              if (typeof next[f.index] === 'undefined') {
                next[f.index] = true;
              }
            });
            return next;
          });
        }
      } else if (event.data && event.data.type === 'DWELLINGS_BATCH_START') {
        const { total, houseName } = event.data;
        setIsImportingHouse(true);
        setBatchImportProgress({ current: 0, total: total || 1, houseName: houseName || 'Дом' });
        batchFloorsAccumulator.current = [];
      } else if (event.data && event.data.type === 'DWELLINGS_BATCH_COMPLETE') {
        const { total, houseName } = event.data;
        setIsImportingHouse(false);
        setBatchImportProgress(null);
        setHouseNotification(`Все ${total} этажей дома "${houseName || 'Особняк'}" успешно импортированы на игровой стол!`);
        setTimeout(() => setHouseNotification(null), 5000);
      } else if (event.data && event.data.type === 'DWELLINGS_EXPORT_ERROR') {
        setIsImportingHouse(false);
        setHouseNotification('Ошибка экспорта: ' + (event.data.error || 'Сбой генерации'));
        setTimeout(() => setHouseNotification(null), 5000);
      } else if (event.data && event.data.type === 'DWELLINGS_MAP_EXPORT') {
        const { 
          dataUrl, 
          filename, 
          width, 
          height, 
          format, 
          floorIndex, 
          floorLabel, 
          floorTitle, 
          isBatch, 
          batchIndex, 
          batchTotal, 
          isMultiSheet, 
          houseName 
        } = event.data;
        if (!dataUrl) return;

        const mapWidth = width || 2048;
        const mapHeight = height || 2048;

        let posX = 0;
        let posY = 0;

        if (isBatch) {
          const idx = typeof batchIndex === 'number' ? batchIndex : 0;
          if (multiFloorPlacement === 'horizontal') {
            posX = idx * (mapWidth + 100);
            posY = 0;
          } else if (multiFloorPlacement === 'grid') {
            const cols = 2;
            posX = (idx % cols) * (mapWidth + 100);
            posY = Math.floor(idx / cols) * (mapHeight + 100);
          } else if (multiFloorPlacement === 'stacked') {
            posX = idx * 60;
            posY = idx * 60;
          }
        }

        const mapName = floorTitle || (filename ? `Дом: ${filename}` : `Дом: ${houseName || 'Особняк'} (${floorLabel || 'План'})`);

        const newMap: MapItem = {
          id: `house_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
          name: mapName,
          type: 'image',
          url: dataUrl,
          width: mapWidth,
          height: mapHeight,
          aspectRatio: mapWidth / mapHeight,
          position: { x: posX, y: posY },
          scale: { x: 1, y: 1 },
          rotation: 0,
          zIndex: isBatch ? ((batchIndex || 0) + 1) : 1,
          opacity: 1,
          hash: `house_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          fileSize: 0,
          format: format === 'svg' ? 'image/svg+xml' : 'image/png',
          gridSize: 70,
          gridOffset: { x: 0, y: 0 },
          category: 'Дома и Постройки',
          layer: 'background',
          locked: false,
          hiddenFromPlayers: false,
        };

        onImportDungeon(newMap);

        if (isBatch) {
          batchFloorsAccumulator.current.push(newMap);
          const currentCount = (batchIndex || 0) + 1;
          const totalCount = batchTotal || 1;
          setBatchImportProgress({
            current: currentCount,
            total: totalCount,
            houseName: houseName || 'Дом'
          });
        } else {
          setIsImportingHouse(false);
          const msg = isMultiSheet
            ? `Сводный чертеж всех этажей дома "${houseName || 'Особняк'}" импортирован на стол!`
            : `План этажа "${floorLabel || 'GF'}" успешно импортирован на игровой стол!`;
          setHouseNotification(msg);
          setTimeout(() => setHouseNotification(null), 4000);
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onImportDungeon, multiFloorPlacement]);

  const sendTavernAction = (action: string, extra?: Record<string, any>) => {
    if (tavernIframeRef.current && tavernIframeRef.current.contentWindow) {
      tavernIframeRef.current.contentWindow.postMessage({ action, ...extra }, '*');
    }
  };

  const handleImportTavernFloor = () => {
    setIsImportingTavern(true);
    sendTavernAction('EXPORT_FLOOR', { download: false });
  };

  const handleImportTavernFull = () => {
    setIsImportingTavern(true);
    sendTavernAction('EXPORT_FULL', { download: false });
  };

  const sendCityAction = (action: string, extra?: Record<string, any>) => {
    if (cityIframeRef.current && cityIframeRef.current.contentWindow) {
      cityIframeRef.current.contentWindow.postMessage({ action, ...extra }, '*');
    }
  };

  const handleImportCity = () => {
    setIsImportingCity(true);
    sendCityAction('EXPORT_PNG', { download: false });
  };

  const sendVillageAction = (action: string, extra?: Record<string, any>) => {
    if (villageIframeRef.current && villageIframeRef.current.contentWindow) {
      villageIframeRef.current.contentWindow.postMessage({ action, ...extra }, '*');
    }
  };

  const handleImportVillage = () => {
    setIsImportingVillage(true);
    sendVillageAction('EXPORT_PNG', { download: false });
  };

  const sendHouseAction = (type: string, extra?: Record<string, any>) => {
    if (houseIframeRef.current && houseIframeRef.current.contentWindow) {
      houseIframeRef.current.contentWindow.postMessage({ type, ...extra }, '*');
    }
  };

  const handleImportHouseCurrentFloor = () => {
    setIsImportingHouse(true);
    sendHouseAction('DWELLINGS_TRIGGER_IMPORT');
  };

  const handleImportAllHouseFloors = () => {
    setIsImportingHouse(true);
    const selectedFloorIndices = houseInfo && houseInfo.floors
      ? houseInfo.floors.filter(f => selectedFloors[f.index] !== false).map(f => f.index)
      : null;
    sendHouseAction('DWELLINGS_EXPORT_ALL_FLOORS_SEPARATE', { floors: selectedFloorIndices });
  };

  const handleImportHouseMultiSheet = () => {
    setIsImportingHouse(true);
    sendHouseAction('DWELLINGS_EXPORT_MULTI_FLOOR_SHEET', { cols: 2, dpc: 200 });
  };

  const toggleFloorSelection = (floorIndex: number) => {
    setSelectedFloors(prev => ({
      ...prev,
      [floorIndex]: !(prev[floorIndex] ?? true)
    }));
  };

  const selectAllFloors = (selectAll: boolean) => {
    if (!houseInfo) return;
    const next: Record<number, boolean> = {};
    houseInfo.floors.forEach(f => {
      next[f.index] = selectAll;
    });
    setSelectedFloors(next);
  };

  // Request house info whenever switching to house tab
  useEffect(() => {
    if (activeTab === 'house') {
      const timer = setTimeout(() => {
        sendHouseAction('DWELLINGS_GET_INFO');
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [activeTab]);

  // Toast notification for generator actions
  const [generatorToast, setGeneratorToast] = useState<string | null>(null);

  // NPC Generator state
  const [npcRace, setNpcRace] = useState('human');
  const [npcClass, setNpcClass] = useState('fighter');
  const [npcGender, setNpcGender] = useState('male');
  const [npcLevel, setNpcLevel] = useState('1');
  const [npcProfession, setNpcProfession] = useState('random');
  const [npcSocialStatus, setNpcSocialStatus] = useState('random');
  const [npcAgeGroup, setNpcAgeGroup] = useState('random');
  const [npcAttitude, setNpcAttitude] = useState('random');
  const [npcResult, setNpcResult] = useState('');
  const [npcRaw, setNpcRaw] = useState<NpcRawData | null>(null);
  const [isGeneratingNpc, setIsGeneratingNpc] = useState(false);

  const handleGenerateNPC = async () => {
    setIsGeneratingNpc(true);
    setNpcResult('');
    setNpcRaw(null);
    try {
      const res = await fetch(`/api/npc/generate?race=${npcRace}&classType=${npcClass}&gender=${npcGender}&level=${npcLevel}&profession=${npcProfession}&socialStatus=${npcSocialStatus}&ageGroup=${npcAgeGroup}&attitude=${npcAttitude}`);
      const data = await res.json();
      if (data.success) {
        setNpcResult(data.text);
        if (data.raw) setNpcRaw(data.raw);
      } else {
        setNpcResult('Ошибка генерации: ' + data.error);
      }
    } catch (err) {
      setNpcResult('Ошибка сети при обращении к серверу генерации.');
    } finally {
      setIsGeneratingNpc(false);
    }
  };

  // Treasure Generator state
  const [treasureLevel, setTreasureLevel] = useState('1');
  const [treasureTheme, setTreasureTheme] = useState('random');
  const [treasureContainer, setTreasureContainer] = useState('random');
  const [treasureTrap, setTreasureTrap] = useState('random');
  const [treasureResult, setTreasureResult] = useState('');
  const [treasureRaw, setTreasureRaw] = useState<TreasureRawData | null>(null);
  const [isGeneratingTreasure, setIsGeneratingTreasure] = useState(false);

  const handleGenerateTreasure = async () => {
    setIsGeneratingTreasure(true);
    setTreasureResult('');
    setTreasureRaw(null);
    try {
      const res = await fetch(`/api/treasure/generate?level=${treasureLevel}&theme=${treasureTheme}&container=${treasureContainer}&trap=${treasureTrap}`);
      const data = await res.json();
      if (data.success) {
        setTreasureResult(data.text);
        if (data.raw) setTreasureRaw(data.raw);
      } else {
        setTreasureResult('Ошибка генерации: ' + data.error);
      }
    } catch (err) {
      setTreasureResult('Ошибка сети при обращении к серверу генерации.');
    } finally {
      setIsGeneratingTreasure(false);
    }
  };

  // Loot Generator state
  const [lootType, setLootType] = useState('humanoid');
  const [lootTier, setLootTier] = useState('random');
  const [lootRichness, setLootRichness] = useState('random');
  const [lootResult, setLootResult] = useState('');
  const [lootRaw, setLootRaw] = useState<LootRawData | null>(null);
  const [isGeneratingLoot, setIsGeneratingLoot] = useState(false);

  const handleGenerateLoot = async () => {
    setIsGeneratingLoot(true);
    setLootResult('');
    setLootRaw(null);
    try {
      const res = await fetch(`/api/loot/generate?type=${lootType}&tier=${lootTier}&richness=${lootRichness}`);
      const data = await res.json();
      if (data.success) {
        setLootResult(data.text);
        if (data.raw) setLootRaw(data.raw);
      } else {
        setLootResult('Ошибка генерации: ' + data.error);
      }
    } catch (err) {
      setLootResult('Ошибка сети при обращении к серверу генерации.');
    } finally {
      setIsGeneratingLoot(false);
    }
  };

  // Traveling Merchant Generator state (Странствующий торговец)
  const [travelingArchetype, setTravelingArchetype] = useState('random');
  const [travelingRegion, setTravelingRegion] = useState('random');
  const [travelingItemCount, setTravelingItemCount] = useState('random');
  const [travelingPriceTier, setTravelingPriceTier] = useState('random');
  const [travelingAttitude, setTravelingAttitude] = useState('random');
  const [travelingRace, setTravelingRace] = useState('random');
  const [travelingResult, setTravelingResult] = useState('');
  const [travelingRaw, setTravelingRaw] = useState<TravelingMerchantRawData | null>(null);
  const [isGeneratingTraveling, setIsGeneratingTraveling] = useState(false);

  const handleGenerateTravelingMerchant = async () => {
    setIsGeneratingTraveling(true);
    setTravelingResult('');
    setTravelingRaw(null);
    try {
      const queryParams = new URLSearchParams({
        archetype: travelingArchetype,
        region: travelingRegion,
        itemCount: travelingItemCount,
        priceTier: travelingPriceTier,
        attitude: travelingAttitude,
        race: travelingRace
      });
      const res = await fetch(`/api/traveling-merchant/generate?${queryParams.toString()}`);
      const data = await res.json();
      if (data.success) {
        setTravelingResult(data.text);
        if (data.raw) setTravelingRaw(data.raw);
      } else {
        setTravelingResult('Ошибка генерации: ' + data.error);
      }
    } catch (err) {
      setTravelingResult('Ошибка сети при обращении к серверу генерации.');
    } finally {
      setIsGeneratingTraveling(false);
    }
  };

  // Stationary Shop Generator state (Стационарная лавка)
  const [stationaryType, setStationaryType] = useState('random');
  const [stationaryWealthTier, setStationaryWealthTier] = useState('modest');
  const [stationaryDistrict, setStationaryDistrict] = useState('random');
  const [stationaryInventorySize, setStationaryInventorySize] = useState('random');
  const [stationaryQualityTier, setStationaryQualityTier] = useState('random');
  const [stationaryOwnerTemper, setStationaryOwnerTemper] = useState('random');
  const [stationaryResult, setStationaryResult] = useState('');
  const [stationaryRaw, setStationaryRaw] = useState<StationaryShopRawData | null>(null);
  const [isGeneratingStationary, setIsGeneratingStationary] = useState(false);

  const handleGenerateStationaryShop = async () => {
    setIsGeneratingStationary(true);
    setStationaryResult('');
    setStationaryRaw(null);
    try {
      const queryParams = new URLSearchParams({
        shopType: stationaryType,
        wealthTier: stationaryWealthTier,
        district: stationaryDistrict,
        inventorySize: stationaryInventorySize,
        qualityTier: stationaryQualityTier,
        ownerTemper: stationaryOwnerTemper
      });
      const res = await fetch(`/api/stationary-shop/generate?${queryParams.toString()}`);
      const data = await res.json();
      if (data.success) {
        setStationaryResult(data.text);
        if (data.raw) setStationaryRaw(data.raw);
      } else {
        setStationaryResult('Ошибка генерации: ' + data.error);
      }
    } catch (err) {
      setStationaryResult('Ошибка сети при обращении к серверу генерации.');
    } finally {
      setIsGeneratingStationary(false);
    }
  };

  // Equipment Generator state (Экипировка: оружие, броня, снаряжение)
  const [equipmentCategory, setEquipmentCategory] = useState('random');
  const [equipmentHasProps, setEquipmentHasProps] = useState('random');
  const [equipmentQuality, setEquipmentQuality] = useState('random');
  const [equipmentMaterial, setEquipmentMaterial] = useState('random');
  const [equipmentOriginStyle, setEquipmentOriginStyle] = useState('random');
  const [equipmentPriceBudget, setEquipmentPriceBudget] = useState('random');
  const [equipmentPropertyType, setEquipmentPropertyType] = useState('random');
  const [equipmentResult, setEquipmentResult] = useState('');
  const [equipmentRaw, setEquipmentRaw] = useState<EquipmentRawData | null>(null);
  const [isGeneratingEquipment, setIsGeneratingEquipment] = useState(false);

  const handleGenerateEquipment = async () => {
    setIsGeneratingEquipment(true);
    setEquipmentResult('');
    setEquipmentRaw(null);
    try {
      const queryParams = new URLSearchParams({
        category: equipmentCategory,
        hasProperties: equipmentHasProps,
        quality: equipmentQuality,
        material: equipmentMaterial,
        originStyle: equipmentOriginStyle,
        priceBudget: equipmentPriceBudget,
        propertyType: equipmentPropertyType
      });
      const res = await fetch(`/api/equipment/generate?${queryParams.toString()}`);
      const data = await res.json();
      if (data.success) {
        setEquipmentResult(data.text);
        if (data.raw) setEquipmentRaw(data.raw);
      } else {
        setEquipmentResult('Ошибка генерации: ' + data.error);
      }
    } catch (err) {
      setEquipmentResult('Ошибка сети при обращении к серверу генерации.');
    } finally {
      setIsGeneratingEquipment(false);
    }
  };

  // Magic Items Generator state (Магические предметы по школам)
  const [magicSchool, setMagicSchool] = useState('random');
  const [magicItemType, setMagicItemType] = useState('random');
  const [magicRarity, setMagicRarity] = useState('random');
  const [magicAttunementFilter, setMagicAttunementFilter] = useState('random');
  const [magicChargesStyle, setMagicChargesStyle] = useState('random');
  const [magicHasQuirk, setMagicHasQuirk] = useState('random');
  const [magicResult, setMagicResult] = useState('');
  const [magicRaw, setMagicRaw] = useState<MagicItemRawData | null>(null);
  const [isGeneratingMagic, setIsGeneratingMagic] = useState(false);

  const handleGenerateMagicItem = async () => {
    setIsGeneratingMagic(true);
    setMagicResult('');
    setMagicRaw(null);
    try {
      const queryParams = new URLSearchParams({
        school: magicSchool,
        itemType: magicItemType,
        rarity: magicRarity,
        attunementFilter: magicAttunementFilter,
        chargesStyle: magicChargesStyle,
        hasQuirk: magicHasQuirk
      });
      const res = await fetch(`/api/magic-item/generate?${queryParams.toString()}`);
      const data = await res.json();
      if (data.success) {
        setMagicResult(data.text);
        if (data.raw) setMagicRaw(data.raw);
      } else {
        setMagicResult('Ошибка генерации: ' + data.error);
      }
    } catch (err) {
      setMagicResult('Ошибка сети при обращении к серверу генерации.');
    } finally {
      setIsGeneratingMagic(false);
    }
  };

  // Monster Generator state & handler
  const [monsterFamily, setMonsterFamily] = useState<string>('random');
  const [monsterElement, setMonsterElement] = useState<string>('random');
  const [monsterCr, setMonsterCr] = useState<string>('random');
  const [monsterRole, setMonsterRole] = useState<string>('random');
  const [monsterSize, setMonsterSize] = useState<string>('random');
  const [monsterEnv, setMonsterEnv] = useState<string>('random');
  const [monsterRaw, setMonsterRaw] = useState<MonsterRawData | null>(null);
  const [isGeneratingMonster, setIsGeneratingMonster] = useState<boolean>(false);

  const handleGenerateMonster = () => {
    setIsGeneratingMonster(true);
    try {
      const generated = monsterGeneratorService.generateMonster({
        family: monsterFamily,
        element: monsterElement,
        cr: monsterCr,
        role: monsterRole,
        size: monsterSize,
        environment: monsterEnv,
      });
      setMonsterRaw(generated);
      playUniversalSfx('click');
      if (setGeneratorToast) setGeneratorToast(`Монстр «${generated.name}» сгенерирован!`);
    } catch (err) {
      console.error('Monster generation error:', err);
    } finally {
      setIsGeneratingMonster(false);
    }
  };
  const [options, setOptions] = useState<DungeonOptions>({
    width: 40,
    height: 40,
    roomCount: 15,
    minRoomSize: 4,
    maxRoomSize: 10,
    doorChance: 0.6,
    lootChance: 0.7,
    trapChance: 0.5,
  });

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const mapDataRef = useRef<number[][] | null>(null);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const map = generateDungeon(options);
      mapDataRef.current = map;
      const dataUrl = await drawDungeonToDataURL(map, 20); // smaller cell size for preview
      setPreviewUrl(dataUrl);
    } catch (err) {
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    handleGenerate();
  }, []);

  const handleImport = async () => {
    if (!mapDataRef.current) return;
    
    // Draw full size
    const fullSizeUrl = await drawDungeonToDataURL(mapDataRef.current, 70); // 70px cell for tabletop
    
    const newMap: MapItem = {
      id: `dungeon_${Date.now()}`,
      name: `Случайное подземелье (${options.width}x${options.height})`,
      type: 'image',
      url: fullSizeUrl,
      width: options.width * 70,
      height: options.height * 70,
      aspectRatio: options.width / options.height,
      position: { x: 0, y: 0 },
      scale: { x: 1, y: 1 },
      rotation: 0,
      zIndex: 1,
      opacity: 1,
      hash: `dungeon_${Date.now()}`,
      fileSize: 0,
      format: 'image/png',
      gridSize: 70,
      gridOffset: { x: 0, y: 0 },
      category: 'Генерации',
      layer: 'background',
      locked: false,
      hiddenFromPlayers: false,
    };
    
    onImportDungeon(newMap);
    onClose();
  };

  return (
    <DraggableResizablePanel
      id="procedural_generators"
      onClose={onClose}
      defaultPosition={{ x: window.innerWidth > 900 ? window.innerWidth - 640 : 20, y: 70 }}
      defaultSize={{ width: activeTab === 'tavern' || activeTab === 'city' || activeTab === 'village' || activeTab === 'house' ? 680 : 560, height: 'auto' }}
      minWidth={320}
      maxWidth={1000}
      handleTitle="Процедурные генераторы"
      handleIcon={<Dices className="w-4 h-4 text-amber-400" />}
      zIndex={50}
      noPadding={true}
    >
      <div className="flex flex-col flex-1 min-h-0 w-full">
        <div className="p-2 bg-zinc-950/95 border-b border-zinc-800/80 sticky top-0 z-20 backdrop-blur-md flex flex-wrap items-center gap-1 w-full shrink-0 max-h-[140px] overflow-y-auto custom-scrollbar">
          {GENERATOR_TABS.map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button 
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-1 px-2 py-1 rounded-lg text-[11px] font-semibold transition-all duration-150 border cursor-pointer shrink-0 whitespace-nowrap ${
                  isActive 
                    ? 'bg-amber-500/20 border-amber-500/70 text-amber-400 shadow-sm shadow-amber-500/10 ring-1 ring-amber-500/30' 
                    : 'bg-zinc-900/80 border-zinc-800/80 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 hover:border-zinc-700'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
        
        <div className="p-4 flex flex-col space-y-4">
          {/* Notification Toast */}
          {generatorToast && (
            <div className="flex items-center space-x-2 bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 text-xs px-3 py-2 rounded-xl animate-fadeIn shadow-lg">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="font-semibold">{generatorToast}</span>
            </div>
          )}

          {activeTab === 'npc' ? (
            <>
              <div className="flex flex-col space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                  <div className="flex flex-col space-y-1">
                    <label className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">Раса</label>
                    <select 
                      value={npcRace}
                      onChange={e => setNpcRace(e.target.value)}
                      className="bg-zinc-900 border border-zinc-700 text-zinc-100 text-xs rounded-lg px-2 py-1.5 outline-none focus:border-amber-500 custom-scrollbar"
                    >
                      <option value="human">Человек</option>
                      <option value="elf">Эльф</option>
                      <option value="dwarf">Дворф</option>
                      <option value="halfling">Полурослик</option>
                      <option value="gnome">Гном</option>
                      <option value="half-elf">Полуэльф</option>
                      <option value="half-orc">Полуорк</option>
                      <option value="tiefling">Тифлинг</option>
                      <option value="dragonborn">Драконорожденный</option>
                      <option value="random">🎲 Случайная</option>
                    </select>
                  </div>

                  <div className="flex flex-col space-y-1">
                    <label className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">Класс</label>
                    <select 
                      value={npcClass}
                      onChange={e => setNpcClass(e.target.value)}
                      className="bg-zinc-900 border border-zinc-700 text-zinc-100 text-xs rounded-lg px-2 py-1.5 outline-none focus:border-amber-500 custom-scrollbar"
                    >
                      <option value="fighter">Воин</option>
                      <option value="wizard">Волшебник</option>
                      <option value="rogue">Плут</option>
                      <option value="cleric">Жрец</option>
                      <option value="bard">Бард</option>
                      <option value="ranger">Следопыт</option>
                      <option value="paladin">Паладин</option>
                      <option value="monk">Монах</option>
                      <option value="barbarian">Варвар</option>
                      <option value="druid">Друид</option>
                      <option value="sorcerer">Чародей</option>
                      <option value="warlock">Колдун</option>
                      <option value="artificer">Изобретатель</option>
                      <option value="aristocrat">Аристократ (NPC)</option>
                      <option value="commoner">Обыватель (NPC)</option>
                      <option value="expert">Эксперт (NPC)</option>
                      <option value="warrior">Вояка (NPC)</option>
                      <option value="random">🎲 Случайный</option>
                    </select>
                  </div>

                  <div className="flex flex-col space-y-1">
                    <label className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">Профессия</label>
                    <select 
                      value={npcProfession}
                      onChange={e => setNpcProfession(e.target.value)}
                      className="bg-zinc-900 border border-zinc-700 text-zinc-100 text-xs rounded-lg px-2 py-1.5 outline-none focus:border-amber-500 custom-scrollbar"
                    >
                      <option value="random">🎲 Случайная</option>
                      <option value="blacksmith">Кузнец</option>
                      <option value="herbalist">Травник / Знахарь</option>
                      <option value="innkeeper">Трактирщик</option>
                      <option value="merchant">Купец / Торговец</option>
                      <option value="guard">Городской стражник</option>
                      <option value="scholar">Ученый / Писец</option>
                      <option value="hunter">Охотник / Егерь</option>
                      <option value="sailor">Моряк / Шкипер</option>
                      <option value="thief">Вор / Карманник</option>
                      <option value="healer">Лекарь / Врачеватель</option>
                      <option value="miner">Шахтер / Рудокоп</option>
                      <option value="artist">Художник / Ювелир</option>
                      <option value="baker">Пекарь / Повар</option>
                      <option value="cartographer">Картограф</option>
                      <option value="priest">Священник / Жрец</option>
                      <option value="alchemist">Алхимик</option>
                    </select>
                  </div>

                  <div className="flex flex-col space-y-1">
                    <label className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">Статус</label>
                    <select 
                      value={npcSocialStatus}
                      onChange={e => setNpcSocialStatus(e.target.value)}
                      className="bg-zinc-900 border border-zinc-700 text-zinc-100 text-xs rounded-lg px-2 py-1.5 outline-none focus:border-amber-500 custom-scrollbar"
                    >
                      <option value="random">🎲 Случайный</option>
                      <option value="poor">Нищий / Бедняк</option>
                      <option value="common">Средний класс</option>
                      <option value="wealthy">Зажиточный</option>
                      <option value="noble">Дворянин / Знать</option>
                      <option value="outcast">Изгой / Отшельник</option>
                    </select>
                  </div>

                  <div className="flex flex-col space-y-1">
                    <label className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">Возраст</label>
                    <select 
                      value={npcAgeGroup}
                      onChange={e => setNpcAgeGroup(e.target.value)}
                      className="bg-zinc-900 border border-zinc-700 text-zinc-100 text-xs rounded-lg px-2 py-1.5 outline-none focus:border-amber-500 custom-scrollbar"
                    >
                      <option value="random">🎲 Случайный</option>
                      <option value="young">Молодой (16-24)</option>
                      <option value="adult">Зрелый (25-45)</option>
                      <option value="elder">Пожилой (46-70)</option>
                      <option value="ancient">Старец (70+)</option>
                    </select>
                  </div>

                  <div className="flex flex-col space-y-1">
                    <label className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">Отношение</label>
                    <select 
                      value={npcAttitude}
                      onChange={e => setNpcAttitude(e.target.value)}
                      className="bg-zinc-900 border border-zinc-700 text-zinc-100 text-xs rounded-lg px-2 py-1.5 outline-none focus:border-amber-500 custom-scrollbar"
                    >
                      <option value="random">🎲 Случайное</option>
                      <option value="friendly">Дружелюбное</option>
                      <option value="neutral">Нейтральное</option>
                      <option value="suspicious">Подозрительное</option>
                      <option value="hostile">Враждебное</option>
                      <option value="fearful">Испуганное</option>
                    </select>
                  </div>

                  <div className="flex flex-col space-y-1">
                    <label className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">Пол</label>
                    <select 
                      value={npcGender}
                      onChange={e => setNpcGender(e.target.value)}
                      className="bg-zinc-900 border border-zinc-700 text-zinc-100 text-xs rounded-lg px-2 py-1.5 outline-none focus:border-amber-500 custom-scrollbar"
                    >
                      <option value="male">Мужской</option>
                      <option value="female">Женский</option>
                      <option value="random">🎲 Случайный</option>
                    </select>
                  </div>

                  <div className="flex flex-col space-y-1">
                    <label className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">Уровень</label>
                    <input 
                      type="number" min="1" max="20"
                      value={npcLevel}
                      onChange={e => setNpcLevel(e.target.value)}
                      className="bg-zinc-900 border border-zinc-700 text-zinc-100 text-xs rounded-lg px-2 py-1.5 outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
                
                <button 
                  onClick={handleGenerateNPC}
                  disabled={isGeneratingNpc}
                  className="w-full py-2.5 bg-amber-600 hover:bg-amber-500 text-zinc-950 text-xs font-bold rounded-xl border border-amber-500/50 shadow-lg transition-colors flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  <Dices className="w-4 h-4" />
                  <span>{isGeneratingNpc ? 'Генерация...' : 'Создать NPC'}</span>
                </button>

                {npcRaw ? (
                  <NpcCardView 
                    npc={npcRaw} 
                    rawText={npcResult} 
                    onImportMapItem={onImportDungeon} 
                    onShowToast={setGeneratorToast} 
                  />
                ) : npcResult ? (
                  <div className="w-full h-64 bg-zinc-900/80 rounded-xl border border-zinc-800 p-3 overflow-y-auto custom-scrollbar">
                    <pre className="text-[11px] font-mono text-zinc-300 whitespace-pre-wrap">{npcResult}</pre>
                  </div>
                ) : (
                  <div className="flex h-36 items-center justify-center text-zinc-500 text-xs text-center px-4 bg-zinc-900/40 rounded-xl border border-zinc-800/60">
                    Генератор D&D NPC с профессиями, социальным статусом, тайнами, слухами, статблоком и экипировкой. Нажмите кнопку для создания персонажа.
                  </div>
                )}
              </div>
            </>
          
          ) : activeTab === 'treasure' ? (
            <>
              <div className="flex flex-col space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                  <div className="flex flex-col space-y-1">
                    <label className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">Опасность (CR 1-30)</label>
                    <input 
                      type="number" min="1" max="30"
                      value={treasureLevel}
                      onChange={e => setTreasureLevel(e.target.value)}
                      className="bg-zinc-900 border border-zinc-700 text-zinc-100 text-xs rounded-lg px-2 py-1.5 outline-none focus:border-amber-500"
                    />
                  </div>

                  <div className="flex flex-col space-y-1">
                    <label className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">Тематика клада</label>
                    <select 
                      value={treasureTheme}
                      onChange={e => setTreasureTheme(e.target.value)}
                      className="bg-zinc-900 border border-zinc-700 text-zinc-100 text-xs rounded-lg px-2 py-1.5 outline-none focus:border-amber-500 custom-scrollbar"
                    >
                      <option value="random">🎲 Случайная</option>
                      <option value="dungeon">Подземелье / Руины</option>
                      <option value="dragon_hoard">Логово дракона</option>
                      <option value="undead_crypt">Склеп нежити</option>
                      <option value="wizard_vault">Хранилище архимага</option>
                      <option value="bandit_cache">Схрон разбойников</option>
                      <option value="cultist_shrine">Алтарь культистов</option>
                      <option value="sunken_treasure">Затонувший клад</option>
                      <option value="ancient_tomb">Древняя гробница</option>
                    </select>
                  </div>

                  <div className="flex flex-col space-y-1">
                    <label className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">Хранилище</label>
                    <select 
                      value={treasureContainer}
                      onChange={e => setTreasureContainer(e.target.value)}
                      className="bg-zinc-900 border border-zinc-700 text-zinc-100 text-xs rounded-lg px-2 py-1.5 outline-none focus:border-amber-500 custom-scrollbar"
                    >
                      <option value="random">🎲 Случайное</option>
                      <option value="chest">Кованый сундук</option>
                      <option value="urn">Каменная урна</option>
                      <option value="coffer">Инкрустированная шкатулка</option>
                      <option value="vault">Магический сейф</option>
                      <option value="sarcophagus">Древний саркофаг</option>
                      <option value="pouch">Кожаный мешок</option>
                    </select>
                  </div>

                  <div className="flex flex-col space-y-1">
                    <label className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">Защита / Ловушка</label>
                    <select 
                      value={treasureTrap}
                      onChange={e => setTreasureTrap(e.target.value)}
                      className="bg-zinc-900 border border-zinc-700 text-zinc-100 text-xs rounded-lg px-2 py-1.5 outline-none focus:border-amber-500 custom-scrollbar"
                    >
                      <option value="random">🎲 Случайная</option>
                      <option value="none">Без ловушки</option>
                      <option value="poison_needle">Отравленная игла</option>
                      <option value="gas">Удушающий газ</option>
                      <option value="flame">Огненная вспышка</option>
                      <option value="teleport">Ловушка телепортации</option>
                      <option value="curse">Древнее проклятие</option>
                    </select>
                  </div>
                </div>
                
                <button 
                  onClick={handleGenerateTreasure}
                  disabled={isGeneratingTreasure}
                  className="w-full py-2.5 bg-amber-600 hover:bg-amber-500 text-zinc-950 text-xs font-bold rounded-xl border border-amber-500/50 shadow-lg transition-colors flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  <Dices className="w-4 h-4" />
                  <span>{isGeneratingTreasure ? 'Генерация...' : 'Сгенерировать сокровища'}</span>
                </button>

                {treasureRaw ? (
                  <TreasureCardView 
                    treasure={treasureRaw} 
                    rawText={treasureResult} 
                    onImportMapItem={onImportDungeon} 
                    onShowToast={setGeneratorToast} 
                  />
                ) : treasureResult ? (
                  <div className="w-full h-64 bg-zinc-900/80 rounded-xl border border-zinc-800 p-3 overflow-y-auto custom-scrollbar">
                    <pre className="text-[11px] font-mono text-zinc-300 whitespace-pre-wrap">{treasureResult}</pre>
                  </div>
                ) : (
                  <div className="flex h-36 items-center justify-center text-zinc-500 text-xs text-center px-4 bg-zinc-900/40 rounded-xl border border-zinc-800/60">
                    Генератор сокровищниц с тематическими архетипами, ловушками, контейнерами, золотом, самоцветами и артефактами.
                  </div>
                )}
              </div>
            </>

          ) : activeTab === 'loot' ? (
            <>
              <div className="flex flex-col space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                  <div className="flex flex-col space-y-1">
                    <label className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">Источник / Враг</label>
                    <select 
                      value={lootType}
                      onChange={e => setLootType(e.target.value)}
                      className="bg-zinc-900 border border-zinc-700 text-zinc-100 text-xs rounded-lg px-2 py-1.5 outline-none focus:border-amber-500 custom-scrollbar"
                    >
                      <option value="humanoid">Гуманоид / Бандит / Стражник</option>
                      <option value="undead">Нежить / Скелет / Зомби</option>
                      <option value="beast">Дикий зверь / Хищник</option>
                      <option value="dragon">Дракон / Виверна</option>
                      <option value="fiend">Исчадие / Демон / Дьявол</option>
                      <option value="aberration">Аберрация / Иллитид</option>
                      <option value="monstrosity">Монстрозность / Химера</option>
                      <option value="elemental">Элементаль</option>
                      <option value="fey">Фейри / Лесной дух</option>
                      <option value="construct">Конструкт / Голем</option>
                      <option value="giant">Великан / Огр</option>
                      <option value="plant">Растение / Миконид</option>
                      <option value="bandit">Разбойник / Голорез</option>
                      <option value="cultist">Сектант / Культист</option>
                      <option value="noble">Дворянин / Вельможа</option>
                      <option value="guard">Городской страж</option>
                      <option value="wizard">Маг / Чернокнижник</option>
                      <option value="random">🎲 Случайный</option>
                    </select>
                  </div>

                  <div className="flex flex-col space-y-1">
                    <label className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">Опасность / Уровень</label>
                    <select 
                      value={lootTier}
                      onChange={e => setLootTier(e.target.value)}
                      className="bg-zinc-900 border border-zinc-700 text-zinc-100 text-xs rounded-lg px-2 py-1.5 outline-none focus:border-amber-500 custom-scrollbar"
                    >
                      <option value="random">🎲 Случайная</option>
                      <option value="low">CR 0-4 (Начальный)</option>
                      <option value="mid">CR 5-10 (Средний)</option>
                      <option value="high">CR 11-16 (Высокий)</option>
                      <option value="epic">CR 17+ (Эпический)</option>
                    </select>
                  </div>

                  <div className="flex flex-col space-y-1">
                    <label className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">Богатство добычи</label>
                    <select 
                      value={lootRichness}
                      onChange={e => setLootRichness(e.target.value)}
                      className="bg-zinc-900 border border-zinc-700 text-zinc-100 text-xs rounded-lg px-2 py-1.5 outline-none focus:border-amber-500 custom-scrollbar"
                    >
                      <option value="random">🎲 Случайное</option>
                      <option value="poor">Скудное (бедный карман)</option>
                      <option value="normal">Обычное</option>
                      <option value="rich">Богатое</option>
                      <option value="lavish">Роскошное (схрон босса)</option>
                    </select>
                  </div>
                </div>
                
                <button 
                  onClick={handleGenerateLoot}
                  disabled={isGeneratingLoot}
                  className="w-full py-2.5 bg-amber-600 hover:bg-amber-500 text-zinc-950 text-xs font-bold rounded-xl border border-amber-500/50 shadow-lg transition-colors flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  <Dices className="w-4 h-4" />
                  <span>{isGeneratingLoot ? 'Генерация...' : 'Сгенерировать карманный лут'}</span>
                </button>

                {lootRaw ? (
                  <LootCardView 
                    loot={lootRaw} 
                    rawText={lootResult} 
                    onImportMapItem={onImportDungeon} 
                    onShowToast={setGeneratorToast} 
                  />
                ) : lootResult ? (
                  <div className="w-full h-64 bg-zinc-900/80 rounded-xl border border-zinc-800 p-3 overflow-y-auto custom-scrollbar">
                    <pre className="text-[11px] font-mono text-zinc-300 whitespace-pre-wrap">{lootResult}</pre>
                  </div>
                ) : (
                  <div className="flex h-36 items-center justify-center text-zinc-500 text-xs text-center px-4 bg-zinc-900/40 rounded-xl border border-zinc-800/60">
                    Генератор карманной добычи: монеты, крафтовые материалы монстров, улики, диковинки и ценные находки.
                  </div>
                )}
              </div>
            </>

          ) : activeTab === 'merchant' ? (
            <>
              <div className="flex flex-col space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
                  <div className="flex flex-col space-y-1">
                    <label className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">Архетип торговца</label>
                    <select 
                      value={travelingArchetype}
                      onChange={e => setTravelingArchetype(e.target.value)}
                      className="bg-zinc-900 border border-zinc-700 text-zinc-100 text-xs rounded-lg px-2 py-1.5 outline-none focus:border-amber-500 custom-scrollbar"
                    >
                      <option value="random">🎲 Случайный путник</option>
                      <option value="peddler">Бродячий коробейник с котомкой</option>
                      <option value="caravan">Купеческий караванщик с фургоном</option>
                      <option value="hermit">Лесной отшельник и травник</option>
                      <option value="smuggler">Тайный контрабандист из-под полы</option>
                      <option value="tinkerer">Бродячий гном-изобретатель</option>
                      <option value="planar_drifter">Межпланарный скиталец</option>
                      <option value="fortune_teller">Бродячая гадалка-хиромант</option>
                      <option value="goblin_junk">Гоблин-старьевщик на тележке</option>
                    </select>
                  </div>

                  <div className="flex flex-col space-y-1">
                    <label className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">Регион / Тракт</label>
                    <select 
                      value={travelingRegion}
                      onChange={e => setTravelingRegion(e.target.value)}
                      className="bg-zinc-900 border border-zinc-700 text-zinc-100 text-xs rounded-lg px-2 py-1.5 outline-none focus:border-amber-500 custom-scrollbar"
                    >
                      <option value="random">🎲 Случайное место</option>
                      <option value="high_road">Главный купеческий тракт</option>
                      <option value="forest_trail">Забытая лесная тропа</option>
                      <option value="mountain_pass">Опасный горный перевал</option>
                      <option value="swamp">Затуманенный брод на болоте</option>
                      <option value="desert_oasis">Оазис в выжженной пустыне</option>
                      <option value="underdark_tunnels">Туннели Подземья</option>
                    </select>
                  </div>

                  <div className="flex flex-col space-y-1">
                    <label className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">Кол-во товаров</label>
                    <select 
                      value={travelingItemCount}
                      onChange={e => setTravelingItemCount(e.target.value)}
                      className="bg-zinc-900 border border-zinc-700 text-zinc-100 text-xs rounded-lg px-2 py-1.5 outline-none focus:border-amber-500 custom-scrollbar"
                    >
                      <option value="random">🎲 Случайное (3-6)</option>
                      <option value="3">Мало (3 предмета)</option>
                      <option value="5">Стандарт (5 предметов)</option>
                      <option value="8">Много (8 предметов)</option>
                      <option value="10">Полный фургон (10 предметов)</option>
                    </select>
                  </div>

                  <div className="flex flex-col space-y-1">
                    <label className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">Уровень цен</label>
                    <select 
                      value={travelingPriceTier}
                      onChange={e => setTravelingPriceTier(e.target.value)}
                      className="bg-zinc-900 border border-zinc-700 text-zinc-100 text-xs rounded-lg px-2 py-1.5 outline-none focus:border-amber-500 custom-scrollbar"
                    >
                      <option value="random">🎲 Случайный</option>
                      <option value="bargain">Распродажа (Даром -20%)</option>
                      <option value="standard">Честный ценник (100%)</option>
                      <option value="marked_up">Завышенные цены (+40%)</option>
                    </select>
                  </div>

                  <div className="flex flex-col space-y-1">
                    <label className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">Отношение</label>
                    <select 
                      value={travelingAttitude}
                      onChange={e => setTravelingAttitude(e.target.value)}
                      className="bg-zinc-900 border border-zinc-700 text-zinc-100 text-xs rounded-lg px-2 py-1.5 outline-none focus:border-amber-500 custom-scrollbar"
                    >
                      <option value="random">🎲 Случайное</option>
                      <option value="friendly">Радушное / Болтливое</option>
                      <option value="cautious">Осторожное / Скрытное</option>
                      <option value="greedy">Жадное / Торгаш</option>
                      <option value="suspicious">Подозрительное</option>
                    </select>
                  </div>

                  <div className="flex flex-col space-y-1">
                    <label className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">Раса торговца</label>
                    <select 
                      value={travelingRace}
                      onChange={e => setTravelingRace(e.target.value)}
                      className="bg-zinc-900 border border-zinc-700 text-zinc-100 text-xs rounded-lg px-2 py-1.5 outline-none focus:border-amber-500 custom-scrollbar"
                    >
                      <option value="random">🎲 Случайная раса</option>
                      <option value="human">Человек</option>
                      <option value="elf">Эльф</option>
                      <option value="dwarf">Дворф</option>
                      <option value="halfling">Полурослик</option>
                      <option value="tiefling">Тифлинг</option>
                      <option value="goblin">Гоблин</option>
                    </select>
                  </div>
                </div>

                <button 
                  onClick={handleGenerateTravelingMerchant}
                  disabled={isGeneratingTraveling}
                  className="w-full py-2.5 bg-amber-600 hover:bg-amber-500 text-zinc-950 text-xs font-bold rounded-xl border border-amber-500/50 shadow-lg transition-colors flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  <Dices className="w-4 h-4" />
                  <span>{isGeneratingTraveling ? 'Генерация...' : 'Встретить странствующего торговца'}</span>
                </button>

                {travelingRaw ? (
                  <TravelingMerchantView 
                    merchant={travelingRaw} 
                    rawText={travelingResult} 
                    onShowToast={setGeneratorToast} 
                  />
                ) : travelingResult ? (
                  <div className="w-full h-64 bg-zinc-900/80 rounded-xl border border-zinc-800 p-3 overflow-y-auto custom-scrollbar">
                    <pre className="text-[11px] font-mono text-zinc-300 whitespace-pre-wrap">{travelingResult}</pre>
                  </div>
                ) : (
                  <div className="flex h-36 items-center justify-center text-zinc-500 text-xs text-center px-4 bg-zinc-900/40 rounded-xl border border-zinc-800/60">
                    Генератор странствующих торговцев с компактным выбором (3-6 предметов), дорожным транспортом, слухами с тракта и правилами бартера.
                  </div>
                )}
              </div>
            </>

          ) : activeTab === 'shop' ? (
            <>
              <div className="flex flex-col space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
                  <div className="flex flex-col space-y-1">
                    <label className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">Специализация лавки</label>
                    <select 
                      value={stationaryType}
                      onChange={e => setStationaryType(e.target.value)}
                      className="bg-zinc-900 border border-zinc-700 text-zinc-100 text-xs rounded-lg px-2 py-1.5 outline-none focus:border-amber-500 custom-scrollbar"
                    >
                      <option value="random">🎲 Случайное заведение</option>
                      <option value="blacksmith">Оружейная кузница «Стальной Молот»</option>
                      <option value="alchemist">Алхимическая аптека «Золотой Илембик»</option>
                      <option value="magic_scrolls">Лавка магии и свитков «Око Азуры»</option>
                      <option value="general_outfitter">Общая торговая лавка «Северный Рог»</option>
                      <option value="jeweler_antiques">Ювелирный салон «Серебряная Драхма»</option>
                      <option value="scribe_cartographer">Скрипторий и картограф «Свиток Истины»</option>
                      <option value="herbalist">Травническая и знахарская «Зеленая Ветвь»</option>
                      <option value="curiosities_blackmarket">Подпольный аукцион диковин «Черная Жемчужина»</option>
                    </select>
                  </div>

                  <div className="flex flex-col space-y-1">
                    <label className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">Уровень достатка</label>
                    <select 
                      value={stationaryWealthTier}
                      onChange={e => setStationaryWealthTier(e.target.value)}
                      className="bg-zinc-900 border border-zinc-700 text-zinc-100 text-xs rounded-lg px-2 py-1.5 outline-none focus:border-amber-500 custom-scrollbar"
                    >
                      <option value="poor">Бедная лавчонка</option>
                      <option value="modest">Зажиточный магазин</option>
                      <option value="wealthy">Богатый гильдейский салон</option>
                      <option value="royal">Королевский поставщик</option>
                    </select>
                  </div>

                  <div className="flex flex-col space-y-1">
                    <label className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">Городской район</label>
                    <select 
                      value={stationaryDistrict}
                      onChange={e => setStationaryDistrict(e.target.value)}
                      className="bg-zinc-900 border border-zinc-700 text-zinc-100 text-xs rounded-lg px-2 py-1.5 outline-none focus:border-amber-500 custom-scrollbar"
                    >
                      <option value="random">🎲 Случайный район</option>
                      <option value="market_square">Торговая площадь</option>
                      <option value="craftsman_row">Ряды ремесленников</option>
                      <option value="noble_quarter">Дворянский квартал</option>
                      <option value="slums">Трущобы и подворотни</option>
                      <option value="harbor">Портовая набережная</option>
                    </select>
                  </div>

                  <div className="flex flex-col space-y-1">
                    <label className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">Объем витрины</label>
                    <select 
                      value={stationaryInventorySize}
                      onChange={e => setStationaryInventorySize(e.target.value)}
                      className="bg-zinc-900 border border-zinc-700 text-zinc-100 text-xs rounded-lg px-2 py-1.5 outline-none focus:border-amber-500 custom-scrollbar"
                    >
                      <option value="random">🎲 Случайный</option>
                      <option value="small">Компактный (8 предметов)</option>
                      <option value="medium">Стандартный (12 предметов)</option>
                      <option value="large">Огромная витрина (18 предметов)</option>
                    </select>
                  </div>

                  <div className="flex flex-col space-y-1">
                    <label className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">Качество товаров</label>
                    <select 
                      value={stationaryQualityTier}
                      onChange={e => setStationaryQualityTier(e.target.value)}
                      className="bg-zinc-900 border border-zinc-700 text-zinc-100 text-xs rounded-lg px-2 py-1.5 outline-none focus:border-amber-500 custom-scrollbar"
                    >
                      <option value="random">🎲 Разнородное</option>
                      <option value="poor">Уцененное / Потертое</option>
                      <option value="standard">Стандартное качество</option>
                      <option value="high">Высший сорт</option>
                      <option value="exquisite">Шедевры ремесла</option>
                    </select>
                  </div>

                  <div className="flex flex-col space-y-1">
                    <label className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">Характер владельца</label>
                    <select 
                      value={stationaryOwnerTemper}
                      onChange={e => setStationaryOwnerTemper(e.target.value)}
                      className="bg-zinc-900 border border-zinc-700 text-zinc-100 text-xs rounded-lg px-2 py-1.5 outline-none focus:border-amber-500 custom-scrollbar"
                    >
                      <option value="random">🎲 Случайный характер</option>
                      <option value="welcoming">Радушный хозяин</option>
                      <option value="grumpy">Угрюмый старик</option>
                      <option value="greedy">Жадный торгаш</option>
                      <option value="eccentric">Эксцентричный гений</option>
                      <option value="strict">Строгий гильдеец</option>
                    </select>
                  </div>
                </div>

                <button 
                  onClick={handleGenerateStationaryShop}
                  disabled={isGeneratingStationary}
                  className="w-full py-2.5 bg-amber-600 hover:bg-amber-500 text-zinc-950 text-xs font-bold rounded-xl border border-amber-500/50 shadow-lg transition-colors flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  <Dices className="w-4 h-4" />
                  <span>{isGeneratingStationary ? 'Генерация...' : 'Создать богатый ассортимент лавки'}</span>
                </button>

                {stationaryRaw ? (
                  <StationaryShopView 
                    shop={stationaryRaw} 
                    rawText={stationaryResult} 
                    onShowToast={setGeneratorToast} 
                  />
                ) : stationaryResult ? (
                  <div className="w-full h-64 bg-zinc-900/80 rounded-xl border border-zinc-800 p-3 overflow-y-auto custom-scrollbar">
                    <pre className="text-[11px] font-mono text-zinc-300 whitespace-pre-wrap">{stationaryResult}</pre>
                  </div>
                ) : (
                  <div className="flex h-36 items-center justify-center text-zinc-500 text-xs text-center px-4 bg-zinc-900/40 rounded-xl border border-zinc-800/60">
                    Генератор стационарных городских лавок: богатый витринный ассортимент (10-18 предметов), владелец NPC, охранные чары, сейф с золотом и спецзаказы.
                  </div>
                )}
              </div>
            </>

          ) : activeTab === 'equipment' ? (
            <>
              <div className="flex flex-col space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
                  <div className="flex flex-col space-y-1">
                    <label className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">Категория</label>
                    <select 
                      value={equipmentCategory}
                      onChange={e => setEquipmentCategory(e.target.value)}
                      className="bg-zinc-900 border border-zinc-700 text-zinc-100 text-xs rounded-lg px-2 py-1.5 outline-none focus:border-amber-500 custom-scrollbar"
                    >
                      <option value="random">🎲 Случайная</option>
                      <option value="weapon">Оружие (Мечи, Молоты, Луки)</option>
                      <option value="armor">Доспехи (Кожа, Кольчуга, Латы)</option>
                      <option value="shield">Щиты (Баклеры, Геральдические)</option>
                      <option value="gear">Походное снаряжение</option>
                      <option value="tool">Инструменты (Отмычки, Наборы)</option>
                      <option value="clothing">Одежда и драпировки</option>
                    </select>
                  </div>

                  <div className="flex flex-col space-y-1">
                    <label className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">Физические свойства</label>
                    <select 
                      value={equipmentHasProps}
                      onChange={e => setEquipmentHasProps(e.target.value)}
                      className="bg-zinc-900 border border-zinc-700 text-zinc-100 text-xs rounded-lg px-2 py-1.5 outline-none focus:border-amber-500 custom-scrollbar"
                    >
                      <option value="random">🎲 Случайные (свойства или без)</option>
                      <option value="true">✨ Со свойствами (Мифрил, Адамантин)</option>
                      <option value="false">⚔️ Без свойств (Стандартный предмет)</option>
                    </select>
                  </div>

                  <div className="flex flex-col space-y-1">
                    <label className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">Качество ковки</label>
                    <select 
                      value={equipmentQuality}
                      onChange={e => setEquipmentQuality(e.target.value)}
                      className="bg-zinc-900 border border-zinc-700 text-zinc-100 text-xs rounded-lg px-2 py-1.5 outline-none focus:border-amber-500 custom-scrollbar"
                    >
                      <option value="random">🎲 Случайное</option>
                      <option value="shoddy">Грубая работа</option>
                      <option value="standard">Стандартное</option>
                      <option value="fine">Добротная ковка</option>
                      <option value="masterwork">Мастерская работа</option>
                    </select>
                  </div>

                  <div className="flex flex-col space-y-1">
                    <label className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">Стиль / Происхождение</label>
                    <select 
                      value={equipmentOriginStyle}
                      onChange={e => setEquipmentOriginStyle(e.target.value)}
                      className="bg-zinc-900 border border-zinc-700 text-zinc-100 text-xs rounded-lg px-2 py-1.5 outline-none focus:border-amber-500 custom-scrollbar"
                    >
                      <option value="random">🎲 Случайный стиль</option>
                      <option value="imperial">Имперский Арсенал</option>
                      <option value="dwarven">Дварфийская кузница</option>
                      <option value="elvish">Эльфийские мастера</option>
                      <option value="barbaric">Северные кланы</option>
                      <option value="underdark">Подземье (Тёмные эльфы)</option>
                    </select>
                  </div>

                  <div className="flex flex-col space-y-1">
                    <label className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">Ценовой бюджет</label>
                    <select 
                      value={equipmentPriceBudget}
                      onChange={e => setEquipmentPriceBudget(e.target.value)}
                      className="bg-zinc-900 border border-zinc-700 text-zinc-100 text-xs rounded-lg px-2 py-1.5 outline-none focus:border-amber-500 custom-scrollbar"
                    >
                      <option value="random">🎲 Стандартный</option>
                      <option value="cheap">Дешевый / Подержанный</option>
                      <option value="standard">Рыночная цена</option>
                      <option value="expensive">Дорогой раритет</option>
                    </select>
                  </div>

                  <div className="flex flex-col space-y-1">
                    <label className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">Направленность свойств</label>
                    <select 
                      value={equipmentPropertyType}
                      onChange={e => setEquipmentPropertyType(e.target.value)}
                      className="bg-zinc-900 border border-zinc-700 text-zinc-100 text-xs rounded-lg px-2 py-1.5 outline-none focus:border-amber-500 custom-scrollbar"
                    >
                      <option value="random">🎲 Любая</option>
                      <option value="defensive">Защитная (Броня/Адамантин)</option>
                      <option value="offensive">Атакующая (Урон/Баланс)</option>
                      <option value="lightweight">Облегченная (Мифрил/Пошив)</option>
                    </select>
                  </div>
                </div>

                <button 
                  onClick={handleGenerateEquipment}
                  disabled={isGeneratingEquipment}
                  className="w-full py-2.5 bg-amber-600 hover:bg-amber-500 text-zinc-950 text-xs font-bold rounded-xl border border-amber-500/50 shadow-lg transition-colors flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  <Dices className="w-4 h-4" />
                  <span>{isGeneratingEquipment ? 'Генерация...' : 'Сгенерировать экипировку'}</span>
                </button>

                {equipmentRaw ? (
                  <EquipmentCardView 
                    equipment={equipmentRaw} 
                    rawText={equipmentResult} 
                    onShowToast={setGeneratorToast} 
                  />
                ) : equipmentResult ? (
                  <div className="w-full h-64 bg-zinc-900/80 rounded-xl border border-zinc-800 p-3 overflow-y-auto custom-scrollbar">
                    <pre className="text-[11px] font-mono text-zinc-300 whitespace-pre-wrap">{equipmentResult}</pre>
                  </div>
                ) : (
                  <div className="flex h-36 items-center justify-center text-zinc-500 text-xs text-center px-4 bg-zinc-900/40 rounded-xl border border-zinc-800/60">
                    Генератор небутафорской экипировки: оружие, броня, щиты и снаряжение как со специальными физическими свойствами (Мифрил, Адамантин, Зазубренное), так и без них.
                  </div>
                )}
              </div>
            </>

          ) : activeTab === 'magic_items' ? (
            <>
              <div className="flex flex-col space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
                  <div className="flex flex-col space-y-1">
                    <label className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">Школа Магии (D&D 5e)</label>
                    <select 
                      value={magicSchool}
                      onChange={e => setMagicSchool(e.target.value)}
                      className="bg-zinc-900 border border-zinc-700 text-zinc-100 text-xs rounded-lg px-2 py-1.5 outline-none focus:border-amber-500 custom-scrollbar"
                    >
                      <option value="random">🎲 Все школы магии</option>
                      <option value="abjuration">Заграждение (Abjuration)</option>
                      <option value="conjuration">Вызов (Conjuration)</option>
                      <option value="divination">Прорицание (Divination)</option>
                      <option value="enchantment">Очарование (Enchantment)</option>
                      <option value="evocation">Воплощение (Evocation)</option>
                      <option value="illusion">Иллюзия (Illusion)</option>
                      <option value="necromancy">Некромантия (Necromancy)</option>
                      <option value="transmutation">Превращение (Transmutation)</option>
                      <option value="universal">Универсальные артефакты</option>
                    </select>
                  </div>

                  <div className="flex flex-col space-y-1">
                    <label className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">Тип предмета</label>
                    <select 
                      value={magicItemType}
                      onChange={e => setMagicItemType(e.target.value)}
                      className="bg-zinc-900 border border-zinc-700 text-zinc-100 text-xs rounded-lg px-2 py-1.5 outline-none focus:border-amber-500 custom-scrollbar"
                    >
                      <option value="random">🎲 Любой тип</option>
                      <option value="ring">Кольцо</option>
                      <option value="wand">Жезл</option>
                      <option value="staff">Посох</option>
                      <option value="weapon">Магическое оружие</option>
                      <option value="amulet">Амулет / Талисман</option>
                      <option value="wondrous">Чудо-предмет (Wondrous)</option>
                    </select>
                  </div>

                  <div className="flex flex-col space-y-1">
                    <label className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">Редкость предмета</label>
                    <select 
                      value={magicRarity}
                      onChange={e => setMagicRarity(e.target.value)}
                      className="bg-zinc-900 border border-zinc-700 text-zinc-100 text-xs rounded-lg px-2 py-1.5 outline-none focus:border-amber-500 custom-scrollbar"
                    >
                      <option value="random">🎲 Любая редкость</option>
                      <option value="Common">Обычный (Common)</option>
                      <option value="Uncommon">Необычный (Uncommon)</option>
                      <option value="Rare">Редкий (Rare)</option>
                      <option value="Very Rare">Очень редкий (Very Rare)</option>
                      <option value="Legendary">Легендарный (Legendary)</option>
                    </select>
                  </div>

                  <div className="flex flex-col space-y-1">
                    <label className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">Настройка (Attunement)</label>
                    <select 
                      value={magicAttunementFilter}
                      onChange={e => setMagicAttunementFilter(e.target.value)}
                      className="bg-zinc-900 border border-zinc-700 text-zinc-100 text-xs rounded-lg px-2 py-1.5 outline-none focus:border-amber-500 custom-scrollbar"
                    >
                      <option value="random">🎲 Любое</option>
                      <option value="requires">Требует настройки</option>
                      <option value="no_attunement">Без настройки</option>
                    </select>
                  </div>

                  <div className="flex flex-col space-y-1">
                    <label className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">Характер действия</label>
                    <select 
                      value={magicChargesStyle}
                      onChange={e => setMagicChargesStyle(e.target.value)}
                      className="bg-zinc-900 border border-zinc-700 text-zinc-100 text-xs rounded-lg px-2 py-1.5 outline-none focus:border-amber-500 custom-scrollbar"
                    >
                      <option value="random">🎲 Любой</option>
                      <option value="charges">Перезаряжаемые заряды</option>
                      <option value="permanent">Постоянная аура / эффект</option>
                    </select>
                  </div>

                  <div className="flex flex-col space-y-1">
                    <label className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">Особенности / Побочки</label>
                    <select 
                      value={magicHasQuirk}
                      onChange={e => setMagicHasQuirk(e.target.value)}
                      className="bg-zinc-900 border border-zinc-700 text-zinc-100 text-xs rounded-lg px-2 py-1.5 outline-none focus:border-amber-500 custom-scrollbar"
                    >
                      <option value="random">🎲 Без ограничений</option>
                      <option value="clean">Чистый артефакт</option>
                      <option value="quirk">С чудачеством</option>
                      <option value="curse">С проклятием</option>
                    </select>
                  </div>
                </div>

                <button 
                  onClick={handleGenerateMagicItem}
                  disabled={isGeneratingMagic}
                  className="w-full py-2.5 bg-amber-600 hover:bg-amber-500 text-zinc-950 text-xs font-bold rounded-xl border border-amber-500/50 shadow-lg transition-colors flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  <Dices className="w-4 h-4" />
                  <span>{isGeneratingMagic ? 'Генерация...' : 'Сгенерировать магический предмет'}</span>
                </button>

                {magicRaw ? (
                  <MagicItemCardView 
                    magicData={magicRaw} 
                    rawText={magicResult} 
                    onShowToast={setGeneratorToast} 
                  />
                ) : magicResult ? (
                  <div className="w-full h-64 bg-zinc-900/80 rounded-xl border border-zinc-800 p-3 overflow-y-auto custom-scrollbar">
                    <pre className="text-[11px] font-mono text-zinc-300 whitespace-pre-wrap">{magicResult}</pre>
                  </div>
                ) : (
                  <div className="flex h-36 items-center justify-center text-zinc-500 text-xs text-center px-4 bg-zinc-900/40 rounded-xl border border-zinc-800/60">
                    Генератор РАЗЛИЧНЫХ магических предметов по всем 8 Школам Магии D&D 5e: активные способности, пассивные ауры, кодовые слова и заряды.
                  </div>
                )}
              </div>
            </>
          ) : activeTab === 'monster' ? (
            <div className="flex flex-col space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
                <div className="flex flex-col space-y-1">
                  <label className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">Вид / Тип существа</label>
                  <select 
                    value={monsterFamily}
                    onChange={e => setMonsterFamily(e.target.value)}
                    className="bg-zinc-900 border border-zinc-700 text-zinc-100 text-xs rounded-lg px-2 py-1.5 outline-none focus:border-rose-500 custom-scrollbar"
                  >
                    <option value="random">🎲 Случайный вид</option>
                    <option value="dragon">Дракон</option>
                    <option value="undead">Нежить</option>
                    <option value="fiend">Исчадие (демон/дьявол)</option>
                    <option value="elemental">Элементаль</option>
                    <option value="beast">Зверь</option>
                    <option value="monstrosity">Чудовище</option>
                    <option value="aberration">Аберрация</option>
                    <option value="construct">Конструкт</option>
                    <option value="plant">Растение</option>
                    <option value="fey">Фея</option>
                    <option value="celestial">Небожитель</option>
                    <option value="ooze">Слизь</option>
                    <option value="humanoid">Гуманоид</option>
                  </select>
                </div>

                <div className="flex flex-col space-y-1">
                  <label className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">Стихия / Тема</label>
                  <select 
                    value={monsterElement}
                    onChange={e => setMonsterElement(e.target.value)}
                    className="bg-zinc-900 border border-zinc-700 text-zinc-100 text-xs rounded-lg px-2 py-1.5 outline-none focus:border-rose-500 custom-scrollbar"
                  >
                    <option value="random">🎲 Случайная стихия</option>
                    <option value="fire">🔥 Огонь / Пламя</option>
                    <option value="cold">❄️ Холод / Мороз</option>
                    <option value="lightning">⚡ Молния / Гром</option>
                    <option value="acid_poison">🧪 Яд / Кислота</option>
                    <option value="shadow_necrotic">💀 Тьма / Некромантия</option>
                    <option value="radiant_holy">✨ Свет / Святость</option>
                    <option value="psychic">👁️ Псионика / Разум</option>
                    <option value="earth_stone">🪨 Земля / Камень</option>
                    <option value="arcane">🔮 Магия / Аркана</option>
                    <option value="physical">⚔️ Физическая / Естественная</option>
                  </select>
                </div>

                <div className="flex flex-col space-y-1">
                  <label className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">Опасность (CR)</label>
                  <select 
                    value={monsterCr}
                    onChange={e => setMonsterCr(e.target.value)}
                    className="bg-zinc-900 border border-zinc-700 text-zinc-100 text-xs rounded-lg px-2 py-1.5 outline-none focus:border-rose-500 custom-scrollbar"
                  >
                    <option value="random">🎲 Случайный CR</option>
                    <option value="0">CR 0</option>
                    <option value="1/8">CR 1/8</option>
                    <option value="1/4">CR 1/4</option>
                    <option value="1/2">CR 1/2</option>
                    <option value="1">CR 1</option>
                    <option value="2">CR 2</option>
                    <option value="3">CR 3</option>
                    <option value="4">CR 4</option>
                    <option value="5">CR 5</option>
                    <option value="6">CR 6</option>
                    <option value="7">CR 7</option>
                    <option value="8">CR 8</option>
                    <option value="9">CR 9</option>
                    <option value="10">CR 10</option>
                    <option value="12">CR 12</option>
                    <option value="15">CR 15</option>
                    <option value="18">CR 18</option>
                    <option value="20">CR 20</option>
                    <option value="21-25">CR 21-25</option>
                    <option value="26-30">CR 26-30</option>
                  </select>
                </div>

                <div className="flex flex-col space-y-1">
                  <label className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">Роль в бою</label>
                  <select 
                    value={monsterRole}
                    onChange={e => setMonsterRole(e.target.value)}
                    className="bg-zinc-900 border border-zinc-700 text-zinc-100 text-xs rounded-lg px-2 py-1.5 outline-none focus:border-rose-500 custom-scrollbar"
                  >
                    <option value="random">🎲 Случайная роль</option>
                    <option value="brute">💥 Брут / Танк</option>
                    <option value="skirmisher">🏹 Застрельщик / Ловкач</option>
                    <option value="caster">🔮 Заклинатель / Маг</option>
                    <option value="controller">🌀 Контролер</option>
                    <option value="boss">👑 Босс / Легендарный</option>
                    <option value="ambusher">🗡️ Засадник / Убийца</option>
                  </select>
                </div>

                <div className="flex flex-col space-y-1">
                  <label className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">Размер</label>
                  <select 
                    value={monsterSize}
                    onChange={e => setMonsterSize(e.target.value)}
                    className="bg-zinc-900 border border-zinc-700 text-zinc-100 text-xs rounded-lg px-2 py-1.5 outline-none focus:border-rose-500 custom-scrollbar"
                  >
                    <option value="random">🎲 Случайный размер</option>
                    <option value="Tiny">Крошечный (Tiny)</option>
                    <option value="Small">Маленький (Small)</option>
                    <option value="Medium">Средний (Medium)</option>
                    <option value="Large">Большой (Large)</option>
                    <option value="Huge">Огромный (Huge)</option>
                    <option value="Gargantuan">Исполинский (Gargantuan)</option>
                  </select>
                </div>

                <div className="flex flex-col space-y-1">
                  <label className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">Среда обитания</label>
                  <select 
                    value={monsterEnv}
                    onChange={e => setMonsterEnv(e.target.value)}
                    className="bg-zinc-900 border border-zinc-700 text-zinc-100 text-xs rounded-lg px-2 py-1.5 outline-none focus:border-rose-500 custom-scrollbar"
                  >
                    <option value="random">🎲 Случайная среда</option>
                    <option value="dungeon">🏰 Подземелье / Гробница</option>
                    <option value="forest">🌲 Лес / Чаща</option>
                    <option value="mountains">🏔️ Горы / Пики</option>
                    <option value="swamp">🐸 Болото / Трясина</option>
                    <option value="desert">🏜️ Пустыня / Дюны</option>
                    <option value="aquatic">🌊 Вода / Глубины</option>
                    <option value="planar">🌀 Иные Планы / Бездна</option>
                  </select>
                </div>
              </div>

              <button 
                onClick={handleGenerateMonster}
                disabled={isGeneratingMonster}
                className="w-full py-2.5 bg-rose-600 hover:bg-rose-500 text-zinc-950 text-xs font-bold rounded-xl border border-rose-500/50 shadow-lg transition-colors flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                <Skull className="w-4 h-4" />
                <span>{isGeneratingMonster ? 'Генерация...' : 'Сгенерировать монстра D&D 5е'}</span>
              </button>

              {monsterRaw ? (
                <MonsterCardView 
                  monster={monsterRaw} 
                  onImportMapItem={onImportDungeon} 
                  onShowToast={setGeneratorToast} 
                />
              ) : (
                <div className="flex h-36 items-center justify-center text-zinc-500 text-xs text-center px-4 bg-zinc-900/40 rounded-xl border border-zinc-800/60">
                  Процедурный генератор монстров D&D 5е с настройкой вида, стихии, уровня опасности, роли, размера и среды обитания. Нажмите кнопку для генерации.
                </div>
              )}
            </div>
          ) : null}

          {/* Persistent Watabou Generator Iframes (Loaded on first visit, kept alive in hidden DOM) */}
          {visitedTabs['tavern'] && (
            <div className={`flex-col space-y-3 ${activeTab === 'tavern' ? 'flex' : 'hidden'}`}>
              {/* Status Alert Notification */}
              {tavernNotification && (
                <div className="flex items-center space-x-2 bg-amber-500/20 border border-amber-500/50 text-amber-300 text-xs px-3 py-2 rounded-xl animate-fadeIn">
                  <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
                  <span className="font-semibold">{tavernNotification}</span>
                </div>
              )}

              {/* Action Buttons Header */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  onClick={handleImportTavernFloor}
                  disabled={isImportingTavern}
                  className="flex items-center justify-center space-x-2 py-2.5 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 font-bold text-xs rounded-xl shadow-lg shadow-amber-950/40 border border-amber-400/50 active:scale-95 transition-all disabled:opacity-50"
                  title="Экспортирует и загружает текущий отображаемый этаж таверны на игровой стол"
                >
                  <Download className="w-4 h-4" />
                  <span>{isImportingTavern ? 'Импортирование...' : 'Импортировать этаж на стол'}</span>
                </button>

                <button
                  onClick={handleImportTavernFull}
                  disabled={isImportingTavern}
                  className="flex items-center justify-center space-x-2 py-2.5 px-3 bg-zinc-900 hover:bg-zinc-800 text-amber-300 hover:text-amber-200 text-xs font-semibold rounded-xl border border-zinc-700/80 hover:border-amber-500/50 active:scale-95 transition-all disabled:opacity-50"
                  title="Экспортирует план всех этажей таверны на игровой стол"
                >
                  <Layers className="w-4 h-4 text-amber-400" />
                  <span>Все этажи на стол</span>
                </button>
              </div>

              {/* Quick Controls Toolbar */}
              <div className="flex flex-wrap items-center gap-1.5 p-1.5 bg-zinc-900/90 border border-zinc-800 rounded-xl">
                <button
                  onClick={() => sendTavernAction('GENERATE')}
                  className="flex items-center space-x-1 px-2.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-xs font-medium border border-zinc-700/60 transition-colors"
                  title="Сгенерировать новую таверну (Enter)"
                >
                  <Dices className="w-3.5 h-3.5 text-amber-400" />
                  <span>Новая таверна</span>
                </button>

                <div className="h-4 w-px bg-zinc-700 mx-0.5" />

                <button
                  onClick={() => sendTavernAction('FLOOR_UP')}
                  className="p-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg border border-zinc-700/60 transition-colors"
                  title="Этаж выше (Стрелка вверх)"
                >
                  <ArrowUp className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => sendTavernAction('FLOOR_DOWN')}
                  className="p-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg border border-zinc-700/60 transition-colors"
                  title="Этаж ниже (Стрелка вниз)"
                >
                  <ArrowDown className="w-3.5 h-3.5" />
                </button>

                <div className="h-4 w-px bg-zinc-700 mx-0.5" />

                <button
                  onClick={() => sendTavernAction('TOGGLE_PROPS')}
                  className="flex items-center space-x-1 px-2 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-xs border border-zinc-700/60 transition-colors"
                  title="Включить / выключить мебель и детали (P)"
                >
                  <Armchair className="w-3.5 h-3.5 text-zinc-400" />
                  <span className="hidden sm:inline">Мебель</span>
                </button>

                <button
                  onClick={() => sendTavernAction('TOGGLE_SHADOWS')}
                  className="flex items-center space-x-1 px-2 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-xs border border-zinc-700/60 transition-colors"
                  title="Включить / выключить тени (S)"
                >
                  <SunMedium className="w-3.5 h-3.5 text-zinc-400" />
                  <span className="hidden sm:inline">Тени</span>
                </button>

                <button
                  onClick={() => sendTavernAction('RANDOM_STYLE')}
                  className="flex items-center space-x-1 px-2 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-xs border border-zinc-700/60 transition-colors"
                  title="Случайная палитра цветов (C)"
                >
                  <Palette className="w-3.5 h-3.5 text-amber-400" />
                  <span className="hidden sm:inline">Стиль</span>
                </button>

                <button
                  onClick={() => sendTavernAction('TOGGLE_BW')}
                  className="px-2 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-xs font-mono border border-zinc-700/60 transition-colors"
                  title="Черно-белый режим (B)"
                >
                  Ч/Б
                </button>

                <div className="flex-1" />

                <button
                  onClick={() => sendTavernAction('EXPORT_FLOOR', { download: true })}
                  className="flex items-center space-x-1 px-2.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-zinc-100 rounded-lg text-xs border border-zinc-700/60 transition-colors"
                  title="Скачать PNG на компьютер"
                >
                  <FileDown className="w-3.5 h-3.5 text-zinc-400" />
                  <span className="hidden md:inline">PNG</span>
                </button>
              </div>

              {/* Interactive Tavern Canvas Viewport */}
              <div className="w-full h-[520px] bg-zinc-950 rounded-xl overflow-hidden border border-zinc-800/90 relative shadow-inner">
                <iframe 
                  ref={tavernIframeRef}
                  src="/taverns/index.html" 
                  className="w-full h-full border-0 outline-none"
                  title="Tavern Generator"
                  sandbox="allow-scripts allow-same-origin allow-downloads"
                />
                <div className="absolute top-2 left-2 pointer-events-none opacity-60 text-[10px] text-zinc-400 uppercase tracking-wider font-semibold bg-zinc-950/80 px-2 py-1 rounded backdrop-blur-sm border border-zinc-800">
                  Watabou's Taverns Engine
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-zinc-500 px-1">
                <span>Горячие клавиши: <strong className="text-zinc-400">X</strong> (импорт этажа), <strong className="text-zinc-400">Shift+X</strong> (все этажи), <strong className="text-zinc-400">Enter</strong> (новый план)</span>
              </div>
            </div>
          )}

          {visitedTabs['city'] && (
            <div className={`flex-col space-y-3 ${activeTab === 'city' ? 'flex' : 'hidden'}`}>
              {/* Status Alert Notification */}
              {cityNotification && (
                <div className="flex items-center space-x-2 bg-amber-500/20 border border-amber-500/50 text-amber-300 text-xs px-3 py-2 rounded-xl animate-fadeIn">
                  <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
                  <span className="font-semibold">{cityNotification}</span>
                </div>
              )}

              {/* Action Buttons Header */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  onClick={handleImportCity}
                  disabled={isImportingCity}
                  className="sm:col-span-2 flex items-center justify-center space-x-2 py-2.5 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 font-bold text-xs rounded-xl shadow-lg shadow-amber-950/40 border border-amber-400/50 active:scale-95 transition-all disabled:opacity-50"
                  title="Экспортирует и загружает текущую карту города на игровой стол"
                >
                  <Download className="w-4 h-4" />
                  <span>{isImportingCity ? 'Импортирование города...' : 'Импортировать город на стол'}</span>
                </button>

                <div className="flex space-x-1.5">
                  <button
                    onClick={() => sendCityAction('EXPORT_SVG', { download: true })}
                    className="flex-1 flex items-center justify-center space-x-1 py-2 px-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-zinc-100 text-xs font-medium rounded-xl border border-zinc-700/80 active:scale-95 transition-all"
                    title="Скачать векторный SVG файл города"
                  >
                    <FileCode className="w-3.5 h-3.5 text-zinc-400" />
                    <span>SVG</span>
                  </button>
                  <button
                    onClick={() => sendCityAction('EXPORT_JSON', { download: true })}
                    className="flex-1 flex items-center justify-center space-x-1 py-2 px-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-zinc-100 text-xs font-medium rounded-xl border border-zinc-700/80 active:scale-95 transition-all"
                    title="Скачать GeoJSON данные города"
                  >
                    <FileDown className="w-3.5 h-3.5 text-zinc-400" />
                    <span>JSON</span>
                  </button>
                </div>
              </div>

              {/* City Quick Controls Toolbar - Row 1: Generation, Names & Size */}
              <div className="flex flex-wrap items-center gap-1.5 p-1.5 bg-zinc-900/90 border border-zinc-800 rounded-xl">
                <button
                  onClick={() => sendCityAction('GENERATE')}
                  className="flex items-center space-x-1 px-2.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-xs font-medium border border-zinc-700/60 transition-colors"
                  title="Сгенерировать новый город со случайной планировкой (Enter)"
                >
                  <Dices className="w-3.5 h-3.5 text-amber-400" />
                  <span>Новый город</span>
                </button>

                <div className="h-4 w-px bg-zinc-700 mx-0.5" />

                <button
                  onClick={() => sendCityAction('REROLL_NAME')}
                  className="flex items-center space-x-1 px-2 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-xs border border-zinc-700/60 transition-colors"
                  title="Сменить название города"
                >
                  <RotateCcw className="w-3 h-3 text-zinc-400" />
                  <span>Название</span>
                </button>

                <button
                  onClick={() => sendCityAction('REROLL_DISTRICTS')}
                  className="flex items-center space-x-1 px-2 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-xs border border-zinc-700/60 transition-colors"
                  title="Перегенерировать названия районов"
                >
                  <MapPin className="w-3 h-3 text-zinc-400" />
                  <span className="hidden sm:inline">Районы</span>
                </button>

                <div className="h-4 w-px bg-zinc-700 mx-0.5" />

                <span className="text-[10px] text-zinc-500 font-semibold uppercase px-1">Размер:</span>
                <button
                  onClick={() => sendCityAction('SET_SIZE', { size: 'small' })}
                  className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-amber-400 rounded text-xs border border-zinc-700/50 transition-colors"
                  title="Малый город (10-20 кварталов)"
                >
                  S
                </button>
                <button
                  onClick={() => sendCityAction('SET_SIZE', { size: 'medium' })}
                  className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-amber-400 rounded text-xs border border-zinc-700/50 transition-colors"
                  title="Средний город (20-40 кварталов)"
                >
                  M
                </button>
                <button
                  onClick={() => sendCityAction('SET_SIZE', { size: 'large' })}
                  className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-amber-400 rounded text-xs border border-zinc-700/50 transition-colors"
                  title="Крупный город (40-80 кварталов)"
                >
                  L
                </button>
              </div>

              {/* City Quick Controls Toolbar - Row 2: Themes, Styles & Views */}
              <div className="flex flex-wrap items-center gap-1.5 p-1.5 bg-zinc-900/90 border border-zinc-800 rounded-xl">
                <span className="text-[10px] text-zinc-500 font-semibold uppercase px-1">Стиль:</span>
                <button
                  onClick={() => sendCityAction('SET_PRESET', { preset: 'default' })}
                  className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-xs border border-zinc-700/50 transition-colors"
                  title="Классический стиль карты (Клавиша 1)"
                >
                  Стандарт
                </button>
                <button
                  onClick={() => sendCityAction('SET_PRESET', { preset: 'ink' })}
                  className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-xs border border-zinc-700/50 transition-colors"
                  title="Чернильный стиль (Клавиша 2)"
                >
                  Чернила
                </button>
                <button
                  onClick={() => sendCityAction('SET_PRESET', { preset: 'bw' })}
                  className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-xs font-mono border border-zinc-700/50 transition-colors"
                  title="Контрастный Ч/Б стиль (Клавиша 3)"
                >
                  Ч/Б
                </button>
                <button
                  onClick={() => sendCityAction('SET_PRESET', { preset: 'vivid' })}
                  className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-amber-300 rounded text-xs border border-zinc-700/50 transition-colors"
                  title="Яркая акварель (Клавиша 4)"
                >
                  Яркий
                </button>
                <button
                  onClick={() => sendCityAction('SET_PRESET', { preset: 'natural' })}
                  className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-emerald-400 rounded text-xs border border-zinc-700/50 transition-colors"
                  title="Натуральная палитра (Клавиша 5)"
                >
                  Природа
                </button>

                <div className="h-4 w-px bg-zinc-700 mx-0.5" />

                <button
                  onClick={() => sendCityAction('TOGGLE_GRID')}
                  className="flex items-center space-x-1 px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-xs border border-zinc-700/50 transition-colors"
                  title="Включить / скрыть координатную сетку (D)"
                >
                  <Grid className="w-3 h-3 text-zinc-400" />
                  <span className="hidden sm:inline">Сетка</span>
                </button>

                <button
                  onClick={() => sendCityAction('TOGGLE_BUILDINGS')}
                  className="flex items-center space-x-1 px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-xs border border-zinc-700/50 transition-colors"
                  title="Переключить режим отображения домов и кварталов (B)"
                >
                  <Building2 className="w-3 h-3 text-zinc-400" />
                  <span className="hidden sm:inline">Здания</span>
                </button>

                <button
                  onClick={() => sendCityAction('TOGGLE_DISTRICTS')}
                  className="flex items-center space-x-1 px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-xs border border-zinc-700/50 transition-colors"
                  title="Режимы надписей районов: Прямые, Изогнутые, Легенда, Скрыть (L)"
                >
                  <span>Надписи</span>
                </button>

                <div className="flex-1" />

                <button
                  onClick={() => sendCityAction('OPEN_STYLE')}
                  className="flex items-center space-x-1 px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-xs border border-zinc-700/50 transition-colors"
                  title="Открыть окно настройки стиля, палитры и шрифтов (S)"
                >
                  <Settings2 className="w-3 h-3 text-amber-400" />
                  <span className="hidden md:inline">Настройки</span>
                </button>

                <button
                  onClick={() => sendCityAction('OPEN_WARP')}
                  className="flex items-center space-x-1 px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-purple-300 rounded text-xs border border-zinc-700/50 transition-colors"
                  title="Инструменты деформации и ручной правки улиц/стен (W)"
                >
                  <Move className="w-3 h-3 text-purple-400" />
                  <span className="hidden md:inline">Warp</span>
                </button>
              </div>

              {/* Interactive City Canvas Viewport */}
              <div className="w-full h-[540px] bg-zinc-950 rounded-xl overflow-hidden border border-zinc-800/90 relative shadow-inner">
                <iframe 
                  ref={cityIframeRef}
                  src="/city/index.html" 
                  className="w-full h-full border-0 outline-none"
                  title="City Generator"
                  sandbox="allow-scripts allow-same-origin allow-downloads"
                />
                <div className="absolute top-2 left-2 pointer-events-none opacity-60 text-[10px] text-zinc-400 uppercase tracking-wider font-semibold bg-zinc-950/80 px-2 py-1 rounded backdrop-blur-sm border border-zinc-800">
                  Watabou's Medieval Fantasy City Engine
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-zinc-500 px-1">
                <span>Горячие клавиши: <strong className="text-zinc-400">Enter</strong> (новый город), <strong className="text-zinc-400">S</strong> (стиль и цвета), <strong className="text-zinc-400">T</strong> (настройки города), <strong className="text-zinc-400">W</strong> (деформация)</span>
              </div>
            </div>
          )}

          {visitedTabs['village'] && (
            <div className={`flex-col space-y-3 ${activeTab === 'village' ? 'flex' : 'hidden'}`}>
              {/* Top Notification */}
              {villageNotification && (
                <div className="flex items-center space-x-2 p-2.5 bg-emerald-950/80 border border-emerald-500/50 rounded-lg text-emerald-300 text-xs animate-in fade-in slide-in-from-top-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{villageNotification}</span>
                </div>
              )}

              {/* Main Actions Bar */}
              <div className="flex items-center justify-between gap-2 p-2 bg-zinc-900/60 rounded-xl border border-zinc-800">
                <button
                  onClick={handleImportVillage}
                  disabled={isImportingVillage}
                  className="flex-1 flex items-center justify-center space-x-2 py-2 px-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800 text-white rounded-lg text-xs font-semibold shadow-lg shadow-emerald-950/40 transition-all border border-emerald-400/30"
                  title="Экспортировать карту деревни высокого разрешения и поместить на стол"
                >
                  <Download className="w-4 h-4" />
                  <span>{isImportingVillage ? 'Импортируем деревню...' : 'Импортировать деревню на стол'}</span>
                </button>

                <div className="flex items-center space-x-1 border-l border-zinc-800 pl-2">
                  <button
                    onClick={() => sendVillageAction('EXPORT_PNG', { download: true })}
                    className="flex items-center space-x-1 px-2.5 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-xs font-medium border border-zinc-700/60 transition-colors"
                    title="Скачать карту как PNG файл"
                  >
                    <FileDown className="w-3.5 h-3.5 text-zinc-400" />
                    <span>PNG</span>
                  </button>
                  <button
                    onClick={() => sendVillageAction('EXPORT_SVG', { download: true })}
                    className="flex items-center space-x-1 px-2 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-xs font-medium border border-zinc-700/60 transition-colors"
                    title="Скачать карту как векторный SVG файл"
                  >
                    <FileCode className="w-3.5 h-3.5 text-emerald-400" />
                    <span>SVG</span>
                  </button>
                  <button
                    onClick={() => sendVillageAction('EXPORT_JSON', { download: true })}
                    className="flex items-center space-x-1 px-2 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-xs font-medium border border-zinc-700/60 transition-colors"
                    title="Скачать JSON с данными строений и плана деревни"
                  >
                    <FileCode className="w-3.5 h-3.5 text-amber-400" />
                    <span>JSON</span>
                  </button>
                </div>
              </div>

              {/* Quick Controls Bar 1: Generation & Palettes */}
              <div className="flex flex-wrap items-center gap-1.5 p-2 bg-zinc-900/40 rounded-lg border border-zinc-800/80 text-xs">
                <button
                  onClick={() => sendVillageAction('GENERATE')}
                  className="flex items-center space-x-1 px-2.5 py-1 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 rounded text-xs font-medium border border-emerald-500/30 transition-colors"
                  title="Сгенерировать новую деревню (Enter)"
                >
                  <Sparkles className="w-3 h-3 text-emerald-400" />
                  <span>Новая (Enter)</span>
                </button>

                <button
                  onClick={() => sendVillageAction('REROLL_VILLAGE')}
                  className="flex items-center space-x-1 px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-xs border border-zinc-700/50 transition-colors"
                  title="Перебросить текущую планировку (Shift+Enter)"
                >
                  <RotateCcw className="w-3 h-3 text-zinc-400" />
                  <span>Переброс</span>
                </button>

                <button
                  onClick={() => sendVillageAction('RENAME')}
                  className="flex items-center space-x-1 px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-xs border border-zinc-700/50 transition-colors"
                  title="Изменить название деревни"
                >
                  <MapPin className="w-3 h-3 text-amber-400" />
                  <span>Название</span>
                </button>

                <div className="h-4 w-[1px] bg-zinc-700/50 mx-0.5" />

                <span className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider pl-1">Палитра:</span>
                <button
                  onClick={() => sendVillageAction('SET_PRESET', { preset: 'default' })}
                  className="px-2 py-0.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-[11px] border border-zinc-700/50 transition-colors"
                  title="Классическая палитра (1)"
                >
                  Классика
                </button>
                <button
                  onClick={() => sendVillageAction('SET_PRESET', { preset: 'sand' })}
                  className="px-2 py-0.5 bg-zinc-800 hover:bg-zinc-700 text-amber-300 rounded text-[11px] border border-zinc-700/50 transition-colors"
                  title="Песочная палитра (2)"
                >
                  Песок
                </button>
                <button
                  onClick={() => sendVillageAction('SET_PRESET', { preset: 'cold' })}
                  className="px-2 py-0.5 bg-zinc-800 hover:bg-zinc-700 text-cyan-300 rounded text-[11px] border border-zinc-700/50 transition-colors"
                  title="Холодная палитра (3)"
                >
                  Холод
                </button>
                <button
                  onClick={() => sendVillageAction('SET_PRESET', { preset: 'night' })}
                  className="px-2 py-0.5 bg-zinc-800 hover:bg-zinc-700 text-indigo-300 rounded text-[11px] border border-zinc-700/50 transition-colors"
                  title="Ночная палитра (4)"
                >
                  Ночь
                </button>
                <button
                  onClick={() => sendVillageAction('SET_PRESET', { preset: 'bw' })}
                  className="px-2 py-0.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-[11px] border border-zinc-700/50 transition-colors"
                  title="Черно-белый чертеж (5)"
                >
                  Ч/Б
                </button>
                <button
                  onClick={() => sendVillageAction('SET_PRESET', { preset: 'random' })}
                  className="px-2 py-0.5 bg-zinc-800 hover:bg-zinc-700 text-emerald-300 rounded text-[11px] border border-zinc-700/50 transition-colors"
                  title="Случайная палитра (0)"
                >
                  Случайная
                </button>
              </div>

              {/* Quick Controls Bar 2: Layers & Toggles */}
              <div className="flex flex-wrap items-center gap-1.5 p-2 bg-zinc-900/40 rounded-lg border border-zinc-800/80 text-xs">
                <span className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider pr-0.5">Слои:</span>
                
                <button
                  onClick={() => sendVillageAction('TOGGLE_FIELDS')}
                  className="flex items-center space-x-1 px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-xs border border-zinc-700/50 transition-colors"
                  title="Переключить отображение полей вокруг деревни"
                >
                  <span>Поля</span>
                </button>

                <button
                  onClick={() => sendVillageAction('TOGGLE_ORCHARDS')}
                  className="flex items-center space-x-1 px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-xs border border-zinc-700/50 transition-colors"
                  title="Переключить сады"
                >
                  <span>Сады</span>
                </button>

                <button
                  onClick={() => sendVillageAction('TOGGLE_SHADOWS')}
                  className="flex items-center space-x-1 px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-xs border border-zinc-700/50 transition-colors"
                  title="Переключить тени зданий"
                >
                  <span>Тени</span>
                </button>

                <button
                  onClick={() => sendVillageAction('TOGGLE_BUILDINGS')}
                  className="flex items-center space-x-1 px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-xs border border-zinc-700/50 transition-colors"
                  title="Скрыть/показать здания"
                >
                  <Building2 className="w-3 h-3 text-zinc-400" />
                  <span className="hidden sm:inline">Здания</span>
                </button>

                <button
                  onClick={() => sendVillageAction('TOGGLE_ROADS')}
                  className="flex items-center space-x-1 px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-xs border border-zinc-700/50 transition-colors"
                  title="Скрыть/показать дороги"
                >
                  <span>Дороги</span>
                </button>

                <button
                  onClick={() => sendVillageAction('REROLL_TREES')}
                  className="flex items-center space-x-1 px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-emerald-300 rounded text-xs border border-zinc-700/50 transition-colors"
                  title="Перебросить расположение деревьев"
                >
                  <span>Деревья</span>
                </button>

                <div className="flex-1" />

                <button
                  onClick={() => sendVillageAction('OPEN_STYLE')}
                  className="flex items-center space-x-1 px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-xs border border-zinc-700/50 transition-colors"
                  title="Открыть настройки стиля и палитры (S)"
                >
                  <Settings2 className="w-3 h-3 text-amber-400" />
                  <span className="hidden md:inline">Стиль (S)</span>
                </button>

                <button
                  onClick={() => sendVillageAction('OPEN_PARAMETERS')}
                  className="flex items-center space-x-1 px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-cyan-300 rounded text-xs border border-zinc-700/50 transition-colors"
                  title="Параметры и теги генерации деревни (Tab)"
                >
                  <Castle className="w-3 h-3 text-cyan-400" />
                  <span className="hidden md:inline">Параметры (Tab)</span>
                </button>
              </div>

              {/* Interactive Village Canvas Viewport */}
              <div className="w-full h-[540px] bg-zinc-950 rounded-xl overflow-hidden border border-zinc-800/90 relative shadow-inner">
                <iframe 
                  ref={villageIframeRef}
                  src="/village/index.html" 
                  className="w-full h-full border-0 outline-none"
                  title="Village Generator"
                  sandbox="allow-scripts allow-same-origin allow-downloads"
                />
                <div className="absolute top-2 left-2 pointer-events-none opacity-60 text-[10px] text-zinc-400 uppercase tracking-wider font-semibold bg-zinc-950/80 px-2 py-1 rounded backdrop-blur-sm border border-zinc-800">
                  Watabou's Medieval Village Engine
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-zinc-500 px-1">
                <span>Горячие клавиши: <strong className="text-zinc-400">Enter</strong> (новая деревня), <strong className="text-zinc-400">Shift+Enter</strong> (переброс), <strong className="text-zinc-400">1-5</strong> (палитры), <strong className="text-zinc-400">Tab</strong> (параметры), <strong className="text-zinc-400">S</strong> (стиль)</span>
              </div>
            </div>
          )}

          {visitedTabs['house'] && (
            <div className={`flex-col space-y-3 ${activeTab === 'house' ? 'flex' : 'hidden'}`}>
              {/* Top Notification */}
              {houseNotification && (
                <div className="flex items-center space-x-2 p-2.5 bg-emerald-950/80 border border-emerald-500/50 rounded-lg text-emerald-300 text-xs animate-in fade-in slide-in-from-top-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{houseNotification}</span>
                </div>
              )}

              {/* Batch Import Progress Bar */}
              {batchImportProgress && (
                <div className="p-3 bg-amber-950/70 border border-amber-500/50 rounded-xl text-amber-200 text-xs space-y-2 animate-pulse">
                  <div className="flex items-center justify-between font-semibold">
                    <span className="flex items-center space-x-1.5">
                      <Layers className="w-4 h-4 text-amber-400 animate-spin" />
                      <span>Импорт этажей дома «{batchImportProgress.houseName}»...</span>
                    </span>
                    <span className="text-amber-400 font-mono">
                      {batchImportProgress.current} / {batchImportProgress.total}
                    </span>
                  </div>
                  <div className="w-full bg-zinc-900 rounded-full h-2 overflow-hidden border border-amber-900/50">
                    <div 
                      className="bg-gradient-to-r from-amber-500 to-amber-300 h-full transition-all duration-300 rounded-full"
                      style={{ width: `${(batchImportProgress.current / Math.max(1, batchImportProgress.total)) * 100}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Main Actions Bar: Multi-floor vs Single floor import */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 p-2.5 bg-zinc-900/70 rounded-xl border border-zinc-800 shadow-md">
                <button
                  onClick={handleImportAllHouseFloors}
                  disabled={isImportingHouse}
                  className="sm:col-span-5 flex items-center justify-center space-x-2 py-2.5 px-3 bg-gradient-to-r from-amber-500 via-amber-600 to-orange-600 hover:from-amber-400 hover:to-orange-500 disabled:opacity-50 text-zinc-950 rounded-lg text-xs font-bold shadow-lg shadow-amber-950/50 transition-all border border-amber-400/40 active:scale-95"
                  title="Импортировать все уровни и этажи дома отдельными связанными картами на стол"
                >
                  <Layers className="w-4 h-4 text-zinc-950" />
                  <span>
                    {isImportingHouse 
                      ? 'Импорт этажей...' 
                      : (houseInfo ? `Импортировать все этажи (${houseInfo.floors.length} шт.)` : 'Импортировать все этажи на стол')}
                  </span>
                </button>

                <button
                  onClick={handleImportHouseMultiSheet}
                  disabled={isImportingHouse}
                  className="sm:col-span-4 flex items-center justify-center space-x-1.5 py-2.5 px-2.5 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-amber-300 rounded-lg text-xs font-semibold border border-amber-500/30 transition-colors shadow-sm"
                  title="Создать сводный чертеж со всеми этажами, выстроенными в аккуратную таблицу-коллаж"
                >
                  <LayoutGrid className="w-4 h-4 text-amber-400" />
                  <span>Одним листом (сетка)</span>
                </button>

                <button
                  onClick={handleImportHouseCurrentFloor}
                  disabled={isImportingHouse}
                  className="sm:col-span-3 flex items-center justify-center space-x-1 py-2.5 px-2 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-zinc-200 rounded-lg text-xs font-medium border border-zinc-700/60 transition-colors"
                  title="Импортировать только текущий открытый этаж"
                >
                  <Download className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Текущий этаж</span>
                </button>
              </div>

              {/* Multi-Floor Selection & Placement Bar */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 p-2 bg-zinc-900/50 rounded-xl border border-zinc-800/80 text-xs">
                {/* Floor Switcher & Selector */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] font-semibold text-zinc-300 flex items-center space-x-1 pr-1">
                    <Home className="w-3.5 h-3.5 text-amber-400" />
                    <span>{houseInfo?.name ? `Дом «${houseInfo.name}»:` : 'Этажи:'}</span>
                  </span>

                  {houseInfo && houseInfo.floors.length > 0 ? (
                    houseInfo.floors.map((floor) => {
                      const isCurrent = houseInfo.currentFloor === floor.index;
                      const isChecked = selectedFloors[floor.index] !== false;
                      return (
                        <div 
                          key={floor.index}
                          className={`flex items-center space-x-1 pl-1.5 pr-2 py-0.5 rounded-lg border transition-all ${
                            isCurrent 
                              ? 'bg-amber-500/20 border-amber-500 text-amber-200 font-semibold' 
                              : 'bg-zinc-800/80 border-zinc-700/60 text-zinc-300 hover:border-zinc-500'
                          }`}
                        >
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleFloorSelection(floor.index);
                            }}
                            className="text-zinc-400 hover:text-amber-400 p-0.5"
                            title={isChecked ? 'Исключить из пакетного импорта' : 'Включить в пакетный импорт'}
                          >
                            {isChecked ? (
                              <CheckSquare className="w-3 h-3 text-amber-400" />
                            ) : (
                              <Square className="w-3 h-3 text-zinc-500" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => sendHouseAction('DWELLINGS_SET_FLOOR', { floorIndex: floor.index })}
                            className="hover:underline cursor-pointer flex items-center space-x-1"
                            title={`Перейти на ${floor.name}`}
                          >
                            <span>{floor.label}</span>
                            <span className="text-[10px] opacity-75 hidden sm:inline">({floor.name})</span>
                          </button>
                        </div>
                      );
                    })
                  ) : (
                    <div className="flex items-center space-x-1 text-zinc-400">
                      <button
                        onClick={() => sendHouseAction('DWELLINGS_CHANGE_FLOOR', { direction: 'down' })}
                        className="px-2 py-1 bg-zinc-800 rounded text-[11px] border border-zinc-700/60 hover:bg-zinc-700"
                      >
                        - Этаж ниже
                      </button>
                      <button
                        onClick={() => sendHouseAction('DWELLINGS_CHANGE_FLOOR', { direction: 'up' })}
                        className="px-2 py-1 bg-zinc-800 rounded text-[11px] border border-zinc-700/60 hover:bg-zinc-700"
                      >
                        + Этаж выше
                      </button>
                    </div>
                  )}

                  {houseInfo && houseInfo.floors.length > 1 && (
                    <button
                      onClick={() => selectAllFloors(true)}
                      className="text-[10px] text-amber-400 hover:underline px-1"
                      title="Выбрать все этажи для импорта"
                    >
                      Все
                    </button>
                  )}
                </div>

                {/* Placement on Tabletop Options */}
                <div className="flex items-center space-x-1 self-end md:self-auto border-t md:border-t-0 pt-1.5 md:pt-0 border-zinc-800">
                  <span className="text-[10px] text-zinc-400 uppercase tracking-wider pr-1">Раскладка:</span>
                  <button
                    onClick={() => setMultiFloorPlacement('horizontal')}
                    className={`px-2 py-1 rounded text-[11px] font-medium border transition-colors ${
                      multiFloorPlacement === 'horizontal'
                        ? 'bg-amber-500/20 border-amber-500/80 text-amber-300'
                        : 'bg-zinc-800 border-zinc-700/60 text-zinc-400 hover:text-zinc-200'
                    }`}
                    title="Расставить этажи в ряд по горизонтали"
                  >
                    В ряд
                  </button>
                  <button
                    onClick={() => setMultiFloorPlacement('grid')}
                    className={`px-2 py-1 rounded text-[11px] font-medium border transition-colors ${
                      multiFloorPlacement === 'grid'
                        ? 'bg-amber-500/20 border-amber-500/80 text-amber-300'
                        : 'bg-zinc-800 border-zinc-700/60 text-zinc-400 hover:text-zinc-200'
                    }`}
                    title="Расставить этажи сеткой 2x2"
                  >
                    Сетка 2x2
                  </button>
                  <button
                    onClick={() => setMultiFloorPlacement('stacked')}
                    className={`px-2 py-1 rounded text-[11px] font-medium border transition-colors ${
                      multiFloorPlacement === 'stacked'
                        ? 'bg-amber-500/20 border-amber-500/80 text-amber-300'
                        : 'bg-zinc-800 border-zinc-700/60 text-zinc-400 hover:text-zinc-200'
                    }`}
                    title="Поместить этажи стопкой в одну точку"
                  >
                    Стопка
                  </button>
                </div>
              </div>

              {/* Quick Controls Bar 1: Actions, View & Palettes */}
              <div className="flex flex-wrap items-center gap-1.5 p-2 bg-zinc-900/40 rounded-lg border border-zinc-800/80 text-xs">
                <button
                  onClick={() => sendHouseAction('DWELLINGS_NEW_HOUSE')}
                  className="flex items-center space-x-1 px-2.5 py-1 bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 rounded text-xs font-medium border border-amber-500/30 transition-colors"
                  title="Сгенерировать новый дом (Enter)"
                >
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  <span>Новый (Enter)</span>
                </button>

                <button
                  onClick={() => sendHouseAction('DWELLINGS_SWITCH_VIEW')}
                  className="flex items-center space-x-1 px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-xs border border-zinc-700/50 transition-colors"
                  title="Переключить вид: План комнат / 3D-Фасад (E)"
                >
                  <Layers className="w-3 h-3 text-cyan-400" />
                  <span>Вид: План/Фасад (E)</span>
                </button>

                <div className="h-4 w-[1px] bg-zinc-700/50 mx-0.5" />

                <span className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider pl-1">Палитра:</span>
                <button
                  onClick={() => sendHouseAction('DWELLINGS_SET_PALETTE', { palette: 'natural' })}
                  className="px-2 py-0.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-[11px] border border-zinc-700/50 transition-colors"
                  title="Натуральная палитра (1)"
                >
                  Натур. (1)
                </button>
                <button
                  onClick={() => sendHouseAction('DWELLINGS_SET_PALETTE', { palette: 'wooden' })}
                  className="px-2 py-0.5 bg-zinc-800 hover:bg-zinc-700 text-amber-300 rounded text-[11px] border border-zinc-700/50 transition-colors"
                  title="Деревянная палитра (2)"
                >
                  Дерево (2)
                </button>
                <button
                  onClick={() => sendHouseAction('DWELLINGS_SET_PALETTE', { palette: 'plain' })}
                  className="px-2 py-0.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-[11px] border border-zinc-700/50 transition-colors"
                  title="Бумага (3)"
                >
                  Бумага (3)
                </button>
                <button
                  onClick={() => sendHouseAction('DWELLINGS_SET_PALETTE', { palette: 'blueprint' })}
                  className="px-2 py-0.5 bg-zinc-800 hover:bg-zinc-700 text-cyan-300 rounded text-[11px] border border-zinc-700/50 transition-colors"
                  title="Синий чертеж (4)"
                >
                  Чертеж (4)
                </button>
                <button
                  onClick={() => sendHouseAction('DWELLINGS_SET_PALETTE', { palette: 'bw' })}
                  className="px-2 py-0.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-[11px] border border-zinc-700/50 transition-colors"
                  title="Черно-белый (5)"
                >
                  Ч/Б (5)
                </button>

                <div className="flex-1" />

                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => sendHouseAction('DWELLINGS_EXPORT_PNG')}
                    className="px-2 py-0.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-[11px] border border-zinc-700/50 transition-colors"
                    title="Скачать текущий план как PNG"
                  >
                    <FileDown className="w-3 h-3 text-zinc-400 inline mr-0.5" />
                    PNG
                  </button>
                  <button
                    onClick={() => sendHouseAction('DWELLINGS_EXPORT_SVG')}
                    className="px-2 py-0.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-[11px] border border-zinc-700/50 transition-colors"
                    title="Скачать векторный SVG"
                  >
                    <FileCode className="w-3 h-3 text-emerald-400 inline mr-0.5" />
                    SVG
                  </button>
                  <button
                    onClick={() => sendHouseAction('DWELLINGS_EXPORT_JSON')}
                    className="px-2 py-0.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-[11px] border border-zinc-700/50 transition-colors"
                    title="Скачать JSON схему дома"
                  >
                    <FileCode className="w-3 h-3 text-amber-400 inline mr-0.5" />
                    JSON
                  </button>
                </div>
              </div>

              {/* Quick Controls Bar 2: Architectural Styles, Settings */}
              <div className="flex flex-wrap items-center gap-1.5 p-2 bg-zinc-900/40 rounded-lg border border-zinc-800/80 text-xs">
                <span className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider pr-0.5">Стиль стен:</span>
                <button
                  onClick={() => sendHouseAction('DWELLINGS_SET_STYLE', { style: 'default' })}
                  className="px-2 py-0.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-[11px] border border-zinc-700/50 transition-colors"
                  title="Классический дом"
                >
                  Классика
                </button>
                <button
                  onClick={() => sendHouseAction('DWELLINGS_SET_STYLE', { style: 'castle' })}
                  className="px-2 py-0.5 bg-zinc-800 hover:bg-zinc-700 text-amber-300 rounded text-[11px] border border-zinc-700/50 transition-colors"
                  title="Замок / Каменный особняк"
                >
                  Замок
                </button>
                <button
                  onClick={() => sendHouseAction('DWELLINGS_SET_STYLE', { style: 'logs' })}
                  className="px-2 py-0.5 bg-zinc-800 hover:bg-zinc-700 text-emerald-300 rounded text-[11px] border border-zinc-700/50 transition-colors"
                  title="Сруб / Бревна"
                >
                  Сруб
                </button>
                <button
                  onClick={() => sendHouseAction('DWELLINGS_SET_STYLE', { style: 'modern' })}
                  className="px-2 py-0.5 bg-zinc-800 hover:bg-zinc-700 text-indigo-300 rounded text-[11px] border border-zinc-700/50 transition-colors"
                  title="Модерн / Особняк"
                >
                  Модерн
                </button>
                <button
                  onClick={() => sendHouseAction('DWELLINGS_SET_STYLE', { style: 'scifi' })}
                  className="px-2 py-0.5 bg-zinc-800 hover:bg-zinc-700 text-cyan-300 rounded text-[11px] border border-zinc-700/50 transition-colors"
                  title="Sci-Fi / Модульный комплекс"
                >
                  Sci-Fi
                </button>

                <div className="flex-1" />

                <button
                  onClick={() => sendHouseAction('DWELLINGS_SHOW_PARAMS')}
                  className="flex items-center space-x-1 px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-amber-300 rounded text-xs border border-zinc-700/50 transition-colors"
                  title="Открыть окно параметров дома, комнат и этажей (Tab)"
                >
                  <Settings2 className="w-3 h-3 text-amber-400" />
                  <span className="hidden md:inline">Параметры комнат (Tab)</span>
                </button>
              </div>

              {/* Interactive House Canvas Viewport */}
              <div className="w-full h-[540px] bg-zinc-950 rounded-xl overflow-hidden border border-zinc-800/90 relative shadow-inner">
                <iframe 
                  ref={houseIframeRef}
                  src="/dwell/index.html" 
                  className="w-full h-full border-0 outline-none"
                  title="Dwellings Generator"
                  sandbox="allow-scripts allow-same-origin allow-downloads"
                />
                <div className="absolute top-2 left-2 pointer-events-none opacity-60 text-[10px] text-zinc-400 uppercase tracking-wider font-semibold bg-zinc-950/80 px-2 py-1 rounded backdrop-blur-sm border border-zinc-800">
                  Watabou's Dwellings & Mansions Engine
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-zinc-500 px-1">
                <span>Горячие клавиши: <strong className="text-zinc-400">Enter</strong> (новый дом), <strong className="text-zinc-400">E</strong> (план/фасад), <strong className="text-zinc-400">1-5</strong> (палитры), <strong className="text-zinc-400">Tab / T</strong> (параметры этажей), <strong className="text-zinc-400">PgUp/PgDn</strong> (этажи)</span>
              </div>
            </div>
          )}

          {activeTab === 'dungeon' && ( <>


              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col space-y-1">
                  <label className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">Ширина (клеток)</label>
                  <input 
                    type="number" 
                    value={options.width}
                    onChange={e => setOptions({...options, width: Number(e.target.value)})}
                    className="bg-zinc-900 border border-zinc-700 text-zinc-100 text-sm rounded-lg px-2 py-1 outline-none focus:border-amber-500"
                  />
                </div>
                <div className="flex flex-col space-y-1">
                  <label className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">Высота (клеток)</label>
                  <input 
                    type="number" 
                    value={options.height}
                    onChange={e => setOptions({...options, height: Number(e.target.value)})}
                    className="bg-zinc-900 border border-zinc-700 text-zinc-100 text-sm rounded-lg px-2 py-1 outline-none focus:border-amber-500"
                  />
                </div>
                <div className="flex flex-col space-y-1">
                  <label className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">Количество комнат</label>
                  <input 
                    type="number" 
                    value={options.roomCount}
                    onChange={e => setOptions({...options, roomCount: Number(e.target.value)})}
                    className="bg-zinc-900 border border-zinc-700 text-zinc-100 text-sm rounded-lg px-2 py-1 outline-none focus:border-amber-500"
                  />
                </div>
                <div className="flex flex-col space-y-1">
                  <label className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">Размер комнаты</label>
                  <div className="flex items-center space-x-1">
                    <input 
                      type="number" 
                      value={options.minRoomSize}
                      onChange={e => setOptions({...options, minRoomSize: Number(e.target.value)})}
                      className="w-full bg-zinc-900 border border-zinc-700 text-zinc-100 text-sm rounded-lg px-2 py-1 outline-none focus:border-amber-500"
                    />
                    <span className="text-zinc-500">-</span>
                    <input 
                      type="number" 
                      value={options.maxRoomSize}
                      onChange={e => setOptions({...options, maxRoomSize: Number(e.target.value)})}
                      className="w-full bg-zinc-900 border border-zinc-700 text-zinc-100 text-sm rounded-lg px-2 py-1 outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col space-y-3 pt-2 border-t border-zinc-800/80">
                <div className="flex flex-col space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">Шанс дверей</label>
                    <span className="text-xs text-zinc-300">{Math.round(options.doorChance * 100)}%</span>
                  </div>
                  <input 
                    type="range" min="0" max="100" 
                    value={options.doorChance * 100}
                    onChange={e => setOptions({...options, doorChance: Number(e.target.value) / 100})}
                    className="w-full accent-amber-500"
                  />
                </div>
                
                <div className="flex flex-col space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">Шанс сундуков (в комнатах)</label>
                    <span className="text-xs text-zinc-300">{Math.round(options.lootChance * 100)}%</span>
                  </div>
                  <input 
                    type="range" min="0" max="100" 
                    value={options.lootChance * 100}
                    onChange={e => setOptions({...options, lootChance: Number(e.target.value) / 100})}
                    className="w-full accent-amber-500"
                  />
                </div>
                
                <div className="flex flex-col space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">Шанс ловушек (в комнатах)</label>
                    <span className="text-xs text-zinc-300">{Math.round(options.trapChance * 100)}%</span>
                  </div>
                  <input 
                    type="range" min="0" max="100" 
                    value={options.trapChance * 100}
                    onChange={e => setOptions({...options, trapChance: Number(e.target.value) / 100})}
                    className="w-full accent-amber-500"
                  />
                </div>
              </div>
              
              <button 
                onClick={handleGenerate}
                className="w-full py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium rounded-xl border border-zinc-700 transition-colors flex items-center justify-center space-x-2"
              >
                <Dices className="w-4 h-4" />
                <span>Перегенерировать</span>
              </button>
              <div className="w-full h-48 bg-zinc-900 rounded-xl border border-zinc-800 flex items-center justify-center overflow-hidden relative">
                {isGenerating ? (
                  <span className="text-zinc-500 text-xs animate-pulse">Генерация...</span>
                ) : previewUrl && previewUrl.trim() ? (
                  <img src={previewUrl || undefined} alt="Preview" className="max-w-full max-h-full object-contain" />
                ) : null}
              </div>
              <button 
                onClick={handleImport}
                className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-bold rounded-xl shadow-lg transition-colors flex items-center justify-center space-x-2"
              >
                <Download className="w-4 h-4" />
                <span>Импорт на рабочий стол</span>
              </button>
            </>
          )}

          {['loot', 'merchant', 'shop', 'equipment'].includes(activeTab) && (
            <div className="flex flex-col items-center justify-center py-12 text-center space-y-3">
              <div className="w-12 h-12 bg-zinc-900 rounded-full flex items-center justify-center border border-zinc-800">
                <Dices className="w-6 h-6 text-zinc-600" />
              </div>
              <div>
                <p className="text-zinc-300 text-sm font-medium">В разработке</p>
                <p className="text-zinc-500 text-xs mt-1 max-w-[200px]">Этот генератор появится в одном из следующих обновлений.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </DraggableResizablePanel>
  );
};