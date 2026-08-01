// src/screens/SplashScreen.tsx — Neural Dark theme

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, StatusBar } from 'react-native';
import { Colors, Fonts } from '../theme';
import { restoreSession } from '../services/authService';

export default function SplashScreen({ navigation }: any) {
  const opacity  = useRef(new Animated.Value(0)).current;
  const slideY   = useRef(new Animated.Value(20)).current;
  const barWidth = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideY,  { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();

    Animated.timing(barWidth, {
      toValue: 1, duration: 1800, delay: 300, useNativeDriver: false,
    }).start();

    const timer = setTimeout(async () => {
      const hasSession = await restoreSession();
      navigation.replace(hasSession ? 'Devices' : 'Login');
    }, 2200);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.bg} />

      {/* Background grid */}
      <View style={s.gridWrap} pointerEvents="none">
        {Array.from({ length: 10 }).map((_, i) => (
          <View key={i} style={s.gridRow} />
        ))}
      </View>

      <Animated.View style={[s.center, { opacity, transform: [{ translateY: slideY }] }]}>
        {/* Hex icon */}
        <View style={s.iconWrap}>
          <Text style={s.hexIcon}>⬡</Text>
          <Text style={s.hexInner}>NS</Text>
        </View>

        <Text style={s.brand}>NEUROSYNC</Text>
        <Text style={s.tagline}>Remote Intelligence Platform</Text>

        {/* Loading bar */}
        <View style={s.barTrack}>
          <Animated.View
            style={[
              s.barFill,
              { width: barWidth.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) },
            ]}
          />
        </View>

        <Text style={s.status}>INITIALIZING SYSTEMS...</Text>
      </Animated.View>

      {/* Bottom watermark */}
      <Text style={s.version}>v1.0.0</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg, justifyContent: 'center', alignItems: 'center' },
  gridWrap:  { ...StyleSheet.absoluteFillObject, flexDirection: 'column' },
  gridRow:   { flex: 1, borderBottomWidth: 0.5, borderBottomColor: Colors.grid },

  center: { alignItems: 'center', gap: 12 },

  iconWrap: { width: 80, height: 80, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  hexIcon:  { position: 'absolute', color: Colors.violet, fontSize: 80, opacity: 0.9 },
  hexInner: { color: Colors.textPrimary, fontSize: 22, fontFamily: Fonts.display, letterSpacing: 3, zIndex: 1 },

  brand:    { color: Colors.textPrimary, fontSize: 28, fontFamily: Fonts.display, letterSpacing: 8 },
  tagline:  { color: Colors.textMuted, fontSize: 11, fontFamily: Fonts.body, letterSpacing: 2, marginBottom: 32 },

  barTrack: { width: 180, height: 2, backgroundColor: Colors.violetFaint, borderRadius: 1, overflow: 'hidden' },
  barFill:  { height: 2, backgroundColor: Colors.violet, borderRadius: 1 },

  status:  { color: Colors.textMuted, fontSize: 9, fontFamily: Fonts.mono, letterSpacing: 2, marginTop: 12 },
  version: { position: 'absolute', bottom: 32, color: Colors.textMuted, fontSize: 9, fontFamily: Fonts.mono, letterSpacing: 1 },
});
