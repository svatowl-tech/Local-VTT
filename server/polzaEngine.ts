import fs from 'fs';
import path from 'path';
import { GoogleGenAI } from '@google/genai';
import {
  PolzaEntityContext,
  PolzaEntityType,
  PolzaArtStylePreset,
  PolzaGenerateRequest,
  PolzaGenerateResponse,
  PolzaModelInfo,
  PolzaImageSize,
} from '../src/types/polzaTypes';

export const POLZA_AVAILABLE_MODELS: PolzaModelInfo[] = [
  {
    id: 'tongyi-mai/z-image',
    name: 'Tongyi Mai Z-Image',
    provider: 'Alibaba Cloud',
    description: 'Универсальная быстрая модель с отличной детализацией фэнтези артов и портретов (по умолчанию).',
    isDefault: true,
    recommendedFor: 'Портреты NPC, монстры, предметы, локации',
  },
  {
    id: 'google/gemini-2.5-flash-image',
    name: 'Gemini 2.5 Flash Image',
    provider: 'Google',
    description: 'Новейшая визуальная модель с глубоким пониманием сложных промптов и текста.',
    recommendedFor: 'Сложные сюжетные сцены, атмосферные локации, концепт-арт',
  },
  {
    id: 'bytedance/seedream-4',
    name: 'Seedream 4',
    provider: 'ByteDance',
    description: 'Высокохудожественная модель с яркой кинематографичной цветокоррекцией и фотореализмом.',
    recommendedFor: 'Эпические пейзажи, кинематографичные сцены сражений, артефакты',
  },
  {
    id: 'gpt-image-1',
    name: 'GPT Image 1',
    provider: 'OpenAI Compatible',
    description: 'Продвинутая модель для генерации точных композиций с поддержкой прозрачного фона.',
    recommendedFor: 'Токены для стола, изолированные предметы, иконки',
    supportsTransparentBg: true,
  },
  {
    id: 'dall-e-3',
    name: 'DALL-E 3',
    provider: 'OpenAI',
    description: 'Классическая модель с точным следованием стилям Vivid и Natural.',
    recommendedFor: 'Иллюстрации к правилам, книжный стиль D&D',
  },
];

export class PolzaEngine {
  private getStorageDir(): string {
    const dir = path.join(process.cwd(), 'assets', 'data', 'ai-generated');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    return dir;
  }

  /**
   * Resolve active API Key: from request body > process.env.POLZA_AI_API_KEY
   */
  public getApiKey(customKey?: string): string {
    const key = (customKey || process.env.POLZA_AI_API_KEY || '').trim();
    return key;
  }

  /**
   * Determine optimal image dimensions based on entity type
   */
  public getOptimalSizeForEntity(entityType?: PolzaEntityType): PolzaImageSize {
    switch (entityType) {
      case 'npc':
      case 'monster':
        return '1024x1536'; // Vertical portrait
      case 'location':
      case 'scene':
      case 'quest':
        return '1536x1024'; // Horizontal landscape
      case 'item':
      case 'spell':
      case 'table':
      case 'rule':
      default:
        return '1024x1024'; // Square
    }
  }

