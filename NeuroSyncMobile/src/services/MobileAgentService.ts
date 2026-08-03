import AsyncStorage from '@react-native-async-storage/async-storage';
import { PermissionsAndroid, Platform } from 'react-native';
import RNFS from 'react-native-fs';

const WS_URL = 'wss://neurosync-4giu.onrender.com/ws';

async function requestStoragePermissions() {
  if (Platform.OS === 'android') {
    try {
      if (Platform.Version >= 33) {
        await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES,
          PermissionsAndroid.PERMISSIONS.READ_MEDIA_VIDEO,
          PermissionsAndroid.PERMISSIONS.READ_MEDIA_AUDIO,
        ]);
      } else {
        await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
          PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
        ]);
      }
    } catch (e) {
      console.warn('Storage permission error:', e);
    }
  }
}

class MobileAgentService {
  private ws: WebSocket | null = null;
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private deviceId: string = '';

  public async start() {
    if (this.ws) {
      this.stop();
    }

    await requestStoragePermissions();

    const token = await AsyncStorage.getItem('auth_token');
    if (!token) return;

    let savedDeviceId = await AsyncStorage.getItem('device_id');
    if (!savedDeviceId) {
      savedDeviceId = `mobile-${Math.random().toString(36).substring(2, 11)}`;
      await AsyncStorage.setItem('device_id', savedDeviceId);
    }
    this.deviceId = savedDeviceId;

    this.ws = new WebSocket(WS_URL);

    this.ws.onopen = () => {
      console.log('Mobile Agent connected to WS');
      
      const osVersion = Platform.Version.toString();
      const osName = Platform.OS === 'ios' ? 'iOS' : 'Android';

      const authMessage = {
        device_id: this.deviceId,
        token: token,
        hostname: `${osName} Device`,
        username: 'User',
        os: osName,
        os_version: osVersion,
        ip_address: '127.0.0.1',
        mac_address: '00:00:00:00:00:00',
        cpu: 'ARM',
        ram_gb: 4
      };
      
      this.ws?.send(JSON.stringify(authMessage));

      this.heartbeatInterval = setInterval(() => {
        if (this.ws?.readyState === WebSocket.OPEN) {
          this.ws.send(JSON.stringify({
            type: 'heartbeat',
            metrics: {
              cpu_percent: 0,
              memory_percent: 0,
              active_window: 'NeuroSync Mobile'
            }
          }));
        }
      }, 30000);
    };

    this.ws.onmessage = async (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'command') {
          await this.handleCommand(msg);
        }
      } catch (e) {
        console.warn('Mobile Agent WS Message Error:', e);
      }
    };

    this.ws.onerror = (e) => {
      console.warn('Mobile Agent WS Error (retrying):', e);
    };

    this.ws.onclose = () => {
      console.log('Mobile Agent WS Closed');
      this.stop();
      setTimeout(() => this.start(), 5000);
    };
  }

  public stop() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  private async handleCommand(msg: any) {
    const { action, request_id, payload } = msg;
    let result: any = { status: 'error', message: 'Unknown command' };

    try {
      if (action === 'file_list_dir') {
        result = await this.listDir(payload.dir_path);
      } else if (action === 'file_read_text') {
        result = await this.readText(payload.file_path);
      } else if (action === 'file_read_chunk') {
        result = await this.readChunk(payload.file_path, payload.chunk_index);
      } else if (action === 'file_save_text') {
        result = await this.saveText(payload.file_path, payload.content);
      }
    } catch (e: any) {
      result = { status: 'error', message: e.message || 'Action failed' };
    }

    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'command_result',
        action: action,
        request_id: request_id,
        ...result
      }));
    }
  }

  private async getBestExistingPath(candidates: string[], fallback: string): Promise<string> {
    for (const p of candidates) {
      try {
        if (p && (await RNFS.exists(p))) {
          return p;
        }
      } catch {}
    }
    return fallback;
  }

  private async listDir(dirPath: string) {
    const docPath = RNFS.DocumentDirectoryPath;
    
    // On Android, use /storage/emulated/0 as primary external storage
    let extStorage = RNFS.ExternalStorageDirectoryPath;
    if (Platform.OS === 'android') {
      extStorage = extStorage || '/storage/emulated/0';
    }

    const baseStorage = (Platform.OS === 'android' && extStorage) ? extStorage : docPath;
    const cleanPath = (dirPath || '').trim();
    const isRoot = !cleanPath || cleanPath === '~' || cleanPath === '/' || cleanPath === 'ROOT' || cleanPath.includes('Device Storage');

    let targetPath = cleanPath;
    let displayPath = cleanPath;

    if (isRoot) {
      targetPath = baseStorage;
      displayPath = '~';

      // List Root Shortcuts on Android/iOS
      const rootEntries: any[] = [];
      const dcimPath = await this.getBestExistingPath(['/storage/emulated/0/DCIM', '/sdcard/DCIM', `${baseStorage}/DCIM`], '');
      const picsPath = await this.getBestExistingPath(['/storage/emulated/0/Pictures', '/sdcard/Pictures', `${baseStorage}/Pictures`], '');
      const dlPath = await this.getBestExistingPath(['/storage/emulated/0/Download', '/storage/emulated/0/Downloads', '/sdcard/Download', RNFS.DownloadDirectoryPath || ''], '');
      const docsPath = await this.getBestExistingPath(['/storage/emulated/0/Documents', '/sdcard/Documents', `${baseStorage}/Documents`], '');

      if (dcimPath) rootEntries.push({ name: 'Camera (DCIM)', path: dcimPath, type: 'folder', size: '—' });
      if (picsPath) rootEntries.push({ name: 'Pictures', path: picsPath, type: 'folder', size: '—' });
      if (dlPath) rootEntries.push({ name: 'Downloads', path: dlPath, type: 'folder', size: '—' });
      if (docsPath) rootEntries.push({ name: 'Documents', path: docsPath, type: 'folder', size: '—' });
      
      if (Platform.OS === 'android') {
        rootEntries.push({ name: 'Internal Storage (/storage/emulated/0)', path: '/storage/emulated/0', type: 'folder', size: '—' });
      }
      rootEntries.push({ name: 'App Sandbox Documents', path: docPath, type: 'folder', size: '—' });

      return {
        status: 'success',
        current_path: targetPath,
        display_path: '~',
        parent_path: '~',
        entries: rootEntries
      };
    }

    // Resolve shorthand paths like ~/Downloads, ~/Pictures, ~/Documents
    if (cleanPath === 'Documents' || cleanPath === '~/Documents') {
      targetPath = await this.getBestExistingPath(['/storage/emulated/0/Documents', '/sdcard/Documents', `${baseStorage}/Documents`, docPath], docPath);
      displayPath = '~/Documents';
    } else if (cleanPath === 'Downloads' || cleanPath === '~/Downloads' || cleanPath.endsWith('/Downloads') || cleanPath.endsWith('/Download')) {
      targetPath = await this.getBestExistingPath(['/storage/emulated/0/Download', '/storage/emulated/0/Downloads', '/sdcard/Download', RNFS.DownloadDirectoryPath || '', `${baseStorage}/Download`, `${baseStorage}/Downloads`], docPath);
      displayPath = '~/Downloads';
    } else if (cleanPath === 'Pictures' || cleanPath === '~/Pictures' || cleanPath === 'DCIM' || cleanPath === '~/DCIM') {
      targetPath = await this.getBestExistingPath(['/storage/emulated/0/DCIM', '/storage/emulated/0/Pictures', '/sdcard/DCIM', '/sdcard/Pictures', `${baseStorage}/DCIM`, `${baseStorage}/Pictures`], docPath);
      displayPath = '~/Pictures';
    } else if (cleanPath === 'Desktop' || cleanPath === '~/Desktop') {
      targetPath = await this.getBestExistingPath(['/storage/emulated/0/Desktop', `${baseStorage}/Desktop`, docPath], docPath);
      displayPath = '~/Desktop';
    } else if (cleanPath.startsWith('~')) {
      const rel = cleanPath.substring(1);
      targetPath = `${baseStorage}${rel}`;
      displayPath = cleanPath;
    } else if (cleanPath.startsWith(baseStorage)) {
      const rel = cleanPath.substring(baseStorage.length);
      displayPath = rel ? `~${rel}` : '~';
    }

    if (!(await RNFS.exists(targetPath))) {
      targetPath = baseStorage;
    }

    let items: any[] = [];
    try {
      items = await RNFS.readDir(targetPath);
    } catch (e: any) {
      return { status: 'error', message: `Access Denied: ${e.message || 'Cannot access directory'}` };
    }

    const entries = items.map(item => ({
      name: item.name,
      path: item.path,
      type: item.isDirectory() ? 'folder' : 'file',
      size: item.isDirectory() ? '—' : this.formatSize(item.size),
      size_bytes: item.size,
      modified: item.mtime?.getTime() || Date.now(),
      extension: item.name.includes('.') ? `.${item.name.split('.').pop()}` : ''
    }));

    entries.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

    const isTop = targetPath === baseStorage || displayPath === '~';
    let parentPath = '~';
    if (!isTop) {
      const lastSlash = targetPath.lastIndexOf('/');
      parentPath = lastSlash > 0 ? targetPath.substring(0, lastSlash) : '~';
    }

    return {
      status: 'success',
      current_path: targetPath,
      display_path: displayPath,
      parent_path: parentPath,
      entries: entries
    };
  }

  private getAbsolutePath(filePath: string): string {
    const docPath = RNFS.DocumentDirectoryPath;
    let extStorage = RNFS.ExternalStorageDirectoryPath;
    if (Platform.OS === 'android') {
      extStorage = extStorage || '/storage/emulated/0';
    }
    const baseStorage = (Platform.OS === 'android' && extStorage) ? extStorage : docPath;

    if (!filePath || filePath === '~') return baseStorage;
    if (filePath.startsWith('~')) return `${baseStorage}${filePath.substring(1)}`;
    return filePath;
  }

  private async readText(filePath: string) {
    const absPath = this.getAbsolutePath(filePath);
    if (!(await RNFS.exists(absPath))) return { status: 'error', message: 'File not found' };
    const content = await RNFS.readFile(absPath, 'utf8');
    return { status: 'success', content };
  }

  private async saveText(filePath: string, content: string) {
    const absPath = this.getAbsolutePath(filePath);
    await RNFS.writeFile(absPath, content, 'utf8');
    return { status: 'success' };
  }

  private async readChunk(filePath: string, chunkIndex: number) {
    const absPath = this.getAbsolutePath(filePath);
    if (!(await RNFS.exists(absPath))) return { status: 'error', message: 'File not found' };

    const stat = await RNFS.stat(absPath);
    const CHUNK_SIZE = 512 * 1024; // 512KB
    const totalSize = parseInt(stat.size.toString(), 10);
    const totalChunks = Math.ceil(totalSize / CHUNK_SIZE) || 1;

    if (chunkIndex < 0 || chunkIndex >= totalChunks) {
      return { status: 'error', message: 'Chunk out of bounds' };
    }

    const offset = chunkIndex * CHUNK_SIZE;
    const lengthToRead = Math.min(CHUNK_SIZE, totalSize - offset);
    
    const chunkB64 = await RNFS.read(absPath, lengthToRead, offset, 'base64');

    return {
      status: 'success',
      file_name: stat.name,
      chunk_index: chunkIndex,
      total_chunks: totalChunks,
      total_size: totalSize,
      chunk_size: lengthToRead,
      data_b64: chunkB64,
      is_last: (chunkIndex === totalChunks - 1)
    };
  }

  private formatSize(bytes: number) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

export const mobileAgent = new MobileAgentService();
