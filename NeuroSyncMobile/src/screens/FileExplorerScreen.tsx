import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, Alert, SafeAreaView, Modal, ProgressViewIOS, Platform
} from 'react-native';
import { Colors, Fonts, Spacing, Radius } from '../theme';
import { sendDeviceCommand } from '../services/api';
import FileEditorModal from '../components/FileEditorModal';
import FilePreviewModal from '../components/FilePreviewModal';

interface FileItem {
  name: string;
  path: string;
  type: 'folder' | 'file';
  size: string;
  size_bytes: number;
  modified: number;
  extension: string;
}

export default function FileExplorerScreen({ route, navigation }: any) {
  const device = route.params?.device || {};
  const deviceId = device.device_id || device.hostname;

  const [currentPath, setCurrentPath] = useState('~');
  const [parentPath, setParentPath] = useState('~');
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  const [showActionModal, setShowActionModal] = useState(false);
  const [showEditorModal, setShowEditorModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  // Transfer state
  const [transferring, setTransferring] = useState(false);
  const [transferProgress, setTransferProgress] = useState(0);
  const [transferStatusText, setTransferStatusText] = useState('');

  useEffect(() => {
    loadDirectory('~');
  }, []);

  const loadDirectory = async (dirPath: string) => {
    setLoading(true);
    try {
      const res = await sendDeviceCommand(deviceId, 'file_list_dir', { dir_path: dirPath });
      if (res && res.status === 'success') {
        setCurrentPath(res.current_path);
        setParentPath(res.parent_path);
        setFiles(res.entries || []);
      } else {
        Alert.alert('Directory Error', res?.message || 'Could not list files in directory.');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to connect to device filesystem');
    } finally {
      setLoading(false);
    }
  };

  const handleItemPress = (item: FileItem) => {
    if (item.type === 'folder') {
      loadDirectory(item.path);
    } else {
      setSelectedFile(item);
      setShowActionModal(true);
    }
  };

  const handleDownloadFile = async (item: FileItem) => {
    setShowActionModal(false);
    setTransferring(true);
    setTransferProgress(0);
    setTransferStatusText(`Downloading ${item.name}...`);

    try {
      // Step 1: Read Chunk 0 to get metadata
      const res0 = await sendDeviceCommand(deviceId, 'file_read_chunk', {
        file_path: item.path,
        chunk_index: 0,
      });

      if (!res0 || res0.status !== 'success') {
        throw new Error(res0?.message || 'Failed to read initial file chunk');
      }

      const totalChunks = res0.total_chunks;
      let downloadedChunks = 1;
      setTransferProgress(downloadedChunks / totalChunks);

      for (let i = 1; i < totalChunks; i++) {
        setTransferStatusText(`Downloading chunk ${i + 1}/${totalChunks}...`);
        const chunkRes = await sendDeviceCommand(deviceId, 'file_read_chunk', {
          file_path: item.path,
          chunk_index: i,
        });

        if (!chunkRes || chunkRes.status !== 'success') {
          throw new Error(`Failed to download chunk ${i}`);
        }
        downloadedChunks++;
        setTransferProgress(downloadedChunks / totalChunks);
      }

      setTransferring(false);
      Alert.alert(
        'Transfer Complete 🚀',
        `Successfully downloaded "${item.name}" (${item.size}) from remote desktop machine.`
      );
    } catch (err: any) {
      setTransferring(false);
      Alert.alert('Transfer Error', err.message || 'Failed to download file');
    }
  };

  const renderFileItem = ({ item }: { item: FileItem }) => {
    const isFolder = item.type === 'folder';
    const icon = isFolder ? '📁' : item.extension.match(/\.(png|jpg|jpeg|gif|svg)$/) ? '🖼️' : '📄';

    return (
      <TouchableOpacity
        style={s.fileCard}
        activeOpacity={0.7}
        onPress={() => handleItemPress(item)}
      >
        <Text style={s.fileIcon}>{icon}</Text>
        <View style={s.fileInfo}>
          <Text style={s.fileName} numberOfLines={1}>{item.name}</Text>
          <Text style={s.fileMeta}>
            {isFolder ? 'Folder' : item.size}
          </Text>
        </View>
        <Text style={s.arrowIcon}>›</Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Text style={s.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle} numberOfLines={1}>Remote File System</Text>
        <TouchableOpacity style={s.refreshBtn} onPress={() => loadDirectory(currentPath)}>
          <Text style={s.refreshText}>🔄</Text>
        </TouchableOpacity>
      </View>

      {/* Path Toolbar */}
      <View style={s.pathBar}>
        <TouchableOpacity
          style={s.upBtn}
          disabled={currentPath === parentPath}
          onPress={() => loadDirectory(parentPath)}
        >
          <Text style={[s.upText, currentPath === parentPath && { opacity: 0.3 }]}>⬆ Up</Text>
        </TouchableOpacity>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.pathScroll}>
          <Text style={s.pathText}>{currentPath}</Text>
        </ScrollView>
      </View>

      {/* File List */}
      {loading ? (
        <View style={s.loadingBox}>
          <ActivityIndicator size="large" color={Colors.cyan} />
          <Text style={s.loadingText}>Fetching remote filesystem...</Text>
        </View>
      ) : (
        <FlatList
          data={files}
          keyExtractor={(item) => item.path}
          renderItem={renderFileItem}
          contentContainerStyle={s.listContent}
          ListEmptyComponent={
            <View style={s.emptyBox}>
              <Text style={s.emptyText}>Empty Folder</Text>
            </View>
          }
        />
      )}

      {/* Item Action Modal */}
      <Modal visible={showActionModal} transparent animationType="fade" onRequestClose={() => setShowActionModal(false)}>
        <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setShowActionModal(false)}>
          <View style={s.actionCard}>
            <Text style={s.actionTitle} numberOfLines={1}>{selectedFile?.name}</Text>
            <Text style={s.actionMeta}>{selectedFile?.size} • {selectedFile?.path}</Text>

            <TouchableOpacity style={s.actionBtn} onPress={() => handleDownloadFile(selectedFile!)}>
              <Text style={s.actionIcon}>⚡</Text>
              <Text style={s.actionLabel}>Transfer / Download File</Text>
            </TouchableOpacity>

            <TouchableOpacity style={s.actionBtn} onPress={() => { setShowActionModal(false); setShowPreviewModal(true); }}>
              <Text style={s.actionIcon}>👁️</Text>
              <Text style={s.actionLabel}>Quick Preview</Text>
            </TouchableOpacity>

            <TouchableOpacity style={s.actionBtn} onPress={() => { setShowActionModal(false); setShowEditorModal(true); }}>
              <Text style={s.actionIcon}>✏️</Text>
              <Text style={s.actionLabel}>Remote File Editor</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[s.actionBtn, { marginTop: 10 }]} onPress={() => setShowActionModal(false)}>
              <Text style={[s.actionLabel, { color: Colors.red, textAlign: 'center', width: '100%' }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Transfer Progress Modal */}
      <Modal visible={transferring} transparent animationType="none">
        <View style={s.modalOverlay}>
          <View style={s.progressCard}>
            <ActivityIndicator size="large" color={Colors.magenta} />
            <Text style={s.progressTitle}>Chunked File Transfer</Text>
            <Text style={s.progressSub}>{transferStatusText}</Text>
            <View style={s.progressBg}>
              <View style={[s.progressFill, { width: `${Math.round(transferProgress * 100)}%` }]} />
            </View>
            <Text style={s.progressPct}>{Math.round(transferProgress * 100)}%</Text>
          </View>
        </View>
      </Modal>

      {/* File Editor Modal */}
      {selectedFile && (
        <FileEditorModal
          visible={showEditorModal}
          filePath={selectedFile.path}
          deviceId={deviceId}
          onClose={() => setShowEditorModal(false)}
        />
      )}

      {/* File Preview Modal */}
      {selectedFile && (
        <FilePreviewModal
          visible={showPreviewModal}
          filePath={selectedFile.path}
          deviceId={deviceId}
          onClose={() => setShowPreviewModal(false)}
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bgDark },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.bgCard,
    borderBottomWidth: 1,
    borderBottomColor: `${Colors.cyan}30`,
  },
  backBtn: { padding: Spacing.xs },
  backText: { color: Colors.cyan, fontFamily: Fonts.ui, fontSize: 14, fontWeight: '600' },
  headerTitle: { color: Colors.textPrimary, fontFamily: Fonts.heading, fontSize: 15, fontWeight: '700' },
  refreshBtn: { padding: Spacing.xs },
  refreshText: { fontSize: 16 },
  pathBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    backgroundColor: '#0d1017',
    borderBottomWidth: 1,
    borderBottomColor: `${Colors.cyan}20`,
  },
  upBtn: {
    backgroundColor: `${Colors.cyan}20`,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.xs,
    marginRight: 10,
  },
  upText: { color: Colors.cyan, fontFamily: Fonts.ui, fontSize: 11, fontWeight: '700' },
  pathScroll: { flex: 1 },
  pathText: { color: Colors.magenta, fontFamily: Fonts.mono, fontSize: 11 },
  loadingBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: Colors.cyan, fontFamily: Fonts.mono, fontSize: 12, marginTop: 12 },
  listContent: { padding: Spacing.md },
  fileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.md,
    padding: Spacing.sm + 2,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: `${Colors.cyan}20`,
  },
  fileIcon: { fontSize: 22, marginRight: 12 },
  fileInfo: { flex: 1 },
  fileName: { color: Colors.textPrimary, fontFamily: Fonts.ui, fontSize: 13, fontWeight: '600' },
  fileMeta: { color: Colors.textDim, fontFamily: Fonts.mono, fontSize: 10, marginTop: 2 },
  arrowIcon: { color: Colors.textDim, fontSize: 18 },
  emptyBox: { padding: 40, alignItems: 'center' },
  emptyText: { color: Colors.textDim, fontFamily: Fonts.mono, fontSize: 12 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.md,
  },
  actionCard: {
    width: '100%',
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.magenta,
  },
  actionTitle: { color: Colors.textPrimary, fontFamily: Fonts.heading, fontSize: 16, fontWeight: '700' },
  actionMeta: { color: Colors.textDim, fontFamily: Fonts.mono, fontSize: 10, marginBottom: 16 },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${Colors.violet}20`,
    padding: 12,
    borderRadius: Radius.sm,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: `${Colors.violet}40`,
  },
  actionIcon: { fontSize: 16, marginRight: 10 },
  actionLabel: { color: Colors.textPrimary, fontFamily: Fonts.ui, fontSize: 13, fontWeight: '600' },
  progressCard: {
    width: 280,
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.lg,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.cyan,
  },
  progressTitle: { color: Colors.textPrimary, fontFamily: Fonts.heading, fontSize: 14, fontWeight: '700', marginTop: 12 },
  progressSub: { color: Colors.textDim, fontFamily: Fonts.mono, fontSize: 10, marginVertical: 8, textAlign: 'center' },
  progressBg: { width: '100%', height: 6, backgroundColor: Colors.bgDark, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: Colors.magenta },
  progressPct: { color: Colors.cyan, fontFamily: Fonts.mono, fontSize: 12, marginTop: 8, fontWeight: '700' },
});
