# Bid Market: Product Requirements Document

| | |
|---|---|
| **Status** | Draft. Companion documents use the section 14 recommendations as working defaults until you confirm or change them. D-6 and D-10 remain open. |
| **Version** | 0.2 |
| **Date** | 4 November 2026 |
| **Prototype** | Bid Market working prototype (browser-only, example data) |
| **Reference product** | PEM, pem.co.in, used for the business model only. Do not copy its name, logo, text, images or legal terms. |

**How to read this document.** `[ASSUMPTION]` marks something I inferred and you have not confirmed. `[D-n]` points to a decision in section 14 that needs your approval. Resolve the section 14 decisions before starting DESIGN.md or ARCHITECTURE.md, because several of them change the data model.

---

## 1. Problem, value proposition and target users

### 1.1 Problem

Private-sector buyers in India often source goods through phone calls, email quotes and known vendors. This causes four problems:

- **Weak price discovery.** Buyers rarely see enough competing quotes to know a fair price.
- **Poor audit trail.** Quotes, approvals and delivery proof sit across inboxes and paper files.
- **Limited supplier reach.** Small sellers struggle to reach buyers outside their existing network.
- **No private equivalent of GeM.** The Government e-Marketplace gives public bodies structured procurement. Private buyers have fewer comparable options. `[ASSUMPTION: validate with buyer interviews]`

### 1.2 Value proposition

- **For buyers:** Get competing prices through direct orders, sealed bids and reverse auctions, and finish with a contract and acceptance report for every purchase.
- **For sellers:** Reach verified buyers and compete on a transparent process, without paying a commission on the goods price above the platform fee.
- **For the platform:** Earn subscription and transaction fees as a neutral intermediary that never holds goods or the goods payment.

### 1.3 Target users

| User | Description |
|---|---|
| **Buyer** | Purchase staff or owners at MSMEs, factories, trusts and institutions. Individuals may buy within a lower limit. |
| **Consignee** | The person at the delivery location who confirms receipt. MVP treats this as a field on the order, with the buyer account confirming receipt. `[D-11]` |
| **Seller** | GST-registered manufacturers, traders and resellers. Individuals cannot sell. |
| **Admin** | Bid Market operations staff who verify accounts and products and settle disputes. |
| **Visitor** | Anyone browsing the public catalogue and open tenders without an account. |

---

## 2. Core user journeys and user stories

### 2.1 Buyer journeys

**J1. Register and get verified.** The buyer creates an account, confirms email, adds PAN, business, address and bank details, completes verification, and waits for admin approval.

**J2. Place a direct order.** The buyer finds a product, enters quantity, delivery date and consignee, pays the platform fee, waits for seller acceptance, pays the seller outside the platform, and confirms receipt with a photo. The system then issues the acceptance report.

**J3. Run a tender.** The buyer creates a regular tender from a product or a custom tender from a category, chooses Bid, RA or Bid to RA, sets dates and minimum bids, pays the fee and publishes. The buyer then evaluates bids, or waits for the auction to close. After seller acceptance, the order follows the same path as J2.

**J4. Raise an incident.** The buyer raises an incident against an order, discusses it inside the platform, and receives an admin decision.

### 2.2 Seller journeys

**J5. Register and subscribe.** The seller creates an account, adds PAN, GSTIN and bank details, declares three years of turnover, pays the subscription and goes live.

**J6. List a product.** The seller selects a category, enters specifications, price, discount, stock, sale states and images, then submits. An admin publishes it, sends it back or rejects it.

**J7. Win a tender.** The seller finds eligible tenders, submits a sealed bid or bids in a live auction, accepts the award, pays the fee and fulfils the order.

**J8. Fulfil an order.** The seller accepts the order, pays the fee, receives payment from the buyer, and marks the order as dispatched with bill, e-way bill and transport details.

### 2.3 Admin journeys

**J9. Verify.** The admin clears the queues for buyer accounts, products and category requests.

**J10. Govern.** The admin settles incidents, resolves tickets, applies or lifts blocks, and manages categories, fees and limits.

### 2.4 User stories

