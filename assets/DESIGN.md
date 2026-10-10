---
name: OmniRisk Financial Intelligence
colors:
  surface: '#f7f9fc'
  surface-dim: '#d8dadd'
  surface-bright: '#f7f9fc'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f4f7'
  surface-container: '#eceef1'
  surface-container-high: '#e6e8eb'
  surface-container-highest: '#e0e3e6'
  on-surface: '#191c1e'
  on-surface-variant: '#43474d'
  inverse-surface: '#2d3133'
  inverse-on-surface: '#eff1f4'
  outline: '#74777e'
  outline-variant: '#c3c6ce'
  surface-tint: '#49607c'
  primary: '#00152a'
  on-primary: '#ffffff'
  primary-container: '#102a43'
  on-primary-container: '#7a92b0'
  inverse-primary: '#b0c9e8'
  secondary: '#006a61'
  on-secondary: '#ffffff'
  secondary-container: '#86f2e4'
  on-secondary-container: '#006f66'
  tertiary: '#001626'
  on-tertiary: '#ffffff'
  tertiary-container: '#002b46'
  on-tertiary-container: '#4b95d0'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d1e4ff'
  primary-fixed-dim: '#b0c9e8'
  on-primary-fixed: '#011d35'
  on-primary-fixed-variant: '#314863'
  secondary-fixed: '#89f5e7'
  secondary-fixed-dim: '#6bd8cb'
  on-secondary-fixed: '#00201d'
  on-secondary-fixed-variant: '#005049'
  tertiary-fixed: '#cde5ff'
  tertiary-fixed-dim: '#94ccff'
  on-tertiary-fixed: '#001d32'
  on-tertiary-fixed-variant: '#004b74'
  background: '#f7f9fc'
  on-background: '#191c1e'
  surface-variant: '#e0e3e6'
typography:
  headline-xl:
    fontFamily: Inter
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
    letterSpacing: -0.025em
  headline-xl-mobile:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 30px
    fontWeight: '600'
    lineHeight: 38px
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.015em
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
    letterSpacing: -0.005em
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: 0em
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
    letterSpacing: 0.005em
  label-lg:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
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
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 36px
    letterSpacing: -0.02em
  numeric-table:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 18px
    letterSpacing: 0em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1.5rem
  gutter-mobile: 0.75rem
  gutter-tablet: 1rem
  margin: 2rem
  margin-mobile: 1rem
  margin-tablet: 1.5rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.5rem
---

## Brand & Style
The design system embodies institutional rigor, environmental precision, and modern financial stewardship. Tailored for enterprise bank credit officers, environmental risk analysts, and committee executives, the interface balances dense numerical insights with rapid, high-confidence decision ergonomics.

The visual direction operates on a refined **Corporate Modern** paradigm punctuated by crisp architectural boundaries. The atmosphere is calm, authoritative, and clinical: deep navy tones anchor executive hierarchy, while radiant ecological teal signals forward-looking transition scenarios. The aesthetic rejects decorative clutter in favor of scannable data layouts, deliberate contrast ratios, and instant risk legibility across complex exposure matrices.

## Colors
The color palette establishes immediate domain credibility through strict semantic enforcement:

- **Primary Canvas & Textures**: Base canvas sits on `#F5F7FA` (Light Slate Tint), establishing a soft, low-glare surface for data density. Elevated containers and cards use pure `#FFFFFF`.
- **Brand & Structural Neutrals**: `#102A43` serves as the primary structural anchor, defining key headers, navigation, and high-emphasis indicators. Body text defaults to `#334E68`, while borders and separators consistently use `#E2E8F0`.
- **Strategic Accent**: Vibrant teal (`#0D9488`) drives primary actions, positive transition pathways, forward metrics, and key focus states.
- **Risk Score Spectrum**:
  - **Low Risk / Safe Zone (Score 75–100)**: Emerald Green (`#10B981`) paired with subtle tinted background `#ECFDF5`.
  - **Moderate Risk / Watchlist (Score 40–74)**: Amber (`#F59E0B`) paired with tinted background `#FFFBEB`.
  - **High Risk / Severe Exposure (Score 0–39)**: Crimson Red (`#EF4444`) paired with tinted background `#FEF2F2`.
- **Data Visualizations & Overlays**: Supporting analytical charts utilize muted cool greys (`#627D98`) and tertiary blue (`#0369A1`) to prevent visual fatigue during long analytical sessions.

## Typography
Inter delivers structural neutrality, high x-height clarity, and comprehensive tabular figure support. 

- **Numerical Formatting**: All financial values, risk indices, and Indian Rupee values (`₹`, Lakhs, Crores) must activate OpenType tabular numbers (`tnum`) and slashed zeros (`zero`) to guarantee vertical decimal alignment inside tables and comparison cards.
- **Microcopy & Metadata**: Financial metadata and timeline timestamps leverage `label-sm` with slight positive tracking (`0.04em`) to remain sharp against both pure white and tinted sub-surfaces.
- **Hierarchy Enforcement**: Page and section headlines prioritize high contrast against the canvas using Deep Navy (`#102A43`).

