# MyDailySales — Visual Design System
**Style Guide v1.0 · June 2026**

> This document is the single source of truth for every visual decision in MyDailySales. Every component, screen, and interaction must derive from these tokens. When in doubt, come back here.

---

## 01 — Brand Philosophy

MyDailySales sits in a specific visual territory: **Bloomberg Terminal meets Moniepoint**. It is not a consumer app. It is not a fun product. It is a business operations tool used by people who care about money, and every visual choice must reinforce that.

The interface communicates four things — in this order:

1. **Financial trust** — the owner's money data is safe and accurate here
2. **Operational control** — the owner is in charge, even when not in the shop
3. **Calm confidence** — no anxiety, no clutter, no noise
4. **Premium quality** — this is software worth paying for

The UI must never feel:
- Cheap or template-based
- Bootstrap-like or generic admin
- Overly colorful or cartoonish
- Gamer-themed (dark ≠ gaming)

The benchmark: if shown on Dribbble, Product Hunt, or next to Stripe, Ramp, or Mercury — it would not look out of place.

---

## 02 — Color System

### Core Palette

| Token | Hex | Usage |
|---|---|---|
| `--bg` | `#0A0F0A` | Page background — always |
| `--surface` | `#111811` | Card backgrounds |
| `--surface-2` | `#151E15` | Elevated surfaces, modals |
| `--border` | `#1A211A` | All borders |
| `--accent` | `#00C853` | Primary CTA, money amounts, active states |
| `--accent-alt` | `#10B981` | Secondary green — premium contexts |
| `--text-1` | `#FFFFFF` | Primary text |
| `--text-2` | `#A1A8A1` | Secondary text, labels |
| `--text-3` | `#6B726B` | Muted text, placeholders |

### Semantic Colors

| Token | Hex | Usage |
|---|---|---|
| `--success` | `#00C853` | Positive states, revenue up |
| `--warning` | `#F59E0B` | Low stock alerts, caution |
| `--danger` | `#EF4444` | Errors, debt overdue, out of stock |
| `--info` | `#3B82F6` | Informational states |

### Color Rules

**Rule 1 — Green means money.** Every Naira amount in the entire product uses `--accent`. No exceptions. The owner's eye should land on revenue within one second of the screen loading.

**Rule 2 — No white backgrounds.** The background is always `#0A0F0A`. Cards are `#111811`. Elevated surfaces are `#151E15`. Never introduce white or light surfaces.

**Rule 3 — Color encodes meaning, not decoration.** Green = money/success. Amber = warning/attention. Red = problem/loss. Blue = information. Gray = neutral/structural. Never use color for aesthetic variety.

**Rule 4 — Maximum 3 colors per chart.** No rainbow charts. Ever.

---

## 03 — Typography

### Font Stack

```
Primary:   Inter
Fallback:  -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif
```

Inter is loaded from Google Fonts at weights 400, 500, and 700 only. **Never use more than these three weights.**

### Type Scale

| Role | Size | Weight | Usage |
|---|---|---|---|
| Display | 56px | 700 | Hero numbers — revenue totals |
| Heading 1 | 40px | 700 | Page titles |
| Heading 2 | 32px | 700 | Section headers |
| Heading 3 | 24px | 600 | Card titles, subsections |
| Section Title | 20px | 600 | Widget headers |
| Body | 16px | 400 | General content |
| Small | 14px | 400 | Supporting text, captions |
| Caption | 12px | 500 | Labels, badges, timestamps |

**Line height:** 150% across all sizes.

**Letter spacing:** `-0.02em` on headings 32px and above. Tight headlines feel more authoritative.

### Money Typography

Currency figures are the most important text in the product. They get special treatment:

```css
.money {
  font-size: 40px;           /* or larger depending on context */
  font-weight: 700;
  color: #00C853;            /* always accent green */
  font-variant-numeric: tabular-nums;  /* digits align vertically */
  letter-spacing: -0.02em;
}
```

`font-variant-numeric: tabular-nums` is non-negotiable for all currency and number columns. Without it, numbers shift horizontally as values change, which looks broken.

---

