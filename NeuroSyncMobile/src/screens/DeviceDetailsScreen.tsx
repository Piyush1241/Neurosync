
import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar,
} from 'react-native';
import { Colors, Fonts, Spacing, Radius } from '../theme';

function InfoRow({ label, value }: { label: string; value: string }) {
  if (!value || value === '—') return null;
  return (
    <View style={s.infoRow}>
      <Text style={s.infoLabel}>{label}</Text>
      <Text style={s.infoValue} numberOfLines={1}>{value}</Text>
    </View>
  );
}

function ControlBtn({ icon, label, color = Colors.violet, onPress }: any) {
  return (
    <TouchableOpacity style={[s.ctrlBtn, { borderColor: `${color}40` }]} onPress={onPress} activeOpacity={0.75}>
      <View style={[s.ctrlAccent, { backgroundColor: color }]} />
      <Text style={s.ctrlIcon}>{icon}</Text>
      <Text style={[s.ctrlLabel, { color: Colors.textPrimary }]}>{label}</Text>
      <Text style={[s.ctrlArrow, { color: `${color}88` }]}>›</Text>
    </TouchableOpacity>
  );
}

export default function DeviceDetailsScreen({ navigation, route }: any) {
  const device = route.params?.device || {};

  // Map ALL possible field names from backend
  const hostname   = device.hostname   || device.device_id || 'Unknown Device';
  const username   = device.username   || '';
  const os         = device.os         || 'Windows';
  const osVersion  = device.os_version || '';
  const ip         = device.ip_address || device.ip || '—';
  const mac        = device.mac_address || '—';
  const cpu        = device.cpu        || '—';
  const ram        = device.ram_gb     ? `${device.ram_gb} GB` : '—';
  const lastSeen   = device.last_seen  || 'Just now';
  const isOnline   = device.status     === 'online';

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.bg} />

      {/* Top bar */}
      <View style={s.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Text style={s.backText}>← Back</Text>
        </TouchableOpacity>
        <View style={[s.statusBadge, { borderColor: isOnline ? Colors.online : Colors.offline }]}>
          <View style={[s.statusDot, { backgroundColor: isOnline ? Colors.online : Colors.offline }]} />
          <Text style={[s.statusText, { color: isOnline ? Colors.online : Colors.offline }]}>
            {isOnline ? 'Online' : 'Offline'}
          </Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>

        {/* Device hero */}
        <View style={s.hero}>
          <View style={s.heroIcon}>
            <Text style={s.heroIconText}>⬡</Text>
          </View>
          <View style={s.heroText}>
            <Text style={s.deviceName}>{hostname}</Text>
            {username ? <Text style={s.deviceUser}>@{username}</Text> : null}
            <Text style={s.deviceOs}>{[os, osVersion].filter(Boolean).join(' ')}</Text>
          </View>
        </View>

        {/* Hardware strip */}
        <View style={s.hwStrip}>
          <View style={s.hwItem}>
            <Text style={s.hwLabel}>CPU</Text>
            <Text style={s.hwValue} numberOfLines={2}>{cpu}</Text>
          </View>
          <View style={s.hwDivider} />
          <View style={s.hwItem}>
            <Text style={s.hwLabel}>RAM</Text>
            <Text style={s.hwValue}>{ram}</Text>
          </View>
          <View style={s.hwDivider} />
          <View style={s.hwItem}>
            <Text style={s.hwLabel}>IP</Text>
            <Text style={s.hwValue}>{ip}</Text>
          </View>
        </View>

        {/* Info table */}
        <Text style={s.sectionLabel}>DEVICE INFO</Text>
        <View style={s.infoCard}>
          <InfoRow label="Hostname"    value={hostname} />
          <InfoRow label="Username"    value={username} />
          <InfoRow label="OS"          value={[os, osVersion].filter(Boolean).join(' ')} />
          <InfoRow label="IP Address"  value={ip} />
          <InfoRow label="MAC Address" value={mac} />
          <InfoRow label="Last Seen"   value={lastSeen} />
        </View>

        {/* Controls */}
        <Text style={s.sectionLabel}>CONTROLS</Text>
        <View style={s.ctrlList}>
          <ControlBtn icon="🤖" label="AI Assistant"    color={Colors.violet}  onPress={() => navigation.navigate('AIAssistant', { device })} />
          <ControlBtn icon="📊" label="System Monitor"  color={Colors.online}  onPress={() => navigation.navigate('SystemMonitor', { device })} />
          <ControlBtn icon="⌨️" label="Keyboard"        color={Colors.violet}  onPress={() => navigation.navigate('Keyboard', { device })} />
          <ControlBtn icon="🖱️" label="Mouse Control"   color={Colors.violet}  onPress={() => navigation.navigate('MouseControl', { device })} />
          <ControlBtn icon="📁" label="File Manager"    color={Colors.warn}    onPress={() => navigation.navigate('FileManager', { device })} />
          <ControlBtn icon="🖥" label="Remote Desktop"  color={Colors.magenta} onPress={() => navigation.navigate('RemoteDashboard', { device })} />
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  topBar:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingTop: 56, paddingBottom: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.divider },
  backBtn:   { paddingVertical: 6 },
  backText:  { color: Colors.violetDim, fontSize: 13, fontFamily: Fonts.body, letterSpacing: 0.5 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderRadius: Radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  statusDot:   { width: 6, height: 6, borderRadius: 3 },
  statusText:  { fontSize: 9, fontFamily: Fonts.ui, letterSpacing: 1.5 },

  scroll: { padding: Spacing.lg, paddingBottom: 50 },

  // Hero
  hero:       { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.xl },
  heroIcon:   { width: 56, height: 56, borderRadius: 14, backgroundColor: Colors.violetFaint, borderWidth: 1, borderColor: Colors.violetBorder, justifyContent: 'center', alignItems: 'center' },
  heroIconText:{ color: Colors.violet, fontSize: 28 },
  heroText:   { flex: 1 },
  deviceName: { color: Colors.textPrimary, fontSize: 24, fontFamily: Fonts.display, letterSpacing: 1, marginBottom: 2 },
  deviceUser: { color: Colors.violet, fontSize: 12, fontFamily: Fonts.mono, marginBottom: 2 },
  deviceOs:   { color: Colors.textMuted, fontSize: 11, fontFamily: Fonts.body, letterSpacing: 0.5 },

  // Hardware strip
  hwStrip:   { flexDirection: 'row', backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.violetBorder, borderRadius: Radius.md, marginBottom: Spacing.xl, overflow: 'hidden' },
  hwItem:    { flex: 1, padding: 14, alignItems: 'center' },
  hwDivider: { width: 1, backgroundColor: Colors.divider, marginVertical: 10 },
  hwLabel:   { color: Colors.textMuted, fontSize: 8, fontFamily: Fonts.ui, letterSpacing: 2, marginBottom: 6 },
  hwValue:   { color: Colors.textPrimary, fontSize: 11, fontFamily: Fonts.mono, textAlign: 'center' },

  // Info table
  sectionLabel: { color: Colors.textMuted, fontSize: 9, fontFamily: Fonts.ui, letterSpacing: 3, marginBottom: Spacing.sm, marginTop: Spacing.sm },
  infoCard: { backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.violetBorder, borderRadius: Radius.md, overflow: 'hidden', marginBottom: Spacing.xl },
  infoRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, paddingHorizontal: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.grid },
  infoLabel:{ color: Colors.textMuted, fontSize: 10, fontFamily: Fonts.body, letterSpacing: 1 },
  infoValue:{ color: Colors.textPrimary, fontSize: 12, fontFamily: Fonts.mono, maxWidth: '60%', textAlign: 'right' },

  // Controls
  ctrlList: { gap: 8 },
  ctrlBtn:  { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: Colors.bgCard, borderWidth: 1, borderRadius: Radius.md, paddingVertical: 14, paddingHorizontal: Spacing.md, overflow: 'hidden' },
  ctrlAccent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 2 },
  ctrlIcon: { fontSize: 18, width: 24, textAlign: 'center' },
  ctrlLabel:{ flex: 1, fontSize: 13, fontFamily: Fonts.ui, letterSpacing: 1 },
  ctrlArrow:{ fontSize: 18 },
});
