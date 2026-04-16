# GHL Form Integration Guide — OnePoint Insurance Redesign

## Overview

This document maps every form and CTA touchpoint across the OnePoint redesigned site to where GHL (GoHighLevel) embedded forms and webhooks should be connected. The site has **20 pages** with **~60+ quote touchpoints** that all funnel through a single shared quote modal.

---

## Architecture: How Quotes Flow

```
User clicks any "Get a Quote" / "Start Quote" button
        |
        v
Hero form collects: Product Type + ZIP Code
        |
        v
Calls openQM(product, { zip }) in JavaScript
        |
        v
Opens the shared Quote Modal (quote-modal.js)
        |
        v
3-step form: About You -> Coverage Details -> Submit
        |
        v
*** THIS IS WHERE GHL CONNECTS ***
        |
        v
GHL Webhook receives: product, zip, name, email, phone, coverage details
        |
        v
GHL creates contact + triggers automation pipeline
```

---

## Priority 0: The Quote Modal (Single Point of Integration)

**File:** `quote-modal.js`

**Why this is #1:** Every quote action on the entire site routes through `window.openQM(product, opts)`. Embedding GHL here means one integration covers all 20 pages and all ~60 CTAs.

**Current behavior:**
- Opens a 3-step modal overlay (About You / Coverage / Finish)
- Collects: first name, last name, email, phone, ZIP, product type, coverage preferences
- On submit: currently shows a success message and redirects to appointment-calendar

**GHL integration options:**

### Option A: Webhook (Recommended)
Replace the modal's form submit handler to POST data to a GHL webhook URL.

```javascript
// In quote-modal.js, replace the submit handler:
async function submitQuote(formData) {
  const response = await fetch('https://services.leadconnectorhq.com/hooks/YOUR_WEBHOOK_ID', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      first_name: formData.firstName,
      last_name: formData.lastName,
      email: formData.email,
      phone: formData.phone,
      zip: formData.zip,
      product: formData.product,
      coverage_details: formData.coverageNotes,
      source: 'onepoint-redesign',
      page: window.location.pathname
    })
  });
  // Show success state in modal
}
```

### Option B: Embedded GHL Form (iframe)
Replace the modal's inner HTML with a GHL form embed.

```html
<!-- Inside the quote modal body, replace the 3-step form with: -->
<iframe
  src="https://api.leadconnectorhq.com/widget/form/YOUR_FORM_ID"
  style="width:100%;height:600px;border:none;"
  scrolling="no"
></iframe>
```

### Option C: GHL Form Script Embed
Use GHL's JavaScript embed instead of iframe for better styling control.

```html
<script src="https://api.leadconnectorhq.com/js/form_embed.js"></script>
<div id="ghl-quote-form" data-form-id="YOUR_FORM_ID"></div>
```

---

## All Form Touchpoints (by type)

### 1. Hero Section Forms (6 product pages)

These are the inline quote cards in each product page's hero section. They collect Product Type + ZIP, then call `openQM()` to open the quote modal.

| Page | File | Line | Form Class | Submit Handler |
|------|------|------|------------|----------------|
| Auto | `auto/index.html` | ~422 | `.auto-inline-card .qc-form` | `goQuote(event)` |
| Home | `home/index.html` | ~405 | `.home-hero-form .qc-form` | `goQuote(event)` |
| Health | `health/index.html` | ~356 | `.health-hero-form .qc-form` | `goQuote(event)` |
| Life | `life/index.html` | ~378 | `.life-hero-form .qc-form` | `goQuote(event)` |
| Disability | `disability/index.html` | ~502 | `.dis-form` | `goQuote(event)` |
| Business | `business/index.html` | ~430 | `.biz-quote-dock .qc-form` | `goQuote(event)` |

**Action needed:** None if using the modal approach. These already call `openQM()` which opens the GHL-connected modal. They serve as pre-qualifiers (product + ZIP) that feed into the full form.

---

### 2. Sub-Product Picker Forms (6 product pages)

Small "ZIP + Quote" forms inside each sub-product tab panel. They pass the selected sub-product name to `openQM()`.

| Page | Form Class | Submit Handler | What it passes to openQM |
|------|------------|----------------|--------------------------|
| Auto | `.vehicle-panel-form` | `vpQuote(event)` | Selected vehicle type (e.g., "Motorcycle") |
| Home | `.home-panel-form` | `hpQuote(event)` | Selected property type (e.g., "Condo") |
| Health | `.health-panel-form` | `hpQuote(event)` | Selected plan type (e.g., "Medicare Advantage") |
| Life | `.life-panel-form` | `lpQuote(event)` | Selected policy type (e.g., "Whole Life") |
| Disability | `.dis-panel-form` | `dpQuote(event)` | Selected DI type (e.g., "Long-Term") |
| Business | `.biz-panel-form` | `bpQuote(event)` | Selected coverage type (e.g., "Cyber Insurance") |

