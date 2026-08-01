// src/screens/DevicesScreen.tsx — Neural Dark theme

import React, {useEffect, useState} from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Alert, FlatList, ActivityIndicator, StatusBar,
} from 'react-native';
import {Colors, Fonts, Spacing, Radius} from '../theme';
import {api} from '../services/apiClient';
import {logoutUser} from '../services/authService';

function GridLines() {
  return (
    <View style={grid.wrap} pointerEvents="none">
      {Array.from({length: 8}).map((_, i) => (
        <View key={i} style={grid.row} />
      ))}
    </View>
  );
}

const grid = StyleSheet.create({
  wrap: {...StyleSheet.absoluteFill, flexDirection: 'column', zIndex: 0},
  row: {flex: 1, borderBottomWidth: 0.5, borderBottomColor: Colors.grid},
});

function DeviceCard({item, onPress}: {item: any; onPress: () => void}) {
  const isOnline = item.status === 'online';
  const name = item.hostname || item.device_id || 'UNKNOWN';
  const user = item.username ? `@${item.username}` : '';
  const os = item.os || 'Windows';
  const cpu = item.cpu || '';
  const ram = item.ram_gb ? `${item.ram_gb} GB RAM` : '';
  const ip = item.ip_address || '';

  return (
    <TouchableOpacity style={card.wrap} onPress={onPress} activeOpacity={0.75}>
      <View style={[card.accent, {backgroundColor: isOnline ? Colors.online : Colors.offline}]} />

      <View style={card.body}>
        <View style={card.topRow}>
          <Text style={card.name} numberOfLines={1}>{name}</Text>
          <View style={[card.badge, {borderColor: isOnline ? Colors.online : Colors.offline}]}>
            <View style={[card.dot, {backgroundColor: isOnline ? Colors.online : Colors.offline}]} />
            <Text style={[card.badgeText, {color: isOnline ? Colors.online : Colors.offline}]}>
              {isOnline ? 'ONLINE' : 'OFFLINE'}
            </Text>
          </View>
        </View>

        {(user || os) ? (
          <Text style={card.sub}>{[user, os].filter(Boolean).join('  ·  ')}</Text>
        ) : null}

        {(cpu || ram || ip) ? (
          <Text style={card.meta} numberOfLines={1}>
            {[cpu, ram, ip].filter(Boolean).join('  ·  ')}
          </Text>
        ) : null}
      </View>

      <Text style={card.arrow}>›</Text>
    </TouchableOpacity>
  );
}

const card = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bgCard,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 12,
    elevation: 8,
  },
  accent: {width: 4, alignSelf: 'stretch'},
  body: {flex: 1, paddingVertical: 16, paddingHorizontal: 16},
  topRow: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6},
  name: {color: Colors.textPrimary, fontSize: 18, fontFamily: Fonts.ui, fontWeight: '700', letterSpacing: 1, flex: 1, marginRight: 8},
  badge: {flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: Radius.pill, paddingHorizontal: 10, paddingVertical: 4, backgroundColor: Colors.bgElevated},
  dot: {width: 6, height: 6, borderRadius: 3},
  badgeText: {fontSize: 9, fontFamily: Fonts.mono, fontWeight: '700', letterSpacing: 1.5},
  sub: {color: Colors.textSecondary, fontSize: 12, fontFamily: Fonts.body, letterSpacing: 0.5, marginBottom: 4},
  meta: {color: Colors.textMuted, fontSize: 10, fontFamily: Fonts.mono, letterSpacing: 0.3},
  arrow: {color: Colors.pink, fontSize: 22, paddingRight: 16, fontFamily: Fonts.ui, fontWeight: '700'},
});

export default function DevicesScreen({navigation}: any) {
  const [devices, setDevices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchDevices();
  }, []);

  const fetchDevices = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/v1/devices');
      console.log('Devices response:', JSON.stringify(response.data));
      setDevices(response.data.devices || response.data);
    } catch (error) {
      console.log('Devices error:', error);
      Alert.alert('ERROR', 'Could not fetch devices. Is the backend running?');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchDevices();
  };

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'End this session?', [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await logoutUser();
          navigation.replace('Login');
        },
      },
    ]);
  };

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.bg} />
      <GridLines />

      <View style={s.header}>
        <View>
          <Text style={s.brand}>NEUROSYNC</Text>
          <Text style={s.brandSub}>Remote Control Network</Text>
        </View>
        <TouchableOpacity style={s.signOutBtn} onPress={handleSignOut}>
          <Text style={s.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      <View style={s.sectionRow}>
        <Text style={s.sectionLabel}>YOUR DEVICES</Text>
        <TouchableOpacity onPress={handleRefresh}>
          <Text style={s.refresh}>↻ REFRESH</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator color={Colors.pink} style={s.loadingIndicator} />
      ) : devices.length === 0 ? (
        <View style={s.empty}>
          <Text style={s.emptyIcon}>◈</Text>
          <Text style={s.emptyTitle}>No devices found</Text>
          <Text style={s.emptyHint}>Start the desktop agent on your PC to connect.</Text>
        </View>
      ) : (
        <FlatList
          data={devices}
          keyExtractor={(item: any) => item.device_id || item.id || Math.random().toString()}
          renderItem={({item}) => (
            <DeviceCard
              item={item}
              onPress={() => navigation.navigate('DeviceDetails', {device: item})}
            />
          )}
          contentContainerStyle={s.listContent}
          onRefresh={handleRefresh}
          refreshing={refreshing}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: {flex: 1, backgroundColor: Colors.bg, padding: Spacing.lg, paddingTop: 56},
  header: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.xl},
  brand: {color: Colors.pink, fontSize: 26, fontFamily: Fonts.ui, fontWeight: '700', letterSpacing: 4},
  brandSub: {color: Colors.textSecondary, fontSize: 11, fontFamily: Fonts.body, letterSpacing: 1.5, marginTop: 2},
  signOutBtn: {borderWidth: 1, borderColor: Colors.red, borderRadius: Radius.md, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: Colors.bgElevated},
  signOutText: {color: Colors.red, fontSize: 11, fontFamily: Fonts.ui, fontWeight: '700', letterSpacing: 1},
  sectionRow: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md},
  sectionLabel: {color: Colors.textSecondary, fontSize: 10, fontFamily: Fonts.ui, fontWeight: '600', letterSpacing: 3},
  refresh: {color: Colors.pink, fontSize: 10, fontFamily: Fonts.mono, fontWeight: '600', letterSpacing: 1},
  empty: {flex: 1, justifyContent: 'center', alignItems: 'center', paddingBottom: 80},
  emptyIcon: {color: Colors.pinkDim, fontSize: 40, marginBottom: 16},
  emptyTitle: {color: Colors.textPrimary, fontSize: 18, fontFamily: Fonts.ui, fontWeight: '700', letterSpacing: 1, marginBottom: 8},
  emptyHint: {color: Colors.textSecondary, fontSize: 13, fontFamily: Fonts.body, textAlign: 'center', lineHeight: 20},
  loadingIndicator: {marginTop: 60},
  listContent: {paddingBottom: 40},
});