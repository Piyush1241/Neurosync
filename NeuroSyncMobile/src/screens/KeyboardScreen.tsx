// src/screens/KeyboardScreen.tsx — JARVIS HUD theme

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
} from 'react-native';
import { sendCommand } from '../services/commandService';
import { Colors, Fonts, Spacing, Radius } from '../theme';
import { CornerBrackets, ScanlineOverlay, HudTopBar, HudDivider } from '../components/HudComponents';

const SPECIAL_KEYS = [
  { label: '⌫', value: 'backspace', color: Colors.red },
  { label: 'TAB', value: 'tab' },
  { label: 'ENTER', value: 'enter', color: Colors.cyan },
  { label: 'ESC', value: 'esc', color: Colors.red },
  { label: '▲', value: 'up' },
  { label: '▼', value: 'down' },
  { label: '◀', value: 'left' },
  { label: '▶', value: 'right' },
  { label: 'WIN', value: 'win', color: Colors.blue },
  { label: 'DEL', value: 'delete', color: Colors.red },
  { label: 'SPACE', value: 'space' },
  { label: 'CTRL+C', value: 'ctrl+c', color: Colors.amber },
  { label: 'CTRL+V', value: 'ctrl+v', color: Colors.amber },
  { label: 'CTRL+Z', value: 'ctrl+z', color: Colors.amber },
  { label: 'ALT+F4', value: 'alt+f4', color: Colors.red },
  { label: 'CTRL+A', value: 'ctrl+a', color: Colors.amber },
];

export default function KeyboardScreen({ navigation, route }: any) {
  const deviceId = route?.params?.device?.device_id ?? route?.params?.deviceId ?? '';
  const deviceName = deviceId || 'UNKNOWN';
  const [text, setText] = useState('');
  const [status, setStatus] = useState('READY');
  const [lastKey, setLastKey] = useState('—');

  const sendKey = async (key: string, label: string) => {
  try {
    setStatus('TRANSMITTING');
    setLastKey(label);
    if (key.includes('+')) {
      await sendCommand(deviceId, 'hotkey', { keys: key.split('+') });
    } else {
      await sendCommand(deviceId, 'press_key', { key });
    }
    setTimeout(() => setStatus('READY'), 800);
  } catch {
    setStatus('ERR: DEVICE UNREACHABLE');
  }
};

  const sendText = async () => {
  if (!text.trim()) return;
  try {
    setStatus(`TYPING: "${text}"`);
    await sendCommand(deviceId, 'type_text', { text });
    setText('');
    setTimeout(() => setStatus('READY'), 1000);
  } catch {
    setStatus('ERR: DEVICE UNREACHABLE');
  }
};

  return (
    <View style={styles.container}>
      <ScanlineOverlay />
      <CornerBrackets />

      <HudTopBar
        title="KEYBOARD"
        onBack={() => navigation.goBack()}
        rightLabel={deviceName}
        pulse
      />

      {/* Status row */}
      <View style={styles.statusRow}>
        <Text style={styles.statusLabel}>STATUS</Text>
        <Text style={styles.statusVal}>{status}</Text>
        <Text style={styles.statusLabel}>LAST KEY</Text>
        <Text style={[styles.statusVal, { color: Colors.cyan }]}>{lastKey}</Text>
      </View>

      <HudDivider />

      {/* Text input */}
      <Text style={styles.sectionLabel}>TYPE TEXT</Text>
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Enter text to type on PC..."
          placeholderTextColor={Colors.textMuted}
          value={text}
          onChangeText={setText}
          autoCapitalize="none"
        />
        <TouchableOpacity
          style={[styles.sendBtn, !text.trim() && styles.sendBtnDisabled]}
          onPress={sendText}
          disabled={!text.trim()}>
          <Text style={styles.sendBtnText}>TX</Text>
        </TouchableOpacity>
      </View>

      <HudDivider style={{ marginTop: Spacing.md }} />
      <Text style={styles.sectionLabel}>SPECIAL KEYS</Text>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.keyGrid}>
          {SPECIAL_KEYS.map(key => {
            const color = key.color ?? Colors.textPrimary;
            const borderColor = key.color ? `${key.color}44` : Colors.cyanBorder;
            return (
              <TouchableOpacity
                key={key.value}
                style={[styles.keyBtn, { borderColor }]}
                onPress={() => sendKey(key.value, key.label)}
                activeOpacity={0.7}>
                <View style={[styles.keyAccent, { backgroundColor: color }]} />
                <Text style={[styles.keyLabel, { color }]}>{key.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
    padding: Spacing.lg,
    paddingTop: 56,
  },

  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
    flexWrap: 'wrap',
  },
  statusLabel: {
    color: Colors.textMuted,
    fontSize: 9,
    letterSpacing: 2,
    fontFamily: Fonts.uiReg,
  },
  statusVal: {
    color: Colors.textSecondary,
    fontSize: 10,
    fontFamily: Fonts.hud,
    marginRight: Spacing.sm,
  },

  sectionLabel: {
    color: Colors.textMuted,
    fontSize: 9,
    letterSpacing: 3,
    fontFamily: Fonts.uiReg,
    marginBottom: Spacing.sm,
  },

  inputRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.sm },
  input: {
    flex: 1,
    backgroundColor: Colors.bgCard,
    borderWidth: 0.5,
    borderColor: Colors.cyanBorder,
    borderRadius: Radius.sm,
    padding: 12,
    color: Colors.textPrimary,
    fontSize: 13,
    fontFamily: Fonts.hud,
    letterSpacing: 0.5,
  },
  sendBtn: {
    backgroundColor: `${Colors.cyan}22`,
    borderWidth: 1,
    borderColor: Colors.cyan,
    borderRadius: Radius.sm,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: Colors.bgCard,
    borderColor: Colors.cyanBorder,
  },
  sendBtnText: {
    color: Colors.cyan,
    fontSize: 11,
    letterSpacing: 2,
    fontFamily: Fonts.ui,
  },

  keyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    paddingBottom: 40,
  },
  keyBtn: {
    backgroundColor: Colors.bgCard,
    borderWidth: 0.5,
    borderRadius: Radius.sm,
    paddingVertical: 13,
    paddingHorizontal: 12,
    minWidth: '22%',
    alignItems: 'center',
    overflow: 'hidden',
  },
  keyAccent: {
    position: 'absolute',
    left: 0, top: 0, bottom: 0,
    width: 2,
  },
  keyLabel: {
    fontSize: 11,
    letterSpacing: 1,
    fontFamily: Fonts.ui,
  },
});
