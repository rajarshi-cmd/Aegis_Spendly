import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Pressable,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import { PlannedBudget } from '../../../core/types/upcoming';
import { formatRupee } from '../../../core/utils/currency';

interface EditCategorySheetProps {
  visible: boolean;
  budget: PlannedBudget | null;
  spentAmount?: number;
  onClose: () => void;
  onSave: (id: string, updates: { planned_amount: number; category?: string }) => void;
  onDelete?: (id: string) => void;
}

const CATEGORY_ICONS: { name: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { name: 'Shopping', icon: 'cart-outline' },
  { name: 'Dining', icon: 'restaurant-outline' },
  { name: 'Coffee', icon: 'cafe-outline' },
  { name: 'Groceries', icon: 'basket-outline' },
  { name: 'Fitness', icon: 'barbell-outline' },
  { name: 'Transport', icon: 'car-outline' },
  { name: 'Health', icon: 'medkit-outline' },
  { name: 'Bills', icon: 'receipt-outline' },
  { name: 'Entertainment', icon: 'film-outline' },
  { name: 'Home', icon: 'home-outline' },
  { name: 'Pets', icon: 'paw-outline' },
  { name: 'Education', icon: 'school-outline' },
  { name: 'Travel', icon: 'airplane-outline' },
  { name: 'Gifts', icon: 'gift-outline' },
];

const ACCENT_COLORS = ['#52b788', '#ffca45', '#4cc9f0', '#f72585', '#7209b7', '#3a0ca3'];

