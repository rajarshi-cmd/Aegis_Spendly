# Defect Log — Aegis Spendly v1.0.2 / v1.0.3 (Build 4)

**Release Under Test:** Android Release APK `v1.0.2` (`versionCode: 3`)  
**Resolution Release:** Android Release APK `v1.0.3` (`versionCode: 4`)  
**Tracking Status:** 🟢 All 10 Defects (DEF-010 to DEF-019) Resolved & Verified  
**Platform Scope:** Physical Android Devices (Phones & Tablets)  
**Security Model:** Air-gapped, zero-cloud, encrypted local SQLite database

---

## 📋 Defect Summary Table

| Defect ID | Title | Module | Severity | Reporter | Status | Resolution |
| :--- | :--- | :--- | :---: | :--- | :---: | :--- |
| **DEF-010** | Bank Initial Savings Counted as Earned Income Instead of Savings | Core Accounting / Ledger | High | User | 🟢 Resolved | Fixed in `TransactionsScreen.tsx` & `OverviewScreen.tsx`: Opening Balance excluded from inflow/expenses, counted under savings assets. |
| **DEF-011** | Missing Salary Day Credit Prompt, Confirmation & Profile Salary Sync | Transactions / Profile | Medium | User | 🟢 Resolved | Fixed in `TransactionsScreen.tsx`: Salary check-in prompt banner added with Confirm, Edit, and Profile salary sync options. |
| **DEF-012** | Plan Ahead Pre-Populated Fields, Slider Editing, Paid Amount > 0, & Ledger Segregation | Plan Ahead / Commitments | High | User | 🟢 Resolved | Fixed in `PlanAheadScreen.tsx` & `UpcomingEngine.ts`: Real used budget calculations, interactive budget sliders, paid amount > 0 validation. |
| **DEF-013** | Category Breakdown Donut Uses Hardcoded Mock Data & Category Enforcement | Overview / Add Entry | High | User | 🟢 Resolved | Fixed in `OverviewScreen.tsx` & `AddEntryDrawer.tsx`: Dynamic donut calculation from real expense debits, mandatory category selection. |
| **DEF-014** | Monthly Expenses Historical Bar Chart Populated with Mock Data & Non-Functional Dropdown | Spending Rhythm | Medium | User | 🟢 Resolved | Fixed in `OverviewScreen.tsx`: 12-month bars computed from real transactions (0 for empty months), interactive tap-to-select. |
| **DEF-015** | Missing Calendar Date Picker for Historical / Past Expenses in Add Entry | Add Entry Modal | Medium | User | 🟢 Resolved | Fixed in `AddEntryDrawer.tsx`: Interactive calendar date picker with day grid and navigation added (defaults to today). |
| **DEF-016** | Transaction Rows Lack In-Place Editing Capability | Transactions Ledger | Medium | User | 🟢 Resolved | Fixed in `AccountingEngine.ts`, `queries.ts`, and `TransactionsScreen.tsx`: In-place editing pencil button with full balance adjustment. |
| **DEF-017** | Inactivity-Based Idle Screen Lock vs. Fixed Inopportune Timer | Security / useAuthSecurity | High | User | 🟢 Resolved | Fixed in `App.tsx` & `useAuthSecurity.tsx`: Touch event listener resets inactivity timeout on every screen tap/interaction. |
| **DEF-018** | Transactions Filtered by Month While Sidebar Badge & Overview Display Mismatched Counts | Navigation / Month Filter | Medium | User | 🟢 Resolved | Fixed in `SpendlySidebar.tsx` & `OverviewScreen.tsx`: Removed badge from sidebar, filtered Overview recent transactions by active month. |
| **DEF-019** | Global Month/Year Sync Across Cards & Banks, Interactive Bar Chart Tap, & Custom Header Picker | Navigation / App-Wide State | Medium | User | 🟢 Resolved | Fixed in `SpendlyHeader.tsx`, `CreditCardsScreen.tsx`, `BanksScreen.tsx`: Year/Month picker and app-wide active month sync. |

---

## 🐞 Detailed Defect Reports & Resolutions

### DEF-010: Bank Initial Savings Counted as Earned Income Instead of Savings

