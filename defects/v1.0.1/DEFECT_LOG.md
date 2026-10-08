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
| **[DEF-004](#def-004-session-and-data-reset-on-complete-app-close-sent-back-to-onboarding)** | Data Persistence / Auth Architecture | 🔴 Critical (High) | Auth Lifecycle, CryptoVault & Local Storage | Closing app completely deletes session/profile, resetting user back to onboarding instead of preserving login and prompting for PIN | 🟡 Logged (Open) |
| **[DEF-005](#def-005-sign-out-erases-vault-profiledata-and-pin-setup-lacks-security-importance-notice)** | Auth Architecture & UX Guidance | 🟠 High | Auth Lifecycle & PIN Setup Screen | Sign out must preserve vault data and allow re-opening via PIN; PIN setup must remind user that PIN is the sole recovery key | 🟡 Logged (Open) |
| **[DEF-006](#def-006-top-right-profile-button-dropdown-hub-with-tabbed-sections--user-guide)** | UI/UX & Navigation | 🟡 Medium | Header, Profile Drawer & Sidebar | Profile button in top-right corner; opens dropdown with tabs (Accounts, Customise, Security, User Guide); top-left hamburger menu | 🟡 Logged (Open) |
| **[DEF-007](#def-007-auto-delete-vault-on-failed-pin-attempts-slider-3-10-warning-prompts--double-pin-deletion)** | Security Architecture | 🟠 High | Lock Screen, Onboarding & Security Settings | Auto-delete vault on failed PIN attempts (slider 3–10) with Lock Screen remaining-attempts warning and double-PIN manual vault erasure | 🟡 Logged (Open) |
| **[DEF-008](#def-008-hide-google-drive-sync-ui-and-onboarding-step-pending-phase-2)** | Feature Visibility / Rollout | 🟢 Low | Header, Onboarding Step 5 & Drawers | Temporarily hide Google Drive sync buttons, badges, and onboarding Step 5 without deleting the underlying codebase | 🟡 Logged (Open) |
| **[DEF-009](#def-009-tiktok-style-centered-add-entry-button-on-bottom-navigation-tab-bar)** | Layout / UX Ergonomics | 🟡 Medium | TabBar & Responsive Canvas | TikTok-style elevated center [ + ] button flanked by 4 dedicated tabs: Expenses, Plan Ahead, Cards, and Banks | 🟡 Logged (Open) |

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

---

### DEF-004: Session and data reset on complete app close (sent back to onboarding)

- **Defect ID:** `DEF-004`
- **Reported Date:** 2026-10-08
- **Platform:** Android (Release APK v1.0.1)
- **Component / Screen:**
  - `app/src/core/security/cryptoVault.ts` (`saveAuthSession`, `loadAuthSession`)
  - `app/src/presentation/hooks/useAuthSecurity.tsx` (`SecurityGateNavigator`, session mount hook)
  - `app/src/core/types/profile.ts` (`saveUserProfile`, `loadUserProfile`)
  - `app/src/core/types/auth.ts` (`saveSecurityConfig`, `loadSecurityConfig`)
  - `app/src/presentation/components/security/AuthGateScreen.tsx`
- **Defect Type:** Data Persistence / Auth Architecture
- **Severity:** 🔴 **Critical (High)**
- **Priority:** **P0 (Highest)**
- **Status:** 🟡 **Logged (Open)** — *Awaiting batch defect fix instruction*

#### Description
When the user completely closes / force-quits the app from the Android recent apps switcher and relaunches it, all session and profile state is lost. Instead of preserving the authenticated state and prompting the user for their Master PIN (or future biometric unlock) to access their existing vault, the user is sent all the way back to the initial Welcome / Sign In / Onboarding sequence. Users must re-enter their details and undergo setup again.

#### Expected Behavior
- Once initial onboarding and PIN setup are completed after installation, the user's session, profile, and data must permanently persist across app closures and device restarts.
- Completely terminating and relaunching the app should recognize the existing vault, transition directly to the **Lock Screen (`LOCKED` state)**, and allow the user to unlock with their Master PIN (and optional biometric authentication in the future).
- Users must never be forced to re-enter onboarding data repeatedly once installed.

#### Actual Behavior
- When the Android app process terminates, the user session, PIN salt/hash, profile (`isOnboarded: true`), and security settings are completely erased.
- Upon reopening, the app fails to locate any saved session, resets `authStatus` to `UNAUTHENTICATED`, and opens `AuthGateScreen` in `SIGNUP` mode, forcing the user through onboarding again.

#### Steps to Reproduce
1. Install and launch the v1.0.1 release APK.
2. Complete Google login/auth, configure PIN, and complete all onboarding steps until the main dashboard is visible.
3. Add or view transactions/accounts.
4. Swipe up to recent apps and swipe away / force close Aegis Spendly.
5. Reopen Aegis Spendly from the app drawer.
6. Observe that the app displays the initial Sign In / Welcome screen instead of the PIN Lock screen.

#### Technical Analysis (For Fix Phase Reference)
- In `cryptoVault.ts` (lines 139–143, 155–159), `profile.ts` (lines 38–40, 51–53), and `auth.ts` (lines 36–38, 49–51), session storage uses `localStorage` with a fallback to `let memoryStorage: Record<string, string> = {}`.
- In native React Native on Android (Hermes runtime), the browser `window.localStorage` global does **not** exist.
- As a consequence, all auth session data, PIN hashes, and `isOnboarded` flags were being written to the transient JavaScript heap `memoryStorage` variable.
- When Android kills the app process, `memoryStorage` is wiped. On restart, `loadAuthSession()` returns `null`, causing `useAuthSecurity.tsx` to set `authStatus = 'UNAUTHENTICATED'`.
- Recommended fix when fix phase starts: Store auth session and user profile in native persistent storage:
  - Option A: Persist auth credentials, profile, and security preferences directly inside the persistent native SQLite database (`aegis_finance.db`, via an `app_kv_store` / `auth_session` table) which already works natively via `expo-sqlite`.
  - Option B: Integrate `@react-native-async-storage/async-storage` or `expo-secure-store` for native encrypted mobile key-value storage.

---

### DEF-005: Sign out erases vault profile/data and PIN setup lacks security importance notice

- **Defect ID:** `DEF-005`
- **Reported Date:** 2026-10-08
- **Platform:** Android (Release APK v1.0.1)
- **Component / Screen:**
  - `app/src/presentation/hooks/useAuthSecurity.tsx` (`signOut` callback)
  - `app/src/core/security/cryptoVault.ts` (`clearAuthSession`)
  - `app/src/presentation/components/security/AuthGateScreen.tsx` (Existing user vault detection)
  - `app/src/presentation/components/security/PinSetupScreen.tsx` (PIN creation screen & messaging)
- **Defect Type:** Auth Architecture & UX Guidance
- **Severity:** 🟠 **High**
- **Priority:** **P1**
- **Status:** 🟡 **Logged (Open)** — *Awaiting batch defect fix instruction*

#### Description
1. When a user explicitly signs out, the application executes `clearAuthSession()`, which deletes the user's stored auth credentials, PIN salt, and hash. Consequently, their local device profile and financial vault become disconnected and cannot be fetched back or unlocked using their previously established Master PIN.
2. In addition, during the PIN setup process in `PinSetupScreen.tsx`, there is no clear security reminder advising the user that this Master PIN is the vital recovery key for their local encrypted vault on this device and that their data remains safe even if they sign out.

#### Expected Behavior
- **Vault Preservation on Sign Out:** Signing out must only end the active session; it must **not** delete the user's profile, financial records, or PIN verification metadata from the device.
- **Returning User Unlock:** When a user signs in again or opens the app, the app must identify their existing local vault and allow them to unlock it directly via their original Master PIN.
- **PIN Importance Reminder:** During PIN creation on `PinSetupScreen`, display a prominent security notice highlighting:
  - *"Your Master PIN is the master key for this vault. Your financial data is securely preserved on this device and can only be opened with this PIN, even after signing out. Remember your PIN carefully!"*

#### Actual Behavior
- `clearAuthSession()` removes the credentials and PIN hash from storage.
- A user who signs out is treated as an unauthenticated user without an existing vault, losing direct PIN unlock capability for their existing records.
- `PinSetupScreen.tsx` only shows generic helper text without warning the user of the critical security importance and non-recoverability of the Master PIN.

#### Steps to Reproduce
1. Complete PIN setup and onboarding.
2. From the Lock screen or Settings drawer, tap **Sign out**.
3. Attempt to sign back in or access the app.
4. Notice the app treats the session as empty rather than offering immediate PIN-based vault unlocking for the existing profile.
5. Also observe `PinSetupScreen.tsx` during PIN setup: no reminder is displayed regarding PIN importance or vault retention.

#### Technical Analysis (For Fix Phase Reference)
- Disentangle session logout from vault credential deletion in `useAuthSecurity.tsx` and `cryptoVault.ts`. Persist vault credentials in SQLite under user identifier.
- When `signOut()` is called, only clear the active unencrypted session state (`authStatus: 'UNAUTHENTICATED'`), while retaining the user's profile and hashed PIN in permanent storage so returning with the same account immediately routes to `LOCKED` (PIN unlock) rather than new account onboarding.
- Update `PinSetupScreen.tsx` with an alert/banner card explaining the importance of the Master PIN for accessing device data.

---

### DEF-006: Top-right profile button dropdown hub with tabbed sections & user guide

- **Defect ID:** `DEF-006`
- **Reported Date:** 2026-10-08
- **Platform:** Android (Release APK v1.0.1) & Responsive Web
- **Component / Screen:**
  - `app/src/presentation/components/SpendlyHeader.tsx` (Top-right button placement & top-left hamburger)
  - `app/src/presentation/components/drawers/ProfileDrawer.tsx` (Tabbed modal/dropdown redesign)
  - `app/src/presentation/components/SpendlySidebar.tsx` / `MobileNavDrawer.tsx` (Expanding user guide)
- **Defect Type:** UI/UX & Navigation
- **Severity:** 🟡 **Medium**
- **Priority:** **P1**
- **Status:** 🟡 **Logged (Open)** — *Awaiting batch defect fix instruction*

#### Description
The profile button is currently positioned mid-header rather than anchored in the top-right corner as standard in modern web and mobile applications (as drawn in the user's layout sketch). Furthermore, user settings and options are fragmented across multiple disparate drawers and buttons. The profile button dropdown/modal needs to be consolidated into a cohesive multi-tab hub with dedicated sections.

#### Expected Behavior
1. **Top Navigation Layout (per wireframe sketch):**
   - **Top-Left:** Hamburger menu icon (`≡`) for expanding navigation sidebar.
   - **Top-Right:** Circular Profile button/avatar (`O`) anchored at the far top-right corner.
   - **Main Body:** Header profile greeting and financial overview cards.
2. **Tabbed Hub Dropdown/Drawer:** Tapping the Profile button opens a consolidated menu with 4 distinct tabs:
   - **Accounts Details Tab:** Complete overview and management of bank accounts and credit cards.
   - **Customise Tab:** Custom profile avatar selection and application theme preset picker.
   - **Security Tab:** Lock idle timer, Update Master PIN, Auto-delete vault on failed PIN attempts (toggle + slider 3–10), and manual "Delete Vault" action (requiring 2x PIN confirmation).
   - **User Guide Tab:** Clear, user-friendly instructions explaining how the app and its features function (accessible either within the profile modal tabs or the expanding navigation sidebar).

#### Actual Behavior
- The Profile chip is placed to the left of the Add Entry, theme settings, and lock buttons on desktop/tablet views.
- Settings, themes, accounts, and profile features are split across separate floating buttons (`color-palette-outline`, `SettingsDrawer`, `ProfileDrawer`).
- There is no unified tabbed organization and no built-in User Guide.

#### Technical Analysis (For Fix Phase Reference)
- Restructure `SpendlyHeader.tsx` to move the Profile avatar/button to the far right.
- Redesign `ProfileDrawer.tsx` (or new `ProfileHubModal.tsx`) into a tabbed layout (`ACCOUNTS`, `CUSTOMISE`, `SECURITY`, `USER_GUIDE`).
- Consolidate theme picker logic from `SettingsDrawer.tsx` into the Customise tab, and security configuration into the Security tab.

---

### DEF-007: Auto-delete vault on failed PIN attempts (slider 3–10), warning prompts & double-PIN deletion

- **Defect ID:** `DEF-007`
- **Reported Date:** 2026-10-08
- **Platform:** Android (Release APK v1.0.1)
- **Component / Screen:**
  - `app/src/presentation/components/security/LockScreen.tsx` (Wrong PIN countdown warning)
  - `app/src/presentation/components/onboarding/OnboardingScreen.tsx` (Security configuration step)
  - `app/src/core/security/rateLimiter.ts` & `useAuthSecurity.tsx` (Threshold wipe trigger)
  - `app/src/core/types/auth.ts` (`autoDeleteEnabled`, `autoDeleteThreshold`)
- **Defect Type:** Security Architecture & UX Safety
- **Severity:** 🟠 **High**
- **Priority:** **P1**
- **Status:** 🟡 **Logged (Open)** — *Awaiting batch defect fix instruction*

#### Description
1. **Auto-Delete on Wrong PIN Attempts:** Users need a privacy protection feature where entering too many incorrect PIN attempts automatically wipes the encrypted vault from the device. This feature requires an ON/OFF toggle and an adjustable slider from 3 to 10 attempts.
2. **Lock Screen Countdown Warning:** When this feature is active and a wrong PIN is entered on `LockScreen`, a warning banner must alert the user: *"Incorrect PIN. Vault will be permanently erased after X more wrong attempts."*
3. **Onboarding Integration:** These settings (toggle + 3-10 slider) must also be introduced during the security configuration step of onboarding.
4. **Manual Delete Vault with 2x PIN Confirmation:** A manual "Delete Vault" option in the Security settings must require entering the Master PIN twice consecutively to prevent accidental erasure.

#### Expected Behavior
- Security settings in onboarding and the profile security tab include:
  - Toggle: **Auto-delete vault on failed attempts** (ON / OFF).
  - Slider: Threshold from **3 to 10** wrong attempts.
- On `LockScreen.tsx`: Entering a wrong PIN calculates remaining attempts and shows an alert banner warning of imminent erasure.
- Reaching 0 remaining attempts executes a complete SQLite wipe (`DROP`/`DELETE`) and session reset.
- Manual vault deletion requires entering the Master PIN twice before deleting.

#### Actual Behavior
- `rateLimiter.ts` currently applies a 30-second lockout delay after 5 failed attempts, but there is no configurable auto-deletion toggle, no 3–10 slider, and no explicit warning that data will be wiped.
- There is no double-PIN confirmation prompt for manual vault deletion.

#### Technical Analysis (For Fix Phase Reference)
- Add `autoDeleteOnFailedPin: boolean` and `autoDeleteThreshold: number` (default 5, range 3–10) to `AuthSecurityConfig` in `auth.ts`.
- In `OnboardingScreen.tsx` (Step 6) and the new Profile Security tab, render a toggle switch and a custom slider component (3 to 10).
- Update `LockScreen.tsx` to display dynamic remaining attempt warnings when the toggle is enabled.
- Add a 2-step PIN entry modal for the manual "Delete Vault" action in `ProfileDrawer` / `SettingsDrawer`.

---

### DEF-008: Hide Google Drive sync UI and onboarding step (pending Phase 2)

- **Defect ID:** `DEF-008`
- **Reported Date:** 2026-10-08
- **Platform:** Android (Release APK v1.0.1) & Web
- **Component / Screen:**
  - `app/src/presentation/components/SpendlyHeader.tsx` (Header sync buttons & pills)
  - `app/src/presentation/components/onboarding/OnboardingScreen.tsx` (Step 5 — Google Drive Storage)
  - `app/src/presentation/components/SpendlySidebar.tsx` & `MobileNavDrawer.tsx` (Drawer sync links)
- **Defect Type:** Feature Visibility / Phased Rollout
- **Severity:** 🟢 **Low**
- **Priority:** **Normal**
- **Status:** 🟡 **Logged (Open)** — *Awaiting batch defect fix instruction*

#### Description
Google Drive cloud sync is scheduled for Phase 2 and is not currently functional/connected. The presence of Google Drive buttons, sync toasts, and the dedicated Step 5 onboarding screen ("Choose Google Drive Folder") causes confusion during testing. These UI elements must be temporarily hidden from the user interface while preserving all underlying code for Phase 2 activation.

#### Expected Behavior
- **Header:** Hide the Google Sheets sync button on desktop/tablet and the sync pill on mobile headers.
- **Onboarding:** Remove/hide **Step 5: Google Drive Storage** from the onboarding sequence (so users transition directly from Step 4 Income to Step 6 Security Lock Policy), without deleting the step's code.
- **Drawers:** Hide Google Drive sync links in `SpendlySidebar.tsx` and `MobileNavDrawer.tsx`.
- **Code Preservation:** All existing Google Drive sync specifications, services, and components must remain untouched in the codebase.

#### Actual Behavior
Google Drive buttons, sync status pills, and the entire Step 5 onboarding form are prominently displayed in the v1.0.1 release APK.

#### Technical Analysis (For Fix Phase Reference)
- In `OnboardingScreen.tsx`, adjust the step transition so Step 4 (SALARY) navigates directly to Step 6 (SECURITY), and remove 'DRIVE' from the visible step list without deleting the render block.
- In `SpendlyHeader.tsx`, conditionally render or comment out `syncButtonGroup` and mobile `syncBtnSmall`.
- In `SpendlySidebar.tsx` and `MobileNavDrawer.tsx`, hide the sync modal trigger items.

---

### DEF-009: TikTok-style centered "Add Entry" button on bottom navigation tab bar

- **Defect ID:** `DEF-009`
- **Reported Date:** 2026-10-08
- **Platform:** Android (Phones & Tablets)
- **Component / Screen:**
  - `app/src/presentation/components/TabBar.tsx`
  - `app/src/App.tsx` (Bottom bar layout across viewports)
- **Defect Type:** Layout / UX Ergonomics
- **Severity:** 🟡 **Medium**
- **Priority:** **Normal**
- **Status:** 🟡 **Logged (Open)** — *Awaiting batch defect fix instruction*

#### Description
The bottom navigation bar must follow the user's reference drawing: an elevated TikTok-style circular `+` button in the exact center, flanked by 4 dedicated feature tabs:
1. **Button 1 (Leftmost):** Expense Tracker / Ledger screen (`E`)
2. **Button 2 (Center-Left):** Next Month Plan Ahead Commitments (`↗` / `M`)
3. **Button 3 (Center Action):** Big Elevated TikTok-style `+` Add Entry button
4. **Button 4 (Center-Right):** Credit Cards screen
5. **Button 5 (Rightmost):** Bank Accounts screen

#### Visual Evidence (User Wireframe Reference)
![DEF-009 Wireframe Reference](./assets/DEF-009_bottom_bar_wireframe.jpg)

#### Expected Behavior
- The bottom navigation bar consists of the 5 distinct tabs illustrated in the wireframe:
  - Tab 1: **Expenses** (`TRANSACTIONS`) — Expense tracker page.
  - Tab 2: **Plan Ahead** (`PLAN_AHEAD`) — Next month commitments & obligations.
  - Center: **[ + ]** — Primary elevated action button (opens Add Entry drawer).
  - Tab 3: **Cards** (`CREDIT_CARDS`) — Credit cards overview.
  - Tab 4: **Banks** (`BANKS`) — Bank accounts overview.
- The center `+` button is visually elevated (TikTok aesthetic), centered, and accessible across phone and tablet modes.
- Profile is moved to the top-right header corner (per `DEF-006`), freeing the 5th bottom slot for Bank Accounts.

#### Actual Behavior
- Currently, `TabBar.tsx` contains: Overview, Entries, Center Plus, Cards, and Profile.
- Bank Accounts and Plan Ahead were not directly accessible from the bottom bar.
- On desktop/tablet mode (`width >= 768`), the bottom bar was hidden entirely in favor of top-header buttons.

#### Technical Analysis (For Fix Phase Reference)
- In `TabBar.tsx`, update tab items to: `TRANSACTIONS` (Expenses), `PLAN_AHEAD` (Commitments), Center `+` button, `CREDIT_CARDS` (Cards), and `BANKS` (Bank Accounts).
- Update `App.tsx` navigation state to render the corresponding screen upon selecting any of the 5 tabs.
- Apply elevated styling (`marginTop: -18`, larger circular container, shadow/elevation) to the center `+` button.
