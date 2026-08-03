// src/screens/CodeRunnerScreen.tsx — Remote Code Execution & Terminal Studio

import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, TextInput,
  ScrollView, ActivityIndicator, Alert, Clipboard, StatusBar
} from 'react-native';
import { Colors, Fonts, Spacing, Radius } from '../theme';
import { api } from '../services/apiClient';

const TEMPLATES: Record<string, string> = {
  python: `# NeuroSync Remote Python Executor\nimport sys, platform\n\nprint(f"🚀 Hello from {platform.system()} {platform.release()}!")\nprint(f"Python Executable: {sys.executable}")\n\nfor i in range(1, 4):\n    print(f"Task {i} executed in desktop terminal.")\n`,
  javascript: `// NeuroSync Remote Node.js Executor\nconst os = require('os');\n\nconsole.log(\`🚀 Running on \${os.hostname()} (\${os.type()} \${os.arch()})\`);\nconsole.log(\`Free Memory: \${(os.freemem() / 1024 / 1024).toFixed(0)} MB\`);\nconsole.log("Execution finished successfully!");\n`,
  shell: `# NeuroSync Remote Shell Executor\necho "🚀 System Status Check"\necho "Current Directory: $(pwd)"\necho "Host System: $(uname -a)"\n`,
  powershell: `# NeuroSync Remote PowerShell Executor\nWrite-Host "🚀 NeuroSync Remote PowerShell Studio"\nGet-Date\nGet-Process | Select-Object -First 5 ProcessName, CPU\n`
};

