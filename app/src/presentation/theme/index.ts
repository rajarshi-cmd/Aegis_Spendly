import React, { createContext, useContext, useState, ReactNode } from 'react';

export type ThemePresetName = 'Soft Mint' | 'Warm Sunset' | 'Night Ledger' | 'Lavender';

export interface ThemeColors {
  background: string;
  surface: string;
  surfaceElevated: string;
  surfaceSubtle: string;
  border: string;
  borderSubtle: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  primary: string;
  primaryHover: string;
  primaryLight: string;
  success: string;
  successBg: string;
  successText: string;
  warning: string;
  warningBg: string;
  warningText: string;
  danger: string;
  dangerBg: string;
  dangerText: string;
  info: string;
  infoBg: string;
  infoText: string;
  // Spendly Pastel Card Tints
  cardMint: string;
  cardMintBorder: string;
  cardCream: string;
  cardCreamBorder: string;
  cardLavender: string;
  cardLavenderBorder: string;
  cardIce: string;
  cardIceBorder: string;
  // Card visual finishes
  cardSkinEmerald: string;
  cardSkinPurple: string;
  cardSkinCaramel: string;
  // Obsidian Wealth Container Hierarchy
  surfaceContainerLowest?: string;
  surfaceContainerLow?: string;
  surfaceContainer?: string;
  surfaceContainerHigh?: string;
  surfaceContainerHighest?: string;
  surfaceVariant?: string;
  outline?: string;
  outlineVariant?: string;
}

