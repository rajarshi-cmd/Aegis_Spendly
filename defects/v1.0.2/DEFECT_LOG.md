# Defect Log — Aegis Spendly v1.0.2 (Build 3)

**Release Under Test:** Android Release APK `v1.0.2` (`versionCode: 3`)  
**Tracking Status:** Active / Defects Cataloged  
**Platform Scope:** Physical Android Devices (Phones & Tablets)  
**Security Model:** Air-gapped, zero-cloud, encrypted local SQLite database

---

## 📋 Defect Summary Table

| Defect ID | Title | Module | Severity | Reporter | Status | Resolution |
| :--- | :--- | :--- | :---: | :--- | :---: | :--- |
| **DEF-010** | Bank Initial Savings Counted as Earned Income Instead of Savings | Core Accounting / Ledger | High | User | 🔴 Open | Pending Fix |
| **DEF-011** | Missing Salary Day Credit Prompt, Confirmation & Profile Salary Sync | Transactions / Profile | Medium | User | 🔴 Open | Pending Fix |
| **DEF-012** | Plan Ahead Pre-Populated Fields, Slider Editing, Paid Amount > 0, & Ledger Segregation | Plan Ahead / Commitments | High | User | 🔴 Open | Pending Fix |
| **DEF-013** | Category Breakdown Donut Uses Hardcoded Mock Data & Category Enforcement | Overview / Add Entry | High | User | 🔴 Open | Pending Fix |
| **DEF-014** | Monthly Expenses Historical Bar Chart Populated with Mock Data & Non-Functional Dropdown | Spending Rhythm | Medium | User | 🔴 Open | Pending Fix |
| **DEF-015** | Missing Calendar Date Picker for Historical / Past Expenses in Add Entry | Add Entry Modal | Medium | User | 🔴 Open | Pending Fix |
| **DEF-016** | Transaction Rows Lack In-Place Editing Capability | Transactions Ledger | Medium | User | 🔴 Open | Pending Fix |
| **DEF-017** | Inactivity-Based Idle Screen Lock vs. Fixed Inopportune Timer | Security / useAuthSecurity | High | User | 🔴 Open | Pending Fix |
| **DEF-018** | Transactions Filtered by Month While Sidebar Badge & Overview Display Mismatched Counts | Navigation / Month Filter | Medium | User | 🔴 Open | Pending Fix |
| **DEF-019** | Global Month/Year Sync Across Cards & Banks, Interactive Bar Chart Tap, & Custom Header Picker | Navigation / App-Wide State | Medium | User | 🔴 Open | Pending Fix |

---

## 🐞 Detailed Defect Reports

### DEF-010: Bank Initial Savings Counted as Earned Income Instead of Savings

* **Defect ID:** `DEF-010`
* **Module:** Core Accounting / Onboarding Ledger
* **Severity:** High
* **Discovered In:** Android Release APK v1.0.2 (Build 3)
* **Status:** 🔴 Open

#### 📝 Description
During initial account setup, entering initial bank balances generates an inflow transaction categorized as `Opening Balance`. However, the Transactions metrics summary cards and accounting engine treat this opening capital as current monthly earned income (`TOTAL INFLOW`). Similarly, opening credit card debt was counted as current month expenses.

#### 🎯 Expected vs. Actual Behavior
* **Expected:** Starting bank balances represent existing capital / savings assets, NOT this month's earned income. `TOTAL INFLOW` must strictly reflect actual income (salary credits or recorded income deposits).
* **Actual:** Initial account balances (e.g. ₹20,000 + ₹65,000 = ₹85,000) are counted as monthly inflow.
* **Evidence:** `defects/v1.0.2/assets/DEF-010_initial_balance_inflow.jpg`

---

### DEF-011: Missing Salary Day Credit Prompt, Confirmation & Profile Salary Sync

* **Defect ID:** `DEF-011`
* **Module:** Transactions / Profile Sync
* **Severity:** Medium
* **Discovered In:** Android Release APK v1.0.2 (Build 3)
* **Status:** 🔴 Open

#### 📝 Description
When the user's scheduled salary credit day arrives, there is no automatic in-app prompt in the transactions or dashboard asking if their salary was credited.

#### 🎯 Expected vs. Actual Behavior
* **Expected:** On or after the user's configured salary credit day, show a prompt in Transactions asking: *"Did your salary credit today?"*
  1. Allow confirming the pre-set amount or entering an edited amount.
  2. If the user edits the amount, prompt: *"Would you like to update your future monthly salary to ₹X in your profile?"* [Yes / No].
  3. If Yes, persist the updated salary into profile storage.
