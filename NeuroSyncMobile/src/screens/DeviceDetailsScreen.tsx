
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
          <ControlBtn icon="🤖" label="AI Assistant"    color={Colors.pink}    onPress={() => navigation.navigate('AIAssistant', { device })} />
          <ControlBtn icon="📊" label="System Monitor"  color={Colors.purple}  onPress={() => navigation.navigate('SystemMonitor', { device })} />
          <ControlBtn icon="⌨️" label="Keyboard"        color={Colors.pink}    onPress={() => navigation.navigate('Keyboard', { device })} />
          <ControlBtn icon="🖱️" label="Mouse Control"   color={Colors.purple}  onPress={() => navigation.navigate('MouseControl', { device })} />
          <ControlBtn icon="📁" label="File Manager"    color={Colors.orange}  onPress={() => navigation.navigate('FileManager', { device })} />
          <ControlBtn icon="🖥" label="Remote Desktop"  color={Colors.pink}    onPress={() => navigation.navigate('RemoteDashboard', { device })} />
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  topBar:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingTop: 56, paddingBottom: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border, backgroundColor: Colors.bgSecondary },
  backBtn:   { paddingVertical: 6 },
  backText:  { color: Colors.pink, fontSize: 13, fontFamily: Fonts.ui, fontWeight: '700', letterSpacing: 0.5 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: Radius.pill, paddingHorizontal: 10, paddingVertical: 4, backgroundColor: Colors.bgElevated },
  statusDot:   { width: 6, height: 6, borderRadius: 3 },
  statusText:  { fontSize: 9, fontFamily: Fonts.mono, fontWeight: '700', letterSpacing: 1.5 },

  scroll: { padding: Spacing.lg, paddingBottom: 50 },

  // Hero
  hero:       { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.xl },
  heroIcon:   { width: 60, height: 60, borderRadius: Radius.lg, backgroundColor: Colors.bgElevated, borderWidth: 1, borderColor: Colors.pinkBorder, justifyContent: 'center', alignItems: 'center', shadowColor: Colors.pink, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10 },
  heroIconText:{ color: Colors.pink, fontSize: 30 },
  heroText:   { flex: 1 },
  deviceName: { color: Colors.textPrimary, fontSize: 24, fontFamily: Fonts.ui, fontWeight: '700', letterSpacing: 1, marginBottom: 2 },
  deviceUser: { color: Colors.pink, fontSize: 12, fontFamily: Fonts.mono, fontWeight: '600', marginBottom: 2 },
  deviceOs:   { color: Colors.textSecondary, fontSize: 12, fontFamily: Fonts.body, letterSpacing: 0.5 },

  // Hardware strip
  hwStrip:   { flexDirection: 'row', backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.lg, marginBottom: Spacing.xl, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 10, elevation: 6 },
  hwItem:    { flex: 1, padding: 14, alignItems: 'center' },
  hwDivider: { width: 1, backgroundColor: Colors.divider, marginVertical: 10 },
  hwLabel:   { color: Colors.textMuted, fontSize: 9, fontFamily: Fonts.ui, fontWeight: '600', letterSpacing: 2, marginBottom: 6 },
  hwValue:   { color: Colors.textPrimary, fontSize: 12, fontFamily: Fonts.mono, fontWeight: '600', textAlign: 'center' },

  // Info table
  sectionLabel: { color: Colors.textSecondary, fontSize: 10, fontFamily: Fonts.ui, fontWeight: '600', letterSpacing: 3, marginBottom: Spacing.sm, marginTop: Spacing.sm },
  infoCard: { backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.lg, overflow: 'hidden', marginBottom: Spacing.xl, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 10, elevation: 6 },
  infoRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, paddingHorizontal: Spacing.lg, borderBottomWidth: 1, borderBottomColor: Colors.divider },
  infoLabel:{ color: Colors.textSecondary, fontSize: 11, fontFamily: Fonts.body, letterSpacing: 1 },
  infoValue:{ color: Colors.textPrimary, fontSize: 12, fontFamily: Fonts.mono, fontWeight: '600', maxWidth: '60%', textAlign: 'right' },

  // Controls
  ctrlList: { gap: 10 },
  ctrlBtn:  { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, backgroundColor: Colors.bgCard, borderWidth: 1, borderRadius: Radius.lg, paddingVertical: 14, paddingHorizontal: Spacing.lg, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 10, elevation: 6 },
  ctrlAccent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3 },
  ctrlIcon: { fontSize: 18, width: 24, textAlign: 'center' },
  ctrlLabel:{ flex: 1, fontSize: 13, fontFamily: Fonts.ui, fontWeight: '600', letterSpacing: 1.5 },
  ctrlArrow:{ fontSize: 18, fontFamily: Fonts.ui, fontWeight: '700' },
});
