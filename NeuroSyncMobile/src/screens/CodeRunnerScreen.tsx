// src/screens/CodeRunnerScreen.tsx — Remote Code Execution & Terminal Studio (Vibrant High Contrast UI)

import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, TextInput,
  ScrollView, ActivityIndicator, Alert, Clipboard, StatusBar
} from 'react-native';
import { Colors, Fonts, Spacing, Radius } from '../theme';
import { api } from '../services/apiClient';

const TEMPLATES: Record<string, string> = {
  python: `# NeuroSync Remote Python Executor\nimport sys, platform\n\nprint(f"🚀 Hello from {platform.system()} {platform.release()}!")\nprint(f"Python Executable: {sys.executable}")\n\nfor i in range(1, 4):\n    print(f"Task {i} executed successfully.")\n`,
  javascript: `// NeuroSync Remote Node.js Executor\nconst os = require('os');\n\nconsole.log(\`🚀 Running on \${os.hostname()} (\${os.type()} \${os.arch()})\`);\nconsole.log(\`Free Memory: \${(os.freemem() / 1024 / 1024).toFixed(0)} MB\`);\nconsole.log("Execution finished successfully!");\n`,
  shell: `# NeuroSync Remote Shell Executor\necho "🚀 System Status Check"\necho "Current Directory: $(pwd)"\necho "Host System: $(uname -a)"\n`,
  powershell: `# NeuroSync Remote PowerShell Executor\nWrite-Host "🚀 NeuroSync Remote PowerShell Studio"\nGet-Date\nGet-Process | Select-Object -First 5 ProcessName, CPU\n`
};