export function CodeRunnerScreen({ route, navigation }: any) {
  const initialDeviceId = route?.params?.deviceId || '';
  const [devices, setDevices] = useState<any[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>(initialDeviceId);
  const [language, setLanguage] = useState<string>('python');
  const [execMode, setExecMode] = useState<'terminal' | 'ide' | 'background'>('terminal');
  const [selectedIde, setSelectedIde] = useState<'vscode' | 'pycharm' | 'notepad'>('vscode');
  const [code, setCode] = useState<string>(TEMPLATES.python);
  const [filename, setFilename] = useState<string>('script.py');
  
  const [executing, setExecuting] = useState<boolean>(false);
  const [output, setOutput] = useState<any>(null);

  useEffect(() => {
    fetchDevices();
  }, []);

  const fetchDevices = async () => {
    try {
      const res = await api.get('/api/v1/devices');
      if (Array.isArray(res)) {
        setDevices(res);
        if (!selectedDeviceId && res.length > 0) {
          setSelectedDeviceId(res[0].device_id);
        }
      }
    } catch (e) {
      console.warn('Could not fetch devices list:', e);
    }
  };

  const handleLanguageChange = (lang: string) => {
    setLanguage(lang);
    setCode(TEMPLATES[lang] || TEMPLATES.python);
    if (lang === 'python') setFilename('script.py');
    else if (lang === 'javascript') setFilename('script.js');
    else if (lang === 'shell') setFilename('script.sh');
    else if (lang === 'powershell') setFilename('script.ps1');
  };

  const handleRunCode = async () => {
    if (!selectedDeviceId) {
      Alert.alert('Device Required', 'Please select an online desktop target device.');
      return;
    }
    if (!code.trim()) {
      Alert.alert('Empty Code', 'Please enter code to execute.');
      return;
    }

    setExecuting(true);
    setOutput(null);

    try {
      const targetDev = devices.find(d => d.device_id === selectedDeviceId);
      if (targetDev && targetDev.status !== 'online') {
        Alert.alert('Device Offline', `${targetDev.hostname || 'Target device'} is currently OFFLINE.`);
        setExecuting(false);
        return;
      }

      const res: any = await api.post('/api/v1/devices/command', {
        device_id: selectedDeviceId,
        action: 'remote_code_exec',
        payload: {
          code_text: code,
          language: language,
          filename: filename,
          mode: execMode,
          ide_name: selectedIde,
          timeout: 30
        }
      });

      if (res && res.status === 'success') {
        setOutput(res);
      } else {
        setOutput({
          status: 'error',
          stdout: res?.stdout || '',
          stderr: res?.stderr || res?.message || 'Code execution failed',
          exit_code: res?.exit_code ?? 1,
          duration_ms: res?.duration_ms || 0
        });
      }
    } catch (e: any) {
      setOutput({
        status: 'error',
        stdout: '',
        stderr: e.message || 'Failed to send execution command',
        exit_code: 1,
        duration_ms: 0
      });
    } finally {
      setExecuting(false);
    }
  };

  const copyConsoleOutput = () => {
    if (!output) return;
    const text = `--- STDOUT ---\n${output.stdout}\n--- STDERR ---\n${output.stderr}`;
    Clipboard.setString(text);
    Alert.alert('Copied', 'Terminal output copied to clipboard.');
  };

  const selectedDevice = devices.find(d => d.device_id === selectedDeviceId);
  const isOnline = selectedDevice?.status === 'online';

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.bg} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>‹ BACK</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>REMOTE CODE STUDIO</Text>
        <TouchableOpacity onPress={fetchDevices} style={styles.refreshBtn}>
          <Text style={styles.refreshText}>↻ REFRESH</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Device Picker */}
        <Text style={styles.sectionLabel}>TARGET DESKTOP DEVICE</Text>
        <View style={styles.devicePickerRow}>
          {devices.map((d) => {
            const active = d.device_id === selectedDeviceId;
            const online = d.status === 'online';
            return (
              <TouchableOpacity
                key={d.device_id}
                onPress={() => setSelectedDeviceId(d.device_id)}
                style={[
                  styles.deviceChip,
                  active && styles.deviceChipActive,
                  !online && styles.deviceChipOffline
                ]}
              >
                <Text style={[styles.deviceChipText, active && styles.deviceChipTextActive]}>
                  {d.hostname || d.device_id} ({d.os || 'Desktop'})
                </Text>
                <View style={[styles.statusDot, { backgroundColor: online ? Colors.online : Colors.offline }]} />
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Execution Mode Selector */}
        <Text style={styles.sectionLabel}>EXECUTION MODE</Text>
        <View style={styles.modeRow}>
          <TouchableOpacity
            onPress={() => setExecMode('terminal')}
            style={[styles.modeChip, execMode === 'terminal' && styles.modeChipActive]}
          >
            <Text style={[styles.modeText, execMode === 'terminal' && styles.modeTextActive]}>
              🖥️ Interactive Terminal Window
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setExecMode('ide')}
            style={[styles.modeChip, execMode === 'ide' && styles.modeChipActive]}
          >
            <Text style={[styles.modeText, execMode === 'ide' && styles.modeTextActive]}>
              💻 Open in IDE
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setExecMode('background')}
            style={[styles.modeChip, execMode === 'background' && styles.modeChipActive]}
          >
            <Text style={[styles.modeText, execMode === 'background' && styles.modeTextActive]}>
              ⚡ Background Console
            </Text>
          </TouchableOpacity>
        </View>

        {/* IDE Selector (if IDE mode selected) */}
        {execMode === 'ide' && (
          <View style={{ marginBottom: 8 }}>
            <Text style={styles.sectionLabel}>SELECT IDE / EDITOR</Text>
            <View style={styles.langRow}>
              {[
                { id: 'vscode', label: '🟦 VS Code' },
                { id: 'pycharm', label: '🐍 PyCharm' },
                { id: 'notepad', label: '📝 Notepad' },
              ].map((item) => (
                <TouchableOpacity
                  key={item.id}
                  onPress={() => setSelectedIde(item.id as any)}
                  style={[styles.langChip, selectedIde === item.id && styles.langChipActive]}
                >
                  <Text style={[styles.langText, selectedIde === item.id && styles.langTextActive]}>{item.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Language Tabs */}
        <Text style={styles.sectionLabel}>PROGRAMMING LANGUAGE</Text>
        <View style={styles.langRow}>
          {[
            { id: 'python', label: '🐍 Python' },
            { id: 'javascript', label: '🟩 Node.js' },
            { id: 'shell', label: '💻 Shell' },
            { id: 'powershell', label: '⚡ PowerShell' },
          ].map((l) => (
            <TouchableOpacity
              key={l.id}
              onPress={() => handleLanguageChange(l.id)}
              style={[styles.langChip, language === l.id && styles.langChipActive]}
            >
              <Text style={[styles.langText, language === l.id && styles.langTextActive]}>{l.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Code Input Area */}
        <View style={styles.editorHeader}>
          <Text style={styles.sectionLabel}>CODE EDITOR</Text>
          <TextInput
            style={styles.filenameInput}
            value={filename}
            onChangeText={setFilename}
            placeholder="filename"
            placeholderTextColor={Colors.muted}
          />
        </View>

        <TextInput
          style={styles.editorInput}
          value={code}
          onChangeText={setCode}
          multiline
          autoCapitalize="none"
          autoCorrect={false}
          spellCheck={false}
        />

        {/* Action Button */}
        <TouchableOpacity
          style={[styles.runBtn, (!isOnline || executing) && styles.runBtnDisabled]}
          onPress={handleRunCode}
          disabled={executing}
        >
          {executing ? (
            <ActivityIndicator color={Colors.bg} />
          ) : (
            <Text style={styles.runBtnText}>
              {execMode === 'terminal' ? '🖥️ RUN IN TERMINAL WINDOW' : (execMode === 'ide' ? `💻 OPEN IN ${selectedIde.toUpperCase()}` : '⚡ RUN IN BACKGROUND')}
            </Text>
          )}
        </TouchableOpacity>

        {/* Terminal Output */}
        <View style={styles.terminalHeader}>
          <Text style={styles.sectionLabel}>REMOTE EXECUTION OUTPUT</Text>
          {output && (
            <TouchableOpacity onPress={copyConsoleOutput}>
              <Text style={styles.copyText}>COPY OUTPUT</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.terminalBox}>
          {!output && !executing && (
            <Text style={styles.terminalPlaceholder}>
              Tap "RUN IN TERMINAL WINDOW" to launch script on Desktop preserving local packages & environments.
            </Text>
          )}

          {executing && (
            <View style={styles.terminalExecRow}>
              <ActivityIndicator color={Colors.cyan} size="small" />
              <Text style={styles.terminalExecText}>Launching on {selectedDevice?.hostname || 'Desktop'}...</Text>
            </View>
          )}

          {output && (
            <View>
              {/* Execution Summary Bar */}
              <View style={styles.execSummaryRow}>
                <Text style={[styles.execBadge, { color: output.exit_code === 0 ? Colors.green : Colors.red }]}>
                  {output.exit_code === 0 ? '✓ SUCCESS' : `✕ FAILED (EXIT ${output.exit_code})`}
                </Text>
                <Text style={styles.execDuration}>{output.duration_ms || 0} ms</Text>
              </View>

              {/* STDOUT */}
              {!!output.stdout && (
                <View style={styles.outBlock}>
                  <Text style={styles.outHeader}>[DESKTOP RESPONSE]</Text>
                  <Text style={styles.stdoutText}>{output.stdout}</Text>
                </View>
              )}

              {/* STDERR */}
              {!!output.stderr && (
                <View style={styles.outBlock}>
                  <Text style={styles.errHeader}>[STDERR]</Text>
                  <Text style={styles.stderrText}>{output.stderr}</Text>
                </View>
              )}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.pinkGlow,
    backgroundColor: Colors.cardBg,
  },
  backBtn: { padding: 4 },
  backText: { fontFamily: Fonts.ui, fontSize: 11, fontWeight: '700', color: Colors.cyan },
  headerTitle: { fontFamily: Fonts.ui, fontSize: 13, fontWeight: '800', color: Colors.pink, letterSpacing: 1.5 },
  refreshBtn: { padding: 4 },
  refreshText: { fontFamily: Fonts.mono, fontSize: 10, color: Colors.cyan },
  scroll: { flex: 1 },
  scrollContent: { padding: Spacing.md },
  sectionLabel: {
    fontFamily: Fonts.ui,
    fontSize: 10,
    fontWeight: '700',
    color: Colors.muted,
    letterSpacing: 1.5,
    marginBottom: 8,
    marginTop: 12,
  },
  devicePickerRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  deviceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Radius.sm,
    backgroundColor: Colors.cardBg,
    borderWidth: 1,
    borderColor: Colors.cyanGlow,
  },
  deviceChipActive: { borderColor: Colors.pink, backgroundColor: 'rgba(252, 31, 249, 0.1)' },
  deviceChipOffline: { opacity: 0.6 },
  deviceChipText: { fontFamily: Fonts.mono, fontSize: 11, color: Colors.textDim },
  deviceChipTextActive: { color: Colors.pink, fontWeight: '700' },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  modeRow: { flexDirection: 'column', gap: 6, marginBottom: 8 },
  modeChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: Radius.sm,
    backgroundColor: Colors.cardBg,
    borderWidth: 1,
    borderColor: Colors.cyanGlow,
  },
  modeChipActive: { borderColor: Colors.pink, backgroundColor: 'rgba(252, 31, 249, 0.12)' },
  modeText: { fontFamily: Fonts.ui, fontSize: 11, fontWeight: '600', color: Colors.textDim },
  modeTextActive: { color: Colors.pink, fontWeight: '700' },
  langRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  langChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.sm,
    backgroundColor: Colors.cardBg,
    borderWidth: 1,
    borderColor: Colors.cyanGlow,
  },
  langChipActive: { borderColor: Colors.pink, backgroundColor: Colors.pinkGlow },
  langText: { fontFamily: Fonts.mono, fontSize: 11, color: Colors.textDim },
  langTextActive: { color: Colors.pink, fontWeight: '700' },
  editorHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  filenameInput: {
    backgroundColor: Colors.cardBg,
    color: Colors.cyan,
    fontFamily: Fonts.mono,
    fontSize: 11,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: Colors.cyanGlow,
  },
  editorInput: {
    backgroundColor: '#0a0b12',
    color: '#e0e6ed',
    fontFamily: Fonts.mono,
    fontSize: 12,
    padding: 12,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.cyanGlow,
    minHeight: 160,
    maxHeight: 240,
    textAlignVertical: 'top',
  },
  runBtn: {
    backgroundColor: Colors.pink,
    paddingVertical: 14,
    borderRadius: Radius.md,
    alignItems: 'center',
    marginVertical: 16,
    shadowColor: Colors.pink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  runBtnDisabled: { opacity: 0.5, backgroundColor: Colors.cardBg },
  runBtnText: { fontFamily: Fonts.ui, fontSize: 12, fontWeight: '800', color: '#000', letterSpacing: 1.5 },
  terminalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  copyText: { fontFamily: Fonts.mono, fontSize: 10, color: Colors.cyan },
  terminalBox: {
    backgroundColor: '#05060a',
    borderWidth: 1,
    borderColor: Colors.cyanGlow,
    borderRadius: Radius.md,
    padding: 12,
    minHeight: 120,
  },
  terminalPlaceholder: { fontFamily: Fonts.mono, fontSize: 11, color: Colors.muted, textAlign: 'center', marginTop: 24 },
  terminalExecRow: { flexDirection: 'row', alignItems: 'center', gap: 10, justifyContent: 'center', marginTop: 24 },
  terminalExecText: { fontFamily: Fonts.mono, fontSize: 11, color: Colors.cyan },
  execSummaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, borderBottomWidth: 1, borderBottomColor: '#1e2436', paddingBottom: 6 },
  execBadge: { fontFamily: Fonts.ui, fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  execDuration: { fontFamily: Fonts.mono, fontSize: 10, color: Colors.muted },
  outBlock: { marginBottom: 10 },
  outHeader: { fontFamily: Fonts.mono, fontSize: 10, color: Colors.cyan, fontWeight: '700', marginBottom: 2 },
  errHeader: { fontFamily: Fonts.mono, fontSize: 10, color: Colors.red, fontWeight: '700', marginBottom: 2 },
  stdoutText: { fontFamily: Fonts.mono, fontSize: 11, color: '#00ff88', lineHeight: 18 },
  stderrText: { fontFamily: Fonts.mono, fontSize: 11, color: '#ff3d3d', lineHeight: 18 },
});