## 04 — Spacing System

Based on a 4px base unit. Only use values from this scale:

```
4px   — micro gaps, icon padding
8px   — tight component spacing
12px  — internal card spacing
16px  — standard component gap
24px  — section breathing room
32px  — card padding (desktop)
48px  — between major sections
64px  — page-level separation
96px  — hero/display spacing
```

**Content padding:**
- Desktop: `32px`
- Tablet: `24px`
- Mobile: `16px`

**Max content width:** `1440px`, centered.

**Grid:** 12 columns. Don't fight the grid — the dashboard is 12 columns, sidebar takes 3, content takes 9 on desktop.

---

## 05 — Cards

Cards are the primary UI container for every piece of information.

### Standard Card

```css
.card {
  background: #111811;
  border: 1px solid #1A211A;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.25);
  transition: transform 200ms ease, border-color 200ms ease;
}

.card:hover {
  transform: translateY(-2px);
  border-color: #2a362a;
}
```

### Metric Card

For summary numbers — revenue, sales count, debt total:

```css
.metric-card {
  background: #151E15;
  border: 1px solid #1A211A;
  border-radius: 14px;
  padding: 20px;
}

.metric-card .label {
  font-size: 12px;
  font-weight: 500;
  color: #6B726B;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-bottom: 8px;
}

.metric-card .value {
  font-size: 32px;
  font-weight: 700;
  color: #00C853;
  font-variant-numeric: tabular-nums;
}

.metric-card .sub {
  font-size: 13px;
  color: #6B726B;
  margin-top: 4px;
}
```

### Elevated Card (Modals, Dropdowns)

```css
.elevated {
  background: #151E15;
  border: 1px solid #2a322a;
  border-radius: 20px;
  box-shadow: 0 16px 64px rgba(0, 0, 0, 0.4);
}
```

---

## 06 — Buttons

### Primary Button

The main action on any screen. Only one primary button visible at a time.

```css
.btn-primary {
  background: #00C853;
  color: #000000;             /* black text on green — NOT white */
  height: 44px;
  padding: 0 20px;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 600;
  border: none;
  cursor: pointer;
  transition: filter 150ms ease, box-shadow 150ms ease;
}

.btn-primary:hover {
  filter: brightness(1.05);
  box-shadow: 0 8px 24px rgba(0, 200, 83, 0.25);
}

.btn-primary:active {
  transform: scale(0.98);
}

.btn-primary:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
```

### Secondary Button

For non-primary actions alongside a primary button:

```css
.btn-secondary {
  background: transparent;
  color: #A1A8A1;
  height: 44px;
  padding: 0 20px;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 500;
  border: 1px solid #2A322A;
  cursor: pointer;
  transition: background 150ms ease;
}

.btn-secondary:hover {
  background: #151E15;
  color: #FFFFFF;
}
```

### Ghost Button

For tertiary actions, skip links, "cancel" options:

```css
.btn-ghost {
  background: transparent;
  color: #6B726B;
  height: 44px;
  padding: 0 16px;
  border: none;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: color 150ms ease, background 150ms ease;
}

.btn-ghost:hover {
  background: rgba(255, 255, 255, 0.04);
  color: #A1A8A1;
}
```

### Destructive Button

For irreversible actions only (delete, deactivate staff):

```css
.btn-danger {
  background: rgba(239, 68, 68, 0.1);
  color: #EF4444;
  border: 1px solid rgba(239, 68, 68, 0.2);
  height: 44px;
  padding: 0 20px;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
}

.btn-danger:hover {
  background: rgba(239, 68, 68, 0.18);
}
```

---

## 07 — Form Inputs

### Text Input

```css
.input {
  height: 48px;
  width: 100%;
  background: #111811;
  border: 1px solid #1A211A;
  border-radius: 12px;
  padding: 0 16px;
  font-size: 15px;
  color: #FFFFFF;
  font-family: Inter, sans-serif;
  transition: border-color 150ms ease, box-shadow 150ms ease;
  outline: none;
}

.input::placeholder {
  color: #6B726B;
}

.input:focus {
  border-color: #00C853;
  box-shadow: 0 0 0 3px rgba(0, 200, 83, 0.12);
}
```

