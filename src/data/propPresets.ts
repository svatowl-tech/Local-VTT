export interface PropPreset {
  id: string;
  name: string;
  category: string; // 'furniture' | 'nature' | 'loot' | 'magic' | 'architecture' | 'tokens'
  categoryLabel: string;
  icon: string;
  url: string;
  defaultWidth: number;
  defaultHeight: number;
  gridCells: string; // e.g. "1x1", "2x2", "3x3"
  layer: 'props' | 'overhead' | 'background';
  description?: string;
}

// Generate high quality SVG Data URLs for built-in TTRPG props
function svgToDataUrl(svgString: string): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svgString)}`;
}

export const PROP_CATEGORIES = [
  { id: 'all', label: 'Все объекты', icon: '📦' },
  { id: 'furniture', label: 'Мебель и Интерьер', icon: '🛋️' },
  { id: 'nature', label: 'Природа и Замки', icon: '🌲' },
  { id: 'loot', label: 'Сокровища и Лут', icon: '💎' },
  { id: 'magic', label: 'Магия и Ловушки', icon: '🔮' },
  { id: 'architecture', label: 'Архитектура и Декор', icon: '🏛️' },
  { id: 'tokens', label: 'Токены и Существа', icon: '⚔️' },
  { id: 'custom', label: 'Мои Пропсы', icon: '📁' },
];

export const BUILTIN_PROP_PRESETS: PropPreset[] = [
  // --- FURNITURE ---
  {
    id: 'prop-wooden-table',
    name: 'Дубовый стол',
    category: 'furniture',
    categoryLabel: 'Мебель',
    icon: '🪵',
    url: svgToDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <rect x="10" y="25" width="80" height="50" rx="6" fill="#5c3a21" stroke="#3d2412" stroke-width="4"/>
        <line x1="20" y1="25" x2="20" y2="75" stroke="#422915" stroke-width="2"/>
        <line x1="50" y1="25" x2="50" y2="75" stroke="#422915" stroke-width="2"/>
        <line x1="80" y1="25" x2="80" y2="75" stroke="#422915" stroke-width="2"/>
        <circle cx="20" cy="35" r="2" fill="#7a4f2e"/>
        <circle cx="80" cy="65" r="2" fill="#7a4f2e"/>
      </svg>
    `),
    defaultWidth: 120,
    defaultHeight: 80,
    gridCells: '2x1',
    layer: 'props',
  },
  {
    id: 'prop-royal-throne',
    name: 'Королевский трон',
    category: 'furniture',
    categoryLabel: 'Мебель',
    icon: '🪑',
    url: svgToDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <path d="M25,85 L25,35 L15,35 L15,20 C15,10 85,10 85,20 L85,35 L75,35 L75,85 Z" fill="#8b0000" stroke="#ffd700" stroke-width="4"/>
        <rect x="25" y="45" width="50" height="35" rx="4" fill="#a00000" stroke="#ffd700" stroke-width="2"/>
        <circle cx="50" cy="22" r="6" fill="#ffd700"/>
      </svg>
    `),
    defaultWidth: 90,
    defaultHeight: 90,
    gridCells: '1x1',
    layer: 'props',
  },
  {
    id: 'prop-barrel',
    name: 'Пивная бочка',
    category: 'furniture',
    categoryLabel: 'Мебель',
    icon: '🛢️',
    url: svgToDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="40" fill="#6e472a" stroke="#2c1a0e" stroke-width="4"/>
        <circle cx="50" cy="50" r="32" fill="#805332" stroke="#4a2f1b" stroke-width="3"/>
        <circle cx="50" cy="50" r="12" fill="#4a2f1b"/>
        <line x1="18" y1="35" x2="82" y2="35" stroke="#333" stroke-width="3"/>
        <line x1="18" y1="65" x2="82" y2="65" stroke="#333" stroke-width="3"/>
      </svg>
    `),
    defaultWidth: 70,
    defaultHeight: 70,
    gridCells: '1x1',
    layer: 'props',
  },
  {
    id: 'prop-wooden-crate',
    name: 'Деревянный ящик',
    category: 'furniture',
    categoryLabel: 'Мебель',
    icon: '📦',
    url: svgToDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <rect x="15" y="15" width="70" height="70" rx="4" fill="#755135" stroke="#3d2716" stroke-width="4"/>
        <line x1="15" y1="15" x2="85" y2="85" stroke="#3d2716" stroke-width="4"/>
        <line x1="85" y1="15" x2="15" y2="85" stroke="#3d2716" stroke-width="4"/>
        <rect x="25" y="25" width="50" height="50" fill="none" stroke="#523620" stroke-width="3"/>
      </svg>
    `),
    defaultWidth: 70,
    defaultHeight: 70,
    gridCells: '1x1',
    layer: 'props',
  },
  {
    id: 'prop-bookcase',
    name: 'Книжный шкаф',
    category: 'furniture',
    categoryLabel: 'Мебель',
    icon: '📚',
    url: svgToDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <rect x="10" y="15" width="80" height="70" rx="4" fill="#4a2f1b" stroke="#2c1a0e" stroke-width="4"/>
        <rect x="16" y="22" width="68" height="16" fill="#800000"/>
        <rect x="16" y="42" width="68" height="16" fill="#000080"/>
        <rect x="16" y="62" width="68" height="16" fill="#006400"/>
        <line x1="10" y1="40" x2="90" y2="40" stroke="#2c1a0e" stroke-width="3"/>
        <line x1="10" y1="60" x2="90" y2="60" stroke="#2c1a0e" stroke-width="3"/>
      </svg>
    `),
    defaultWidth: 110,
    defaultHeight: 70,
    gridCells: '2x1',
    layer: 'props',
  },

  // --- NATURE ---
  {
    id: 'prop-ancient-oak',
    name: 'Древний дуб',
    category: 'nature',
    categoryLabel: 'Природа',
    icon: '🌳',
    url: svgToDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r="52" fill="#1e4620" opacity="0.9"/>
        <circle cx="45" cy="45" r="32" fill="#2d6a30"/>
        <circle cx="75" cy="45" r="30" fill="#38843c"/>
        <circle cx="60" cy="75" r="35" fill="#225325"/>
        <circle cx="60" cy="60" r="14" fill="#4a321a"/>
      </svg>
    `),
    defaultWidth: 160,
    defaultHeight: 160,
    gridCells: '3x3',
    layer: 'overhead',
  },
  {
    id: 'prop-campfire',
    name: 'Костёр привала',
    category: 'nature',
    categoryLabel: 'Природа',
    icon: '🔥',
    url: svgToDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="36" fill="#2b1a0e"/>
        <line x1="25" y1="25" x2="75" y2="75" stroke="#52351f" stroke-width="8" stroke-linecap="round"/>
        <line x1="75" y1="25" x2="25" y2="75" stroke="#52351f" stroke-width="8" stroke-linecap="round"/>
        <path d="M50,20 Q65,40 50,75 Q35,40 50,20 Z" fill="#ff4500"/>
        <path d="M50,30 Q60,45 50,70 Q40,45 50,30 Z" fill="#ff8c00"/>
        <path d="M50,42 Q55,50 50,65 Q45,50 50,42 Z" fill="#ffd700"/>
      </svg>
    `),
    defaultWidth: 85,
    defaultHeight: 85,
    gridCells: '1x1',
    layer: 'props',
  },
  {
    id: 'prop-granite-boulder',
    name: 'Гранитный валун',
    category: 'nature',
    categoryLabel: 'Природа',
    icon: '🪨',
    url: svgToDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <path d="M20,60 C15,35 35,15 60,20 C85,25 90,50 80,75 C70,90 30,90 20,60 Z" fill="#5a5e63" stroke="#2d3033" stroke-width="4"/>
        <path d="M30,50 C25,35 40,25 55,28" fill="none" stroke="#7e848c" stroke-width="3"/>
        <path d="M40,70 Q60,75 75,60" fill="none" stroke="#3c3f42" stroke-width="3"/>
      </svg>
    `),
    defaultWidth: 95,
    defaultHeight: 90,
    gridCells: '2x2',
    layer: 'props',
  },

  // --- LOOT & TREASURE ---
  {
    id: 'prop-gold-chest',
    name: 'Сундук с золотом',
    category: 'loot',
    categoryLabel: 'Сокровища',
    icon: '🪙',
    url: svgToDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <rect x="15" y="30" width="70" height="50" rx="6" fill="#8b5a2b" stroke="#3d240f" stroke-width="4"/>
        <path d="M15,30 Q50,10 85,30 Z" fill="#a06832" stroke="#3d240f" stroke-width="4"/>
        <rect x="42" y="45" width="16" height="20" rx="2" fill="#ffd700" stroke="#b8860b" stroke-width="2"/>
        <circle cx="50" cy="55" r="3" fill="#333"/>
        <line x1="15" y1="42" x2="85" y2="42" stroke="#ffd700" stroke-width="3"/>
      </svg>
    `),
    defaultWidth: 80,
    defaultHeight: 70,
    gridCells: '1x1',
    layer: 'props',
  },
  {
    id: 'prop-weapon-rack',
    name: 'Стойка с оружием',
    category: 'loot',
    categoryLabel: 'Сокровища',
    icon: '⚔️',
    url: svgToDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <rect x="10" y="70" width="80" height="15" fill="#52351d" stroke="#2b1a0d" stroke-width="3"/>
        <line x1="25" y1="20" x2="25" y2="70" stroke="#2b1a0d" stroke-width="4"/>
        <line x1="75" y1="20" x2="75" y2="70" stroke="#2b1a0d" stroke-width="4"/>
        <line x1="15" y1="30" x2="85" y2="30" stroke="#c0c0c0" stroke-width="4"/>
        <line x1="35" y1="15" x2="35" y2="75" stroke="#c0c0c0" stroke-width="3"/>
        <line x1="50" y1="15" x2="50" y2="75" stroke="#ffd700" stroke-width="3"/>
        <line x1="65" y1="15" x2="65" y2="75" stroke="#c0c0c0" stroke-width="3"/>
      </svg>
    `),
    defaultWidth: 90,
    defaultHeight: 80,
    gridCells: '2x1',
    layer: 'props',
  },

  // --- MAGIC & TRAPS ---
  {
    id: 'prop-arcane-pentagram',
    name: 'Магическая пентаграмма',
    category: 'magic',
    categoryLabel: 'Магия',
    icon: '🔮',
    url: svgToDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="42" fill="none" stroke="#9333ea" stroke-width="3"/>
        <circle cx="50" cy="50" r="36" fill="none" stroke="#a855f7" stroke-width="2" stroke-dasharray="4,3"/>
        <polygon points="50,10 62,40 92,40 68,58 78,88 50,70 22,88 32,58 8,40 38,40" fill="none" stroke="#c084fc" stroke-width="2"/>
        <circle cx="50" cy="50" r="8" fill="#e9d5ff" opacity="0.8"/>
      </svg>
    `),
    defaultWidth: 120,
    defaultHeight: 120,
    gridCells: '2x2',
    layer: 'background',
  },
  {
    id: 'prop-spiked-trap',
    name: 'Ловушка с шипами',
    category: 'magic',
    categoryLabel: 'Магия',
    icon: '⚠️',
    url: svgToDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <rect x="10" y="10" width="80" height="80" fill="#3f3f46" stroke="#18181b" stroke-width="4"/>
        <polygon points="30,25 25,45 35,45" fill="#d4d4d8" stroke="#52525b"/>
        <polygon points="70,25 65,45 75,45" fill="#d4d4d8" stroke="#52525b"/>
        <polygon points="50,50 45,75 55,75" fill="#d4d4d8" stroke="#52525b"/>
        <polygon points="25,65 20,80 30,80" fill="#d4d4d8" stroke="#52525b"/>
        <polygon points="75,65 70,80 80,80" fill="#d4d4d8" stroke="#52525b"/>
      </svg>
    `),
    defaultWidth: 80,
    defaultHeight: 80,
    gridCells: '1x1',
    layer: 'props',
  },

  // --- ARCHITECTURE ---
  {
    id: 'prop-dungeon-door',
    name: 'Решётка / Дверь',
    category: 'architecture',
    categoryLabel: 'Архитектура',
    icon: '🚪',
    url: svgToDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <rect x="10" y="35" width="80" height="30" fill="#52525b" stroke="#18181b" stroke-width="4"/>
        <line x1="25" y1="35" x2="25" y2="65" stroke="#27272a" stroke-width="3"/>
        <line x1="40" y1="35" x2="40" y2="65" stroke="#27272a" stroke-width="3"/>
        <line x1="55" y1="35" x2="55" y2="65" stroke="#27272a" stroke-width="3"/>
        <line x1="70" y1="35" x2="70" y2="65" stroke="#27272a" stroke-width="3"/>
        <circle cx="78" cy="50" r="3" fill="#ffd700"/>
      </svg>
    `),
    defaultWidth: 100,
    defaultHeight: 50,
    gridCells: '2x1',
    layer: 'props',
  },
  {
    id: 'prop-stone-pillar',
    name: 'Каменная колонна',
    category: 'architecture',
    categoryLabel: 'Архитектура',
    icon: '🏛️',
    url: svgToDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="42" fill="#71717a" stroke="#27272a" stroke-width="5"/>
        <circle cx="50" cy="50" r="32" fill="#a1a1aa" stroke="#52525b" stroke-width="3"/>
        <circle cx="50" cy="50" r="16" fill="#d4d4d8"/>
      </svg>
    `),
    defaultWidth: 80,
    defaultHeight: 80,
    gridCells: '1x1',
    layer: 'overhead',
  },

  // --- TOKENS ---
  {
    id: 'prop-token-dragon',
    name: 'Красный Дракон',
    category: 'tokens',
    categoryLabel: 'Токены',
    icon: '🐉',
    url: svgToDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="44" fill="#991b1b" stroke="#f59e0b" stroke-width="4"/>
        <circle cx="50" cy="50" r="38" fill="#7f1d1d"/>
        <text x="50" y="62" font-size="38" text-anchor="middle">🐲</text>
      </svg>
    `),
    defaultWidth: 140,
    defaultHeight: 140,
    gridCells: '3x3',
    layer: 'props',
  },
  {
    id: 'prop-token-skeleton',
    name: 'Воин-Скелет',
    category: 'tokens',
    categoryLabel: 'Токены',
    icon: '💀',
    url: svgToDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="42" fill="#3f3f46" stroke="#e4e4e7" stroke-width="4"/>
        <text x="50" y="62" font-size="36" text-anchor="middle">💀</text>
      </svg>
    `),
    defaultWidth: 80,
    defaultHeight: 80,
    gridCells: '1x1',
    layer: 'props',
  },
];
