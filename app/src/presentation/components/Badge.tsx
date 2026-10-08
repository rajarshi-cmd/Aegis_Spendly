import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface BadgeProps {
  label: string;
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'neutral';
  color?: string;
  backgroundColor?: string;
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({
  label,
  variant = 'neutral',
  color,
  backgroundColor,
  size = 'md',
}) => {
  let badgeColor = '#9CA3AF';
  let badgeBg = 'rgba(156, 163, 175, 0.15)';

  if (variant === 'success') {
    badgeColor = '#10B981';
    badgeBg = 'rgba(16, 185, 129, 0.15)';
  } else if (variant === 'warning') {
    badgeColor = '#F59E0B';
    badgeBg = 'rgba(245, 158, 11, 0.15)';
  } else if (variant === 'danger') {
    badgeColor = '#EF4444';
    badgeBg = 'rgba(239, 68, 68, 0.15)';
  } else if (variant === 'info') {
    badgeColor = '#38BDF8';
    badgeBg = 'rgba(56, 189, 248, 0.15)';
  }

  if (color) badgeColor = color;
  if (backgroundColor) badgeBg = backgroundColor;

  const isSmall = size === 'sm';

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: badgeBg },
        isSmall && styles.badgeSm,
      ]}
    >
      <Text style={[styles.text, { color: badgeColor }, isSmall && styles.textSm]}>
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeSm: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  text: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  textSm: {
    fontSize: 10,
  },
});