### Input Labels

Labels sit above inputs. Never use placeholder text as the only label.

```css
.label {
  display: block;
  font-size: 12px;
  font-weight: 500;
  color: #6B726B;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-bottom: 8px;
}
```

### Number Input (for currency/quantity)

```css
.input-number {
  font-size: 24px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: #FFFFFF;
  text-align: right;
}
```

---

## 08 — Navigation

### Sidebar (Desktop)

```css
.sidebar {
  width: 280px;
  height: 100vh;
  background: #0A0F0A;
  border-right: 1px solid #1A211A;
  padding: 20px 16px;
  position: fixed;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 500;
  color: #6B726B;
  text-decoration: none;
  transition: all 150ms ease;
  margin-bottom: 2px;
}

.nav-item:hover {
  background: #151E15;
  color: #A1A8A1;
}

.nav-item.active {
  background: rgba(0, 200, 83, 0.12);
  color: #00C853;
}
```

### Bottom Navigation (Mobile)

```css
.bottom-nav {
  position: fixed;
  bottom: 0; left: 0; right: 0;
  background: #111811;
  border-top: 1px solid #1A211A;
  display: flex;
  padding-bottom: env(safe-area-inset-bottom);
}

.bottom-nav-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px 0;
  gap: 4px;
  font-size: 11px;
  font-weight: 500;
  color: #6B726B;
  text-decoration: none;
  transition: color 150ms ease;
}

.bottom-nav-item.active {
  color: #00C853;
}
```

---

## 09 — Tables

Tables in MyDailySales represent financial data. They must feel like a Bloomberg terminal row — not an HTML table from 2010.

```css
.table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.table th {
  background: #151E15;
  color: #6B726B;
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  padding: 12px 16px;
  text-align: left;
  border-bottom: 1px solid #1A211A;
  position: sticky;
  top: 0;
}

.table td {
  padding: 16px;
  color: #A1A8A1;
  border-bottom: 1px solid rgba(26, 33, 26, 0.6);
  vertical-align: middle;
}

.table tr:last-child td {
  border-bottom: none;
}

.table tr:hover td {
  background: rgba(255, 255, 255, 0.015);
}

/* Financial columns always align right */
.table td.financial,
.table th.financial {
  text-align: right;
  font-variant-numeric: tabular-nums;
  font-family: Inter, sans-serif;
}

/* Money amounts in tables */
.table td.money {
  color: #00C853;
  font-weight: 600;
  text-align: right;
  font-variant-numeric: tabular-nums;
}
```

---

## 10 — Badges & Status Indicators

### Status Badges

```css
.badge {
  display: inline-flex;
  align-items: center;
  padding: 3px 10px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.04em;
}

.badge-green  { background: rgba(0, 200, 83, 0.12);  color: #00C853; }
.badge-amber  { background: rgba(245, 158, 11, 0.12); color: #F59E0B; }
.badge-red    { background: rgba(239, 68, 68, 0.12);  color: #EF4444; }
.badge-blue   { background: rgba(59, 130, 246, 0.12); color: #3B82F6; }
.badge-gray   { background: rgba(161, 168, 161, 0.1); color: #6B726B; }
```

### Live Indicator

```css
.live-dot {
  width: 8px;
  height: 8px;
  background: #00C853;
  border-radius: 50%;
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50%       { opacity: 0.5; transform: scale(0.85); }
}
```

### Stock Status Colors

| State | Color | Token |
|---|---|---|
| In stock | Default text `#A1A8A1` | `--text-2` |
| Low stock | Amber `#F59E0B` | `--warning` |
| Out of stock | Red `#EF4444` | `--danger` |

---

## 11 — Charts

Charts follow Stripe / Vercel Analytics conventions: minimal grid, smooth curves, dark tooltip.

### Chart Colors

| Data series | Color |
|---|---|
| Revenue (primary) | `#00C853` |
| Expenses / costs | `#F59E0B` |
| Loss / negative | `#EF4444` |
| Neutral / structural | `#2A362A` |
| Informational | `#3B82F6` |

