// src/screens/SystemMonitorScreen.tsx — JARVIS HUD theme

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { api } from '../services/apiClient';
import { Colors, Fonts, Spacing, Radius } from '../theme';
import {
  CornerBrackets,
  ScanlineOverlay,
  HudTopBar,
  ArcRing,
  StatCard,
  HudDivider,
} from '../components/HudComponents';

interface SystemStats {
  cpu: number;
  ram: number;
  ramTotal: number;
  ramUsed: number;
  disk: number;
  diskTotal: number;
  diskUsed: number;
  uptime: string;
  processes: number;
}

const DUMMY: SystemStats = {
  cpu: 34, ram: 61, ramTotal: 16, ramUsed: 9.8,
  disk: 47, diskTotal: 512, diskUsed: 240,
  uptime: '2h 34m', processes: 187,
};

export default function SystemMonitorScreen({ navigation, route }: any) {
  const device = route.params?.device || {};
  const deviceId = device.device_id || device.id;

  const [stats, setStats] = useState<SystemStats | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState('');

  const fetchStats = async () => {
    try {
      const path = deviceId ? `/api/v1/system/stats?device_id=${deviceId}` : '/api/v1/system/stats';
      const res = await api.get(path);
      if (res.data) {
        setStats(res.data);
      }
    } catch (e) {
      console.log('System monitor stats fetch error:', e);
    }
    setLastUpdated(new Date().toLocaleTimeString());
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchStats();
    setRefreshing(false);
  };

  useEffect(() => {
    fetchStats();
    const t = setInterval(fetchStats, 4000);
    return () => clearInterval(t);
  }, []);

  return (
    <View style={styles.container}>
      <ScanlineOverlay />
      <CornerBrackets />

      <HudTopBar
        title="SYSTEM MONITOR"
        onBack={() => navigation.goBack()}
        rightLabel={lastUpdated ? `UPD ${lastUpdated}` : 'LOADING'}
        pulse={!!stats}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.cyan} />
        }
        contentContainerStyle={styles.scroll}>

        {stats ? (
          <>
            {/* Arc rings row */}
            <View style={styles.arcRow}>
              <View style={styles.arcItem}>
                <ArcRing value={stats.cpu} label="CPU" size={110} color={Colors.cyan} />
                <Text style={styles.arcDetail}>{stats.processes} PROCS</Text>
              </View>
              <View style={styles.arcItem}>
                <ArcRing value={stats.ram} label="RAM" size={110} color={Colors.blue} />
                <Text style={[styles.arcDetail, { color: Colors.blue }]}>
                  {stats.ramUsed}/{stats.ramTotal} GB
                </Text>
              </View>
              <View style={styles.arcItem}>
                <ArcRing value={stats.disk} label="DISK" size={110} color={Colors.amber} />
                <Text style={[styles.arcDetail, { color: Colors.amber }]}>
                  {stats.diskUsed}/{stats.diskTotal} GB
                </Text>
              </View>
            </View>

            <HudDivider />

            {/* Detail cards */}
            <Text style={styles.sectionLabel}>RESOURCE DETAIL</Text>

            <StatCard
              label="CPU USAGE"
              value={`${stats.cpu}%`}
              detail={`${stats.processes} active processes`}
              color={Colors.cyan}
              barValue={stats.cpu}
            />
            <StatCard
              label="MEMORY"
              value={`${stats.ram}%`}
              detail={`${stats.ramUsed} GB used of ${stats.ramTotal} GB total`}
              color={Colors.blue}
              barValue={stats.ram}
            />
            <StatCard
              label="DISK  C:\\"
              value={`${stats.disk}%`}
              detail={`${stats.diskUsed} GB used of ${stats.diskTotal} GB total`}
              color={Colors.amber}
              barValue={stats.disk}
            />

            {/* Uptime */}
            <View style={styles.uptimeCard}>
              <Text style={styles.uptimeLabel}>SYSTEM UPTIME</Text>
              <Text style={styles.uptimeValue}>{stats.uptime}</Text>
            </View>

            <Text style={styles.hint}>{`// PULL TO REFRESH  ·  AUTO-UPDATE EVERY 5S`}</Text>
          </>
        ) : (
          <Text style={styles.loading}>ACQUIRING DATA...</Text>
        )}
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
  scroll: { paddingBottom: 40 },

  arcRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: Spacing.md,
  },
  arcItem: { alignItems: 'center', gap: 4 },
  arcDetail: {
    color: Colors.textMuted,
    fontSize: 9,
    letterSpacing: 1.5,
    fontFamily: Fonts.hud,
  },

  sectionLabel: {
    color: Colors.textMuted,
    fontSize: 9,
    letterSpacing: 3,
    fontFamily: Fonts.uiReg,
    marginBottom: Spacing.sm,
  },

  uptimeCard: {
    backgroundColor: Colors.bgCard,
    borderWidth: 0.5,
    borderColor: Colors.cyanBorder,
    borderRadius: Radius.md,
    padding: Spacing.lg,
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  uptimeLabel: {
    color: Colors.textMuted,
    fontSize: 9,
    letterSpacing: 3,
    fontFamily: Fonts.uiReg,
    marginBottom: 6,
  },
  uptimeValue: {
    color: Colors.cyan,
    fontSize: 36,
    fontFamily: Fonts.hud,
    fontWeight: '600',
    letterSpacing: 2,
  },

  hint: {
    color: Colors.textMuted,
    fontSize: 9,
    letterSpacing: 1,
    fontFamily: Fonts.hud,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
  loading: {
    color: Colors.textMuted,
    fontSize: 12,
    fontFamily: Fonts.hud,
    letterSpacing: 3,
    textAlign: 'center',
    marginTop: 60,
  },
});
