import { getActiveDirectoryHandle } from './unifiedAssetFolderService';
import { checkIsTauri, getApiBaseUrl } from '../utils/apiUrlHelper';

/**
 * Universal function to write JSON data to the content folder.
 * Works across Web (File System Access API), Tauri (Rust), and Express backend.
 * 
 * @param subPath Array of folder names representing the path inside the content folder (e.g., ['data', 'Sessions'])
 * @param fileName Name of the JSON file (e.g., 'active_session.json')
 * @param data The object to be serialized and saved
 * @returns true if saved successfully, false otherwise
 */
export async function writeDataToContentFolder(
  subPath: string[], 
  fileName: string, 
  data: any
): Promise<boolean> {
  // 1. Try File System Access API (Web Native)
  const rootHandle = getActiveDirectoryHandle();
  if (rootHandle) {
    try {
      let currentDir = rootHandle;
      for (const folder of subPath) {
        currentDir = await currentDir.getDirectoryHandle(folder, { create: true });
      }
      const fileHandle = await currentDir.getFileHandle(fileName, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(JSON.stringify(data, null, 2));
      await writable.close();
      return true;
    } catch (err) {
      console.warn('FS Access API Write Error:', err);
      // Fallback
    }
  }

  // 2. Try Tauri (Desktop)
  if (checkIsTauri()) {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const rootPath = localStorage.getItem('aethermap_tauri_folder_path') || 'assets';
      await invoke('write_json_file_rust', {
        rootPath,
        subPath,
        fileName,
        content: JSON.stringify(data, null, 2),
      });
      return true;
    } catch (err) {
      console.warn('Tauri Write Error:', err);
    }
  }

  // 3. Try Express Backend Fallback
  try {
    const rootPath = typeof localStorage !== 'undefined' ? localStorage.getItem('aethermap_tauri_folder_path') || '' : '';
    const res = await fetch(getApiBaseUrl() + '/api/fs/write', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rootPath, subPath, fileName, data })
    });
    return res.ok;
  } catch (err) {
    console.warn('Express Write Error:', err);
  }

  return false;
}

/**
 * Universal function to delete JSON data from the content folder.
 */
export async function deleteDataFromContentFolder(
  subPath: string[], 
  fileName: string
): Promise<boolean> {
  // 1. Try File System Access API
  const rootHandle = getActiveDirectoryHandle();
  if (rootHandle) {
    try {
      let currentDir = rootHandle;
      for (const folder of subPath) {
        currentDir = await currentDir.getDirectoryHandle(folder);
      }
      await currentDir.removeEntry(fileName);
      return true;
    } catch (err) {
      console.warn('FS Access API Delete Error:', err);
    }
  }

  // 2. Try Tauri
  if (checkIsTauri()) {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      // For lore specifically, Tauri has a command. But we want a generic one.
      // We will fallback to the existing 'delete_lore_item_rust' if it's lore, 
      // but otherwise just ignore for now or add 'delete_file_rust'
      if (subPath[0] === 'lore') {
         await invoke('delete_lore_item_rust', {
            loreDir: 'assets/lore',
            worldFolder: subPath[1] || 'Generic_Worlds',
            filename: fileName,
         });
         return true;
      }
    } catch (err) {
      console.warn('Tauri Delete Error:', err);
    }
  }

  // 3. Try Express
  try {
    const rootPath = typeof localStorage !== 'undefined' ? localStorage.getItem('aethermap_tauri_folder_path') || '' : '';
    const res = await fetch(getApiBaseUrl() + '/api/fs/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rootPath, subPath, fileName })
    });
    return res.ok;
  } catch (err) {
    console.warn('Express Delete Error:', err);
  }

  return false;
}