| ID | Role | Story | Acceptance criteria |
|---|---|---|---|
| US-1 | Buyer | I want to filter products by category, state and specification so that I find a match quickly. | Filters combine. Only published products from active sellers appear. |
| US-2 | Buyer | I want the system to stop direct orders over the limit so that I use the right method. | The order is blocked at the limit, and the page links to tender creation. |
| US-3 | Buyer | I want prices hidden during a live auction so that I cannot influence it. | Buyer APIs return bid counts only until closure. |
| US-4 | Buyer | I want an acceptance report for each order so that I can show proof to auditors. | The report is generated only after receipt and proof upload, and is downloadable as PDF. |
| US-5 | Seller | I want to see only tenders I can serve so that I do not waste time. | Eligibility is based on published products in the tender's category and verified status. |
| US-6 | Seller | I want to see L1 and my own position during an auction so that I can decide my next bid. | Both update within 2 seconds. Competitor identities stay hidden. |
| US-7 | Seller | I want to pause my account so that I do not get orders when I cannot supply. | Maintenance hides products and blocks bidding until it is turned off. |
| US-8 | Admin | I want a reason recorded for every approval action so that decisions can be audited. | Every status change stores actor, time and note. |
| US-9 | Admin | I want to change fees without a code release so that I can adjust pricing. | New rates apply only to new transactions. |

---

## 3. Features and functional requirements

Priority: **M** = MVP, **L** = later.

### 3.1 Accounts and verification

| ID | Requirement | Priority |
|---|---|---|
| F-1 | Register as buyer or seller, with one organisation per account. | M |
| F-2 | Verify email by OTP and phone by OTP. OTP is valid for 180 seconds, with at most 3 resends in 24 hours. | M |
| F-3 | Log in with phone and password plus captcha. Reset password by email link. | M |
| F-4 | Validate PAN and GSTIN through a verification provider. | M |
| F-5 | Buyer accounts need admin approval, with a minimum 24-hour review. `[D-5]` | M |
| F-6 | Seller accounts activate on successful verification and subscription payment. | M |
| F-7 | Allow multiple office addresses and bank accounts, with one primary. Saved entries cannot be edited. Corrections go through support. | M |
| F-8 | Identity proof for buyers. `[D-4]` | M |
| F-9 | Multiple users under one organisation, with roles such as indentor or paying authority. | L |

### 3.2 Catalogue

| ID | Requirement | Priority |
|---|---|---|
| F-10 | Admin manages categories, sub-categories and per-category specification templates. | M |
| F-11 | Specifications have allowed values or ranges and units. Some are marked as key specifications that drive tender matching. | M |
| F-12 | Seller creates products with title, description, specifications, MRP, discount, stock, unit, sale states and images. | M |
| F-13 | Enforce the minimum discount on MRP (default 10%). | M |
| F-14 | Listings must not show brand names, logos, contact details or watermarks. Admin checks this manually. | M |
| F-15 | Product status follows section 3.2.1. | M |
| F-16 | Sellers may change price, discount and stock on published products without re-verification. | M |
| F-17 | State-wise pricing and discounts. | L |
| F-18 | Clone specifications from an existing product. | L |
| F-19 | Sellers can request a new category with supporting details. | M |

#### 3.2.1 Product status

`Draft → Pending → Published`, or `Pending → Notify → Pending`, or `Pending → Rejected`. `Published ⇄ Unpublished`.

- Pending and Rejected products cannot be edited.
- Rejected products cannot be resubmitted.
- A product can be deleted only with zero stock and no active orders or tenders.

### 3.3 Direct orders

| ID | Requirement | Priority |
|---|---|---|
| F-20 | Direct orders must stay below ₹20,000 for individuals and ₹50,000 for organisations. Limits are admin-configurable. | M |
| F-21 | Expected delivery is at least 5 days after order creation. | M |
| F-22 | Buyer pays the fee to place the order. | M |
| F-23 | Seller accepts or rejects. Acceptance is binding and requires the seller's fee. | M |
| F-24 | Contact details become visible to both sides only after seller acceptance and fee payment. | M |
| F-25 | Goods payment happens off-platform. The platform stores no goods-payment status except what users report. `[D-1]` | M |
| F-26 | Dispatch requires product bill, e-way bill and transport bill, uploaded as files. E-way bill rules are decided under `[D-13]`. | M |
| F-27 | Buyer confirms receipt with at least one image. The system generates the acceptance report and received invoice. | M |
| F-28 | Multiple consignees on one order. | L |

### 3.4 Tenders

