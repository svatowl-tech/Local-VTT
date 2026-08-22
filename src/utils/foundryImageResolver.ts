import { resolveApiUrl } from './apiUrlHelper';

/**
 * Helper to safely resolve and return URLs for Foundry VTT graphics (images, tokens, icons)
 * Handles both web-hosted absolute URLs, base64 data URIs, and local filesystem relative paths
 */
export function resolveFoundryImageUrl(img: string | undefined, systemId?: string): string | undefined {
  if (!img) return undefined;
  
  const trimmed = img.trim();
  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('data:')
  ) {
    return trimmed;
  }
  
  // Clean up leading slashes or dots
  const cleanPath = trimmed.replace(/^[\.\/]+/, '');
  
  // If the path already has a systemId or is relative to the systems dir
  if (systemId && !cleanPath.startsWith('systems/') && !cleanPath.startsWith('icons/')) {
    return resolveApiUrl(`/api/systems/asset?path=${encodeURIComponent(systemId + '/' + cleanPath)}`);
  }
  
  return resolveApiUrl(`/api/systems/asset?path=${encodeURIComponent(cleanPath)}`);
}
