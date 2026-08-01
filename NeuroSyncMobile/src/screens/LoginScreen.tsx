// src/screens/LoginScreen.tsx — Cyberpunk Neomorphism theme

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import {
  GoogleSignin,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import Svg, { Circle, Line, Text as SvgText } from 'react-native-svg';
import { Colors, Fonts, Spacing, Radius } from '../theme';
import { CornerBrackets, ScanlineOverlay } from '../components/HudComponents';
import { loginUser } from '../services/authService';

GoogleSignin.configure({
  webClientId: '639946205950-mqi82vf5budradj2r9jlatfsaemkam51.apps.googleusercontent.com',
});

// Cyberpunk Neomorphic Arc reactor logo
function ArcReactor({ size = 100 }: { size?: number }) {
  const cx = size / 2, cy = size / 2;
  const ticks = 16;
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Circle cx={cx} cy={cy} r={cx * 0.92} fill="none" stroke={`${Colors.pink}33`} strokeWidth={1} />
      {Array.from({ length: ticks }).map((_, i) => {
        const a = (i * 360) / ticks;
        const r1 = cx * 0.92, r2 = r1 - cx * 0.08;
        const x1 = cx + r1 * Math.sin((a * Math.PI) / 180);
        const y1 = cy - r1 * Math.cos((a * Math.PI) / 180);
        const x2 = cx + r2 * Math.sin((a * Math.PI) / 180);
        const y2 = cy - r2 * Math.cos((a * Math.PI) / 180);
        return <Line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={`${Colors.pink}66`} strokeWidth={1} />;
      })}
      <Circle cx={cx} cy={cy} r={cx * 0.62} fill="none" stroke={`${Colors.purple}66`} strokeWidth={1} />
      <Circle cx={cx} cy={cy} r={cx * 0.42} fill={Colors.bgElevated} stroke={Colors.pink} strokeWidth={1.5} />
      <Circle cx={cx} cy={cy} r={cx * 0.22} fill={`${Colors.pink}33`} stroke={Colors.pink} strokeWidth={1} />
      <SvgText x={cx} y={cy + cx * 0.08} textAnchor="middle" fill={Colors.pink} fontSize={cx * 0.22} fontFamily={Fonts.ui} fontWeight="700">NS</SvgText>
    </Svg>
  );
}

