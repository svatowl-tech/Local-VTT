import { NpcRawData, TreasureRawData, LootRawData, MerchantRawData } from '../types/generatorTypes';

/**
 * Encodes an SVG string safely into a Data URL
 */
export function svgToDataUrl(svgString: string): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svgString.trim())}`;
}

// Color palettes for different classes
const CLASS_THEMES: Record<string, { bg: string; border: string; accent: string; emoji: string }> = {
  'Воин': { bg: '#831843', border: '#f43f5e', accent: '#fecdd3', emoji: '⚔️' },
  'Волшебник': { bg: '#1e1b4b', border: '#818cf8', accent: '#e0e7ff', emoji: '🔮' },
  'Плут': { bg: '#18181b', border: '#71717a', accent: '#e4e4e7', emoji: '🗡️' },
  'Жрец': { bg: '#713f12', border: '#eab308', accent: '#fef08a', emoji: '✝️' },
  'Следопыт': { bg: '#064e3b', border: '#10b981', accent: '#a7f3d0', emoji: '🏹' },
  'Паладин': { bg: '#1e3a8a', border: '#60a5fa', accent: '#dbeafe', emoji: '🛡️' },
  'Варвар': { bg: '#7f1d1d', border: '#ef4444', accent: '#fca5a5', emoji: '🪓' },
  'Бард': { bg: '#581c87', border: '#c084fc', accent: '#f3e8ff', emoji: '🎭' },
  'Друид': { bg: '#14532d', border: '#22c55e', accent: '#bbf7d0', emoji: '🌿' },
  'Монах': { bg: '#7c2d12', border: '#f97316', accent: '#ffedd5', emoji: '🥋' },
  'Колдун': { bg: '#4c0519', border: '#fb7185', accent: '#ffe4e6', emoji: '👁️' },
  'Чародей': { bg: '#312e81', border: '#a855f7', accent: '#f5d0fe', emoji: '⚡' },
};

/**
 * Generates an ultra-crisp circular combat token SVG with nameplate, HP and AC badges
 */
export function generateNpcTokenSvg(npc: NpcRawData & { avatarUrl?: string; tokenImg?: string; img?: string; avatar?: string }): string {
  const theme = CLASS_THEMES[npc.classType] || { bg: '#27272a', border: '#e4e4e7', accent: '#fafafa', emoji: '👤' };
  const displayName = npc.fullName.length > 14 ? npc.fullName.substring(0, 12) + '…' : npc.fullName;
  const rawArt = npc.avatarUrl || npc.tokenImg || npc.img || npc.avatar;
  const isImgUrl = rawArt && (rawArt.startsWith('http://') || rawArt.startsWith('https://') || rawArt.startsWith('data:'));

  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
  <defs>
    <linearGradient id="tokenBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${theme.bg}" stop-opacity="0.95"/>
      <stop offset="100%" stop-color="#09090b" stop-opacity="0.98"/>
    </linearGradient>
    <radialGradient id="tokenGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="${theme.border}" stop-opacity="0.3"/>
      <stop offset="100%" stop-color="transparent" stop-opacity="0"/>
    </radialGradient>
    <filter id="dropShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="4" stdDeviation="4" flood-color="#000000" flood-opacity="0.7"/>
    </filter>
    <clipPath id="npcClip">
      <circle cx="100" cy="85" r="42"/>
    </clipPath>
  </defs>

  <!-- Shadow & Glow -->
  <circle cx="100" cy="100" r="92" fill="url(#tokenGlow)"/>
  
  <!-- Outer Rune Border Ring -->
  <circle cx="100" cy="100" r="88" fill="url(#tokenBg)" stroke="${theme.border}" stroke-width="6" filter="url(#dropShadow)"/>
  <circle cx="100" cy="100" r="80" fill="none" stroke="${theme.accent}" stroke-width="1.5" stroke-dasharray="8,4" opacity="0.6"/>

  <!-- Class Silhouette / Image / Emoji Icon -->
  ${
    isImgUrl
      ? `
  <circle cx="100" cy="85" r="44" fill="#18181b" stroke="${theme.border}" stroke-width="2"/>
  <image href="${rawArt}" x="56" y="41" width="88" height="88" preserveAspectRatio="xMidYMid slice" clip-path="url(#npcClip)"/>
  `
      : `
  <circle cx="100" cy="85" r="42" fill="#18181b" stroke="${theme.border}" stroke-width="2" opacity="0.8"/>
  <text x="100" y="98" font-size="44" text-anchor="middle" dominant-baseline="central">${theme.emoji}</text>
  `
  }

  <!-- Level & Initials Badge -->
  <text x="100" y="44" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="11" fill="${theme.accent}" text-anchor="middle" letter-spacing="1">
    ${npc.race.toUpperCase()} • LVL ${npc.level}
  </text>

  <!-- AC Shield Badge (Top-Left) -->
  <g transform="translate(18, 22)">
    <rect x="0" y="0" width="34" height="22" rx="6" fill="#1e3a8a" stroke="#60a5fa" stroke-width="1.5"/>
    <text x="17" y="15" font-family="system-ui, -apple-system, sans-serif" font-weight="bold" font-size="11" fill="#ffffff" text-anchor="middle">🛡${npc.ac}</text>
  </g>

  <!-- HP Heart Badge (Top-Right) -->
  <g transform="translate(148, 22)">
    <rect x="0" y="0" width="34" height="22" rx="6" fill="#881337" stroke="#fb7185" stroke-width="1.5"/>
    <text x="17" y="15" font-family="system-ui, -apple-system, sans-serif" font-weight="bold" font-size="11" fill="#ffffff" text-anchor="middle">♥${npc.hp}</text>
  </g>

  <!-- Bottom Name Banner -->
  <g transform="translate(20, 142)">
    <rect x="0" y="0" width="160" height="28" rx="8" fill="#09090b" stroke="${theme.border}" stroke-width="2" opacity="0.95"/>
    <text x="80" y="18" font-family="system-ui, -apple-system, sans-serif" font-weight="bold" font-size="12" fill="#ffffff" text-anchor="middle">
      ${displayName}
    </text>
  </g>
</svg>
  `;
  return svgToDataUrl(svg);
}

