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