export default function LoginScreen({ navigation }: any) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleEmailLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }
    try {
      setLoading(true);
      await loginUser(email, password);
      navigation.replace('Devices');
    } catch {
      Alert.alert('Error', 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      await GoogleSignin.hasPlayServices();
      await GoogleSignin.signOut();
      const userInfo = await GoogleSignin.signIn();
      console.log('Google Sign-In:', userInfo);
      navigation.replace('Devices');
    } catch (error: any) {
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        // cancelled
      } else if (error.code === statusCodes.IN_PROGRESS) {
        Alert.alert('INFO', 'Sign in already in progress');
      } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        Alert.alert('ERROR', 'Google Play Services not available');
      } else {
        Alert.alert('ERROR', 'Google Sign-In failed. Try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScanlineOverlay />
      <CornerBrackets color={Colors.pinkDim} />

      <ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">
        <View style={styles.cardContainer}>
          {/* Logo */}
          <View style={styles.logoWrap}>
            <ArcReactor size={90} />
            <Text style={styles.appName}>NEUROSYNC</Text>
            <Text style={styles.appSub}>// AI OPERATING SYSTEM AGENT</Text>
          </View>

          <View style={styles.dividerRow}>
            <View style={styles.divLine} />
            <Text style={styles.divLabel}>AUTHENTICATION</Text>
            <View style={styles.divLine} />
          </View>

          {/* Email field */}
          <View style={styles.inputWrap}>
            <Text style={styles.inputLabel}>EMAIL ADDRESS</Text>
            <TextInput
              style={styles.input}
              placeholder="user@neurosync.io"
              placeholderTextColor={Colors.textMuted}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {/* Password field */}
          <View style={styles.inputWrap}>
            <Text style={styles.inputLabel}>PASSWORD</Text>
            <TextInput
              style={styles.input}
              placeholder="••••••••••••"
              placeholderTextColor={Colors.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          {/* Sign In Button */}
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={handleEmailLogin}
            disabled={loading}
            activeOpacity={0.8}>
            <View style={styles.primaryAccent} />
            {loading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryBtnText}>ACCESS SYSTEM</Text>
            )}
          </TouchableOpacity>

          <View style={styles.dividerRow}>
            <View style={styles.divLine} />
            <Text style={styles.divLabel}>OR CONTINUE WITH</Text>
            <View style={styles.divLine} />
          </View>

          {/* Google Sign In */}
          <TouchableOpacity
            style={styles.googleBtn}
            onPress={handleGoogleLogin}
            disabled={loading}
            activeOpacity={0.8}>
            <Text style={styles.googleBtnText}>⚡ GOOGLE ACCOUNT</Text>
          </TouchableOpacity>

          {/* Register link */}
          <TouchableOpacity
            style={styles.registerLink}
            onPress={() => navigation.navigate('Register')}>
            <Text style={styles.registerText}>
              NEW SYSTEM USER? <Text style={{ color: Colors.pink, fontWeight: 'bold' }}>CREATE ACCOUNT</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  inner: { padding: Spacing.lg, paddingTop: 60, paddingBottom: 40, justifyContent: 'center' },
  cardContainer: {
    backgroundColor: Colors.bgCard,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.xl,
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },

  logoWrap: { alignItems: 'center', marginBottom: Spacing.sm },
  appName: {
    color: Colors.textPrimary,
    fontSize: 26,
    letterSpacing: 6,
    fontFamily: Fonts.ui,
    marginTop: Spacing.md,
    fontWeight: '700',
  },
  appSub: {
    color: Colors.textMuted,
    fontSize: 9,
    letterSpacing: 2,
    fontFamily: Fonts.uiReg,
    marginTop: 4,
  },

  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 4 },
  divLine: { flex: 1, height: 1, backgroundColor: Colors.divider },
  divLabel: { color: Colors.textMuted, fontSize: 8, letterSpacing: 2.5, fontFamily: Fonts.uiReg },

  inputWrap: { gap: 6 },
  inputLabel: {
    color: Colors.textSecondary,
    fontSize: 9,
    letterSpacing: 2,
    fontFamily: Fonts.uiReg,
    fontWeight: '600',
  },
  input: {
    backgroundColor: Colors.bgInput,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    padding: 13,
    color: Colors.textPrimary,
    fontSize: 14,
    fontFamily: Fonts.mono,
    letterSpacing: 1,
  },

  primaryBtn: {
    backgroundColor: Colors.pink,
    borderRadius: Radius.md,
    padding: 15,
    alignItems: 'center',
    overflow: 'hidden',
    marginTop: 6,
    shadowColor: Colors.pink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 5,
  },
  primaryAccent: {
    position: 'absolute',
    left: 0, top: 0, bottom: 0,
    width: 4,
    backgroundColor: Colors.purple,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    letterSpacing: 3,
    fontFamily: Fonts.ui,
    fontWeight: '700',
  },

  googleBtn: {
    backgroundColor: Colors.bgElevated,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    padding: 14,
    alignItems: 'center',
  },
  googleBtnText: {
    color: Colors.textPrimary,
    fontSize: 12,
    letterSpacing: 1.5,
    fontFamily: Fonts.ui,
    fontWeight: '600',
  },

  registerLink: { alignItems: 'center', marginTop: 10 },
  registerText: {
    color: Colors.textMuted,
    fontSize: 10,
    letterSpacing: 1.5,
    fontFamily: Fonts.uiReg,
  },
});