/**
 * Generates an ornate glowing treasure hoard chest token
 */
export function generateTreasureTokenSvg(level: number, grandTotalGp: number): string {
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
  <defs>
    <radialGradient id="goldGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#fbbf24" stop-opacity="0.4"/>
      <stop offset="100%" stop-color="transparent" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="chestGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#78350f"/>
      <stop offset="100%" stop-color="#451a03"/>
    </linearGradient>
  </defs>

  <circle cx="100" cy="100" r="92" fill="url(#goldGlow)"/>
  <circle cx="100" cy="100" r="88" fill="#18181b" stroke="#f59e0b" stroke-width="6"/>
  <circle cx="100" cy="100" r="80" fill="none" stroke="#fbbf24" stroke-width="1.5" stroke-dasharray="6,4" opacity="0.7"/>

  <!-- Chest Icon / Visual -->
  <text x="100" y="92" font-size="52" text-anchor="middle" dominant-baseline="central">🪙</text>

  <!-- Level Badge -->
  <rect x="55" y="24" width="90" height="20" rx="6" fill="#451a03" stroke="#f59e0b" stroke-width="1.5"/>
  <text x="100" y="38" font-family="system-ui, -apple-system, sans-serif" font-weight="bold" font-size="10" fill="#fef08a" text-anchor="middle" letter-spacing="1">
    КЛАД • CR ${level}
  </text>

  <!-- Price Banner -->
  <g transform="translate(25, 142)">
    <rect x="0" y="0" width="150" height="28" rx="8" fill="#09090b" stroke="#f59e0b" stroke-width="2"/>
    <text x="75" y="18" font-family="system-ui, -apple-system, sans-serif" font-weight="bold" font-size="12" fill="#fbbf24" text-anchor="middle">
      ~${grandTotalGp.toLocaleString('ru-RU')} gp
    </text>
  </g>
</svg>
  `;
  return svgToDataUrl(svg);
}

/**
 * Generates an adventure backpack / loot pouch token
 */
export function generateLootTokenSvg(monsterItem: string): string {
  const shortItem = monsterItem.length > 15 ? monsterItem.substring(0, 13) + '…' : monsterItem;
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
  <defs>
    <radialGradient id="lootGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#10b981" stop-opacity="0.4"/>
      <stop offset="100%" stop-color="transparent" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <circle cx="100" cy="100" r="92" fill="url(#lootGlow)"/>
  <circle cx="100" cy="100" r="88" fill="#18181b" stroke="#10b981" stroke-width="6"/>
  <circle cx="100" cy="100" r="80" fill="none" stroke="#6ee7b7" stroke-width="1.5" stroke-dasharray="6,4" opacity="0.7"/>

  <!-- Pouch Icon -->
  <text x="100" y="90" font-size="52" text-anchor="middle" dominant-baseline="central">🎒</text>

  <!-- Title Badge -->
  <rect x="55" y="24" width="90" height="20" rx="6" fill="#064e3b" stroke="#10b981" stroke-width="1.5"/>
  <text x="100" y="38" font-family="system-ui, -apple-system, sans-serif" font-weight="bold" font-size="10" fill="#a7f3d0" text-anchor="middle" letter-spacing="1">
    ТРОФЕИ / ЛУТ
  </text>

  <!-- Name Banner -->
  <g transform="translate(25, 142)">
    <rect x="0" y="0" width="150" height="28" rx="8" fill="#09090b" stroke="#10b981" stroke-width="2"/>
    <text x="75" y="18" font-family="system-ui, -apple-system, sans-serif" font-weight="bold" font-size="11" fill="#ecfdf5" text-anchor="middle">
      ${shortItem}
    </text>
  </g>
</svg>
  `;
  return svgToDataUrl(svg);
}

