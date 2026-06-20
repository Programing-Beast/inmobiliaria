# Project Proposal
## Portal de Residentes — React Native Android Application

---

| | |
|---|---|
| **Prepared by** | Hassan Ali |
| **Prepared for** | \[Client Name\] |
| **Date** | May 7, 2026 |
| **Version** | 1.0 |
| **Project Reference** | INMOB-MOB-2026 |

---

## Table of Contents

1. Executive Summary
2. Project Scope
3. Technical Approach
4. Detailed Timeline & Feature Breakdown
5. Investment & Cost Breakdown
6. Deliverables
7. Client Acceptance Testing (UAT)
8. Post-Delivery Support
9. Terms & Conditions
10. Acceptance & Sign-Off

---

## 1. Executive Summary

This proposal outlines the development of a native Android mobile application for the **Portal de Residentes** platform — a residential property management system currently operating as a web application.

The mobile application will deliver the full feature set of the existing web platform to Android devices, enabling residents, owners, and administrators to manage their properties, make reservations, report incidents, review finances, and stay informed about building announcements — all from their smartphones.

The project is estimated at **4 to 6 weeks** of active development, with a total investment of **$1,400 – $1,600 USD**. Following delivery, a dedicated **1-month production support period** is included to address any bugs or issues that arise in live usage.

---

## 2. Project Scope

### 2.1 In Scope

The Android application will include the following functional modules, mirroring the existing web application:

| # | Module | Description |
|---|---|---|
| 1 | Authentication | Login, register, forgot password, reset password, change password |
| 2 | Dashboard | Incidents summary, announcements, reservation overview |
| 3 | Announcements | List and detail view of building communications |
| 4 | Reservations | Browse amenities, check availability, create and track reservations |
| 5 | Incidents | Submit new incidents/tickets, track status of existing ones |
| 6 | Finances | Financial summary, payment history, invoice PDF viewer |
| 7 | Profile | View and update personal profile, change password |
| 8 | Approvals | Admin/owner approval of pending reservations |
| 9 | Admin Panel | Super-admin access to manage buildings, units, amenities, roles |
| 10 | Role-Based Access | Screen and feature visibility controlled by user role (owner, tenant, super_admin, regular_user) |

### 2.2 Out of Scope

The following items are **not included** in this proposal:

- iOS (iPhone/iPad) version
- Changes to the existing web application
- Changes to the back-end Portal API server
- New backend features or database migrations
- App Store (Google Play) submission and publishing fees
- Push notification infrastructure (can be quoted separately)
- Offline mode / full offline sync

---

## 3. Technical Approach

The Android application will be built using **React Native with Expo**, consuming the existing **Portal API** directly. No backend changes are required.

### 3.1 Stack

| Layer | Technology |
|---|---|
| Framework | React Native (Expo SDK 52) |
| Language | TypeScript 5 |
| Navigation | React Navigation v6 (Stack + Bottom Tabs + Drawer) |
| Server State | TanStack Query v5 |
| Secure Storage | Expo SecureStore (replaces browser localStorage) |
| Styling | NativeWind (Tailwind CSS for React Native) |
| Internationalisation | i18next + react-i18next (English / Spanish) |
| PDF Viewing | Expo Print / react-native-pdf |
| Build & Distribution | Expo EAS Build — `.apk` / `.aab` |

### 3.2 API Integration

The mobile app connects to the same **Portal API** (`https://desarrollo.app.kove.com.py/ords/inmobiliaria_view/portal`) already used by the web app:

- **Login** — `POST auth/login` with `Authorization: Basic` header (gateway credential) + user credentials in body
- **All protected endpoints** — `Authorization: Bearer <jwt>` token, stored securely on device
- **Token lifecycle** — automatic refresh on expiry, same retry logic as the web client

---

## 4. Detailed Timeline & Feature Breakdown

**Total duration: 4 – 6 weeks**
*(Week 5 and 6 are buffer/QA weeks that activate if complexity or feedback requires it.)*

---

