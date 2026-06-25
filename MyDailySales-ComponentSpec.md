# MyDailySales — Component Specification Document

**Version 1.0 · June 2026 · Internal Use Only**

> This document defines every reusable component in the system — its props, states, variants, behavior, and exact visual output. An agent building any component must read this document first. Do not invent behavior not specified here. Do not add props not listed here. When in doubt, this document wins over the implementation guide.

---

## Table of Contents

### Foundation Components (`/components/ui/`)
1. [Button](#1-button)
2. [Input](#2-input)
3. [Card](#3-card)
4. [Badge](#4-badge)
5. [Toast](#5-toast)
6. [Spinner](#6-spinner)
7. [Skeleton](#7-skeleton)
8. [EmptyState](#8-emptystate)
9. [ErrorState](#9-errorstate)

### Dashboard Components (`/components/dashboard/`)
10. [MetricCard](#10-metriccard)
11. [RealtimeSalesFeed](#11-realtimesalesfeed)
12. [StaffBreakdown](#12-staffbreakdown)
13. [LowStockPanel](#13-lowstockpanel)
14. [WeeklyChart](#14-weeklychart)

### Sales Components (`/components/sales/`)
15. [ProductGrid](#15-productgrid)
16. [ProductCard](#16-productcard)
17. [QuantitySelector](#17-quantityselector)
18. [SaleConfirmButton](#18-saleconfirmbutton)
19. [UndoButton](#19-undobutton)

### Inventory Components (`/components/inventory/`)
20. [ProductList](#20-productlist)
21. [ProductListItem](#21-productlistitem)
22. [AddProductForm](#22-addproductform)
23. [StockAdjuster](#23-stockadjuster)

### Debt Components (`/components/debts/`)
24. [DebtList](#24-debtlist)
25. [DebtCard](#25-debtcard)
26. [AddDebtForm](#26-adddebtform)
27. [RecordPaymentForm](#27-recordpaymentform)

### Staff Components (`/components/staff/`)
28. [StaffList](#28-stafflist)
29. [StaffListItem](#29-stafflistitem)
30. [InviteForm](#30-inviteform)
31. [InviteLinkCard](#31-invitelinkcard)

### Layout Components
32. [OwnerSidebar](#32-ownersidebar)
33. [BottomNav](#33-bottomnav)
34. [PageHeader](#34-pageheader)

---

## Component Conventions

These rules apply to every component in this document.

### Color Usage

```
Money amounts:    color: #00C853   font-variant-numeric: tabular-nums
Warning states:   color: #FFB300
Danger states:    color: #FF3D3D
Primary text:     color: #F0F4F0
Secondary text:   color: #8A9E8A
Muted text:       color: #4A5E4A
Card background:  background: #111711
Elevated surface: background: #1A221A
Page background:  background: #0A0F0A
Border default:   border: 1px solid #2A362A
```

### Typography

```
Display font (Space Grotesk): headings, metric values, money amounts, logo
Body font (Inter):            labels, body text, descriptions

Font weights used: 400 (regular), 500 (medium), 600 (semibold), 700 (bold)
```

### Spacing Scale

```
4px   micro
8px   tight
12px  compact
16px  default
20px  comfortable
24px  spacious
32px  section
```

### Border Radius Scale

```
rounded-xl   = 16px   inputs
rounded-2xl  = 20px   cards, buttons
rounded-3xl  = 24px   large modals
```

### Prop Naming Conventions

```
className   → additional Tailwind classes, always merged with twMerge
onClick     → click handlers
onChange    → change handlers for inputs
disabled    → boolean
loading     → boolean, shows loading state
children    → React children
```

### cn() Utility

All components use `cn()` from `@/lib/utils` to merge Tailwind classes:

```typescript
import { cn } from '@/lib/utils'

// Usage:
className={cn('base-classes', conditional && 'conditional-class', className)}
```

---

## 1. Button

**File:** `src/components/ui/Button.tsx`

**Purpose:** The single button component used everywhere in the app. Covers all four button variants.

### Props

```typescript
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  disabled?: boolean
  fullWidth?: boolean
  onClick?: () => void
  type?: 'button' | 'submit' | 'reset'
  className?: string
  children: React.ReactNode
}
```

### Defaults

```
variant:   'primary'
size:      'md'
loading:   false
disabled:  false
fullWidth: false
type:      'button'
```

### Variants — Visual Specification

**primary**
```
background:   #00C853
color:        #000000   ← black text, NOT white
border:       none
hover:        background #00A846
active:       transform scale(0.98)
disabled:     opacity 0.4, cursor not-allowed
```

**secondary**
```
background:   #1A221A
color:        #8A9E8A
border:       1px solid #2A362A
hover:        color #F0F4F0, border-color #3A463A
active:       transform scale(0.98)
disabled:     opacity 0.4
```

**ghost**
```
background:   transparent
color:        #8A9E8A
border:       none
hover:        color #F0F4F0
active:       transform scale(0.98)
disabled:     opacity 0.4
```

**danger**
```
background:   rgba(255, 61, 61, 0.1)
color:        #FF3D3D
border:       1px solid rgba(255, 61, 61, 0.2)
hover:        background rgba(255, 61, 61, 0.18)
active:       transform scale(0.98)
disabled:     opacity 0.4
```

### Sizes

```
sm:  height 36px, padding 0 14px, font-size 13px, border-radius 10px
md:  height 44px, padding 0 20px, font-size 14px, border-radius 12px
lg:  height 56px, padding 0 24px, font-size 16px, border-radius 16px, font-weight 700
```

### Loading State

When `loading={true}`:
- Replace children with a spinner (white 16px spinning circle)
- Keep button disabled
- Keep button same width (no layout shift)

### Full Code

```typescript
import { cn } from '@/lib/utils'

interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  disabled?: boolean
  fullWidth?: boolean
  onClick?: () => void
  type?: 'button' | 'submit' | 'reset'
  className?: string
  children: React.ReactNode
}

const variantClasses = {
  primary:   'bg-[#00C853] text-black hover:bg-[#00A846] border-0',
  secondary: 'bg-[#1A221A] text-[#8A9E8A] border border-[#2A362A] hover:text-[#F0F4F0] hover:border-[#3A463A]',
  ghost:     'bg-transparent text-[#8A9E8A] border-0 hover:text-[#F0F4F0]',
  danger:    'bg-[rgba(255,61,61,0.1)] text-[#FF3D3D] border border-[rgba(255,61,61,0.2)] hover:bg-[rgba(255,61,61,0.18)]',
}

const sizeClasses = {
  sm: 'h-9 px-3.5 text-[13px] rounded-[10px]',
  md: 'h-11 px-5 text-[14px] rounded-xl',
  lg: 'h-14 px-6 text-[16px] rounded-2xl font-bold',
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = false,
  onClick,
  type = 'button',
  className,
  children,
}: ButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center font-semibold transition-all duration-150',
        'active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed',
        variantClasses[variant],
        sizeClasses[size],
        fullWidth && 'w-full',
        className
      )}
    >
      {loading ? (
        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : (
        children
      )}
    </button>
  )
}
```

---

## 2. Input

**File:** `src/components/ui/Input.tsx`

**Purpose:** All text, number, and tel inputs in the app.

### Props

```typescript
interface InputProps {
  label?: string
  type?: 'text' | 'number' | 'tel' | 'password' | 'email'
  placeholder?: string
  value: string | number
  onChange: (value: string) => void
  onKeyDown?: (e: React.KeyboardEvent) => void
  error?: string
  disabled?: boolean
  autoFocus?: boolean
  prefix?: string          // e.g. "₦" shown inside input on left
  suffix?: string          // e.g. "units" shown inside input on right
  className?: string
  inputMode?: 'numeric' | 'text' | 'tel'
}
```

### Visual Specification

```
Label:
  font-size:      12px
  font-weight:    500
  color:          #8A9E8A
  text-transform: uppercase
  letter-spacing: 0.08em
  margin-bottom:  8px

Input:
  height:         48px
  width:          100%
  background:     #1A221A
  border:         1px solid #2A362A
  border-radius:  16px (rounded-xl)
  padding:        0 16px
  font-size:      15px
  color:          #F0F4F0
  outline:        none

  placeholder-color: #4A5E4A

  :focus
    border-color: #00C853
    box-shadow:   0 0 0 3px rgba(0, 200, 83, 0.12)

  :disabled
    opacity: 0.5
    cursor: not-allowed

Error state:
  border-color: #FF3D3D
  error message below: font-size 12px, color #FF3D3D, margin-top 4px
```

### Full Code

```typescript
import { cn } from '@/lib/utils'

interface InputProps {
  label?: string
  type?: 'text' | 'number' | 'tel' | 'password' | 'email'
  placeholder?: string
  value: string | number
  onChange: (value: string) => void
  onKeyDown?: (e: React.KeyboardEvent) => void
  error?: string
  disabled?: boolean
  autoFocus?: boolean
  prefix?: string
  suffix?: string
  className?: string
  inputMode?: 'numeric' | 'text' | 'tel'
}

export function Input({
  label,
  type = 'text',
  placeholder,
  value,
  onChange,
  onKeyDown,
  error,
  disabled,
  autoFocus,
  prefix,
  suffix,
  className,
  inputMode,
}: InputProps) {
  return (
    <div className={cn('w-full', className)}>
      {label && (
        <label className="block text-[#8A9E8A] text-xs font-medium uppercase tracking-widest mb-2">
          {label}
        </label>
      )}
      <div className="relative">
        {prefix && (
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8A9E8A] text-lg select-none">
            {prefix}
          </span>
        )}
        <input
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={e => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          disabled={disabled}
          autoFocus={autoFocus}
          inputMode={inputMode}
          className={cn(
            'w-full h-12 bg-[#1A221A] border rounded-xl px-4 py-3',
            'text-[#F0F4F0] text-[15px] placeholder-[#4A5E4A]',
            'outline-none transition-all duration-150',
            'focus:border-[#00C853] focus:shadow-[0_0_0_3px_rgba(0,200,83,0.12)]',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            error ? 'border-[#FF3D3D]' : 'border-[#2A362A]',
            prefix && 'pl-9',
            suffix && 'pr-12',
          )}
        />
        {suffix && (
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[#8A9E8A] text-sm select-none">
            {suffix}
          </span>
        )}
      </div>
      {error && (
        <p className="mt-1 text-[#FF3D3D] text-xs">{error}</p>
      )}
    </div>
  )
}
```

---

## 3. Card

**File:** `src/components/ui/Card.tsx`

**Purpose:** Container for grouped content. Used throughout owner dashboard and management pages.

### Props

```typescript
interface CardProps {
  children: React.ReactNode
  className?: string
  padding?: 'sm' | 'md' | 'lg'       // sm=16px, md=20px, lg=24px
  elevated?: boolean                  // uses #1A221A instead of #111711
  onClick?: () => void                // makes card interactive (hover effect)
}
```

### Visual Specification

```
Default card:
  background:    #111711
  border:        1px solid #2A362A
  border-radius: 20px (rounded-2xl)
  padding:       24px (md)

Elevated card (modals, sheets):
  background:    #1A221A

Interactive card (when onClick provided):
  cursor:        pointer
  hover:         border-color #3A463A, transform translateY(-1px)
  transition:    200ms ease

Padding variants:
  sm:  16px
  md:  20px
  lg:  24px
```

### Full Code

```typescript
import { cn } from '@/lib/utils'

interface CardProps {
  children: React.ReactNode
  className?: string
  padding?: 'sm' | 'md' | 'lg'
  elevated?: boolean
  onClick?: () => void
}

const paddingClasses = { sm: 'p-4', md: 'p-5', lg: 'p-6' }

export function Card({
  children,
  className,
  padding = 'md',
  elevated = false,
  onClick,
}: CardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'border border-[#2A362A] rounded-2xl transition-all duration-200',
        elevated ? 'bg-[#1A221A]' : 'bg-[#111711]',
        onClick && 'cursor-pointer hover:border-[#3A463A] hover:-translate-y-px',
        paddingClasses[padding],
        className
      )}
    >
      {children}
    </div>
  )
}
```

---

## 4. Badge

**File:** `src/components/ui/Badge.tsx`

**Purpose:** Status labels — debt status, stock status, subscription status, role labels.

### Props

```typescript
interface BadgeProps {
  variant: 'green' | 'amber' | 'red' | 'gray' | 'blue'
  children: React.ReactNode
  className?: string
}
```

### Visual Specification

```
All badges:
  display:        inline-flex
  align-items:    center
  padding:        3px 10px
  border-radius:  6px
  font-size:      11px
  font-weight:    600
  letter-spacing: 0.04em

green:  background rgba(0,200,83,0.12)   color #00C853
amber:  background rgba(255,179,0,0.12)  color #FFB300
red:    background rgba(255,61,61,0.12)  color #FF3D3D
gray:   background rgba(138,158,138,0.1) color #8A9E8A
blue:   background rgba(59,130,246,0.12) color #3B82F6
```

### Usage Map

| Badge Variant | Used For |
|---|---|
| green | active subscription, paid debt, in-stock, owner role |
| amber | trial subscription, partial debt, low stock |
| red | expired subscription, overdue, out of stock |
| gray | staff role, inactive |
| blue | informational labels |

### Full Code

```typescript
import { cn } from '@/lib/utils'

interface BadgeProps {
  variant: 'green' | 'amber' | 'red' | 'gray' | 'blue'
  children: React.ReactNode
  className?: string
}

const variantClasses = {
  green: 'bg-[rgba(0,200,83,0.12)] text-[#00C853]',
  amber: 'bg-[rgba(255,179,0,0.12)] text-[#FFB300]',
  red:   'bg-[rgba(255,61,61,0.12)] text-[#FF3D3D]',
  gray:  'bg-[rgba(138,158,138,0.1)] text-[#8A9E8A]',
  blue:  'bg-[rgba(59,130,246,0.12)] text-[#3B82F6]',
}

export function Badge({ variant, children, className }: BadgeProps) {
  return (
    <span className={cn(
      'inline-flex items-center px-2.5 py-0.5 rounded-md',
      'text-[11px] font-semibold tracking-[0.04em]',
      variantClasses[variant],
      className
    )}>
      {children}
    </span>
  )
}
```

---

## 5. Toast

**File:** `src/components/ui/Toast.tsx`

**Purpose:** Not a component — a configuration export for react-hot-toast used in the root layout.

### Configuration

```typescript
// Used in src/app/layout.tsx
<Toaster
  position="top-center"
  toastOptions={{
    duration: 3000,
    style: {
      background: '#111711',
      color: '#F0F4F0',
      border: '1px solid #2A362A',
      borderRadius: '12px',
      fontSize: '14px',
    },
    success: {
      iconTheme: { primary: '#00C853', secondary: '#0A0F0A' },
    },
    error: {
      iconTheme: { primary: '#FF3D3D', secondary: '#0A0F0A' },
    },
  }}
/>
```

### Toast Trigger Functions

```typescript
import toast from 'react-hot-toast'

// Use these exact messages throughout the app (see Architecture doc § Error Handling)
toast.success('3 Ankara Print — ₦15,000')
toast.success('Last sale undone')
toast.success('Code sent!')
toast.success('Copied!')
toast.error('Invalid code. Try again.')
toast.error('Something went wrong. Try again.')
```

---

## 6. Spinner

**File:** `src/components/ui/Spinner.tsx`

**Purpose:** Inline loading indicator. Used only inside Button when `loading={true}` and as a page-level loading fallback for Suspense boundaries.

### Props

```typescript
interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg'   // 16px, 24px, 32px
  color?: string               // defaults to currentColor
}
```

### Visual Specification

```
Shape:   circle, border-top transparent (CSS spinner)
Colors:  border: 2px solid currentColor, border-top-color: transparent
Speed:   animation spin 600ms linear infinite

sm: width 16px, height 16px
md: width 24px, height 24px
lg: width 32px, height 32px
```

### Full Code

```typescript
import { cn } from '@/lib/utils'

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizeClasses = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-8 h-8' }

export function Spinner({ size = 'md', className }: SpinnerProps) {
  return (
    <div className={cn(
      'border-2 border-current border-t-transparent rounded-full animate-spin',
      sizeClasses[size],
      className
    )} />
  )
}
```

---

## 7. Skeleton

**File:** `src/components/ui/Skeleton.tsx`

**Purpose:** Placeholder for content while loading. Must match the exact shape of the content it replaces.

### Props

```typescript
interface SkeletonProps {
  width?: string     // e.g. 'w-32', 'w-full'
  height?: string    // e.g. 'h-4', 'h-8'
  rounded?: string   // e.g. 'rounded-xl', 'rounded-full'
  className?: string
}
```

### Visual Specification

```
background:  linear-gradient shimmer from #1A221A → #232E23 → #1A221A
animation:   shimmer 1.4s ease infinite
direction:   left to right (background-position animation)
```

### Full Code

```typescript
import { cn } from '@/lib/utils'

interface SkeletonProps {
  width?: string
  height?: string
  rounded?: string
  className?: string
}

export function Skeleton({
  width = 'w-full',
  height = 'h-4',
  rounded = 'rounded-lg',
  className,
}: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse bg-[#1A221A]',
        width, height, rounded,
        className
      )}
    />
  )
}
```

### Skeleton Composition Examples

```typescript
// MetricCard skeleton
<Card>
  <Skeleton width="w-20" height="h-3" className="mb-3" />
  <Skeleton width="w-32" height="h-8" className="mb-1" />
  <Skeleton width="w-16" height="h-3" />
</Card>

// Sales feed row skeleton
<div className="flex justify-between py-3">
  <div className="space-y-2">
    <Skeleton width="w-28" height="h-4" />
    <Skeleton width="w-20" height="h-3" />
  </div>
  <Skeleton width="w-16" height="h-4" />
</div>
```

---

## 8. EmptyState

**File:** `src/components/ui/EmptyState.tsx`

**Purpose:** Shown when a list or feed has no items. Every list in the app has a corresponding empty state.

### Props

```typescript
interface EmptyStateProps {
  icon: React.ReactNode          // Lucide icon component
  title: string
  description: string
  action?: {
    label: string
    onClick: () => void
  }
}
```

### Visual Specification

```
Container:
  text-align: center
  padding:    48px 24px

Icon:
  width:      48px
  height:     48px
  background: rgba(0,200,83,0.08)
  border:     1px solid rgba(0,200,83,0.12)
  border-radius: 16px
  display:    flex, center
  margin:     0 auto 16px
  icon-color: #4A5E4A
  icon-size:  22px

Title:
  font-family: Space Grotesk
  font-size:   16px
  font-weight: 600
  color:       #F0F4F0
  margin-bottom: 6px

Description:
  font-size:   13px
  color:       #8A9E8A
  max-width:   280px
  margin:      0 auto 20px

Action button (if provided):
  variant: primary
  size:    md
```

### Empty State Copy by Screen

| Screen | Title | Description | Action |
|---|---|---|---|
| Sales feed (no sales today) | "No sales yet today" | "Sales appear here the moment staff log them." | — |
| Products (none added) | "No products yet" | "Add your first product to start tracking sales." | "Add Product" |
| Debts (none active) | "No outstanding debts" | "Log a debt when a customer buys on credit." | "Log Debt" |
| Staff (none invited) | "No staff yet" | "Invite your first staff member to get started." | "Invite Staff" |
| Reports (no data) | "Not enough data yet" | "Come back after a few days of sales to see your reports." | — |
| Low stock (all good) | — | — (don't show empty state — hide the panel) | — |

---

## 9. ErrorState

**File:** `src/components/ui/ErrorState.tsx`

**Purpose:** Shown when a data fetch fails. Always provides a retry action.

### Props

```typescript
interface ErrorStateProps {
  message?: string
  onRetry: () => void
}
```

### Default Message

```
"Something went wrong. Check your connection and try again."
```

### Visual Specification

```
Same layout as EmptyState but:
  icon:        AlertCircle from Lucide
  icon-color:  #FF3D3D
  icon-bg:     rgba(255,61,61,0.08)
  title:       "Something went wrong"
  description: props.message || default
  button:      "Try again" (secondary variant)
```

---

## 10. MetricCard

**File:** `src/components/dashboard/MetricCard.tsx`

**Purpose:** Summary number cards at the top of the owner dashboard. Always shows one key metric.

### Props

```typescript
interface MetricCardProps {
  label: string           // e.g. "Revenue Today"
  value: string           // pre-formatted: "₦184,000" or "23" or "5"
  sub: string             // e.g. "from 23 sales" or "items low"
  valueColor?: 'green' | 'amber' | 'white'   // default 'green'
  loading?: boolean
}
```

### Visual Specification

```
Container:
  background:    #111711
  border:        1px solid #2A362A
  border-radius: 16px
  padding:       16px 20px

Label:
  font-size:      11px
  font-weight:    600
  color:          #8A9E8A
  text-transform: uppercase
  letter-spacing: 0.09em
  margin-bottom:  8px

Value:
  font-family:          Space Grotesk
  font-size:            28px
  font-weight:          700
  font-variant-numeric: tabular-nums
  letter-spacing:       -0.02em
  line-height:          1

  green:  #00C853
  amber:  #FFB300
  white:  #F0F4F0

Sub:
  font-size:    11px
  color:        #4A5E4A
  margin-top:   4px
```

### Loading State

When `loading={true}`, show:
```typescript
<Skeleton width="w-20" height="h-3" className="mb-3" />
<Skeleton width="w-28" height="h-7" className="mb-1" />
<Skeleton width="w-14" height="h-3" />
```

---

## 11. RealtimeSalesFeed

**File:** `src/components/dashboard/RealtimeSalesFeed.tsx`

**Purpose:** Live-updating list of today's sales. Subscribes to Supabase Realtime on mount. Client Component.

### Props

```typescript
interface RealtimeSalesFeedProps {
  initialSales: Sale[]    // pre-fetched server-side, max 10
}
```

### Behavior

```
On mount:
  - Subscribe to Supabase Realtime channel 'realtime-sales'
  - Listen for INSERT on 'sales' table
  - On new event: fetch full sale with joins (products.name, staff_members.name)
  - Prepend to sales array, cap at 10 items

On unmount:
  - Call supabase.removeChannel(channel)

Polling fallback:
  - Every 30 seconds, if channel.state !== 'joined':
  - Re-fetch last 10 sales for today
  - Update state
```

### Visual Specification

```
Container: Card (padding lg)

Header row:
  left:  "Live Sales Feed" — Space Grotesk, 15px, 600
  right: pulsing green dot (8px) + "Live" label (12px, #8A9E8A)

Feed row (each sale):
  height:      auto, padding 12px 0
  separator:   border-bottom 1px solid #1A221A (except last)

  Left column:
    line 1: "{products.name} × {qty_sold}" 
            product name: 14px, #F0F4F0, 500
            "× {qty}": 14px, #8A9E8A, 400
    line 2: "{staff_members.name} · {time ago}"
            12px, #4A5E4A

  Right column:
    "{formatNaira(total)}"
    14px, #00C853, 600, tabular-nums

Empty state:
  <EmptyState
    icon={<ShoppingBag />}
    title="No sales yet today"
    description="Sales appear here the moment staff log them."
  />

Animation:
  New sale rows animate in from top:
  initial: opacity 0, translateY -8px
  animate: opacity 1, translateY 0
  duration: 200ms ease
```

---

## 12. StaffBreakdown

**File:** `src/components/dashboard/StaffBreakdown.tsx`

**Purpose:** Shows each staff member's revenue for the day with a proportional bar. Server or Client Component (no realtime — refreshes on page load).

### Props

```typescript
interface StaffBreakdownProps {
  breakdown: Array<{
    staff_id: string
    staff_name: string
    total: number
    count: number
  }>
}
```

### Visual Specification

```
Container: Card (padding lg)

Header: "Staff Today" — Space Grotesk, 15px, 600, margin-bottom 16px

Each staff row:
  margin-bottom: 16px

  Top row:
    left:  staff name — 14px, #F0F4F0, 500
    right: "{formatNaira(total)}" — 14px, #00C853, 600, tabular-nums
           "{count} sales" — 12px, #4A5E4A

  Progress bar:
    height:        6px
    background:    #1A221A
    border-radius: 9999px
    inner bar:
      background:    #00C853
      border-radius: 9999px
      width:         (staff.total / maxTotal) * 100%
      transition:    width 700ms ease

Max total: highest single staff total = 100% bar width

Empty state:
  "No sales logged yet" — 13px, #4A5E4A, text-center, padding 24px 0
```

---

## 13. LowStockPanel

**File:** `src/components/dashboard/LowStockPanel.tsx`

**Purpose:** Warning panel shown when products are at or below their low_stock_threshold. Conditionally rendered — hidden when no low stock items.

### Props

```typescript
interface LowStockPanelProps {
  items: Array<{
    id: string
    name: string
    stock_qty: number
    low_stock_threshold: number
  }>
}
```

### Behavior

```
If items.length === 0: render nothing (return null)
If items.length > 0: render warning panel
```

### Visual Specification

```
Container:
  background:    rgba(255,179,0,0.08)
  border:        1px solid #FFB300
  border-radius: 16px
  padding:       16px 20px
  margin-bottom: 24px

Header: "⚠ Low Stock Alert"
  font-size:   14px
  font-weight: 600
  color:       #FFB300
  margin-bottom: 10px

Each item row:
  display:  flex, space-between
  padding:  5px 0
  separator: border-bottom 1px solid rgba(255,179,0,0.1) (except last)

  left: product name — 13px, #F0F4F0
  right:
    stock_qty === 0: "Out of stock" — 13px, #FF3D3D
    stock_qty > 0:  "{stock_qty} left" — 13px, #FFB300
```

---

## 14. WeeklyChart

**File:** `src/components/dashboard/WeeklyChart.tsx`

**Purpose:** Bar chart showing daily revenue for the past 7 days. Used on the Reports page.

### Props

```typescript
interface WeeklyChartProps {
  data: Array<{
    day: string       // e.g. "Mon", "Tue"
    revenue: number
  }>
  loading?: boolean
}
```

### Visual Specification

```
Container: Card, no padding override needed

Chart height: 200px
ResponsiveContainer: width 100%

XAxis:
  tick: fill #8A9E8A, fontSize 12
  axisLine: false
  tickLine: false

YAxis:
  tick: fill #8A9E8A, fontSize 10
  axisLine: false
  tickLine: false
  tickFormatter: v => `₦${Math.round(v/1000)}k`
  width: 40

Tooltip:
  contentStyle:
    background: #111711
    border: 1px solid #2A362A
    borderRadius: 12px
  labelStyle: color #8A9E8A
  formatter: (v) => [`₦${v.toLocaleString()}`, 'Revenue']

Bar:
  dataKey: "revenue"
  fill: #00C853
  radius: [6, 6, 0, 0]

Loading state: Skeleton height h-[200px] with rounded-xl
```

---

## 15. ProductGrid

**File:** `src/components/sales/ProductGrid.tsx`

**Purpose:** The main staff sale screen — grid of tappable product cards.

### Props

```typescript
interface ProductGridProps {
  products: Product[]
  onSelect: (product: Product) => void
  loading?: boolean
}
```

### Visual Specification

```
Grid:
  display:               grid
  grid-template-columns: repeat(2, 1fr)
  gap:                   12px

Loading state:
  Show 6 skeleton cards matching ProductCard dimensions

Empty state:
  <EmptyState
    icon={<Package />}
    title="No products yet"
    description="Ask your manager to add products."
  />
```

---

## 16. ProductCard

**File:** `src/components/sales/ProductCard.tsx`

**Purpose:** Individual tappable product in the staff grid. Shows name, price, and stock.

### Props

```typescript
interface ProductCardProps {
  product: Product
  onClick: () => void
}
```

### States

```
in-stock:     selectable, green border on hover
low-stock:    selectable, amber stock label
out-of-stock: disabled, opacity 0.4, cursor not-allowed
```

### Visual Specification

```
Container:
  background:    #111711
  border:        1px solid #2A362A
  border-radius: 20px
  padding:       16px
  text-align:    left
  transition:    all 150ms

  hover (in-stock): border-color #00C853
  active:           transform scale(0.96)
  out-of-stock:     opacity 0.4, cursor not-allowed

Product name:
  font-size:   14px
  font-weight: 500
  color:       #F0F4F0
  margin-bottom: 4px
  display:     -webkit-box, line-clamp 2 (truncate long names)

Selling price:
  font-family:          Space Grotesk
  font-size:            18px
  font-weight:          700
  color:                #00C853
  font-variant-numeric: tabular-nums

Stock label:
  font-size:    12px
  margin-top:   6px

  in-stock (> threshold):  color #4A5E4A, text "{qty} left"
  low-stock (≤ threshold): color #FFB300, text "{qty} left"
  out-of-stock (= 0):      color #FF3D3D, text "Out of stock"
```

---

## 17. QuantitySelector

**File:** `src/components/sales/QuantitySelector.tsx`

**Purpose:** Large +/− stepper for quantity selection during sale confirmation.

### Props

```typescript
interface QuantitySelectorProps {
  value: number
  min?: number
  max?: number           // defaults to product.stock_qty
  onChange: (qty: number) => void
}
```

### Visual Specification

```
Container:
  display:     flex
  align-items: center
  justify:     space-between

Minus button:
  width:  64px
  height: 64px
  background: #1A221A
  border-radius: 20px
  font-size:     28px
  color:         #F0F4F0
  disabled when value === min

Value display:
  font-family:          Space Grotesk
  font-size:            56px
  font-weight:          700
  color:                #F0F4F0
  font-variant-numeric: tabular-nums

Plus button:
  Same as minus button
  disabled when value === max

Active state on both buttons:
  background: #2A362A
  transition: 80ms
```

---

## 18. SaleConfirmButton

**File:** `src/components/sales/SaleConfirmButton.tsx`

**Purpose:** Fixed bottom confirm button on the staff sale screen. Shows the total amount.

### Props

```typescript
interface SaleConfirmButtonProps {
  total: number        // in Naira
  loading?: boolean
  disabled?: boolean
  onClick: () => void
}
```

### Visual Specification

```
Position:  fixed, bottom 0, left 0, right 0
Container: padding 16px, gradient fade up (transparent → #0A0F0A over 40%)

Button:
  width:         100%
  height:        64px
  background:    #00C853
  color:         #000000
  font-family:   Space Grotesk
  font-size:     18px
  font-weight:   700
  border-radius: 20px
  box-shadow:    0 8px 32px rgba(0, 200, 83, 0.3)
  text:          "Confirm — {formatNaira(total)}"

  disabled (total === 0): opacity 0.4
  active: scale(0.98), transition 80ms
  loading: replace text with Spinner (white)
```

---

## 19. UndoButton

**File:** `src/components/sales/UndoButton.tsx`

**Purpose:** Appears in the staff screen header for 5 minutes after a sale. Shows countdown.

### Props

```typescript
interface UndoButtonProps {
  secondsRemaining: number
  onClick: () => void
}
```

### Behavior

```
Visible when: secondsRemaining > 0
Hidden when: secondsRemaining === 0

Countdown display:
  Format: M:SS (e.g. "4:59", "0:23")
  Math:   minutes = Math.floor(seconds / 60)
          secs    = seconds % 60
          display = `${minutes}:${String(secs).padStart(2, '0')}`
```

### Visual Specification

```
Container:
  display:       flex
  align-items:   center
  gap:           8px
  background:    #1A221A
  border:        1px solid #2A362A
  border-radius: 16px
  padding:       8px 14px
  cursor:        pointer

  active: scale(0.96)

Icon: ↩ (Unicode, 18px) or RotateCcw from Lucide (16px), color #F0F4F0

Timer:
  font-size:            13px
  font-weight:          500
  color:                #F0F4F0
  font-variant-numeric: tabular-nums

When < 60 seconds remaining:
  color of timer: #FFB300 (urgency signal)
```

---

## 20. ProductList

**File:** `src/components/inventory/ProductList.tsx`

**Purpose:** Owner's full product list with stock counts, search, and management actions.

### Props

```typescript
interface ProductListProps {
  products: Product[]
  onEdit: (product: Product) => void
  onAdjustStock: (product: Product) => void
  onDeactivate: (productId: string) => void
  loading?: boolean
}
```

### Behavior

```
Search: client-side filter on product.name
  - Case-insensitive substring match
  - Updates instantly as user types

Sort: alphabetical by name (default, server-side)
```

### Visual Specification

```
Search bar (top):
  Input component, placeholder "Search products…", full width

Product rows:
  For each product → <ProductListItem />

Empty after search:
  "No products match '{query}'" — centered, #8A9E8A
```

---

## 21. ProductListItem

**File:** `src/components/inventory/ProductListItem.tsx`

**Purpose:** Single row in the inventory product list.

### Props

```typescript
interface ProductListItemProps {
  product: Product
  onEdit: () => void
  onAdjustStock: () => void
  onDeactivate: () => void
}
```

### Visual Specification

```
Row container:
  display:      flex
  align-items:  center
  padding:      16px 20px
  border-bottom: 1px solid #1A221A
  (last item: no border)

Left section (flex-1):
  Product name: 14px, #F0F4F0, 500
  Selling price: 13px, #00C853, tabular-nums

Stock section (center):
  Stock quantity display:
    > threshold:   "{qty} in stock" — 13px, #8A9E8A
    ≤ threshold:   "{qty} in stock" — 13px, #FFB300  + badge amber "Low"
    === 0:         "Out of stock"   — 13px, #FF3D3D   + badge red "Out"

Actions (right, icon buttons):
  Edit:     Pencil icon, 16px, #8A9E8A, hover #F0F4F0
  Adjust:   Plus icon, 16px, #8A9E8A, hover #00C853
  Delete:   Trash icon, 16px, #8A9E8A, hover #FF3D3D
  Gap:      12px between icons
```

---

## 22. AddProductForm

**File:** `src/components/inventory/AddProductForm.tsx`

**Purpose:** Slide-in form to add a new product. Appears as an overlay panel from the bottom on mobile, a side panel on desktop.

### Props

```typescript
interface AddProductFormProps {
  businessId: string
  onSuccess: (product: Product) => void
  onClose: () => void
}
```

### Fields

```
1. Product Name          required    Input type text
2. Selling Price (₦)     required    Input type number, prefix "₦"
3. Cost Price (₦)        optional    Input type number, prefix "₦"
4. Opening Stock         required    Input type number, default 0
5. Low Stock Alert at    optional    Input type number, default 5
```

### Validation

```
Product name:    non-empty string
Selling price:   > 0
Cost price:      ≥ 0 if provided
Opening stock:   ≥ 0
Low stock alert: ≥ 0 if provided
```

### Behavior

```
On submit:
  1. Validate all fields
  2. Show loading state on button
  3. supabase.from('products').insert({...})
  4. On success: toast.success("{name} added"), call onSuccess(product), close form
  5. On error: toast.error("Could not add product"), keep form open
```

### Visual Specification

```
Panel:
  background:    #111711
  border-top:    1px solid #2A362A (mobile) / border-left (desktop)
  border-radius: 24px 24px 0 0 (mobile) / 0 (desktop)
  padding:       24px

Header:
  "Add Product" — Space Grotesk, 18px, 700
  × close button — ghost, top right

Fields: stacked with 16px gap

Submit button: "Add Product" — primary, full-width, lg size
```

---

## 23. StockAdjuster

**File:** `src/components/inventory/StockAdjuster.tsx`

**Purpose:** Inline form to manually adjust stock count for a product (stocktake).

### Props

```typescript
interface StockAdjusterProps {
  product: Product
  onSuccess: (newQty: number) => void
  onClose: () => void
}
```

### Visual Specification

```
Appears as a small modal card overlaying the product row

Header:
  "Adjust Stock — {product.name}"

Current stock display:
  "Current: {stock_qty} units"

Adjustment input:
  Label: "New quantity"
  Type: number, min 0

Buttons:
  "Cancel" — ghost
  "Update" — primary
```

---

## 24. DebtList

**File:** `src/components/debts/DebtList.tsx`

**Purpose:** Full list of active debts with summary total at top.

### Props

```typescript
interface DebtListProps {
  debts: Debt[]
  staffId: string
  onDebtUpdated: () => void
  loading?: boolean
}
```

### Visual Specification

```
Summary bar (top):
  "Total outstanding: {formatNaira(totalOutstanding)}"
  font-size:   24px, Space Grotesk, 700, color #FFB300
  margin-bottom: 20px

Debt cards:
  For each debt → <DebtCard />

Empty state:
  <EmptyState
    icon={<CheckCircle />}
    title="No outstanding debts"
    description="Log a debt when a customer buys on credit."
  />
```

---

## 25. DebtCard

**File:** `src/components/debts/DebtCard.tsx`

**Purpose:** Individual debt record with inline payment recording.

### Props

```typescript
interface DebtCardProps {
  debt: Debt
  staffId: string
  onUpdated: () => void
}
```

### States

```
collapsed: shows summary only
expanded:  shows payment history + record payment form
```

### Visual Specification

```
Card container:
  Card component (md padding)
  margin-bottom: 10px

Header (always visible):
  Left:
    Customer name — 15px, #F0F4F0, 600
    Phone (if set) — 12px, #8A9E8A
  Right:
    Status badge: Badge component
      unpaid:  red
      partial: amber
      paid:    green

Balance row:
  "Owed: {formatNaira(amount_owed)}"   — 13px, #FF3D3D
  "Paid: {formatNaira(amount_paid)}"   — 13px, #00C853
  "Balance: {formatNaira(balance)}"    — 14px, #FFB300, 600, tabular-nums

Toggle: "Record Payment ↓" / "Hide ↑"
  12px, #8A9E8A, ghost button

Expanded:
  Payment history list:
    Each payment: "{formatNaira(amount)} on {formatted date}" — 12px, #8A9E8A

  Record payment form:
    Input: "Amount (₦)" with prefix "₦"
    Button: "Record Payment" — primary, full-width
```

---

## 26. AddDebtForm

**File:** `src/components/debts/AddDebtForm.tsx`

**Purpose:** Form to log a new customer debt.

### Props

```typescript
interface AddDebtFormProps {
  businessId: string
  staffId: string
  onSuccess: () => void
  onClose: () => void
}
```

### Fields

```
1. Customer Name     required    Input text
2. Phone Number      optional    Input tel
3. Amount Owed (₦)  required    Input number, prefix "₦", min 1
```

---

## 27. RecordPaymentForm

**File:** `src/components/debts/RecordPaymentForm.tsx`

**Purpose:** Inline form within DebtCard to record a payment.

### Props

```typescript
interface RecordPaymentFormProps {
  debt: Debt
  staffId: string
  onSuccess: (updatedDebt: Debt) => void
}
```

### Behavior

```
On submit:
  newAmountPaid = debt.amount_paid + payment
  newStatus     = newAmountPaid >= debt.amount_owed ? 'paid'
                : newAmountPaid > 0 ? 'partial'
                : 'unpaid'

  1. supabase.from('debts').update({ amount_paid: newAmountPaid, status: newStatus })
  2. supabase.from('debt_payments').insert({ debt_id, amount, recorded_by: staffId })
  3. On success: toast.success('Payment recorded'), call onSuccess
```

### Validation

```
Amount: > 0 and ≤ (amount_owed - amount_paid)
If amount > balance: show error "Amount exceeds remaining balance of {formatNaira(balance)}"
```

---

## 28. StaffList

**File:** `src/components/staff/StaffList.tsx`

**Purpose:** Owner's view of all staff members with management actions.

### Props

```typescript
interface StaffListProps {
  staff: StaffMember[]
  currentUserId: string       // to prevent owner deactivating themselves
  onDeactivate: (staffId: string) => void
  loading?: boolean
}
```

---

## 29. StaffListItem

**File:** `src/components/staff/StaffListItem.tsx`

**Purpose:** Single staff row in the staff management page.

### Props

```typescript
interface StaffListItemProps {
  member: StaffMember
  isCurrentUser: boolean
  onDeactivate: () => void
}
```

### Visual Specification

```
Row:
  display:  flex, align-items center
  padding:  14px 20px
  border-bottom: 1px solid #1A221A

Avatar:
  width:         40px
  height:        40px
  border-radius: 50%
  background:    #1A221A
  display:       flex, center
  font-family:   Space Grotesk
  font-size:     14px
  font-weight:   700
  color:         #8A9E8A
  content:       first letter of name (uppercase)

Info (margin-left 12px):
  Name:     14px, #F0F4F0, 500
  Joined:   12px, #4A5E4A, "Joined {formatDistanceToNow(joined_at)} ago"

Badges (right side):
  Role:   Badge gray "Staff" / Badge green "Owner"
  Status: Badge green "Active" / Badge red "Inactive"

Deactivate button (right, only for non-owner, non-current-user):
  Trash icon, 16px, hover color #FF3D3D
  Confirmation required before action (inline expand, not modal)
```

---

## 30. InviteForm

**File:** `src/components/staff/InviteForm.tsx`

**Purpose:** Form to generate a staff invite link.

### Props

```typescript
interface InviteFormProps {
  businessId: string
  onLinkGenerated: (link: string, staffName: string) => void
}
```

### Fields

```
1. Staff Name        required    Input text, placeholder "e.g. Aisha"
2. Phone Number      required    Input tel, placeholder "08012345678"
```

### Behavior

```
On submit:
  POST /api/invite/create with { business_id, staff_name, staff_phone }
  On success: call onLinkGenerated(data.link, staffName)
  On error: toast.error("Could not generate invite. Try again.")
```

---

## 31. InviteLinkCard

**File:** `src/components/staff/InviteLinkCard.tsx`

**Purpose:** Displays the generated invite link with a copy button.

### Props

```typescript
interface InviteLinkCardProps {
  link: string
  staffName: string
  onGenerateAnother: () => void
}
```

### Visual Specification

```
Card:
  background: rgba(0,200,83,0.05)
  border: 1px solid rgba(0,200,83,0.2)
  border-radius: 16px
  padding: 20px

Label: "Invite link for {staffName}:"
  12px, #8A9E8A

Link text:
  font-family: monospace
  font-size:   12px
  color:       #00C853
  word-break:  break-all
  margin:      8px 0

Copy button: "Copy Link"
  secondary variant, full-width

Instruction:
  "Send this to {staffName} over WhatsApp or SMS"
  11px, #8A9E8A, text-center

Generate another:
  ghost button, "← Invite another staff member"
```

---

## 32. OwnerSidebar

**File:** `src/app/(owner)/layout.tsx` (inline, not a separate component file)

**Purpose:** Desktop navigation sidebar. Hidden on mobile.

### Navigation Items

```typescript
const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/inventory',  icon: Package,         label: 'Inventory'  },
  { href: '/debts',      icon: CreditCard,       label: 'Debts'      },
  { href: '/staff',      icon: Users,            label: 'Staff'       },
  { href: '/reports',    icon: BarChart3,        label: 'Reports'     },
]
```

### Visual Specification

```
Sidebar:
  width:       260px
  height:      100vh
  position:    fixed
  background:  #111711
  border-right: 1px solid #2A362A
  padding:     20px 16px

Logo block (top):
  Logo mark: 34px × 34px, #00C853 background, "M" in black, rounded-xl
  "MyDailySales" — Space Grotesk, 15px, 600

Nav items:
  padding:      8px 10px
  border-radius: 8px
  font-size:    13px
  icon-size:    18px
  gap:          10px
  margin-bottom: 1px
  color:        #8A9E8A

  active:
    background: rgba(0,200,83,0.12)
    color:      #00C853

  hover (inactive):
    background: #1A221A
    color:      #F0F4F0

Logout (bottom):
  LogOut icon, "Sign out" — ghost variant, full width
  color: #8A9E8A, hover color #FF3D3D
```

---

## 33. BottomNav

**File:** `src/app/(owner)/layout.tsx` (inline)

**Purpose:** Mobile navigation bar. Hidden on desktop (lg breakpoint).

### Visual Specification

```
Container:
  position:    fixed
  bottom:      0, left 0, right 0
  background:  #111711
  border-top:  1px solid #2A362A
  display:     flex
  padding-bottom: env(safe-area-inset-bottom)   ← critical for iPhone home indicator

Each item:
  flex:        1
  display:     flex, flex-direction column, align-items center
  padding:     10px 0
  gap:         3px
  font-size:   11px
  transition:  color 150ms

  active:      color #00C853
  inactive:    color #4A5E4A
  icon-size:   20px
```

---

## 34. PageHeader

**File:** `src/components/ui/PageHeader.tsx`

**Purpose:** Consistent page header used at the top of every owner page.

### Props

```typescript
interface PageHeaderProps {
  title: string
  subtitle?: string              // e.g. today's date on dashboard
  action?: {
    label: string
    onClick: () => void
    icon?: React.ReactNode
  }
}
```

### Visual Specification

```
Container:
  margin-bottom: 24px

Subtitle (if provided):
  font-size:   13px
  color:       #8A9E8A
  margin-bottom: 2px

Title:
  font-family: Space Grotesk
  font-size:   24px
  font-weight: 700
  color:       #F0F4F0

Action button (if provided):
  Button component, primary variant, sm size
  Positioned: flex row, space-between with title
  Icon (if provided): shown left of label text, 16px
```

---

## Component Checklist

Before marking any component complete, verify:

```
☐ Uses design tokens — no hardcoded hex values outside the defined palette
☐ All money values use color #00C853 and font-variant-numeric: tabular-nums
☐ Uses cn() for all className composition
☐ Loading state implemented (Skeleton or Spinner as appropriate)
☐ Empty state implemented where applicable
☐ Error state implemented where applicable
☐ Works on mobile (minimum tap target 44px × 44px)
☐ Active/press feedback on all interactive elements (scale(0.96-0.98))
☐ No white backgrounds anywhere
☐ TypeScript — no `any` types unless joining Supabase query results
☐ Prop types exported alongside component
```

---

*MyDailySales Component Specification v1.0 · June 2026 · Internal Use Only*
*This document is authoritative. Implementation guide code is illustrative. This spec wins on conflicts.*
