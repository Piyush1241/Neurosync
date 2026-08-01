// src/components/HudComponents.tsx
// Reusable JARVIS-style UI primitives

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from 'react-native';
import Svg, {
  Circle,
  Line,
  G,
  Text as SvgText,
} from 'react-native-svg';
import { Colors, Fonts, Radius, Spacing } from '../theme';

// ── Corner brackets (decorative HUD frame) ─────────────────
export function CornerBrackets({ color = Colors.cyanDim }: { color?: string }) {
  const s = cornerStyles(color);
  return (
    <>
      <View style={[s.corner, s.tl]} pointerEvents="none" />
      <View style={[s.corner, s.tr]} pointerEvents="none" />
      <View style={[s.corner, s.bl]} pointerEvents="none" />
      <View style={[s.corner, s.br]} pointerEvents="none" />
    </>
  );
}

function cornerStyles(color: string) {
  const base: ViewStyle = { position: 'absolute', width: 16, height: 16 };
  return StyleSheet.create({
    corner: base,
    tl: { top: 8, left: 8, borderTopWidth: 1.5, borderLeftWidth: 1.5, borderColor: color },
    tr: { top: 8, right: 8, borderTopWidth: 1.5, borderRightWidth: 1.5, borderColor: color },
    bl: { bottom: 8, left: 8, borderBottomWidth: 1.5, borderLeftWidth: 1.5, borderColor: color },
    br: { bottom: 8, right: 8, borderBottomWidth: 1.5, borderRightWidth: 1.5, borderColor: color },
  });
}

// ── Scanline overlay ────────────────────────────────────────
// Lightweight — just a subtle opacity stripe on top of content
export function ScanlineOverlay() {
  return (
    <View style={scanStyles.overlay} pointerEvents="none">
      {Array.from({ length: 60 }).map((_, i) => (
        <View key={i} style={scanStyles.line} />
      ))}
    </View>
  );
}

const scanStyles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'column',
    pointerEvents: 'none',
    zIndex: 999,
  },
  line: {
    flex: 1,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(0,255,255,0.025)',
  },
});

// ── HUD top bar ─────────────────────────────────────────────
interface TopBarProps {
  title: string;
  onBack?: () => void;
  rightLabel?: string;
  rightColor?: string;
  pulse?: boolean;
}

export function HudTopBar({ title, onBack, rightLabel, rightColor = Colors.cyan, pulse }: TopBarProps) {
  return (
    <View style={topStyles.bar}>
      {onBack ? (
        <TouchableOpacity onPress={onBack} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Text style={topStyles.back}>← BACK</Text>
        </TouchableOpacity>
      ) : (
        <View style={topStyles.logoWrap}>
          <Text style={topStyles.logo}>NEUROSYNC</Text>
        </View>
      )}

      <Text style={topStyles.title}>{title}</Text>

      <View style={topStyles.right}>
        {pulse && <View style={topStyles.dot} />}
        {rightLabel && (
          <Text style={[topStyles.rightLabel, { color: rightColor }]}>{rightLabel}</Text>
        )}
      </View>
    </View>
  );
}

const topStyles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: Spacing.sm,
    marginBottom: Spacing.sm,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.divider,
  },
  back: {
    color: Colors.cyanDim,
    fontSize: 11,
    letterSpacing: 1,
    fontFamily: Fonts.uiReg,
  },
  logoWrap: {},
  logo: {
    color: Colors.cyan,
    fontSize: 13,
    letterSpacing: 4,
    fontFamily: Fonts.ui,
  },
  title: {
    color: Colors.cyan,
    fontSize: 11,
    letterSpacing: 3,
    fontFamily: Fonts.ui,
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
  },
  right: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.cyan,
    opacity: 0.9,
  },
  rightLabel: {
    fontSize: 9,
    letterSpacing: 1.5,
    fontFamily: Fonts.uiReg,
  },
});

// ── Arc ring (animated SVG ring for CPU / single metric) ────
interface ArcRingProps {
  value: number;       // 0–100
  label: string;
  size?: number;
  color?: string;
}

export function ArcRing({ value, label, size = 120, color = Colors.cyan }: ArcRingProps) {
  const r = size * 0.38;
  const cx = size / 2;
  const circumference = 2 * Math.PI * r;
  const filled = (value / 100) * circumference;

  const TICKS = 12;
  const outerR = size * 0.46;
  const tickLen = size * 0.05;

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* outer decorative ring */}
      <Circle cx={cx} cy={cx} r={outerR} fill="none" stroke={`${color}22`} strokeWidth={0.8} />

      {/* tick marks */}
      {Array.from({ length: TICKS }).map((_, i) => {
        const angle = (i * 360) / TICKS;
        const rad = (angle * Math.PI) / 180;
        const x1 = cx + outerR * Math.sin(rad);
        const y1 = cx - outerR * Math.cos(rad);
        const x2 = cx + (outerR - tickLen) * Math.sin(rad);
        const y2 = cx - (outerR - tickLen) * Math.cos(rad);
        return <Line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={`${color}44`} strokeWidth={0.8} />;
      })}

      {/* track */}
      <Circle
        cx={cx} cy={cx} r={r}
        fill="none"
        stroke={`${color}22`}
        strokeWidth={5}
      />
      {/* fill arc — starts at top (rotate -90) */}
      <Circle
        cx={cx} cy={cx} r={r}
        fill="none"
        stroke={color}
        strokeWidth={5}
        strokeDasharray={`${filled} ${circumference}`}
        strokeDashoffset={circumference * 0.25}
        strokeLinecap="round"
        rotation={-90}
        originX={cx}
        originY={cx}
        opacity={0.85}
      />

      {/* inner ring */}
      <Circle cx={cx} cy={cx} r={r * 0.82} fill="none" stroke={`${color}22`} strokeWidth={0.5} />

      {/* center bg */}
      <Circle cx={cx} cy={cx} r={r * 0.7} fill={Colors.bg} />

      {/* value text */}
      <SvgText
        x={cx} y={cx - 4}
        textAnchor="middle"
        fill={color}
        fontSize={size * 0.155}
        fontFamily={Fonts.hud}
        fontWeight="600"
      >
        {value}%
      </SvgText>
      <SvgText
        x={cx} y={cx + size * 0.1}
        textAnchor="middle"
        fill={`${color}88`}
        fontSize={size * 0.07}
        fontFamily={Fonts.ui}
        letterSpacing={2}
      >
        {label}
      </SvgText>
    </Svg>
  );
}

