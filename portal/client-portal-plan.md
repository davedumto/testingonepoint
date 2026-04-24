# Client Portal — Exhaustive Build Plan

Every line item from `client-portal.md` (main spec + Quote System sub-spec + Document Structure sub-spec) mapped to a status. No summarizing.

## Legend

- ⚙️ **EXISTS** — already in codebase, may need light extension
- ✅ **V1** — must build for first release
- 🔄 **V2** — defer to a later phase
- ❌ **SKIP** — recommend not building (with reason)

---

## §1. AUTHENTICATION & USER PROFILE

### Required Fields (Core Identity)
- **First Name** — ⚙️ EXTEND (`User.name` is single-field; split into `firstName` + `lastName`)
- **Last Name** — ⚙️ EXTEND (same)
- **Email Address (Login ID)** — ⚙️ EXISTS (`User.email`)
- **Phone Number** — ✅ V1 (new field on User)
- **Password (encrypted)** — ❌ SKIP (clients use email-OTP per current `/login` flow; password column is already legacy in `User`)
- **2FA (SMS or Email verification)** — ⚙️ EXTEND (existing `twoFactorSecret`/`twoFactorEnabled` is for employees; for clients the OTP login already acts as 2FA-by-default)

### Extended Profile (CRM Synced)
- **Date of Birth** — ✅ V1
- **Address (Full)** — ✅ V1 (street, city, state, zip — sub-document)
- **Preferred Contact Method (Call / Text / Email)** — ✅ V1 (enum)
- **Secondary Contact** — 🔄 V2 (rare; sub-document)
- **Business Name (if commercial)** — ✅ V1 (optional)
- **Household Members / Dependents** — 🔄 V2 (sub-collection; only needed once health/life cross-sell is live)

---

## §2. CLIENT TIER CLASSIFICATION

- **Bronze (1 policy)** through **Crown (6+)** — ✅ V1
- **Auto-assigned based on policy count** — ✅ V1
- **Count active policies tied to client** — ✅ V1 (aggregation on Policy collection)
- **Auto-update tier dynamically** — ✅ V1 (recompute on Policy create/update/delete)
- **Display tier badge across dashboard** — ✅ V1

### Strategic Add-Ons (per tier)
- **Priority service level** — 🔄 V2 (just a stored attribute on tier; UI affordance later)
- **Faster response SLA** — 🔄 V2 (depends on Service Request module being live)
- **Dedicated agent (Platinum+)** — 🔄 V2
- **Annual coverage review priority** — 🔄 V2

---

## §3. CLIENT DASHBOARD (MAIN SCREEN)

### Overview Widgets
- **Total Active Policies** — ✅ V1 (count from Policy)
- **Monthly Total Premium** — ✅ V1 (sum from Policy.premium)
- **Next Payment Due Date** — ✅ V1 (depends on billing fields below)
- **Renewal Alerts** — ✅ V1 (compute from Policy.endDate)
- **Open Requests / Tickets** — ✅ V1 (count from ServiceRequest)
- **Assigned Agent (Alex / Vera / Team)** — ✅ V1 (new `assignedAgent` field on User)

### Visual Sections
- **🛡️ Your Protection Portfolio** — ✅ V1 (policy summary panel)
- **📅 Upcoming Actions** — ✅ V1 (renewals + payments + open requests)
- **⚠️ Important Alerts** — ✅ V1 (cancellation warnings, missing docs)
- **💬 Messages from OnePoint** — ✅ V1 (recent admin messages)

---

## §4. POLICY MANAGEMENT CENTER

### Basic Info
- **Policy Type** — ⚙️ EXISTS (`Policy.productCategory`)
- **Carrier Name** — ⚙️ EXISTS
- **Policy Number** — ⚙️ EXISTS
- **Status** — ⚙️ EXTEND (current enum is `active/pending/expired/cancelled`; add `reinstatement_needed`)