**Action needed:** None. These already route to `openQM()` with the specific sub-product name.

---

### 3. Homepage Quote Form

| Location | File | Line | Element | Handler |
|----------|------|------|---------|---------|
| Personal Insurance action card | `index.html` | ~592 | `.home-action-form` | `goQuote(event)` -> `openQM()` |

**Action needed:** None. Already routes to the modal.

---

### 4. Bundle Section Cards (all 6 product pages)

Each product page has a "Bundle & Save" section with 3 clickable cards. Each triggers `openQM()` directly.

Example: `<button onclick="openQM('Commercial Auto')">Business + Commercial Auto</button>`

**Action needed:** None. Already wired to `openQM()`.

---

### 5. Dropdown Bundle Links (inside hero form dropdowns)

Inside each hero form's product dropdown, there are 3 "bundle" quick-links that also call `openQM()`.

Example: `<a href="#" onclick="event.preventDefault();openQM('Auto');">Auto + Home</a>`

**Action needed:** None. Already wired to `openQM()`.

---

### 6. CTA Buttons — Currently linking to `appointment-calendar`

These are the orange "Get a Free Quote" / "Talk to an Advisor" buttons spread across the site. They currently navigate away to `https://onepointinsuranceagency.com/appointment-calendar`.

**These SHOULD be converted to open the GHL modal instead.**

#### Per product page (4 CTA buttons each):

| Section | Typical button text | Current href |
|---------|-------------------|--------------|
| Why It Matters / split section | "Get a Free [Product] Quote" | `appointment-calendar` |
| Mid-page CTA band | "Start My Free Quote" / "Get My [Product] Quote" | `appointment-calendar` |
| Final CTA band | "Get a Free Quote" / "Talk to a [Product] Advisor" | `appointment-calendar` |
| Bundle & Save section | Various | Already uses `openQM()` |

#### Site-wide (every page):

| Location | Element | Current href |
|----------|---------|--------------|
| **Navbar** "Get a Quote" button | `<a class="nav-cta">` | `appointment-calendar` |
| **Footer** "Schedule a Call" link | `<a>` in Client Tools column | `appointment-calendar` |

**Conversion pattern:**

```html
<!-- BEFORE -->
<a href="https://onepointinsuranceagency.com/appointment-calendar" class="btn btn-orange">
  Get a Free Quote
</a>

<!-- AFTER -->
<a href="#" class="btn btn-orange" onclick="event.preventDefault(); openQM('Auto');">
  Get a Free Quote
</a>
```

**Files affected:** All 20 page files. Approximately 4-5 CTA buttons per product page + 2 site-wide (navbar + footer) = ~50 button conversions total.

---

### 7. Resume Quote Modal

| Location | Element | Current behavior |
|----------|---------|-----------------|
| Bottom of every page | `.resume-form` | Collects last name + ZIP + email, redirects to `appointment-calendar` |

**GHL integration:** If GHL supports contact lookup by email/phone, wire the resume form to query GHL's API and pull up the existing contact's quote progress. Otherwise, redirect to GHL's booking page with the contact info pre-filled.

---

### 8. Contact Page Form

| Location | File | Line | Element |
|----------|------|------|---------|
| Contact Us main form | `contact/index.html` | ~185 | `.ct-form` |

**Current behavior:** `submitContact(event)` shows an alert. Should POST to a separate GHL webhook for general inquiries (not quotes).

---

### 9. Policy Request Form

| Location | File | Line | Element |
|----------|------|------|---------|
| Policy Request form | `policy-request/index.html` | ~195 | `.pr-form` |

**Current behavior:** `submitPR(event)` shows an alert. Should POST to a GHL webhook for policy service requests.

---

### 10. Blog Newsletter Form

| Location | File | Line | Element |
|----------|------|------|---------|
| Blog page newsletter | `onepointblog/index.html` | ~165 | `.bl-newsletter form` |

**Current behavior:** `subscribe(event)` shows an alert. Should POST email to GHL for newsletter/nurture sequence.

---

## GHL Webhook Data Schema

When the quote modal submits, send this payload to your GHL webhook:

