
🏛️ ONEPOINT INSURANCE CLIENT PORTAL

“Client Protection Dashboard” – Full System Architecture

⸻

1. 🔐 AUTHENTICATION & USER PROFILE (FOUNDATION)

Required Fields (Core Identity)

First Name
Last Name
Email Address (Login ID)
Phone Number
Password (encrypted)
2FA (SMS or Email verification)

⸻

Extended Profile (CRM Synced)

Date of Birth
Address (Full)
Preferred Contact Method (Call / Text / Email)
Secondary Contact (if applicable)
Business Name (if commercial client)
Household Members / Dependents (for health/life)

⸻

2. 🏆 CLIENT TIER CLASSIFICATION SYSTEM (VERY IMPORTANT)

This is your value positioning + segmentation engine

Auto-Assigned Based on Policy Count:

🟤 Bronze → 1 Policy
⚪ Silver → 2 Policies
🟡 Gold → 3 Policies
🔵 Platinum → 4 Policies
🟢 Emerald → 5 Policies
👑 Crown → 6+ Policies

⸻

Developer Logic:

Count active policies tied to client
Auto-update tier dynamically
Display tier badge across dashboard

⸻

Strategic Add-On:

Each tier unlocks:

Priority service level
Faster response SLA
Dedicated agent (Platinum+)
Annual coverage review priority

⸻

3. 📊 CLIENT DASHBOARD (MAIN SCREEN)

This is what they see immediately after login.

Overview Widgets:

Total Active Policies
Monthly Total Premium
Next Payment Due Date
Renewal Alerts
Open Requests / Tickets
Assigned Agent (Alex / Vera / Team)

⸻

Visual Sections:

🛡️ “Your Protection Portfolio”
📅 “Upcoming Actions”
⚠️ “Important Alerts”
💬 “Messages from OnePoint”

⸻

4. 🛡️ POLICY MANAGEMENT CENTER (CORE OF PORTAL)

Each policy must be structured like a mini-dashboard

⸻

Per Policy Display:

Basic Info:

Policy Type (Auto, Home, Health, etc.)
Carrier Name (Progressive, National General, Hiscox, Attune, etc.)
Policy Number
Status (Active / Pending / Cancelled / Reinstatement Needed)

⸻

Financials:

Monthly Premium
Billing Type:
Carrier Direct (VERY IMPORTANT)
Agency Billed
Next Draft Date
Payment Method on File

⸻

Coverage Summary:

Limits
Deductibles
Key Coverages
Add-ons / Endorsements

⸻

Documents:

ID Cards
Policy Declaration (DEC)
Endorsements
Certificates (COI)

⸻

Actions:

Request Change
Download Documents
Report Claim
Make Payment (if applicable)

