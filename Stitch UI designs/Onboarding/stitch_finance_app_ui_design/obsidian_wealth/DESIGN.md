---
name: Obsidian Wealth
colors:
  surface: '#051424'
  surface-dim: '#051424'
  surface-bright: '#2c3a4c'
  surface-container-lowest: '#010f1f'
  surface-container-low: '#0d1c2d'
  surface-container: '#122131'
  surface-container-high: '#1c2b3c'
  surface-container-highest: '#273647'
  on-surface: '#d4e4fa'
  on-surface-variant: '#bccbb9'
  inverse-surface: '#d4e4fa'
  inverse-on-surface: '#233143'
  outline: '#869585'
  outline-variant: '#3d4a3d'
  surface-tint: '#4ae176'
  primary: '#4be277'
  on-primary: '#003915'
  primary-container: '#22c55e'
  on-primary-container: '#004b1e'
  inverse-primary: '#006e2f'
  secondary: '#ffca45'
  on-secondary: '#3f2e00'
  secondary-container: '#e4ae00'
  on-secondary-container: '#5b4400'
  tertiary: '#ffb4ae'
  on-tertiary: '#68000a'
  tertiary-container: '#ff8a83'
  on-tertiary-container: '#860011'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#6bff8f'
  primary-fixed-dim: '#4ae176'
  on-primary-fixed: '#002109'
  on-primary-fixed-variant: '#005321'
  secondary-fixed: '#ffdf9a'
  secondary-fixed-dim: '#f7be1d'
  on-secondary-fixed: '#251a00'
  on-secondary-fixed-variant: '#5a4300'
  tertiary-fixed: '#ffdad7'
  tertiary-fixed-dim: '#ffb3ad'
  on-tertiary-fixed: '#410004'
  on-tertiary-fixed-variant: '#930013'
  background: '#051424'
  on-background: '#d4e4fa'
  surface-variant: '#273647'
typography:
  display-hero:
    fontFamily: Inter
    fontSize: 40px
    fontWeight: '700'
    lineHeight: 48px
    letterSpacing: -0.03em
  display-hero-mobile:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.025em
  headline-lg:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.015em
  headline-sm:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  label-lg:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
    letterSpacing: 0.04em
  numeric-metric:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 28px
    letterSpacing: -0.02em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-sm: 0.75rem
  margin: 1rem
  margin-tablet: 1.5rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-lg: 1rem
  space-xl: 1.5rem
---

## Brand & Style

This design system establishes an ultra-refined, high-precision dark mode environment tailored for personal finance and wealth management. The brand exudes institutional reliability fused with modern consumer mobility—instilling calm, control, and absolute clarity over complex financial states.

The aesthetic blends **Modern Precision** with subtle **Glassmorphism**:
- Obsidian-level deep slate canvas surfaces eliminate visual noise and eye strain.
- Strict semiotic color coding delivers split-second comprehension across critical balances, credit utilization, and budget ceilings.
- Restrained glass micro-strokes provide crisp structure without ornamental distractions.
- The interface feels technical yet effortless, projecting the discretion of a private banking terminal paired with the fluid ergonomics of modern iOS standards.

## Colors

The palette is engineered around an uncompromising status hierarchy against deep obsidian and navy foundations:

- **Canvas & Surface Architecture:**
  - Base Background: `#0B0F17` (Deep Obsidian Void)
  - Card & Container Surface: `#131B2E` (Structured Deep Slate)
  - Elevated Popovers & Modals: `#1B243B`
  - Subtle Border Accents & Dividers: `#1E293B`
  - Active Surface Highlight: `rgba(255, 255, 255, 0.04)`

- **Status & Semiotic Hierarchy:**
  - **Healthy / Safe (Primary):** `#22C55E` — Applied to positive cash flow, healthy balances, safe credit utilization (<10%), and under-budget metrics.
  - **Warning (Secondary):** `#EAB308` — Applied to budget pacing warnings (80–99%), approaching due dates, and moderate utilization.
  - **Critical / Danger (Tertiary):** `#EF4444` — Applied strictly to credit utilization exceeding 30%, overdrafts, breached budgets, and negative cash flow.

- **Text & Contrast Hierarchy:**
  - Primary Typography: `#F8FAFC` (Slate 50) for maximum legibility and high contrast.
  - Secondary Typography & Metric Labels: `#94A3B8` (Slate 400).
  - Tertiary / Disabled / Captions: `#64748B` (Slate 500).

## Typography

The typographic engine uses Inter for its structural neutrality, tabular figure support, and high legibility at micro scales.

- **Tabular Numerics:** All currency, percentages, and metrics must render with tabular figures (`font-variant-numeric: tabular-nums`) to prevent optical layout shift during live data updates.
- **Hierarchy Separation:** Hero account values demand tight tracking (`-0.03em`) and crisp white `#F8FAFC`, while context indicators and secondary category labels rely on `#94A3B8` at medium weights to maintain clean visual reading orders.
- **Micro-Labels:** Badges and metric identifiers enforce uppercase or tracked medium weights for instant scanning on small screens.

