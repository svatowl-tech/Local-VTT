import {
  CampaignState,
  CampaignTimeState,
  CampaignQuest,
  CampaignLocation,
  CampaignNpc,
  NpcRelationshipLink,
  CampaignFaction,
  CampaignSessionEntry,
  CampaignTimelineEvent,
  CampaignPartyCharacter,
  SharedInventoryItem,
  HouseRuleItem,
  CampaignWeatherType,
  MoonPhase,
  QuestStatus,
  ExplorationStatus,
  NpcAttitude,
  NpcStatus,
  CampaignSummary,
} from '../types/campaignTypes';
import { DEFAULT_CAMPAIGN_STATE } from '../data/defaultCampaignState';

export type CampaignListener = (state: CampaignState) => void;

class CampaignService {
  private state: CampaignState;
  private listeners: Set<CampaignListener> = new Set();
  private isLoaded: boolean = false;
  private saveTimeout: any = null;
  private isSaving: boolean = false;

  constructor() {
    this.state = JSON.parse(JSON.stringify(DEFAULT_CAMPAIGN_STATE));
    this.initFromDisk();
  }

  /**
   * Load active campaign directly from server disk on boot
   */
  private async initFromDisk(): Promise<void> {
    if (typeof window === 'undefined') return;
    
    let loadedFromServer = false;
    try {
      const res = await fetch('/api/campaigns/load?id=active_campaign');
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.campaign) {
          this.applyLoadedState(json.campaign);
          loadedFromServer = true;
        }
      }
    } catch (err) {
      // Ignore expected Express API missing errors in Tauri
    }

    if (!loadedFromServer) {
      try {
        const stored = localStorage.getItem('aethermap_active_campaign');
        if (stored) {
          const parsed = JSON.parse(stored);
          this.applyLoadedState(parsed);
          return;
        }
      } catch (err) {
        console.warn('Failed to load campaign from localStorage:', err);
      }
    }
    
    if (!loadedFromServer) {
      this.isLoaded = true;
      this.saveState();
    }
  }

  private applyLoadedState(campaignData: any) {
    this.state = {
      ...DEFAULT_CAMPAIGN_STATE,
      ...campaignData,
      time: { ...DEFAULT_CAMPAIGN_STATE.time, ...(campaignData.time || {}) },
      quests: campaignData.quests || DEFAULT_CAMPAIGN_STATE.quests,
      locations: campaignData.locations || DEFAULT_CAMPAIGN_STATE.locations,
      npcs: campaignData.npcs || DEFAULT_CAMPAIGN_STATE.npcs,
      relationships: campaignData.relationships || DEFAULT_CAMPAIGN_STATE.relationships,
      factions: campaignData.factions || DEFAULT_CAMPAIGN_STATE.factions,
      sessions: campaignData.sessions || DEFAULT_CAMPAIGN_STATE.sessions,
      timeline: campaignData.timeline || DEFAULT_CAMPAIGN_STATE.timeline,
      party: campaignData.party || DEFAULT_CAMPAIGN_STATE.party,
      treasury: { ...DEFAULT_CAMPAIGN_STATE.treasury, ...(campaignData.treasury || {}) },
      safety: { ...DEFAULT_CAMPAIGN_STATE.safety, ...(campaignData.safety || {}) },
    };
    this.isLoaded = true;
    this.notifyListeners();
  }

  /**
   * Debounced save directly to server disk under assets/data/Campaigns/ and localStorage
   */
  private saveState(): void {
    this.state.updatedAt = Date.now();
    this.notifyListeners();

    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem('aethermap_active_campaign', JSON.stringify(this.state));
      localStorage.setItem(`aethermap_campaign_${this.state.id}`, JSON.stringify(this.state));
      
      // Update the list fallback
      const listStr = localStorage.getItem('aethermap_campaign_list_fallback');
      let list = listStr ? JSON.parse(listStr) : [];
      const idx = list.findIndex((c: any) => c.id === this.state.id);
      if (idx >= 0) {
        list[idx].updatedAt = this.state.updatedAt;
        list[idx].name = this.state.name;
      } else {
        list.push({ id: this.state.id, name: this.state.name, system: this.state.system, worldName: this.state.worldName, updatedAt: this.state.updatedAt });
      }
      localStorage.setItem('aethermap_campaign_list_fallback', JSON.stringify(list));
    } catch (e) {
      console.warn('Failed to save campaign to localStorage:', e);
    }

    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }

    this.saveTimeout = setTimeout(async () => {
      try {
        this.isSaving = true;
        await fetch('/api/campaigns/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ campaign: this.state }),
        });
      } catch (e) {
        // Ignore expected errors in Tauri
      } finally {
        this.isSaving = false;
      }
    }, 300);
  }

  public subscribe(listener: CampaignListener): () => void {
    this.listeners.add(listener);
    // Initial call
    listener(this.getState());
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    const cloned = this.getState();
    this.listeners.forEach((fn) => {
      try {
        fn(cloned);
      } catch (err) {
        console.error('Error in campaign listener:', err);
      }
    });
  }

  public getState(): CampaignState {
    return JSON.parse(JSON.stringify(this.state));
  }

  // ==========================================
  // DISK CAMPAIGN MANAGEMENT (Switch, New, Delete, List)
  // ==========================================

  public async fetchCampaignsList(): Promise<CampaignSummary[]> {
    try {
      const res = await fetch('/api/campaigns/list');
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.campaigns)) {
          return json.campaigns;
        }
      }
    } catch (e) {
      // expected in Tauri
    }

    try {
      const stored = localStorage.getItem('aethermap_campaign_list_fallback');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.warn('Failed to load campaigns list from localStorage:', e);
    }
    return [];
  }

  public async loadCampaignFromDisk(campaignIdOrFileName: string): Promise<boolean> {
    try {
      const res = await fetch(`/api/campaigns/load?id=${encodeURIComponent(campaignIdOrFileName)}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.campaign) {
          this.applyLoadedState(json.campaign);
          this.saveState(); // Sets as active_campaign on disk
          return true;
        }
      }
    } catch (e) {
      // expected in Tauri
    }

    try {
      const stored = localStorage.getItem(`aethermap_campaign_${campaignIdOrFileName}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        this.applyLoadedState(parsed);
        this.saveState();
        return true;
      }
    } catch (e) {
      console.warn('Failed to load campaign from localStorage:', e);
    }
    return false;
  }

  public async createNewCampaign(newCampaign: Partial<CampaignState>): Promise<boolean> {
    const now = Date.now();
    const cleanId = `campaign-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const fullCampaign: CampaignState = {
      ...DEFAULT_CAMPAIGN_STATE,
      ...newCampaign,
      id: newCampaign.id || cleanId,
      name: newCampaign.name || 'Новая кампания',
      system: newCampaign.system || 'D&D 5e',
      worldName: newCampaign.worldName || 'Свой мир',
      createdAt: now,
      updatedAt: now,
      time: { ...DEFAULT_CAMPAIGN_STATE.time, ...(newCampaign.time || {}) },
      quests: newCampaign.quests || [],
      locations: newCampaign.locations || [],
      npcs: newCampaign.npcs || [],
      relationships: newCampaign.relationships || [],
      factions: newCampaign.factions || [],
      sessions: newCampaign.sessions || [],
      timeline: newCampaign.timeline || [],
      party: newCampaign.party || [],
      treasury: { ...DEFAULT_CAMPAIGN_STATE.treasury, ...(newCampaign.treasury || {}) },
      safety: { ...DEFAULT_CAMPAIGN_STATE.safety, ...(newCampaign.safety || {}) },
    };

    this.state = fullCampaign;
    
    // Add to list fallback
    try {
      const listStr = localStorage.getItem('aethermap_campaign_list_fallback');
      const list = listStr ? JSON.parse(listStr) : [];
      list.push({ id: fullCampaign.id, name: fullCampaign.name, system: fullCampaign.system, worldName: fullCampaign.worldName, updatedAt: fullCampaign.updatedAt });
      localStorage.setItem('aethermap_campaign_list_fallback', JSON.stringify(list));
      localStorage.setItem(`aethermap_campaign_${fullCampaign.id}`, JSON.stringify(fullCampaign));
    } catch (e) {
      console.warn('Failed to save new campaign to localStorage:', e);
    }

    this.saveState();
    return true;
  }

  public async deleteCampaignFromDisk(id: string): Promise<boolean> {
    let deleted = false;
    try {
      const res = await fetch('/api/campaigns/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success) deleted = true;
      }
    } catch (e) {
      // expected in Tauri
    }

    try {
      localStorage.removeItem(`aethermap_campaign_${id}`);
      const listStr = localStorage.getItem('aethermap_campaign_list_fallback');
      if (listStr) {
        let list = JSON.parse(listStr);
        list = list.filter((c: any) => c.id !== id);
        localStorage.setItem('aethermap_campaign_list_fallback', JSON.stringify(list));
      }
      deleted = true;
    } catch (e) {
      console.warn('Failed to delete campaign from localStorage:', e);
    }
    
    return deleted;
  }

  public async generateCampaignAi(specs: {
    title?: string;
    system?: string;
    setting?: string;
    tone?: string;
    partyLevel?: string;
    villainHook?: string;
    customWishes?: string;
  }): Promise<{ success: boolean; campaign?: CampaignState; error?: string }> {
    try {
      const res = await fetch('/api/campaigns/generate-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(specs),
      });
      const data = await res.json();
      if (data.success && data.campaign) {
        this.state = data.campaign;
        this.notifyListeners();
        return { success: true, campaign: data.campaign };
      }
      return { success: false, error: data.error || 'Failed to generate campaign' };
    } catch (e: any) {
      return { success: false, error: e.message || 'Network error' };
    }
  }

  // ==========================================
  // LOREWIKI & COMPENDIUM CORRELATION INTEGRATION
  // ==========================================

  public importLoreNpc(loreItem: any, worldName?: string): CampaignNpc {
    const attitudeMap: Record<string, NpcAttitude> = {
      allied: 'friendly',
      neutral: 'neutral',
      hostile: 'hostile',
      friendly: 'friendly',
    };

    const newNpc: CampaignNpc = {
      id: `npc-lore-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      name: loreItem.name || 'Безымянный персонаж',
      title: loreItem.summary || loreItem.tags?.join(', ') || 'Обитатель мира',
      race: loreItem.metadata?.race || 'Человек',
      gender: loreItem.metadata?.gender || 'Неизвестно',
      age: loreItem.metadata?.age || '',
      alignment: loreItem.metadata?.alignment || 'Нейтральный',
      attitudeToParty: attitudeMap[loreItem.metadata?.attitude] || 'neutral',
      status: 'alive',
      factionId: loreItem.metadata?.factionId,
      factionName: loreItem.metadata?.factionName || (loreItem.category === 'Фракции' ? loreItem.name : undefined),
      currentLocationId: loreItem.metadata?.locationId,
      currentLocationName: loreItem.metadata?.locationName,
      personalityTraits: loreItem.metadata?.personality || loreItem.summary || 'Загадочная личность',
      appearance: loreItem.metadata?.appearance || loreItem.content || '',
      voiceAndMannerisms: loreItem.metadata?.voice || '',
      goalsAndMotivations: loreItem.metadata?.goals || loreItem.metadata?.secrets || '',
      secretsKnown: loreItem.metadata?.secrets ? [loreItem.metadata.secrets] : [],
      statBlockRef: loreItem.metadata?.statBlockRef,
      avatarUrl: loreItem.imageUrl || loreItem.iconUrl || '',
      tags: loreItem.tags || ['LoreWiki', worldName || 'Лор'].filter(Boolean),
      notes: loreItem.content || '',
    };

    this.state.npcs.unshift(newNpc);
    this.saveState();
    return newNpc;
  }

  public importLoreLocation(loreItem: any, worldName?: string): CampaignLocation {
    const newLoc: CampaignLocation = {
      id: `loc-lore-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      name: loreItem.name || 'Новая локация',
      type: (loreItem.metadata?.type as any) || 'settlement' || 'city',
      parentLocationId: undefined,
      description: loreItem.summary || loreItem.content || '',
      sensoryDetails: {
        sight: loreItem.metadata?.sight || '',
        sound: loreItem.metadata?.sound || '',
        smell: loreItem.metadata?.smell || '',
      },
      explorationStatus: 'explored',
      threatLevel: loreItem.metadata?.threatLevel || 'low',
      pointsOfInterest: Array.isArray(loreItem.metadata?.pois)
        ? loreItem.metadata.pois
        : [
            {
              id: `poi-1`,
              name: 'Главная площадь',
              description: 'Центр локации и ключевая точка встречи',
              threat: 'none',
            },
          ],
      knownSecrets: loreItem.metadata?.secrets ? [loreItem.metadata.secrets] : [],
      connectedLocationIds: [],
      imageUrl: loreItem.imageUrl || loreItem.iconUrl || '',
      tags: loreItem.tags || ['LoreWiki', worldName || 'Лор'].filter(Boolean),
    };

    this.state.locations.unshift(newLoc);
    this.saveState();
    return newLoc;
  }

  public importLoreQuest(loreItem: any, worldName?: string): CampaignQuest {
    const newQuest: CampaignQuest = {
      id: `quest-lore-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      title: loreItem.name || 'Новое задание',
      description: loreItem.content || loreItem.summary || '',
      category: 'side',
      status: 'active',
      giverNpcName: loreItem.metadata?.giver || 'Таинственный заказчик',
      locationName: loreItem.metadata?.location || 'Окрестности',
      objectives: [
        {
          id: 'obj-1',
          text: loreItem.summary || 'Выполнить первостепенную задачу',
          completed: false,
        },
      ],
      rewards: {
        gold: loreItem.metadata?.rewardGold || 100,
        xp: loreItem.metadata?.rewardXp || 250,
        items: loreItem.metadata?.rewardItems || [],
      },
      secretsAndClues: loreItem.metadata?.secrets ? [loreItem.metadata.secrets] : [],
      createdAtInGame: `${this.state.time.day}.${this.state.time.month}.${this.state.time.year}`,
      updatedAtInGame: `${this.state.time.day}.${this.state.time.month}.${this.state.time.year}`,
      tags: loreItem.tags || ['LoreWiki', worldName || 'Лор'].filter(Boolean),
    };

    this.state.quests.unshift(newQuest);
    this.saveState();
    return newQuest;
  }

  public importCompendiumMonsterAsNpc(monster: any): CampaignNpc {
    const newNpc: CampaignNpc = {
      id: `npc-comp-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      name: monster.name || 'Существо из бестиария',
      title: `${monster.type || 'Монстр'} (CR ${monster.challenge_rating || monster.cr || '1'})`,
      race: monster.type || 'Чудовище',
      gender: 'Бесполый',
      age: '',
      alignment: monster.alignment || 'Хаотично-злой',
      attitudeToParty: 'hostile',
      status: 'alive',
      personalityTraits: monster.special_abilities?.[0]?.desc || 'Опасное чудовище, готовое атаковать',
      appearance: `AC: ${monster.armor_class || 10}, HP: ${monster.hit_points || 20}, Скорость: ${monster.speed || '30 фт.'}`,
      voiceAndMannerisms: '',
      goalsAndMotivations: 'Защита территории и поиск добычи',
      secretsKnown: [],
      statBlockRef: monster.name,
      avatarUrl: monster.imageUrl || '',
      tags: ['Бестиарий', monster.type || 'Монстр'].filter(Boolean),
      notes: monster.actions ? JSON.stringify(monster.actions, null, 2) : '',
    };

    this.state.npcs.unshift(newNpc);
    this.saveState();
    return newNpc;
  }

  public resetToDefault(): void {
    this.state = JSON.parse(JSON.stringify(DEFAULT_CAMPAIGN_STATE));
    this.saveState();
  }

  public importState(newState: Partial<CampaignState>): void {
    this.state = {
      ...this.state,
      ...newState,
      updatedAt: Date.now(),
    };
    this.saveState();
  }

  // ==========================================
  // 1. TIME & CALENDAR ENGINE
  // ==========================================

  public advanceTime(minutesToAdd: number): void {
    const time = { ...this.state.time };
    let totalMinutes = time.hour * 60 + time.minute + minutesToAdd;
    let daysToAdd = Math.floor(totalMinutes / (24 * 60));
    
    let remainingMinutesInDay = ((totalMinutes % (24 * 60)) + (24 * 60)) % (24 * 60);
    time.hour = Math.floor(remainingMinutesInDay / 60);
    time.minute = remainingMinutesInDay % 60;

    if (daysToAdd !== 0) {
      this.advanceDaysInternal(time, daysToAdd);
    }

    this.state.time = time;
    this.saveState();
  }

  public advanceHours(hoursToAdd: number): void {
    this.advanceTime(hoursToAdd * 60);
  }

  public shortRest(): void {
    this.advanceTime(60); // 1 hour short rest
  }

  public longRest(): void {
    this.advanceTime(8 * 60); // 8 hours long rest
  }

  private advanceDaysInternal(time: CampaignTimeState, days: number): void {
    let currentDay = time.day + days;
    const daysInMonth = 30; // Standard fantasy month

    while (currentDay > daysInMonth) {
      currentDay -= daysInMonth;
      time.month += 1;
      if (time.month > 12) {
        time.month = 1;
        time.year += 1;
      }
    }

    while (currentDay < 1) {
      time.month -= 1;
      if (time.month < 1) {
        time.month = 12;
        time.year -= 1;
      }
      currentDay += daysInMonth;
    }

    time.day = currentDay;

    // Cycle moon phase slightly
    const moonPhases: MoonPhase[] = [
      'new_moon',
      'waxing_crescent',
      'first_quarter',
      'waxing_gibbous',
      'full_moon',
      'waning_gibbous',
      'last_quarter',
      'waning_crescent',
    ];
    const currentIndex = moonPhases.indexOf(time.moonPhase);
    if (days > 0) {
      const nextIndex = (currentIndex + Math.floor(days / 3.5)) % moonPhases.length;
      time.moonPhase = moonPhases[nextIndex];
    }
  }

  public setTime(hour: number, minute: number): void {
    this.state.time.hour = Math.max(0, Math.min(23, hour));
    this.state.time.minute = Math.max(0, Math.min(59, minute));
    this.saveState();
  }

  public setDate(year: number, month: number, day: number): void {
    this.state.time.year = year;
    this.state.time.month = Math.max(1, Math.min(12, month));
    this.state.time.day = Math.max(1, Math.min(30, day));
    this.saveState();
  }

  public setWeather(weather: CampaignWeatherType, customDesc?: string): void {
    this.state.time.weather = weather;
    if (customDesc) {
      this.state.time.temperatureDesc = customDesc;
    } else {
      const defaultWeatherDescs: Record<CampaignWeatherType, string> = {
        clear: '+21°C, безоблачное небо и мягкий свет',
        cloudy: '+17°C, тяжелые свинцовые тучи',
        fog: '+14°C, густая пелена тумана, видимость 30 футов',
        rain: '+15°C, затяжной моросящий дождь',
        thunder: '+12°C, шквальный ливень с раскатами грома и молниями',
        snow: '-4°C, мягкий снегопад, хруст под ногами',
        heat: '+36°C, палящий сухой зной, марево над землей',
        wind: '+16°C, порывистый ветер до 20 м/с',
        magic_storm: 'Магическая буря, всполохи сиреневых молний и искажение эфира',
      };
      this.state.time.temperatureDesc = defaultWeatherDescs[weather] || '+20°C';
    }
    this.saveState();
  }

  public setMoonPhase(phase: MoonPhase): void {
    this.state.time.moonPhase = phase;
    this.saveState();
  }

  // ==========================================
  // 2. QUESTS & STORY ARCS
  // ==========================================

  public addQuest(quest: Omit<CampaignQuest, 'id' | 'createdAtInGame' | 'updatedAtInGame'>): CampaignQuest {
    const newQuest: CampaignQuest = {
      ...quest,
      id: `quest-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      createdAtInGame: `${this.state.time.day}.${this.state.time.month}.${this.state.time.year}`,
      updatedAtInGame: `${this.state.time.day}.${this.state.time.month}.${this.state.time.year}`,
    };
    this.state.quests.unshift(newQuest);
    this.saveState();
    return newQuest;
  }

  public updateQuest(id: string, partial: Partial<CampaignQuest>): void {
    this.state.quests = this.state.quests.map((q) => {
      if (q.id === id) {
        return {
          ...q,
          ...partial,
          updatedAtInGame: `${this.state.time.day}.${this.state.time.month}.${this.state.time.year}`,
        };
      }
      return q;
    });
    this.saveState();
  }

  public setQuestStatus(id: string, status: QuestStatus): void {
    this.updateQuest(id, { status });
  }

  public toggleQuestObjective(questId: string, objectiveId: string): void {
    this.state.quests = this.state.quests.map((q) => {
      if (q.id === questId) {
        return {
          ...q,
          objectives: q.objectives.map((obj) =>
            obj.id === objectiveId ? { ...obj, completed: !obj.completed } : obj
          ),
          updatedAtInGame: `${this.state.time.day}.${this.state.time.month}.${this.state.time.year}`,
        };
      }
      return q;
    });
    this.saveState();
  }

  public deleteQuest(id: string): void {
    this.state.quests = this.state.quests.filter((q) => q.id !== id);
    this.saveState();
  }

  // ==========================================
  // 3. LOCATIONS & VISITED ATLAS
  // ==========================================

  public addLocation(loc: Omit<CampaignLocation, 'id'>): CampaignLocation {
    const newLoc: CampaignLocation = {
      ...loc,
      id: `loc-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    };
    this.state.locations.unshift(newLoc);
    this.saveState();
    return newLoc;
  }

  public updateLocation(id: string, partial: Partial<CampaignLocation>): void {
    this.state.locations = this.state.locations.map((loc) =>
      loc.id === id ? { ...loc, ...partial } : loc
    );
    this.saveState();
  }

  public setLocationStatus(id: string, status: ExplorationStatus): void {
    this.updateLocation(id, { explorationStatus: status });
  }

  public deleteLocation(id: string): void {
    this.state.locations = this.state.locations.filter((l) => l.id !== id);
    // Clean up connections
    this.state.locations = this.state.locations.map((l) => ({
      ...l,
      connectedLocationIds: l.connectedLocationIds.filter((cid) => cid !== id),
    }));
    this.saveState();
  }

  // ==========================================
  // 4. NPC & RELATIONSHIP WEB
  // ==========================================

  public addNpc(npc: Omit<CampaignNpc, 'id'>): CampaignNpc {
    const newNpc: CampaignNpc = {
      ...npc,
      id: `npc-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    };
    this.state.npcs.unshift(newNpc);
    this.saveState();
    return newNpc;
  }

  public updateNpc(id: string, partial: Partial<CampaignNpc>): void {
    this.state.npcs = this.state.npcs.map((npc) =>
      npc.id === id ? { ...npc, ...partial } : npc
    );
    this.saveState();
  }

  public setNpcAttitude(id: string, attitudeToParty: NpcAttitude): void {
    this.updateNpc(id, { attitudeToParty });
  }

  public setNpcStatus(id: string, status: NpcStatus): void {
    this.updateNpc(id, { status });
  }

  public deleteNpc(id: string): void {
    this.state.npcs = this.state.npcs.filter((npc) => npc.id !== id);
    // Also remove relationships with this NPC
    this.state.relationships = this.state.relationships.filter(
      (rel) => rel.sourceNpcId !== id && rel.targetNpcId !== id
    );
    this.saveState();
  }

  public addRelationship(rel: Omit<NpcRelationshipLink, 'id'>): NpcRelationshipLink {
    const newRel: NpcRelationshipLink = {
      ...rel,
      id: `rel-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    };
    this.state.relationships.push(newRel);
    this.saveState();
    return newRel;
  }

  public deleteRelationship(id: string): void {
    this.state.relationships = this.state.relationships.filter((rel) => rel.id !== id);
    this.saveState();
  }

  public addFaction(faction: Omit<CampaignFaction, 'id'>): CampaignFaction {
    const newFaction: CampaignFaction = {
      ...faction,
      id: `fac-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    };
    this.state.factions.push(newFaction);
    this.saveState();
    return newFaction;
  }

  public updateFaction(id: string, partial: Partial<CampaignFaction>): void {
    this.state.factions = this.state.factions.map((f) =>
      f.id === id ? { ...f, ...partial } : f
    );
    this.saveState();
  }

  public deleteFaction(id: string): void {
    this.state.factions = this.state.factions.filter((f) => f.id !== id);
    this.saveState();
  }

  // ==========================================
  // 5. SESSION LOGS & TIMELINE
  // ==========================================

  public addSession(entry: Omit<CampaignSessionEntry, 'id'>): CampaignSessionEntry {
    const newSession: CampaignSessionEntry = {
      ...entry,
      id: `session-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    };
    this.state.sessions.unshift(newSession);
    this.saveState();
    return newSession;
  }

  public updateSession(id: string, partial: Partial<CampaignSessionEntry>): void {
    this.state.sessions = this.state.sessions.map((s) =>
      s.id === id ? { ...s, ...partial } : s
    );
    this.saveState();
  }

  public deleteSession(id: string): void {
    this.state.sessions = this.state.sessions.filter((s) => s.id !== id);
    this.saveState();
  }

  public addTimelineEvent(ev: Omit<CampaignTimelineEvent, 'id'>): CampaignTimelineEvent {
    const newEvent: CampaignTimelineEvent = {
      ...ev,
      id: `time-ev-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    };
    this.state.timeline.push(newEvent);
    this.state.timeline.sort((a, b) => ((b.inGameDate || b.dateStr || '').localeCompare(a.inGameDate || a.dateStr || '')));
    this.saveState();
    return newEvent;
  }

  public deleteTimelineEvent(id: string): void {
    this.state.timeline = this.state.timeline.filter((ev) => ev.id !== id);
    this.saveState();
  }

  // ==========================================
  // 6. PARTY CHARACTERS & TREASURY
  // ==========================================

  public addPartyCharacter(char: Omit<CampaignPartyCharacter, 'id'>): CampaignPartyCharacter {
    const newChar: CampaignPartyCharacter = {
      ...char,
      id: `char-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    };
    this.state.party.push(newChar);
    this.saveState();
    return newChar;
  }

  public updatePartyCharacter(id: string, partial: Partial<CampaignPartyCharacter>): void {
    this.state.party = this.state.party.map((c) =>
      c.id === id ? { ...c, ...partial } : c
    );
    this.saveState();
  }

  public deletePartyCharacter(id: string): void {
    this.state.party = this.state.party.filter((c) => c.id !== id);
    this.saveState();
  }

  public toggleInspiration(characterId: string): void {
    const char = this.state.party.find((c) => c.id === characterId);
    if (char) {
      char.hasInspiration = !char.hasInspiration;
      char.inspiration = char.hasInspiration;
      this.saveState();
    }
  }

  public adjustHp(characterId: string, delta: number): void {
    const char = this.state.party.find((c) => c.id === characterId);
    if (char) {
      char.currentHp = Math.max(0, Math.min(char.maxHp, char.currentHp + delta));
      this.saveState();
    }
  }

  public addCoins(
    currencyOrGp: 'copper' | 'silver' | 'electrum' | 'gold' | 'platinum' | number,
    amountOrSp: number = 0,
    reasonOrCp: string | number = '',
    pp: number = 0,
    ep: number = 0,
    reasonStr: string = ''
  ): void {
    if (typeof currencyOrGp === 'number') {
      const gp = currencyOrGp;
      const sp = amountOrSp || 0;
      const cp = typeof reasonOrCp === 'number' ? reasonOrCp : 0;
      const reason = typeof reasonOrCp === 'string' ? reasonOrCp : reasonStr || 'Пополнение казны';
      if (gp) this.modifyCoins('gold', gp, reason);
      if (sp) this.modifyCoins('silver', sp, reason);
      if (cp) this.modifyCoins('copper', cp, reason);
      if (pp) this.modifyCoins('platinum', pp, reason);
      if (ep) this.modifyCoins('electrum', ep, reason);
    } else {
      this.modifyCoins(currencyOrGp, amountOrSp, typeof reasonOrCp === 'string' ? reasonOrCp : '');
    }
  }

  public splitTreasuryEvenly(memberCount: number): { perMemberGp: number; remainingGp: number } {
    if (memberCount <= 0) return { perMemberGp: 0, remainingGp: this.state.treasury.gold };
    const totalGp = this.state.treasury.gold;
    const perMemberGp = Math.floor(totalGp / memberCount);
    const remainingGp = totalGp % memberCount;
    this.state.treasury.gold = remainingGp;
    this.state.treasury.transactions.unshift({
      id: `tx-${Date.now()}`,
      timestamp: Date.now(),
      type: 'split_even',
      amountStr: `-${perMemberGp * memberCount} GP (${perMemberGp} GP x ${memberCount})`,
      reason: `Равный раздел золота между ${memberCount} героями`,
    });
    this.saveState();
    return { perMemberGp, remainingGp };
  }

  public modifyCoins(
    currency: 'copper' | 'silver' | 'electrum' | 'gold' | 'platinum',
    delta: number,
    reason: string = ''
  ): void {
    const current = this.state.treasury[currency] || 0;
    const updated = Math.max(0, current + delta);
    this.state.treasury[currency] = updated;

    if (reason || delta !== 0) {
      this.state.treasury.transactions.unshift({
        id: `tx-${Date.now()}`,
        timestamp: Date.now(),
        type: delta >= 0 ? 'deposit' : 'withdraw',
        amountStr: `${delta >= 0 ? '+' : ''}${delta} ${currency.toUpperCase()}`,
        reason: reason || (delta >= 0 ? 'Пополнение казны' : 'Трата из казны'),
      });
    }

    this.saveState();
  }

  public addSharedItem(item: Omit<SharedInventoryItem, 'id'>): SharedInventoryItem {
    const newItem: SharedInventoryItem = {
      ...item,
      id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    };
    this.state.treasury.sharedBag.push(newItem);
    this.saveState();
    return newItem;
  }

  public updateSharedItem(id: string, partial: Partial<SharedInventoryItem>): void {
    this.state.treasury.sharedBag = this.state.treasury.sharedBag.map((item) =>
      item.id === id ? { ...item, ...partial } : item
    );
    this.saveState();
  }

  public deleteSharedItem(id: string): void {
    this.state.treasury.sharedBag = this.state.treasury.sharedBag.filter((item) => item.id !== id);
    this.saveState();
  }

  // ==========================================
  // 7. SAFETY TOOLS & HOUSE RULES
  // ==========================================

  public triggerXCard(reason?: string): void {
    this.state.safety.xCardTriggered = true;
    this.state.safety.xCardTimestamp = Date.now();
    this.saveState();
  }

  public clearXCard(): void {
    this.state.safety.xCardTriggered = false;
    this.state.safety.xCardTimestamp = undefined;
    this.saveState();
  }

  public resetXCard(): void {
    this.clearXCard();
  }

  public addHouseRule(rule: Omit<HouseRuleItem, 'id'>): HouseRuleItem {
    const newRule: HouseRuleItem = {
      ...rule,
      id: `hr-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    };
    this.state.safety.houseRules.push(newRule);
    this.saveState();
    return newRule;
  }

  public addHomebrewRule(rule: Omit<HouseRuleItem, 'id'>): HouseRuleItem {
    return this.addHouseRule(rule);
  }

  public toggleHouseRule(id: string): void {
    this.state.safety.houseRules = this.state.safety.houseRules.map((hr) =>
      hr.id === id ? { ...hr, isActive: !hr.isActive } : hr
    );
    this.saveState();
  }

  public deleteHouseRule(id: string): void {
    this.state.safety.houseRules = this.state.safety.houseRules.filter((hr) => hr.id !== id);
    this.saveState();
  }

  public deleteHomebrewRule(id: string): void {
    this.deleteHouseRule(id);
  }

  public addLine(topic: string): void {
    if (!topic.trim()) return;
    this.state.safety.lines.push(topic.trim());
    this.saveState();
  }

  public addLineTheme(topic: string): void {
    this.addLine(topic);
  }

  public removeLine(index: number): void {
    this.state.safety.lines.splice(index, 1);
    this.saveState();
  }

  public removeLineTheme(index: number): void {
    this.removeLine(index);
  }

  public addVeil(topic: string): void {
    if (!topic.trim()) return;
    this.state.safety.veils.push(topic.trim());
    this.saveState();
  }

  public addVeilTheme(topic: string): void {
    this.addVeil(topic);
  }

  public removeVeil(index: number): void {
    this.state.safety.veils.splice(index, 1);
    this.saveState();
  }

  public removeVeilTheme(index: number): void {
    this.removeVeil(index);
  }

  public startBreakTimer(minutes: number): void {
    this.state.safety.breakTimerMinutes = minutes;
    this.state.safety.breakTimerActive = true;
    this.state.safety.breakTimerEndsAt = Date.now() + minutes * 60 * 1000;
    this.saveState();
  }

  public stopBreakTimer(): void {
    this.state.safety.breakTimerActive = false;
    this.state.safety.breakTimerEndsAt = null;
    this.saveState();
  }
}

export const campaignService = new CampaignService();