| ID | Requirement | Priority |
|---|---|---|
| F-29 | Regular tender from one product, and custom tender from category and specifications. | M |
| F-30 | Tender types: Bid, Reverse Auction, Bid to RA. | M |
| F-31 | Buyer sets dates, contract period, quantity, consignee and optional extra terms document. | M |
| F-32 | Consignee GSTIN is validated before publishing. | M |
| F-33 | Buyer may set minimum bids, number of extensions and extension duration. | M |
| F-34 | If minimum bids are not met, the tender extends automatically. After the last extension it cancels and cannot be revived. | M |
| F-35 | Seller eligibility is checked by category, specifications, verified status, block status and maintenance status. | M |
| F-36 | Sealed bids are hidden from everyone until bid close. Buyer sees them after close. | M |
| F-37 | Seller may submit, withdraw and resubmit up to 3 times per tender. | M |
| F-38 | In RA, sellers see L1 and their own bids. Buyers see no prices until closure. | M |
| F-39 | Each RA bid must meet the decrement rule. `[D-7]` | M |
| F-40 | RA closes at the set time, enforced by the server. Late bids are refused. | M |
| F-41 | Anti-sniping extension when a bid arrives in the final minutes. `[D-7]` | M |
| F-42 | In Bid to RA, the buyer removes the highest bidder(s) or highest 50%, then the RA starts at the set time among remaining sellers. | M |
| F-43 | The selected seller accepts or rejects. Rejection passes the award to the next lowest seller. | M |
| F-44 | Rejection penalty: blocks of 30, 60 and 180 days, then permanent. `[D-8]` | M |
| F-45 | Bids after 6:45 PM stay hidden until 9:00 AM on the next working day. `[D-7]` | L |

### 3.5 Fees, wallet and documents

| ID | Requirement | Priority |
|---|---|---|
| F-46 | Fees are collected through an RBI-authorised payment aggregator. | M |
| F-47 | All fee rates, limits and GST are admin-configurable. Each transaction stores the rates applied. | M |
| F-48 | Default direct order fee is 0.1% for each side, plus GST at 18%. | M |
| F-49 | Default tender fee is 0.5% for the buyer and 0.5% for the seller, plus GST at 18%. | M |
| F-50 | Custom tender: a fixed amount (default ₹1,000) to publish, with the rest due after L1 selection. | M |
| F-51 | Seller subscription: ₹25,000 for three-year turnover up to ₹25 crore, plus ₹100 per further ₹1 crore. Annual renewal. `[D-3]` `[D-14]` | M |
| F-52 | Wallet ledger shows Available, On hold and Paid. Funds cannot be withdrawn to a bank account. `[D-2]` | M |
| F-53 | GST-compliant tax invoice for every platform fee, with CGST and SGST or IGST by place of supply. | M |
| F-54 | TDS handling on platform transactions. `[D-12]` | M |
| F-55 | System-generated contract, acceptance report, received invoice and receipt, as downloadable PDFs. | M |

### 3.6 Support and governance

| ID | Requirement | Priority |
|---|---|---|
| F-56 | Incidents must reference a product, tender, bid or order, and carry a unique number and message thread. | M |
| F-57 | Admin decides incidents with warning, penalty, suspension or closure. | M |
| F-58 | Tickets handle technical issues, with type, description, attachments, message thread and status. | M |
| F-59 | Email notifications for every status change that needs action. SMS for OTP. | M |
| F-60 | Audit log for verification, product, bid, order, fee and admin actions. | M |
| F-61 | Account deletion only when no activity exists beyond registration and login, and never during an active subscription. | M |
| F-62 | Marketing pages: home, how it works, fees, guides, about, contact, FAQs, legal policies. | M |
| F-63 | In-app notification centre. | L |
| F-64 | Seller and buyer ratings. | L |

---

## 4. Non-functional requirements