## Layout & Spacing

This design system uses a 4-column fluid mobile grid scaling to an 8-column layout on tablet views, bound to an 8pt vertical rhythm (with 4pt micro-increments for compact dashboard density).

- **Mobile Canvas:** Screen margins sit fixed at `1rem` (`16px`) from device edges to maximize screen real estate while respecting safe area insets.
- **Card Padding Hierarchy:**
  - Compact Cards / List Rows: `12px` (`0.75rem`) internal padding.
  - Primary Metric & Balance Cards: `16px` to `20px` internal padding for comfortable structural framing.
- **Card Gap Distribution:** Metric cards and overview widgets stack with consistent `0.75rem` (`12px`) to `1rem` (`16px`) vertical spacing, preventing dense information clusters from bleeding together.

## Elevation & Depth

Visual hierarchy uses a refined hybrid of tonal surface layering, frosted glass refraction, and hairline borders:

- **Level 0 (Base Canvas):** Pure solid `#0B0F17`.
- **Level 1 (Cards & Data Panels):** `#131B2E` with a crisp 1px solid border in `#1E293B`. No heavy dropshadows; separation is strictly chromatic and geometric.
- **Level 2 (Modals, Action Sheets, Floating Trays):** Semi-translucent `#131B2E` (90% opacity) with `backdrop-filter: blur(20px)`, a 1px top stroke in `rgba(255, 255, 255, 0.12)`, and a deep, ambient shadow: `0 16px 32px -8px rgba(0, 0, 0, 0.6)`.
- **Level 3 (Interactive Floating Navigation):** iOS-style fixed bottom nav with `rgba(11, 15, 23, 0.82)` background, `backdrop-filter: blur(24px)`, and a subtle hairline top border in `rgba(30, 41, 59, 0.7)`.

## Shapes

The interface embraces tailored rounded geometries that feel modern, ergonomic, and native to iOS and modern mobile devices:

- **Primary Cards & Containers:** Standardized with an outer radius of `16px` to `20px` (`rounded-xl` / `rounded-2xl`), offering friendly enclosure without sacrificing internal metric space.
- **Pill Badges & Buttons:** Fully rounded (`9999px`) pill shapes are reserved exclusively for status badges, tags, and primary action buttons.
- **Input Fields & Transaction Items:** Normalized at `12px` to `14px` border radius for structured alignment inside parent containers.

## Components

### Cards & Metric Indicators
- **Standard Card:** Constructed with `#131B2E` fill, 16px or 20px corner radius, and a 1px border in `#1E293B`.
- **Compact Metric Indicator:** Displays the metric label (`#94A3B8`, `label-md`), numeric balance (`#F8FAFC`, `numeric-metric`), and an inline status pill or micro-delta arrow.
- **Credit Utilization Gauge:** Progress bar with a 4px height, `#1E293B` track, and active fill dynamically rendered in `#22C55E` (<10%), `#EAB308` (10–29%), or `#EF4444` (≥30%).

### Status Badges (Pills)
- Fully rounded (`9999px`), `4px 10px` padding, uppercase `label-sm` font.
- **Safe / Under Budget:** Background `rgba(34, 197, 94, 0.12)`, text `#22C55E`, border `1px solid rgba(34, 197, 94, 0.25)`.
- **Warning / Approaching:** Background `rgba(234, 179, 8, 0.12)`, text `#EAB308`, border `1px solid rgba(234, 179, 8, 0.25)`.
- **Critical / Over Budget:** Background `rgba(239, 68, 68, 0.12)`, text `#EF4444`, border `1px solid rgba(239, 68, 68, 0.25)`.

### Buttons
- **Primary:** Full width or pill action in solid `#22C55E` with `#0B0F17` bold typography (`label-lg`), providing unambiguous tap focus. Height: 48px to 52px.
- **Secondary / Ghost:** `#131B2E` background, 1px border in `#1E293B`, `#F8FAFC` text.
- **Destructive:** `#EF4444` background or 1px border `rgba(239, 68, 68, 0.4)` with red text for high-risk financial revocations.

### Transaction Lists
- Flat interactive rows inside `#131B2E` containers separated by 1px `#1E293B` hairline dividers.
- Left-aligned icon bubble (40px circular background at `rgba(255, 255, 255, 0.05)`), merchant title in `#F8FAFC`, subcategory timestamp in `#94A3B8`.
- Right-aligned tabular currency value: positive cash flow rendered in `#22C55E`, standard debit in `#F8FAFC`.

### Form Inputs & Selectors
- Background: `#0B0F17` inset within `#131B2E` cards.
- Border: 1px `#1E293B`, transitioning to `#22C55E` on active focus.
- Placeholder text: `#64748B`. Value text: `#F8FAFC`. Height: 48px, radius: 12px.

### Navigation Bar (iOS Bottom Nav)
- Height: 64px + safe area inset. Fixed translucent dock with `rgba(11, 15, 23, 0.85)` fill and 20px blur.
- Minimalist iconography with 24px bounding boxes. Active item uses `#22C55E` with a subtle glow point below; inactive items use `#94A3B8`.