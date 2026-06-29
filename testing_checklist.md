# MyDailySales — Comprehensive Testing & Verification Checklist
*Definitive Guide for Complete App Validation · June 2026*

This guide details everything you need to test to ensure that the **MyDailySales** PWA is functioning perfectly. It covers all features, user roles, API endpoints, and database side-effects.

---

## Table of Contents
1. [Authentication & Route Guarding](#1-authentication--route-guarding)
2. [Owner Onboarding Flow](#2-owner-onboarding-flow)
3. [Staff Invite & Pin Setup Flow](#3-staff-invite--pin-setup-flow)
4. [Staff Flow: Sale Logging (`/log-sale`)](#4-staff-flow-sale-logging-log-sale)
5. [Owner Flow: Dashboard & Realtime Feed (`/dashboard`)](#5-owner-flow-dashboard--realtime-feed-dashboard)
6. [Owner Flow: Inventory Management (`/inventory`)](#6-owner-flow-inventory-management-inventory)
7. [Owner Flow: Debt Ledger (`/debts`)](#7-owner-flow-debt-ledger-debts)
8. [Owner Flow: Performance Reports (`/reports`)](#8-owner-flow-performance-reports-reports)
9. [Daily Summaries & PWA Push Notifications](#9-daily-summaries--pwa-push-notifications)
10. [Monetization, Trial Gating & Paystack Integration](#10-monetization-trial-gating--paystack-integration)
11. [Resilience & UI/UX States](#11-resilience--uiux-states)

---

## 1. Authentication & Route Guarding

Verify that roles are isolated and secure, and sessions are properly retained.

### 1.1 Owner Signup & Login
* **Test Steps:**
  1. Go to `/signup`. Register a new owner using a phone number.
  2. Input the SMS OTP received.
  3. Verify that you are redirected to `/onboarding`.
  4. Log out, go to `/login`, and sign back in using the phone number and OTP.
* **Expected Result:**
  * User logs in successfully and receives an active Supabase session.
  * Session persists for **30 days** so they do not have to log in repeatedly.

### 1.2 Route Guards & Middlewares
* **Test Steps:**
  1. Attempt to access `/dashboard` or `/log-sale` as an unauthenticated (logged-out) user.
  2. Log in as a **Staff Member** and attempt to access owner paths: `/dashboard`, `/inventory`, `/debts`, `/staff`, `/reports`, `/billing`.
  3. Log in as an **Owner** and attempt to access `/onboarding` or `/login`.
* **Expected Result:**
  * Logged-out users are redirected to `/login`.
  * Staff members trying to access owner pages are immediately redirected to `/log-sale`.
  * Already onboarded users trying to access `/onboarding` or `/login` are automatically redirected to their respective dashboards (`/log-sale` for staff, `/dashboard` for owners).

---

## 2. Owner Onboarding Flow

Validate the step-by-step setup wizard for new owners.

### 2.1 Standard 5-Step Flow
* **Test Steps:**
  1. Create a new account and enter `/onboarding`.
  2. **Step 1 (Business):** Input a Business Name (e.g., "Lagos Styles Boutique") and optional phone. Click *Continue*.
  3. **Step 2 (Products):** Verify that the button is disabled until at least one product with a Name, Selling Price, and Stock Quantity is added. Add a product and save.
  4. **Step 3 (Staff):** Enter a Staff Name and Phone. Click *Generate Invite Link*. Verify the copyable link is generated. Click *Skip/Continue*.
  5. **Step 4 (Notifications):** Tap *Enable Daily Summaries*. (If testing on an iOS device in Safari, check that it warns you to install the app to the Home Screen first).
  6. **Step 5 (Done):** Verify that clicking *Open Dashboard* redirects you to the `/dashboard`.
* **Expected Result:**
  * Successful creation of entries in the `businesses` and `staff_members` (role = `'owner'`) tables in Supabase.
  * The products inputted are inserted into the `products` table.
  * Storing of the push subscription details (if permission was granted) in the `push_subscriptions` table.

### 2.2 Auto-populate Demo Data
* **Test Steps:**
  1. On Step 1 of onboarding, click **Auto-populate Demo Data ⚡**.
  2. Wait for loading spinner to resolve.
* **Expected Result:**
  * Directly redirects you to `/dashboard`.
  * **Database Validation:** Verify that a demo business, a demo staff member ("Aisha (Demo Staff)"), 5 demo products, 3 mock sales, and 2 mock debts have been inserted under your new business ID.

---

## 3. Staff Invite & Pin Setup Flow

Verify staff generation links and enrollment functionality.

### 3.1 Invite Generation
* **Test Steps:**
  1. As an Owner, navigate to `/staff`. Click *Invite Staff*.
  2. Enter a Name and Phone Number. Tap *Create Invite Link*.
  3. Click *Copy Link*.
* **Expected Result:**
  * An entry is created in the `pending_invites` table.
  * The link format is: `https://[domain]/invite/[token]`.

### 3.2 Invite Acceptance
* **Test Steps:**
  1. Open the copied invite link in a new, unauthenticated session (e.g., in an Incognito window).
  2. Verify that it displays the correct Business Name and Staff Name. Click *Continue*.
  3. **OTP Verification:** Enter the verification code sent to the phone number.
  4. **PIN Setup:** Set and confirm a 4-digit PIN (e.g., `1234`).
  5. Submit the form.
* **Expected Result:**
  * Staff is redirected to the `/log-sale` logging screen.
  * **Database Validation:** The `pending_invites` record is deleted. A new row in `staff_members` is created with role = `'staff'` and the corresponding `user_id` from Supabase Auth. The 4-digit PIN is stored securely in the user's metadata.

### 3.3 Staff Status Toggles
* **Test Steps:**
  1. As an Owner, navigate to `/staff`.
  2. Click *Deactivate* next to the newly created staff member. Confirm the prompt.
  3. As the deactivated Staff, attempt to log in or access `/log-sale`.
  4. Reactivate the staff from the owner page and try accessing `/log-sale` again.
* **Expected Result:**
  * Owner sees status badge update from `Active` to `Inactive` dynamically.
  * Deactivated staff members are blocked from logging sales or maintaining an active session.
  * Owners are blocked from deactivating *themselves* (self-deactivation prevention).

---

## 4. Staff Flow: Sale Logging (`/log-sale`)

Test the core high-frequency logging interface.

### 4.1 Product Grid, Search & Quantities
* **Test Steps:**
  1. Navigate to `/log-sale`. Check the product grid and search bar.
  2. Type 1 or 2 letters in the search bar. Verify the list is NOT filtered yet.
  3. Type the 3rd letter of a product name (e.g. "Sil" for "Silk Dress"). Verify the product grid instantly filters to only show matching products.
  4. Type a non-existent name (e.g. "XYZ") and verify a "No matching products found." empty state is rendered.
  5. Clear the search bar and verify that all products are displayed again.
  6. Select an in-stock product. Verify the search bar clears automatically upon selection.
  7. Adjust quantity using the `+` and `−` buttons.
  8. Change the "Price Each" field to offer a custom discount.
  9. Review the "Total" display at the bottom.
* **Expected Result:**
  * Out-of-stock products are greyed out, display an "Out of stock" warning, and are not selectable.
  * Stock quantities at or below their low-stock thresholds show a warning badge (e.g., orange "X left").
  * Total updates instantly as quantity or price changes.
  * Search bar filters dynamically when 3 or more characters are entered.

### 4.2 Sale Confirmation
* **Test Steps:**
  1. Set a quantity of `2` for a product and tap *Confirm*.
  2. Verify the toast notification appears (e.g., "Sold 2 Garri 1kg — ₦3,000").
  3. Observe that your "Today's Total" updates immediately at the top of `/log-sale`.
* **Expected Result:**
  * **Database Validation:**
    * A new entry is added to the `sales` table.
    * The product's `stock_qty` in the `products` table decrements by 2.
    * An audit trail entry in `stock_movements` table is created with `movement_type = 'sale'` referencing the transaction.

### 4.3 5-Minute Undo Window
* **Test Steps:**
  1. Immediately after logging the sale in 4.2, check for the undo button (`↩ M:SS`) at the top right.
  2. Let the timer count down. Verify it disappears after exactly 5 minutes (300 seconds).
  3. Log a new sale. Tap the undo button before the 5 minutes expire.
* **Expected Result:**
  * The logged sale is reversed.
  * The staff member's "Today's Total" decrements by the amount of the undone sale.
  * **Database Validation:**
    * The sale row in `sales` has `is_undone` set to `true` and `undone_at` populated.
    * The product's `stock_qty` increments back to its original state.
    * A new `stock_movements` record of type `'restock'` is created to audit the undo action.

---

## 5. Owner Flow: Dashboard & Realtime Feed (`/dashboard`)

Validate the real-time manager command center.

### 5.1 Metrics Consistency
* **Test Steps:**
  1. Open `/dashboard` on an owner account.
  2. Log a new sale on `/log-sale` as a staff member (in a separate browser or device).
  3. Check the dashboard metrics.
* **Expected Result:**
  * **Revenue Today** increases by the sale amount.
  * **Sales Count** increments by 1.
  * **Low Stock** count updates if the sale pushed a product's stock below its threshold.

### 5.2 Realtime Sales Feed
* **Test Steps:**
  1. Watch the *Live Sales Feed* panel on the dashboard.
  2. Log a sale as a staff member.
* **Expected Result:**
  * The new sale pops up at the top of the feed within **2 seconds** without page refreshes.
  * The feed displays: Product name, quantity sold, staff member name, time elapsed (e.g., "just now" / "1 minute ago"), and total transaction cost.
  * A pulsing green dot is visible showing the connection is "Live".

### 5.3 Low Stock Alert Banner
* **Test Steps:**
  1. Adjust a product's stock so that it is less than or equal to its threshold (typically `5`).
  2. Check the dashboard.
* **Expected Result:**
  * A warning panel "⚠ Low Stock Alert" appears highlighting the exact product and amount left.
  * If no products are low on stock, the banner disappears.

---

## 6. Owner Flow: Inventory Management (`/inventory`)

Test product CRUD actions, search, and stocktake controls.

### 6.1 Add Product Drawer
* **Test Steps:**
  1. Go to `/inventory`. Tap *Add Product*.
  2. Fill in: Name, Selling Price, Cost Price (optional), Opening Stock, and Low Stock Alert threshold.
  3. Tap *Add Product*.
* **Expected Result:**
  * The drawer slides in smoothly from the right with a blur background.
  * The new product is added to the list in alphabetical order.
  * **Database Validation:** Inserts product row. If opening stock > 0, inserts a `stock_movements` record with `movement_type = 'restock'`.

### 6.2 Search & Inline Adjustments
* **Test Steps:**
  1. Type in the search bar.
  2. Tap the `+` and `−` buttons next to a product's stock count.
* **Expected Result:**
  * Products filter instantly.
  * Stock updates inline.
  * **Database Validation:** The product's `stock_qty` updates, and a `stock_movements` audit record is added (`movement_type = 'restock'` for additions, `'adjustment'` for subtractions).

### 6.3 Soft Delete
* **Test Steps:**
  1. Click the trash icon next to a product. Accept the confirmation prompt.
* **Expected Result:**
  * The product disappears from the inventory list and the staff logging grid.
  * **Database Validation:** The product's `is_active` status is updated to `false` (never hard-deleted, maintaining sales reporting history).

### 6.4 Log Sale Quick Link
* **Test Steps:**
  1. Go to `/inventory`. Look at the product cards.
  2. Verify that there is a **Log Sale** link next to the trash/delete icon on each in-stock product.
  3. Click **Log Sale** on a product card.
  4. Verify that you are redirected to `/log-sale` and that the product is immediately selected, with the quantity/price selection screen displayed.
  5. Check a product that has `0` stock. Verify that the **Log Sale** link is disabled and unclickable.
* **Expected Result:**
  * Owners can quickly log a sale directly starting from their inventory page by clicking the shortcut, which pre-populates `/log-sale` with the selected `productId` query param.

---

## 7. Owner Flow: Debt Ledger (`/debts`)

Validate customer outstanding credits and tracking of partial payments.

### 7.1 Log a New Debt
* **Test Steps:**
  1. Go to `/debts`. Click *Log Debt*.
  2. Enter Customer Name, Phone (optional), and Amount Owed. Submit.
* **Expected Result:**
  * Debt is listed at the top of the ledger with the status `Unpaid`.
  * **Total Outstanding Debt** metric at the top of the page updates.
  * **Database Validation:** Inserts row in `debts` table with `status = 'unpaid'`.

### 7.2 Record Partial Payment (Inline)
* **Test Steps:**
  1. Tap *Pay* on an unpaid debt item.
  2. Enter a payment amount less than the total outstanding balance. Submit.
* **Expected Result:**
  * The form expands inline directly beneath the debt card.
  * The item status updates to `Partial` (amber badge).
  * The remaining outstanding balance is adjusted.
  * **Database Validation:**
    * Updates `amount_paid` and sets `status = 'partial'` in the `debts` table.
    * Inserts a record in the `debt_payments` table auditing the paid amount.

### 7.3 Fully Resolve Debt
* **Test Steps:**
  1. Tap *Pay* on the partially paid debt.
  2. Input the exact remaining balance. Submit.
  3. Try inputting a value *higher* than the remaining balance.
* **Expected Result:**
  * Inputting a value higher than the remaining balance blocks submission and fires an error toast.
  * Inputting the exact remaining balance resolves the debt: the item disappears from the active list.
  * **Database Validation:** Sets `status = 'paid'` and matches `amount_paid = amount_owed`.

---

## 8. Owner Flow: Performance Reports (`/reports`)

Validate analytical aggregation, filters, and charts.

### 8.1 Date Ranges & Charts
* **Test Steps:**
  1. Navigate to `/reports`.
  2. Toggle between date ranges: `This Week`, `Last Week`, and `This Month`.
* **Expected Result:**
  * The Bar Chart updates dynamically to show correct daily revenue intervals.
  * Axis labels format correctly (daily abbreviation for weeks, day of month for monthly view).
  * Hovering over the bars displays correct Naira amounts in the tooltip.

### 8.2 Top Products
* **Test Steps:**
  1. Review the *Top 5 Products* widget.
  2. Log a high-volume sale of a specific product, then reload reports.
* **Expected Result:**
  * Lists the top selling items ordered by total revenue.
  * Title header updates dynamically based on the selected date filter.

### 8.3 Week-over-Week Staff Performance
* **Test Steps:**
  1. Review the *Staff Performance (This Week vs Last Week)* list.
* **Expected Result:**
  * Shows each staff member's total sales for the current week compared to the previous week.
  * Displays Naira difference and trend percentage with styling (green `▲` for positive growth, red `▼` for negative performance, gray `—` for no change).

---

## 9. Daily Summaries & PWA Push Notifications

Verify service worker registration, push permissions, and cron processing.

### 9.1 Service Worker & PWA Setup
* **Test Steps:**
  1. Open Chrome DevTools (`F12`), go to the *Application* tab, and click *Service Workers*.
  2. Look for `sw.js` and verify it is registered and active.
  3. Verify the PWA installation icon is present in the browser URL bar.
* **Expected Result:**
  * Service worker is registered.
  * PWA can be installed on desktop, Android, and iOS devices.

### 9.2 Daily Summary CRON Verification
* **Test Steps:**
  1. Log a few sales for today to ensure there is data to summarize.
  2. Manually trigger the cron endpoint with a POST/GET request. In PowerShell/terminal:
     ```bash
     curl -H "Authorization: Bearer <your_cron_secret>" https://[your-domain]/api/cron/daily-summary
     ```
  3. Test triggering the endpoint *without* the Bearer token or with an incorrect secret.
* **Expected Result:**
  * Requests without a valid secret header return a `401 Unauthorized` response.
  * Valid requests trigger the Web Push sequence and return JSON: `{ "sent": X, "skipped": Y }`.
  * Owners with active push subscriptions receive a summary notification on their device:
    * **Format:** `[Business Name] — Daily Summary: ₦[Total Revenue] from [Count] sales. [Staff Breakdown] [Low Stock Count]. Tap to view.`
  * Tapping the notification opens the PWA and redirects to `/dashboard`.
  * Dead or expired device subscriptions (e.g. status 404 or 410) are automatically cleaned up and removed from the `push_subscriptions` database table.

---

## 10. Monetization, Trial Gating & Paystack Integration

Validate pricing limits, trial expiry behaviors, and payment validation.

### 10.1 Trial Expiration Paywall
* **Test Steps:**
  1. Locate your business in the `businesses` table in Supabase.
  2. Update `subscription_status` to `'trial'` and `trial_ends_at` to a past timestamp (e.g., 2 days ago).
  3. As the Owner, attempt to access `/dashboard`.
  4. As a Staff member, attempt to access `/log-sale` and log a sale.
* **Expected Result:**
  * Owner is blocked from the dashboard and sees the **Subscription Expired** paywall, which redirects them to `/billing`.
  * Staff members can still log sales. Shop operations are **never** blocked by billing expiration.

### 10.2 Paystack Checkout Popup
* **Test Steps:**
  1. As an Owner on the paywall screen, click *Choose a Plan* or go to `/billing`.
  2. Select the *Business Plan* (₦8,000) or *Growth Plan* (₦15,000).
  3. Verify the Paystack Checkout iframe overlay opens.
  4. Perform a successful payment using Paystack's test card details.
* **Expected Result:**
  * Paystack popup processes the transaction.
  * Upon checkout success, the app calls `/api/paystack/verify` with the transaction reference.
  * User is redirected back to the unlocked `/dashboard` with a success toast.

### 10.3 Webhook Verification
* **Test Steps:**
  1. Trigger a Paystack test webhook payload mimicking `subscription.create` or `charge.success` using a tool like Postman or curl.
  2. Send it to `/api/paystack/webhook`.
  3. Verify the signature check fails if the payload doesn't contain a valid `x-paystack-signature` header matching your `PAYSTACK_SECRET_KEY` hash.
* **Expected Result:**
  * Unsigned or invalid requests return a `401 Unauthorized` response.
  * Valid webhook events successfully match the user email (or phone fallback e.g. `23480...` to `phone@mydailysales.com`) to the correct business, and update `subscription_status` to `'active'` in the background.

---

## 11. Resilience & UI/UX States

Verify visual styling and fault-tolerance across the app.

### 11.1 Loading Skeletons
* **Test Steps:**
  1. Simulate a slow network connection in Chrome DevTools (Network tab -> change from "No throttling" to "Slow 3G").
  2. Navigate between pages (Inventory, Debts, Reports, Sales Feed).
* **Expected Result:**
  * Content cards display matching, animated skeleton loading placeholders. There are no sudden layout shifts or raw unstyled text flashes.

### 11.2 Empty States
* **Test Steps:**
  1. Log in to an account that has no products, sales, or outstanding debts.
* **Expected Result:**
  * Inventory displays: "No products found. Add your first product."
  * Sales Feed displays: "No sales logged today yet."
  * Debt Ledger displays: "✅ Excellent! No outstanding debts."
  * Reports show: "No sales logged in this range."

### 11.3 Error Boundaries
* **Test Steps:**
  1. Block network access or disconnect internet.
  2. Open a page or click a CRUD action.
* **Expected Result:**
  * A clear error card is displayed: "Something went wrong. Tap to retry."
  * Clicking the *Retry* button attempts to reload the data connection.

---

## 12. Security & Session Management (Sign Out)

Test navigation layouts, 5-item mobile bottom nav constraints, and Sign Out functionality.

### 12.1 Owner Sign Out (Desktop)
* **Test Steps:**
  1. Navigate to `/dashboard` on desktop.
  2. Scroll to the bottom of the left sidebar.
  3. Verify the **Sign Out** button is styled with text color `#8A9E8A`, and turns red (`#FF3D3D`) with a faint red background on hover.
  4. Click the button.
* **Expected Result:**
  * Displays a success toast: *"Signed out successfully"*.
  * Redirects immediately to `/login`.
  * Session is destroyed.

### 12.2 Owner Sign Out & Nav Layout (Mobile)
* **Test Steps:**
  1. Resize browser to a mobile viewport (e.g., width under 1024px).
  2. Log in as an Owner.
  3. Look at the bottom navigation bar. Verify it contains exactly **5 items** (Dashboard, Log Sale, Inventory, Debts, Reports). The "Staff" item must be absent.
  4. Look at the top of the viewport. Verify the mobile header is visible, showing "MyDailySales" and a small **Sign Out** link on the right.
  5. Click **Sign Out** in the top header.
* **Expected Result:**
  * User is signed out and redirected to `/login`.

### 12.3 Contextual Staff Management Link (Mobile Dashboard)
* **Test Steps:**
  1. Resize browser to mobile preview and navigate to `/dashboard`.
  2. Locate the **Staff Today** card.
  3. Verify a small green **Manage Staff** link is displayed on the right of the title.
  4. Click the **Manage Staff** link.
* **Expected Result:**
  * Redirects successfully to `/staff` where the owner can manage staff details.

### 12.4 Staff Sign Out (Sales Terminal)
* **Test Steps:**
  1. Log in as a Staff Member.
  2. Verify you are redirected to the `/log-sale` terminal.
  3. Look at the top-right header area. Verify there is a **Sign Out** button (and NO "← Dashboard" link).
  4. Click the **Sign Out** button.
* **Expected Result:**
  * Session is destroyed, success toast is shown, and redirected to `/login`.
