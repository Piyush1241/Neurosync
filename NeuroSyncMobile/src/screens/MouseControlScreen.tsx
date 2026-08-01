// src/screens/MouseControlScreen.tsx — JARVIS HUD theme

import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  PanResponder,
  Dimensions,
} from 'react-native';
import Svg, { Line, Circle } from 'react-native-svg';
import { sendCommand } from '../services/commandService';
import { Colors, Fonts, Spacing, Radius } from '../theme';
import { CornerBrackets, ScanlineOverlay, HudTopBar, HudDivider } from '../components/HudComponents';

const { width } = Dimensions.get('window');
const PAD_SIZE = width - Spacing.lg * 2;

export default function MouseControlScreen({ navigation, route }: any) {
  const deviceId = route?.params?.device?.device_id ?? route?.params?.deviceId ?? '';
  const deviceName = deviceId || 'UNKNOWN';
  const [status, setStatus] = useState('AWAITING INPUT');
  const [cursorX, setCursorX] = useState(PAD_SIZE / 2);
  const [cursorY, setCursorY] = useState(PAD_SIZE * 0.37);
  const lastPos = useRef({ x: 0, y: 0 });

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (_, gs) => {
        lastPos.current = { x: gs.x0, y: gs.y0 };
      },
      onPanResponderMove: (_, gs) => {
        const stepDx = Math.round(gs.moveX - lastPos.current.x);
        const stepDy = Math.round(gs.moveY - lastPos.current.y);

        if (stepDx !== 0 || stepDy !== 0) {
          const totalDx = Math.round(gs.dx);
          const totalDy = Math.round(gs.dy);
          setStatus(`DELTA  X:${stepDx > 0 ? '+' : ''}${stepDx}  Y:${stepDy > 0 ? '+' : ''}${stepDy}`);
          setCursorX(Math.max(10, Math.min(PAD_SIZE - 10, PAD_SIZE / 2 + totalDx)));
          setCursorY(Math.max(10, Math.min(PAD_SIZE * 0.75 - 10, PAD_SIZE * 0.37 + totalDy)));

          sendCommand(deviceId, 'mouse_move_relative', { dx: stepDx, dy: stepDy, duration: 0.0 }).catch(() => {});
          lastPos.current = { x: gs.moveX, y: gs.moveY };
        }
      },
      onPanResponderRelease: () => {
        setStatus('AWAITING INPUT');
        setCursorX(PAD_SIZE / 2);
        setCursorY(PAD_SIZE * 0.37);
      },
    }),
  ).current;

  const handleClick = async (button: string, label: string) => {
    try {
      setStatus(`CMD: ${label}`);
      if (button === 'scroll_up') {
  await sendCommand(deviceId, 'mouse_scroll', { amount: -3 });
} else if (button === 'scroll_down') {
  await sendCommand(deviceId, 'mouse_scroll', { amount: 3 });
} else {
  await sendCommand(deviceId, 'mouse_click', { button });
}
      setTimeout(() => setStatus('AWAITING INPUT'), 1000);
    } catch {
      setStatus('ERR: DEVICE UNREACHABLE');
    }
  };

  // Grid lines for trackpad
  const gridLines = [];
  const cols = 6, rows = 5;
  for (let i = 1; i < cols; i++) {
    gridLines.push(
      <Line key={`v${i}`} x1={i * (PAD_SIZE / cols)} y1={0} x2={i * (PAD_SIZE / cols)} y2={PAD_SIZE * 0.75}
        stroke={`${Colors.cyan}18`} strokeWidth={0.5} />
    );
  }
  for (let i = 1; i < rows; i++) {
    gridLines.push(
      <Line key={`h${i}`} x1={0} y1={i * ((PAD_SIZE * 0.75) / rows)} x2={PAD_SIZE} y2={i * ((PAD_SIZE * 0.75) / rows)}
        stroke={`${Colors.cyan}18`} strokeWidth={0.5} />
    );
  }

  return (
    <View style={styles.container}>
      <ScanlineOverlay />
      <CornerBrackets />

      <HudTopBar
        title="MOUSE CONTROL"
        onBack={() => navigation.goBack()}
        rightLabel={deviceName}
        pulse
      />

      <Text style={styles.status}>{status}</Text>

      {/* Trackpad */}
      <View style={[styles.trackpad, { height: PAD_SIZE * 0.75 }]} {...panResponder.panHandlers}>
        <Svg width={PAD_SIZE} height={PAD_SIZE * 0.75} style={StyleSheet.absoluteFill}>
          {/* grid */}
          {gridLines}
          {/* center crosshair lines */}
          <Line x1={PAD_SIZE / 2} y1={0} x2={PAD_SIZE / 2} y2={PAD_SIZE * 0.75}
            stroke={`${Colors.cyan}25`} strokeWidth={0.5} />
          <Line x1={0} y1={PAD_SIZE * 0.375} x2={PAD_SIZE} y2={PAD_SIZE * 0.375}
            stroke={`${Colors.cyan}25`} strokeWidth={0.5} />

          {/* cursor crosshair */}
          <Line x1={cursorX - 12} y1={cursorY} x2={cursorX + 12} y2={cursorY}
            stroke={Colors.cyan} strokeWidth={1} />
          <Line x1={cursorX} y1={cursorY - 12} x2={cursorX} y2={cursorY + 12}
            stroke={Colors.cyan} strokeWidth={1} />
          <Circle cx={cursorX} cy={cursorY} r={6} fill="none" stroke={Colors.cyan} strokeWidth={1} />
          <Circle cx={cursorX} cy={cursorY} r={2} fill={Colors.cyan} />
        </Svg>

        <Text style={styles.padHint}>DRAG TO MOVE CURSOR</Text>
      </View>

      <HudDivider style={{ marginVertical: Spacing.md }} />

      {/* Click buttons */}
      <View style={styles.btnRow}>
        <TouchableOpacity
          style={[styles.clickBtn, styles.leftBtn]}
          onPress={() => handleClick('left', 'LEFT CLICK')}
          activeOpacity={0.7}>
          <View style={[styles.btnAccent, { backgroundColor: Colors.cyan }]} />
          <Text style={[styles.clickIcon, { color: Colors.cyan }]}>◈</Text>
          <Text style={[styles.clickLabel, { color: Colors.cyan }]}>LEFT</Text>
        </TouchableOpacity>

        <View style={styles.scrollCol}>
          <TouchableOpacity
            style={[styles.scrollBtn]}
            onPress={() => handleClick('scroll_up', 'SCROLL UP')}
            activeOpacity={0.7}>
            <Text style={styles.scrollArrow}>▲</Text>
            <Text style={styles.scrollLabel}>UP</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.scrollBtn]}
            onPress={() => handleClick('scroll_down', 'SCROLL DOWN')}
            activeOpacity={0.7}>
            <Text style={styles.scrollArrow}>▼</Text>
            <Text style={styles.scrollLabel}>DOWN</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.clickBtn, styles.rightBtn]}
          onPress={() => handleClick('right', 'RIGHT CLICK')}
          activeOpacity={0.7}>
          <View style={[styles.btnAccent, { backgroundColor: Colors.red }]} />
          <Text style={[styles.clickIcon, { color: Colors.red }]}>◈</Text>
          <Text style={[styles.clickLabel, { color: Colors.red }]}>RIGHT</Text>
        </TouchableOpacity>
      </View>
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
  status: {
    color: Colors.textMuted,
    fontSize: 9,
    letterSpacing: 2,
    fontFamily: Fonts.hud,
    marginBottom: Spacing.md,
  },

  trackpad: {
    width: PAD_SIZE,
    backgroundColor: Colors.bgCard,
    borderWidth: 0.5,
    borderColor: Colors.cyanBorder,
    borderRadius: Radius.md,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 8,
  },
  padHint: {
    color: Colors.textMuted,
    fontSize: 9,
    letterSpacing: 2,
    fontFamily: Fonts.uiReg,
  },

  btnRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    alignItems: 'stretch',
  },

  clickBtn: {
    flex: 1,
    backgroundColor: Colors.bgCard,
    borderWidth: 0.5,
    borderRadius: Radius.md,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
    overflow: 'hidden',
  },
  leftBtn: { borderColor: `${Colors.cyan}44` },
  rightBtn: { borderColor: `${Colors.red}44` },
  btnAccent: {
    position: 'absolute',
    left: 0, top: 0, bottom: 0,
    width: 2,
  },
  clickIcon: { fontSize: 22, marginBottom: 4 },
  clickLabel: {
    fontSize: 10,
    letterSpacing: 2,
    fontFamily: Fonts.ui,
  },

  scrollCol: {
    gap: Spacing.sm,
    justifyContent: 'center',
  },
  scrollBtn: {
    backgroundColor: Colors.bgCard,
    borderWidth: 0.5,
    borderColor: `${Colors.amber}44`,
    borderRadius: Radius.sm,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  scrollArrow: { color: Colors.amber, fontSize: 12 },
  scrollLabel: {
    color: Colors.amber,
    fontSize: 9,
    letterSpacing: 2,
    fontFamily: Fonts.ui,
  },
});
