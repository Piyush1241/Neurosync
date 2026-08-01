// src/screens/AIAssistantScreen.tsx — Cyberpunk Neomorphism theme

import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  FlatList, KeyboardAvoidingView, Platform, ActivityIndicator, StatusBar,
} from 'react-native';
import { api } from '../services/apiClient';
import { Colors, Fonts, Spacing, Radius } from '../theme';
import { ScanlineOverlay, CornerBrackets } from '../components/HudComponents';

interface Message {
  id: string;
  role: 'user' | 'ai';
  text: string;
  steps?: number;
  time: string;
}

const SUGGESTIONS = [
  'Open Notepad and type Hello',
  'Take a screenshot',
  'Open Calculator',
  'What\'s running on my PC?',
];

export default function AIAssistantScreen({ navigation, route }: any) {
  const device = route.params?.device || {};
  const deviceId = device.device_id || device.id || '';
  const deviceName = device.hostname || device.device_id || 'PC';

  const [messages, setMessages] = useState<Message[]>([
    {
      id: '0',
      role: 'ai',
      text: `Connected to ${deviceName}. What should I do?`,
      time: now(),
    },
  ]);
  const [input,   setInput]   = useState('');
  const [loading, setLoading] = useState(false);
  const listRef = useRef<FlatList>(null);

  function now() {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  const send = async (text?: string) => {
    const prompt = text || input.trim();
    if (!prompt || loading) return;

    const userMsg: Message = { id: Date.now().toString(), role: 'user', text: prompt, time: now() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);

    try {
      const res = await api.post('/api/v1/ai/execute', {
        device_id: deviceId,
        prompt,
      });

      const data = res.data;
      const stepsTotal = data.steps_total || data.results?.length || 0;
      const status = data.status === 'executed' ? '✓ Done' : data.message || 'Sent';

      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        text: `${status} — ${stepsTotal} action${stepsTotal !== 1 ? 's' : ''} executed on ${deviceName}.`,
        steps: stepsTotal,
        time: now(),
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch (e: any) {
      const errMsg = e?.response?.data?.error || 'Could not reach device. Is the agent running?';
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        text: `Error: ${errMsg}`,
        time: now(),
      }]);
    } finally {
      setLoading(false);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isUser = item.role === 'user';
    return (
      <View style={[msg.bubble, isUser ? msg.userBubble : msg.aiBubble]}>
        {!isUser && <View style={msg.aiBar} />}
        <Text style={msg.role}>{isUser ? 'OPERATOR' : 'NEUROSYNC AI'}</Text>
        <Text style={[msg.text, isUser && msg.userText]}>{item.text}</Text>
        <Text style={msg.time}>{item.time}</Text>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={s.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="light-content" backgroundColor={Colors.bg} />
      <ScanlineOverlay />
      <CornerBrackets color={Colors.pinkDim} />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={s.back}>← BACK</Text>
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={s.headerTitle}>AI ASSISTANT</Text>
          <Text style={s.headerSub}>{deviceName}</Text>
        </View>
        <View style={s.liveDot} />
      </View>

      {/* Messages */}
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={item => item.id}
        renderItem={renderMessage}
        contentContainerStyle={s.list}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        showsVerticalScrollIndicator={false}
      />

      {loading && (
        <View style={s.thinking}>
          <ActivityIndicator size="small" color={Colors.pink} />
          <Text style={s.thinkingText}>SYNTHESIZING ACTIONS...</Text>
        </View>
      )}

      {/* Suggestions */}
      {messages.length === 1 && (
        <View style={s.chips}>
          {SUGGESTIONS.map(sg => (
            <TouchableOpacity key={sg} style={s.chip} onPress={() => send(sg)}>
              <Text style={s.chipText}>{sg}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Input */}
      <View style={s.inputRow}>
        <TextInput
          style={s.input}
          placeholder={`Command ${deviceName}...`}
          placeholderTextColor={Colors.textMuted}
          value={input}
          onChangeText={setInput}
          multiline
          returnKeyType="send"
          onSubmitEditing={() => send()}
          blurOnSubmit={false}
        />
        <TouchableOpacity
          style={[s.sendBtn, (!input.trim() || loading) && s.sendOff]}
          onPress={() => send()}
          disabled={!input.trim() || loading}
          activeOpacity={0.8}
        >
          <Text style={s.sendText}>↑</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const msg = StyleSheet.create({
  bubble:     { maxWidth: '85%', borderRadius: Radius.md, padding: Spacing.md, borderWidth: 1, marginBottom: 12, overflow: 'hidden' },
  aiBubble:   { backgroundColor: Colors.bgCard, borderColor: Colors.border, alignSelf: 'flex-start' },
  userBubble: { backgroundColor: Colors.bgElevated, borderColor: Colors.pinkBorder, alignSelf: 'flex-end' },
  aiBar:      { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, backgroundColor: Colors.pink },
  role:       { color: Colors.textMuted, fontSize: 8, fontFamily: Fonts.ui, letterSpacing: 2, marginBottom: 4, fontWeight: '600' },
  text:       { color: Colors.textSecondary, fontSize: 13, fontFamily: Fonts.mono, lineHeight: 18 },
  userText:   { color: Colors.textPrimary, fontWeight: '500' },
  time:       { color: Colors.textMuted, fontSize: 8, fontFamily: Fonts.mono, marginTop: 6, textAlign: 'right' },
});

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },

  header:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingTop: 56, paddingBottom: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.divider },
  back:         { color: Colors.pink, fontSize: 11, fontFamily: Fonts.ui, letterSpacing: 1, fontWeight: '600' },
  headerCenter: { alignItems: 'center' },
  headerTitle:  { color: Colors.textPrimary, fontSize: 14, fontFamily: Fonts.ui, letterSpacing: 3, fontWeight: '700' },
  headerSub:    { color: Colors.textMuted, fontSize: 9, fontFamily: Fonts.mono, marginTop: 2 },
  liveDot:      { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.pink, shadowColor: Colors.pink, shadowRadius: 6, shadowOpacity: 0.8 },

  list:     { padding: Spacing.lg, paddingTop: Spacing.md },
  thinking: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: Spacing.lg, paddingBottom: 8 },
  thinkingText: { color: Colors.textMuted, fontSize: 10, fontFamily: Fonts.mono, letterSpacing: 1 },

  chips: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: Spacing.lg, gap: 8, paddingBottom: 10 },
  chip:  { backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.pill, paddingHorizontal: 12, paddingVertical: 8 },
  chipText: { color: Colors.textSecondary, fontSize: 11, fontFamily: Fonts.ui },

  inputRow: { flexDirection: 'row', alignItems: 'flex-end', padding: Spacing.md, gap: 8, borderTopWidth: 1, borderTopColor: Colors.divider, backgroundColor: Colors.bgSecondary },
  input:    { flex: 1, backgroundColor: Colors.bgInput, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md, paddingHorizontal: 14, paddingVertical: 12, color: Colors.textPrimary, fontSize: 13, fontFamily: Fonts.mono, maxHeight: 100 },
  sendBtn:  { width: 44, height: 44, borderRadius: Radius.md, backgroundColor: Colors.pink, justifyContent: 'center', alignItems: 'center', shadowColor: Colors.pink, shadowRadius: 8, shadowOpacity: 0.5 },
  sendOff:  { backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.border, shadowOpacity: 0 },
  sendText: { color: '#FFFFFF', fontSize: 18, fontFamily: Fonts.ui, fontWeight: '700' },
});