### Week 1 — Foundation & Authentication

**Goal:** Runnable app shell with working login and secure token management.

| Task | Detail |
|---|---|
| Project scaffolding | Expo init, folder structure, TypeScript config, NativeWind setup |
| API client port | Adapt `portal-api.ts` from web: replace `localStorage` with `SecureStore`, verify all auth helpers work |
| AuthContext port | Port `AuthContext.tsx` from web — `signIn`, `signOut`, `signUp`, `refreshProfile` |
| Navigation shell | Unauthenticated stack (Login / Register / Forgot Password) + authenticated Tab navigator with placeholder screens |
| Login screen | Email + password form, error states, loading indicator, redirect to Dashboard on success |
| Register screen | Full name, email, password, confirm password, success redirect |
| Forgot Password screen | Email input, API call, confirmation message |
| Reset Password screen | Token + new password form |
| Secure token storage | JWT stored in `SecureStore`, expiry tracking, auto-refresh on 401 |

**End-of-week milestone:** A user can install the app, register, log in, and be taken to the (empty) dashboard.

---

### Week 2 — Dashboard & Announcements

**Goal:** The home screen shows live data; announcements are fully browsable.

| Task | Detail |
|---|---|
| Dashboard screen | Incidents summary card, recent announcements list, reservation status overview |
| Role-aware greeting | Welcome message personalised by unit and role |
| Announcements list | Paginated list of `dashboard/comunicados`, pull-to-refresh |
| Announcement detail | Full content view for a single announcement (`comunicados/{id}`) |
| Unit switcher | Dropdown to switch active unit (multi-unit users) |
| i18n integration | English / Spanish language switch, ported translation files |
| Empty & error states | Skeleton loaders, "no data" placeholders, network error banners |

**End-of-week milestone:** Dashboard and announcements are fully functional with real API data.

---

### Week 3 — Reservations & Incidents

**Goal:** Users can submit and track reservations and incidents from their phone.

| Task | Detail |
|---|---|
| Amenity list screen | Browse amenities per property (`amenity/{propertyId}`) |
| Amenity availability | Date/time picker wired to `reservas/amenities/{id}/availability` |
| Create reservation | Multi-step form — amenity, date, time, guest count, confirm |
| Reservations list | Own reservations with status badges (pending / approved / rejected) |
| Approvals screen | Admin/owner list of pending reservations (`approvals/reservations`) |
| Approve / reject action | One-tap approve or reject with confirmation modal |
| Incidents list | Paginated list from `dashboard/incidencias`, pull-to-refresh |
| Create incident | Form — property, unit, title, description, submit |
| Incident status tracking | Status badge display (open / in_progress / resolved / closed) |

**End-of-week milestone:** Reservations and incidents modules are end-to-end functional.

---

### Week 4 — Finances, Profile & Admin

**Goal:** Owners can review finances; profile management works; admin tools are accessible.

| Task | Detail |
|---|---|
| Finances summary | Balance summary card from `finanzas/resumen` |
| Payment history | Paginated list of invoices/payments from `finanzas` |
| Invoice PDF viewer | In-app PDF viewer for `download/pdf/{companyId}/{invoiceId}` |
| Finance role guard | Screen and data hidden from non-owner roles |
| Profile screen | Display full name, email, role, unit(s) |
| Change password | Old password + new password form wired to `auth/change-password` |
| Admin panel | Buildings, Units, Amenities management screens (super_admin only) |
| Role guard component | `<RoleGuard roles={[...]}>` — hides screens/UI for unauthorised roles |
| Admin drawer navigation | Side drawer for super_admin linking to admin-only screens |
| Permissions & Roles management | Read-only views of role and permission tables |

**End-of-week milestone:** All 10 modules are functional. App is feature-complete.

---

### Week 5 — QA, Polish & Build (Buffer Week 1)

**Goal:** Production-ready build delivered for client UAT.

