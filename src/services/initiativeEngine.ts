import {
  PlayerCharacter,
  MonsterTemplate,
  InitiativeCombatant,
  InitiativeEncounterState,
  InitiativeFormula,
  InitiativeSortDirection,
} from '../types';
import { fetchInitiativeState, updateInitiativeStateServer } from './apiClient';

type InitiativeListener = () => void;

const LOCAL_STORAGE_KEY = 'aethermap_initiative_data_v1';
const BROADCAST_CHANNEL_NAME = 'aethermap_initiative_sync_channel';

export const DEFAULT_PLAYER_DB: PlayerCharacter[] = [
  {
    id: 'player-warrior',
    name: 'Вальдар',
    classLevel: 'Воин / Штурмовик',
    playerOwner: 'Алексей',
    maxHp: 45,
    currentHp: 45,
    ac: 16,
    initBonus: 2,
    avatar: '🛡️',
    notes: 'Тяжёлая броня, защита союзников на передовой.',
    isPresent: true,
  },
  {
    id: 'player-scout',
    name: 'Элара',
    classLevel: 'Следопыт / Снайпер',
    playerOwner: 'Мария',
    maxHp: 32,
    currentHp: 32,
    ac: 14,
    initBonus: 4,
    avatar: '🏹',
    notes: 'Дальний бой, разведка, высокая реакция.',
    isPresent: true,
  },
  {
    id: 'player-specialist',
    name: 'Магнус',
    classLevel: 'Мистик / Техно-специалист',
    playerOwner: 'Дмитрий',
    maxHp: 26,
    currentHp: 26,
    ac: 12,
    initBonus: 2,
    avatar: '🔮',
    notes: 'Поддержка отряда, зоны поражения, взлом.',
    isPresent: true,
  },
  {
    id: 'player-infiltrator',
    name: 'Финн',
    classLevel: 'Оперативник / Плут',
    playerOwner: 'Антон',
    maxHp: 30,
    currentHp: 30,
    ac: 14,
    initBonus: 5,
    avatar: '🗡️',
    notes: 'Скрытное проникновение, быстрый удар, ловкость.',
    isPresent: true,
  },
  {
    id: 'player-heavy',
    name: 'Браор',
    classLevel: 'Громила / Тяжеловес',
    playerOwner: 'Сергей',
    maxHp: 55,
    currentHp: 55,
    ac: 15,
    initBonus: 1,
    avatar: '🪓',
    notes: 'Устойчивость к урону, разрушительная мощь.',
    isPresent: false,
  },
];

export const DEFAULT_MONSTER_DB: MonsterTemplate[] = [
  {
    id: 'monster-minion',
    name: 'Пехотинец / Бандит',
    type: 'Обычный противник',
    maxHp: 12,
    ac: 12,
    initBonus: 2,
    cr: 'Ранг 1',
    avatar: '👺',
    notes: 'Базовый стрелок или боец ближнего боя.',
  },
  {
    id: 'monster-trooper',
    name: 'Охранник / Силовик',
    type: 'Элитный боец',
    maxHp: 24,
    ac: 14,
    initBonus: 2,
    cr: 'Ранг 2',
    avatar: '👮',
    notes: 'Экипирован щитом или штурмовым оружием.',
  },
  {
    id: 'monster-drone',
    name: 'Боевой Дрон / Автоматон',
    type: 'Механизм',
    maxHp: 18,
    ac: 15,
    initBonus: 3,
    cr: 'Ранг 2',
    avatar: '🤖',
    notes: 'Иммунитет к яду, сенсоры ночного видения.',
  },
  {
    id: 'monster-undead',
    name: 'Зомби / Мутант',
    type: 'Заражённый / Нежить',
    maxHp: 28,
    ac: 10,
    initBonus: -1,
    cr: 'Ранг 1',
    avatar: '🧟',
    notes: 'Высокая живучесть, невосприимчивость к боли.',
  },
  {
    id: 'monster-beast',
    name: 'Хищный Зверь / Чужой',
    type: 'Опасный хищник',
    maxHp: 35,
    ac: 13,
    initBonus: 3,
    cr: 'Ранг 3',
    avatar: '🐺',
    notes: 'Быстрое перемещение, захват цели.',
  },
  {
    id: 'monster-officer',
    name: 'Командир / Офицер',
    type: 'Лидер отряда',
    maxHp: 55,
    ac: 16,
    initBonus: 3,
    cr: 'Ранг 4',
    avatar: '🎖️',
    notes: 'Командные ауры, усиление союзников.',
  },
  {
    id: 'monster-boss',
    name: 'Супер-Босс / Левиафан',
    type: 'Главная угроза',
    maxHp: 180,
    ac: 18,
    initBonus: 2,
    cr: 'Ранг 5 (Босс)',
    avatar: '🐉',
    notes: 'Множественные атаки, AoE урон, легендарные реакции.',
  },
];