| Area | Requirement |
|---|---|
| **Fairness** | The server clock decides all bid acceptance. The client timer is for display only. |
| **Auction integrity** | Concurrent bids are processed in a strict order. No two sellers can be recorded as L1 from a race. |
| **Real-time** | L1 reaches all viewers within 2 seconds at the 95th percentile. `[ASSUMPTION]` |
| **Performance** | Catalogue pages load within 2.5 seconds on a 4G connection. `[ASSUMPTION]` |
| **Capacity** | Support 50 concurrent auctions and 500 connected sellers at launch. `[ASSUMPTION]` |
| **Availability** | 99.5% monthly, with no planned maintenance during an open auction. `[ASSUMPTION]` |
| **Privacy** | Comply with India's Digital Personal Data Protection Act 2023 and its rules. `[D-4]` |
| **Security** | Authorisation on the server for every request. Encrypt identity and bank data at rest. Sealed bids must not be readable by any buyer or normal admin role before close. |
| **Compliance records** | Bids, orders, fees and audit logs cannot be edited or hard-deleted. Retention period under `[D-15]`. |
| **Accessibility** | WCAG 2.1 AA for core journeys. |
| **Compatibility** | Latest two versions of Chrome, Edge, Safari and Firefox. Usable at 360 px width. |
| **Language and locale** | English first. INR with Indian digit grouping. All times in IST. Hindi is a later addition. |

---

## 5. Pages and screens

**Public:** Home · Categories · Product list · Product detail · Tender list · Tender detail (limited) · How it works · Fees · Guides · About · Contact · FAQs · Terms · Privacy · Refund policy · Cancellation policy

**Auth:** Sign up · Log in · Forgot password · Reset password · OTP · Onboarding (profile, addresses, bank, verification, turnover, subscription) · Awaiting approval

**Buyer:** Dashboard · Direct order form · Fee checkout · Tender creation · My tenders · Tender evaluation · Bid to RA shortlist · Orders · Order detail · Wallet · Incidents · Tickets · Profile

**Seller:** Dashboard · Tenders (eligible, applied, won) · Tender detail and bid form · Live auction · Products · Product form · Category request · Orders · Order detail and dispatch · Wallet · Subscription · Incidents · Tickets · Profile and maintenance

**Admin:** Overview · Account verification · Product verification · Category requests · Categories and specifications · Users · Tenders · Orders · Incidents · Tickets · Fees and limits · Audit log · Content

**Documents:** Contract · Acceptance report · Received invoice · Tax invoice · Payment receipt

---

## 6. Roles and permissions

| Action | Visitor | Buyer | Seller | Admin |
|---|---|---|---|---|
| Browse catalogue and open tenders | Yes | Yes | Yes | Yes |
| See seller or buyer identity before acceptance | No | No | No | Yes |
| Place direct order | No | Verified only | No | No |
| Create tender | No | Verified only | No | No |
| Bid | No | No | Eligible only | No |
| See sealed bids before close | No | No | Own only | No `[D-9]` |
| See live RA prices | No | No, until close | L1 and own only | Read-only `[D-9]` |
| Manage products | No | No | Own only | Verify only |
| View order | No | Own only | Own only | Yes |
| Raise incident | No | Yes | Yes | Yes |
| Change fees, categories, blocks | No | No | No | Yes |

**Resource rule:** Every buyer and seller action is limited to records owned by their organisation. A blocked, suspended, unverified or expired account can read its existing records but cannot start new transactions. It must still be able to complete orders already accepted.

---

## 7. Data requirements

DATABASE.md will define the schema. The product needs these records:

- **Identity:** users, organisations, verification records, addresses, bank accounts, sessions, OTP attempts
- **Catalogue:** categories, specification templates, products, product media, product status history, category requests
- **Procurement:** tenders, tender specifications, consignees, bids, eliminations, awards, extensions
- **Orders:** orders, status history, dispatch documents, delivery proof, generated documents
- **Money:** fee rates, fee charges, payments, wallet ledger, tax invoices, subscriptions, refunds
- **Governance:** incidents, tickets, messages, penalties, blocks, audit log, notifications

**Data rules:**

- Store money as integer paise.
- Snapshot price, fee rate, tax and specifications on each order and tender, so later edits never change history.
- Keep bids as an append-only history.
- Do not store full Aadhaar numbers or images unless legal review approves it. `[D-4]`
- Store bank details encrypted and mask them in the interface.

---

## 8. Integrations

| Purpose | Type of service | Notes |
|---|---|---|
| Fee payments | RBI-authorised payment aggregator | Webhooks must be verified and idempotent. Vendor chosen in ARCHITECTURE.md. |
| PAN and GSTIN checks | Verification API provider | Needs a fallback to manual review when the provider is down. |
| Identity | DigiLocker or similar | Depends on `[D-4]`. |
| Phone OTP | SMS gateway | Requires DLT registration of sender and templates in India. |
| Email | Transactional email provider | Required at launch. |
| Files | Private object storage with malware scanning | Documents use short-lived signed links. |
| PDF generation | Library or service | For contracts, reports and invoices. |
| Captcha | Bot protection | Login and signup. |