// ── Mini stat bar row ───────────────────────────────────────
interface StatBarProps {
  label: string;
  value: number;
  color?: string;
}

export function StatBarRow({ label, value, color = Colors.cyan }: StatBarProps) {
  return (
    <View style={barStyles.row}>
      <Text style={barStyles.label}>{label}</Text>
      <View style={barStyles.track}>
        <View style={[barStyles.fill, { width: `${value}%` as any, backgroundColor: color }]} />
      </View>
      <Text style={[barStyles.val, { color }]}>{value}%</Text>
    </View>
  );
}

const barStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  label: {
    color: Colors.textSecondary,
    fontSize: 9,
    letterSpacing: 1.5,
    width: 32,
    fontFamily: Fonts.uiReg,
  },
  track: {
    flex: 1,
    height: 3,
    backgroundColor: 'rgba(0,255,255,0.1)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  fill: { height: 3, borderRadius: 2 },
  val: {
    fontSize: 10,
    fontFamily: Fonts.hud,
    width: 30,
    textAlign: 'right',
  },
});

// ── HUD button (control row item) ──────────────────────────
interface HudButtonProps {
  icon: string;
  label: string;
  color?: string;
  onPress: () => void;
  style?: ViewStyle;
}

export function HudButton({ icon, label, color = Colors.cyan, onPress, style }: HudButtonProps) {
  return (
    <TouchableOpacity style={[hudBtnStyles.btn, { borderColor: `${color}44` }, style]} onPress={onPress} activeOpacity={0.7}>
      <View style={[hudBtnStyles.accent, { backgroundColor: color }]} />
      <Text style={[hudBtnStyles.icon, { color }]}>{icon}</Text>
      <Text style={[hudBtnStyles.label, { color: Colors.textPrimary }]}>{label}</Text>
      <Text style={[hudBtnStyles.arrow, { color: `${color}66` }]}>›</Text>
    </TouchableOpacity>
  );
}

const hudBtnStyles = StyleSheet.create({
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.bgCard,
    borderWidth: 0.5,
    borderRadius: Radius.md,
    paddingVertical: 12,
    paddingHorizontal: Spacing.md,
    overflow: 'hidden',
  },
  accent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 2,
  },
  icon: { fontSize: 16, width: 20, textAlign: 'center' },
  label: { flex: 1, fontSize: 12, letterSpacing: 1.5, fontFamily: Fonts.ui },
  arrow: { fontSize: 16, fontFamily: Fonts.uiReg },
});

// ── Divider ─────────────────────────────────────────────────
export function HudDivider({ style }: { style?: ViewStyle }) {
  return <View style={[divStyles.divider, style]} />;
}

const divStyles = StyleSheet.create({
  divider: {
    height: 0.5,
    backgroundColor: Colors.divider,
    marginVertical: Spacing.sm,
  },
});

// ── Stat card (grid tile) ───────────────────────────────────
interface StatCardProps {
  label: string;
  value: string;
  detail?: string;
  color?: string;
  barValue?: number;
}

export function StatCard({ label, value, detail, color = Colors.cyan, barValue }: StatCardProps) {
  return (
    <View style={cardStyles.card}>
      <View style={cardStyles.header}>
        <Text style={cardStyles.label}>{label}</Text>
        <Text style={[cardStyles.value, { color }]}>{value}</Text>
      </View>
      {barValue !== undefined && (
        <View style={cardStyles.track}>
          <View style={[cardStyles.fill, { width: `${barValue}%` as any, backgroundColor: color }]} />
        </View>
      )}
      {detail && <Text style={cardStyles.detail}>{detail}</Text>}
    </View>
  );
}

const cardStyles = StyleSheet.create({
  card: {
    backgroundColor: Colors.bgCard,
    borderWidth: 0.5,
    borderColor: Colors.cyanBorder,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 },
  label: { color: Colors.textSecondary, fontSize: 10, letterSpacing: 2, fontFamily: Fonts.uiReg },
  value: { fontSize: 22, fontFamily: Fonts.hud, fontWeight: '600' },
  track: { height: 3, backgroundColor: 'rgba(0,255,255,0.1)', borderRadius: 2, overflow: 'hidden', marginBottom: 6 },
  fill: { height: 3, borderRadius: 2 },
  detail: { color: Colors.textMuted, fontSize: 10, fontFamily: Fonts.uiReg, letterSpacing: 0.5 },
});
