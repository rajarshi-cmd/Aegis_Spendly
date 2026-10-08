# Aegis Finance — Phase 1 & Expanded Architecture

An air-gapped, privacy-focused, local-first personal finance application for iOS, Android, and Web built on strict domain-driven design, transactional Write-Ahead Logging (WAL) relational persistence, double-entry ledger mechanics, and zero-cloud hardware security.

---

## 1. Architectural Highlights & Zero-Cloud Mandate

- **Zero-Cloud & Air-Gapped**: The application operates without remote server dependencies, analytics telemetry, or cloud synchronization. All financial data resides exclusively within the physical device sandbox.
- **System Security & OS Privacy Shield**:
  - Automated operating system cloud backups are explicitly disabled (`allowBackup: false` on Android, local sandbox isolation on iOS).
  - Hardware screen capture protection (`FLAG_SECURE` / `expo-screen-capture`) blocks unauthorized screenshots and screen recordings.
  - An intelligent **Privacy Curtain** automatically masks the UI whenever the device enters the system multitasking app switcher (`AppState: inactive / background`), preventing sensitive financial figures from leaking to the OS switcher tray.
- **Cross-Platform Native Experience**: Built using modern React Native and Expo with `react-native-safe-area-context` to accommodate notches, dynamic islands, home indicator bars, and system navigation bars across iOS and Android devices, alongside a fast Web preview adapter.
- **100% Strict Type Safety**: Full TypeScript strict mode compliance (`tsc --noEmit` passes with 0 errors) covering database records, ledger schemas, balance calculation engines, and UI presentation components.

---

## 2. Navigation & Feature Domains

The application features 6 core tabs designed for complete visibility and control over personal wealth, recurring obligations, and liabilities:

```
┌─────────────┬─────────────┬─────────────┬─────────────┬─────────────┬─────────────┐
│  DASHBOARD  │  ACCOUNTS   │  UPCOMING   │ INVESTMENTS │   LEDGER    │  ANALYTICS  │
└─────────────┴─────────────┴─────────────┴─────────────┴─────────────┴─────────────┘
```

### 1. Dashboard View
- High-level overview contrasting total liquid bank cash against total unpaid credit card liabilities.
- Real-time credit card health cards with linear utilization bars and color-coded status badges.
- Quick entry triggers to record new transactions or add new financial accounts.

### 2. Dedicated Accounts & Cards Manager (`/accounts`)
- **Bank Deposit Accounts**:
  - User-editable nicknames, running liquid balance, and **Minimum Account Balance Requirement**.
  - Real-time alert banner warning when bank balances drop below the mandatory minimum threshold.
  - Individual transaction history filtered specifically for each account.
- **Credit Cards**:
  - Editable nicknames, credit limits, monthly billing cut dates, and payment due dates.
  - Linear utilization progress indicator and dynamic tier badge (Optimal `<15%`, Caution `15–30%`, Hazard `>30%`).
  - View individual card transaction ledger.
  - **Linked EMIs**: View all active EMI installment plans specifically routed through this card.
  - Interactive **Edit Modal** to update limits, dates, and balance rules in place.

### 3. Dedicated Upcoming Payments Manager (`/upcoming`)
- Tracks recurring commitments categorized into **Subscriptions**, **EMIs**, and **Loans (Car, Home, Personal)**.
- **Tenure & Terms Tracking**:
  - Displays remaining months vs total tenure (e.g., `8 / 24 months remaining`) with dynamic progress indicators.
  - Displays loan principal amount, annual interest rate `%` (e.g., `5.4% APR`), and monthly installment amount.
- **One-Tap "Click Paid" Action**:
  - Executes atomic monthly payment workflow:
    1. Debits the linked bank account or increments card debt.
    2. Writes an immutable ledger outflow record.
    3. Decrements remaining tenure months by 1 (marks as `COMPLETED` when tenure reaches 0).
    4. Stamps `last_paid_date` to prevent duplicate payments within the same billing month.
- **Add Obligation Workflow**: Create new subscriptions, credit card EMIs, or multi-year bank loans with customizable interest rates and due days.

### 4. Dedicated Investments & SIPs Manager (`/investments`)
- Comprehensive asset and Systematic Investment Plan (SIP) tracker (Equities, Mutual Funds, Retirement, Real Estate, Crypto).
- **Portfolio Metrics**:
  - Real-time calculation of Total Invested Capital vs Current Portfolio Valuation.
  - Absolute Profit / Loss and Percentage Return calculation:
    $$\text{Return } (\%) = \left(\frac{\text{Current Value} - \text{Invested Capital}}{\text{Invested Capital}}\right) \times 100$$
  - Monthly SIP Commitment sum indicator.
- **One-Tap "Execute SIP" Action**:
  - Automatically debits the designated bank account, increments total invested capital and asset valuation, and logs an audited investment transaction.