### Chart Rules

- Grid lines: `rgba(42, 54, 42, 0.5)` — barely visible
- Axis text: `#6B726B`, 11px, no axis lines
- Bars: `border-radius: 6px 6px 0 0` on top corners only
- Smooth curves, not angular lines (use `type: 'monotone'` in Recharts)
- Tooltip background: `#151E15`, border `#2A362A`, border-radius `12px`
- Never more than 3 data series per chart
- No legend if the chart has only one series

### Recharts Base Config (Tailwind + Recharts)

```typescript
// Shared chart tooltip style
const tooltipStyle = {
  contentStyle: {
    background: '#151E15',
    border: '1px solid #2A362A',
    borderRadius: '12px',
    color: '#F0F4F0',
  },
  labelStyle: { color: '#6B726B', fontSize: '12px' },
  itemStyle: { color: '#00C853' },
}

// Bar chart radius
const barRadius: [number, number, number, number] = [6, 6, 0, 0]
```

---

## 12 — Dashboard Widgets

Every widget on the owner dashboard follows this structure:

```
┌─────────────────────────────────────────┐
│  WIDGET TITLE               [context]   │
│                                         │
│  PRIMARY METRIC                         │
│  supporting context · trend indicator   │
│                                         │
│  [sparkline or secondary data]          │
└─────────────────────────────────────────┘
```

**Rules:**
- Widget title: `12px`, uppercase, `#6B726B`, letter-spacing `0.08em`
- Primary metric: `32px+`, `700` weight, accent green for money
- Supporting context: `13px`, `#6B726B`
- Trend indicators: green for positive (▲ +12%), red for negative (▼ -3%)
- Metrics must dominate the card — they are the reason the widget exists

---

## 13 — Micro-Interactions

Every interactive element is alive. Interactions should feel fast, responsive, and premium — not bouncy or playful.

### Timing

| Interaction | Duration | Easing |
|---|---|---|
| Hover state | 150ms | `ease` |
| Focus ring | 150ms | `ease` |
| Card hover | 200ms | `ease` |
| Page transitions | 200ms | `ease-in-out` |
| Modal open | 200ms | `ease-out` |
| Toast notification | 250ms | `ease-out` |

### Allowed Transitions

- `opacity` — for appearing/disappearing elements
- `transform: translateY` — for card hover lift, modal entrance
- `transform: scale` — for button press feedback
- `border-color` — for focus states
- `box-shadow` — for elevation changes

### Never Use

- `bounce` or `elastic` easing — too playful, breaks trust
- Transitions longer than 300ms — feels slow
- `transform: rotate` on functional elements
- Particle effects or confetti on financial events

### Button Press Feedback

```css
button:active {
  transform: scale(0.98);
  transition: transform 80ms ease;
}
```

---

## 14 — Loading States

**Always use skeleton loaders.** A spinning indicator as the primary loading state is never acceptable.

### Skeleton Loader

```css
.skeleton {
  background: linear-gradient(
    90deg,
    #1A211A 25%,
    #1f291f 37%,
    #1A211A 63%
  );
  background-size: 400px 100%;
  animation: shimmer 1.4s ease infinite;
  border-radius: 8px;
}

@keyframes shimmer {
  0%   { background-position: -400px 0; }
  100% { background-position: 400px 0; }
}
```

Skeletons must match the exact shape and layout of the final content. A metric card skeleton is card-shaped. A table row skeleton is row-shaped.

---

## 15 — Empty States

Empty states are an invitation to act — not a blank screen with an error.

Every empty state requires:
1. An icon or illustration (Lucide icon, not emoji)
2. A clear explanation of why it's empty
3. A single primary CTA that fixes the emptiness

```
Example:

  [Package icon]

  No products yet

  Add your first product to start tracking sales.

  [+ Add Product]  ← primary button
```

---

## 16 — Toast Notifications

