# Defect Log — Aegis Spendly v1.0.1 (Build 2)

**Release Under Test:** Android Release APK `v1.0.1` (`versionCode: 2`)  
**Package:** `com.aegis.spendly`  
**Current Phase:** Defect Logging & Collection (No fixes will be made until batch fix phase is explicitly initiated)

---

## Quick Summary Table

| Defect ID | Type | Severity | Component / Screen | Summary | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **[DEF-001](#def-001-lock-immediately-toggle-thumb-remains-slid-to-the-right-in-off-state)** | Visual / UI State | Medium | Onboarding & Settings Drawer | "Lock immediately" toggle switch knob stays on the right even when OFF | 🟡 Logged (Open) |
| **[DEF-002](#def-002-add-entry-button-touches-screen-edge-on-tablet-rotation)** | Layout / Responsive | Medium | Navigation / Header / Action Buttons | "Add entry" button touches screen edge on rotation; does not autofit across phone & tablet sizes | 🟡 Logged (Open) |
| **[DEF-003](#def-003-income-page-must-enforce-selecting-salary-credited-bank-to-proceed)** | Form Validation / Business Logic | Medium | Onboarding (Step 4 — Income) | Missing validation: user must be required to select at least one bank for salary credit before proceeding | 🟡 Logged (Open) |

---

## Defect Details

### DEF-001: "Lock immediately" toggle thumb remains slid to the right in OFF state

- **Defect ID:** `DEF-001`
- **Reported Date:** 2026-10-08
- **Platform:** Android (Release APK v1.0.1)
- **Component / Screen:**
  - `app/src/presentation/components/onboarding/OnboardingScreen.tsx` (Step 6 — Vault Auto-Lock Frequency / Fine-Tune Preferences)
  - `app/src/presentation/components/drawers/SettingsDrawer.tsx` (Security Settings)
- **Defect Type:** Visual / UI State
- **Severity:** Medium
- **Priority:** Normal
- **Status:** 🟡 **Logged (Open)** — *Awaiting batch defect fix instruction*

#### Description
When viewing the "Fine-Tune Preferences" section on Step 6 ("Vault Auto-Lock Frequency") during onboarding, the toggle for **"Lock immediately on tab switch / window blur"** displays its switch circle/thumb pinned entirely to the right side regardless of whether the setting is toggled ON or OFF.

#### Expected Behavior
- When the setting is **OFF**, the toggle thumb should sit on the **left side** (or display a proper disabled/off sliding state).
- When the setting is **ON**, the toggle thumb should transition/slide to the **right side** with active accent styling.

#### Actual Behavior
The toggle knob is permanently anchored on the right side. In the OFF state, it only changes stroke/fill to outline (`toggle-outline`), leaving the knob on the right rather than shifting to the left.

#### Visual Evidence
![DEF-001 Screenshot](./assets/DEF-001_lock_immediately_toggle.jpg)

#### Steps to Reproduce
1. Install and launch the Android release APK (`v1.0.1`).
2. Proceed through onboarding up to **Step 6: Vault Auto-Lock Frequency**.
3. Under the **Fine-Tune Preferences** section, locate the toggle for **"Lock immediately on tab switch / window blur"**.
4. Observe the toggle switch icon: the circle handle is on the far right.
5. Tap the toggle to toggle between states: note that the circle does not slide to the left when OFF.

#### Technical Analysis (For Fix Phase Reference)
- In `OnboardingScreen.tsx` (lines 1400–1404) and `SettingsDrawer.tsx` (lines 306–310), an icon `<Ionicons name={autoLockOnBlur ? 'toggle' : 'toggle-outline'} />` is used.
- Ionicons' `toggle-outline` glyph retains its thumb position on the right rather than presenting an inverted left-aligned switch.
- Recommended fix when fix phase starts: Replace the static icon with React Native's native `<Switch />` component or an animated custom sliding toggle component that slides between left (off) and right (on).

---

### DEF-002: "Add entry" button touches screen edge on tablet rotation

- **Defect ID:** `DEF-002`
- **Reported Date:** 2026-10-08
- **Platform:** Android Tablet (Release APK v1.0.1)
- **Component / Screen:**
  - `app/src/presentation/components/SpendlyHeader.tsx` (Add Entry button in header bar)
  - `app/src/presentation/components/TabBar.tsx` (Center elevated plus button)
  - `app/src/features/transactions/TransactionsScreen.tsx` (Floating Action Button - FAB)
- **Defect Type:** Layout / Responsive UI
- **Severity:** Medium
- **Priority:** Normal
- **Status:** 🟡 **Logged (Open)** — *Awaiting batch defect fix instruction*

#### Description
When rotating an Android tablet between portrait and landscape orientations, the primary "Add entry" action button touches or collides with the screen boundary/edge. The layout does not smoothly auto-fit and maintain safe-area padding across varying device form factors (phones vs. tablets).

#### Expected Behavior
- The "Add entry" button (in the header, bottom navigation bar, or floating action button) should maintain appropriate margins and safe-area padding from all display edges.
- It must account for tablet system navigation bars, gesture insets, and taskbars.
- Layouts should dynamically adapt and auto-fit comfortably across phones and tablets of all sizes in both portrait and landscape modes without touching display boundaries.

#### Actual Behavior
Upon rotating the tablet, the button crowds or touches the edge of the display without sufficient breathing room.

#### Steps to Reproduce
1. Launch the app on an Android tablet device.
2. View the main dashboard or transactions screen.
3. Rotate the device between portrait and landscape modes.
4. Observe the spacing between the "Add entry" action button and the device edge / system bars.
5. Note that the button touches the border of the screen without adequate margin.

#### Technical Analysis (For Fix Phase Reference)
- In `App.tsx`, `isDesktop` threshold (`width >= 768`) dynamically flips between sidebar desktop layout and bottom TabBar mobile layout on orientation shifts.
- Fixed positioning or container padding in `SpendlyHeader.tsx`, `TabBar.tsx`, and `TransactionsScreen.tsx` may lack dynamic safe-area insets (`useSafeAreaInsets`) along bottom and horizontal edges, causing elements to crowd tablet system taskbars when rotated.
- Recommended fix when fix phase starts: Wrap action bars/buttons with responsive safe padding (`insets.bottom`, `insets.right`), verify breakpoint behavior, and apply responsive margins so the button auto-fits gracefully across all phone and tablet dimensions.

---

### DEF-003: Income page must enforce selecting salary credited bank to proceed

- **Defect ID:** `DEF-003`
- **Reported Date:** 2026-10-08
- **Platform:** Android (Release APK v1.0.1)
- **Component / Screen:**
  - `app/src/presentation/components/onboarding/OnboardingScreen.tsx` (Step 4 — Income & Earnings Type / Salaried Mode)
- **Defect Type:** Form Validation / Business Logic
- **Severity:** Medium
- **Priority:** Normal
- **Status:** 🟡 **Logged (Open)** — *Awaiting batch defect fix instruction*

#### Description
During onboarding on **Step 4: Income & Earnings Type**, when a user chooses the **Salaried Employee** model, the user is currently able to tap "Continue to Drive Sync" without selecting any bank account under **"SALARY CREDITED TO BANK"**. The app should enforce that at least one bank account is selected as the salary credited account before proceeding.

#### Expected Behavior
- When "Salaried Employee" is selected, the form should require selecting at least one linked bank account to receive the monthly salary before enabling "Continue" or allowing progression to the next step.
- If no bank is selected (or no banks were added), a clear validation error or prompt should instruct the user to select or add a bank account for salary deposits.

#### Actual Behavior
- The "Continue to Drive Sync" button is active unconditionally and allows advancing to the next step even when no bank is selected under "SALARY CREDITED TO BANK".
- The system silently falls back to an empty string or the first bank in the array without explicit user selection.

#### Steps to Reproduce
1. Launch app onboarding up to **Step 4: Income & Earnings Type**.
2. Select **Salaried Employee (Regular Monthly Inflow)**.
3. Enter expected salary and payday, but do not select any bank under **SALARY CREDITED TO BANK**.
4. Tap **Continue to Drive Sync**.
5. The app proceeds to Step 5 without validating that a bank account was selected.

#### Technical Analysis (For Fix Phase Reference)
- In `OnboardingScreen.tsx` (line 1179), the "Continue" button calls `setCurrentStep('DRIVE')` directly without checking `selectedSalaryBank`.
- When finishing onboarding (line 373), `salary_account_id` defaults to `selectedSalaryBank || (banks[0]?.name ?? '')`.
- Recommended fix when fix phase starts: Add validation requiring `selectedSalaryBank` when `incomeType === 'SALARIED'` (and ensure at least one bank exists, or guide user to add one), disabling the continue button or displaying an inline error message until a bank is selected.