export const THEME_PRESETS: Record<ThemePresetName, ThemeColors> = {
  'Soft Mint': {
    background: '#F7F9F6',
    surface: '#FFFFFF',
    surfaceElevated: '#FFFFFF',
    surfaceSubtle: '#F0F4F1',
    surfaceContainerLowest: '#F8FAF8',
    surfaceContainerLow: '#F0F4F1',
    surfaceContainer: '#FFFFFF',
    surfaceContainerHigh: '#E8ECE9',
    surfaceContainerHighest: '#DFE4E0',
    border: '#E2E8F0',
    borderSubtle: '#EBECE8',
    textPrimary: '#0F172A',
    textSecondary: '#475569',
    textMuted: '#94A3B8',
    primary: '#0F4C3A',
    primaryHover: '#0D4233',
    primaryLight: '#E6F4EA',
    success: '#10B981',
    successBg: '#ECFDF5',
    successText: '#047857',
    warning: '#F59E0B',
    warningBg: '#FEF3C7',
    warningText: '#B45309',
    danger: '#EF4444',
    dangerBg: '#FEE2E2',
    dangerText: '#B91C1C',
    info: '#0284C7',
    infoBg: '#E0F2FE',
    infoText: '#0369A1',
    cardMint: '#ECFDF5',
    cardMintBorder: '#A7F3D0',
    cardCream: '#FFFBEB',
    cardCreamBorder: '#FDE68A',
    cardLavender: '#FAF5FF',
    cardLavenderBorder: '#E9D5FF',
    cardIce: '#F0FDFA',
    cardIceBorder: '#99F6E4',
    cardSkinEmerald: '#1B4D3E',
    cardSkinPurple: '#4A3B69',
    cardSkinCaramel: '#9A6324',
  },
  'Warm Sunset': {
    background: '#FAF7F5',
    surface: '#FFFFFF',
    surfaceElevated: '#FFFFFF',
    surfaceSubtle: '#F5EFEB',
    surfaceContainerLowest: '#FAF7F5',
    surfaceContainerLow: '#F5EFEB',
    surfaceContainer: '#FFFFFF',
    surfaceContainerHigh: '#EFE8E2',
    surfaceContainerHighest: '#E8DFD8',
    border: '#E8DFD8',
    borderSubtle: '#EFE8E2',
    textPrimary: '#1C1917',
    textSecondary: '#57534E',
    textMuted: '#A8A29E',
    primary: '#9A3412',
    primaryHover: '#7C2D12',
    primaryLight: '#FFEDD5',
    success: '#10B981',
    successBg: '#ECFDF5',
    successText: '#047857',
    warning: '#D97706',
    warningBg: '#FEF3C7',
    warningText: '#92400E',
    danger: '#DC2626',
    dangerBg: '#FEE2E2',
    dangerText: '#991B1B',
    info: '#0284C7',
    infoBg: '#E0F2FE',
    infoText: '#0369A1',
    cardMint: '#F0FDF4',
    cardMintBorder: '#BBF7D0',
    cardCream: '#FFF7ED',
    cardCreamBorder: '#FED7AA',
    cardLavender: '#FAF5FF',
    cardLavenderBorder: '#E9D5FF',
    cardIce: '#FFFBEB',
    cardIceBorder: '#FDE68A',
    cardSkinEmerald: '#1B4D3E',
    cardSkinPurple: '#4A3B69',
    cardSkinCaramel: '#9A3412',
  },
  'Night Ledger': {
    background: '#051424', // Obsidian Deep Void
    surface: '#0D1C2D',
    surfaceElevated: '#122131',
    surfaceSubtle: '#010F1F',
    surfaceContainerLowest: '#010F1F',
    surfaceContainerLow: '#0D1C2D',
    surfaceContainer: '#122131',
    surfaceContainerHigh: '#1C2B3C',
    surfaceContainerHighest: '#273647',
    surfaceVariant: '#273647',
    border: '#1E293B',
    borderSubtle: '#1C2B3C',
    outline: '#869585',
    outlineVariant: '#3D4A3D',
    textPrimary: '#D4E4FA',
    textSecondary: '#94A3B8',
    textMuted: '#64748B',
    primary: '#22C55E', // Obsidian Emerald #22C55E / #4BE277
    primaryHover: '#16A34A',
    primaryLight: 'rgba(34, 197, 94, 0.15)',
    success: '#22C55E',
    successBg: 'rgba(34, 197, 94, 0.15)',
    successText: '#4ADE80',
    warning: '#EAB308',
    warningBg: 'rgba(234, 179, 8, 0.15)',
    warningText: '#FACC15',
    danger: '#EF4444',
    dangerBg: 'rgba(239, 68, 68, 0.15)',
    dangerText: '#F87171',
    info: '#38BDF8',
    infoBg: 'rgba(56, 189, 248, 0.16)',
    infoText: '#7DD3FC',
    cardMint: '#064E3B',
    cardMintBorder: '#059669',
    cardCream: '#78350F',
    cardCreamBorder: '#D97706',
    cardLavender: '#3B1F69',
    cardLavenderBorder: '#7C3AED',
    cardIce: '#0C4A6E',
    cardIceBorder: '#0284C7',
    cardSkinEmerald: '#0F4C3A',
    cardSkinPurple: '#4A3B69',
    cardSkinCaramel: '#78350F',
  },
  'Lavender': {
    background: '#F8F7FA',
    surface: '#FFFFFF',
    surfaceElevated: '#FFFFFF',
    surfaceSubtle: '#F1EEF8',
    surfaceContainerLowest: '#F8F7FA',
    surfaceContainerLow: '#F1EEF8',
    surfaceContainer: '#FFFFFF',
    surfaceContainerHigh: '#EDE8F5',
    surfaceContainerHighest: '#E4DFEF',
    border: '#E4DFEF',
    borderSubtle: '#EDE8F5',
    textPrimary: '#1E1B4B',
    textSecondary: '#4C4674',
    textMuted: '#9B94B8',
    primary: '#5B21B6',
    primaryHover: '#4C1D95',
    primaryLight: '#EDE9FE',
    success: '#10B981',
    successBg: '#ECFDF5',
    successText: '#047857',
    warning: '#F59E0B',
    warningBg: '#FEF3C7',
    warningText: '#B45309',
    danger: '#EF4444',
    dangerBg: '#FEE2E2',
    dangerText: '#B91C1C',
    info: '#6366F1',
    infoBg: '#EEF2FF',
    infoText: '#4338CA',
    cardMint: '#F5F3FF',
    cardMintBorder: '#DDD6FE',
    cardCream: '#FFFBEB',
    cardCreamBorder: '#FDE68A',
    cardLavender: '#EDE9FE',
    cardLavenderBorder: '#C4B5FD',
    cardIce: '#EEF2FF',
    cardIceBorder: '#C7D2FE',
    cardSkinEmerald: '#1B4D3E',
    cardSkinPurple: '#5B21B6',
    cardSkinCaramel: '#9A6324',
  },
};

export const theme = {
  colors: THEME_PRESETS['Night Ledger'],
  typography: {
    title: {
      fontSize: 24,
      fontWeight: '700' as const,
      color: '#D4E4FA',
      letterSpacing: -0.4,
    },
    subtitle: {
      fontSize: 14,
      fontWeight: '400' as const,
      color: '#94A3B8',
    },
    sectionBadge: {
      fontSize: 11,
      fontWeight: '700' as const,
      textTransform: 'uppercase' as const,
      letterSpacing: 0.6,
      color: '#94A3B8',
    },
    mono: {
      fontFamily: 'monospace',
    },
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
  },
  borderRadius: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    full: 9999,
  },
};

interface ThemeContextType {
  themeName: ThemePresetName;
  colors: ThemeColors;
  setThemeName: (name: ThemePresetName) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  themeName: 'Night Ledger',
  colors: THEME_PRESETS['Night Ledger'],
  setThemeName: () => {},
});

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [themeName, setThemeName] = useState<ThemePresetName>('Night Ledger');
  const colors = THEME_PRESETS[themeName];

  return React.createElement(
    ThemeContext.Provider,
    { value: { themeName, colors, setThemeName } },
    children
  );
};

export function useTheme() {
  return useContext(ThemeContext);
}
