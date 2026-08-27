import fs from 'fs';
import path from 'path';
import { CampaignData } from '../src/types/campaignTypes';
import { GoogleGenAI } from '@google/genai';

export interface CampaignSummary {
  id: string;
  name: string;
  system: string;
  worldName: string;
  dungeonMasterName?: string;
  questsCount: number;
  locationsCount: number;
  npcsCount: number;
  partyCount: number;
  sessionsCount: number;
  updatedAt: number;
  createdAt: number;
  fileName: string;
  fileSizeBytes: number;
}

export class CampaignDirectoryEngine {
  private getCampaignsDir(): string {
    const dir = path.join(process.cwd(), 'assets', 'data', 'Campaigns');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    return dir;
  }

  public sanitizeFilename(nameOrId: string): string {
    return nameOrId
      .toLowerCase()
      .replace(/[^a-z0-9_а-яё\-]/gi, '_')
      .replace(/_+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 50) || 'campaign';
  }

  /**
   * List all campaign files stored on the server disk
   */
  public listCampaigns(): CampaignSummary[] {
    const dir = this.getCampaignsDir();
    const files = fs.readdirSync(dir);
    const result: CampaignSummary[] = [];

    for (const file of files) {
      if (!file.endsWith('.json')) continue;
      const fullPath = path.join(dir, file);
      try {
        const stat = fs.statSync(fullPath);
        const raw = fs.readFileSync(fullPath, 'utf-8');
        const data = JSON.parse(raw) as Partial<CampaignData>;

        result.push({
          id: data.id || file.replace(/\.json$/, ''),
          name: data.name || 'Безымянная кампания',
          system: data.system || 'D&D 5e',
          worldName: data.worldName || 'Faerûn',
          dungeonMasterName: data.dungeonMasterName || 'DM',
          questsCount: Array.isArray(data.quests) ? data.quests.length : 0,
          locationsCount: Array.isArray(data.locations) ? data.locations.length : 0,
          npcsCount: Array.isArray(data.npcs) ? data.npcs.length : 0,
          partyCount: Array.isArray(data.party) ? data.party.length : 0,
          sessionsCount: Array.isArray(data.sessions) ? data.sessions.length : 0,
          updatedAt: data.updatedAt || stat.mtimeMs,
          createdAt: data.createdAt || stat.birthtimeMs,
          fileName: file,
          fileSizeBytes: stat.size,
        });
      } catch (e) {
        console.warn(`Failed to parse campaign file: ${file}`, e);
      }
    }

    // Sort by updatedAt descending
    result.sort((a, b) => b.updatedAt - a.updatedAt);
    return result;
  }

  /**
   * Load campaign data by ID or filename
   */
  public loadCampaign(idOrFilename: string): CampaignData | null {
    const dir = this.getCampaignsDir();
    const cleanName = this.sanitizeFilename(idOrFilename);

    // Try exact filename first, then pattern
    const candidateFiles = [
      idOrFilename.endsWith('.json') ? idOrFilename : `${idOrFilename}.json`,
      `campaign_${cleanName}.json`,
      `${cleanName}.json`,
    ];

    for (const f of candidateFiles) {
      const fullPath = path.join(dir, f);
      if (fs.existsSync(fullPath)) {
        try {
          const raw = fs.readFileSync(fullPath, 'utf-8');
          return JSON.parse(raw) as CampaignData;
        } catch (e) {
          console.error(`Failed to read campaign file ${fullPath}:`, e);
        }
      }
    }

    // Check all files in dir if id matches
    const allFiles = fs.readdirSync(dir);
    for (const f of allFiles) {
      if (!f.endsWith('.json')) continue;
      const fullPath = path.join(dir, f);
      try {
        const raw = fs.readFileSync(fullPath, 'utf-8');
        const data = JSON.parse(raw);
        if (data.id === idOrFilename) {
          return data as CampaignData;
        }
      } catch (e) {}
    }

    return null;
  }

  /**
   * Save campaign data to disk as a separate JSON file and sync active_campaign.json
   */
  public saveCampaign(campaign: CampaignData): { success: boolean; filePath: string; fileName: string } {
    try {
      const dir = this.getCampaignsDir();
      const cleanId = this.sanitizeFilename(campaign.id || campaign.name || `camp_${Date.now()}`);
      const fileName = `campaign_${cleanId}.json`;
      const fullPath = path.join(dir, fileName);

      const toSave: CampaignData = {
        ...campaign,
        id: campaign.id || `campaign-${cleanId}`,
        updatedAt: Date.now(),
      };

      // Atomic write to dedicated campaign file
      fs.writeFileSync(fullPath, JSON.stringify(toSave, null, 2), 'utf-8');

      // Also update active_campaign.json for quick reboot recovery
      const activePath = path.join(dir, 'active_campaign.json');
      fs.writeFileSync(activePath, JSON.stringify(toSave, null, 2), 'utf-8');

      return { success: true, filePath: fullPath, fileName };
    } catch (err: any) {
      console.error('Failed to save campaign to disk:', err);
      return { success: false, filePath: '', fileName: '' };
    }
  }

  /**
   * Delete campaign from disk
   */
  public deleteCampaign(idOrFilename: string): boolean {
    try {
      const dir = this.getCampaignsDir();
      const allFiles = fs.readdirSync(dir);

      for (const f of allFiles) {
        if (!f.endsWith('.json')) continue;
        if (f === 'active_campaign.json') continue; // Don't delete active placeholder

        const fullPath = path.join(dir, f);
        if (f === idOrFilename || f === `${idOrFilename}.json`) {
          fs.unlinkSync(fullPath);
          return true;
        }

        try {
          const raw = fs.readFileSync(fullPath, 'utf-8');
          const data = JSON.parse(raw);
          if (data.id === idOrFilename) {
            fs.unlinkSync(fullPath);
            return true;
          }
        } catch (e) {}
      }
      return false;
    } catch (err: any) {
      console.error('Failed to delete campaign:', err);
      return false;
    }
  }

