import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity, Image,
  ActivityIndicator, Alert, ScrollView, SafeAreaView,
} from 'react-native';
import { Colors, Fonts, Spacing, Radius } from '../theme';
import { sendCommand } from '../services/commandService';

interface Props {
  visible: boolean;
  filePath: string;
  deviceId: string;
  onClose: () => void;
}

export default function FilePreviewModal({ visible, filePath, deviceId, onClose }: Props) {
  const [loading, setLoading] = useState(true);
  const [previewData, setPreviewData] = useState<any>(null);

  useEffect(() => {
    if (visible && filePath) {
      loadPreview();
    }
  }, [visible, filePath]);

  const loadPreview = async () => {
    setLoading(true);
    try {
      const res = await sendCommand(deviceId, 'file_get_preview', { file_path: filePath });
      if (res && res.status === 'success') {
        setPreviewData(res);
      } else {
        Alert.alert('Preview Unavailable', res?.message || 'Could not preview file format.');
        onClose();
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to fetch preview');
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const fileName = filePath ? filePath.split('/').pop()?.split('\\').pop() : 'Preview';

  return (
    <Modal visible={visible} animationType="fade" transparent={false} onRequestClose={onClose}>
      <SafeAreaView style={s.container}>
        {/* Header */}
        <View style={s.header}>
          <Text style={s.title} numberOfLines={1}>{fileName}</Text>
          <TouchableOpacity onPress={onClose} style={s.closeBtn}>
            <Text style={s.closeText}>✕ Close</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={s.loadingBox}>
            <ActivityIndicator size="large" color={Colors.cyan} />
            <Text style={s.loadingText}>Loading desktop preview...</Text>
          </View>
        ) : previewData?.preview_type === 'image' ? (
          <View style={s.imageBox}>
            <Image
              source={{ uri: `data:${previewData.mime_type};base64,${previewData.base64}` }}
              style={s.previewImage}
              resizeMode="contain"
            />
          </View>
        ) : previewData?.preview_type === 'text' ? (
          <ScrollView style={s.textScroll} contentContainerStyle={{ padding: Spacing.md }}>
            <Text style={s.previewText}>{previewData.text}</Text>
          </ScrollView>
        ) : (
          <View style={s.loadingBox}>
            <Text style={s.loadingText}>No preview available</Text>
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: `${Colors.cyan}30`,
    backgroundColor: Colors.bgCard,
  },
  title: { flex: 1, color: Colors.textPrimary, fontFamily: Fonts.display, fontSize: 14, fontWeight: '700' },
  closeBtn: { padding: Spacing.sm, backgroundColor: `${Colors.red}20`, borderRadius: Radius.sm, paddingHorizontal: 8 },
  closeText: { color: Colors.red, fontFamily: Fonts.ui, fontSize: 12, fontWeight: '700' },
  loadingBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: Colors.cyan, fontFamily: Fonts.mono, fontSize: 12, marginTop: 12 },
  imageBox: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.md },
  previewImage: { width: '100%', height: '100%' },
  textScroll: { flex: 1, backgroundColor: '#090b0e' },
  previewText: { color: Colors.textPrimary, fontFamily: Fonts.mono, fontSize: 12, lineHeight: 18 },
});
