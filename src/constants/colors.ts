export const COLORS = {
  // Brand colors
  primary: '#2563EB',
  primaryHover: '#1D4ED8',
  primaryLight: '#3B82F6',
  primaryMuted: '#2563EB20',

  // Dark Theme Palette (Default for ReadyBill POS)
  bgDark: '#0F172A',
  bgCard: '#1E293B',
  bgCardHover: '#334155',
  borderDark: '#334155',
  borderLight: '#475569',

  // Text colors
  textPrimary: '#F8FAFC',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  textDark: '#0F172A',

  // Status & Semantic colors
  success: '#10B981',
  successLight: '#34D399',
  successBg: '#10B98120',

  warning: '#F59E0B',
  warningLight: '#FBBF24',
  warningBg: '#F59E0B20',

  danger: '#EF4444',
  dangerLight: '#F87171',
  dangerBg: '#EF444420',

  info: '#38BDF8',
  infoLight: '#7DD3FC',
  infoBg: '#38BDF820',

  purple: '#8B5CF6',
  purpleBg: '#8B5CF620',

  // Basic colors
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
} as const;

export type ColorToken = keyof typeof COLORS;