| Task | Detail |
|---|---|
| Full regression testing | Manual test of all screens across role types (owner, tenant, super_admin, regular_user) |
| Edge case handling | Empty states, network errors, expired tokens, large data sets |
| UI consistency pass | Spacing, typography, colour, icon review across all screens |
| Performance check | FlatList optimisation, query caching tuning, image loading |
| Android permissions | Camera, file storage permissions where applicable |
| `.apk` build | Signed debug build via Expo EAS for UAT distribution |
| UAT document | Test case checklist prepared for client (see Section 7) |

**End-of-week milestone:** Signed `.apk` delivered to client. UAT period begins.

---

### Week 6 — UAT Fixes & Final Release (Buffer Week 2)

*Activated if UAT feedback requires changes within the agreed scope.*

| Task | Detail |
|---|---|
| UAT feedback triage | Categorise reported items: bug vs. out-of-scope change request |
| In-scope bug fixes | Address all confirmed bugs from client UAT |
| Final regression | Re-test fixed areas |
| Production `.aab` build | Signed Android App Bundle for Google Play or direct distribution |
| Handover package | Source code, environment config guide, build instructions |

**End-of-week milestone:** Final production build delivered. Project closed.

---

## 5. Investment & Cost Breakdown

| Item | Cost (USD) |
|---|---|
| Week 1 — Foundation & Authentication | $250 |
| Week 2 — Dashboard & Announcements | $200 |
| Week 3 — Reservations & Incidents | $300 |
| Week 4 — Finances, Profile & Admin | $300 |
| Week 5 — QA, Polish & Build | $200 |
| Week 6 — UAT Fixes & Final Release (buffer) | $200 (if activated) |
| **Minimum (4–5 weeks, no buffer required)** | **$1,400** |
| **Maximum (6 weeks, full buffer activated)** | **$1,600** |

### Payment Schedule

| Milestone | Amount | Trigger |
|---|---|---|
| Project start | **$700** (50%) | Upon proposal sign-off |
| Feature-complete build (end of Week 4) | **$400** (approx. 25–30%) | Delivery of UAT `.apk` |
| Final release build | **Remaining balance** | Delivery of production `.aab` + source code |

> All payments in USD. Bank transfer or agreed payment method. Development does not begin until the first payment is received.

---

## 6. Deliverables

Upon project completion, the client will receive:

| # | Deliverable | Format |
|---|---|---|
| D1 | Android debug build (UAT) | Signed `.apk` file |
| D2 | Android production build | Signed `.aab` (App Bundle) |
| D3 | Full application source code | Git repository / ZIP archive |
| D4 | Environment configuration guide | Written document |
| D5 | Build & run instructions | Written document |
| D6 | UAT test case checklist | This document, Section 7 |

---

## 7. Client Acceptance Testing (UAT)

### Testing Period: Maximum 2 weeks from delivery of the UAT build

The client is responsible for testing the application using the checklist below. Any issues found must be **reported within the 2-week UAT window** to be treated as in-scope bugs covered under this agreement.

Reports submitted after the 2-week UAT window will be assessed case-by-case and may be billed separately or covered under the post-delivery support period.

---

### UAT Test Case Checklist

Testers should use the following checklist. For each case, mark: **PASS**, **FAIL**, or **N/A** (not applicable to your role). Include a screenshot and description for any FAIL.

---

#### Module 1 — Authentication

| # | Test Case | Expected Result |
|---|---|---|
| A-01 | Open the app for the first time | Splash screen appears, then Login screen loads |
| A-02 | Attempt login with incorrect password | Error message displayed; user stays on Login screen |
| A-03 | Login with valid owner credentials | Redirected to Dashboard; correct name and unit displayed |
| A-04 | Login with valid tenant credentials | Redirected to Dashboard; Finance tab is NOT visible |
| A-05 | Login with valid super_admin credentials | All tabs and Admin drawer are visible |
| A-06 | Tap "Forgot Password" | Forgot Password screen opens |
| A-07 | Submit forgot password with registered email | Success confirmation message shown |
| A-08 | Submit forgot password with unregistered email | Appropriate error message shown |
| A-09 | Register a new account with valid data | Account created; user redirected to Login or Dashboard |
| A-10 | Register with an already-used email | Error message indicating email is already registered |
| A-11 | Log out from Profile screen | User returned to Login screen; protected screens no longer accessible |
| A-12 | Close and reopen the app while logged in | User remains logged in; Dashboard loads automatically |