  /**
   * Generate campaign via Gemini AI on backend
   */
  public async generateCampaignWithAi(promptSpecs: {
    title?: string;
    system?: string;
    setting?: string;
    tone?: string;
    partyLevel?: string;
    villainHook?: string;
    customWishes?: string;
  }): Promise<{ success: boolean; campaign?: CampaignData; error?: string }> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return {
        success: false,
        error: 'GEMINI_API_KEY is not configured on the server. Please copy the generated prompt to use in external LLMs.',
      };
    }

    try {
      const ai = new GoogleGenAI({ apiKey });
      const systemInstruction = `You are a world-class TTRPG Game Master and narrative designer. 
Generate a complete, rich, interconnected TTRPG campaign dataset adhering strictly to the JSON schema requested.
The campaign MUST include:
1. "time": accurate calendar and weather state
2. "quests": at least 1 main storyline quest and 2-3 intriguing side quests/bounties with objectives and secrets
3. "locations": 3-4 vivid locations with points of interest (POI), threat levels, and lore
4. "npcs": 4-6 colorful NPCs with distinct personalities, motivations, secrets, attitudes to party, and voice notes
5. "relationships": interconnected links between NPCs (allies, rivals, debts, love, betrayal)
6. "factions": 2-3 competing factions with influence and goals
7. "sessions": a starter session 0/1 chronicle with Lazy DM prep notes and clues
8. "timeline": 3-4 historical timeline events of the world
9. "party": 4 starter party characters with stats, AC, HP, passive perception
10. "treasury": starter party coins (gold, silver, copper) and shared items
11. "safety": house rules and safety lines/veils

Return ONLY valid JSON without any surrounding conversational text or markdown code fences.`;

      const userPrompt = `Create a full TTRPG campaign with these parameters:
- Title/Idea: ${promptSpecs.title || 'Epic Campaign'}
- Game System: ${promptSpecs.system || 'D&D 5e'}
- World/Setting: ${promptSpecs.setting || 'Forgotten Realms'}
- Tone/Genre: ${promptSpecs.tone || 'Heroic Fantasy'}
- Party Level: ${promptSpecs.partyLevel || 'Level 1-3'}
- Main Villain/Threat: ${promptSpecs.villainHook || 'Ancient rising evil'}
- Special details: ${promptSpecs.customWishes || 'Intrigue, dungeons, memorable NPCs and deep secrets'}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.7-flash',
        contents: userPrompt,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          temperature: 0.8,
        },
      });

      const responseText = response.text || '';
      let cleanJson = responseText.trim();
      if (cleanJson.startsWith('```json')) {
        cleanJson = cleanJson.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleanJson.startsWith('```')) {
        cleanJson = cleanJson.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }

      const parsed = JSON.parse(cleanJson);
      const now = Date.now();
      const campaignId = `campaign-ai-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

      const fullCampaign: CampaignData = {
        id: campaignId,
        name: parsed.name || promptSpecs.title || 'Сгенерированная кампания',
        system: parsed.system || promptSpecs.system || 'D&D 5e',
        worldName: parsed.worldName || promptSpecs.setting || 'Свой мир',
        dungeonMasterName: parsed.dungeonMasterName || 'Мастер',
        createdAt: now,
        updatedAt: now,
        time: parsed.time || {
          year: 1492,
          month: 7,
          day: 15,
          hour: 10,
          minute: 0,
          eraName: '1492 DR (Эра Драконов)',
          calendarSystem: 'harptos',
          weather: 'clear',
          temperatureDesc: '+21°C, лёгкий попутный ветер',
          moonPhase: 'waxing_gibbous',
          dayOfWeek: 'Элеинсис',
          season: 'summer',
        },
        quests: Array.isArray(parsed.quests) ? parsed.quests : [],
        locations: Array.isArray(parsed.locations) ? parsed.locations : [],
        npcs: Array.isArray(parsed.npcs) ? parsed.npcs : [],
        relationships: Array.isArray(parsed.relationships) ? parsed.relationships : [],
        factions: Array.isArray(parsed.factions) ? parsed.factions : [],
        sessions: Array.isArray(parsed.sessions) ? parsed.sessions : [],
        timeline: Array.isArray(parsed.timeline) ? parsed.timeline : [],
        party: Array.isArray(parsed.party) ? parsed.party : [],
        treasury: parsed.treasury || {
          copper: 50,
          silver: 80,
          electrum: 0,
          gold: 240,
          platinum: 5,
          sharedBag: [],
          transactions: [],
        },
        safety: parsed.safety || {
          xCardTriggered: false,
          lines: ['Насилие над детьми', 'Пытки'],
          veils: ['Романтические сцены (fade to black)'],
          houseRules: [],
          breakTimerMinutes: 15,
          breakTimerEndsAt: null,
          breakTimerActive: false,
        },
      };

      // Save directly to disk
      this.saveCampaign(fullCampaign);

      return { success: true, campaign: fullCampaign };
    } catch (err: any) {
      console.error('AI Campaign Generation Error:', err);
      return { success: false, error: err.message || String(err) };
    }
  }
}

export const campaignDirectoryEngine = new CampaignDirectoryEngine();