  /**
   * Generate an optimized, high-fidelity English prompt based on entity context & style preset
   */
  public buildPrompt(
    entity: PolzaEntityContext,
    stylePreset: PolzaArtStylePreset = 'dnd_cinematic',
    customInstructions?: string
  ): string {
    const styleModifiers = this.getStyleModifiers(stylePreset);
    let subjectDescription = '';

    switch (entity.type) {
      case 'npc': {
        const parts = [];
        if (entity.name) parts.push(`named "${entity.name}"`);
        if (entity.race) parts.push(`${entity.race}`);
        if (entity.classType) parts.push(`${entity.classType}`);
        if (entity.appearance) parts.push(entity.appearance);
        if (entity.equipment) parts.push(`equipped with ${entity.equipment}`);
        if (entity.personality) parts.push(`expression: ${entity.personality}`);
        if (entity.description) parts.push(this.cleanDescription(entity.description));

        subjectDescription = `Masterpiece fantasy character portrait of ${parts.join(', ')}. Expressive facial features, intricate clothing textures, dynamic lighting, high tabletop RPG fantasy art`;
        break;
      }

      case 'monster': {
        const parts = [];
        parts.push(entity.name);
        if (entity.category) parts.push(`type: ${entity.category}`);
        if (entity.cr) parts.push(`Challenge Rating ${entity.cr}`);
        if (entity.appearance) parts.push(entity.appearance);
        if (entity.environment) parts.push(`lurking in ${entity.environment}`);
        if (entity.description) parts.push(this.cleanDescription(entity.description));

        subjectDescription = `Menacing bestiary fantasy creature illustration of ${parts.join(', ')}. Dramatic action pose, detailed anatomy, glistening scales or fur, atmospheric dust and fog, epic creature design`;
        break;
      }

      case 'item': {
        const parts = [];
        parts.push(entity.name);
        if (entity.category) parts.push(entity.category);
        if (entity.rarity) parts.push(`${entity.rarity} tier`);
        if (entity.description) parts.push(this.cleanDescription(entity.description));

        subjectDescription = `Intricately crafted magical RPG item art of ${parts.join(', ')}. Glowing magical runes, metallic reflections, ethereal energy aura, centered composition on dark vignette background, legendary relic illustration`;
        break;
      }

      case 'spell': {
        const parts = [];
        parts.push(entity.name);
        if (entity.school) parts.push(`${entity.school} magic school`);
        if (entity.description) parts.push(this.cleanDescription(entity.description));

        subjectDescription = `Dynamic spellcasting visualization of "${parts.join(', ')}". Arcane energy swirling, glowing runic circles, vibrant elemental sparks and radiant particles, cinematic arcane surge, magical codex art`;
        break;
      }

      case 'location':
      case 'scene': {
        const parts = [];
        parts.push(entity.name);
        if (entity.category) parts.push(entity.category);
        if (entity.environment) parts.push(entity.environment);
        if (entity.description) parts.push(this.cleanDescription(entity.description));

        subjectDescription = `Breathtaking wide fantasy environment concept art of ${parts.join(', ')}. Vast panoramic perspective, cinematic volumetric lighting, atmospheric depth, rich worldbuilding details, architectural marvel`;
        break;
      }

      case 'quest':
      case 'lore':
      default: {
        const parts = [];
        if (entity.name) parts.push(entity.name);
        if (entity.category) parts.push(entity.category);
        if (entity.description) parts.push(this.cleanDescription(entity.description));

        subjectDescription = `Epic fantasy storytelling scene depicting ${parts.join(', ')}. Dramatic narrative composition, evocative mood and shadows, high quality TTRPG world lore illustration`;
        break;
      }
    }

    let fullPrompt = `${subjectDescription}, ${styleModifiers}`;
    if (customInstructions && customInstructions.trim()) {
      fullPrompt += `, ${customInstructions.trim()}`;
    }

    return fullPrompt;
  }

  private cleanDescription(desc: string): string {
    return desc
      .replace(/<[^>]*>?/gm, '') // strip html
      .replace(/[\r\n]+/g, ' ')
      .slice(0, 300)
      .trim();
  }

  private getStyleModifiers(preset: PolzaArtStylePreset): string {
    switch (preset) {
      case 'dnd_cinematic':
        return 'official D&D 5e rulebook art style, dramatic rim lighting, intricate rendering, ArtStation trending, 8k resolution, crisp focus';
      case 'grimdark':
        return 'dark fantasy grimdark style, moody desaturated colors, harsh deep shadows, ominous atmosphere, Warhammer fantasy aesthetic, gritty detail';
      case 'watercolor_rpg':
        return 'classic tabletop RPG watercolor illustration, hand-drawn ink linework, painterly wash, parchment texture background, vintage fantasy book art';
      case 'concept_art':
        return 'AAA video game concept art, cinematic keyframe, volumetric god rays, hyper-detailed environment, Unreal Engine 5 render feel';
      case 'oil_painting':
        return 'classical oil painting on canvas, visible brush strokes, Rembrandt dramatic chiaroscuro lighting, rich deep pigments, museum masterpiece';
      case 'realistic_photo':
        return 'photorealistic cinematic capture, 35mm lens photography, depth of field, natural lighting, realistic textures, ultra-detailed';
      case 'anime_fantasy':
        return 'high-end anime fantasy key visual, vivid lighting, sharp stylized cel shading, Makoto Shinkai aesthetic, luminous magical effects';
      case 'isometric_token':
        return 'isolated top-down isometric tabletop token, circular border rim, clear silhouette, clean backdrop, digital miniature figurine art';
      case 'retro_pixel':
        return '16-bit retro RPG pixel art, nostalgic SNES fantasy sprite aesthetic, vibrant color palette, distinct pixel shading';
      default:
        return 'high quality fantasy digital painting, crisp details, dramatic lighting, 8k';
    }
  }

