# Bid Market: Design System and UX

Source of truth: PRD.md. This document overrides the prototype wherever they differ.

## 1. Visual direction

**Concept: the procurement ledger.** Bid Market should feel like a well-kept purchase register that has come to life. Figures and statuses lead. Decoration stays out of the way. The one expressive element is the auction stair, a stepped price line in marigold on deep green.

**Audience.** Purchase officers and sales staff who work with numbers all day, often on mid-range laptops and phones.

### Design principles

1. **The next action is obvious.** Every screen answers "what do I need to do now?"
2. **State is visible at a glance.** Use a status pill on every tender, order, product and account.
3. **Numbers are the interface.** Prices, quantities, fees and dates are never hidden behind a click when they drive a decision.
4. **Money and bids feel certain.** Show exactly what will be charged before charging. Never show a bid as placed until the server confirms it.
5. **Use plain procurement language.** Keep L1, tender, consignee and GSTIN because users know them. Explain them once where a new user first meets them.

### What to avoid

- Gradient heroes, glass effects, oversized illustrations and stock photos of handshakes
- Icon-title-text card grids used as filler
- Emoji as interface markers
- Unverifiable claims such as "India's No. 1"
- Hiding fees until checkout

## 2. Color

All colors are semantic tokens. Components never use raw values.

| Token | Light | Dark | Use |
|---|---|---|---|
| `bg` | #F7FAFC | #0E1720 | Page background |
| `surface` | #FFFFFF | #15212C | Panels, tables, inputs |
| `sunk` | #EAF2F7 | #1B2A38 | Table headers, thumbnails |
| `ink` | #12263A | #E6EEF5 | Primary text |
| `muted` | #54677A | #9DB0C2 | Secondary text |
| `line` | #DCE6EE | #2B3B4B | Borders and dividers |
| `brand` | #123F66 | #E6F3FB | Logo and logo name |
| `accent` | #0369A1 | #38BDF8 | Links, primary buttons, focus |
| `accent-ink` | #FFFFFF | #06202F | Text on accent |
| `band` | #E0F2FE | #0F2534 | Hero and footer |
| `band-2` | #FFFFFF | #16303F | Panels on band |
| `band-ink` | #12263A | #E6F3FB | Text on band |
| `band-muted` | #35566F | #A9C4D6 | Secondary text on band |
| `highlight` | #0369A1 | #38BDF8 | Live auction L1 and stair, one primary action on band |
| `ok` / `ok-bg` | #0B6B4E / #D9EFE4 | #4CC59A / #12352A | Completed, published, paid |
| `warn` / `warn-bg` | #8F4E05 / #FCEBC8 | #F2B84B / #3D2C0C | Needs action, pending, live |
| `bad` / `bad-bg` | #AE2A1F / #FBE4E0 | #F2938A / #401B18 | Rejected, blocked, errors |
| `info` / `info-bg` | #1B5786 / #DDEAF5 | #8CC4F0 / #12304A | Open, in progress, information |

**Rules**

- Highlight is reserved for live auction information and the single primary action on a band. The band is light in the light theme, so text on it uses `band-ink`.
- Status always pairs color with text. Color alone never carries meaning.
- Support light and dark themes, following the system setting, with a manual override in the profile.

**Logo.** A navy B with a white gavel cut out of it, beside the name "Bid Market" in the display face. The browser tab uses a simplified white B and thicker gavel on a navy square, because the full mark loses detail at 16 px. The logo uses no sky blue or amber.

## 3. Typography

| Role | Face | Fallback | Use |
|---|---|---|---|
| Display | Bricolage Grotesque, 700 to 800 | Trebuchet MS, system sans | Page titles and section headings only |
| Body | Instrument Sans, 400 to 700 | Segoe UI, system sans | All interface text |
| Data | IBM Plex Mono, 400 to 600 | Menlo, Consolas | Money, quantities, reference numbers, timers |

