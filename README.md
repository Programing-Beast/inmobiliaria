# Inmobiliaria Portal

Resident/admin portal for buildings, units, amenities, reservations, incidents, approvals, finances, and communications. The app syncs write operations to the external Portal API first and then stores them locally in Turso; failed API writes are queued for retry.

## Features
- Authentication and role-based access (owner/tenant/admin)
- Buildings, units, amenities (read-only, synced from Portal API)
- Reservations (user + admin) with approval flow
- Incidents creation + status updates
- Communications, documents, and finances views
- External Portal API integration with queued retries
- Portal catalog sync (properties -> units -> amenities)
- Pagination for portal catalog (page/limit headers)
- i18n (Spanish/English)

## Portal API Mapping
- `auth/login` -> `portalLogin` (auto token + role sync in `src/lib/portal-api.ts`)
- `dashboard/expensas` -> Dashboard stats (`src/pages/DashboardW3CRM.tsx`)
- `dashboard/reservas` -> Dashboard upcoming reservations
- `dashboard/incidencias` -> Incidents list (`src/pages/Incidencias.tsx`)
- `dashboard/comunicados` -> Announcements list (`src/pages/Comunicados.tsx`)
- `finanzas` -> Finance/invoices list (`src/pages/Finanzas.tsx`)
- `finanzas/resumen` -> Financial summary (Owner only, Dashboard)
- `approvals/reservations` -> Reservation approvals (`src/pages/Aprobaciones.tsx`)
- `comunicados/:id` -> Announcement detail (`src/pages/Comunicados.tsx`)
- `propiedades` -> Buildings sync (`src/pages/BuildingsManagement.tsx`)
- `unidades/:propertyId` -> Units sync (`src/pages/UnitsManagement.tsx`)
- `amenity/:propertyId` -> Amenities sync (`src/pages/AmenitiesManagement.tsx`)
- `reservas/amenities/:id/info` -> Amenity info (Resident reservations)
- `reservas/amenities/:id/availability` -> Availability slots (Resident reservations)

## User Guide (Quick)
1) Sign in with your email + password.
2) Residents (Owner/Tenant/Regular):
   - View announcements and incidents.
   - Create reservations from `Reservations`.
3) Owners:
   - Access finances and financial summary.
4) Admins (Super Admin):
   - Manage users, roles, permissions.
   - Sync buildings/units/amenities and approve reservations.

## Tech Stack
- Vite + React + TypeScript
- TanStack Query
- Tailwind + Radix UI
- Turso/LibSQL
- Vitest + React Testing Library

## Requirements
- Node.js 18+
- npm/yarn/pnpm

## Installation
1) Install dependencies
```bash
npm install
```

2) Create `.env` in the project root
```env
VITE_TURSO_DATABASE_URL=libsql://your-db.turso.io
VITE_TURSO_AUTH_TOKEN=your-turso-auth-token
VITE_PORTAL_API_BASE_URL=https://desarrollo.app.kove.com.py/ords/inmobiliaria_view/portal
```

3) Run the app
```bash
npm run dev
```

## Portal Catalog Sync
Buildings, units, and amenities are fetched from the Portal API and stored locally. These screens are read-only.

Pagination uses `page` and `limit` headers as defined by the Portal API. Units and amenities are fetched per building only.

If a portal ID is missing on a local record, reservation/incident creation will fail with a mapping error and will not enqueue.

## Scripts
- `npm run dev` - start dev server
- `npm run build` - production build
- `npm run preview` - preview build
- `npm run lint` - lint
- `npm run test` - run Vitest
- `npm run test:watch` - run Vitest in watch mode
- `npm run test:coverage` - run Vitest coverage

## Testing
Vitest + React Testing Library are configured. Tests cover `src/pages` and custom components in `src/components` and `src/components/w3crm`.

```bash
npm run test
```

## Sync Queue
Failed Portal API writes are stored in a local queue. Use the Sync Queue panel in the Admin screen to view and retry pending jobs.

## Local Smoke Test Checklist
- Login with each role (owner, tenant, super_admin, regular_user).
- Dashboard loads and role-specific cards hide/show correctly.
- Reservations (resident) create flow:
  - Amenity availability shows slots.
  - Unavailable slot blocks submission.
- Reservations (admin) list loads and updates status.
- Incidents create + update status.
- Communications list + detail view.
- Finance list and export (Owner only).
- Approvals page (Super Admin) approves a pending reservation.
- Build completes: `npm run build`.

## Turso Migration & Seeding
1) Ensure `.env` has the Turso credentials:
```env
VITE_TURSO_DATABASE_URL=libsql://your-db.turso.io
VITE_TURSO_AUTH_TOKEN=your-turso-auth-token
```

2) Run the migration script:
```bash
node turso/migrate.js
```

3) Seed demo users:
```bash
node turso/seed-users.js
```
