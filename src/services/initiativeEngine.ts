import {
  PlayerCharacter,
  MonsterTemplate,
  InitiativeCombatant,
  InitiativeEncounterState,
} from '../types';
import { fetchInitiativeState, updateInitiativeStateServer } from './apiClient';

type InitiativeListener = () => void;

const LOCAL_STORAGE_KEY = 'aethermap_initiative_data_v1';
const BROADCAST_CHANNEL_NAME = 'aethermap_initiative_sync_channel';

export const DEFAULT_PLAYER_DB: PlayerCharacter[] = [
  {
    id: 'player-valdar',
    name: 'Вальдар Светоносный',
    classLevel: 'Паладин 5',
    playerOwner: 'Алексей',
    maxHp: 48,
    currentHp: 48,
    ac: 18,
    initBonus: 1,
    avatar: '🛡️',
    notes: 'Клятва Преданности. Защитник отряда.',
    isPresent: true,
  },
  {
    id: 'player-elara',
    name: 'Элара Ветрокрылая',
    classLevel: 'Следопыт 4',
    playerOwner: 'Мария',
    maxHp: 34,
    currentHp: 34,
    ac: 15,
    initBonus: 3,
    avatar: '🏹',
    notes: 'Стрелок, заклятый враг — гоблиноиды.',
    isPresent: true,
  },
  {
    id: 'player-magnus',
    name: 'Магнус Тёмный',
    classLevel: 'Волшебник 5',
    playerOwner: 'Дмитрий',
    maxHp: 28,
    currentHp: 28,
    ac: 13,
    initBonus: 2,
    avatar: '🔮',
    notes: 'Школа Воплощения. Любимое заклинание: Огненный шар.',
    isPresent: true,
  },
  {
    id: 'player-finn',
    name: 'Финн Хитрый',
    classLevel: 'Плут 4',
    playerOwner: 'Антон',
    maxHp: 31,
    currentHp: 31,
    ac: 14,
    initBonus: 4,
    avatar: '🗡️',
    notes: 'Подвох, Вор. Мастер скрытности.',
    isPresent: true,
  },
  {
    id: 'player-braor',
    name: 'Браор Ломатель',
    classLevel: 'Варвар 5',
    playerOwner: 'Сергей',
    maxHp: 58,
    currentHp: 58,
    ac: 16,
    initBonus: 2,
    avatar: '🪓',
    notes: 'Путь Берсерка. Ярость увеличивает урон.',
    isPresent: false,
  },
];