export interface ConditionPreset {
  name: string;
  icon: string;
  color: string;
  category: 'status' | 'hazard' | 'buff';
}

export const POPULAR_CONDITIONS: string[] = [
  '🩸 Ранен',
  '💫 Оглушен',
  '💤 Без сознания',
  '🛑 Сбит с ног',
  '👁️ Ослеплен',
  '☠️ Отравлен',
  '🔥 Горит',
  '😱 Паника',
  '⛓️ Обездвижен',
  '👻 Скрыт',
  '🛡️ В укрытии',
  '⚡ Сбой / Шок',
  '🧠 Стресс',
];

export const INITIATIVE_FORMULAS: { id: InitiativeFormula; label: string; description: string }[] = [
  { id: 'd20', label: '1d20 + бонус', description: 'Классический стандарт (D20)' },
  { id: 'd10', label: '1d10 + бонус', description: 'Киберпанк / Interlock / WoD' },
  { id: '2d6', label: '2d6 + бонус', description: 'PbtA / Traveller / Cepheus' },
  { id: '3d6', label: '3d6 + бонус', description: 'GURPS / Hero System' },
  { id: 'd100', label: '1d100 + бонус', description: 'Call of Cthulhu / BRP / WH' },
  { id: 'd6', label: '1d6 + бонус', description: 'Savage Worlds / OSR' },
  { id: 'static', label: 'Фиксированное (Бонус/Ловкость)', description: 'Без броска костей' },
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
    formula: 'd20',
    sortDirection: 'desc',
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
    if (this.channel) {
      try {
        this.channel.postMessage({ type: 'REQUEST_INITIATIVE_STATE' });
      } catch (e) {
        // silent
      }
    }

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

  private applyRemoteState(data: {
    playerDb?: PlayerCharacter[];
    monsterDb?: MonsterTemplate[];
    encounter?: InitiativeEncounterState;
  }): void {
    let changed = false;

    if (data.playerDb && Array.isArray(data.playerDb)) {
      this.playerDatabase = data.playerDb;
      changed = true;
    }
    if (data.monsterDb && Array.isArray(data.monsterDb)) {
      this.monsterDatabase = data.monsterDb;
      changed = true;
    }
    if (data.encounter) {
      this.encounter = {
        ...data.encounter,
        formula: data.encounter.formula || 'd20',
        sortDirection: data.encounter.sortDirection || 'desc',
      };
      changed = true;
    }

    if (changed) {
      this.saveToStorageLocalOnly();
      this.notifyListenersOnly();
    }
  }

  private broadcastState(): void {
    if (this.channel) {
      try {
        this.channel.postMessage({
          type: 'INITIATIVE_STATE_SYNC',
          payload: {
            playerDb: this.playerDatabase,
            monsterDb: this.monsterDatabase,
            encounter: this.encounter,
          },
        });
      } catch (e) {
        // silent
      }
    }
  }

  private saveToStorageLocalOnly(): void {
    if (typeof window === 'undefined') return;
    try {
      const data = {
        playerDatabase: this.playerDatabase,
        monsterDatabase: this.monsterDatabase,
        encounter: this.encounter,
      };
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn('Failed to save initiative state to localStorage', e);
    }
  }

  private loadFromStorage(): void {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.playerDatabase && Array.isArray(parsed.playerDatabase)) {
          this.playerDatabase = parsed.playerDatabase;
        }
        if (parsed.monsterDatabase && Array.isArray(parsed.monsterDatabase)) {
          this.monsterDatabase = parsed.monsterDatabase;
        }
        if (parsed.encounter) {
          this.encounter = {
            ...parsed.encounter,
            formula: parsed.encounter.formula || 'd20',
            sortDirection: parsed.encounter.sortDirection || 'desc',
          };
        }
      }
    } catch (e) {
      console.warn('Failed to load initiative state from localStorage', e);
    }
  }

  private saveToStorage(): void {
    this.saveToStorageLocalOnly();
    this.broadcastState();

    // Debounced or direct backend server sync
    updateInitiativeStateServer({
      playerDb: this.playerDatabase,
      monsterDb: this.monsterDatabase,
      encounter: this.encounter,
    }).catch(() => {
      // offline silent
    });
  }

  private notify(): void {
    this.saveToStorage();
    this.notifyListenersOnly();
  }

  private notifyListenersOnly(): void {
    this.listeners.forEach((listener) => {
      try {
        listener();
      } catch (err) {
        console.error('Error in initiative listener', err);
      }
    });
  }

  public subscribe(listener: InitiativeListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public getState() {
    return {
      playerDatabase: this.playerDatabase,
      monsterDatabase: this.monsterDatabase,
      encounter: this.encounter,
    };
  }

  public getEncounter(): InitiativeEncounterState {
    return this.encounter;
  }

  // --- Configuration Methods ---
  public setFormula(formula: InitiativeFormula): void {
    this.encounter.formula = formula;
    this.notify();
  }

  public setSortDirection(sortDirection: InitiativeSortDirection): void {
    this.encounter.sortDirection = sortDirection;
    this.sortInitiative();
  }

  // --- Database Operations ---
  public addPlayerToDb(player: Omit<PlayerCharacter, 'id'>): PlayerCharacter {
    const newPlayer: PlayerCharacter = {
      ...player,
      id: `player-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    };
    this.playerDatabase = [...this.playerDatabase, newPlayer];
    this.notify();
    return newPlayer;
  }

  public updatePlayerInDb(id: string, updates: Partial<PlayerCharacter>): void {
    this.playerDatabase = this.playerDatabase.map((p) => (p.id === id ? { ...p, ...updates } : p));
    this.notify();
  }

  public removePlayerFromDb(id: string): void {
    this.playerDatabase = this.playerDatabase.filter((p) => p.id !== id);
    this.notify();
  }

  public addMonsterToDb(monster: Omit<MonsterTemplate, 'id'>): MonsterTemplate {
    const newMonster: MonsterTemplate = {
      ...monster,
      id: `monster-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    };
    this.monsterDatabase = [...this.monsterDatabase, newMonster];
    this.notify();
    return newMonster;
  }

  public updateMonsterInDb(id: string, updates: Partial<MonsterTemplate>): void {
    this.monsterDatabase = this.monsterDatabase.map((m) => (m.id === id ? { ...m, ...updates } : m));
    this.notify();
  }

  public removeMonsterFromDb(id: string): void {
    this.monsterDatabase = this.monsterDatabase.filter((m) => m.id !== id);
    this.notify();
  }

  // --- Encounter Operations ---
  public addPresentPlayersToEncounter(): void {
    const presentPlayers = this.playerDatabase.filter((p) => p.isPresent !== false);
    const existingEntityIds = new Set(this.encounter.combatants.map((c) => c.entityId));

    const newCombatants: InitiativeCombatant[] = presentPlayers
      .filter((p) => !existingEntityIds.has(p.id))
      .map((p) => ({
        id: `combatant-player-${p.id}`,
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
        notes: `${p.classLevel}${p.playerOwner ? ` (${p.playerOwner})` : ''}`,
        isHidden: false,
      }));

    if (newCombatants.length > 0) {
      this.encounter.combatants = [...this.encounter.combatants, ...newCombatants];
      this.notify();
    }
  }

  public addMonsterToEncounter(monsterId: string, count: number = 1): void {
    const template = this.monsterDatabase.find((m) => m.id === monsterId);
    if (!template) return;

    const newCombatants: InitiativeCombatant[] = [];
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

  // --- Dynamic Formula Dice Rolling ---
  private evaluateFormulaRoll(bonus: number): number {
    const formula = this.encounter.formula || 'd20';
    switch (formula) {
      case 'd20': {
        const roll = Math.floor(Math.random() * 20) + 1;
        return roll + bonus;
      }
      case 'd10': {
        const roll = Math.floor(Math.random() * 10) + 1;
        return roll + bonus;
      }
      case '2d6': {
        const r1 = Math.floor(Math.random() * 6) + 1;
        const r2 = Math.floor(Math.random() * 6) + 1;
        return r1 + r2 + bonus;
      }
      case '3d6': {
        const r1 = Math.floor(Math.random() * 6) + 1;
        const r2 = Math.floor(Math.random() * 6) + 1;
        const r3 = Math.floor(Math.random() * 6) + 1;
        return r1 + r2 + r3 + bonus;
      }
      case 'd100': {
        const roll = Math.floor(Math.random() * 100) + 1;
        return roll + bonus;
      }
      case 'd6': {
        const roll = Math.floor(Math.random() * 6) + 1;
        return roll + bonus;
      }
      case 'static':
      default:
        return bonus;
    }
  }

  public rollInitiativeOne(combatantId: string): void {
    this.encounter.combatants = this.encounter.combatants.map((c) => {
      if (c.id !== combatantId) return c;
      const result = this.evaluateFormulaRoll(c.initBonus);
      return { ...c, initiative: result };
    });
    this.sortInitiative();
  }

  public rollInitiativeAll(): void {
    this.encounter.combatants = this.encounter.combatants.map((c) => {
      const result = this.evaluateFormulaRoll(c.initBonus);
      return { ...c, initiative: result };
    });
    this.sortInitiative();
  }

  public sortInitiative(): void {
    const isAsc = this.encounter.sortDirection === 'asc';

    this.encounter.combatants.sort((a, b) => {
      if (b.initiative !== a.initiative) {
        return isAsc ? a.initiative - b.initiative : b.initiative - a.initiative;
      }
      // Tie breaker: bonus
      return isAsc ? a.initBonus - b.initBonus : b.initBonus - a.initBonus;
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
      formula: this.encounter.formula || 'd20',
      sortDirection: this.encounter.sortDirection || 'desc',
    };
    this.notify();
  }
}

export const initiativeEngine = new InitiativeEngine();