export const EditCategorySheet: React.FC<EditCategorySheetProps> = ({
  visible,
  budget,
  spentAmount = 0,
  onClose,
  onSave,
  onDelete,
}) => {
  const { colors } = useTheme();

  const [categoryName, setCategoryName] = useState(budget?.category || '');
  const [capAmount, setCapAmount] = useState<string>(budget ? budget.planned_amount.toString() : '500');
  const [selectedIcon, setSelectedIcon] = useState<keyof typeof Ionicons.glyphMap>('cart-outline');
  const [selectedColor, setSelectedColor] = useState<string>('#52b788');

  React.useEffect(() => {
    if (budget) {
      setCategoryName(budget.category);
      setCapAmount(budget.planned_amount.toString());
    }
  }, [budget]);

  const parsedCap = parseFloat(capAmount) || 0;
  const buffer = Math.max(0, parsedCap - spentAmount);

  const handleSave = () => {
    if (!budget) return;
    onSave(budget.id, {
      planned_amount: parsedCap,
      category: categoryName.trim() || budget.category,
    });
    onClose();
  };

  const handleAdjust = (delta: number) => {
    const cur = parseFloat(capAmount) || 0;
    const next = Math.max(100, cur + delta);
    setCapAmount(next.toString());
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[
            styles.sheetContainer,
            { backgroundColor: colors.surfaceContainerLow || '#0d1c2d', borderColor: colors.borderSubtle },
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Grab Handle */}
          <View style={styles.handleWrap}>
            <View style={[styles.grabHandle, { backgroundColor: colors.surfaceVariant || '#273647' }]} />
          </View>

          {/* Header */}
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <Ionicons name="options-outline" size={20} color="#52b788" />
              <Text style={[styles.title, { color: colors.textPrimary }]}>Edit Category Ceiling</Text>
            </View>
            <TouchableOpacity
              style={[styles.closeBtn, { backgroundColor: colors.surfaceContainer || '#122131' }]}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollForm} contentContainerStyle={styles.scrollFormContent} showsVerticalScrollIndicator={false}>
            {/* Category Name & Appearance Card */}
            <View style={[styles.cardSection, { backgroundColor: colors.surfaceContainer || '#122131' }]}>
              <View style={styles.sectionHeaderLine}>
                <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>CATEGORY APPEARANCE</Text>
                <View style={styles.syncBadge}>
                  <Ionicons name="sync-outline" size={11} color="#52b788" />
                  <Text style={styles.syncText}>Syncs to Analytics</Text>
                </View>
              </View>

              <View style={styles.nameRow}>
                <View style={[styles.previewIconBox, { backgroundColor: 'rgba(82, 183, 136, 0.18)' }]}>
                  <Ionicons name={selectedIcon} size={22} color={selectedColor} />
                </View>
                <TextInput
                  style={[
                    styles.nameInput,
                    {
                      backgroundColor: colors.surfaceContainerLowest || '#010f1f',
                      color: colors.textPrimary,
                      borderColor: colors.borderSubtle,
                    },
                  ]}
                  value={categoryName}
                  onChangeText={setCategoryName}
                  placeholder="e.g. Groceries & Supermarket"
                  placeholderTextColor={colors.textMuted}
                />
              </View>

              {/* Icon Picker Horizontal Scroll */}
              <Text style={[styles.pickerLabel, { color: colors.textMuted }]}>Choose Icon</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.iconScroll}>
                {CATEGORY_ICONS.map((item) => {
                  const isIconChosen = selectedIcon === item.icon;
                  return (
                    <TouchableOpacity
                      key={item.name}
                      style={[
                        styles.iconOption,
                        {
                          backgroundColor: isIconChosen ? 'rgba(82,183,136,0.2)' : colors.surfaceContainerHigh || '#1c2b3c',
                          borderColor: isIconChosen ? '#52b788' : 'transparent',
                        },
                      ]}
                      onPress={() => setSelectedIcon(item.icon)}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name={item.icon}
                        size={19}
                        color={isIconChosen ? '#52b788' : colors.textMuted}
                      />
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Accent Color Dots */}
              <View style={styles.colorRow}>
                <Text style={[styles.pickerLabel, { color: colors.textMuted, marginBottom: 0 }]}>
                  Accent Palette
                </Text>
                <View style={styles.colorsList}>
                  {ACCENT_COLORS.map((c) => (
                    <TouchableOpacity
                      key={c}
                      style={[
                        styles.colorDot,
                        { backgroundColor: c },
                        selectedColor === c && styles.colorDotSelected,
                      ]}
                      onPress={() => setSelectedColor(c)}
                      activeOpacity={0.8}
                    />
                  ))}
                </View>
              </View>
            </View>

            {/* Current Month Spent vs Buffer Notice */}
            <View style={[styles.noticeBox, { backgroundColor: colors.surfaceContainer || '#122131' }]}>
              <View style={styles.noticeLeft}>
                <Ionicons name="checkmark-circle" size={17} color="#52b788" />
                <Text style={[styles.noticeText, { color: colors.textPrimary }]}>
                  Current Month Spent: <Text style={{ fontWeight: '700' }}>{formatRupee(spentAmount)}</Text>
                </Text>
              </View>
              <View style={styles.bufferPill}>
                <Text style={styles.bufferPillText}>{formatRupee(buffer)} buffer</Text>
              </View>
            </View>

            {/* Monthly Ceiling Limit Input with Quick Presets */}
            <View style={[styles.cardSection, { backgroundColor: colors.surfaceContainer || '#122131' }]}>
              <View style={styles.sectionHeaderLine}>
                <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>MONTHLY CEILING LIMIT</Text>
                <Text style={[styles.sectionRange, { color: colors.textMuted }]}>Min ₹100 • Max ₹5,00,000</Text>
              </View>

              <View
                style={[
                  styles.amountInputWrap,
                  { backgroundColor: colors.surfaceContainerLowest || '#010f1f', borderColor: colors.borderSubtle },
                ]}
              >
                <Text style={styles.rupeeSymbol}>₹</Text>
                <TextInput
                  style={[styles.amountInput, { color: colors.textPrimary }]}
                  value={capAmount}
                  onChangeText={setCapAmount}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor={colors.textMuted}
                />
              </View>

              {/* Quick Preset Buttons */}
              <View style={styles.presetButtonsRow}>
                <TouchableOpacity
                  style={[styles.presetBtn, { backgroundColor: colors.surfaceContainerHigh || '#1c2b3c' }]}
                  onPress={() => handleAdjust(-50)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.presetBtnText, { color: colors.textPrimary }]}>- ₹50</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.presetBtn, { backgroundColor: colors.surfaceContainerHigh || '#1c2b3c' }]}
                  onPress={() => handleAdjust(50)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.presetBtnText, { color: colors.textPrimary }]}>+ ₹50</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.presetBtn, { backgroundColor: colors.surfaceContainerHigh || '#1c2b3c' }]}
                  onPress={() => handleAdjust(250)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.presetBtnText, { color: colors.textPrimary }]}>+ ₹250</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.presetBtn, { backgroundColor: colors.surfaceContainerHigh || '#1c2b3c' }]}
                  onPress={() => handleAdjust(500)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.presetBtnText, { color: colors.textPrimary }]}>+ ₹500</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.actionsWrap}>
              <TouchableOpacity
                style={styles.saveBtn}
                onPress={handleSave}
                activeOpacity={0.85}
              >
                <Ionicons name="checkmark" size={19} color="#003915" />
                <Text style={styles.saveBtnText}>Save Changes</Text>
              </TouchableOpacity>

              <View style={styles.secondaryActionsRow}>
                <TouchableOpacity
                  style={[styles.cancelBtn, { backgroundColor: colors.surfaceContainer || '#122131' }]}
                  onPress={onClose}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.cancelBtnText, { color: colors.textPrimary }]}>Cancel</Text>
                </TouchableOpacity>

                {onDelete && budget && (
                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={() => {
                      onDelete(budget.id);
                      onClose();
                    }}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="trash-outline" size={16} color="#ffb4ab" />
                    <Text style={styles.deleteBtnText}>Delete</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(5, 20, 36, 0.75)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingHorizontal: 20,
    paddingBottom: 28,
    maxHeight: '85%',
    overflow: 'hidden',
  },
  handleWrap: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  grabHandle: {
    width: 44,
    height: 5,
    borderRadius: 3,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollForm: {
    maxHeight: 520,
  },
  scrollFormContent: {
    gap: 14,
    paddingBottom: 20,
  },
  cardSection: {
    borderRadius: 16,
    padding: 14,
    gap: 10,
  },
  sectionHeaderLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  sectionRange: {
    fontSize: 10,
  },
  syncBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: 'rgba(82, 183, 136, 0.1)',
  },
  syncText: {
    color: '#52b788',
    fontSize: 10,
    fontWeight: '600',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  previewIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nameInput: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 14,
    fontWeight: '600',
    borderWidth: 1,
  },
  pickerLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
  },
  iconScroll: {
    gap: 8,
    paddingVertical: 4,
  },
  iconOption: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  colorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  colorsList: {
    flexDirection: 'row',
    gap: 8,
  },
  colorDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
  },
  colorDotSelected: {
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  noticeBox: {
    borderRadius: 14,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  noticeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  noticeText: {
    fontSize: 12,
  },
  bufferPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    backgroundColor: 'rgba(82, 183, 136, 0.16)',
  },
  bufferPillText: {
    color: '#52b788',
    fontSize: 11,
    fontWeight: '700',
  },
  amountInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 48,
    borderWidth: 1,
  },
  rupeeSymbol: {
    color: '#52b788',
    fontSize: 20,
    fontWeight: '700',
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
  },
  presetButtonsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  presetBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetBtnText: {
    fontSize: 11,
    fontWeight: '600',
  },
  actionsWrap: {
    gap: 8,
    marginTop: 8,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#52b788',
    gap: 6,
    shadowColor: '#52b788',
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  saveBtnText: {
    color: '#003915',
    fontSize: 14,
    fontWeight: '700',
  },
  secondaryActionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  cancelBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  deleteBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 180, 171, 0.15)',
    gap: 6,
  },
  deleteBtnText: {
    color: '#ffb4ab',
    fontSize: 13,
    fontWeight: '700',
  },
});
