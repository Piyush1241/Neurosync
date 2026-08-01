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
  if (item.type === 'folder') return Colors.pink;
  const colors: Record<string, string> = {
    pdf: Colors.red, txt: Colors.textPrimary, xlsx: Colors.green, xls: Colors.green,
    doc: Colors.purple, docx: Colors.purple, exe: Colors.orange, png: Colors.pink,
    jpg: Colors.pink, jpeg: Colors.pink, mp4: Colors.orange, mp3: Colors.purple,
    zip: Colors.orange, rar: Colors.orange,
  };
  return colors[item.extension?.toLowerCase()] || Colors.textMuted;
}

function EmptyDir() {
  return (
    <View style={styles.center}>
      <Text style={styles.emptyText}>{'// DIRECTORY EMPTY'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: Colors.bg},
  listContent: {paddingBottom: 40},

  header: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.bgSecondary,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
    paddingTop: 50, paddingBottom: 14, paddingHorizontal: 16,
  },
  backBtn: {paddingRight: 12},
  backText: {color: Colors.pink, fontSize: 20, fontWeight: '700'},
  headerCenter: {flex: 1, alignItems: 'center'},
  headerTitle: {color: Colors.pink, fontSize: 14, fontWeight: '700', letterSpacing: 4},
  headerSub: {color: Colors.textSecondary, fontSize: 10, letterSpacing: 2, marginTop: 2, fontFamily: Fonts.mono},
  addBtn: {borderWidth: 1, borderColor: Colors.pinkBorder, paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.md, backgroundColor: Colors.bgElevated},
  addText: {color: Colors.pink, fontSize: 11, letterSpacing: 2, fontWeight: '700'},

  pathBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.bgCard,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
    paddingHorizontal: 16, paddingVertical: 12,
  },
  pathLabel: {color: Colors.textMuted, fontSize: 9, letterSpacing: 3, fontFamily: Fonts.mono},
  pathText: {flex: 1, fontSize: 12, fontFamily: Fonts.mono, color: Colors.pink, fontWeight: '600'},

  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.bgCard,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
    paddingHorizontal: 16, paddingVertical: 10, gap: 10,
  },
  searchInput: {
    flex: 1, backgroundColor: Colors.bgInput,
    borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md,
    paddingHorizontal: 14, paddingVertical: 9,
    color: Colors.textPrimary, fontSize: 12, fontFamily: Fonts.mono, letterSpacing: 1,
  },
  searchBtn: {padding: 4},
  searchBtnText: {color: Colors.pink, fontSize: 18},
  sortBtn: {borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 10, paddingVertical: 8, borderRadius: Radius.md, backgroundColor: Colors.bgElevated},
  sortText: {color: Colors.textSecondary, fontSize: 10, letterSpacing: 1.5, fontWeight: '600'},

  countBar: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: Colors.divider,
  },
  countText: {color: Colors.textMuted, fontSize: 9, letterSpacing: 2, fontFamily: Fonts.mono},

  fileRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 14, paddingHorizontal: 16,
    backgroundColor: Colors.bg,
  },
  iconBox: {
    width: 42, height: 42, borderRadius: Radius.md,
    borderWidth: 1, backgroundColor: Colors.bgElevated,
    alignItems: 'center', justifyContent: 'center', marginRight: 14,
  },
  fileIcon: {fontSize: 18},
  fileInfo: {flex: 1},
  fileName: {color: Colors.textPrimary, fontSize: 14, fontWeight: '600'},
  fileMeta: {color: Colors.textSecondary, fontSize: 10, marginTop: 4, fontFamily: Fonts.mono, letterSpacing: 1},
  moreBtn: {padding: 8},
  moreText: {color: Colors.textMuted, fontSize: 20},
  separator: {height: 1, backgroundColor: Colors.divider, marginLeft: 72},

  center: {flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80},
  loadingText: {color: Colors.textSecondary, fontSize: 10, letterSpacing: 3, marginTop: 16, fontFamily: Fonts.mono},
  errorIcon: {color: Colors.orange, fontSize: 36, marginBottom: 12},
  errorText: {color: Colors.orange, fontSize: 11, letterSpacing: 2, fontFamily: Fonts.mono, textAlign: 'center', paddingHorizontal: 32, fontWeight: '600'},
  retryBtn: {marginTop: 20, borderWidth: 1, borderColor: Colors.pinkBorder, paddingHorizontal: 28, paddingVertical: 12, borderRadius: Radius.md, backgroundColor: Colors.bgElevated},
  retryText: {color: Colors.pink, fontSize: 12, letterSpacing: 3, fontWeight: '700'},
  emptyText: {color: Colors.textMuted, fontSize: 11, letterSpacing: 3, fontFamily: Fonts.mono},

  // Menu modal
  modalOverlay: {flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end'},
  menuSheet: {
    backgroundColor: Colors.bgCard,
    borderTopWidth: 1, borderTopColor: Colors.pinkBorder,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingBottom: 36, paddingHorizontal: 24, paddingTop: 14,
  },
  menuHandle: {width: 44, height: 4, backgroundColor: Colors.pinkBorder, borderRadius: 2, alignSelf: 'center', marginBottom: 18},
  menuTitle: {color: Colors.textPrimary, fontSize: 16, fontWeight: '700', marginBottom: 4},
  menuSub: {color: Colors.textSecondary, fontSize: 10, letterSpacing: 2, fontFamily: Fonts.mono, marginBottom: 18},
  menuItem: {paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: Colors.divider},
  menuItemText: {color: Colors.textPrimary, fontSize: 14, letterSpacing: 2, fontWeight: '600'},
  menuItemDanger: {color: Colors.red},
  menuCancel: {marginTop: 14, paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md, backgroundColor: Colors.bgElevated},
  menuCancelText: {color: Colors.textSecondary, fontSize: 12, letterSpacing: 3, fontWeight: '600'},

  // Input modal
  inputOverlay: {flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: 24},
  inputSheet: {
    width: '100%', backgroundColor: Colors.bgCard,
    borderWidth: 1, borderColor: Colors.pinkBorder, borderRadius: Radius.lg, padding: 24,
    shadowColor: Colors.pink, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 12,
  },
  inputTitle: {color: Colors.pink, fontSize: 13, letterSpacing: 4, fontWeight: '700', marginBottom: 18},
  inputField: {
    backgroundColor: Colors.bgInput, borderWidth: 1, borderColor: Colors.border,
    borderRadius: Radius.md, padding: 14, color: Colors.textPrimary,
    fontSize: 14, fontFamily: Fonts.mono, marginBottom: 24,
  },
  inputBtns: {flexDirection: 'row', gap: 14},
  inputCancel: {flex: 1, paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md, backgroundColor: Colors.bgElevated},
  inputCancelText: {color: Colors.textSecondary, fontSize: 12, letterSpacing: 2, fontWeight: '600'},
  inputConfirm: {flex: 1, paddingVertical: 14, alignItems: 'center', backgroundColor: Colors.pink, borderRadius: Radius.md},
  inputConfirmText: {color: '#FFFFFF', fontSize: 12, letterSpacing: 2, fontWeight: '700'},
});

export default function FileManagerScreen({route, navigation}: any) {
  const deviceId = route?.params?.deviceId;
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
              await sendCommand('rename_file', {path: fullPath(item.name), new_name: newName.trim()});
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
  inputConfirm: {flex: 1, paddingVertical: 12, alignItems: 'center', backgroundColor: '#00e5ff11', borderWidth: 1, borderColor: '#00e5ff', borderRadius: 4},
  inputConfirmText: {color: '#00e5ff', fontSize: 11, letterSpacing: 2, fontWeight: '700'},
});