---

#### Module 2 — Dashboard & Announcements

| # | Test Case | Expected Result |
|---|---|---|
| B-01 | Dashboard loads after login | Incidents summary, announcements, and reservations sections visible |
| B-02 | Dashboard shows correct unit name | Currently selected unit is displayed in greeting |
| B-03 | Pull down to refresh Dashboard | Data reloads; loading indicator shown |
| B-04 | Tap an announcement from the Dashboard | Announcement detail screen opens with full content |
| B-05 | Switch unit (multi-unit user) | Dashboard data refreshes to reflect the newly selected unit |
| B-06 | Open app with no internet | Error state or cached data shown; no crash |
| B-07 | Switch language (EN ↔ ES) | All text on Dashboard updates to selected language |

---

#### Module 3 — Reservations

| # | Test Case | Expected Result |
|---|---|---|
| C-01 | Navigate to Reservations tab | Amenity list loads |
| C-02 | Tap an amenity | Availability calendar/time picker opens |
| C-03 | Select a date and time that is available | Time slot shown as selectable; form proceeds |
| C-04 | Select a date and time that is already booked | Slot shown as unavailable; user cannot proceed |
| C-05 | Complete and submit a reservation form | Success message; reservation appears in list with "Pending" status |
| C-06 | Submit a reservation with missing required fields | Validation errors shown on relevant fields |
| C-07 | View own reservations list | All past and upcoming reservations listed with correct status |
| C-08 | Admin/owner opens Approvals screen | Pending reservations list loads |
| C-09 | Admin approves a reservation | Status updates to "Approved"; removed from pending list |
| C-10 | Admin rejects a reservation | Status updates to "Rejected"; removed from pending list |

---

#### Module 4 — Incidents

| # | Test Case | Expected Result |
|---|---|---|
| D-01 | Navigate to Incidents tab | List of incidents loads |
| D-02 | Tap "New Incident" | Incident creation form opens |
| D-03 | Submit a new incident with all required fields | Success message; incident appears in list with "Open" status |
| D-04 | Submit incident with missing title or description | Validation error shown |
| D-05 | Pull to refresh incidents list | Data reloads correctly |
| D-06 | Incident status is correctly displayed | Status badge matches the actual status (Open / In Progress / Resolved) |

---

#### Module 5 — Finances *(owner and super_admin only)*

| # | Test Case | Expected Result |
|---|---|---|
| E-01 | Navigate to Finances tab as owner | Financial summary card loads with balance data |
| E-02 | Finances tab as tenant | Tab is NOT visible; navigating directly shows unauthorised message |
| E-03 | Payment history list loads | Invoices and receipts listed with amounts, dates, and status |
| E-04 | Tap "View PDF" on an invoice | PDF opens in the in-app viewer |
| E-05 | Pull to refresh Finances screen | Data reloads correctly |
| E-06 | Overdue items display correctly | Overdue status shown in red or with appropriate indicator |

---

#### Module 6 — Profile

| # | Test Case | Expected Result |
|---|---|---|
| F-01 | Open Profile screen | Full name, email, role, and unit displayed correctly |
| F-02 | Change password with correct old password | Success message; user can log in with new password |
| F-03 | Change password with wrong old password | Error message shown; password not changed |
| F-04 | Change password with mismatched new/confirm fields | Validation error shown before API call is made |

---

#### Module 7 — Admin Panel *(super_admin only)*

| # | Test Case | Expected Result |
|---|---|---|
| G-01 | Open Admin drawer as super_admin | Buildings, Units, Amenities, Roles, Approvals links visible |
| G-02 | Admin drawer as owner or tenant | Admin-only items are NOT visible |
| G-03 | Open Buildings Management | Buildings list loads |
| G-04 | Open Units Management | Units list loads |
| G-05 | Open Amenities Management | Amenities list loads |
| G-06 | Navigate to Roles Management | Roles list loads |