| Step | Size / line height | Use |
|---|---|---|
| Display | 32 to 51 px / 1.1 | Marketing hero only |
| H1 | 30 px / 1.15 | Page title |
| H2 | 23 to 31 px / 1.15 | Section title |
| H3 | 18 px / 1.25 | Panel title |
| Body | 16 px / 1.55 | Default |
| Small | 14 px / 1.45 | Tables on phones, helper text |
| Label | 12 px / 1.3, uppercase, 0.06em | Field and column labels |

**Rules**

- All aligning digits use tabular figures.
- Money displays as ₹1,25,000 using Indian digit grouping. Large values may add "₹1.25 lakh" beside the exact figure, never in place of it.
- Dates display as 4 Nov 2026. Times show in IST with "IST" on bid deadlines.
- Keep running text within about 65 characters per line.

## 4. Spacing and layout

- Base unit: 4 px. Use the scale 4, 8, 12, 16, 20, 24, 32, 40, 48.
- Content width: maximum 1180 px, with a side gutter of at least 16 px.
- Corner radius: 4 px for pills, 6 px for controls, 8 px for panels.
- Shadows: none by default. Use one soft shadow only for menus and dialogs.
- Separate rows with hairlines before reaching for cards. Panels mark distinct working objects.
- Reading pages use one column. Working pages use a main column plus a right action panel at about 3:2.

## 5. Reusable components

| Component | Rules |
|---|---|
| **Button** | Variants: primary, secondary, danger, highlight. Sizes: default, small. One primary button per view area. Labels state the outcome, such as "Pay ₹59 and place order". |
| **Status pill** | One mapping for the whole app. See section 5.1. |
| **Data table** | Sticky header on desktop. Right-align numbers. Becomes stacked rows on phones where more than 3 columns matter. |
| **Fact list** | Label over value, used for order and tender details. |
| **Action panel** | Right column on desktop, directly below the title on phones. Shows the current user's next action. |
| **Stepper** | Placed, Accepted, Dispatched, Completed. Shows dates when complete. |
| **Money summary** | Value, fee, GST and total, in that order. Appears before every payment. |
| **Live auction panel** | L1, your bid and rank, time left, connection state, price stair and bid input. |
| **Countdown** | Uses server time. Turns `warn` under 10 minutes and `bad` under 1 minute, with text unchanged in meaning. |
| **Product card** | Image, title, location, net price, MRP, discount. No seller name. |
| **Empty state** | One sentence on what belongs here and one action. |
| **Banner** | Page-level information, warning or block. |
| **Toast** | Confirms a completed action. Errors that need a fix stay inline. |
| **Dialog** | Only for irreversible confirmation. It names the consequence. |
| **File upload** | Shows accepted types and size, upload progress, replace and remove. |
| **Message thread** | Used by incidents and tickets. |

### 5.1 Status mapping

| Pill | Style |
|---|---|
| Draft, Unpublished | Neutral |
| Bidding open, Accepted, Dispatched | info |
| Pending, Notify, Under evaluation, Auction live, Awaiting seller, On hold | warn |
| Published, Paid, Completed, Active | ok |
| Rejected, Cancelled, Blocked, Suspended | bad |

## 6. Navigation and forms

### Navigation

- **Public header:** logo, search, Log in, Sign up. Second row: Categories, Products, Tenders, How it works, Fees, Support.
- **Signed-in desktop:** left sidebar with role-specific items.
- **Signed-in phone:** top bar with a menu.
- **Buyer:** Dashboard, Products, Tenders, Orders, Wallet, Incidents, Support.
- **Seller:** Dashboard, Tenders, Live auctions, Orders, Products, Wallet, Subscription, Incidents, Support.
- **Admin:** Overview, Verification, Catalogue, Tenders, Orders, Incidents, Tickets, Fees and limits, Audit log.
- Dashboards lead with "Needs your attention", sorted by deadline.
- Detail pages show a breadcrumb.

### Forms

