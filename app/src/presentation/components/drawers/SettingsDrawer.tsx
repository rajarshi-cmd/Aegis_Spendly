import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, ThemePresetName, THEME_PRESETS } from '../../theme';

interface SettingsDrawerProps {
  visible: boolean;
  onClose: () => void;
}

export const SettingsDrawer: React.FC<SettingsDrawerProps> = ({ visible, onClose }) => {
  const { themeName, colors, setThemeName } = useTheme();

  const [activePreset, setActivePreset] = useState<ThemePresetName>(themeName);

  const presets: { id: ThemePresetName; label: string; dotColor: string }[] = [
    { id: 'Soft Mint', label: 'Soft Mint', dotColor: '#0F4C3A' },
    { id: 'Warm Sunset', label: 'Warm Sunset', dotColor: '#9A3412' },
    { id: 'Night Ledger', label: 'Night Ledger', dotColor: '#10B981' },
    { id: 'Lavender', label: 'Lavender', dotColor: '#6D28D9' },
  ];

  const handleSave = () => {
    setThemeName(activePreset);
    onClose();
  };

  const previewColors = THEME_PRESETS[activePreset];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={onClose}
        />
        <View style={[styles.drawerSheet, { backgroundColor: colors.surface }]} pointerEvents="auto">
              {/* Header */}
              <View style={[styles.drawerHeader, { borderBottomColor: colors.borderSubtle }]}>
                <View>
                  <Text style={[styles.microHeader, { color: colors.textMuted }]}>WORKSPACE APPEARANCE</Text>
                  <Text style={[styles.drawerTitle, { color: colors.textPrimary }]}>Settings</Text>
                </View>
                <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                  <Ionicons name="close" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Banner */}
                <View style={[styles.bannerCard, { backgroundColor: colors.primaryLight, borderColor: colors.borderSubtle }]}>
                  <Ionicons name="color-palette-outline" size={18} color={colors.primary} style={{ marginRight: 8 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.bannerTitle, { color: colors.textPrimary }]}>Every color, in one place</Text>
                    <Text style={[styles.bannerDesc, { color: colors.textSecondary }]}>
                      Presets and custom tokens now update panels, type, borders, headers, and buttons.
                    </Text>
                  </View>
                </View>

                {/* Theme Preset Cards */}
                <View style={styles.presetsGrid}>
                  {presets.map((p) => {
                    const isSelected = activePreset === p.id;
                    return (
                      <TouchableOpacity
                        key={p.id}
                        style={[
                          styles.presetCard,
                          {
                            borderColor: isSelected ? colors.primary : colors.border,
                            backgroundColor: isSelected ? colors.primaryLight : colors.surface,
                          },
                        ]}
                        onPress={() => setActivePreset(p.id)}
                      >
                        <View style={[styles.presetDot, { backgroundColor: p.dotColor }]} />
                        <Text
                          style={[
                            styles.presetLabel,
                            { color: isSelected ? colors.primary : colors.textPrimary },
                          ]}
                        >
                          {p.label}
                        </Text>
                        {isSelected && (
                          <Ionicons
                            name="checkmark"
                            size={16}
                            color={colors.primary}
                            style={{ marginLeft: 'auto' }}
                          />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Interface Customization Swatches */}
                <Text style={[styles.sectionHeading, { color: colors.textMuted, marginTop: 22 }]}>
                  CUSTOMIZE INTERFACE
                </Text>
                <View style={[styles.swatchesCard, { borderColor: colors.borderSubtle, backgroundColor: colors.background }]}>
                  {[
                    { label: 'Primary accent', color: previewColors.primary },
                    { label: 'Headers', color: previewColors.surface },
                    { label: 'Buttons', color: previewColors.primary },
                    { label: 'Panels / surfaces', color: previewColors.surface },
                    { label: 'Text', color: previewColors.textPrimary },
                    { label: 'Borders', color: previewColors.border },
                  ].map((s) => (
                    <View key={s.label} style={[styles.swatchRow, { borderBottomColor: colors.borderSubtle }]}>
                      <Text style={[styles.swatchLabel, { color: colors.textSecondary }]}>{s.label}</Text>
                      <View style={[styles.swatchBlock, { backgroundColor: s.color, borderColor: colors.border }]} />
                    </View>
                  ))}
                </View>

                {/* Live Preview Card */}
                <Text style={[styles.sectionHeading, { color: colors.textMuted, marginTop: 20 }]}>PREVIEW</Text>
                <View
                  style={[
                    styles.previewBox,
                    {
                      backgroundColor: previewColors.surface,
                      borderColor: previewColors.border,
                    },
                  ]}
                >
                  <Text style={[styles.previewText, { color: previewColors.textPrimary }]}>
                    Panel, header, and button
                  </Text>
                  <View style={[styles.previewActionBtn, { backgroundColor: previewColors.primary }]}>
                    <Text style={styles.previewActionText}>Sample action</Text>
                  </View>
                </View>
              </ScrollView>

              {/* Bottom Actions */}
              <View style={[styles.drawerFooter, { borderTopColor: colors.borderSubtle }]}>
                <TouchableOpacity style={[styles.saveBtn, { backgroundColor: colors.primary }]} onPress={handleSave}>
                  <Text style={styles.saveBtnText}>Save appearance ✓</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
  },
  drawerSheet: {
    width: '100%',
    maxWidth: 480,
    height: '100%',
    shadowColor: '#000',
    shadowOffset: { width: -4, height: 0 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 20,
    display: 'flex',
    flexDirection: 'column',
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 18,
    borderBottomWidth: 1,
  },
  microHeader: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  drawerTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  scrollContent: {
    padding: 24,
  },
  bannerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
  },
  bannerTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  bannerDesc: {
    fontSize: 11,
    marginTop: 2,
    lineHeight: 16,
  },
  presetsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  presetCard: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '48%',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  presetDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  presetLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  sectionHeading: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  swatchesCard: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  swatchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  swatchLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  swatchBlock: {
    width: 24,
    height: 16,
    borderRadius: 4,
    borderWidth: 1,
  },
  previewBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  previewText: {
    fontSize: 13,
    fontWeight: '600',
  },
  previewActionBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
  },
  previewActionText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  drawerFooter: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderTopWidth: 1,
    alignItems: 'flex-end',
  },
  saveBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 9,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
