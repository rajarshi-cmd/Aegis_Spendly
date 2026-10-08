import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CreditHealth } from '../../../core/types';
import { theme } from '../../../presentation/theme';
import { Badge } from '../../../presentation/components/Badge';
import { formatRupee } from '../../../core/utils/currency';

interface CreditHealthCardProps {
  health: CreditHealth;
  cutDay: number | null;
  dueDay: number | null;
}

export const CreditHealthCard: React.FC<CreditHealthCardProps> = ({ health, cutDay, dueDay }) => {
  const percentCapped = Math.min(100, health.utilizationPercentage);

  return (
    <View style={[styles.card, { borderColor: health.themeColor + '44' }]}>
      <View style={styles.headerRow}>
        <View style={styles.titleWithIcon}>
          <View style={[styles.iconWrap, { backgroundColor: health.backgroundColor }]}>
            <Ionicons name="card-outline" size={18} color={health.themeColor} />
          </View>
          <View>
            <Text style={styles.cardName}>{health.accountName}</Text>
            <Text style={styles.limitLabel}>
              Limit: {formatRupee(health.creditLimit, { decimals: 0 })}
            </Text>
          </View>
        </View>
        <Badge
          label={health.badgeLabel}
          color={health.themeColor}
          backgroundColor={health.backgroundColor}
        />
      </View>

      <View style={styles.balanceRow}>
        <View>
          <Text style={styles.balanceLabel}>Current Debt</Text>
          <Text style={styles.balanceValue}>
            {formatRupee(health.creditDebt, { decimals: 2 })}
          </Text>
        </View>

        <View style={styles.utilizationBox}>
          <Text style={[styles.utilizationText, { color: health.themeColor }]}>
            {health.utilizationPercentage.toFixed(1)}%
          </Text>
          <Text style={styles.utilizationLabel}>Utilization</Text>
        </View>
      </View>

      {/* Linear progress bar */}
      <View style={styles.progressTrack}>
        <View
          style={[
            styles.progressFill,
            { width: `${percentCapped}%`, backgroundColor: health.themeColor },
          ]}
        />
      </View>

      <View style={styles.footerRow}>
        <Text style={styles.footerText}>
          {cutDay ? `Cycle Cut: Day ${cutDay}` : 'No cut day'}
          {dueDay ? ` • Due: Day ${dueDay}` : ''}
        </Text>
        <Text style={[styles.statusDescription, { color: health.themeColor }]}>
          {health.description}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  titleWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardName: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  limitLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: theme.spacing.sm,
  },
  balanceLabel: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
  },
  balanceValue: {
    fontSize: 20,
    fontWeight: '800',
    color: theme.colors.textPrimary,
    fontFamily: 'monospace',
    marginTop: 2,
  },
  utilizationBox: {
    alignItems: 'flex-end',
  },
  utilizationText: {
    fontSize: 16,
    fontWeight: '800',
    fontFamily: 'monospace',
  },
  utilizationLabel: {
    fontSize: 10,
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
  },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
    marginVertical: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  footerText: {
    fontSize: 11,
    color: theme.colors.textMuted,
  },
  statusDescription: {
    fontSize: 11,
    fontWeight: '600',
  },
});
