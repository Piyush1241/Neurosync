
import { Platform } from 'react-native';

export const Colors = {
  // Base Surfaces
  bg:           '#09090B',
  bgSecondary:  '#111216',
  bgCard:       '#17181D',
  bgElevated:   '#1F2026',
  bgInput:      '#0F1014',

  // Primary Cyberpunk Neons
  pink:          '#FC1FF9',
  pinkDim:       'rgba(252, 31, 249, 0.4)',
  pinkFaint:     'rgba(252, 31, 249, 0.12)',
  pinkBorder:    'rgba(252, 31, 249, 0.28)',

  purple:        '#BC0EEF',
  purpleDark:    '#443061',
  purpleDim:     'rgba(188, 14, 239, 0.4)',
  purpleFaint:   'rgba(188, 14, 239, 0.12)',

  // Accents
  red:           '#E42536',
  orange:        '#FC5E31',
  cyan:          '#00E5FF',
  green:         '#00FF88',

  // Compatibility aliases
  violet:        '#FC1FF9',
  violetDim:     'rgba(252, 31, 249, 0.55)',
  violetFaint:   'rgba(252, 31, 249, 0.12)',
  violetBorder:  'rgba(252, 31, 249, 0.28)',

  magenta:       '#BC0EEF',
  magentaDim:    'rgba(188, 14, 239, 0.55)',
  magentaFaint:  'rgba(188, 14, 239, 0.12)',
  magentaBorder: 'rgba(188, 14, 239, 0.28)',

  online:        '#FC1FF9',
  offline:       '#E42536',
  warn:          '#FC5E31',

  // Typography
  textPrimary:   '#FFFFFF',
  textSecondary: '#A8A8B3',
  textMuted:     '#6D6D78',

  // Borders & Dividers
  border:        'rgba(255, 255, 255, 0.05)',
  borderActive:  '#FC1FF9',
  grid:          'rgba(252, 31, 249, 0.06)',
  divider:       'rgba(255, 255, 255, 0.08)',
};

export const Fonts = {
  mono:    Platform.OS === 'ios' ? 'Courier' : 'monospace',
  display: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  ui:      Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  uiReg:   Platform.OS === 'ios' ? 'System' : 'sans-serif',
  hud:     Platform.OS === 'ios' ? 'Courier' : 'monospace',
  body:    Platform.OS === 'ios' ? 'System' : 'sans-serif',
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const Radius = {
  sm: 4,
  md: 8,
  lg: 14,
  pill: 99,
};

export const SharedStyles = {
  screen: {
    flex: 1,
    backgroundColor: Colors.bg,
    padding: Spacing.lg,
    paddingTop: 56,
  },
  card: {
    backgroundColor: Colors.bgCard,
    borderWidth: 1,
    borderColor: Colors.violetBorder,
    borderRadius: Radius.md,
    padding: Spacing.md,
  },
  label: {
    fontSize: 9,
    color: Colors.textMuted,
    letterSpacing: 3,
    fontFamily: Fonts.ui,
    textTransform: 'uppercase' as const,
  },
};