E-invoicing and e-way bill APIs are not needed in MVP, because sellers issue these documents themselves. `[ASSUMPTION]`

---

## 9. Loading, empty and error states

| Situation | Required behaviour |
|---|---|
| **Loading lists** | Show skeleton rows that match the final layout. |
| **Live auction connection lost** | Show a clear "Reconnecting" banner, disable bidding until L1 is current, then refresh L1. |
| **Bid refused** | Say why and show the current L1. For example, "Your bid must be at least ₹X lower than L1." |
| **Bid sent as the auction closes** | Show the server's result. Never show a bid as placed until the server confirms it. |
| **Payment pending** | Show "Confirming payment". Do not ask the user to pay again until the status is known. |
| **Payment failed** | Keep the order or tender as an unpaid draft, and offer a retry. |
| **Verification provider down** | Queue for manual review and tell the user the expected wait. |
| **Upload failed** | Keep other form data. Show file type and size limits. |
| **Empty catalogue search** | Suggest removing filters, and offer a custom tender to verified buyers. |
| **No eligible tenders** | Explain how to become eligible, such as by listing in a category. |
| **Awaiting verification** | Show the current step and expected time. |
| **Blocked account** | Show the reason, end date, and how to raise a ticket. |
| **Session expired during a form** | Keep the draft and return the user after login. |
| **403 and 404** | Separate pages with a route back to the dashboard. |

---

## 10. MVP scope

**In scope:**

- Web application for buyers, sellers and admins
- Public catalogue and tender pages
- Registration, verification, subscription
- Product listing and admin verification
- Direct orders
- Bid, Reverse Auction and Bid to RA, with single product and single consignee per tender
- Platform fee payments, wallet ledger and GST invoices
- Dispatch documents, receipt confirmation and generated PDFs
- Incidents, tickets, email and SMS notifications, audit log
- Admin-configurable fees, limits and categories

---

## 11. Out of scope for MVP

- Goods payment, escrow or payment guarantees through the platform
- Logistics, shipment tracking and transporter integration
- Mobile apps (the web app must work on phones)
- Multiple users or approval chains inside one organisation
- Multiple consignees on one order or tender
- Multi-product tenders
- State-wise pricing
- Overnight bid visibility rule
- Geofencing and live camera-only document capture `[D-4]`
- Ratings, analytics dashboards, AI recommendations and chat outside incidents
- Hindi and regional languages
- Integration with buyers' ERP systems

---

## 12. Success criteria

Targets are proposals for the first 6 months after launch. `[ASSUMPTION: replace once you have a sales plan]`

| Measure | Proposed target |
|---|---|
| Verified paying sellers | 100 |
| Verified active buyers | 50 |
| Tenders published per month | 40 |
| Tenders that receive at least 3 valid bids | 70% |
| Tenders that end in a completed order | 50% |
| Median saving, L1 against buyer estimate | 8% or more |
| Buyer verification completed | Within 48 hours for 90% |
| Disputes per 100 orders | Fewer than 5 |
| Critical auction incidents | Zero wrong-winner cases |

**Launch criteria:** Every J1 to J10 journey works in production, with passing end-to-end tests. An auction load test passes at target capacity. Legal policies are approved. Fee invoices are reviewed by your chartered accountant.

---

## 13. Risks

| Risk | Impact | Response |
|---|---|---|
| **Too few participants.** Auctions need several sellers per category. | The core value fails. | Launch in 2 or 3 categories in one region, not all categories. `[D-6]` |
| **Off-platform leakage.** Buyer and seller meet once, then skip the fee. | Revenue loss. | Contact details open only after fees are paid. Repeat value must come from audit records and new seller reach. |
| **Low direct order revenue.** A maximum ₹50,000 order earns ₹50 per side before GST. | Direct orders will not fund the business. | Treat them as an entry point. Tender fees and subscriptions carry revenue. |
| **Non-payment or non-delivery.** There is no escrow. | Trust loss and disputes. | Clear payment terms on each order, plus incidents and penalties. `[D-1]` |
| **Bid manipulation or collusion.** | Reputation and legal risk. | Hide identities, log all activity, and let admins suspend accounts. |
| **Provider outage during an auction.** | Unfair close. | Rules for pausing and extending an auction are needed in ARCHITECTURE.md. |

