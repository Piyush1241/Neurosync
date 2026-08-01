/* eslint-disable */
import React, {useState, useEffect, useCallback} from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, Alert, StatusBar, ActivityIndicator,
  TextInput, Modal,
} from 'react-native';
import {api} from '../services/apiClient';

interface FileItem {
  name: string;
  type: 'folder' | 'file';
  size: string;
  modified: string;
  extension: string;
}

function getFileIcon(item: FileItem): string {
  if (item.type === 'folder') return '▣';
  const icons: Record<string, string> = {
    pdf: '⬡', txt: '≡', xlsx: '⊞', xls: '⊞',
    doc: '⊟', docx: '⊟', exe: '⚙', png: '⬡',
    jpg: '⬡', jpeg: '⬡', mp4: '▶', mp3: '♪',
    zip: '⊛', rar: '⊛',
  };
  return icons[item.extension?.toLowerCase()] || '◈';
}

function getIconColor(item: FileItem): string {
  if (item.type === 'folder') return '#FC1FF9';
  const colors: Record<string, string> = {
    pdf: '#E42536', txt: '#A8A8B3', xlsx: '#00FF88', xls: '#00FF88',
    doc: '#00E5FF', docx: '#00E5FF', exe: '#FC5E31', png: '#BC0EEF',
    jpg: '#BC0EEF', jpeg: '#BC0EEF', mp4: '#FC5E31', mp3: '#FC1FF9',
    zip: '#FC5E31', rar: '#FC5E31',
  };
  return colors[item.extension?.toLowerCase()] || '#6D6D78';
}

function EmptyDir() {
  return (
    <View style={styles.center}>
      <Text style={styles.emptyText}>{'// DIRECTORY EMPTY'}</Text>
    </View>
  );
}