* **Defect ID:** `DEF-010`
* **Module:** Core Accounting / Onboarding Ledger
* **Severity:** High
* **Status:** 🟢 Resolved
* **Resolution:** In `TransactionsScreen.tsx` and `OverviewScreen.tsx`, transactions with category or description containing `Opening Balance` are filtered out of `totalInflow` and `totalExpenses`. Initial bank balances are classified strictly as savings/assets. Real earned income is counted when salary or income credits occur.
* **Evidence:** `defects/v1.0.2/assets/DEF-010_initial_balance_inflow.jpg`

---

### DEF-011: Missing Salary Day Credit Prompt, Confirmation & Profile Salary Sync

* **Defect ID:** `DEF-011`
* **Module:** Transactions / Profile Sync
* **Severity:** Medium
* **Status:** 🟢 Resolved
* **Resolution:** Added an interactive Salary Day Check-In card at the top of `TransactionsScreen.tsx`. When active month has no credited salary, it displays the expected salary amount. Users can click "Yes, credited" to immediately log the credit, or "Edit amount" to specify the credited sum. If edited, a dialog asks whether to update future profile salary; choosing Yes persists the new amount into `UserProfile.salary_amount`.

---

### DEF-012: Plan Ahead Pre-Populated Fields, Slider Editing, Paid Amount > 0, & Ledger Segregation

* **Defect ID:** `DEF-012`
* **Module:** Plan Ahead / Commitments & Budgets
* **Severity:** High
* **Status:** 🟢 Resolved
* **Resolution:**
  1. Replaced `mockUsedBudgets` with dynamic calculation from real transactions for `activeMonth`.
  2. Added edit mode in `PlanAheadScreen.tsx` with stepper controls (- ₹500 / + ₹500) and numeric inputs that persist via `updatePlannedBudget` in `kvStorage`.
  3. Added "Pay custom..." option with strict validation enforcing `amount > 0` (`0 cannot be entered`).
  4. Commitments only hit the ledger as transactions upon explicit payment confirmation.
* **Evidence:** `defects/v1.0.2/assets/DEF-012_planned_budgets.jpg`, `defects/v1.0.2/assets/DEF-012_plan_ahead_commitments.jpg`

---

### DEF-013: Category Breakdown Donut Uses Hardcoded Mock Data & Category Enforcement

* **Defect ID:** `DEF-013`
* **Module:** Dashboard Overview & Add Entry Form
* **Severity:** High
* **Status:** 🟢 Resolved
* **Resolution:**
  1. Computed `categoryBreakdown` dynamically from real outflow transactions for `activeMonth`, excluding opening balances.
  2. Mandated category selection in `AddEntryDrawer.tsx` for both Debit and Credit entries with validation blocking submission if unselected.
* **Evidence:** `defects/v1.0.2/assets/DEF-013_category_mock_data.jpg`

---

### DEF-014: Monthly Expenses Historical Bar Chart Populated with Mock Data & Non-Functional Dropdown

* **Defect ID:** `DEF-014`
* **Module:** Spending Rhythm (OverviewScreen)
* **Severity:** Medium
* **Status:** 🟢 Resolved
* **Resolution:** In `OverviewScreen.tsx`, replaced static mock bar data with real transaction aggregation across the 12 calendar months of the active year. Months with zero transactions render at baseline height (0 fake fillup data). Tapping any bar selects and highlights that month.
* **Evidence:** `defects/v1.0.2/assets/DEF-014_monthly_expenses_mock_bars.jpg`

---

### DEF-015: Missing Calendar Date Picker for Historical / Past Expenses in Add Entry

* **Defect ID:** `DEF-015`
* **Module:** Add Entry Modal (Credit & Debit)
* **Severity:** Medium
* **Status:** 🟢 Resolved
* **Resolution:** Built a calendar picker into `AddEntryDrawer.tsx` with month/year navigation, weekday headers, and day selection grid. Defaults to today's date and allows picking past dates for logging historical expenses.

---

### DEF-016: Transaction Rows Lack In-Place Editing Capability

* **Defect ID:** `DEF-016`
* **Module:** Transactions Screen & Database Queries
* **Severity:** Medium
* **Status:** 🟢 Resolved
* **Resolution:** Added `AccountingEngine.updateTransaction()` and `updateTransactionRow()` queries. In `TransactionsScreen.tsx`, each table row now includes an Edit (pencil) button opening `AddEntryDrawer` in edit mode, recalculating account balances upon modification.

