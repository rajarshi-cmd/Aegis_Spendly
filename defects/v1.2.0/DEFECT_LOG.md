# Defect Log — Aegis Spendly v1.2.0 (Build 7)

**Release Under Test:** Android Release APK `v1.2.0` (`versionCode: 7`)  
**Resolution Scope:** Onboarding UX / Stitch Obsidian Theme Alignment  
**Tracking Status:** 🟢 All 9 Defects (DEF-022 to DEF-030) Resolved & Verified — **DEPLOYABLE**  
**Platform Scope:** Physical Android Devices, Emulators & Web  
**Security Model:** Air-gapped, zero-cloud, encrypted local SQLite database  

---

## 📋 Defect Summary Table

| Defect ID | GitHub Issue | Title | Module | Severity | Reporter | Status | Resolution |
| :--- | :---: | :--- | :--- | :---: | :--- | :---: | :--- |
| **DEF-022** | [#23](https://github.com/rajarshi-cmd/Aegis_Spendly/issues/23) | Step 1 Identity: Account Email input field read-only for guest/offline onboarding | Onboarding / Identity | High | User | 🟢 Resolved | Render active editable `<TextInput>` with `keyboardType="email-address"` when no OAuth email present. |
| **DEF-023** | [#24](https://github.com/rajarshi-cmd/Aegis_Spendly/issues/24) | Step 2 Banks: Added bank accounts lack edit capability | Onboarding / Banks | Medium | User | 🟢 Resolved | Added Stitch-inspired pencil action button (`#1C2B3C`) beside delete icon and in-place bottom sheet editing across Banks, Cards & Income. |
| **DEF-024** | [#25](https://github.com/rajarshi-cmd/Aegis_Spendly/issues/25) | Steps 2, 3, 4: Duplicate plus sign in 'Add Another' action buttons | Onboarding / UI Polish | Low | User | 🟢 Resolved | Stripped duplicate leading `+` prefix from button text across all four onboarding add/link action buttons. |
| **DEF-025** | [#31](https://github.com/rajarshi-cmd/Aegis_Spendly/issues/31) | Steps 2, 3, 4: Empty state hero halo ring lacks ambient glow pulse animation | Onboarding / Animations | Feature / Polish | User | 🟢 Resolved | Implemented 60fps native-driver looping `Animated` pulse on outer aura ring cycling scale (1.0 to 1.22) and opacity (0.14 to 0.42). |
| **DEF-026** | [#26](https://github.com/rajarshi-cmd/Aegis_Spendly/issues/26) | Step 3 Cards Sheet: Card Network selector pills squished causing "Mastercar\nd" word wrap | Onboarding / Cards Sheet | Medium | User | 🟢 Resolved | Replaced fixed `flex: 1` row with horizontal `<ScrollView horizontal showsHorizontalScrollIndicator={false}>` and `numberOfLines={1}`. |
| **DEF-027** | [#27](https://github.com/rajarshi-cmd/Aegis_Spendly/issues/27) | All Steps & Sheets: Redundant "e.g." prefix in input placeholders and non-blank date fields | Onboarding / Copy Polish | Low | User | 🟢 Resolved | Removed `"e.g."` prefix across all 10 text inputs; set Bill Cut and Due Day placeholders to clean blank strings. |
| **DEF-028** | [#28](https://github.com/rajarshi-cmd/Aegis_Spendly/issues/28) | Step 3 Cards: Hardcoded "th" suffix produces incorrect ordinals ("2th" instead of "2nd") | Onboarding / Cards | Medium | User | 🟢 Resolved | Added `formatOrdinalDay` helper function handling standard ordinals (`1st`, `2nd`, `3rd`, `11th-13th`, `21st`, `22nd`, etc.). |
| **DEF-029** | [#29](https://github.com/rajarshi-cmd/Aegis_Spendly/issues/29) | Step 4 Income Sheet: Linked bank account selector displays cluttered "Bank ••Nickname" label | Onboarding / Income Sheet | Low | User | 🟢 Resolved | Display pure account nickname `{b.nickname || b.name}` without redundant prefix or bullets. |
| **DEF-030** | [#30](https://github.com/rajarshi-cmd/Aegis_Spendly/issues/30) | Step 5 Security: Auto Lock inactivity timeout options permanently visible instead of expanding conditionally | Onboarding / Security | Low | User | 🟢 Resolved | Wrapped Inactivity Timeout container with `{autoLockOnBlur && ( ... )}` matching Auto-Wipe conditional expansion behavior. |

---

## 🐞 Detailed Defect Reports & Resolutions

### DEF-022: Account Email Input Read-Only for Guest/Offline Onboarding
* **GitHub Issue:** [#23](https://github.com/rajarshi-cmd/Aegis_Spendly/issues/23)
* **Module:** `OnboardingScreen.tsx` (Step 1 Identity)
* **Severity:** High
* **Resolution:** When `user?.email` is empty/offline, render interactive `<TextInput>` with `keyboardType="email-address"`, `autoCapitalize="none"`, and "Local Vault ID" badge.

### DEF-023: Added Bank Accounts Lack Edit Capability
* **GitHub Issue:** [#24](https://github.com/rajarshi-cmd/Aegis_Spendly/issues/24)
* **Module:** `OnboardingScreen.tsx` (Step 2 Banks, Step 3 Cards, Step 4 Income)
* **Severity:** Medium
* **Resolution:** Implemented `handleEditBank`, `handleEditCard`, and `handleEditIncomeStream` handlers; integrated `#1C2B3C` pencil button matching Stitch UI specifications; updated submit handlers to save modifications in-place.

### DEF-024: Duplicate Plus Sign in 'Add Another' Buttons
* **GitHub Issue:** [#25](https://github.com/rajarshi-cmd/Aegis_Spendly/issues/25)
* **Module:** `OnboardingScreen.tsx` (Steps 2, 3, 4)
* **Severity:** Low
* **Resolution:** Stripped leading `+` symbol from button label text while keeping the left-side icon.

### DEF-025: Ambient Glow Pulse Animation on Empty State Halo
* **GitHub Issue:** [#31](https://github.com/rajarshi-cmd/Aegis_Spendly/issues/31)
* **Module:** `OnboardingScreen.tsx` (Steps 2, 3, 4 Empty States)
* **Severity:** Feature / Visual Polish
* **Resolution:** Integrated React Native `Animated.loop` sequence driving scale and opacity on `pulseCircleBack` at 60fps with native driver.

### DEF-026: Card Network Pill Text Wrapping onto New Line
* **GitHub Issue:** [#26](https://github.com/rajarshi-cmd/Aegis_Spendly/issues/26)
* **Module:** `OnboardingScreen.tsx` (Step 3 Add Card Bottom Sheet)
* **Severity:** Medium
* **Resolution:** Migrated network pill container to horizontal `ScrollView` with `showsHorizontalScrollIndicator={false}`, generous chip padding, and `numberOfLines={1}`.

### DEF-027: Redundant "e.g." Prefix in Input Placeholders
* **GitHub Issue:** [#27](https://github.com/rajarshi-cmd/Aegis_Spendly/issues/27)
* **Module:** `OnboardingScreen.tsx` (All Bottom Sheets and Inputs)
* **Severity:** Low
* **Resolution:** Replaced all placeholder text with direct naming and cleared inline examples for bill cut and due dates.

### DEF-028: Hardcoded "th" Suffix Producing Incorrect Ordinals
* **GitHub Issue:** [#28](https://github.com/rajarshi-cmd/Aegis_Spendly/issues/28)
* **Module:** `date.ts` & `OnboardingScreen.tsx`
* **Severity:** Medium
* **Resolution:** Created `formatOrdinalDay` utility in `src/core/utils/date.ts` with comprehensive unit tests for all day ordinals.

### DEF-029: Linked Bank Account Selector Cluttered Label
* **GitHub Issue:** [#29](https://github.com/rajarshi-cmd/Aegis_Spendly/issues/29)
* **Module:** `OnboardingScreen.tsx` (Step 4 Income Sheet)
* **Severity:** Low
* **Resolution:** Display pure nickname directly (`{b.nickname || b.name}`).

### DEF-030: Auto Lock Inactivity Timeout Conditional Expansion
* **GitHub Issue:** [#30](https://github.com/rajarshi-cmd/Aegis_Spendly/issues/30)
* **Module:** `OnboardingScreen.tsx` (Step 5 Security)
* **Severity:** Low
* **Resolution:** Conditionally render Inactivity Timeout selection row only when `autoLockOnBlur` is active.

---

## 🎨 Visual Enhancements & Future Polish Backlog

| ID | GitHub Issue | Component | Scope | Severity | Status |
| :--- | :---: | :--- | :--- | :---: | :---: |
| **ENH-002** | [#32](https://github.com/rajarshi-cmd/Aegis_Spendly/issues/32) | `OnboardingScreen.tsx` | Step 5 Security: Auto Lock toggle switch knob translation symmetry (`translateX: 18` -> `translateX: 22` on ON state) | Low | 🟢 Resolved |

---

## 🚀 Deployment Certification & Release Sign-Off

* **Milestone:** Aegis Spendly `v1.2.0` (Build 7)
* **Onboarding Module Status:** 🟢 **CERTIFIED DEPLOYABLE**
* **Automated Unit Tests:** 19/19 Test Suites Passed, 203/203 Unit Tests Passing
* **Device Emulation Verification:** Android 16 API 37 (`Medium_Phone_API_37.0`) verified live across all 6 steps
* **Remaining Issues:** 0 Blockers, 0 High Severity, 0 Medium Severity (1 Low Visual Polish logged to Backlog)
* **Sign-Off Date:** 2026-10-09