```css
/* Configured via react-hot-toast in root layout */
toastOptions: {
  style: {
    background: '#111811',
    color: '#F0F4F0',
    border: '1px solid #1A211A',
    borderRadius: '12px',
    fontSize: '14px',
  },
  success: {
    iconTheme: { primary: '#00C853', secondary: '#0A0F0A' },
  },
  error: {
    iconTheme: { primary: '#EF4444', secondary: '#0A0F0A' },
  },
}
```

Toasts appear at top-center. Maximum 1 toast visible at a time. Auto-dismiss at 3 seconds.

---

## 17 — Mobile Design

Mobile is not a resized desktop. The staff interface is mobile-only. Design it from zero for small Android screens.

### Touch Targets

- Minimum tap target: `44px × 44px`
- Buttons on staff screens: full-width, `56px` height minimum
- Product grid cards: large enough to tap without zooming
- No hover states on mobile — use active/press states only

### Mobile-Specific Patterns

- Fixed confirm button at screen bottom with gradient fade (`position: fixed; bottom: 0`)
- Quantity selectors use large `−` and `+` buttons, never tiny inputs
- No sidebars — use bottom navigation
- Safe area insets applied to all fixed elements (`padding-bottom: env(safe-area-inset-bottom)`)
- Font size never below `14px` on mobile

---

## 18 — Accessibility

Premium software is accessible software. These are requirements, not suggestions.

| Rule | Requirement |
|---|---|
| Color contrast | Minimum 4.5:1 for body text, 3:1 for large text |
| Focus states | Visible on all interactive elements — `0 0 0 3px rgba(0,200,83,0.4)` |
| Keyboard navigation | All interactions reachable by keyboard |
| Screen readers | All icons have `aria-label` or `aria-hidden="true"` |
| Motion | Respect `prefers-reduced-motion` — disable transitions |

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

Never sacrifice usability for aesthetics. If a color combination looks great but fails contrast, change the color.

---

## 19 — CSS Custom Properties (Full Token Map)

Paste this into `globals.css` as the foundation of everything:

```css
:root {
  /* Backgrounds */
  --bg:         #0A0F0A;
  --surface:    #111811;
  --surface-2:  #151E15;
  --border:     #1A211A;
  --border-2:   #2A322A;

  /* Brand */
  --accent:     #00C853;
  --accent-alt: #10B981;
  --accent-glow: rgba(0, 200, 83, 0.12);

  /* Semantic */
  --success:    #00C853;
  --warning:    #F59E0B;
  --danger:     #EF4444;
  --info:       #3B82F6;

  /* Text */
  --text-1:     #FFFFFF;
  --text-2:     #A1A8A1;
  --text-3:     #6B726B;

  /* Typography */
  --font-sans:  'Inter', -apple-system, BlinkMacSystemFont, sans-serif;

  /* Radii */
  --radius-sm:  8px;
  --radius-md:  12px;
  --radius-lg:  16px;
  --radius-xl:  20px;

  /* Shadows */
  --shadow-card:   0 8px 32px rgba(0, 0, 0, 0.25);
  --shadow-modal:  0 16px 64px rgba(0, 0, 0, 0.4);
  --shadow-accent: 0 8px 24px rgba(0, 200, 83, 0.25);
}

body {
  background: var(--bg);
  color: var(--text-1);
  font-family: var(--font-sans);
  font-size: 16px;
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
}
```

---

## 20 — Quick Reference — Do / Don't

| Do | Don't |
|---|---|
| Use `#00C853` for all Naira amounts | Use any other color for money |
| Use skeleton loaders during data fetch | Use a spinning circle as primary loader |
| Keep font to Inter 400 / 500 / 700 only | Add extra font weights |
| One primary button per screen | Show two green buttons at once |
| Use `font-variant-numeric: tabular-nums` on all numbers | Let currency columns shift as values update |
| Use `border-radius: 16px` on cards | Use sharp corners or excessive radius |
| Align financial columns right | Center-align currency values |
| Use toast for action feedback | Use browser `alert()` |
| Apply `env(safe-area-inset-bottom)` to mobile fixed elements | Clip content behind the home indicator |
| Test every color combination at 4.5:1 contrast | Assume dark-on-dark is readable |

---

*MyDailySales Design System v1.0 · June 2026 · Internal use only*