  /**
   * Execute Polza.ai image generation API request
   */
  public async generateImage(req: PolzaGenerateRequest): Promise<PolzaGenerateResponse> {
    const apiKey = this.getApiKey(req.customApiKey);
    const geminiKey = (process.env.GEMINI_API_KEY || '').trim();

    if (!apiKey) {
      if (geminiKey) {
        console.log(`[PolzaEngine] POLZA_AI_API_KEY is not set. Using Gemini Imagen API fallback...`);
        return await this.generateWithGeminiImagenFallback(req, geminiKey);
      }
      return {
        success: false,
        error: 'API ключ Polza AI не настроен. Укажите POLZA_AI_API_KEY в .env или введите ключ в окне генерации.',
      };
    }

    const model = req.model || 'tongyi-mai/z-image';
    const prompt = req.prompt.trim();
    if (!prompt) {
      return {
        success: false,
        error: 'Промпт не может быть пустым',
      };
    }

    const payload: Record<string, any> = {
      model,
      prompt,
      size: req.size || '1024x1024',
      quality: req.quality || 'high',
      response_format: req.response_format || 'url',
    };

    if (req.style && model === 'dall-e-3') {
      payload.style = req.style;
    }

    if (req.background && model === 'gpt-image-1') {
      payload.background = req.background;
    }

    try {
      console.log(`[PolzaEngine] Calling Polza AI generations with model: ${model}, size: ${payload.size}`);

      const response = await fetch('https://polza.ai/api/v2/images/generations', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const responseText = await response.text();
      let data: any;
      try {
        data = JSON.parse(responseText);
      } catch (parseErr) {
        console.error('[PolzaEngine] Response parsing error:', responseText);
        return {
          success: false,
          error: `Ошибка ответа Polza AI (HTTP ${response.status}): ${responseText.slice(0, 200)}`,
        };
      }

      if (!response.ok) {
        const errorMsg = data?.error?.message || data?.message || `HTTP ${response.status}`;
        if ((response.status === 401 || response.status === 403 || response.status === 404) && geminiKey) {
          console.warn(`[PolzaEngine] Polza AI key/endpoint issue (${response.status}). Falling back to Gemini Imagen...`);
          return await this.generateWithGeminiImagenFallback(req, geminiKey);
        }
        return {
          success: false,
          error: `Ошибка Polza AI: ${errorMsg}`,
          raw: data,
        };
      }

      // Check if immediate synchronous result
      if (Array.isArray(data?.data) && data.data.length > 0) {
        const processedData = [];

        for (const item of data.data) {
          const itemResult: any = { ...item };

          // If URL provided and saveToDisk requested or URL needs local caching
          if (item.url && req.saveToDisk !== false) {
            const saved = await this.saveRemoteImageToDisk(item.url, req.entityContext?.name || 'art');
            if (saved) {
              itemResult.localAssetUrl = saved.localAssetUrl;
              itemResult.localFilePath = saved.filePath;
            }
          }

          // If base64 provided
          if (item.b64_json && req.saveToDisk !== false) {
            const saved = await this.saveBase64ImageToDisk(item.b64_json, req.entityContext?.name || 'art');
            if (saved) {
              itemResult.localAssetUrl = saved.localAssetUrl;
              itemResult.localFilePath = saved.filePath;
            }
          }

          processedData.push(itemResult);
        }

        return {
          success: true,
          created: data.created || Math.floor(Date.now() / 1000),
          data: processedData,
          usage: data.usage,
          status: 'completed',
          raw: data,
        };
      }

      // Async timeout response (>120s) -> pending taskId
      if (data?.id && (data?.status === 'pending' || data?.status === 'processing')) {
        return {
          success: true,
          id: data.id,
          status: data.status,
          created: data.created,
          raw: data,
        };
      }

      return {
        success: false,
        error: 'Неизвестный формат ответа от Polza AI',
        raw: data,
      };
    } catch (err: any) {
      console.error('[PolzaEngine] Network or execution error:', err);
      if (geminiKey) {
        console.warn('[PolzaEngine] Network error with Polza AI. Falling back to Gemini Imagen...');
        return await this.generateWithGeminiImagenFallback(req, geminiKey);
      }
      return {
        success: false,
        error: err.message || 'Ошибка сети при обращении к Polza AI',
      };
    }
  }

  /**
   * Fallback image generation using Gemini Imagen API
   */
  private async generateWithGeminiImagenFallback(req: PolzaGenerateRequest, geminiKey: string): Promise<PolzaGenerateResponse> {
    try {
      const ai = new GoogleGenAI({ apiKey: geminiKey });
      const imageResult = await ai.models.generateImages({
        model: 'imagen-3.0-generate-002',
        prompt: req.prompt,
        config: {
          numberOfImages: 1,
          outputMimeType: 'image/jpeg',
          aspectRatio: req.size?.includes('1536') || req.size?.includes('1280') ? '3:4' : '1:1',
        },
      });

      const base64Bytes = imageResult.generatedImages?.[0]?.image?.imageBytes;
      if (base64Bytes) {
        const buffer = Buffer.from(base64Bytes, 'base64');
        const fileName = `gemini_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.jpg`;
        const localPath = path.join(this.getStorageDir(), fileName);
        fs.writeFileSync(localPath, buffer);
        const relativeUrl = `/assets/data/ai-generated/${fileName}`;

        return {
          success: true,
          data: [{
            url: relativeUrl,
            b64_json: `data:image/jpeg;base64,${base64Bytes}`,
            localAssetUrl: relativeUrl,
            localFilePath: localPath,
          }],
        };
      }
      throw new Error('No image bytes returned from Imagen model');
    } catch (err: any) {
      console.error('[PolzaEngine] Gemini Imagen fallback error:', err);
      return {
        success: false,
        error: `API ключ Polza AI не настроен или недействителен. Ошибка fallback Imagen: ${err.message || String(err)}`,
      };
    }
  }

  /**
   * Check async media task status: GET /v2/media/{id} or /v1/media/{id}
   */
  public async checkMediaStatus(taskId: string, customApiKey?: string): Promise<any> {
    const apiKey = this.getApiKey(customApiKey);
    if (!apiKey) {
      return { success: false, error: 'API ключ не найден' };
    }

    try {
      // Try v2 media status endpoint first
      let res = await fetch(`https://polza.ai/api/v2/media/${taskId}`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });

      if (!res.ok && res.status === 404) {
        // Fallback to v1 media endpoint
        res = await fetch(`https://polza.ai/api/v1/media/${taskId}`, {
          headers: { Authorization: `Bearer ${apiKey}` },
        });
      }

      const data = await res.json();
      if (!res.ok) {
        return {
          success: false,
          error: data?.error?.message || data?.message || `HTTP ${res.status}`,
        };
      }

      // If status completed and URL is available
      if (data.status === 'completed' && Array.isArray(data.data)) {
        const processedData = [];
        for (const item of data.data) {
          const itemResult: any = { ...item };
          if (item.url) {
            const saved = await this.saveRemoteImageToDisk(item.url, 'async_art');
            if (saved) {
              itemResult.localAssetUrl = saved.localAssetUrl;
              itemResult.localFilePath = saved.filePath;
            }
          }
          processedData.push(itemResult);
        }
        return {
          success: true,
          id: taskId,
          status: 'completed',
          data: processedData,
        };
      }

      return {
        success: true,
        id: taskId,
        status: data.status || 'processing',
        raw: data,
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || 'Ошибка проверки статуса генерации',
      };
    }
  }