export function CodeRunnerScreen({ route, navigation }: any) {
  const initialDeviceId = route?.params?.deviceId || route?.params?.device?.device_id || route?.params?.device?.id || '';
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
    const interval = setInterval(() => {
      fetchDevicesQuietly();
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  const fetchDevices = async () => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      if (token) {
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      }
      const res = await api.get('/api/v1/devices');
      const devList = res.data?.devices || res.data || res.devices || (Array.isArray(res) ? res : []);
      if (Array.isArray(devList)) {
        setDevices(devList);
        if (!selectedDeviceId && devList.length > 0) {
          const onlineDev = devList.find((d: any) => d.status === 'online');
          setSelectedDeviceId(onlineDev ? onlineDev.device_id : devList[0].device_id);
        }
      }
    } catch (e) {
      console.warn('Could not fetch devices list:', e);
    }
  };

  const fetchDevicesQuietly = async () => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      if (token) {
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      }
      const res = await api.get('/api/v1/devices');
      const devList = res.data?.devices || res.data || res.devices || (Array.isArray(res) ? res : []);
      if (Array.isArray(devList)) {
        setDevices(devList);
      }
    } catch (e) {}
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

      const response: any = await api.post('/api/v1/devices/command', {
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

      const res = response.data || response;

      if (res && (res.status === 'success' || res.status === 'ok')) {
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
      <StatusBar barStyle="light-content" backgroundColor="#0b0d19" />
      
      {/* Top Header Bar */}
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
        
        {/* Step 1: Target Desktop Device */}
        <Text style={styles.sectionHeader}>1. SELECT TARGET DESKTOP DEVICE</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
          {devices.length === 0 ? (
            <Text style={styles.noDeviceText}>No devices registered. Launch desktop agent to connect.</Text>
          ) : (
            devices.map((d) => {
              const active = d.device_id === selectedDeviceId;
              const online = d.status === 'online';
              return (
                <TouchableOpacity
                  key={d.device_id}
                  onPress={() => setSelectedDeviceId(d.device_id)}
                  style={[
                    styles.deviceCard,
                    active && styles.deviceCardActive,
                    !online && styles.deviceCardOffline
                  ]}
                  activeOpacity={0.8}
                >
                  <View style={styles.deviceTopRow}>
                    <Text style={[styles.deviceName, active && styles.deviceNameActive]}>
                      {d.hostname || d.device_id}
                    </Text>
                    <View style={[styles.statusBadge, { backgroundColor: online ? '#00ff88' : '#ff3d3d' }]} />
                  </View>
                  <Text style={styles.deviceMeta}>
                    {d.os || 'Desktop'} · {online ? 'ONLINE' : 'OFFLINE'}
                  </Text>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>

        {/* Step 2: Execution Mode */}
        <Text style={styles.sectionHeader}>2. CHOOSE HOW TO EXECUTE</Text>
        
        <TouchableOpacity
          onPress={() => setExecMode('terminal')}
          style={[styles.modeCard, execMode === 'terminal' && styles.modeCardActive]}
          activeOpacity={0.8}
        >
          <View style={styles.modeIconBox}>
            <Text style={styles.modeIcon}>🖥️</Text>
          </View>
          <View style={styles.modeTextCol}>
            <Text style={[styles.modeTitle, execMode === 'terminal' && styles.modeTitleActive]}>
              Interactive Terminal Window
            </Text>
            <Text style={styles.modeDesc}>
              Opens a visible PowerShell / Terminal window on Desktop. Uses your local Python/pip packages & venvs.
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setExecMode('ide')}
          style={[styles.modeCard, execMode === 'ide' && styles.modeCardActive]}
          activeOpacity={0.8}
        >
          <View style={styles.modeIconBox}>
            <Text style={styles.modeIcon}>💻</Text>
          </View>
          <View style={styles.modeTextCol}>
            <Text style={[styles.modeTitle, execMode === 'ide' && styles.modeTitleActive]}>
              Open in VS Code / IDE
            </Text>
            <Text style={styles.modeDesc}>
              Transfers script and opens it directly in VS Code, PyCharm, or Notepad on your Desktop.
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setExecMode('background')}
          style={[styles.modeCard, execMode === 'background' && styles.modeCardActive]}
          activeOpacity={0.8}
        >
          <View style={styles.modeIconBox}>
            <Text style={styles.modeIcon}>⚡</Text>
          </View>
          <View style={styles.modeTextCol}>
            <Text style={[styles.modeTitle, execMode === 'background' && styles.modeTitleActive]}>
              Background Streamer
            </Text>
            <Text style={styles.modeDesc}>
              Executes in background and streams stdout/stderr back to your mobile screen.
            </Text>
          </View>
        </TouchableOpacity>

        {/* IDE Selector */}
        {execMode === 'ide' && (
          <View style={styles.ideContainer}>
            <Text style={styles.subHeader}>SELECT IDE / TEXT EDITOR:</Text>
            <View style={styles.tabRow}>
              {[
                { id: 'vscode', label: '🟦 VS Code' },
                { id: 'pycharm', label: '🐍 PyCharm' },
                { id: 'notepad', label: '📝 Notepad' },
              ].map((item) => (
                <TouchableOpacity
                  key={item.id}
                  onPress={() => setSelectedIde(item.id as any)}
                  style={[styles.tabChip, selectedIde === item.id && styles.tabChipActive]}
                >
                  <Text style={[styles.tabText, selectedIde === item.id && styles.tabTextActive]}>{item.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Step 3: Programming Language */}
        <Text style={styles.sectionHeader}>3. PROGRAMMING LANGUAGE</Text>
        <View style={styles.tabRow}>
          {[
            { id: 'python', label: '🐍 Python' },
            { id: 'javascript', label: '🟩 Node.js' },
            { id: 'shell', label: '💻 Shell' },
            { id: 'powershell', label: '⚡ PowerShell' },
          ].map((l) => (
            <TouchableOpacity
              key={l.id}
              onPress={() => handleLanguageChange(l.id)}
              style={[styles.tabChip, language === l.id && styles.tabChipActive]}
            >
              <Text style={[styles.tabText, language === l.id && styles.tabTextActive]}>{l.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Step 4: Code Editor */}
        <View style={styles.editorHeaderRow}>
          <Text style={styles.sectionHeader}>4. CODE EDITOR</Text>
          <TextInput
            style={styles.filenameBox}
            value={filename}
            onChangeText={setFilename}
            placeholder="filename"
            placeholderTextColor="#8892b0"
          />
        </View>

        <TextInput
          style={styles.editorTextarea}
          value={code}
          onChangeText={setCode}
          multiline
          autoCapitalize="none"
          autoCorrect={false}
          spellCheck={false}
        />

        {/* Main Action Button */}
        <TouchableOpacity
          style={[styles.actionButton, (!isOnline || executing) && styles.actionButtonDisabled]}
          onPress={handleRunCode}
          disabled={executing}
          activeOpacity={0.85}
        >
          {executing ? (
            <ActivityIndicator color="#ffffff" size="small" />
          ) : (
            <Text style={styles.actionButtonText}>
              {execMode === 'terminal' ? '🚀 RUN IN DESKTOP TERMINAL' : (execMode === 'ide' ? `💻 OPEN IN ${selectedIde.toUpperCase()}` : '⚡ RUN IN BACKGROUND')}
            </Text>
          )}
        </TouchableOpacity>

        {/* Step 5: Remote Execution Output */}
        <View style={styles.outputHeaderRow}>
          <Text style={styles.sectionHeader}>5. DESKTOP EXECUTION OUTPUT</Text>
          {output && (
            <TouchableOpacity onPress={copyConsoleOutput}>
              <Text style={styles.copyBtnText}>COPY OUTPUT</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.terminalBox}>
          {!output && !executing && (
            <Text style={styles.terminalPlaceholder}>
              Tap the bright magenta button above to execute script on Desktop.
            </Text>
          )}

          {executing && (
            <View style={styles.executingRow}>
              <ActivityIndicator color="#00f3ff" size="small" />
              <Text style={styles.executingText}>Launching script on {selectedDevice?.hostname || 'Desktop'}...</Text>
            </View>
          )}

          {output && (
            <View>
              <View style={styles.summaryBar}>
                <Text style={[styles.summaryBadge, { color: output.exit_code === 0 ? '#00ff88' : '#ff3d3d' }]}>
                  {output.exit_code === 0 ? '✓ SUCCESS' : `✕ FAILED (EXIT ${output.exit_code})`}
                </Text>
                <Text style={styles.summaryTime}>{output.duration_ms || 0} ms</Text>
              </View>

              {!!output.stdout && (
                <View style={styles.outputBlock}>
                  <Text style={styles.stdoutTitle}>[DESKTOP STDOUT]</Text>
                  <Text style={styles.stdoutContent}>{output.stdout}</Text>
                </View>
              )}

              {!!output.stderr && (
                <View style={styles.outputBlock}>
                  <Text style={styles.stderrTitle}>[DESKTOP STDERR]</Text>
                  <Text style={styles.stderrContent}>{output.stderr}</Text>
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
    backgroundColor: '#0b0d19',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#13172e',
    borderBottomWidth: 1,
    borderBottomColor: '#fc1ff955',
  },
  backBtn: { padding: 4 },
  backText: { fontFamily: Fonts.ui, fontSize: 12, fontWeight: '800', color: '#00f3ff' },
  headerTitle: { fontFamily: Fonts.ui, fontSize: 14, fontWeight: '900', color: '#fc1ff9', letterSpacing: 2 },
  refreshBtn: { padding: 4 },
  refreshText: { fontFamily: Fonts.mono, fontSize: 11, color: '#00f3ff', fontWeight: '700' },

  scroll: { flex: 1 },
  scrollContent: { padding: 16 },

  sectionHeader: {
    fontFamily: Fonts.ui,
    fontSize: 12,
    fontWeight: '800',
    color: '#00f3ff',
    letterSpacing: 1.5,
    marginTop: 14,
    marginBottom: 10,
  },
  subHeader: {
    fontFamily: Fonts.ui,
    fontSize: 10,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 1,
    marginBottom: 8,
  },

  // Devices Horizontal Row
  horizontalScroll: { marginBottom: 8 },
  noDeviceText: { color: '#8892b0', fontFamily: Fonts.mono, fontSize: 11, paddingVertical: 10 },
  deviceCard: {
    backgroundColor: '#14182b',
    borderWidth: 1,
    borderColor: '#00f3ff44',
    borderRadius: 10,
    padding: 12,
    marginRight: 10,
    minWidth: 160,
  },
  deviceCardActive: {
    borderColor: '#fc1ff9',
    backgroundColor: 'rgba(252, 31, 249, 0.15)',
  },
  deviceCardOffline: { opacity: 0.5 },
  deviceTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  deviceName: { fontFamily: Fonts.display, fontSize: 14, color: '#ffffff', fontWeight: '700' },
  deviceNameActive: { color: '#fc1ff9' },
  statusBadge: { width: 8, height: 8, borderRadius: 4 },
  deviceMeta: { fontFamily: Fonts.mono, fontSize: 10, color: '#8892b0' },

  // Execution Mode Cards
  modeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#14182b',
    borderWidth: 1,
    borderColor: '#00f3ff44',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  modeCardActive: {
    borderColor: '#fc1ff9',
    backgroundColor: 'rgba(252, 31, 249, 0.15)',
  },
  modeIconBox: { width: 40, height: 40, borderRadius: 8, backgroundColor: '#0b0d19', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  modeIcon: { fontSize: 20 },
  modeTextCol: { flex: 1 },
  modeTitle: { fontFamily: Fonts.ui, fontSize: 13, fontWeight: '700', color: '#ffffff', marginBottom: 2 },
  modeTitleActive: { color: '#fc1ff9' },
  modeDesc: { fontFamily: Fonts.body, fontSize: 11, color: '#a0aec0', lineHeight: 15 },

  ideContainer: { marginTop: 4, marginBottom: 8, padding: 10, backgroundColor: '#14182b', borderRadius: 10, borderWidth: 1, borderColor: '#00f3ff33' },

  // Tabs (Languages & IDEs)
  tabRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  tabChip: {
    backgroundColor: '#14182b',
    borderWidth: 1,
    borderColor: '#00f3ff55',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  tabChipActive: {
    backgroundColor: '#fc1ff9',
    borderColor: '#fc1ff9',
  },
  tabText: { fontFamily: Fonts.mono, fontSize: 12, color: '#ffffff', fontWeight: '600' },
  tabTextActive: { color: '#ffffff', fontWeight: '800' },

  // Code Editor
  editorHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  filenameBox: {
    backgroundColor: '#14182b',
    color: '#00f3ff',
    fontFamily: Fonts.mono,
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#00f3ff55',
  },
  editorTextarea: {
    backgroundColor: '#050710',
    color: '#00ff88',
    fontFamily: Fonts.mono,
    fontSize: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#00f3ff55',
    minHeight: 160,
    maxHeight: 240,
    textAlignVertical: 'top',
    marginTop: 4,
  },

  // Main Action Button
  actionButton: {
    backgroundColor: '#fc1ff9',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 16,
    shadowColor: '#fc1ff9',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 8,
  },
  actionButtonDisabled: { opacity: 0.4, backgroundColor: '#333b5c' },
  actionButtonText: { fontFamily: Fonts.ui, fontSize: 13, fontWeight: '900', color: '#ffffff', letterSpacing: 1.5 },

  // Output
  outputHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  copyBtnText: { fontFamily: Fonts.mono, fontSize: 10, color: '#00f3ff', fontWeight: '700' },
  terminalBox: {
    backgroundColor: '#050710',
    borderWidth: 1,
    borderColor: '#00f3ff44',
    borderRadius: 12,
    padding: 14,
    minHeight: 120,
    marginBottom: 40,
  },
  terminalPlaceholder: { fontFamily: Fonts.mono, fontSize: 11, color: '#8892b0', textAlign: 'center', marginTop: 24 },
  executingRow: { flexDirection: 'row', alignItems: 'center', gap: 10, justifyContent: 'center', marginTop: 24 },
  executingText: { fontFamily: Fonts.mono, fontSize: 11, color: '#00f3ff' },

  summaryBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#1a2238', paddingBottom: 8, marginBottom: 10 },
  summaryBadge: { fontFamily: Fonts.ui, fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  summaryTime: { fontFamily: Fonts.mono, fontSize: 10, color: '#8892b0' },
  outputBlock: { marginBottom: 10 },
  stdoutTitle: { fontFamily: Fonts.mono, fontSize: 10, color: '#00f3ff', fontWeight: '700', marginBottom: 2 },
  stderrTitle: { fontFamily: Fonts.mono, fontSize: 10, color: '#ff3d3d', fontWeight: '700', marginBottom: 2 },
  stdoutContent: { fontFamily: Fonts.mono, fontSize: 11, color: '#00ff88', lineHeight: 18 },
  stderrContent: { fontFamily: Fonts.mono, fontSize: 11, color: '#ff3d3d', lineHeight: 18 },
});

export default CodeRunnerScreen;