---

## 14. Decisions requiring your approval

PEM's published terms contain some contradictions and gaps. I have listed these so you do not inherit them.

### Must decide before design and architecture

| ID | Decision | Recommendation |
|---|---|---|
| **D-1** | **When does the buyer pay?** PEM tells sellers not to dispatch before payment, but tells buyers to pay only after inspecting the goods. Both cannot apply. | Add a payment terms field to each order and tender (advance, on delivery, or credit days). The seller accepts those terms with the order. |
| **D-2** | **Are tender fees refundable?** PEM says fees are not refunded on cancellation, but its wallet rules release them to Available. | Release the fee to the wallet if a tender gets no valid bids or the seller side fails. Keep it non-withdrawable. Ask your lawyer to confirm the wallet stays within RBI rules for closed-system instruments. |
| **D-3** | **Seller launch pricing.** ₹25,000 upfront is hard to sell to sellers when the marketplace has no buyers yet. | Waive or heavily discount the first year for the first 100 sellers, and keep the transaction fees. |
| **D-4** | **How do you verify identity?** PEM requires Aadhaar, live capture and a 1 km location check. Aadhaar use is legally restricted, and a browser location check is easy to fake. | Use PAN and GSTIN API checks plus DigiLocker or a licensed KYC provider. Do not store Aadhaar. Skip the 1 km check in MVP. |
| **D-5** | **Who may register?** PEM's PAN rule accepts only 4th characters P or H, which would exclude companies (C) and firms (F). It also says trusts both can and cannot sell. | Accept all valid PAN types for the allowed entity types. Allow trusts and societies to sell only if they have a GSTIN. |
| **D-6** | **Launch focus.** | **Decided by owner:** Rajasthan, with all 16 categories listed in the catalogue. Recommendation stands to recruit sellers in 2 or 3 categories first, because auctions need competition. |

### Must decide before building the feature

| ID | Decision | Recommendation |
|---|---|---|
| **D-7** | **Auction rules.** Minimum decrement is undefined, and PEM has no anti-sniping rule. | Require 0.5% below L1. Extend by 5 minutes when a bid lands in the final 5 minutes, up to 6 times. Skip the overnight visibility rule. |
| **D-8** | **Rejection penalty.** Permanent bans after 4 rejections are harsh for a young marketplace, and PEM's rules are inconsistent on whether the block covers the tender or the whole platform. | Keep the ladder, but reset strikes after 12 months and give admins power to waive a strike with a recorded reason. |
| **D-9** | **Can admins see live bids?** | No for sealed bids until close. Read-only access for auction prices, with access logged. |
| **D-10** | **Business identity.** Is Bid Market your final brand, and which legal entity will operate it? Check trademark availability first. | Your decision. It affects invoices, policies and payment gateway onboarding. |
| **D-11** | **Consignee confirmation.** PEM uses an OTP per consignee on tenders and a photo on direct orders. | Use one flow for both in MVP: the buyer confirms receipt with a photo. |
| **D-12** | **TDS.** PEM states 2% TDS, and its treatment needs specialist review. Rates and the applicable section depend on the transaction and the current law. | Have your chartered accountant confirm GST and TDS treatment before you build invoicing. Keep rates configurable. |
| **D-13** | **Dispatch documents.** E-way bills are not needed for every consignment. | Make only the product bill mandatory. Allow "not applicable" with a reason for the others. |
| **D-14** | **Subscription slabs.** PEM's wording is unclear for turnover like ₹25.5 crore. | Charge on completed crores above ₹25 crore. ₹25.5 crore stays at ₹25,000, and ₹40 crore pays ₹26,500. The prototype currently rounds up, so it will need changing. |
| **D-15** | **Record retention.** | Have your lawyer and chartered accountant set the retention periods for tax, contract and personal data. |

### Legal review needed before launch

These need an Indian lawyer and chartered accountant. They are flagged here as questions, not legal advice.

- Intermediary status under the Information Technology Act 2000, and whether e-commerce rules apply to B2B activity
- Digital Personal Data Protection Act 2023 and Rules 2025 compliance. Reported dates: notice, consent, rights, breach and retention duties commence on 12 May 2027, so build for them now.
- Wallet treatment under RBI rules
- GST and TDS treatment of platform fees
- Original terms of use, privacy, refund, cancellation and integrity policies, written for your business
