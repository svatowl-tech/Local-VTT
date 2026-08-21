import crypto from 'crypto';
import { MapItem, ParsedMediaResult } from './types';

// Preset sample maps (both animated video and high-res battlemaps)
export const DEFAULT_MAP_LIBRARY: MapItem[] = [
  {
    id: 'preset-dragon-lair',
    name: 'Ancient Dragon Lair (Volcanic Lava)',
    type: 'video',
    url: 'https://assets.mixkit.co/videos/preview/mixkit-red-glowing-lava-flowing-41121-large.mp4',
    thumbnailUrl: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=600&auto=format&fit=crop&q=80',
    width: 1920,
    height: 1080,
    aspectRatio: 16 / 9,
    position: { x: -960, y: -540 },
    scale: { x: 1, y: 1 },
    rotation: 0,
    zIndex: 1,
    opacity: 1,
    hash: 'a7b8c9d0e1f234567890abcdef1234567890abcdef1234567890abcdef123456',
    fileSize: 18450000,
    format: 'MP4 (Video)',
    gridSize: 50,
  },
  {
    id: 'preset-forest-encounter',
    name: 'Whispering Forest Crossing',
    type: 'image',
    url: 'https://images.unsplash.com/photo-1511497584788-876761c11969?w=1600&auto=format&fit=crop&q=80',
    thumbnailUrl: 'https://images.unsplash.com/photo-1511497584788-876761c11969?w=600&auto=format&fit=crop&q=80',
    width: 2000,
    height: 1333,
    aspectRatio: 1.5,
    position: { x: -1000, y: -666 },
    scale: { x: 1, y: 1 },
    rotation: 0,
    zIndex: 2,
    opacity: 1,
    hash: 'b8c9d0e1f2a734567890abcdef1234567890abcdef1234567890abcdef123456',
    fileSize: 4200000,
    format: 'JPEG (Image)',
    gridSize: 60,
  },
  {
    id: 'preset-dungeon-crypt',
    name: 'Forgotten Crypt of the Necromancer',
    type: 'image',
    url: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=1600&auto=format&fit=crop&q=80',
    thumbnailUrl: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=600&auto=format&fit=crop&q=80',
    width: 1800,
    height: 1200,
    aspectRatio: 1.5,
    position: { x: 200, y: -600 },
    scale: { x: 1, y: 1 },
    rotation: 0,
    zIndex: 3,
    opacity: 1,
    hash: 'c9d0e1f2a7b834567890abcdef1234567890abcdef1234567890abcdef123456',
    fileSize: 3800000,
    format: 'PNG (Image)',
    gridSize: 50,
  },
  {
    id: 'preset-cyberpunk-alley',
    name: 'Neon Rain Slums (Animated)',
    type: 'video',
    url: 'https://assets.mixkit.co/videos/preview/mixkit-rain-falling-on-a-city-street-at-night-27361-large.mp4',
    thumbnailUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=600&auto=format&fit=crop&q=80',
    width: 1920,
    height: 1080,
    aspectRatio: 16 / 9,
    position: { x: -960, y: 600 },
    scale: { x: 1, y: 1 },
    rotation: 0,
    zIndex: 4,
    opacity: 1,
    hash: 'd0e1f2a7b8c934567890abcdef1234567890abcdef1234567890abcdef123456',
    fileSize: 14200000,
    format: 'WEBM (Video)',
    gridSize: 40,
  },
  {
    id: 'preset-tavern-ground',
    name: 'Wayfarer Inn Ground Floor',
    type: 'image',
    url: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1600&auto=format&fit=crop&q=80',
    thumbnailUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&auto=format&fit=crop&q=80',
    width: 1600,
    height: 1067,
    aspectRatio: 1.5,
    position: { x: 1100, y: 100 },
    scale: { x: 1, y: 1 },
    rotation: 0,
    zIndex: 5,
    opacity: 1,
    hash: 'e1f2a7b8c9d034567890abcdef1234567890abcdef1234567890abcdef123456',
    fileSize: 2900000,
    format: 'WEBP (Image)',
    gridSize: 50,
  }
];

// In-memory store for uploaded media to stream cleanly to both Window 1 and Window 2
const uploadedMediaBuffers = new Map<string, { buffer: Buffer; mimeType: string }>();

export function storeMediaBuffer(id: string, buffer: Buffer, mimeType: string): void {
  uploadedMediaBuffers.set(id, { buffer, mimeType });
}

export function getMediaBuffer(id: string): { buffer: Buffer; mimeType: string } | undefined {
  return uploadedMediaBuffers.get(id);
}

export function parseUploadedMedia(
  buffer: Buffer,
  originalFilename: string,
  mimeType: string
): ParsedMediaResult {
  // Heavy computation on backend: SHA-256 Checksum
  const hash = crypto.createHash('sha256').update(buffer).digest('hex');
  const fileSize = buffer.length;

  const isVideo = mimeType.startsWith('video/') || /\.(mp4|webm|mov|m4v|avi|mkv)$/i.test(originalFilename);
  const mediaType: 'image' | 'video' = isVideo ? 'video' : 'image';

  let format = mimeType.toUpperCase().replace('IMAGE/', '').replace('VIDEO/', '');
  if (!format || format === 'OCTET-STREAM') {
    const ext = originalFilename.split('.').pop() || 'BIN';
    format = ext.toUpperCase();
  }

  const generatedId = `custom-map-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
  const effectiveMime = mimeType || (isVideo ? 'video/mp4' : 'image/png');

  // Store in backend media store
  storeMediaBuffer(generatedId, buffer, effectiveMime);

  // If file is small (< 4MB), generate base64 dataUrl, otherwise provide backend stream URL `/api/media/${generatedId}`
  let dataUrl = `/api/media/${generatedId}`;
  if (fileSize < 4 * 1024 * 1024) {
    const base64 = buffer.toString('base64');
    dataUrl = `data:${effectiveMime};base64,${base64}`;
  }

  // Default estimations (will be updated dynamically by backend when rendered or calculated)
  const defaultWidth = isVideo ? 1920 : 1600;
  const defaultHeight = isVideo ? 1080 : 1200;
  const aspectRatio = defaultWidth / defaultHeight;

  return {
    id: generatedId,
    name: originalFilename.replace(/\.[^/.]+$/, ''),
    mediaType,
    format,
    width: defaultWidth,
    height: defaultHeight,
    aspectRatio,
    fileSize,
    hash,
    dataUrl,
    recommendedGridSize: 50,
  };
}
