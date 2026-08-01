import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ScrollView, StatusBar, ActivityIndicator,
} from 'react-native';
import { Colors, Fonts, Spacing, Radius } from '../theme';
import { registerUser } from '../services/authService';
import { ScanlineOverlay, CornerBrackets } from '../components/HudComponents';

function Field({ label, ...props }: any) {
  return (
    <View style={f.wrap}>
      <Text style={f.label}>{label}</Text>
      <TextInput style={f.input} placeholderTextColor={Colors.textMuted} {...props} />
    </View>
  );
}

const f = StyleSheet.create({
  wrap:  { gap: 6 },
  label: { color: Colors.textSecondary, fontSize: 9, fontFamily: Fonts.ui, letterSpacing: 2, fontWeight: '600' },
  input: {
    backgroundColor: Colors.bgInput,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: Colors.textPrimary,
    fontSize: 14,
    fontFamily: Fonts.mono,
  },
});

export default function RegisterScreen({ navigation }: any) {
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [confirm,  setConfirm]  = useState('');
  const [loading,  setLoading]  = useState(false);

  const handleRegister = async () => {
    if (!email || !password || !confirm) {
      Alert.alert('Missing Fields', 'Please fill in all fields.'); return;
    }
    if (password !== confirm) {
      Alert.alert('Password Mismatch', 'Passwords do not match.'); return;
    }
    if (password.length < 6) {
      Alert.alert('Weak Password', 'Password must be at least 6 characters.'); return;
    }
    try {
      setLoading(true);
      await registerUser(email.trim(), password);
      Alert.alert('Account Created', 'You can now sign in.', [
        { text: 'Sign In', onPress: () => navigation.replace('Login') },
      ]);
    } catch {
      Alert.alert('Registration Failed', 'This email may already be in use.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
      <StatusBar barStyle="light-content" backgroundColor={Colors.bg} />
      <ScanlineOverlay />
      <CornerBrackets color={Colors.pinkDim} />

      <View style={s.cardContainer}>
        {/* Logo */}
        <View style={s.logoArea}>
          <View style={s.hexWrap}>
            <Text style={s.hexIcon}>⬡</Text>
            <Text style={s.hexInner}>NS</Text>
          </View>
          <Text style={s.brand}>NEUROSYNC</Text>
          <Text style={s.sub}>// REGISTRATION PROTOCOL</Text>
        </View>

        {/* Form */}
        <View style={s.form}>
          <Field
            label="EMAIL ADDRESS"
            placeholder="operator@neurosync.io"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Field
            label="PASSWORD"
            placeholder="Min. 6 characters"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
          <Field
            label="CONFIRM PASSWORD"
            placeholder="Repeat password"
            value={confirm}
            onChangeText={setConfirm}
            secureTextEntry
          />

          <TouchableOpacity
            style={s.btn}
            onPress={handleRegister}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading
              ? <ActivityIndicator color="#FFFFFF" />
              : <Text style={s.btnText}>REGISTER OPERATOR ID</Text>
            }
          </TouchableOpacity>

          <TouchableOpacity style={s.link} onPress={() => navigation.navigate('Login')}>
            <Text style={s.linkText}>ALREADY REGISTERED? <Text style={{ color: Colors.pink, fontWeight: 'bold' }}>SIGN IN</Text></Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  content:   { padding: Spacing.lg, paddingTop: 60, paddingBottom: 40, justifyContent: 'center' },

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

  logoArea: { alignItems: 'center', marginBottom: Spacing.sm },
  hexWrap:  { width: 60, height: 60, borderRadius: 30, backgroundColor: Colors.bgElevated, borderWidth: 1, borderColor: Colors.pink, justifyContent: 'center', alignItems: 'center', marginBottom: 12, shadowColor: Colors.pink, shadowRadius: 10, shadowOpacity: 0.4 },
  hexIcon:  { color: Colors.pink, fontSize: 32, position: 'absolute' },
  hexInner: { color: Colors.pink, fontSize: 13, fontFamily: Fonts.ui, fontWeight: '700' },
  brand:    { color: Colors.textPrimary, fontSize: 24, fontFamily: Fonts.ui, letterSpacing: 6, fontWeight: '700' },
  sub:      { color: Colors.textMuted, fontSize: 9, fontFamily: Fonts.mono, letterSpacing: 2, marginTop: 4 },

  form: { gap: 16 },

  btn: {
    backgroundColor: Colors.pink,
    borderRadius: Radius.md,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: Colors.pink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 5,
  },
  btnText: { color: '#FFFFFF', fontSize: 12, fontFamily: Fonts.ui, letterSpacing: 3, fontWeight: '700' },

  link:     { alignItems: 'center', marginTop: 6 },
  linkText: { color: Colors.textMuted, fontSize: 10, fontFamily: Fonts.uiReg, letterSpacing: 1.5 },
});
