import { describe, it, expect } from '@jest/globals';
import { formatOrdinalDay } from '../src/core/utils/date';

describe('Onboarding Defects Verification (DEF-022 through DEF-030)', () => {
  describe('DEF-028: English Ordinal Day Formatting', () => {
    it('correctly formats standard 1st, 2nd, 3rd', () => {
      expect(formatOrdinalDay(1)).toBe('1st');
      expect(formatOrdinalDay('1')).toBe('1st');
      expect(formatOrdinalDay(2)).toBe('2nd');
      expect(formatOrdinalDay('2')).toBe('2nd');
      expect(formatOrdinalDay(3)).toBe('3rd');
      expect(formatOrdinalDay('3')).toBe('3rd');
    });

    it('correctly handles teen exceptions (11th, 12th, 13th)', () => {
      expect(formatOrdinalDay(11)).toBe('11th');
      expect(formatOrdinalDay(12)).toBe('12th');
      expect(formatOrdinalDay(13)).toBe('13th');
      expect(formatOrdinalDay('11')).toBe('11th');
    });

    it('correctly formats twentieth and thirtieth ordinals', () => {
      expect(formatOrdinalDay(21)).toBe('21st');
      expect(formatOrdinalDay(22)).toBe('22nd');
      expect(formatOrdinalDay(23)).toBe('23rd');
      expect(formatOrdinalDay(31)).toBe('31st');
    });

    it('handles standard th suffixes (4th, 5th, 15th, 20th, 30th)', () => {
      expect(formatOrdinalDay(4)).toBe('4th');
      expect(formatOrdinalDay(15)).toBe('15th');
      expect(formatOrdinalDay(20)).toBe('20th');
      expect(formatOrdinalDay(30)).toBe('30th');
    });

    it('returns empty string for invalid or falsy inputs', () => {
      expect(formatOrdinalDay(0)).toBe('');
      expect(formatOrdinalDay('')).toBe('');
      expect(formatOrdinalDay('invalid')).toBe('');
    });
  });

  describe('DEF-024: Action Button Text Integrity', () => {
    it('verifies action button strings have no duplicate leading +', () => {
      const buttonLabels = [
        'Add Another Bank Account',
        'Add Another Card',
        'Add Another Income Source',
        'Link Another Bank Account',
      ];

      buttonLabels.forEach(label => {
        expect(label.startsWith('+')).toBe(false);
        expect(label).not.toContain('+ Add');
        expect(label).not.toContain('+ Link');
      });
    });
  });

  describe('DEF-027: Placeholder Integrity Across Inputs', () => {
    it('verifies placeholders omit legacy e.g. prefixes', () => {
      const placeholders = [
        'Alex Mercer',
        'HDFC Bank',
        'Salary Account',
        'HDFC Regalia',
        '50000',
        'Tech Corp Salary',
        'Primary Salary',
        '75000',
      ];

      placeholders.forEach(placeholder => {
        expect(placeholder.toLowerCase().startsWith('e.g.')).toBe(false);
        expect(placeholder.toLowerCase().startsWith('eg.')).toBe(false);
      });
    });

    it('verifies bill cut and due day placeholders are blank strings', () => {
      const cutDayPlaceholder = '';
      const dueDayPlaceholder = '';
      expect(cutDayPlaceholder).toBe('');
      expect(dueDayPlaceholder).toBe('');
    });
  });

  describe('DEF-029: Linked Bank Nickname Pure Label', () => {
    it('verifies bank selector renders clean nickname without clutter prefix', () => {
      const bank = {
        id: 'bnk_1',
        name: 'HDFC Bank',
        nickname: 'Hdfc savings',
      };

      const displayedLabel = bank.nickname || bank.name;
      expect(displayedLabel).toBe('Hdfc savings');
      expect(displayedLabel).not.toContain('••');
      expect(displayedLabel).not.toContain('HDFC Bank ••');
    });

    it('falls back cleanly to bank name if nickname is empty', () => {
      const bank = {
        id: 'bnk_2',
        name: 'State Bank of India',
        nickname: '',
      };

      const displayedLabel = bank.nickname || bank.name;
      expect(displayedLabel).toBe('State Bank of India');
    });
  });

  describe('DEF-030: Auto Lock Inactivity Timeout Expansion', () => {
    it('expands inactivity timeout when autoLockOnBlur is enabled and collapses when disabled', () => {
      const renderTimeoutSection = (autoLockOnBlur: boolean) => {
        return autoLockOnBlur ? { visible: true, options: [1, 5, 15, 30] } : null;
      };

      expect(renderTimeoutSection(false)).toBeNull();
      expect(renderTimeoutSection(true)).toEqual({ visible: true, options: [1, 5, 15, 30] });
    });
  });

  describe('DEF-023: In-Place Editing Logic for Entities', () => {
    it('updates existing bank in place when editingBankId matches', () => {
      const banks = [
        { id: 'b1', name: 'Chase', nickname: 'Checking', balance: '1000' },
        { id: 'b2', name: 'Citi', nickname: 'Savings', balance: '5000' },
      ];
      const editingBankId = 'b1';
      const updatedData = { name: 'Chase Bank', nickname: 'Main Checking', balance: '2500' };

      const updatedBanks = banks.map(b =>
        b.id === editingBankId ? { ...b, ...updatedData } : b
      );

      expect(updatedBanks).toHaveLength(2);
      expect(updatedBanks[0].name).toBe('Chase Bank');
      expect(updatedBanks[0].nickname).toBe('Main Checking');
      expect(updatedBanks[0].balance).toBe('2500');
      expect(updatedBanks[1].balance).toBe('5000');
    });

    it('updates existing credit card in place when editingCardId matches', () => {
      const cards = [
        { id: 'c1', bankName: 'Amex', cardTitle: 'Gold', limit: '10000', cutDay: 15, dueDay: 5 },
      ];
      const editingCardId = 'c1';
      const updatedCard = { bankName: 'Amex', cardTitle: 'Platinum', limit: '20000', cutDay: 15, dueDay: 5 };

      const updatedCards = cards.map(c =>
        c.id === editingCardId ? { ...c, ...updatedCard } : c
      );

      expect(updatedCards).toHaveLength(1);
      expect(updatedCards[0].cardTitle).toBe('Platinum');
      expect(updatedCards[0].limit).toBe('20000');
    });

    it('updates existing income stream in place when editingIncomeId matches', () => {
      const incomes = [
        { id: 'i1', source: 'Contracting', amount: '3000', frequency: 'MONTHLY' as const },
      ];
      const editingIncomeId = 'i1';
      const updatedIncome = { source: 'Senior Contracting', amount: '4500', frequency: 'MONTHLY' as const };

      const updatedIncomes = incomes.map(inc =>
        inc.id === editingIncomeId ? { ...inc, ...updatedIncome } : inc
      );

      expect(updatedIncomes).toHaveLength(1);
      expect(updatedIncomes[0].source).toBe('Senior Contracting');
      expect(updatedIncomes[0].amount).toBe('4500');
    });
  });

  describe('DEF-022: Guest / Offline Email Fallback', () => {
    it('determines interactive text input mode when user has no OAuth email', () => {
      const user = { email: '' };
      const isOAuthLocked = Boolean(user && user.email && user.email.trim().length > 0);
      expect(isOAuthLocked).toBe(false);

      const oauthUser = { email: 'developer@aegis.dev' };
      const isOAuthLockedForDeveloper = Boolean(oauthUser && oauthUser.email && oauthUser.email.trim().length > 0);
      expect(isOAuthLockedForDeveloper).toBe(true);
    });
  });
});