* **Actual:** No prompt or confirmation flow exists.

---

### DEF-012: Plan Ahead Pre-Populated Fields, Slider Editing, Paid Amount > 0, & Ledger Segregation

* **Defect ID:** `DEF-012`
* **Module:** Plan Ahead / Commitments & Budgets
* **Severity:** High
* **Discovered In:** Android Release APK v1.0.2 (Build 3)
* **Status:** 🔴 Open

#### 📝 Description
The Plan Ahead section displays pre-populated commitments that cannot be adjusted via sliders upon editing. Commitments must not count as transactions until marked Paid, and the payment amount field currently allows `0`.

#### 🎯 Expected vs. Actual Behavior
* **Expected:**
  1. Existing planned ahead items should be editable with a slider / numeric control to adjust amounts.
  2. Planned commitments (EMIs, Subscriptions, SIPs, Loans) must NEVER be counted as actual transactions until explicitly marked "Paid" (or paid with an edited amount).
  3. In the paid amount field, `0` cannot be entered (must be > 0).
* **Actual:** Pre-populated items lack slider editing, and zero amounts could be entered.
* **Evidence:** `defects/v1.0.2/assets/DEF-012_planned_budgets.jpg`, `defects/v1.0.2/assets/DEF-012_plan_ahead_commitments.jpg`

---

### DEF-013: Category Breakdown Donut Uses Hardcoded Mock Data & Category Enforcement

* **Defect ID:** `DEF-013`
* **Module:** Dashboard Overview & Add Entry Form
* **Severity:** High
* **Discovered In:** Android Release APK v1.0.2 (Build 3)
* **Status:** 🔴 Open

#### 📝 Description
In `OverviewScreen.tsx`, the "Spend & save by category" donut chart and list display hardcoded mock percentages and amounts (e.g. Food ₹5.1k, Home ₹4.2k, Shopping ₹3.5k) instead of real user data. Furthermore, debit and credit entries can be saved without selecting a category.

#### 🎯 Expected vs. Actual Behavior
* **Expected:**
  1. Dynamically calculate the category breakdown purely from real user transactions marked as expenses/debits. Zero imaginary data.
  2. Enforce category selection on ALL debit and credit entries before saving.
* **Actual:** Hardcoded mock numbers displayed regardless of user ledger state.
* **Evidence:** `defects/v1.0.2/assets/DEF-013_category_mock_data.jpg`

---

### DEF-014: Monthly Expenses Historical Bar Chart Populated with Mock Data & Non-Functional Dropdown

* **Defect ID:** `DEF-014`
* **Module:** Spending Rhythm (OverviewScreen)
* **Severity:** Medium
* **Discovered In:** Android Release APK v1.0.2 (Build 3)
* **Status:** 🔴 Open

#### 📝 Description
The "Monthly expenses" bar chart renders hardcoded mock bars for the previous 11 months (Nov to Sep) for newly initialized profiles. The "Last 12 months" dropdown is static and non-interactive.

#### 🎯 Expected vs. Actual Behavior
* **Expected:**
  1. Only render monthly expense bars from real user transactions recorded in SQLite; non-recorded past months should show zero.
  2. Implement functional Month and Year filter dropdowns.
* **Actual:** 11 previous months filled with imaginary green bars.
* **Evidence:** `defects/v1.0.2/assets/DEF-014_monthly_expenses_mock_bars.jpg`

---

### DEF-015: Missing Calendar Date Picker for Historical / Past Expenses in Add Entry

* **Defect ID:** `DEF-015`
* **Module:** Add Entry Modal (Credit & Debit)
* **Severity:** Medium
* **Discovered In:** Android Release APK v1.0.2 (Build 3)
* **Status:** 🔴 Open

#### 📝 Description
When adding a new entry (Debit or Credit), there is no date field or calendar selection tool. All transactions are timestamped with the current moment (`Date.now()`), preventing users from entering past expenses.

#### 🎯 Expected vs. Actual Behavior
* **Expected:** Include a date field with an interactive calendar / date picker so users can log past transactions. Default to today's date if untouched.
* **Actual:** Date field is missing; always defaults to current time.

---

### DEF-016: Transaction Rows Lack In-Place Editing Capability

* **Defect ID:** `DEF-016`
* **Module:** Transactions Screen
* **Severity:** Medium
* **Discovered In:** Android Release APK v1.0.2 (Build 3)
* **Status:** 🔴 Open

#### 📝 Description
The transaction ledger only supports row deletion via the trash icon. Users cannot edit an existing transaction if they made a typo in the amount, category, date, or source account.