export const DEFAULT_MONSTER_DB: MonsterTemplate[] = [
  {
    id: 'monster-goblin',
    name: 'Гоблин',
    type: 'Гуманоид',
    maxHp: 7,
    ac: 15,
    initBonus: 2,
    cr: 'CR 1/4',
    avatar: '👺',
    notes: 'Рассредоточенное бегство, проворное сматывание.',
  },
  {
    id: 'monster-orc',
    name: 'Орк-воитель',
    type: 'Гуманоид',
    maxHp: 15,
    ac: 13,
    initBonus: 1,
    cr: 'CR 1/2',
    avatar: '👹',
    notes: 'Агрессия: бонусное движение к врагу.',
  },
  {
    id: 'monster-skeleton',
    name: 'Скелет',
    type: 'Нежить',
    maxHp: 13,
    ac: 13,
    initBonus: 2,
    cr: 'CR 1/4',
    avatar: '💀',
    notes: 'Уязвимость к дробящему урону.',
  },
  {
    id: 'monster-zombie',
    name: 'Зомби',
    type: 'Нежить',
    maxHp: 22,
    ac: 8,
    initBonus: -1,
    cr: 'CR 1/4',
    avatar: '🧟',
    notes: 'Стойкость нежити: спасбросок телосложения от смерти.',
  },
  {
    id: 'monster-ogr',
    name: 'Огр',
    type: 'Гигант',
    maxHp: 59,
    ac: 11,
    initBonus: -1,
    cr: 'CR 2',
    avatar: '🗿',
    notes: 'Палица: 2d8 + 4 дробящего урона.',
  },
  {
    id: 'monster-wolf',
    name: 'Пещерный Волк',
    type: 'Зверь',
    maxHp: 37,
    ac: 13,
    initBonus: 2,
    cr: 'CR 1',
    avatar: '🐺',
    notes: 'Стайная тактика, попытка сбить с ног при укусе.',
  },
  {
    id: 'monster-beholder',
    name: 'Злобоглаз (Beholder)',
    type: 'Аберрация',
    maxHp: 180,
    ac: 18,
    initBonus: 2,
    cr: 'CR 13',
    avatar: '👁️',
    notes: 'Антимагический конус, 3 луча глазом за раунд.',
  },
  {
    id: 'monster-red-dragon',
    name: 'Древний Красный Дракон',
    type: 'Дракон',
    maxHp: 546,
    ac: 22,
    initBonus: 0,
    cr: 'CR 17',
    avatar: '🐉',
    notes: 'Огненный дыхательный конус (26d6), легендарные действия.',
  },
  {
    id: 'monster-lich',
    name: 'Лич',
    type: 'Нежить',
    maxHp: 135,
    ac: 17,
    initBonus: 3,
    cr: 'CR 21',
    avatar: '🧙‍♂️',
    notes: 'Заклинатель 20 уровня, парализующее касание.',
  },
  {
    id: 'monster-kobold',
    name: 'Кобольд',
    type: 'Гуманоид',
    maxHp: 5,
    ac: 12,
    initBonus: 2,
    cr: 'CR 1/8',
    avatar: '🦎',
    notes: 'Чувствительность к солнцу, стайная тактика.',
  },
];

export const POPULAR_CONDITIONS = [
  'Сбит с ног',
  'Отравлен',
  'Оглушен',
  'Парализован',
  'Захвачен',
  'Ослеплен',
  'Испуган',
  'Невидимость',
  'Бессознания',
  'Горит',
];

class InitiativeEngine {
  private listeners: Set<InitiativeListener> = new Set();
  private playerDatabase: PlayerCharacter[] = DEFAULT_PLAYER_DB;
  private monsterDatabase: MonsterTemplate[] = DEFAULT_MONSTER_DB;
  private encounter: InitiativeEncounterState = {
    inCombat: false,
    round: 1,
    activeTurnIndex: 0,
    combatants: [],
    showToPlayers: true,
  };

  private channel: BroadcastChannel | null = null;
  private isRequesting = false;

  constructor() {
    this.loadFromStorage();
    this.initBroadcastSync();
    this.requestRemoteSync();
  }

