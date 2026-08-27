import { SystemReferenceSearchItem } from './rustSystemSearchService';
import { MonsterTemplate } from '../types';

export interface Dnd5eApiIndexItem {
  index: string;
  name: string;
  url: string;
}

export interface Dnd5eApiCategoryList {
  count: number;
  results: Dnd5eApiIndexItem[];
}

const BASE_URL = 'https://www.dnd5eapi.co/api';

class Dnd5eApiService {
  private indexCache: Map<string, Dnd5eApiIndexItem[]> = new Map();
  private detailCache: Map<string, any> = new Map();
  private isPreloading: boolean = false;

  /**
   * Fetch category index list from dnd5eapi.co
   */
  public async getCategoryIndex(categoryEndpoint: string): Promise<Dnd5eApiIndexItem[]> {
    if (this.indexCache.has(categoryEndpoint)) {
      return this.indexCache.get(categoryEndpoint)!;
    }

    try {
      const res = await fetch(`${BASE_URL}/${categoryEndpoint}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: Dnd5eApiCategoryList = await res.json();
      const items = data.results || [];
      this.indexCache.set(categoryEndpoint, items);
      return items;
    } catch (err) {
      console.warn(`Failed to fetch dnd5eapi index for ${categoryEndpoint}:`, err);
      return [];
    }
  }

  /**
   * Fetch detail object for a specific resource
   */
  public async getItemDetail(urlOrPath: string): Promise<any> {
    const fullUrl = urlOrPath.startsWith('http')
      ? urlOrPath
      : urlOrPath.startsWith('/api')
      ? `https://www.dnd5eapi.co${urlOrPath}`
      : `${BASE_URL}/${urlOrPath}`;

    if (this.detailCache.has(fullUrl)) {
      return this.detailCache.get(fullUrl);
    }

    try {
      const res = await fetch(fullUrl);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      this.detailCache.set(fullUrl, data);
      return data;
    } catch (err) {
      console.warn(`Failed to fetch dnd5eapi item detail at ${fullUrl}:`, err);
      return null;
    }
  }

  /**
   * Search dnd5eapi across relevant endpoints based on category
   */
  public async searchApi(options: {
    query: string;
    category?: string;
    limit?: number;
  }): Promise<SystemReferenceSearchItem[]> {
    const q = (options.query || '').trim().toLowerCase();
    const limit = options.limit || 25;
    const cat = (options.category || 'all').toLowerCase();

    // Map compendium categories to dnd5eapi endpoints
    const endpointMap: Record<string, string[]> = {
      monsters: ['monsters'],
      spells: ['spells'],
      items: ['equipment', 'magic-items'],
      rules: ['rules', 'rule-sections', 'conditions'],
      races: ['races'],
      classes: ['classes'],
      feats: ['feats', 'features', 'traits'],
      all: [
        'monsters',
        'spells',
        'equipment',
        'magic-items',
        'rules',
        'rule-sections',
        'conditions',
        'races',
        'classes',
        'feats',
      ],
    };

    const endpoints = endpointMap[cat] || endpointMap['all'];

    // Collect index matches
    const matchedIndexItems: { endpoint: string; item: Dnd5eApiIndexItem }[] = [];

    await Promise.all(
      endpoints.map(async (ep) => {
        const indexList = await this.getCategoryIndex(ep);
        for (const item of indexList) {
          if (!q || item.name.toLowerCase().includes(q) || item.index.toLowerCase().includes(q)) {
            matchedIndexItems.push({ endpoint: ep, item });
          }
        }
      })
    );

    // Limit top matches to fetch full details
    const topMatches = matchedIndexItems.slice(0, limit);

    // Fetch details in parallel
    const detailedItems = await Promise.all(
      topMatches.map(async ({ endpoint, item }) => {
        const detail = await this.getItemDetail(item.url);
        if (!detail) return null;
        return this.formatToSearchItem(endpoint, detail);
      })
    );

    return detailedItems.filter((i): i is SystemReferenceSearchItem => i !== null);
  }

  /**
   * Fetch all monsters from dnd5eapi with summary stats for Bestiary search
   */
  public async searchMonsters(query: string = '', crFilter: string = 'all'): Promise<MonsterTemplate[]> {
    const monsterIndex = await this.getCategoryIndex('monsters');
    const q = query.trim().toLowerCase();

    const matches = monsterIndex.filter((item) => {
      if (!q) return true;
      return item.name.toLowerCase().includes(q) || item.index.toLowerCase().includes(q);
    });

    // Fetch details for top 30 matches
    const top = matches.slice(0, 30);
    const results: MonsterTemplate[] = [];

    await Promise.all(
      top.map(async (mIndex) => {
        const detail = await this.getItemDetail(mIndex.url);
        if (!detail) return;

        const monsterTemplate = this.formatDnd5eApiMonsterToTemplate(detail);
        if (crFilter !== 'all' && monsterTemplate.cr !== crFilter) {
          return;
        }
        results.push(monsterTemplate);
      })
    );

    return results;
  }

  /**
   * Convert dnd5eapi monster detail into MonsterTemplate (used by InitiativeTracker)
   */
  public formatDnd5eApiMonsterToTemplate(m: any): MonsterTemplate {
    let ac = 10;
    if (typeof m.armor_class === 'number') {
      ac = m.armor_class;
    } else if (Array.isArray(m.armor_class) && m.armor_class.length > 0) {
      ac = m.armor_class[0].value || m.armor_class[0] || 10;
    }

    const hp = typeof m.hit_points === 'number' ? m.hit_points : parseInt(m.hit_points, 10) || 10;
    const dex = m.dexterity || 10;
    const initBonus = Math.floor((dex - 10) / 2);

    let crStr = 'CR 1/4';
    if (m.challenge_rating !== undefined) {
      crStr = typeof m.challenge_rating === 'number' ? `CR ${m.challenge_rating}` : `CR ${m.challenge_rating}`;
    }

    const avatar = m.image
      ? `https://www.dnd5eapi.co${m.image}`
      : this.getMonsterEmojiAvatar(m.type || m.name);

    const typeStr = [m.size, m.type, m.alignment ? `(${m.alignment})` : ''].filter(Boolean).join(' ');

    return {
      id: `dnd5eapi-mon-${m.index}`,
      name: m.name,
      type: typeStr || 'Существо D&D 5e',
      maxHp: hp,
      ac: ac,
      initBonus: initBonus,
      cr: crStr,
      avatar,
      notes: `dnd5eapi.co • ${m.hit_dice ? `КБ: ${ac}, КЗ: ${m.hit_dice}` : `КБ: ${ac}`}${
        m.speed?.walk ? `, Скорость: ${m.speed.walk}` : ''
      }`,
    };
  }

  /**
   * Helper to format any dnd5eapi raw object into SystemReferenceSearchItem
   */
  public formatToSearchItem(endpoint: string, data: any): SystemReferenceSearchItem {
    if (endpoint === 'monsters') {
      return this.formatMonsterSearchItem(data);
    }
    if (endpoint === 'spells') {
      return this.formatSpellSearchItem(data);
    }
    if (endpoint === 'equipment' || endpoint === 'magic-items') {
      return this.formatItemSearchItem(endpoint, data);
    }
    return this.formatGenericRuleSearchItem(endpoint, data);
  }

  private formatMonsterSearchItem(m: any): SystemReferenceSearchItem {
    let acVal = 10;
    if (typeof m.armor_class === 'number') {
      acVal = m.armor_class;
    } else if (Array.isArray(m.armor_class) && m.armor_class.length > 0) {
      acVal = m.armor_class[0].value || m.armor_class[0] || 10;
    }

    const hpVal = typeof m.hit_points === 'number' ? m.hit_points : parseInt(m.hit_points, 10) || 10;

    const str = m.strength || 10;
    const dex = m.dexterity || 10;
    const con = m.constitution || 10;
    const int = m.intelligence || 10;
    const wis = m.wisdom || 10;
    const cha = m.charisma || 10;

    const crStr = m.challenge_rating !== undefined ? `CR ${m.challenge_rating}` : 'CR 1/4';
    const speedStr = m.speed ? (typeof m.speed === 'string' ? m.speed : Object.entries(m.speed).map(([k, v]) => `${k}: ${v}`).join(', ')) : '30 ft.';

    const actions = (m.actions || []).map((act: any) => ({
      name: act.name,
      type: 'action',
      description: act.desc || act.description || '',
    }));

    const traits = (m.special_abilities || []).map((ab: any) => ({
      name: ab.name,
      description: ab.desc || ab.description || '',
    }));

    const rawImg = m.image || m.imageUrl || m.image_url || m.img;
    const imgUrl = rawImg ? (rawImg.startsWith('http') ? rawImg : `https://www.dnd5eapi.co${rawImg}`) : undefined;

    return {
      id: `dnd5eapi-mon-${m.index}`,
      systemId: 'dnd5e',
      systemName: 'D&D 5e (dnd5eapi.co)',
      name: m.name,
      originalName: m.name,
      category: 'monsters',
      format: 'dnd5eapi',
      summary: `${m.size || ''} ${m.type || 'monster'} ${m.alignment ? `(${m.alignment})` : ''} • ${crStr}`,
      score: 1,
      matchType: 'dnd5eapi',
      tags: ['dnd5eapi', m.type, m.size, 'srd5.1'],
      relativePath: `/api/monsters/${m.index}`,
      img: imgUrl,
      tokenImg: imgUrl,
      stats: {
        hp: hpVal,
        ac: acVal,
        speed: speedStr,
        cr: typeof m.challenge_rating === 'number' ? m.challenge_rating.toString() : (m.challenge_rating || '1/4'),
        proficiencyBonus: m.proficiency_bonus,
        attributes: {
          str,
          dex,
          con,
          int,
          wis,
          cha,
        },
      },
      actions,
      traits,
      data: {
        ...m,
        img: imgUrl,
        image: imgUrl,
        tokenImg: imgUrl,
        hitPoints: hpVal,
        armorClass: acVal,
        type: `${m.size || ''} ${m.type || ''} ${m.subtype ? `(${m.subtype})` : ''}`,
        cr: crStr,
        senses: m.senses ? (typeof m.senses === 'string' ? m.senses : Object.entries(m.senses).map(([k, v]) => `${k}: ${v}`).join(', ')) : undefined,
        languages: m.languages,
        damageResistances: Array.isArray(m.damage_resistances) ? m.damage_resistances.join(', ') : m.damage_resistances,
        damageImmunities: Array.isArray(m.damage_immunities) ? m.damage_immunities.join(', ') : m.damage_immunities,
        conditionImmunities: Array.isArray(m.condition_immunities) ? m.condition_immunities.map((c: any) => c.name || c).join(', ') : '',
      },
    };
  }

  private formatSpellSearchItem(s: any): SystemReferenceSearchItem {
    const classesStr = Array.isArray(s.classes) ? s.classes.map((c: any) => c.name).join(', ') : '';
    const descText = Array.isArray(s.desc) ? s.desc.join('\n\n') : s.desc || '';
    const higherText = Array.isArray(s.higher_level) ? s.higher_level.join('\n\n') : s.higher_level || '';

    return {
      id: `dnd5eapi-spell-${s.index}`,
      systemId: 'dnd5e',
      systemName: 'D&D 5e (dnd5eapi.co)',
      name: s.name,
      originalName: s.name,
      category: 'spells',
      format: 'dnd5eapi',
      summary: `Круг ${s.level} ${s.school?.name || ''} • ${s.casting_time || ''}`,
      score: 1,
      matchType: 'dnd5eapi',
      tags: ['dnd5eapi', 'spell', s.school?.name, `level-${s.level}`],
      relativePath: `/api/spells/${s.index}`,
      data: {
        ...s,
        level: s.level,
        school: s.school?.name || 'Универсальное',
        castingTime: s.casting_time,
        range: s.range,
        components: Array.isArray(s.components) ? s.components.join(', ') : s.components,
        material: s.material,
        duration: s.duration,
        concentration: s.concentration,
        ritual: s.ritual,
        description: descText,
        higherLevel: higherText,
        classes: classesStr,
      },
    };
  }

  private formatItemSearchItem(endpoint: string, item: any): SystemReferenceSearchItem {
    const isMagic = endpoint === 'magic-items' || !!item.rarity;
    const descText = Array.isArray(item.desc) ? item.desc.join('\n\n') : item.desc || '';

    return {
      id: `dnd5eapi-item-${item.index}`,
      systemId: 'dnd5e',
      systemName: 'D&D 5e (dnd5eapi.co)',
      name: item.name,
      originalName: item.name,
      category: 'items',
      format: 'dnd5eapi',
      summary: isMagic
        ? `Магический предмет (${item.rarity?.name || 'Редкий'})`
        : `${item.equipment_category?.name || 'Снаряжение'}${item.cost ? ` • ${item.cost.quantity} ${item.cost.unit}` : ''}`,
      score: 1,
      matchType: 'dnd5eapi',
      tags: ['dnd5eapi', 'item', item.equipment_category?.name || 'equipment'],
      relativePath: `/api/${endpoint}/${item.index}`,
      data: {
        ...item,
        type: item.equipment_category?.name || (isMagic ? 'Magic Item' : 'Equipment'),
        cost: item.cost ? `${item.cost.quantity} ${item.cost.unit}` : undefined,
        weight: item.weight,
        description: descText,
        rarity: item.rarity?.name || (isMagic ? 'Магический' : 'Обычный'),
      },
    };
  }

  private formatGenericRuleSearchItem(endpoint: string, r: any): SystemReferenceSearchItem {
    let descText = '';
    if (Array.isArray(r.desc)) descText = r.desc.join('\n\n');
    else if (typeof r.desc === 'string') descText = r.desc;
    else if (r.subsections) descText = r.subsections.map((s: any) => `### ${s.name}\n${s.desc || ''}`).join('\n\n');

    const catName = endpoint === 'races' ? 'races' : endpoint === 'classes' ? 'classes' : 'rules';

    return {
      id: `dnd5eapi-${endpoint}-${r.index}`,
      systemId: 'dnd5e',
      systemName: 'D&D 5e (dnd5eapi.co)',
      name: r.name,
      originalName: r.name,
      category: catName,
      format: 'dnd5eapi',
      summary: `Правило SRD 5.1 • ${r.name}`,
      score: 1,
      matchType: 'dnd5eapi',
      tags: ['dnd5eapi', endpoint],
      relativePath: `/api/${endpoint}/${r.index}`,
      data: {
        ...r,
        description: descText || JSON.stringify(r, null, 2),
      },
    };
  }

  private getMonsterEmojiAvatar(typeOrName: string): string {
    const t = (typeOrName || '').toLowerCase();
    if (t.includes('dragon')) return '🐉';
    if (t.includes('undead') || t.includes('zombie') || t.includes('skeleton') || t.includes('lich')) return '💀';
    if (t.includes('fiend') || t.includes('demon') || t.includes('devil')) return '👿';
    if (t.includes('beast') || t.includes('wolf') || t.includes('bear')) return '🐺';
    if (t.includes('elemental')) return '🔥';
    if (t.includes('fey')) return '🧚';
    if (t.includes('giant')) return '🧌';
    if (t.includes('aberration') || t.includes('beholder') || t.includes('mind flayer')) return '👁️';
    if (t.includes('construct') || t.includes('golem')) return '🤖';
    if (t.includes('goblin') || t.includes('orc') || t.includes('kobold')) return '👺';
    return '👾';
  }
}

export const dnd5eApiService = new Dnd5eApiService();