#### 🎯 Expected vs. Actual Behavior
* **Expected:** Tapping a transaction row (or clicking an Edit button) opens an edit modal allowing full modification of date, amount, category, description, and source account with immediate balance recalculation.
* **Actual:** Only deletion is supported.
* **Evidence:** `defects/v1.0.2/assets/DEF-010_initial_balance_inflow.jpg`

---

### DEF-017: Inactivity-Based Idle Screen Lock vs. Fixed Inopportune Timer

* **Defect ID:** `DEF-017`
* **Module:** Security / `useAuthSecurity`
* **Severity:** High
* **Discovered In:** Android Release APK v1.0.2 (Build 3)
* **Status:** 🔴 Open

#### 📝 Description
The auto-lock timer in `useAuthSecurity.tsx` triggers on a fixed elapsed timer from when the vault was unlocked, rather than detecting true user inactivity. As a result, active screen taps, scrolls, and data entry do not reset the countdown, abruptly locking the app in the middle of active user interactions.

#### 🎯 Expected vs. Actual Behavior
* **Expected:** Inactivity timer should monitor user interaction (screen touches, typing, navigation) and reset the countdown timer on every touch. Only lock the app if there is genuine zero activity for the configured duration.
* **Actual:** Fixed timer fires regardless of active user touches.

---

### DEF-018: Transactions Filtered by Month While Sidebar Badge & Overview Display Mismatched Counts

* **Defect ID:** `DEF-018`
* **Module:** Navigation / Header Month Filter / Overview & Transactions Sync
* **Severity:** Medium
* **Discovered In:** Android Release APK v1.0.2 (Build 3)
* **Status:** 🔴 Open

#### 📝 Description
When the user switches the header month selector away from the month in which transactions were recorded (e.g. to 'August 2026' when transactions were created in 'October 2026'), all transactions disappear from `TransactionsScreen` (`0 entries in your personal ledger`). However:
1. The left sidebar `Transactions` navigation item still displays a badge count of `4` because `App.tsx` passes `transactions.length` (unfiltered all-time count).
2. The `OverviewScreen` continues displaying October's 4 transactions under 'Recent transactions' because it rendered raw `transactions.slice(0, 4)` rather than `monthFilteredTransactions`.
3. Initial account balances should not be polluting the general monthly transactions ledger as fake movements.

#### 🎯 Expected vs. Actual Behavior
* **Expected:**
  1. Remove the transaction count badge from the sidebar completely to keep navigation minimal, clean, and free of period-filtering confusion.
  2. `OverviewScreen`'s 'Recent transactions' list must strictly honor `activeMonth` filtering so it doesn't show October transactions when August is selected.
  3. Clearly indicate in the empty state when transactions exist in other months, with a 1-tap shortcut to "Jump to Current Month (October 2026)".
  4. Segregate opening balances from regular monthly transactions.
* **Actual:** Transactions screen shows empty while sidebar badge says 4 and Overview shows October entries.
* **Evidence:** `defects/v1.0.2/assets/DEF-018_transactions_month_filter_empty.jpg`, `defects/v1.0.2/assets/DEF-018_overview_mismatched_month_list.jpg`

---

### DEF-019: Global Month/Year Sync Across Cards & Banks, Interactive Bar Chart Tap, & Custom Header Picker

* **Defect ID:** `DEF-019`
* **Module:** Navigation, Header Month/Year Picker, Cards & Banks Screens, Overview Chart
* **Severity:** Medium
* **Discovered In:** Android Release APK v1.0.2 (Build 3)
* **Status:** 🔴 Open

#### 📝 Description
1. The header dropdown only allows selecting from a fixed list rather than picking/entering arbitrary Month and Year combinations.
2. When the user changes the month in the header, Cards and Banks screens do not filter their transaction histories or monthly views to match that month.
3. The Overview bar graph is purely static; users cannot tap any bar to highlight and select that month.
4. Empty months must not prepare or show fake/dummy fillup data.

#### 🎯 Expected vs. Actual Behavior
* **Expected:**
  1. Header Month & Year picker enables choosing any Month and Year.
  2. Full app-wide synchronization: Overview, Transactions, Cards, Banks, and Sidebar badge all update consistently to reflect only the selected month.
  3. Interactive Bar Chart: Tapping any bar on Overview highlights the bar and activates that month throughout the app.
  4. Real data only: Months with no movements show 0/empty with zero artificial fillup data.
* **Actual:** Month filter was disconnected across screens, lacked bar tapping, and lacked a flexible Month+Year picker.