  /**
   * Save remote image from Polza CDN to local disk storage
   */
  public async saveRemoteImageToDisk(
    imageUrl: string,
    prefixName: string = 'art'
  ): Promise<{ filePath: string; localAssetUrl: string } | null> {
    try {
      const res = await fetch(imageUrl);
      if (!res.ok) return null;

      const buffer = Buffer.from(await res.arrayBuffer());
      const safePrefix = prefixName
        .toLowerCase()
        .replace(/[^a-z0-9а-яё\-]/gi, '_')
        .slice(0, 30) || 'polza';

      const fileName = `${Date.now()}_${safePrefix}_${Math.random().toString(36).slice(2, 7)}.png`;
      const dir = this.getStorageDir();
      const filePath = path.join(dir, fileName);

      fs.writeFileSync(filePath, buffer);

      // Return local streaming route URL
      const localAssetUrl = `/api/assets/file/data/ai-generated/${fileName}`;
      return { filePath, localAssetUrl };
    } catch (err) {
      console.warn('[PolzaEngine] Failed to cache remote image locally:', err);
      return null;
    }
  }

  /**
   * Save base64 image data to local disk
   */
  public async saveBase64ImageToDisk(
    b64: string,
    prefixName: string = 'art'
  ): Promise<{ filePath: string; localAssetUrl: string } | null> {
    try {
      const buffer = Buffer.from(b64.replace(/^data:image\/\w+;base64,/, ''), 'base64');
      const safePrefix = prefixName
        .toLowerCase()
        .replace(/[^a-z0-9а-яё\-]/gi, '_')
        .slice(0, 30) || 'polza';

      const fileName = `${Date.now()}_${safePrefix}_${Math.random().toString(36).slice(2, 7)}.png`;
      const dir = this.getStorageDir();
      const filePath = path.join(dir, fileName);

      fs.writeFileSync(filePath, buffer);
      const localAssetUrl = `/api/assets/file/data/ai-generated/${fileName}`;
      return { filePath, localAssetUrl };
    } catch (err) {
      console.warn('[PolzaEngine] Failed to save base64 image locally:', err);
      return null;
    }
  }
}

export const polzaEngine = new PolzaEngine();
