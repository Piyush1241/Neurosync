// src/screens/RemoteDashboardScreen.tsx — JARVIS HUD theme

import React, {useState} from 'react';
import {View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert} from 'react-native';
import {sendCommand} from '../services/commandService';
import {Colors, Fonts, Spacing, Radius} from '../theme';
import {CornerBrackets, ScanlineOverlay, HudTopBar, HudDivider} from '../components/HudComponents';

interface Command {
  label: string;
  action: string;
  icon: string;
  color?: string;
}

const LAUNCH_COMMANDS: Command[] = [
  // Browsers
  {label: 'Open Chrome', action: 'open_chrome', icon: '🌐', color: Colors.amber},
  {label: 'Open Firefox', action: 'open_firefox', icon: '🦊', color: Colors.orange},
  {label: 'Open Edge', action: 'open_edge', icon: '🌊', color: Colors.blue},

  // Editors & IDEs
  {label: 'Open VS Code', action: 'open_vscode', icon: '💻', color: Colors.blue},
  {label: 'Open Notepad', action: 'open_notepad', icon: '📝', color: Colors.cyan},
  {label: 'Open Sublime Text', action: 'open_sublime', icon: '⚡', color: Colors.orange},
  {label: 'Open PyCharm', action: 'open_pycharm', icon: '🐍', color: Colors.pink},

  // Office & Utilities
  {label: 'Open Terminal', action: 'open_terminal', icon: '🖥', color: Colors.pink},
  {label: 'Open Calculator', action: 'open_calculator', icon: '🧮', color: Colors.cyan},
  {label: 'Open Excel', action: 'open_excel', icon: '📊', color: Colors.green},
  {label: 'Open Word', action: 'open_word', icon: '📄', color: Colors.blue},

  // Media
  {label: 'Open Spotify', action: 'open_spotify', icon: '🎵', color: Colors.green},
  {label: 'Open VLC', action: 'open_vlc', icon: '🎬', color: Colors.orange},
];

const POWER_COMMANDS: Command[] = [
  {label: 'Lock Screen', action: 'lock_screen', icon: '🔒', color: Colors.red},
  {label: 'Show Desktop', action: 'show_desktop', icon: '🖥', color: Colors.amber},
];

function CommandBtn({item, onPress}: {item: Command; onPress: () => void}) {
  const color = item.color ?? Colors.cyan;
  return (
    <TouchableOpacity
      style={[styles.cmdBtn, {borderColor: `${color}33`}]}
      onPress={onPress}
      activeOpacity={0.7}>
      <View style={[styles.cmdAccent, {backgroundColor: color}]} />
      <Text style={styles.cmdIcon}>{item.icon}</Text>
      <Text style={styles.cmdLabel}>{item.label}</Text>
      <Text style={[styles.cmdArrow, {color: `${color}66`}]}>→</Text>
    </TouchableOpacity>
  );
}