  private initBroadcastSync(): void {
    if (typeof window === 'undefined') return;

    if (typeof BroadcastChannel !== 'undefined') {
      try {
        this.channel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
        this.channel.onmessage = (event) => {
          if (!event.data) return;

          if (event.data.type === 'INITIATIVE_STATE_SYNC') {
            this.applyRemoteState(event.data.payload);
          } else if (event.data.type === 'REQUEST_INITIATIVE_STATE') {
            // Another window (e.g. 2nd projector window) just opened and asked for state
            this.broadcastState();
          }
        };
      } catch (err) {
        console.warn('BroadcastChannel not supported for initiative sync', err);
      }
    }

    window.addEventListener('storage', (event) => {
      if (event.key === LOCAL_STORAGE_KEY) {
        this.loadFromStorage();
        this.notifyListenersOnly();
      }
    });

    window.addEventListener('focus', () => {
      this.refreshState();
    });

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
          this.refreshState();
        }
      });
    }
  }

  public async requestRemoteSync(): Promise<void> {
    // 1. Instantly ping any open master tabs/windows via BroadcastChannel
    if (this.channel) {
      try {
        this.channel.postMessage({ type: 'REQUEST_INITIATIVE_STATE' });
      } catch (e) {
        // silent
      }
    }

    // 2. Fetch authoritative state from backend server
    if (!this.isRequesting) {
      this.isRequesting = true;
      try {
        const serverData = await fetchInitiativeState();
        if (serverData && serverData.encounter) {
          this.applyRemoteState(serverData);
        }
      } catch (e) {
        // offline
      } finally {
        this.isRequesting = false;
      }
    }
  }

  public async refreshState(): Promise<void> {
    this.loadFromStorage();
    this.notifyListenersOnly();
    await this.requestRemoteSync();
  }

  public subscribe(listener: InitiativeListener): () => void {
    this.listeners.add(listener);
    // Immediately call listener on subscribe to guarantee current data is mounted
    listener();
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    this.saveToStorage();
    this.broadcastState();
    this.notifyListenersOnly();
    
    // Sync with backend asynchronously
    updateInitiativeStateServer(this.getState()).catch(() => {});
  }

  private broadcastState(): void {
    if (this.channel) {
      try {
        this.channel.postMessage({
          type: 'INITIATIVE_STATE_SYNC',
          payload: this.getState(),
        });
      } catch (e) {
        console.warn('Failed to broadcast initiative state', e);
      }
    }
  }

  private applyRemoteState(payload: any): void {
    if (!payload || !payload.encounter) return;
    if (Array.isArray(payload.playerDatabase) && payload.playerDatabase.length > 0) {
      this.playerDatabase = payload.playerDatabase;
    }
    if (Array.isArray(payload.monsterDatabase) && payload.monsterDatabase.length > 0) {
      this.monsterDatabase = payload.monsterDatabase;
    }
    this.encounter = {
      inCombat: !!payload.encounter.inCombat,
      round: payload.encounter.round || 1,
      activeTurnIndex: payload.encounter.activeTurnIndex || 0,
      combatants: Array.isArray(payload.encounter.combatants) ? payload.encounter.combatants : [],
      showToPlayers: payload.encounter.showToPlayers !== undefined ? !!payload.encounter.showToPlayers : true,
    };
    this.saveToStorage();
    this.notifyListenersOnly();
  }

  private notifyListenersOnly(): void {
    this.listeners.forEach((l) => l());
  }

  public getState() {
    return {
      playerDatabase: this.playerDatabase,
      monsterDatabase: this.monsterDatabase,
      encounter: this.encounter,
    };
  }

  // --- Persistence ---
  private loadFromStorage(): void {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed.playerDatabase) && parsed.playerDatabase.length > 0) {
          this.playerDatabase = parsed.playerDatabase;
        }
        if (Array.isArray(parsed.monsterDatabase) && parsed.monsterDatabase.length > 0) {
          this.monsterDatabase = parsed.monsterDatabase;
        }
        if (parsed.encounter) {
          this.encounter = {
            inCombat: !!parsed.encounter.inCombat,
            round: parsed.encounter.round || 1,
            activeTurnIndex: parsed.encounter.activeTurnIndex || 0,
            combatants: Array.isArray(parsed.encounter.combatants) ? parsed.encounter.combatants : [],
            showToPlayers: parsed.encounter.showToPlayers !== undefined ? !!parsed.encounter.showToPlayers : true,
          };
        }
      }
    } catch (e) {
      console.warn('Failed to load initiative state from localStorage', e);
    }
  }

  private saveToStorage(): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(
        LOCAL_STORAGE_KEY,
        JSON.stringify({
          playerDatabase: this.playerDatabase,
          monsterDatabase: this.monsterDatabase,
          encounter: this.encounter,
        })
      );
    } catch (e) {
      console.warn('Failed to save initiative state to localStorage', e);
    }
  }

  // --- Player Database Operations ---
  public togglePlayerPresence(playerId: string): void {
    this.playerDatabase = this.playerDatabase.map((p) =>
      p.id === playerId ? { ...p, isPresent: !p.isPresent } : p
    );
    this.notify();
  }

  public addPlayerToDb(data: Omit<PlayerCharacter, 'id'>): PlayerCharacter {
    const newPlayer: PlayerCharacter = {
      ...data,
      id: `player-custom-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      isPresent: data.isPresent ?? true,
    };
    this.playerDatabase = [...this.playerDatabase, newPlayer];
    this.notify();
    return newPlayer;
  }

  public updatePlayerInDb(playerId: string, updates: Partial<PlayerCharacter>): void {
    this.playerDatabase = this.playerDatabase.map((p) =>
      p.id === playerId ? { ...p, ...updates } : p
    );
    this.notify();
  }

  public removePlayerFromDb(playerId: string): void {
    this.playerDatabase = this.playerDatabase.filter((p) => p.id !== playerId);
    this.notify();
  }

  // --- Monster Database Operations ---
  public addMonsterToDb(data: Omit<MonsterTemplate, 'id'>): MonsterTemplate {
    const newMonster: MonsterTemplate = {
      ...data,
      id: `monster-custom-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    };
    this.monsterDatabase = [...this.monsterDatabase, newMonster];
    this.notify();
    return newMonster;
  }

  public updateMonsterInDb(monsterId: string, updates: Partial<MonsterTemplate>): void {
    this.monsterDatabase = this.monsterDatabase.map((m) =>
      m.id === monsterId ? { ...m, ...updates } : m
    );
    this.notify();
  }

  public removeMonsterFromDb(monsterId: string): void {
    this.monsterDatabase = this.monsterDatabase.filter((m) => m.id !== monsterId);
    this.notify();
  }

  // --- Active Encounter Operations ---

  // Add all players marked as 'isPresent' in DB to active encounter
  public addPresentPlayersToEncounter(): void {
    const presentPlayers = this.playerDatabase.filter((p) => p.isPresent);
    
    // Avoid adding duplicate players already in combat
    const existingEntityIds = new Set(this.encounter.combatants.map((c) => c.entityId));

    const newCombatants: InitiativeCombatant[] = presentPlayers
      .filter((p) => !existingEntityIds.has(p.id))
      .map((p) => ({
        id: `combatant-player-${p.id}-${Date.now()}-${Math.random().toString(36).substring(2, 4)}`,
        entityId: p.id,
        name: p.name,
        category: 'player',
        initiative: 0,
        initBonus: p.initBonus,
        currentHp: p.currentHp,
        maxHp: p.maxHp,
        ac: p.ac,
        avatar: p.avatar,
        conditions: [],
        notes: p.classLevel,
        isHidden: false,
      }));

    this.encounter.combatants = [...this.encounter.combatants, ...newCombatants];
    this.notify();
  }

  // Add monster(s) to encounter
  public addMonsterToEncounter(monsterId: string, count: number = 1): void {
    const template = this.monsterDatabase.find((m) => m.id === monsterId);
    if (!template) return;

    const newCombatants: InitiativeCombatant[] = [];

    // Count existing monsters of same template to number them correctly (e.g., "Гоблин 1", "Гоблин 2")
    const existingCount = this.encounter.combatants.filter(
      (c) => c.entityId === monsterId || c.name.startsWith(template.name)
    ).length;

    for (let i = 1; i <= count; i++) {
      const monsterNum = existingCount + i;
      const monsterName = count > 1 || existingCount > 0 ? `${template.name} #${monsterNum}` : template.name;

      newCombatants.push({
        id: `combatant-monster-${template.id}-${Date.now()}-${Math.random().toString(36).substring(2, 5)}-${i}`,
        entityId: template.id,
        name: monsterName,
        category: 'monster',
        initiative: 0,
        initBonus: template.initBonus,
        currentHp: template.maxHp,
        maxHp: template.maxHp,
        ac: template.ac,
        avatar: template.avatar,
        conditions: [],
        notes: `${template.cr} • ${template.type}`,
        isHidden: false,
      });
    }

    this.encounter.combatants = [...this.encounter.combatants, ...newCombatants];
    this.notify();
  }

  // Add custom ad-hoc combatant
  public addCustomCombatant(data: Omit<InitiativeCombatant, 'id'>): InitiativeCombatant {
    const newCombatant: InitiativeCombatant = {
      ...data,
      id: `combatant-custom-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    };
    this.encounter.combatants = [...this.encounter.combatants, newCombatant];
    this.notify();
    return newCombatant;
  }

  public removeCombatant(combatantId: string): void {
    this.encounter.combatants = this.encounter.combatants.filter((c) => c.id !== combatantId);
    if (this.encounter.activeTurnIndex >= this.encounter.combatants.length) {
      this.encounter.activeTurnIndex = Math.max(0, this.encounter.combatants.length - 1);
    }
    this.notify();
  }

  public updateCombatant(combatantId: string, updates: Partial<InitiativeCombatant>): void {
    this.encounter.combatants = this.encounter.combatants.map((c) =>
      c.id === combatantId ? { ...c, ...updates } : c
    );
    this.notify();
  }

  public updateHp(combatantId: string, delta: number): void {
    this.encounter.combatants = this.encounter.combatants.map((c) => {
      if (c.id !== combatantId) return c;
      const newHp = Math.max(0, Math.min(c.maxHp, c.currentHp + delta));
      return { ...c, currentHp: newHp };
    });
    this.notify();
  }

  public toggleCondition(combatantId: string, condition: string): void {
    this.encounter.combatants = this.encounter.combatants.map((c) => {
      if (c.id !== combatantId) return c;
      const exists = c.conditions.includes(condition);
      const newConditions = exists
        ? c.conditions.filter((cond) => cond !== condition)
        : [...c.conditions, condition];
      return { ...c, conditions: newConditions };
    });
    this.notify();
  }

  public setInitiative(combatantId: string, value: number): void {
    this.encounter.combatants = this.encounter.combatants.map((c) =>
      c.id === combatantId ? { ...c, initiative: value } : c
    );
    this.sortInitiative();
  }

  public rollInitiativeOne(combatantId: string): void {
    this.encounter.combatants = this.encounter.combatants.map((c) => {
      if (c.id !== combatantId) return c;
      const d20 = Math.floor(Math.random() * 20) + 1;
      return { ...c, initiative: d20 + c.initBonus };
    });
    this.sortInitiative();
  }

  public rollInitiativeAll(): void {
    this.encounter.combatants = this.encounter.combatants.map((c) => {
      const d20 = Math.floor(Math.random() * 20) + 1;
      return { ...c, initiative: d20 + c.initBonus };
    });
    this.sortInitiative();
  }

  public sortInitiative(): void {
    this.encounter.combatants.sort((a, b) => {
      if (b.initiative !== a.initiative) {
        return b.initiative - a.initiative;
      }
      // Tie breaker: bonus
      return b.initBonus - a.initBonus;
    });
    this.notify();
  }

  public startCombat(): void {
    this.encounter.inCombat = true;
    this.encounter.round = 1;
    this.encounter.activeTurnIndex = 0;
    this.sortInitiative();
  }

  public nextTurn(): void {
    if (this.encounter.combatants.length === 0) return;
    this.encounter.activeTurnIndex++;
    if (this.encounter.activeTurnIndex >= this.encounter.combatants.length) {
      this.encounter.activeTurnIndex = 0;
      this.encounter.round++;
    }
    this.notify();
  }

  public prevTurn(): void {
    if (this.encounter.combatants.length === 0) return;
    this.encounter.activeTurnIndex--;
    if (this.encounter.activeTurnIndex < 0) {
      this.encounter.activeTurnIndex = Math.max(0, this.encounter.combatants.length - 1);
      this.encounter.round = Math.max(1, this.encounter.round - 1);
    }
    this.notify();
  }

  public endCombat(): void {
    this.encounter.inCombat = false;
    this.encounter.round = 1;
    this.encounter.activeTurnIndex = 0;
    this.notify();
  }

  public toggleShowToPlayers(): void {
    this.encounter.showToPlayers = !this.encounter.showToPlayers;
    this.notify();
  }

  public setShowToPlayers(value: boolean): void {
    this.encounter.showToPlayers = value;
    this.notify();
  }

  public clearEncounter(): void {
    this.encounter = {
      inCombat: false,
      round: 1,
      activeTurnIndex: 0,
      combatants: [],
      showToPlayers: true,
    };
    this.notify();
  }
}

export const initiativeEngine = new InitiativeEngine();
