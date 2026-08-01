

import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ScrollView, StatusBar, ActivityIndicator,
} from 'react-native';
import { Colors, Fonts, Spacing, Radius } from '../theme';
import { registerUser } from '../services/authService';

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
  label: { color: Colors.textSecondary, fontSize: 9, fontFamily: Fonts.ui, letterSpacing: 2.5, fontWeight: '600' },
  input: {
    backgroundColor: Colors.bgElevated,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: Colors.textPrimary,
    fontSize: 15,
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

      {/* Background grid */}
      <View style={s.gridWrap} pointerEvents="none">
        {Array.from({ length: 12 }).map((_, i) => (
          <View key={i} style={s.gridRow} />
        ))}
      </View>

      {/* Logo */}
      <View style={s.logoArea}>
        <View style={s.hexWrap}>
          <Text style={s.hexIcon}>⬡</Text>
          <Text style={s.hexInner}>NS</Text>
        </View>
        <Text style={s.brand}>NEUROSYNC</Text>
        <Text style={s.sub}>Create your account</Text>
      </View>

      {/* Form */}
      <View style={s.form}>
        <Field
          label="EMAIL ADDRESS"
          placeholder="you@example.com"
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
          style={[s.btn, loading && s.btnDisabled]}
          onPress={handleRegister}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading
            ? <ActivityIndicator color={Colors.bg} />
            : <Text style={s.btnText}>CREATE ACCOUNT</Text>
          }
        </TouchableOpacity>
      </View>

      <TouchableOpacity onPress={() => navigation.navigate('Login')} style={s.loginRow}>
        <Text style={s.loginText}>Already have an account?  </Text>
        <Text style={s.loginLink}>Sign In</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  content:   { padding: Spacing.xl, flexGrow: 1, justifyContent: 'center', gap: Spacing.xl },

  gridWrap: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, flexDirection: 'column' },
  gridRow:  { flex: 1, borderBottomWidth: 0.5, borderBottomColor: Colors.grid },

  logoArea: { alignItems: 'center', gap: 8 },
  hexWrap:  { width: 64, height: 64, justifyContent: 'center', alignItems: 'center' },
  hexIcon:  { position: 'absolute', color: Colors.violet, fontSize: 64, opacity: 0.9 },
  hexInner: { color: Colors.textPrimary, fontSize: 18, fontFamily: Fonts.display, letterSpacing: 3, zIndex: 1 },
  brand:    { color: Colors.textPrimary, fontSize: 24, fontFamily: Fonts.display, letterSpacing: 6 },
  sub:      { color: Colors.textMuted, fontSize: 12, fontFamily: Fonts.body, letterSpacing: 1 },

  form: { gap: Spacing.lg },

  btn: {
    backgroundColor: Colors.pink,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: Colors.pink,
    shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.45,
    shadowRadius: 20,
    elevation: 8,
  },
  btnDisabled: { opacity: 0.5 },
  btnText:     { color: '#FFFFFF', fontSize: 13, fontFamily: Fonts.display, letterSpacing: 3, fontWeight: 'bold' },

  loginRow:  { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  loginText: { color: Colors.textMuted, fontSize: 13, fontFamily: Fonts.body },
  loginLink: { color: Colors.pink, fontSize: 13, fontFamily: Fonts.ui, letterSpacing: 0.5, fontWeight: '600' },
});
