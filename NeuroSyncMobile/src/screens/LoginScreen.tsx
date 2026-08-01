// src/screens/LoginScreen.tsx — JARVIS HUD theme

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
import {loginUser} from '../services/authService';

GoogleSignin.configure({
  webClientId: '639946205950-mqi82vf5budradj2r9jlatfsaemkam51.apps.googleusercontent.com',
});

// Arc reactor logo
function ArcReactor({ size = 100 }: { size?: number }) {
  const cx = size / 2, cy = size / 2;
  const ticks = 16;
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Circle cx={cx} cy={cy} r={cx * 0.92} fill="none" stroke={`${Colors.cyan}22`} strokeWidth={0.8} />
      {Array.from({ length: ticks }).map((_, i) => {
        const a = (i * 360) / ticks;
        const r1 = cx * 0.92, r2 = r1 - cx * 0.07;
        const x1 = cx + r1 * Math.sin((a * Math.PI) / 180);
        const y1 = cy - r1 * Math.cos((a * Math.PI) / 180);
        const x2 = cx + r2 * Math.sin((a * Math.PI) / 180);
        const y2 = cy - r2 * Math.cos((a * Math.PI) / 180);
        return <Line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={`${Colors.cyan}55`} strokeWidth={0.8} />;
      })}
      <Circle cx={cx} cy={cy} r={cx * 0.62} fill="none" stroke={`${Colors.cyan}44`} strokeWidth={0.8} />
      <Circle cx={cx} cy={cy} r={cx * 0.42} fill={Colors.bgCard} stroke={`${Colors.cyan}66`} strokeWidth={0.8} />
      <Circle cx={cx} cy={cy} r={cx * 0.22} fill={`${Colors.cyan}22`} stroke={Colors.cyan} strokeWidth={1} />
      <SvgText x={cx} y={cy + cx * 0.08} textAnchor="middle" fill={Colors.cyan} fontSize={cx * 0.22} fontFamily={Fonts.ui} fontWeight="600">NS</SvgText>
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
    await loginUser(email, password);
    navigation.replace('Devices');
  } catch {
    Alert.alert('Error', 'Invalid email or password');
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
      <CornerBrackets />

      <ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">
        {/* Logo */}
        <View style={styles.logoWrap}>
          <ArcReactor size={96} />
          <Text style={styles.appName}>NEUROSYNC</Text>
          <Text style={styles.appSub}>REMOTE CONTROL SYSTEM v1.0</Text>
        </View>

        {/* Divider */}
        <View style={styles.dividerRow}>
          <View style={styles.divLine} />
          <Text style={styles.divLabel}>AUTHENTICATION</Text>
          <View style={styles.divLine} />
        </View>

        {/* Inputs */}
        <View style={styles.inputWrap}>
          <Text style={styles.inputLabel}>EMAIL</Text>
          <TextInput
            style={styles.input}
            placeholder="user@domain.com"
            placeholderTextColor={Colors.textMuted}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        <View style={styles.inputWrap}>
          <Text style={styles.inputLabel}>PASSWORD</Text>
          <TextInput
            style={styles.input}
            placeholder="••••••••"
            placeholderTextColor={Colors.textMuted}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
        </View>

        {/* Sign In */}
        <TouchableOpacity style={styles.primaryBtn} onPress={handleEmailLogin} activeOpacity={0.8}>
          <View style={styles.primaryAccent} />
          <Text style={styles.primaryBtnText}>SIGN IN →</Text>
        </TouchableOpacity>

        {/* Divider */}
        <View style={styles.dividerRow}>
          <View style={styles.divLine} />
          <Text style={styles.divLabel}>OR</Text>
          <View style={styles.divLine} />
        </View>

        {/* Google */}
        <TouchableOpacity style={styles.googleBtn} onPress={handleGoogleLogin} disabled={loading} activeOpacity={0.8}>
          {loading
            ? <ActivityIndicator color={Colors.cyan} />
            : <Text style={styles.googleBtnText}>◉  CONTINUE WITH GOOGLE</Text>
          }
        </TouchableOpacity>

        {/* Register link */}
        <TouchableOpacity onPress={() => navigation.navigate('Register')} style={styles.registerLink}>
          <Text style={styles.registerText}>
            NO ACCOUNT?  <Text style={styles.registerAccent}>REGISTER →</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  inner: { padding: Spacing.xl, paddingTop: 60, paddingBottom: 40, gap: 14 },

  logoWrap: { alignItems: 'center', marginBottom: Spacing.lg },
  appName: {
    color: Colors.cyan,
    fontSize: 28,
    letterSpacing: 8,
    fontFamily: Fonts.ui,
    marginTop: Spacing.md,
  },
  appSub: {
    color: Colors.textMuted,
    fontSize: 9,
    letterSpacing: 2.5,
    fontFamily: Fonts.uiReg,
    marginTop: 4,
  },

  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  divLine: { flex: 1, height: 0.5, backgroundColor: Colors.divider },
  divLabel: { color: Colors.textMuted, fontSize: 9, letterSpacing: 3, fontFamily: Fonts.uiReg },

  inputWrap: { gap: 5 },
  inputLabel: {
    color: Colors.textSecondary,
    fontSize: 9,
    letterSpacing: 3,
    fontFamily: Fonts.uiReg,
  },
  input: {
    backgroundColor: Colors.bgElevated,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    padding: 14,
    color: Colors.textPrimary,
    fontSize: 14,
    fontFamily: Fonts.hud,
    letterSpacing: 1,
  },

  primaryBtn: {
    backgroundColor: Colors.pink,
    borderWidth: 0,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    overflow: 'hidden',
    marginTop: 6,
    shadowColor: Colors.pink,
    shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.45,
    shadowRadius: 20,
    elevation: 8,
  },
  primaryAccent: {
    position: 'absolute',
    left: 0, top: 0, bottom: 0,
    width: 4,
    backgroundColor: '#FFFFFF',
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    letterSpacing: 4,
    fontFamily: Fonts.ui,
    fontWeight: 'bold',
  },

  googleBtn: {
    backgroundColor: Colors.bgElevated,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
  },
  googleBtnText: {
    color: Colors.textPrimary,
    fontSize: 12,
    letterSpacing: 2,
    fontFamily: Fonts.ui,
  },

  registerLink: { alignItems: 'center', marginTop: 10 },
  registerText: {
    color: Colors.textMuted,
    fontSize: 10,
    letterSpacing: 2,
    fontFamily: Fonts.uiReg,
  },
  registerAccent: { color: Colors.pink, fontWeight: '600' },
});
