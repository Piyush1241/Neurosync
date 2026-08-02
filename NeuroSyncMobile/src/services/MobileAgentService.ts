import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import RNFS from 'react-native-fs';

const WS_URL = 'wss://neurosync-4giu.onrender.com/ws';

class MobileAgentService {
  private ws: WebSocket | null = null;
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private deviceId: string = '';

  public async start() {
    if (this.ws) {
      this.stop();
    }

    const token = await AsyncStorage.getItem('auth_token');
    if (!token) return;

    // Generate a unique device ID for the mobile device
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
      // Attempt reconnect after 5 seconds
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

  private async listDir(dirPath: string) {
    const extStorage = RNFS.ExternalStorageDirectoryPath; // /storage/emulated/0 on Android
    const docPath = RNFS.DocumentDirectoryPath;
    const isAndroidExt = Platform.OS === 'android' && extStorage;
    const baseStorage = isAndroidExt ? extStorage : docPath;

    const isRoot = !dirPath || dirPath === '~' || dirPath === '/' || dirPath === 'ROOT' || dirPath.includes('Device Storage');

    let targetPath = dirPath;
    let displayPath = dirPath;

    if (isRoot) {
      targetPath = baseStorage;
      displayPath = '~';
    } else if (dirPath === 'Documents' || dirPath === '~/Documents' || dirPath === docPath) {
      targetPath = isAndroidExt ? `${extStorage}/Documents` : docPath;
      displayPath = '~/Documents';
    } else if (dirPath === 'Downloads' || dirPath === '~/Downloads' || dirPath.endsWith('/Downloads') || dirPath.endsWith('/Download')) {
      targetPath = isAndroidExt ? `${extStorage}/Download` : `${docPath}/Downloads`;
      displayPath = '~/Downloads';
    } else if (dirPath === 'Pictures' || dirPath === '~/Pictures' || dirPath === 'DCIM' || dirPath === '~/DCIM') {
      targetPath = isAndroidExt ? `${extStorage}/DCIM` : `${docPath}/Pictures`;
      displayPath = '~/Pictures';
    } else if (dirPath === 'Desktop' || dirPath === '~/Desktop') {
      targetPath = isAndroidExt ? `${extStorage}/Desktop` : docPath;
      displayPath = '~/Desktop';
    } else if (dirPath.startsWith('~')) {
      const rel = dirPath.substring(1);
      targetPath = `${baseStorage}${rel}`;
      displayPath = dirPath;
    } else if (dirPath.startsWith(baseStorage)) {
      const rel = dirPath.substring(baseStorage.length);
      displayPath = rel ? `~${rel}` : '~';
    }

    // Ensure directory exists if it's a standard subfolder
    try {
      if (!(await RNFS.exists(targetPath))) {
        await RNFS.mkdir(targetPath);
      }
    } catch {}

    let items: any[] = [];
    try {
      items = await RNFS.readDir(targetPath);
    } catch (e: any) {
      return { status: 'error', message: `Access Denied: ${e.message || 'Cannot access directory'}` };
    }

    const entries = items.map(item => ({
      name: item.name,
      path: item.path.startsWith(baseStorage) ? `~${item.path.substring(baseStorage.length)}` : item.path,
      type: item.isDirectory() ? 'folder' : 'file',
      size: item.isDirectory() ? '—' : this.formatSize(item.size),
      size_bytes: item.size,
      modified: item.mtime?.getTime() || Date.now(),
      extension: item.name.includes('.') ? `.${item.name.split('.').pop()}` : ''
    }));

    // Sort: folders first, then alphabetical
    entries.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

    const isTop = targetPath === baseStorage || displayPath === '~';
    let parentPath = '~';
    if (!isTop) {
      const lastSlash = displayPath.lastIndexOf('/');
      parentPath = lastSlash > 0 ? displayPath.substring(0, lastSlash) : '~';
    }

    return {
      status: 'success',
      current_path: targetPath,
      display_path: displayPath,
      parent_path: parentPath,
      entries: entries
    };
  }

  private async readText(filePath: string) {
    if (!(await RNFS.exists(filePath))) return { status: 'error', message: 'File not found' };
    const content = await RNFS.readFile(filePath, 'utf8');
    return { status: 'success', content };
  }

  private async saveText(filePath: string, content: string) {
    await RNFS.writeFile(filePath, content, 'utf8');
    return { status: 'success' };
  }

  private async readChunk(filePath: string, chunkIndex: number) {
    const target = filePath === '~' ? RNFS.DocumentDirectoryPath : filePath;
    if (!(await RNFS.exists(target))) return { status: 'error', message: 'File not found' };

    const stat = await RNFS.stat(target);
    const CHUNK_SIZE = 512 * 1024; // 512KB
    const totalSize = parseInt(stat.size.toString(), 10);
    const totalChunks = Math.ceil(totalSize / CHUNK_SIZE) || 1;

    if (chunkIndex < 0 || chunkIndex >= totalChunks) {
      return { status: 'error', message: 'Chunk out of bounds' };
    }

    const offset = chunkIndex * CHUNK_SIZE;
    const lengthToRead = Math.min(CHUNK_SIZE, totalSize - offset);
    
    const chunkB64 = await RNFS.read(target, lengthToRead, offset, 'base64');

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