📩 SERVICE REQUEST CENTER (CRITICAL FOR OP... by Vera OnePoint Insurance
Vera OnePoint Insurance
5:18 AM

📩 SERVICE REQUEST CENTER (CRITICAL FOR OPERATIONS)

Replace email chaos with structured workflows.

⸻

Request Types:

Policy Change
Add Vehicle
Remove Driver
Address Update
Certificate Request (COI)
Billing Issue
Cancellation Request

⸻

Required Fields:

Request Type
Description
Upload Documents
Urgency Level

⸻

Backend Routing:

Auto-assign to Marcel (Operations)
SLA tracking
Status updates:
Submitted
In Progress
Waiting on Client
Completed

⸻

9. 💳 BILLING & PAYMENTS MODULE

Display:

Payment History
Upcoming Payments
Missed Payments

⸻

IMPORTANT CLARITY FEATURE:

Label:
“This policy is billed directly by [Carrier Name]”
“You will see a charge from [Attune / Hiscox / etc.]”

⸻

Payment Options:

Link to carrier portal (if direct bill)
In-portal payment (if agency bill)

⸻

10. 📄 DOCUMENT VAULT

Secure, organized, client-accessible.

⸻

Categories:

Policies
ID Cards
Certificates
Claims Documents
Personal Uploads

⸻

Features:

Download
Upload
Version Tracking

⸻

11. 🚨 CLAIMS CENTER (STRATEGIC)

Report Claim:

Policy Selection
Incident Type
Date of Loss
Description
Upload Evidence

⸻

Important Disclaimer:

“Submission does not guarantee claim approval. Coverage is subject to policy terms.”

⸻

Claim Status Tracker:

Reported
Under Review
In Progress
Closed

⸻

12. 🔔 NOTIFICATIONS & ALERTS SYSTEM

Renewal reminders
Payment alerts
Missing documents
Policy cancellation warnings

⸻

Delivery:

Portal
Email
SMS

⸻

13. 💬 CLIENT COMMUNICATION CENTER

Direct messaging with agency
Message history
File attachments

⸻

14. 🧠 INTELLIGENCE & CROSS-SELL ENGINE

This is where you dominate.

⸻

Smart Recommendations:

“You have auto — bundle home & save”
“You have no life insurance — protect income”
“Add umbrella coverage”

⸻

Trigger Logic:

Based on missing coverage
Based on household/business profile

⸻

15. ⚙️ ADMIN / BACKEND (FOR TEAM)

Full client view
Policy sync with CRM
Activity logs
SLA tracking
Agent assignment

⸻

16. 🔗 CRM INTEGRATION (NON-NEGOTIABLE)

Must sync with:

Contact fields
Opportunity pipeline
Policy records
Documents

Use your existing schema exactly.

⸻

17. 📱 MOBILE OPTIMIZATION

Fully responsive
Fast login
One-click ID card access

⸻

18. 🔒 COMPLIANCE & SECURITY

HIPAA considerations (health data)
Encryption (data at rest + in transit)
Audit logs
E-signature tracking

⸻

19. 🚀 ELITE FEATURES (WHAT MAKES YOU DIFFERENT)

Client Tier Badge (visible status)
“Protection Score” (coverage completeness)
Annual Review Scheduler
Live Agent Call Button
Smart Document Auto-Fill (future phase)

🧩 UPDATED: ONEPOINT CLIENT PORTAL — QUOTE... by Vera OnePoint Insurance
Vera OnePoint Insurance
5:22 AM

🧩 UPDATED: ONEPOINT CLIENT PORTAL — QUOTE SYSTEM (OPTIMIZED)

🔑 CORE PRINCIPLE

All quote data collection happens through your existing website forms
👉 www.onepointinsuranceagency.com

The portal will:

Route clients to the correct form
Track submissions
Tie submissions back to CRM + pipeline
Trigger follow-up + cross-sell

⸻

🧾 1. MASTER “GET A QUOTE” CENTER (PORTAL UI)

Instead of long forms inside the portal, you will have:

🔘 QUOTE CATEGORY BUTTONS

Personal Insurance

🚗 Auto Insurance
🏠 Homeowners Insurance
🏢 Renters / Condo
❤️ Health Insurance
💼 Life Insurance
🛡️ Disability / Accident / Critical Illness

⸻

Commercial Insurance

⚖️ General Liability
🏗️ Workers Compensation
🚛 Commercial Auto
📦 Business Owner Policy (BOP)
🧑‍⚕️ Professional Liability
🏢 Commercial Property

⸻

Specialty Coverage

🎟️ Event Insurance
🍷 Liquor Liability
🧠 Cyber Insurance
🚗 Garage Insurance
🚛 Trucking Insurance

⸻

🎯 USER FLOW (VERY IMPORTANT)

When client clicks a product:

👉 It does ONE of the following:

OPTION A (BEST PRACTICE)

Opens embedded form (iframe from your site)

OPTION B

Redirects to:
   👉 https://www.onepointinsuranceagency.com/[form-page]

⸻

🧠 SMART FEATURE

Before redirect:

Show:

“We’ve pre-filled your information to save you time.”

Then pass:

Name
Email
Phone

⸻

🔁 2. QUOTE TRACKING SYSTEM (CRITICAL ADDITION)

Even though forms live on your website, the portal must track:

⸻

When client clicks:

📌 Log in CRM:

Activity: “Quote Started – Auto” (example)

⸻

When form is submitted:

📌 CRM:

Create Opportunity
Move to:
   🧾 Quote in Progress

⸻

Assign to:

Alex (Sales)

⸻

Trigger:

📞➡️ Follow-Up within 5–10 minutes

⸻

🧠 3. CROSS-SELL ENGINE (PORTAL INTELLIGENCE)

This is where you win.

⸻

🎯 BASED ON CLIENT PROFILE:

If client has ONLY Auto:

Show:

“Bundle your home and save up to 25%”
“Protect your income with life insurance”

⸻

If client has Auto + Home:

Show:

“Add umbrella coverage”
“Lock in life insurance while healthy”

⸻

If Business Client:

Show:

Workers Comp
Commercial Auto
Cyber

⸻

🔘 CTA BUTTONS:

Each suggestion leads directly to:
👉 Correct quote form (your website)

⸻

📊 4. “MY QUOTES” DASHBOARD (NEW ADDITION)

Client can see:

Quotes requested
Status:
Submitted
In Progress
Awaiting Info
Completed

⸻

Each Quote Shows:

Product Type
Date Submitted
Assigned Agent
Status

⸻

📩 5. QUOTE FOLLOW-UP AUTOMATION

⸻

After Submission:

📧 Email:
“Your quote request has been received”

💬 SMS:
“Hey [Name], we’re reviewing your quote now…”

⸻

Internal:

📌 Alex gets task:

Call within 5–10 minutes

⸻

🧠 6. SMART “BUILD MY COVERAGE” TOOL (ADD THIS)

Instead of long forms:

Ask 5–7 questions:

Do you own a home?
Do you have dependents?
Do you own a business?
How many vehicles?

⸻

Output:

👉 “Recommended Coverage Plan”

With buttons:

Get Auto Quote
Get Home Quote
Get Life Quote

(All linking to your existing forms)

⸻

🔒 7. COMPLIANCE (KEEP THIS IN PORTAL)

Before redirecting to form:

Display:

“Submitting a quote does not bind coverage”
“Final pricing subject to underwriting”

⸻

⚙️ 8. DEVELOPER IMPLEMENTATION NOTES

⸻

Integration Requirements:

1. FORM SOURCE

All forms pulled from:
   👉 onepointinsuranceagency.com

⸻

2. TRACKING

Track:
Clicks
Submissions
Abandonment (optional advanced)

⸻

3. CRM SYNC

Map to:
   {{ contact.* }}
   {{ opportunity.* }}

⸻

4. SESSION PASSING

Pass:
Name
Email
Phone

⸻

🚀 FINAL POSITIONING

Now your system is:

✅ Clean (no duplicate forms)
✅ Scalable (website = form engine)
✅ Trackable (portal = intelligence layer)
✅ Profitable (cross-sell driven)

🗂️ ONEPOINT CLIENT PORTAL — DOCUMENT STRU... by Vera OnePoint Insurance
Vera OnePoint Insurance
12:50 PM

🗂️ ONEPOINT CLIENT PORTAL — DOCUMENT STRUCTURE SYSTEM

(Policies • ID Cards • Quotes • Compliance Docs)

⸻

🏛️ 1. MASTER DOCUMENT VAULT STRUCTURE

Every client will have a centralized document vault with this exact hierarchy:

Client Dashboard │ ├── 🛡️ Active Polic... by Vera OnePoint Insurance
Vera OnePoint Insurance
12:50 PM

Client Dashboard
│
├── 🛡️ Active Policies
├── 🧾 Quotes & Proposals
├── 💳 Billing Documents
├── 🚨 Claims Documents
├── 📄 Compliance & Signed Forms
├── 📤 Client Uploads

🛡️ 2. ACTIVE POLICIES (CORE STRUCTURE) Ea... by Vera OnePoint Insurance
Vera OnePoint Insurance
12:51 PM

🛡️ 2. ACTIVE POLICIES (CORE STRUCTURE)

Each policy must be its own folder:

📁 Example: 🛡️ Auto Insurance – Progressiv... by Vera OnePoint Insurance
Vera OnePoint Insurance
12:54 PM

📁 Example:
🛡️ Auto Insurance – Progressive
│
├── 📄 Policy Declaration (DEC)
├── 🪪 ID Cards
├── 🧾 Endorsements
├── 📑 Policy Documents (Full Policy)
├── 🔄 Renewal Documents
🔑 REQUIRED STANDARD (NON-NEGOTIABLE)
Every policy MUST include:

Carrier Name
Policy Number
Effective Date
Expiration Date
Status (Active / Pending / Cancelled)
📌 FILE NAMING CONVENTION
This protects you operationally:

[PolicyType]_[Carrier]_[PolicyNumber]_[DocumentType]_[Date].pdf
Example:
Auto_Progressive_123456_IDCard_2026-04.pdf
Home_StateFarm_789101_DEC_2026-01.pdf
🪪 3. ID CARD STRUCTURE (HIGH-ACCESS PRIORITY)
ID cards must be one-click accessible.

📁 Inside Each Policy:
🪪 ID Cards
│
├── Current ID Card (Pinned / Default)
├── Previous ID Cards (Archive)
🔥 ELITE FEATURE
“Download ID Card” button on dashboard
Mobile optimized (this is where clients panic most)
🧾 4. QUOTES & PROPOSALS STRUCTURE
This is where many agencies fail—yours will be clean and trackable.

📁 Structure:
🧾 Quotes & Proposals
│
├── 🚗 Auto Quotes
├── 🏠 Home Quotes
├── ❤️ Health Quotes
├── 💼 Life Quotes
├── 🏢 Commercial Quotes
Inside Each Quote:
Auto Quote – Progressive
│
├── 📄 Quote Summary
├── 📊 Coverage Comparison
├── 📎 Supporting Documents
├── 🕒 Version History
🔑 IMPORTANT RULES
Quotes must be version-controlled
Clearly label:
“Quoted”
“Revised”
“Final Option”
📌 Naming Convention:
Quote_[Product]_[Carrier]_[Version]_YYYY-MM-DD.pdf
💳 5. BILLING DOCUMENTS
📁 Structure:
💳 Billing Documents
│
├── Invoices
├── Payment Confirmations
├── Billing Statements
🔑 CRITICAL CLARITY
Each document must state:

“Billed by Carrier” OR
“Billed by OnePoint Insurance Agency”
🚨 6. CLAIMS DOCUMENTS (VERY IMPORTANT)
📁 Structure:
🚨 Claims Documents
│
├── Claim #12345
│   ├── FNOL (First Notice of Loss)
│   ├── Photos / Evidence
│   ├── Adjuster Reports
│   ├── Correspondence
│   ├── Settlement Documents
🔒 COMPLIANCE NOTE
Never label anything as:
❌ “Approved Claim”

Use:
✅ “Claim Status: In Progress / Closed”

📄 7. COMPLIANCE & SIGNED FORMS
This protects the agency legally.

📁 Structure:
📄 Compliance & Signed Forms
│
├── Coverage Selection Forms
├── Rejection Forms (IMPORTANT)
├── Cancellation Requests
├── No Loss Statements
├── E-Sign Documents
🔑 REQUIRED FOR E&O PROTECTION
Always store:

Signed coverage selections
Coverage rejection (VERY important)
Cancellation confirmations
📤 8. CLIENT UPLOADS
📁 Structure:
📤 Client Uploads
│
├── Driver Licenses
├── Property Photos
├── Business Documents
├── Medical Documents (Health)
RULE:
Separate client-uploaded vs agency-generated docs
🧠 9. DOCUMENT TAGGING SYSTEM (ELITE FEATURE)
Each document should have metadata:

Document Type
Policy Type
Carrier
Effective Date
Expiration Date
Status
This enables:

Fast search
Automation
Audit readiness
🔁 10. DOCUMENT LIFECYCLE MANAGEMENT
Status Types:
Draft
Active
Superseded
Archived
Rule:
Never delete documents
Always archive
📲 11. CLIENT EXPERIENCE FEATURES
Must Have:
🔍 Search bar (“Find my ID card”)
⭐ “Favorite / Pin Document”
📥 Download all documents
📱 Mobile-first access
⚙️ 12. BACKEND CONTROL (FOR TEAM)
Permissions:
Client: View / Download
Agent: Upload / Edit / Tag
Admin: Full control
Activity Tracking:
Who uploaded
When
What changed
🔒 13. COMPLIANCE DISCLAIMERS (MUST BE VISIBLE)
On documents:

“Coverage subject to policy terms and conditions”
“This document is for informational purposes only”
🚀 FINAL POSITIONING
With this structure:

You now have:

✅ A client-friendly experience
✅ A compliance-protected system
✅ A claims-ready documentation vault
✅ A scalable brokerage infrastructure

🔥 WHAT THIS DOES FOR ONEPOINT
Reduces service calls (“send my ID card”)
Protects against E&O claims
Speeds up claims handling
Builds authority + trust instantly
 