- **Add Investment Modal**: Easily configure recurring SIPs or lump-sum asset holdings.

### 5. High-Density Tabular Ledger & P2P Debt Manager (`/ledger`)
- Structured data grid featuring alternating row backgrounds (`#0F172A` / `#131D31`), category badge chips, and right-aligned monetary values.
- Instant search filter by description, category, or reference number, with segment switchers (All Movements, Expenses, Income, Account filter chips).
- Subsegment toggle for **P2P Loans & Bilateral Obligations**:
  - Track capital to collect vs capital to repay.
  - Real-time urgency indicators: Safe ($>3\text{ days}$), Approaching ($0\text{–}3\text{ days}$), and Overdue ($<0\text{ days}$).
  - Full or partial repayment modal with atomic bank balance reconciliation.

### 6. Analytics & Native PDF Export (`/analytics`)
- Dynamic temporal boundaries for Current Monthly Cycle, Calendar/Fiscal Annual Cycle, and Custom Date Ranges.
- Key KPI tiles: aggregate Inflows, aggregate Outflows, Net Savings ($\text{Inflows} - \text{Outflows}$), and Category Spend Distribution with percentage shares.
- Vector-based PDF statement generator using `expo-print` + native OS share sheet (`expo-sharing`).

---

## 3. Persistence Engine & Relational Schema

Powered by embedded SQLite with **Write-Ahead Logging (`PRAGMA journal_mode = WAL;`)**, enforced relational foreign keys (`PRAGMA foreign_keys = ON;`), and crash-resilient storage (`PRAGMA synchronous = NORMAL;`).

### Relational Schema (V1 + V2 Migrations)

1. **`accounts`**:
   - `id`: UUID Primary Key
   - `name`: Text label / nickname
   - `type`: Check constraint `('BANK_DEPOSIT', 'CREDIT_CARD')`
   - `balance`: Real running balance
   - `credit_limit`: Real credit limit for credit cards
   - `billing_cycle_cut_day`: Integer (1–31)
   - `payment_due_day`: Integer (1–31)
   - `minimum_balance`: Real minimum balance requirement for bank deposits (V2)
   - `created_at`, `updated_at`: ISO-8601 timestamps

2. **`transactions`**:
   - `id`: UUID Primary Key
   - `account_id`: Foreign key referencing `accounts(id)`
   - `type`: Check constraint `('INFLOW', 'OUTFLOW', 'TRANSFER')`
   - `amount`: Strictly positive amount (`amount > 0`)
   - `category`: Classification tag
   - `description`: Optional text
   - `timestamp`: ISO-8601 transaction date
   - `is_reconciled`: Integer boolean flag (`0` or `1`)
   - `reference_number`: Optional transaction reference
   - `source`: Source tag (defaults to `'MANUAL'`)
   - `sync_status`: Flagged as `'LOCAL_ONLY'`
   - `destination_account_id`: Optional target account for transfers

3. **`debts`**:
   - `id`: UUID Primary Key
   - `counterparty`: Entity or peer name
   - `direction`: Check constraint `('LENT', 'BORROWED')`
   - `principal_amount`: Initial loan principal
   - `outstanding_balance`: Current remaining unpaid amount
   - `settlement_account_id`: Foreign key referencing settling deposit account
   - `origination_date`, `due_date`: ISO-8601 timestamps
   - `status`: Check constraint `('ACTIVE', 'PARTIALLY_SETTLED', 'SETTLED', 'OVERDUE')`
   - `notes`: Contract terms / notes

4. **`settlements`**:
   - `id`: UUID Primary Key
   - `debt_id`: Foreign key referencing `debts(id)`
   - `amount`: Repayment amount
   - `settlement_date`: ISO-8601 timestamp
   - `settlement_account_id`: Foreign key referencing settling bank account
   - `notes`: Audit note / installment memo

5. **`recurring_obligations`** (V2):
   - `id`: UUID Primary Key
   - `name`: Obligation label (e.g. Netflix, Car Loan, MacBook EMI)
   - `type`: Check constraint `('SUBSCRIPTION', 'EMI', 'LOAN')`
   - `amount`: Recurring monthly payment amount
   - `due_day`: Day of month (1–31)
   - `linked_account_id`: Foreign key referencing `accounts(id)`
   - `total_tenure_months`: Total duration in months (nullable for subscriptions)
   - `remaining_tenure_months`: Remaining months count (nullable for subscriptions)
   - `principal_amount`: Initial loan principal (nullable for subscriptions)
   - `interest_rate`: Annual interest rate % (e.g. `5.4` for 5.4%)
   - `last_paid_date`: ISO-8601 timestamp of last payment
   - `status`: Check constraint `('ACTIVE', 'COMPLETED', 'PAUSED')`
   - `notes`: Optional notes

