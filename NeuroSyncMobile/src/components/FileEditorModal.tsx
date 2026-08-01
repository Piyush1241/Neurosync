import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, Modal, TextInput, TouchableOpacity,
  ActivityIndicator, Alert, ScrollView, SafeAreaView,
} from 'react-native';
import { Colors, Fonts, Spacing, Radius } from '../theme';
import { sendCommand } from '../services/commandService';

interface Props {
  visible: boolean;
  filePath: string;
  deviceId: string;
  onClose: () => void;
  onSaved?: () => void;
}

export default function FileEditorModal({ visible, filePath, deviceId, onClose, onSaved }: Props) {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible && filePath) {
      loadFile();
    }
  }, [visible, filePath]);

  const loadFile = async () => {
    setLoading(true);
    try {
      const res = await sendCommand(deviceId, 'file_read_text', { file_path: filePath });
      if (res && res.status === 'success') {
        setContent(res.content || '');
      } else {
        Alert.alert('Error Reading File', res?.message || 'Could not load text content.');
        onClose();
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to read file');
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await sendCommand(deviceId, 'file_save_text', {
        file_path: filePath,
        content: content,
      });
      if (res && res.status === 'success') {
        Alert.alert('Saved', 'File updated successfully on remote desktop machine.');
        if (onSaved) onSaved();
        onClose();
      } else {
        Alert.alert('Save Failed', res?.message || 'Could not save file to desktop.');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to save file');
    } finally {
      setSaving(false);
    }
  };

  const fileName = filePath ? filePath.split('/').pop()?.split('\\').pop() : 'Editor';

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <SafeAreaView style={s.container}>
        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity onPress={onClose} style={s.closeBtn}>
            <Text style={s.closeText}>Cancel</Text>
          </TouchableOpacity>
          <View style={s.titleContainer}>
            <Text style={s.title} numberOfLines={1}>{fileName}</Text>
            <Text style={s.subTitle} numberOfLines={1}>{filePath}</Text>
          </View>
          <TouchableOpacity onPress={handleSave} disabled={saving || loading} style={s.saveBtn}>
            {saving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={s.saveText}>Save Remote</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Content Body */}
        {loading ? (
          <View style={s.loadingBox}>
            <ActivityIndicator size="large" color={Colors.cyan} />
            <Text style={s.loadingText}>Fetching remote desktop file...</Text>
          </View>
        ) : (
          <TextInput
            style={s.editorInput}
            multiline
            value={content}
            onChangeText={setContent}
            autoCapitalize="none"
            autoCorrect={false}
            spellCheck={false}
            textAlignVertical="top"
          />
        )}
      </SafeAreaView>
    </Modal>
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
    borderBottomWidth: 1,
    borderBottomColor: `${Colors.cyan}30`,
    backgroundColor: Colors.bgCard,
  },
  closeBtn: { padding: Spacing.xs },
  closeText: { color: Colors.textDim, fontFamily: Fonts.ui, fontSize: 14 },
  titleContainer: { flex: 1, alignItems: 'center', marginHorizontal: Spacing.sm },
  title: { color: Colors.textPrimary, fontFamily: Fonts.heading, fontSize: 14, fontWeight: '700' },
  subTitle: { color: Colors.textDim, fontFamily: Fonts.mono, fontSize: 10 },
  saveBtn: {
    backgroundColor: Colors.magenta,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radius.sm,
  },
  saveText: { color: '#ffffff', fontFamily: Fonts.ui, fontSize: 12, fontWeight: '700' },
  loadingBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: Colors.cyan, fontFamily: Fonts.mono, fontSize: 12, marginTop: 12 },
  editorInput: {
    flex: 1,
    padding: Spacing.md,
    color: Colors.textPrimary,
    fontFamily: Fonts.mono,
    fontSize: 13,
    lineHeight: 20,
    backgroundColor: Colors.bgDark,
  },
});