### Financials
- **Monthly Premium** — ⚙️ EXISTS (`Policy.premium`)
- **Billing Type** (Carrier Direct vs Agency Billed) — ✅ V1 (new enum field — spec calls this VERY IMPORTANT)
- **Next Draft Date** — ✅ V1
- **Payment Method on File** — ✅ V1 (last4 only; full PCI handling out of scope)

### Coverage Summary
- **Limits** — ✅ V1 (structured object per policy)
- **Deductibles** — ✅ V1
- **Key Coverages** — ✅ V1 (array of named coverages)
- **Add-ons / Endorsements** — ✅ V1

### Documents (linked to Document Vault)
- **ID Cards** — ✅ V1
- **Policy Declaration (DEC)** — ✅ V1
- **Endorsements** — ✅ V1
- **Certificates (COI)** — ✅ V1

### Actions
- **Request Change** — ✅ V1 (deep-links to Service Request)
- **Download Documents** — ✅ V1
- **Report Claim** — ✅ V1 (deep-links to Claims Center)
- **Make Payment** — 🔄 V2 (only when agency-billed; carrier-direct just opens carrier portal — that's V1)

---

## §5. SERVICE REQUEST CENTER

### Request Types (all V1)
- Policy Change — ✅ V1
- Add Vehicle — ✅ V1
- Remove Driver — ✅ V1
- Address Update — ✅ V1
- Certificate Request (COI) — ✅ V1
- Billing Issue — ✅ V1
- Cancellation Request — ✅ V1

### Required Fields
- Request Type — ✅ V1
- Description — ✅ V1
- Upload Documents — ✅ V1
- Urgency Level — ✅ V1

### Backend Routing
- **Auto-assign to Marcel (Operations)** — ✅ V1 (single configurable assignee per type)
- **SLA tracking** — ✅ V1 (timestamps + computed elapsed time)
- **Statuses**: Submitted / In Progress / Waiting on Client / Completed — ✅ V1

---

## §9. BILLING & PAYMENTS MODULE

### Display
- **Payment History** — ✅ V1
- **Upcoming Payments** — ✅ V1
- **Missed Payments** — ✅ V1

### Important Clarity Feature
- **Label "This policy is billed directly by [Carrier]"** — ✅ V1 (spec marks this as critical)
- **Label "You will see a charge from [Attune / Hiscox / etc.]"** — ✅ V1

### Payment Options
- **Link to carrier portal (if direct bill)** — ✅ V1
- **In-portal payment (if agency bill)** — 🔄 V2 (requires Stripe + PCI scope; substantial work)

---

## §10 / D. DOCUMENT VAULT

### Master Vault Top-Level Categories
- Active Policies — ✅ V1
- Quotes & Proposals — ✅ V1
- Billing Documents — ✅ V1
- Claims Documents — ✅ V1
- Compliance & Signed Forms — ✅ V1
- Client Uploads — ✅ V1

### Active Policies — per-policy folder structure
- Policy Declaration (DEC) — ✅ V1
- ID Cards — ✅ V1
- Endorsements — ✅ V1
- Policy Documents (Full Policy) — ✅ V1
- Renewal Documents — ✅ V1

### Required Standard Fields (per policy folder)
- Carrier Name — ⚙️ EXISTS
- Policy Number — ⚙️ EXISTS
- Effective Date — ⚙️ EXISTS (`startDate`)
- Expiration Date — ⚙️ EXISTS (`endDate`)
- Status —---------- ⚙️ EXISTS

### File Naming Convention
- **`[PolicyType]_[Carrier]_[PolicyNumber]_[DocumentType]_[Date].pdf`** — ✅ V1 (enforced server-side on upload; auto-rename)

### ID Card Structure
- **Current ID Card (pinned/default)** — ✅ V1
- **Previous ID Cards (archive)** — ✅ V1
- **"Download ID Card" button on dashboard** — ✅ V1 (one-click access — spec marks this as ELITE feature)
- **Mobile-optimized** — ✅ V1

### Quotes & Proposals Structure
- Per-product folders (Auto / Home / Health / Life / Commercial) — ✅ V1
- Per-quote contents: Summary / Coverage Comparison / Supporting Docs / Version History — ✅ V1
- **Version labels: Quoted / Revised / Final Option** — ✅ V1
- **Naming: `Quote_[Product]_[Carrier]_[Version]_YYYY-MM-DD.pdf`** — ✅ V1

### Billing Documents
- Invoices / Payment Confirmations / Billing Statements — ✅ V1
- **Each must say "Billed by Carrier" or "Billed by OnePoint"** — ✅ V1

### Claims Documents (per-claim folders)
- FNOL — ✅ V1
- Photos / Evidence — ✅ V1
- Adjuster Reports — ✅ V1
- Correspondence — ✅ V1
- Settlement Documents — ✅ V1
- **Compliance: never label "Approved Claim"; use "In Progress / Closed"** — ✅ V1 (UI copy lock)

### Compliance & Signed Forms
- Coverage Selection Forms — ✅ V1
- **Rejection Forms (E&O CRITICAL per spec)** — ✅ V1
- Cancellation Requests — ✅ V1
- No Loss Statements — ✅ V1
- E-Sign Documents — 🔄 V2 (depends on e-signature vendor integration — DocuSign/HelloSign)

### Client Uploads (separated from agency-generated)
- Driver Licenses — ✅ V1
- Property Photos — ✅ V1
- Business Documents — ✅ V1
- Medical Documents — ✅ V1 (HIPAA-tagged)

### Document Tagging Metadata
- Document Type — ✅ V1
- Policy Type — ✅ V1
- Carrier — ✅ V1
- Effective Date — ✅ V1
- Expiration Date — ✅ V1
- Status — ✅ V1

### Document Lifecycle
- States: Draft / Active / Superseded / Archived — ✅ V1
- **Never delete, always archive** — ✅ V1 (soft-delete pattern)

### Client Experience Features
- 🔍 **Search bar ("Find my ID card")** — ✅ V1
- ⭐ **Favorite / Pin Document** — ✅ V1
- 📥 **Download all documents** — 🔄 V2 (zip bundle generation — nice-to-have)
- 📱 **Mobile-first access** — ✅ V1

### Backend Permissions
- Client: View / Download — ✅ V1
- Agent: Upload / Edit / Tag — ✅ V1
- Admin: Full control — ✅ V1

### Activity Tracking
- Who uploaded / when / what changed — ⚙️ EXISTS (audit log infra; needs doc-specific events)

### Compliance Disclaimers (UI copy on doc views)
- "Coverage subject to policy terms and conditions" — ✅ V1
- "This document is for informational purposes only" — ✅ V1

---

## §11. CLAIMS CENTER

### Report Claim
- Policy Selection — ✅ V1
- Incident Type — ✅ V1
- Date of Loss — ✅ V1
- Description — ✅ V1
- Upload Evidence — ✅ V1

### Important Disclaimer (legal must-have)
- **"Submission does not guarantee claim approval. Coverage is subject to policy terms."** — ✅ V1

### Claim Status Tracker
- Reported / Under Review / In Progress / Closed — ✅ V1

---

## §12. NOTIFICATIONS & ALERTS

### Alert Types
- Renewal reminders — ✅ V1
- Payment alerts — ✅ V1
- Missing documents — ✅ V1
- Policy cancellation warnings — ✅ V1

### Delivery Channels
- **Portal** — ⚙️ EXISTS (Notification model + bell already built for employees; reuse)
- **Email** — ✅ V1 (need email send integration — Resend/SendGrid)
- **SMS** — 🔄 V2 (Twilio integration — cost + setup overhead)

---

## §13. CLIENT COMMUNICATION CENTER

- **Direct messaging with agency** — ✅ V1
- **Message history** — ✅ V1
- **File attachments** — ✅ V1

(Reuses existing Pusher infra for live updates)

---

## §14. INTELLIGENCE & CROSS-SELL ENGINE

### Smart Recommendations (sample triggers)
- "You have auto — bundle home & save" — ✅ V1
- "You have no life insurance — protect income" — ✅ V1
- "Add umbrella coverage" — ✅ V1

### Trigger Logic
- **Based on missing coverage** (Policy collection scan) — ✅ V1
- **Based on household profile** (dependents → life) — 🔄 V2 (depends on §1 dependents field, which is V2)
- **Based on business profile** (business → WC, Comm Auto, Cyber) — ✅ V1 (only needs `businessName`)

---

## §15. ADMIN / BACKEND

- **Full client view** — ✅ V1
- **Policy sync with CRM** — 🔄 V2 (depends on CRM webhook coverage)
- **Activity logs** — ⚙️ EXISTS
- **SLA tracking dashboard** — ✅ V1 (depends on Service Request)
- **Agent assignment UI** — ✅ V1

---

## §16. CRM INTEGRATION (NON-NEGOTIABLE)

- **Contact fields sync** — ✅ V1 (define field map; bidirectional)
- **Opportunity pipeline sync** — ✅ V1
- **Policy records sync** — ✅ V1
- **Documents sync** — 🔄 V2 (heavy bidirectional file sync)
- **Use existing schema exactly** — ✅ V1 (constraint, not work item)

---

## §17. MOBILE OPTIMIZATION

- **Fully responsive** — ✅ V1 (mobile-first build, not retrofit)
- **Fast login** — ⚙️ EXISTS (OTP is fast)
- **One-click ID card access** — ✅ V1 (covered in Document Vault)

---

## §18. COMPLIANCE & SECURITY

- **HIPAA considerations (health data)** — ✅ V1 (field-level encryption + access logging on health docs)
- **Encryption at rest + in transit** — ⚙️ EXISTS
- **Audit logs** — ⚙️ EXISTS
- **E-signature tracking** — 🔄 V2 (depends on e-sign integration)

---

## §19. ELITE FEATURES

- **Client Tier Badge** — ✅ V1 (covered in §2)
- **Protection Score (coverage completeness %)** — 🔄 V2
- **Annual Review Scheduler** — 🔄 V2
- **Live Agent Call Button** — 🔄 V2 (Twilio click-to-call OR simpler "request a call" form in V1)
- **Smart Document Auto-Fill** — 🔄 V2 (spec itself flags this as future phase)

---

## QUOTE SYSTEM (sub-spec)

### Q1. Master "Get a Quote" Center

**Personal Insurance**
- 🚗 Auto Insurance — ✅ V1
- 🏠 Homeowners — ✅ V1
- 🏢 Renters / Condo — ✅ V1
- ❤️ Health Insurance — ✅ V1
- 💼 Life Insurance — ✅ V1
- 🛡️ Disability / Accident / Critical Illness — ✅ V1

**Commercial Insurance**
- ⚖️ General Liability — ✅ V1
- 🏗️ Workers Compensation — ✅ V1
- 🚛 Commercial Auto — ✅ V1
- 📦 Business Owner Policy (BOP) — ✅ V1
- 🧑‍⚕️ Professional Liability — ✅ V1
- 🏢 Commercial Property — ✅ V1

**Specialty Coverage**
- 🎟️ Event Insurance — 🔄 V2 (lower volume)
- 🍷 Liquor Liability —- 🔄 V2
- 🧠 Cyber Insurance — ----🔄 V2
- 🚗 Garage Insurance — -----🔄 V2
- 🚛 Trucking Insurance — -----🔄 V2

### Q2. User Flow When Client Clicks a Product
- **Option A: embedded form (iframe)** — 🔄 V2 (requires CSP/x-frame work on marketing site)
- **Option B: redirect to website form** — ✅ V1 (ship first; iframe is a follow-up)

### Q3. Smart Pre-fill
- **"We've pre-filled your information to save you time."** — ✅ V1
- **Pass name / email / phone via query string** — ✅ V1 (already partially in marketing forms)

### Q4. Quote Tracking System
- **On click → log CRM activity "Quote Started – Auto"** — ✅ V1
- **On submission → create CRM Opportunity** — ✅ V1
- **Move to "Quote in Progress"** — ✅ V1
- **Auto-assign to Alex (Sales)** — ✅ V1
- **Trigger 5–10 min follow-up task** — ✅ V1

### Q5. Cross-Sell Engine — covered in §14

### Q6. My Quotes Dashboard
- Show requested quotes — ✅ V1
- Statuses: Submitted / In Progress / Awaiting Info / Completed — ✅ V1
- Display product type, date, agent, status — ✅ V1

### Q7. Quote Follow-Up Automation
- 📧 **Email confirmation to client** — ✅ V1
- 💬 **SMS to client** — 🔄 V2 (Twilio)
- 📌 **Internal task to Alex (call within 5–10 min)** — ✅ V1

### Q8. Build My Coverage Tool
- **5–7 question quiz** — 🔄 V2 (UX feature; ship after main quote routing works)
- **"Recommended Coverage Plan" output with quote buttons** — 🔄 V2

### Q9. Compliance (pre-redirect screen)
- **"Submitting a quote does not bind coverage"** — ✅ V1
- **"Final pricing subject to underwriting"** — ✅ V1

### Q10. Developer Implementation Notes
- **Forms sourced from marketing site only** — ✅ V1 (constraint)
- **Track clicks** — ✅ V1
- **Track submissions** — ✅ V1
- **Track abandonment** — 🔄 V2 (advanced; needs event tracking on marketing form)
- **Map to `{{contact.*}}` / `{{opportunity.*}}` CRM tokens** — ✅ V1
- **Pass session data: name / email / phone** — ✅ V1

---

## TOTALS

- ⚙️ **EXISTS / EXTEND**: ~14 items (auth foundation, basic Policy fields, Notification model, audit log)
- ✅ **V1 BUILD**: ~95 items (the main work)
- 🔄 **V2 DEFER**: ~28 items (specialty coverage, SMS, in-portal payments, e-sign, advanced UX)
- ❌ **SKIP**: 1 item (password — replaced by OTP)

**Total spec line items: ~138**

---

## RECOMMENDED V1 PHASING (build order)

### Phase 0 — Foundation (~1 week)
- §1 client role + extended profile (firstName/lastName, phone, DOB, address, contact pref, businessName, assignedAgent)
- §2 tier classification (model + computation + badge component)
- §16 CRM field map definition (write-only initially)

### Phase 1 — Policies + Documents (~2 weeks)
- §4 extend Policy (billingType, draftDate, paymentMethod last4, limits, deductibles, coverages, endorsements)
- §10/D Document Vault (full folder tree, naming convention, metadata tagging, lifecycle, search, pin, permissions)
- §10 ID card current/previous + one-click download

### Phase 2 — Service + Claims + Billing (~2 weeks)
- §5 Service Request Center (model, form, routing, SLA, statuses)
- §11 Claims Center (FNOL form, status tracker, disclaimers)
- §9 Billing display (history/upcoming/missed) + carrier-billing clarity labels

### Phase 3 — Dashboard + Notifications + Comms (~1.5 weeks)
- §3 Dashboard widgets + 4 visual sections
- §12 Notifications (renewal/payment/missing-docs/cancellation) via portal + email
- §13 Communication Center (messaging + history + file attachments)

### Phase 4 — Quotes + Cross-sell + Admin (~2 weeks)
- §Q1–Q4, Q6, Q7, Q9, Q10 Quote system (category UI, redirect+prefill, tracking, My Quotes, follow-up email + Alex task, compliance disclaimers)
- §14 Cross-sell engine (rules over Policy + business profile)
- §15 Admin client view + agent assignment + SLA dashboard

### Phase 5 — Polish + Mobile + Compliance (~1 week)
- §17 Mobile responsive pass
- §18 HIPAA tagging on health docs
- §19 Tier badge final placement, "Request a Call" form (Live Agent V1)

**Total V1: ~9–10 weeks of focused build.**

V2 work (~4–6 weeks): in-portal payments, SMS, e-sign, document zip download, Build My Coverage quiz, Protection Score, Annual Review Scheduler, Smart Doc Auto-Fill, specialty coverage quote routing, household-based cross-sell, document sync with CRM, dependents sub-collection, secondary contact, embedded iframe quote forms, abandonment tracking.