---

### DEF-017: Inactivity-Based Idle Screen Lock vs. Fixed Inopportune Timer

* **Defect ID:** `DEF-017`
* **Module:** Security / `useAuthSecurity`
* **Severity:** High
* **Status:** 🟢 Resolved
* **Resolution:** In `useAuthSecurity.tsx`, implemented `recordUserActivity()` tracking `lastActivityTimeRef` and resetting idle timeouts. In `App.tsx`, bound `onTouchStart` and `onResponderGrant` to the root view so screen taps reset the lock countdown.

---

### DEF-018: Transactions Filtered by Month While Sidebar Badge & Overview Display Mismatched Counts

* **Defect ID:** `DEF-018`
* **Module:** Navigation / Header Month Filter / Overview & Transactions Sync
* **Severity:** Medium
* **Status:** 🟢 Resolved
* **Resolution:**
  1. Removed transaction count badge from `SpendlySidebar.tsx`.
  2. Fixed `OverviewScreen.tsx` to slice from `currentMonthTransactions` rather than unfiltered `transactions`.
* **Evidence:** `defects/v1.0.2/assets/DEF-018_transactions_month_filter_empty.jpg`, `defects/v1.0.2/assets/DEF-018_overview_mismatched_month_list.jpg`

---

### DEF-019: Global Month/Year Sync Across Cards & Banks, Interactive Bar Chart Tap, & Custom Header Picker

* **Defect ID:** `DEF-019`
* **Module:** Navigation, Header Month/Year Picker, Cards & Banks Screens, Overview Chart
* **Severity:** Medium
* **Status:** 🟢 Resolved
* **Resolution:**
  1. Implemented Year navigation and 12-month selection grid in `SpendlyHeader.tsx`.
  2. Synchronized `activeMonth` filtering across `CreditCardsScreen.tsx` and `BanksScreen.tsx`.
  3. Made the 12-month bar chart in `OverviewScreen.tsx` interactive (tapping any bar switches active month).

---

### DEF-020: Unable to Create New Vault When Existing Vault Stored (Inherited Existing PIN & Re-opened Old Vault)

* **Defect ID:** `DEF-020` / [GitHub #21](https://github.com/rajarshi-cmd/Aegis_Spendly/issues/21)
* **Module:** Authentication, Vault Lifecycle, PIN Setup & Crypto Session
* **Severity:** High
* **Status:** 🟢 Resolved
* **Symptom:** Selecting "Sign Up (New Vault)" when a vault already existed on the device copied the existing user's `pinHash`, `pinSalt`, and `isOnboarded: true`. Consequently, the app routed directly to `LOCKED` (Lock Screen) rather than `PIN_SETUP`. Entering a new PIN failed with "Incorrect PIN" because it checked the old vault's hash, and entering the old PIN reopened the previous vault.
* **Resolution:**
  1. Implemented `createNewVault(details)` in `useAuthSecurity.tsx` which purges SQLite tables, clears cached profiles/vault keys, and creates a clean `AuthUser` with no PIN (`isOnboarded: false`), transitioning directly to `PIN_SETUP`.
  2. Added email matching check in `signInWithGoogle()` preventing cross-user credential inheritance.
  3. Added confirmation alert in `AuthGateScreen.tsx` before overwriting an existing vault on device.
  4. Verified new PIN entry generates fresh salt/hash and proceeds to `ONBOARDING`.

---

## 💡 Future Suggestions & Proposals (Post-Alpha Review)

### SUG-001 (GitHub Issue #20): Month & Year Granularity Option for Past Historical Transaction Entries
* **Issue ID:** `SUG-001` / [GitHub #20](https://github.com/rajarshi-cmd/Aegis_Spendly/issues/20)
* **Module:** Add Entry Drawer & Historical Data Backfilling
* **Severity:** Enhancement / Proposal
* **Status:** ⏳ Deferred for Alpha Testing
* **Proposal:** When users backfill past expenses from previous months, they frequently cannot recall the exact calendar day. Offer an option or toggle to enter only Month and Year (defaulting to the 1st or month-level record) rather than forcing exact day selection on the calendar.
* **Decision:** No code changes made for v1.0.3. Will collect usage feedback during Alpha user testing before implementing.