/**
 * Generates a merchant shop stall token
 */
export function generateMerchantTokenSvg(shopType: string, merchantName: string): string {
  const shortName = merchantName.length > 15 ? merchantName.substring(0, 13) + '…' : merchantName;
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
  <defs>
    <radialGradient id="shopGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#8b5cf6" stop-opacity="0.4"/>
      <stop offset="100%" stop-color="transparent" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <circle cx="100" cy="100" r="92" fill="url(#shopGlow)"/>
  <circle cx="100" cy="100" r="88" fill="#18181b" stroke="#8b5cf6" stroke-width="6"/>
  <circle cx="100" cy="100" r="80" fill="none" stroke="#c4b5fd" stroke-width="1.5" stroke-dasharray="6,4" opacity="0.7"/>

  <!-- Stall Icon -->
  <text x="100" y="90" font-size="52" text-anchor="middle" dominant-baseline="central">🏪</text>

  <!-- Title Badge -->
  <rect x="45" y="24" width="110" height="20" rx="6" fill="#4c1d95" stroke="#8b5cf6" stroke-width="1.5"/>
  <text x="100" y="38" font-family="system-ui, -apple-system, sans-serif" font-weight="bold" font-size="10" fill="#ede9fe" text-anchor="middle" letter-spacing="1">
    ЛАВКА ТОРГОВЦА
  </text>

  <!-- Name Banner -->
  <g transform="translate(25, 142)">
    <rect x="0" y="0" width="150" height="28" rx="8" fill="#09090b" stroke="#8b5cf6" stroke-width="2"/>
    <text x="75" y="18" font-family="system-ui, -apple-system, sans-serif" font-weight="bold" font-size="11" fill="#f5f3ff" text-anchor="middle">
      ${shortName}
    </text>
  </g>
</svg>
  `;
  return svgToDataUrl(svg);
}

/**
 * Generates an ultra-crisp circular monster token SVG with CR & HP nameplate and optional embedded art
 */
export function generateMonsterTokenSvg(monster: {
  name: string;
  cr: string;
  hp: number;
  ac: number;
  avatar?: string;
  avatarUrl?: string;
  tokenImg?: string;
  img?: string;
}): string {
  const shortName = monster.name.length > 15 ? monster.name.substring(0, 13) + '…' : monster.name;
  const rawArt = monster.avatarUrl || monster.tokenImg || monster.img || monster.avatar;
  const isImgUrl = rawArt && (rawArt.startsWith('http://') || rawArt.startsWith('https://') || rawArt.startsWith('data:'));
  const emoji = rawArt && !isImgUrl ? rawArt : '👾';

  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
  <defs>
    <radialGradient id="monsterGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#f43f5e" stop-opacity="0.4"/>
      <stop offset="100%" stop-color="transparent" stop-opacity="0"/>
    </radialGradient>
    <clipPath id="monsterAvatarClip">
      <circle cx="100" cy="85" r="46"/>
    </clipPath>
  </defs>

  <circle cx="100" cy="100" r="92" fill="url(#monsterGlow)"/>
  <circle cx="100" cy="100" r="88" fill="#18181b" stroke="#f43f5e" stroke-width="6"/>

  <!-- Monster Avatar (Image or Emoji) -->
  ${
    isImgUrl
      ? `
  <circle cx="100" cy="85" r="48" fill="#09090b" stroke="#f43f5e" stroke-width="2"/>
  <image href="${rawArt}" x="52" y="37" width="96" height="96" preserveAspectRatio="xMidYMid slice" clip-path="url(#monsterAvatarClip)"/>
  `
      : `
  <text x="100" y="90" font-size="56" text-anchor="middle" dominant-baseline="central">${emoji}</text>
  `
  }

  <circle cx="100" cy="100" r="80" fill="none" stroke="#fecdd3" stroke-width="1.5" stroke-dasharray="6,4" opacity="0.7"/>

  <!-- CR Badge Top -->
  <rect x="55" y="22" width="90" height="20" rx="6" fill="#881337" stroke="#f43f5e" stroke-width="1.5"/>
  <text x="100" y="36" font-family="system-ui, -apple-system, sans-serif" font-weight="bold" font-size="10" fill="#ffe4e6" text-anchor="middle" letter-spacing="1">
    ${monster.cr} • КБ ${monster.ac}
  </text>

  <!-- Name Banner Bottom -->
  <g transform="translate(20, 142)">
    <rect x="0" y="0" width="160" height="28" rx="8" fill="#09090b" stroke="#f43f5e" stroke-width="2"/>
    <text x="80" y="18" font-family="system-ui, -apple-system, sans-serif" font-weight="bold" font-size="11" fill="#fff1f2" text-anchor="middle">
      ${shortName}
    </text>
  </g>
</svg>
  `;
  return svgToDataUrl(svg);
}