export default function FileManagerScreen({route, navigation}: any) {
  const device = route.params?.device || {};
  const deviceId = device.id || device.device_id || route?.params?.deviceId || '';
  const [files, setFiles] = useState<FileItem[]>([]);
  const [currentPath, setCurrentPath] = useState('~');
  const [pathHistory, setPathHistory] = useState<string[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [selectedItem, setSelectedItem] = useState<FileItem | null>(null);
  const [menuVisible, setMenuVisible] = useState(false);
  const [inputModal, setInputModal] = useState<{visible: boolean; title: string; placeholder: string; onSubmit: (val: string) => void}>({visible: false, title: '', placeholder: '', onSubmit: () => {}});
  const [inputValue, setInputValue] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'size' | 'date'>('name');
  const [sortAsc, setSortAsc] = useState(true);

  const sendCommand = async (command: string, args: object) => {
    const response = await api.post(`/api/v1/devices/${deviceId}/command`, {command, args});
    return response.data?.result || response.data;
  };

  const fetchFiles = useCallback(async (path: string) => {
    setError('');
    setLoading(true);
    try {
      const data = await sendCommand('list_files', {path});
      if (Array.isArray(data)) setFiles(data);
      else { setError('INVALID RESPONSE FROM DEVICE'); setFiles([]); }
    } catch {
      setError('DEVICE UNREACHABLE — PULL TO RETRY');
      setFiles([]);
    } finally {
      setLoading(false);
    }
  }, [deviceId]);

  useEffect(() => { fetchFiles(currentPath); }, [currentPath, fetchFiles]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchFiles(currentPath);
    setRefreshing(false);
  };

  // Sort + filter
  const displayFiles = [...files]
    .filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      // Folders first
      if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
      let cmp = 0;
      if (sortBy === 'name') cmp = a.name.localeCompare(b.name);
      else if (sortBy === 'date') cmp = a.modified.localeCompare(b.modified);
      else if (sortBy === 'size') cmp = a.size.localeCompare(b.size);
      return sortAsc ? cmp : -cmp;
    });

  const openInputModal = (title: string, placeholder: string, onSubmit: (val: string) => void) => {
    setInputValue('');
    setInputModal({visible: true, title, placeholder, onSubmit});
  };

  const fullPath = (name: string) => `${currentPath}/${name}`;

  // --- Actions ---
  const handleOpen = (item: FileItem) => {
    if (item.type === 'folder') {
      setPathHistory(prev => [...prev, currentPath]);
      setCurrentPath(fullPath(item.name));
    } else {
      setSelectedItem(item);
      setMenuVisible(true);
    }
  };

  const handleOpenOnPC = async (item: FileItem) => {
    Alert.alert(
      'OPEN FILE',
      `Open "${item.name}" on the remote PC?`,
      [
        {text: 'CANCEL', style: 'cancel'},
        {text: 'OPEN', onPress: async () => {
          try {
            await sendCommand('open_file', {path: fullPath(item.name)});
            Alert.alert('SUCCESS', `Opening ${item.name} on remote PC`);
          } catch { Alert.alert('ERROR', 'Could not open file'); }
          setMenuVisible(false);
        }},
      ]
    );
  };

  const handleDelete = (item: FileItem) => {
    Alert.alert(
      '⚠ DELETE',
      `Permanently delete "${item.name}"? This cannot be undone.`,
      [
        {text: 'CANCEL', style: 'cancel'},
        {text: 'DELETE', style: 'destructive', onPress: async () => {
          try {
            await sendCommand('delete_file', {path: fullPath(item.name)});
            setFiles(prev => prev.filter(f => f.name !== item.name));
            Alert.alert('DELETED', `"${item.name}" has been deleted`);
          } catch { Alert.alert('ERROR', 'Could not delete file'); }
          setMenuVisible(false);
        }},
      ]
    );
  };

  const handleRename = (item: FileItem) => {
    setMenuVisible(false);
    openInputModal('RENAME', 'New name...', async (newName) => {
      if (!newName.trim()) return;
      Alert.alert(
        'RENAME',
        `Rename "${item.name}" to "${newName}"?`,
        [
          {text: 'CANCEL', style: 'cancel'},
          {text: 'RENAME', onPress: async () => {
            try {
              const oldP = fullPath(item.name);
              const newP = fullPath(newName.trim());
              await sendCommand('rename_file', {old_path: oldP, new_path: newP});
              await fetchFiles(currentPath);
              Alert.alert('SUCCESS', 'File renamed successfully');
            } catch { Alert.alert('ERROR', 'Could not rename file'); }
          }},
        ]
      );
    });
  };

  const handleCopy = (item: FileItem) => {
    setMenuVisible(false);
    openInputModal('COPY TO PATH', 'Destination path...', async (destPath) => {
      if (!destPath.trim()) return;
      Alert.alert(
        'COPY',
        `Copy "${item.name}" to "${destPath}"?`,
        [
          {text: 'CANCEL', style: 'cancel'},
          {text: 'COPY', onPress: async () => {
            try {
              await sendCommand('copy_file', {src: fullPath(item.name), dest: destPath.trim()});
              Alert.alert('SUCCESS', 'File copied successfully');
            } catch { Alert.alert('ERROR', 'Could not copy file'); }
          }},
        ]
      );
    });
  };

  const handleMove = (item: FileItem) => {
    setMenuVisible(false);
    openInputModal('MOVE TO PATH', 'Destination path...', async (destPath) => {
      if (!destPath.trim()) return;
      Alert.alert(
        'MOVE',
        `Move "${item.name}" to "${destPath}"?`,
        [
          {text: 'CANCEL', style: 'cancel'},
          {text: 'MOVE', onPress: async () => {
            try {
              await sendCommand('move_file', {src: fullPath(item.name), dest: destPath.trim()});
              await fetchFiles(currentPath);
              Alert.alert('SUCCESS', 'File moved successfully');
            } catch { Alert.alert('ERROR', 'Could not move file'); }
          }},
        ]
      );
    });
  };

  const handleDownload = (item: FileItem) => {
    Alert.alert(
      'DOWNLOAD',
      `Download "${item.name}" to your phone?`,
      [
        {text: 'CANCEL', style: 'cancel'},
        {text: 'DOWNLOAD', onPress: async () => {
          try {
            await sendCommand('download_file', {path: fullPath(item.name)});
            Alert.alert('SUCCESS', 'Download started');
          } catch { Alert.alert('ERROR', 'Could not download file'); }
          setMenuVisible(false);
        }},
      ]
    );
  };

  const handleNewFolder = () => {
    openInputModal('NEW FOLDER', 'Folder name...', async (name) => {
      if (!name.trim()) return;
      Alert.alert(
        'CREATE FOLDER',
        `Create folder "${name}" here?`,
        [
          {text: 'CANCEL', style: 'cancel'},
          {text: 'CREATE', onPress: async () => {
            try {
              await sendCommand('create_folder', {path: `${currentPath}/${name.trim()}`});
              await fetchFiles(currentPath);
            } catch { Alert.alert('ERROR', 'Could not create folder'); }
          }},
        ]
      );
    });
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const data = await sendCommand('search_files', {path: currentPath, query: searchQuery.trim()});
      if (Array.isArray(data)) setFiles(data);
    } catch { Alert.alert('ERROR', 'Search failed'); }
    finally { setSearching(false); }
  };

  const handleBack = () => {
    if (pathHistory.length > 0) {
      const prev = pathHistory[pathHistory.length - 1];
      setPathHistory(h => h.slice(0, -1));
      setCurrentPath(prev);
    } else {
      navigation.goBack();
    }
  };

  const cycleSortBy = () => {
    const order: ('name' | 'size' | 'date')[] = ['name', 'size', 'date'];
    const next = order[(order.indexOf(sortBy) + 1) % order.length];
    setSortBy(next);
  };

  const renderItem = ({item}: {item: FileItem}) => (
    <TouchableOpacity
      style={styles.fileRow}
      onPress={() => handleOpen(item)}
      onLongPress={() => { setSelectedItem(item); setMenuVisible(true); }}
      activeOpacity={0.7}>
      <View style={[styles.iconBox, {borderColor: getIconColor(item) + '44'}]}>
        <Text style={[styles.fileIcon, {color: getIconColor(item)}]}>{getFileIcon(item)}</Text>
      </View>
      <View style={styles.fileInfo}>
        <Text style={styles.fileName} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.fileMeta}>
          {item.type === 'folder' ? 'DIR' : item.size} · {item.modified}
        </Text>
      </View>
      <TouchableOpacity
        style={styles.moreBtn}
        onPress={() => { setSelectedItem(item); setMenuVisible(true); }}>
        <Text style={styles.moreText}>⋮</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const pathParts = currentPath.split('/').filter(Boolean);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#080c12" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>FILE MANAGER</Text>
          <Text style={styles.headerSub}>{'// REMOTE FILESYSTEM'}</Text>
        </View>
        <TouchableOpacity onPress={handleNewFolder} style={styles.addBtn}>
          <Text style={styles.addText}>+ DIR</Text>
        </TouchableOpacity>
      </View>

      {/* Path bar */}
      <View style={styles.pathBar}>
        <Text style={styles.pathLabel}>PATH </Text>
        <Text style={styles.pathText} numberOfLines={1}>
          {pathParts.length > 0 ? pathParts.join(' / ') : '~'}
        </Text>
      </View>

      {/* Search + Sort bar */}
      <View style={styles.searchBar}>
        <TextInput
          style={styles.searchInput}
          placeholder="SEARCH FILES..."
          placeholderTextColor="#3a5a6a"
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
        />
        {searching
          ? <ActivityIndicator color="#00e5ff" size="small" style={{marginLeft: 8}} />
          : <TouchableOpacity onPress={handleSearch} style={styles.searchBtn}>
              <Text style={styles.searchBtnText}>⌕</Text>
            </TouchableOpacity>
        }
        <TouchableOpacity onPress={cycleSortBy} style={styles.sortBtn}>
          <Text style={styles.sortText}>{sortBy.toUpperCase()} {sortAsc ? '↑' : '↓'}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setSortAsc(a => !a)} style={styles.sortBtn}>
          <Text style={styles.sortText}>⇅</Text>
        </TouchableOpacity>
      </View>

      {/* File count */}
      <View style={styles.countBar}>
        <Text style={styles.countText}>
          {displayFiles.length} ITEM{displayFiles.length !== 1 ? 'S' : ''}
          {searchQuery ? ` MATCHING "${searchQuery.toUpperCase()}"` : ''}
        </Text>
        <TouchableOpacity onPress={onRefresh}>
          <Text style={styles.countText}>⟳ REFRESH</Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color="#00e5ff" size="large" />
          <Text style={styles.loadingText}>SCANNING FILESYSTEM...</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorIcon}>⚠</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => fetchFiles(currentPath)}>
            <Text style={styles.retryText}>RETRY</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={displayFiles}
          keyExtractor={(item, i) => item.name + i}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00e5ff" />}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={<EmptyDir />}
          contentContainerStyle={styles.listContent}
        />
      )}

      {/* File action menu modal */}
      <Modal visible={menuVisible} transparent animationType="slide" onRequestClose={() => setMenuVisible(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setMenuVisible(false)}>
          <View style={styles.menuSheet}>
            <View style={styles.menuHandle} />
            <Text style={styles.menuTitle} numberOfLines={1}>{selectedItem?.name}</Text>
            <Text style={styles.menuSub}>{selectedItem?.type === 'folder' ? 'DIRECTORY' : selectedItem?.size}</Text>

            {[
              {label: '▶  OPEN ON PC',   action: () => selectedItem && handleOpenOnPC(selectedItem)},
              {label: '⬇  DOWNLOAD',     action: () => selectedItem && handleDownload(selectedItem)},
              {label: '✎  RENAME',       action: () => selectedItem && handleRename(selectedItem)},
              {label: '⊕  COPY TO...',   action: () => selectedItem && handleCopy(selectedItem)},
              {label: '⇢  MOVE TO...',   action: () => selectedItem && handleMove(selectedItem)},
              {label: '✕  DELETE',       action: () => selectedItem && handleDelete(selectedItem), danger: true},
            ].map(({label, action, danger}) => (
              <TouchableOpacity key={label} style={styles.menuItem} onPress={action}>
                <Text style={[styles.menuItemText, danger && styles.menuItemDanger]}>{label}</Text>
              </TouchableOpacity>
            ))}

            <TouchableOpacity style={styles.menuCancel} onPress={() => setMenuVisible(false)}>
              <Text style={styles.menuCancelText}>CANCEL</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Input modal (rename / copy / move / new folder) */}
      <Modal visible={inputModal.visible} transparent animationType="fade" onRequestClose={() => setInputModal(m => ({...m, visible: false}))}>
        <View style={styles.inputOverlay}>
          <View style={styles.inputSheet}>
            <Text style={styles.inputTitle}>{inputModal.title}</Text>
            <TextInput
              style={styles.inputField}
              placeholder={inputModal.placeholder}
              placeholderTextColor="#3a5a6a"
              value={inputValue}
              onChangeText={setInputValue}
              autoFocus
            />
            <View style={styles.inputBtns}>
              <TouchableOpacity
                style={styles.inputCancel}
                onPress={() => setInputModal(m => ({...m, visible: false}))}>
                <Text style={styles.inputCancelText}>CANCEL</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.inputConfirm}
                onPress={() => {
                  setInputModal(m => ({...m, visible: false}));
                  inputModal.onSubmit(inputValue);
                }}>
                <Text style={styles.inputConfirmText}>CONFIRM</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#09090B'},
  listContent: {paddingBottom: 40},

  header: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#09090B',
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)',
    paddingTop: 50, paddingBottom: 12, paddingHorizontal: 16,
  },
  backBtn: {paddingRight: 12},
  backText: {color: '#FC1FF9', fontSize: 24, fontWeight: 'bold'},
  headerCenter: {flex: 1, alignItems: 'center'},
  headerTitle: {color: '#FC1FF9', fontSize: 14, fontWeight: '700', letterSpacing: 4},
  headerSub: {color: '#A8A8B3', fontSize: 9, letterSpacing: 2, marginTop: 2},
  addBtn: {borderWidth: 1, borderColor: '#FC1FF9', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 8, backgroundColor: 'rgba(252,31,249,0.12)'},
  addText: {color: '#FC1FF9', fontSize: 10, letterSpacing: 2, fontWeight: '600'},

  pathBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#17181D',
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 16, paddingVertical: 10,
  },
  pathLabel: {color: '#6D6D78', fontSize: 8, letterSpacing: 3, fontFamily: 'monospace'},
  pathText: {flex: 1, fontSize: 11, fontFamily: 'monospace', color: '#FC1FF9', fontWeight: '600'},

  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#17181D',
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 16, paddingVertical: 8, gap: 8,
  },
  searchInput: {
    flex: 1, backgroundColor: '#1F2026',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 8,
    color: '#FFFFFF', fontSize: 11, fontFamily: 'monospace', letterSpacing: 1,
  },
  searchBtn: {padding: 4},
  searchBtnText: {color: '#FC1FF9', fontSize: 18},
  sortBtn: {borderWidth: 1, borderColor: 'rgba(252,31,249,0.3)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: '#1F2026'},
  sortText: {color: '#A8A8B3', fontSize: 9, letterSpacing: 1, fontWeight: '600'},

  countBar: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  countText: {color: '#6D6D78', fontSize: 9, letterSpacing: 2, fontFamily: 'monospace'},

  fileRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 12, paddingHorizontal: 16,
  },
  iconBox: {
    width: 40, height: 40, borderRadius: 10,
    borderWidth: 1, backgroundColor: '#1F2026', borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  fileIcon: {fontSize: 16},
  fileInfo: {flex: 1},
  fileName: {color: '#FFFFFF', fontSize: 14, fontWeight: '600'},
  fileMeta: {color: '#A8A8B3', fontSize: 10, marginTop: 3, fontFamily: 'monospace', letterSpacing: 1},
  moreBtn: {padding: 8},
  moreText: {color: '#6D6D78', fontSize: 20},
  separator: {height: 1, backgroundColor: 'rgba(255,255,255,0.05)', marginLeft: 68},

  center: {flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80},
  loadingText: {color: '#A8A8B3', fontSize: 10, letterSpacing: 3, marginTop: 16, fontFamily: 'monospace'},
  errorIcon: {color: '#FC5E31', fontSize: 32, marginBottom: 12},
  errorText: {color: '#FC5E31', fontSize: 10, letterSpacing: 2, fontFamily: 'monospace', textAlign: 'center', paddingHorizontal: 32},
  retryBtn: {marginTop: 20, borderWidth: 1, borderColor: '#FC1FF9', paddingHorizontal: 24, paddingVertical: 10, borderRadius: 10, backgroundColor: 'rgba(252,31,249,0.12)'},
  retryText: {color: '#FC1FF9', fontSize: 11, letterSpacing: 3, fontWeight: 'bold'},
  emptyText: {color: '#6D6D78', fontSize: 11, letterSpacing: 3, fontFamily: 'monospace'},

  // Menu modal
  modalOverlay: {flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end'},
  menuSheet: {
    backgroundColor: '#17181D',
    borderTopWidth: 1, borderTopColor: 'rgba(252,31,249,0.3)',
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingBottom: 34, paddingHorizontal: 20, paddingTop: 14,
  },
  menuHandle: {width: 40, height: 4, backgroundColor: 'rgba(252,31,249,0.4)', borderRadius: 2, alignSelf: 'center', marginBottom: 16},
  menuTitle: {color: '#FFFFFF', fontSize: 16, fontWeight: '700', marginBottom: 4},
  menuSub: {color: '#A8A8B3', fontSize: 10, letterSpacing: 2, fontFamily: 'monospace', marginBottom: 16},
  menuItem: {paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)'},
  menuItemText: {color: '#FFFFFF', fontSize: 13, letterSpacing: 2, fontWeight: '600'},
  menuItemDanger: {color: '#E42536'},
  menuCancel: {marginTop: 14, paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 10, backgroundColor: '#1F2026'},
  menuCancelText: {color: '#A8A8B3', fontSize: 12, letterSpacing: 3, fontWeight: '600'},

  // Input modal
  inputOverlay: {flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: 24},
  inputSheet: {
    width: '100%', backgroundColor: '#17181D',
    borderWidth: 1, borderColor: 'rgba(252,31,249,0.3)', borderRadius: 16, padding: 24,
    shadowColor: '#FC1FF9', shadowOffset: {width: 0, height: 10}, shadowOpacity: 0.3, shadowRadius: 20, elevation: 10,
  },
  inputTitle: {color: '#FC1FF9', fontSize: 13, letterSpacing: 4, fontWeight: '700', marginBottom: 16},
  inputField: {
    backgroundColor: '#1F2026', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 10, padding: 14, color: '#FFFFFF',
    fontSize: 13, fontFamily: 'monospace', marginBottom: 20,
  },
  inputBtns: {flexDirection: 'row', gap: 12},
  inputCancel: {flex: 1, paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 10, backgroundColor: '#1F2026'},
  inputCancelText: {color: '#A8A8B3', fontSize: 11, letterSpacing: 2, fontWeight: '600'},
  inputConfirm: {flex: 1, paddingVertical: 14, alignItems: 'center', backgroundColor: '#FC1FF9', borderRadius: 10},
  inputConfirmText: {color: '#FFFFFF', fontSize: 11, letterSpacing: 2, fontWeight: '700'},
});