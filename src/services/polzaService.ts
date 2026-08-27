import {
  PolzaEntityContext,
  PolzaArtStylePreset,
  PolzaGenerateRequest,
  PolzaGenerateResponse,
  PolzaModelInfo,
  PolzaImageSize,
  PolzaStatusResponse,
} from '../types/polzaTypes';

const STORAGE_KEY_POLZA_KEY = 'aethermap_polza_api_key';
const STORAGE_KEY_POLZA_MODEL = 'aethermap_polza_model';
const STORAGE_KEY_POLZA_STYLE = 'aethermap_polza_style';

export class PolzaService {
  /**
   * Stored user API key in client localStorage (used if process.env.POLZA_AI_API_KEY is not set)
   */
  public getStoredApiKey(): string {
    return localStorage.getItem(STORAGE_KEY_POLZA_KEY) || '';
  }

  public setStoredApiKey(key: string): void {
    if (key && key.trim()) {
      localStorage.setItem(STORAGE_KEY_POLZA_KEY, key.trim());
    } else {
      localStorage.removeItem(STORAGE_KEY_POLZA_KEY);
    }
  }

  public getStoredModel(): string {
    return localStorage.getItem(STORAGE_KEY_POLZA_MODEL) || 'tongyi-mai/z-image';
  }

  public setStoredModel(model: string): void {
    localStorage.setItem(STORAGE_KEY_POLZA_MODEL, model);
  }

  public getStoredStyle(): PolzaArtStylePreset {
    return (localStorage.getItem(STORAGE_KEY_POLZA_STYLE) as PolzaArtStylePreset) || 'dnd_cinematic';
  }

  public setStoredStyle(style: PolzaArtStylePreset): void {
    localStorage.setItem(STORAGE_KEY_POLZA_STYLE, style);
  }

  /**
   * Fetch available models & env key presence from backend
   */
  public async getModels(): Promise<{ models: PolzaModelInfo[]; defaultModel: string; hasEnvKey: boolean }> {
    try {
      const res = await fetch('/api/polza/models');
      const data = await res.json();
      if (data.success) {
        return {
          models: data.models,
          defaultModel: data.defaultModel || 'tongyi-mai/z-image',
          hasEnvKey: Boolean(data.hasEnvKey),
        };
      }
      return { models: [], defaultModel: 'tongyi-mai/z-image', hasEnvKey: false };
    } catch (e) {
      console.error('[PolzaService] Failed to load models:', e);
      return { models: [], defaultModel: 'tongyi-mai/z-image', hasEnvKey: false };
    }
  }

  /**
   * Generate an optimized prompt from entity details on backend
   */
  public async generatePrompt(
    entity: PolzaEntityContext,
    stylePreset: PolzaArtStylePreset = 'dnd_cinematic',
    customInstructions?: string
  ): Promise<{ prompt: string; optimalSize: PolzaImageSize }> {
    try {
      const res = await fetch('/api/polza/prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entity, stylePreset, customInstructions }),
      });
      const data = await res.json();
      if (data.success) {
        return { prompt: data.prompt, optimalSize: data.optimalSize || '1024x1024' };
      }
      throw new Error(data.error || 'Не удалось сгенерировать промпт');
    } catch (err: any) {
      console.error('[PolzaService] Prompt generation error:', err);
      throw err;
    }
  }

  /**
   * Generate image via backend Polza AI endpoint with async polling support
   */
  public async generateImage(
    request: PolzaGenerateRequest,
    onProgress?: (message: string) => void
  ): Promise<PolzaGenerateResponse> {
    const customApiKey = request.customApiKey || this.getStoredApiKey();
    const payload: PolzaGenerateRequest = {
      ...request,
      customApiKey: customApiKey || undefined,
    };

    onProgress?.('Отправка запроса в Polza AI...');

    const res = await fetch('/api/polza/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data: PolzaGenerateResponse = await res.json();

    if (!data.success) {
      throw new Error(data.error || 'Ошибка при генерации изображения');
    }

    // Synchronously completed
    if (data.status === 'completed' && data.data && data.data.length > 0) {
      onProgress?.('Изображение успешно получено!');
      return data;
    }

    // Asynchronous mode (timeout > 120s or background task queue)
    if (data.id && (data.status === 'pending' || data.status === 'processing')) {
      onProgress?.(`Запрос перешёл в очередь Polza AI (ID: ${data.id.slice(0, 8)}...). Ожидание готовности...`);
      return await this.pollTaskStatus(data.id, customApiKey, onProgress);
    }

    return data;
  }

  /**
   * Poll async Polza task status every 3.5s
   */
  private async pollTaskStatus(
    taskId: string,
    customApiKey?: string,
    onProgress?: (message: string) => void,
    maxAttempts = 40
  ): Promise<PolzaGenerateResponse> {
    let attempt = 0;

    while (attempt < maxAttempts) {
      attempt++;
      await new Promise((resolve) => setTimeout(resolve, 3500));

      onProgress?.(`Генерация в процессе (попытка ${attempt}/${maxAttempts})...`);

      try {
        const query = customApiKey ? `?customApiKey=${encodeURIComponent(customApiKey)}` : '';
        const res = await fetch(`/api/polza/status/${taskId}${query}`);
        const statusData: PolzaStatusResponse = await res.json();

        if (statusData.status === 'completed' && statusData.data && statusData.data.length > 0) {
          onProgress?.('Генерация завершена!');
          return {
            success: true,
            status: 'completed',
            id: taskId,
            data: statusData.data,
          };
        }

        if (statusData.status === 'failed') {
          throw new Error(statusData.error || 'Генерация завершилась с ошибкой на сервере Polza AI');
        }
      } catch (err: any) {
        if (err.message && err.message.includes('ошибкой')) throw err;
        console.warn('[PolzaService] Polling retry error:', err);
      }
    }

    throw new Error('Превышено время ожидания готовности арта в Polza AI');
  }

  /**
   * Save remote image URL or base64 to local backend disk storage
   */
  public async saveImageToAssets(imageUrl?: string, b64?: string, name?: string): Promise<{ localAssetUrl: string; filePath: string }> {
    const res = await fetch('/api/polza/save-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageUrl, b64, name }),
    });

    const data = await res.json();
    if (data.success) {
      return { localAssetUrl: data.localAssetUrl, filePath: data.filePath };
    }
    throw new Error(data.error || 'Не удалось сохранить изображение');
  }

  /**
   * Broadcast image to the Player Blackout / Curtain screen
   */
  public async broadcastToPlayers(imageUrl: string, title?: string, subtitle?: string): Promise<boolean> {
    try {
      const res = await fetch('/api/blackout/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          active: true,
          mode: 'image',
          mediaUrl: imageUrl,
          title: title || 'Иллюстрация',
          subtitle: subtitle || 'Демонстрация Мастера',
          presetTheme: 'fantasy_dnd',
          soundEnabled: false,
        }),
      });
      const data = await res.json();
      return Boolean(data.success);
    } catch (e) {
      console.error('[PolzaService] Broadcast error:', e);
      return false;
    }
  }
}

export const polzaService = new PolzaService();