export default function RemoteDashboardScreen({navigation, route}: any) {
  const device = route.params?.device || {};
  const deviceId = device.id || device.device_id || 'sumit-pc';
  const deviceName = device.name || device.device_name || device.hostname || 'SUMIT-PC';

  const [lastCmd, setLastCmd] = useState<string | null>(null);
  const [status, setStatus] = useState('READY');

  const handleCommand = async (action: string, label: string) => {
    if (action === 'lock_screen') {
      Alert.alert(
        `CONFIRM ${label.toUpperCase()}`,
        `Send ${label} command to ${deviceName}?`,
        [
          {text: 'CANCEL', style: 'cancel'},
          {text: 'EXECUTE', style: 'destructive', onPress: () => execute(action, label)},
        ],
      );
      return;
    }
    execute(action, label);
  };

  const execute = async (action: string, label: string) => {
    try {
      setStatus('TRANSMITTING...');
      setLastCmd(label);
      await sendCommand(deviceId, action);
      setStatus('COMMAND SENT');
      setTimeout(() => setStatus('READY'), 2000);
    } catch {
      setStatus('ERR: DEVICE UNREACHABLE');
      setTimeout(() => setStatus('READY'), 3000);
    }
  };

  return (
    <View style={styles.container}>
      <ScanlineOverlay />
      <CornerBrackets />

      <HudTopBar
        title="REMOTE DASHBOARD"
        onBack={() => navigation.goBack()}
        rightLabel={deviceName}
        pulse
      />

      {/* Status bar */}
      <View style={styles.statusBar}>
        <View style={styles.statusLeft}>
          <Text style={styles.statusKey}>STATUS</Text>
          <Text style={[
            styles.statusVal,
            status.startsWith('ERR') && {color: Colors.red},
            status === 'COMMAND SENT' && {color: Colors.cyan},
          ]}>{status}</Text>
        </View>
        {lastCmd && (
          <View style={styles.statusRight}>
            <Text style={styles.statusKey}>LAST CMD</Text>
            <Text style={[styles.statusVal, {color: Colors.cyan}]}>{lastCmd}</Text>
          </View>
        )}
      </View>

      <HudDivider />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <TouchableOpacity
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: 'rgba(252, 31, 249, 0.1)',
            borderWidth: 1,
            borderColor: Colors.pink,
            borderRadius: Radius.md,
            padding: 14,
            marginBottom: 16
          }}
          onPress={() => navigation.navigate('CodeRunner', { deviceId })}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Text style={{ fontSize: 20 }}>💻</Text>
            <View>
              <Text style={{ fontFamily: Fonts.ui, fontSize: 13, fontWeight: '800', color: Colors.pink, letterSpacing: 1 }}>REMOTE CODE STUDIO</Text>
              <Text style={{ fontFamily: Fonts.mono, fontSize: 10, color: Colors.textMuted }}>Execute scripts in Terminal or IDE</Text>
            </View>
          </View>
          <Text style={{ color: Colors.pink, fontFamily: Fonts.ui, fontSize: 16, fontWeight: '700' }}>→</Text>
        </TouchableOpacity>

        <Text style={styles.sectionLabel}>LAUNCH APPS</Text>
        <View style={styles.cmdList}>
          {LAUNCH_COMMANDS.map(cmd => (
            <CommandBtn
              key={cmd.action}
              item={cmd}
              onPress={() => handleCommand(cmd.action, cmd.label)}
            />
          ))}
        </View>

        <HudDivider style={{marginVertical: Spacing.md}} />

        <Text style={styles.sectionLabel}>POWER</Text>
        <View style={styles.cmdList}>
          {POWER_COMMANDS.map(cmd => (
            <CommandBtn
              key={cmd.action}
              item={cmd}
              onPress={() => handleCommand(cmd.action, cmd.label)}
            />
          ))}
        </View>

        <Text style={styles.hint}>{'// COMMANDS ROUTED VIA RENDER BACKEND'}</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: Colors.bg, padding: Spacing.lg, paddingTop: 56},
  scroll: {paddingBottom: 40},
  statusBar: {flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.sm},
  statusLeft: {gap: 2},
  statusRight: {gap: 2, alignItems: 'flex-end'},
  statusKey: {color: Colors.textMuted, fontSize: 8, letterSpacing: 2, fontFamily: Fonts.uiReg},
  statusVal: {color: Colors.textSecondary, fontSize: 11, fontFamily: Fonts.hud, letterSpacing: 1},
  sectionLabel: {color: Colors.textMuted, fontSize: 9, letterSpacing: 3, fontFamily: Fonts.uiReg, marginBottom: Spacing.sm},
  cmdList: {gap: Spacing.sm},
  cmdBtn: {flexDirection: 'row', alignItems: 'center', gap: Spacing.md, backgroundColor: Colors.bgCard, borderWidth: 0.5, borderRadius: Radius.md, paddingVertical: 14, paddingHorizontal: Spacing.md, overflow: 'hidden'},
  cmdAccent: {position: 'absolute', left: 0, top: 0, bottom: 0, width: 2},
  cmdIcon: {fontSize: 18, width: 24, textAlign: 'center'},
  cmdLabel: {flex: 1, color: Colors.textPrimary, fontSize: 13, letterSpacing: 1, fontFamily: Fonts.ui},
  cmdArrow: {fontSize: 14, fontFamily: Fonts.hud},
  hint: {color: Colors.textMuted, fontSize: 9, letterSpacing: 1, fontFamily: Fonts.hud, textAlign: 'center', marginTop: Spacing.xl},
});