## Layout & Spacing
The layout employs an adaptive fluid grid structured for data-heavy dashboard environments:

- **Desktop (1280px+)**: 12-column layout with 24px (`1.5rem`) gutters and 32px (`2rem`) screen margins. Complex balance sheets, portfolio geographical splits, and transition scenario matrices span 3, 4, 6, or 8 columns.
- **Tablet (768px – 1279px)**: 8-column layout with 16px (`1rem`) gutters and 24px (`1.5rem`) margins. Analytic sidebars collapse into overlay slide-overs or secondary tab segments.
- **Mobile (< 768px)**: 4-column layout with 12px (`0.75rem`) gutters and 16px (`1rem`) canvas padding. Cards stack vertically, prioritizing top-level ESG/physical risk aggregate scores before drill-down line items.
- **Rhythm**: Internal card padding adheres strictly to `space-md` (compact widgets) and `space-lg` (primary risk dossiers). Horizontal alignment of labels and currency figures enforces consistent baselines.

## Elevation & Depth
Depth is expressed through clean surface-layering, crisp border boundaries, and tinted ambient shadows rather than dramatic drop shadows.

- **Level 0 (Canvas Base)**: `#F5F7FA`, completely flat.
- **Level 1 (Default Data Card & Panel)**: Pure `#FFFFFF` surface bounded by a razor-thin border (`1px solid #E2E8F0`). Shadow is ultra-subtle: `0 1px 3px 0 rgba(16, 42, 67, 0.04), 0 1px 2px 0 rgba(16, 42, 67, 0.02)`.
- **Level 2 (Hovered Cards & Interactive Table Rows)**: `0 4px 12px -2px rgba(16, 42, 67, 0.08), 0 2px 6px -1px rgba(16, 42, 67, 0.04)` with border transitioning to `#CBD5E1`.
- **Level 3 (Dropdowns, Popovers, & Contextual Metric Tooltips)**: `#FFFFFF` with `0 10px 25px -4px rgba(16, 42, 67, 0.12), 0 4px 10px -2px rgba(16, 42, 67, 0.04)`, surrounded by `1px solid #CBD5E1`.
- **Level 4 (Credit Action Modals & Executive Approvals)**: Centered layer with a deep navy backdrop scrim (`#102A43` at 40% opacity) and `0 20px 30px -10px rgba(16, 42, 67, 0.20)`.

## Shapes
Roundedness level `2` delivers balanced enterprise ergonomics, offering smooth contours without reducing tabular data density:

- **Standard Elements (0.5rem / 8px)**: Standard buttons, text inputs, risk metric cards, portfolio filters, dropdown menus, and tabular cell highlights.
- **Containers & Major Panels (1rem / 16px)**: Primary application card containers, scenario models, asset risk breakdown sections, and modal bodies.
- **Status Tags, Badges & Pills**: Full-bleed pill shapes (`9999px`) for advisory indicator tags, regulatory compliance labels, and risk status chips to visually separate continuous numbers from categorical labels.

## Components

### Buttons
- **Primary Action**: Deep teal background (`#0D9488`), white text (`#FFFFFF`), bold font weight (`label-lg`), 8px border-radius. On hover, darker teal (`#0F766E`).
- **Secondary / Institutional**: Deep navy background (`#102A43`), white text (`#FFFFFF`), 8px radius.
- **Outline / Filter**: Pure white background, border `1px solid #CBD5E1`, text `#334E68`. On hover, `#F8FAFC` background with border `#94A3B8`.

### Risk & Advisory Badges
- **Low Risk (75-100)**: Background `#ECFDF5`, text `#065F46`, border `1px solid #A7F3D0`, pill-shaped, uppercase `label-sm` tracking.
- **Moderate Risk (40-74)**: Background `#FFFBEB`, text `#92400E`, border `1px solid #FDE68A`, pill-shaped.
- **High Risk (0-39)**: Background `#FEF2F2`, text `#991B1B`, border `1px solid #FECACA`, pill-shaped.

### Data Cards
- Pure white background, `1px solid #E2E8F0` border, 16px border-radius, Level 1 shadow. Header displays title in `headline-sm` with optional right-aligned advisory pill or currency aggregation.

### Indian Rupee (INR) Metric Displays
- Uses `numeric-metric` with tabular numbers. Indian numbering system formatted explicitly (e.g., `₹4,25,00,000` or `₹42.50 Cr`). Currency symbol `₹` rendered at 85% opacity of the numerical value.

### Form Inputs & Portfolio Filters
- Height of 40px, padding `0 12px`, background `#FFFFFF`, border `1px solid #CBD5E1`, text `#102A43`. Active focus ring: `2px solid #0D9488` with a 2px offset.

### Tables & Audit Logs
- Sticky header with `#F8FAFC` background, 1px bottom border `#CBD5E1`, typography `label-sm` with text `#486581`.
- Row height of 48px, horizontal divider `1px solid #F1F5F9`, alternating subtle striping or simple pure white rows with `#F8FAFC` hover transition.