```json
{
  "first_name": "string",
  "last_name": "string",
  "email": "string",
  "phone": "string",
  "zip": "string",
  "product": "string — e.g. 'Auto', 'Motorcycle', 'Whole Life', 'Cyber Insurance'",
  "coverage_notes": "string — any additional details from step 2",
  "source": "onepoint-redesign",
  "page_url": "string — window.location.href",
  "referrer": "string — document.referrer",
  "timestamp": "ISO 8601 datetime"
}
```

### Product values that GHL will receive:

**Auto:** Auto, Motorcycle, Classic / Antique Car, ATV, RV & Travel Trailer, Boat & Watercraft, Snowmobile, Scooter

**Home:** Homeowners, Condo, Mobile Home, Renters, Flood, Landlord, Umbrella

**Health:** Marketplace (ACA), Medicare Advantage, Short-Term Medical, Group Health, Dental, Vision, Accident Coverage, Critical Illness, Hospitalization Insurance, International Travel

**Life:** Term Life, Whole Life, Universal Life, Indexed Universal Life, Final Expense, Annuity, Group Life, Critical Illness Rider

**Disability:** Disability Income (Overview), Individual Disability Income, Short-Term Disability, Long-Term Disability, Group Disability, Business Overhead Expense Disability

**Business:** General Liability, Commercial Property, Business Owners Policy (BOP), Commercial Umbrella, Workers' Compensation, Commercial Auto, Trucking, Garage Insurance, Professional Liability / E&O, Malpractice Insurance, Cyber Insurance, Liquor Liability, Sport Insurance, Event Insurance, Travel Insurance

---

## Implementation Checklist

### Phase 1: Core Integration (covers ~90% of quote flow)
- [ ] Create GHL webhook for quote submissions
- [ ] Embed GHL form OR wire webhook in `quote-modal.js`
- [ ] Test: click hero form submit -> modal opens -> GHL receives data
- [ ] Test: click sub-product picker quote -> modal opens with correct product -> GHL receives
- [ ] Test: click bundle card -> modal opens with bundle product -> GHL receives
- [ ] Verify all 6 product pages + homepage route through correctly

### Phase 2: Convert CTA Buttons (covers remaining ~10%)
- [ ] Convert all `appointment-calendar` links in CTA bands to `onclick="openQM('Product')"`
- [ ] Convert navbar "Get a Quote" button to open modal
- [ ] Convert footer "Schedule a Call" to open modal or GHL booking widget
- [ ] Test across all 20 pages

### Phase 3: Secondary Forms
- [ ] Wire contact form (`contact/index.html`) to GHL inquiry webhook
- [ ] Wire policy request form (`policy-request/index.html`) to GHL service webhook
- [ ] Wire newsletter form (`onepointblog/index.html`) to GHL email capture
- [ ] Wire resume-quote modal to GHL contact lookup (if supported)

### Phase 4: Tracking & Attribution
- [ ] Add UTM parameter passthrough from URL to GHL payload
- [ ] Add `page_url` and `referrer` to every submission
- [ ] Set up GHL pipeline stages matching the quote flow
- [ ] Configure GHL automations (email confirmations, advisor notifications, follow-up sequences)

---

## File Reference

| File | What it contains | GHL touchpoints |
|------|-----------------|-----------------|
| `quote-modal.js` | Shared 3-step quote modal | **PRIMARY** — embed GHL here |
| `index.html` | Homepage | 1 hero form + 5 CTA buttons |
| `auto/index.html` | Auto product page | 1 hero form + 1 picker form + 3 bundle cards + 4 CTAs |
| `home/index.html` | Homeowners product page | 1 hero form + 1 picker form + 3 bundle cards + 4 CTAs |
| `health/index.html` | Health product page | 1 hero form + 1 picker form + 3 bundle cards + 4 CTAs |
| `life/index.html` | Life product page | 1 hero form + 1 picker form + 3 bundle cards + 4 CTAs |
| `disability/index.html` | Disability product page | 1 hero form + 1 picker form + 3 bundle cards + 4 CTAs |
| `business/index.html` | Business product page | 1 hero form + 1 picker form + 3 bundle cards + 4 CTAs |
| `contact/index.html` | Contact page | 1 contact form (separate GHL webhook) |
| `policy-request/index.html` | Policy request page | 1 service form (separate GHL webhook) |
| `onepointblog/index.html` | Blog index | 1 newsletter form (GHL email capture) |
| `client-services/index.html` | Client services | 7 service action cards (link to GHL or appointment) |
| `about/index.html` | About page | 2 CTA buttons |
| `partners/index.html` | Carrier directory | 1 CTA button |
| `terms/index.html` | Terms of Use | 0 forms |
| `privacy/index.html` | Privacy Policy | 0 forms |
| `post/*/index.html` (5 files) | Blog posts | 1 CTA button each |