- Labels sit above fields. Placeholders are examples only.
- Validate on blur and on submit. Show errors below the field, and focus the first one.
- Error messages say how to fix the problem.
- Long flows are split into saved steps.
- Enter PAN, GSTIN and IFSC in uppercase automatically.
- Show "Verified" beside a value once confirmed, with the legal name returned.
- Warn before a user leaves a form with unsaved changes.
- Fields that cannot be edited later say so before saving.

## 7. Loading, empty and error states

- **Lists:** skeleton rows that match the layout. Show them only after 200 ms of waiting.
- **Buttons:** show progress and block a second submit.
- **Empty:** PRD section 9 gives the wording intent.
- **Payment:** a dedicated confirming state that survives refresh.
- **Auction reconnecting:** a `warn` banner, disabled bid button and last update time.
- **Errors:** say what happened and what to do next, with a support reference for server errors.
- **403:** "You do not have access to this page." **404:** "We can't find this page." Each links to the dashboard.

## 8. Interactions and animation

- Keep animation short, 120 to 200 ms.
- The L1 figure fades once when it changes. The stair adds its new step without replaying.
- Do not animate page transitions or table rows.
- Honour reduced-motion settings by removing all non-essential animation.
- Bid submission flow: enter price, inline check against the decrement, submit, confirmed state with new rank.
- No sound in MVP.

## 9. Responsive behavior

| Width | Behavior |
|---|---|
| Below 640 px | One column. Action panel below the title. Tables become stacked rows. Filters open in a sheet. |
| 640 to 1023 px | Two-column catalogue. Top menu. |
| 1024 px and above | Sidebar in signed-in areas. Main column and action panel. |

- Support from 360 px wide.
- Touch targets are at least 44 px.
- The live auction bid control stays reachable on phones without scrolling past the price.
- Pages never scroll sideways. Only data tables that cannot stack may scroll within their own container.

## 10. Accessibility

WCAG 2.1 AA across core journeys.

- Text contrast of at least 4.5:1, and 3:1 for large text and control borders.
- Full keyboard use, with a visible focus ring in `accent`.
- Logical heading order and landmarks.
- Every field has a label, and errors link to fields.
- Announce live auction updates politely, at most once every 10 seconds. Announce outbid events immediately.
- Do not announce countdown ticks. Announce the final 5 minutes and the final minute.
- Stair charts include a text alternative.
- Document PDFs are tagged where the PDF tool allows it.

## 11. Page-level guidance

| Page | Layout |
|---|---|
| **Home** | Band hero with headline, two actions and an auction board. Then buying methods, open tenders, categories, popular products, order process. |
| **Product list** | Filters, result count, card grid. |
| **Product detail** | Main column has image and specifications. Action panel has price, stock, delivery states and actions. |
| **Tender list** | Tabs by method, then a table. |
| **Tender detail** | Summary pills and title, details and specifications at left, action panel at right. |
| **Live auction** | Action panel dominates. Full focus view with no marketing navigation. |
| **Order detail** | Stepper across the top, facts at left, action and incident panels at right. |
| **Dashboard** | Attention list first, key counts after. Count tiles appear only where they lead to action. |
| **Wallet** | Available, On hold and Paid, then ledger table. |
| **Admin queues** | Dense table with side panel for review. Actions need a recorded reason. |
| **Documents** | Paper-style page with reference number, parties, item table, and PDF download. |
| **Marketing pages** | One column, plain language, sparse imagery. Fees are published in full. |

**Home auction board.** Live prices are restricted by PRD section 6, so the public board must be a labelled illustration using example data. It must never show a real tender. The prototype shows live data here, and this rule replaces that behaviour.

## 12. Product content rules

- Write in the active voice. Use "Pay fee and publish", not "Submit".
- Use "L1" with a first-use explanation of "lowest valid price".
- Use "seller", never "vendor". Use "tender" for the overall process and "bid" for a price.
- Say what will happen before charging or penalising. For example, "Rejecting blocks your account for 30 days."
- Use real terms in the interface, never internal names.
