# Demo Dataset & Placeholder Seed Backup

This directory contains the original demo/test mock seed dataset used during initial UI prototyping and test suites.

### Contents:
- **`seeder.backup.ts`**: Contains the full demo records including:
  - 3 Placeholder Banks: ICICI Bank, Axis Bank, HDFC Bank
  - 3 Placeholder Credit Cards: HDFC Regalia, Axis Ace, ICICI Coral
  - 6 Placeholder Transactions: Salary inflow, coffee, electricity, Uber, supplies, rent
  - Placeholder Recurring Obligations: Netflix, Home loan EMI, iCloud+, Phone installment
  - Placeholder Investments: Nifty 50 Index Fund SIP, Sovereign Gold Bonds
  - Placeholder Peer Debt & Settlement: Marcus Vance hardware loan

### Production vs Demo Isolation:
In the actual application, user onboarding clears all placeholder dummy accounts and transactions. The active ledger strictly preserves only the user's authentic entered accounts, cards, and opening balances.