6. **`investments`** (V2):
   - `id`: UUID Primary Key
   - `name`: Asset name (e.g., S&P 500 Index, Tech ETF, Sovereign Gold Bond)
   - `type`: Check constraint `('SIP', 'MUTUAL_FUND', 'EQUITY', 'RETIREMENT', 'COMMODITY', 'OTHER')`
   - `monthly_sip_amount`: Scheduled recurring monthly SIP amount (nullable)
   - `sip_due_day`: Day of month for SIP execution (1–31)
   - `linked_account_id`: Foreign key referencing funding bank account
   - `invested_amount`: Cumulative invested capital
   - `current_value`: Current estimated market valuation
   - `last_sip_date`: ISO-8601 timestamp of last SIP execution
   - `notes`: Optional notes

---

## 4. Encryption & Spreadsheet Integration Architecture

### Local Password Encryption (SQLCipher / AES-256)
- **At-Rest Database Encryption**:
  To protect physical storage against filesystem-level extraction, the SQLite database can be encrypted using **SQLCipher 256-bit AES-GCM**.
- **Key Derivation**:
  The user enters a master passcode on initial setup. A 256-bit key is derived via PBKDF2 / Argon2id with 100,000+ iterations and a unique salt stored in iOS Keychain / Android Keystore (`expo-secure-store`). The raw passcode is never stored.
- **Passcode Protection Screen**:
  On app launch or resuming from background, the app displays a biometric (FaceID / Fingerprint) or passcode prompt to decrypt the database key.

### Locked Excel (`.xlsx`) & Google Sheets Tracking
- **Password-Protected Excel Export**:
  Export monthly or annual statements into standard Excel format (`.xlsx`) protected with AES-128/256 workbook encryption via pure client-side libraries.
### Private Google Sheets & Google Drive Sync (Zero-Cost BYOC Architecture)
- **Zero Third-Party Cloud Infrastructure**:
  Rather than routing user finances through developer-hosted proxy servers, AWS Lambda, or centralized databases (which incur compute and egress costs), Aegis Finance operates on a **Pure Client-Side BYOC (Bring Your Own Cloud)** model. Data is transmitted directly and peer-to-peer between the user's mobile device and their private Google Drive account.
- **Immutable Architectural Rate Limiting Shield**:
  To protect personal Google Cloud quotas, prevent battery/data drain, and guarantee that the developer faces **\$0.00 cloud expenses forever**, the application incorporates an architecturally frozen, tamper-proof rate limiter:
  - **Minimum Cooldown**: 60 seconds minimum interval required between syncs.
  - **Hourly Ceiling**: Maximum 6 sync operations per rolling 60-minute window.
  - **Daily Ceiling**: Maximum 24 sync operations per rolling 24-hour window.
  - **Payload Ceilings**: Maximum 5 MB payload size and maximum 10,000 transactions per batch.
  - **Tamper & Clock Rollback Detection**: Rate limiter execution histories are authenticated with salted SHA-256 HMAC signatures. System clock rewinds ($>5\text{s}$) or storage tampering trigger an automatic 5-minute defensive lockout penalty (`PENALTY_ACTIVE`).
  - **Destination-Side Token Bucket Quota**: The companion `finance-tracker/Code.gs` Web App gateway throttles incoming requests via `CacheService`, dropping out-of-band automated attacks in $<10\text{ms}$ with HTTP 429.
- **Full Phase 2 Architectural Specification**:
  See [docs/PHASE_2_GOOGLE_DRIVE_INTEGRATION_SPECIFICATION.md](file:///d:/Finance%20Tracker/docs/PHASE_2_GOOGLE_DRIVE_INTEGRATION_SPECIFICATION.md) for full threat modeling, GCP OAuth credentials setup, and roadmap.

---

## 5. Verification & Test Suite

The test suite contains 17 automated Jest test suites and 180 comprehensive unit tests verifying:
- Double-entry accounting mutations (bank deposits vs card debt balances)
- Credit health formula & dynamic status tier boundaries (<15% green, 15–30% amber, >30% red)
- Bilateral P2P debt principles and settlement transactions
- Recurring payment execution, tenure decrement, and completion triggers
- Systematic Investment Plan (SIP) execution and portfolio returns calculations
- Temporal date filtering, net savings, and spend breakdown analytics
- Database schema migrations (V1 & V2) and first-launch mock data seeder
- Onboarding lifecycle, multi-account setup, and PIN-protected storage paths
- Immutable rate limiting boundaries, sliding windows, payload caps, clock rollback guards, and tamper detection

```bash
# Run unit test suite (17 suites, 180 tests)
npm test

# Run strict TypeScript compilation check (0 errors)
npm run typecheck

# Start Expo development server (Web, iOS, Android)
npm start
```

Dev Server Web Preview is hosted at `http://localhost:8081`.