---

#### Module 8 — General & Cross-Cutting

| # | Test Case | Expected Result |
|---|---|---|
| H-01 | All screens load without crashing on a fresh install | No crashes on first launch sequence |
| H-02 | Back navigation works on all screens | Android back button behaves as expected throughout the app |
| H-03 | Loading indicators appear during API calls | Spinner or skeleton shown while data is fetching |
| H-04 | Network error during any API call | User-friendly error message shown; app does not crash |
| H-05 | Session token expires during use | App automatically refreshes token; user does not need to re-login |
| H-06 | App tested on Android 10, 12, and 14 | No layout breaks or crashes on these OS versions |
| H-07 | App tested on small screen (5-inch) and large screen (6.7-inch) | UI is usable and not broken on either size |

---

### UAT Reporting Instructions

Please report any **FAIL** result by providing:

1. Test case number (e.g. `C-05`)
2. Steps to reproduce
3. Screenshot or screen recording
4. Device model and Android version

Submit all reports to: **hassanali5120@gmail.com** with subject line:
`[INMOB UAT] Bug Report — [Your Name] — [Date]`

---

## 8. Post-Delivery Support

Following final delivery and **payment clearance**, a **1-month production support period** is included at no additional cost.

### What is covered

| Type | Coverage |
|---|---|
| Crashes | Any application crash encountered in normal usage |
| Functional bugs | Features not working as described in this proposal's scope |
| API integration bugs | Issues arising from the Portal API returning unexpected responses |
| Authentication bugs | Login failures, token issues, or session problems |
| UI rendering issues | Layout or display errors on supported Android versions |

### What is NOT covered

| Type | Notes |
|---|---|
| New features | Any functionality not described in Section 2 of this proposal |
| Back-end / API changes | Issues caused by changes made to the Portal API server after delivery |
| Device-specific issues | Devices running Android versions below 10, or heavily customised OEM Android builds |
| Issues from client modifications | Bugs introduced by changes the client or a third party makes to the source code |

### Support Terms

- **Response time:** Within 2 business days of a reported issue
- **Fix deployment:** Within 5 business days for confirmed in-scope bugs
- **Channel:** Email to `hassanali5120@gmail.com` with subject `[INMOB SUPPORT] Issue — [Description]`
- **Support period start date:** The calendar date on which final payment is confirmed and the production build is delivered
- **Support period end date:** 30 calendar days from the start date

After the 1-month support period, ongoing maintenance can be arranged under a separate maintenance agreement.

---

## 9. Terms & Conditions

1. **Project start** is conditional on receipt of the first payment (50% deposit).
2. **Scope changes** requested after Week 2 may impact timeline and cost; changes will be assessed and quoted separately before implementation.
3. **Client responsibilities:** The client must provide timely access to test credentials, feedback during UAT, and payment at each milestone. Delays on the client side may extend the timeline without additional cost to the client.
4. **IP ownership:** Upon final payment, full ownership of the source code and build artefacts transfers to the client.
5. **Confidentiality:** All project information, API credentials, and business logic shared during the engagement will be treated as confidential and not disclosed to third parties.
6. **Warranty:** The post-delivery support period described in Section 8 constitutes the full warranty for this engagement.
7. **Governing law:** This agreement is subject to the laws of the jurisdiction agreed upon by both parties.

---

## 10. Acceptance & Sign-Off

By signing below, both parties agree to the scope, timeline, costs, and terms outlined in this proposal.

---

**Service Provider**

Name: \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

Signature: \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

Date: \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

---

**Client**

Name: \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

Company: \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

Signature: \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

Date: \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

---

*Portal de Residentes — React Native Android Proposal v1.0 — May 7, 2026*
*Prepared by Hassan Ali · hassanali5120@gmail.com*
