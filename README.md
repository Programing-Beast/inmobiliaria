# Inmobiliaria Portal

Resident and admin portal for building operations, including reservations, incidents, finances, documents, announcements, approvals, and catalog sync with an external Portal API.

The frontend is built with React, Vite, TypeScript, Tailwind CSS, Radix UI, TanStack Query, and i18next. Local application data is stored in Turso/LibSQL, while the project also includes legacy Supabase SQL references under `supabase/`.

## Features

- Authentication with local Turso-backed credentials
- Role-based access for `owner`, `tenant`, `regular_user`, and `super_admin`
- Building, unit, and amenity management
- Reservation flows for residents and admins
- Reservation approvals
- Incident creation and tracking
- Financial summary and payments view
- Announcements and announcement detail pages
- Documents view
- Profile and unit switching
- English and Spanish localization
- External Portal API integration with retry queue for failed sync jobs

## Tech Stack

- React 18
- TypeScript 5
- Vite 5
- React Router DOM 6
- TanStack Query 5
- Tailwind CSS 3
- Radix UI
- shadcn/ui-style component structure
- Lucide React
- i18next + react-i18next
- Turso / LibSQL
- Vitest + Testing Library
- ESLint
- Vercel configuration (`vercel.json`)

## Project Structure

```text
.
├── public/                  # Static assets
├── src/
│   ├── components/          # Reusable UI and app components
│   ├── contexts/            # React context providers
│   ├── hooks/               # Custom hooks
│   ├── i18n/                # Translation config and locale files
│   ├── lib/                 # Database, Portal API, sync, helpers
│   ├── pages/               # Route-level screens
│   └── test/                # Test utilities and setup
├── supabase/                # Legacy SQL/RLS reference files
├── turso/                   # Schema, migrations, seeding scripts
├── index.html
├── package.json
├── tailwind.config.ts
├── vite.config.ts
└── vercel.json
```

## Requirements

- Node.js 18 or newer
- npm 9 or newer

`npm` is the documented package manager because this repository contains a `package-lock.json`, although `yarn.lock` and `bun.lockb` are also present.

## Installation

1. Install dependencies:

```bash
npm install
```

2. Create a `.env` file in the project root:

```env
VITE_TURSO_DATABASE_URL=libsql://your-database.turso.io
VITE_TURSO_AUTH_TOKEN=your-turso-auth-token

VITE_PORTAL_API_BASE_URL=https://desarrollo.app.kove.com.py/ords/inmobiliaria_view/portal
VITE_APEX_API_USER=your-apex-api-user
VITE_APEX_API_PASSWORD=your-apex-api-password

# Optional Portal endpoint overrides
VITE_PORTAL_DASHBOARD_INCIDENTS_PATH=dashboard/incidencias
VITE_PORTAL_DASHBOARD_EXPENSAS_PATH=dashboard/expensas
VITE_PORTAL_DASHBOARD_RESERVAS_PATH=dashboard/reservas
VITE_PORTAL_DASHBOARD_COMUNICADOS_PATH=dashboard/comunicados
VITE_PORTAL_APPROVALS_RESERVATIONS_PATH=approvals/reservations
VITE_PORTAL_FINANZAS_RESUMEN_PATH=finanzas/resumen
VITE_PORTAL_FINANZAS_PAGOS_PATH=finanzas
VITE_PORTAL_FINANZAS_PDF_PATH=download/pdf

# Optional upload configuration
VITE_UPLOAD_PROVIDER=cloudinary
VITE_CLOUDINARY_CLOUD_NAME=your-cloud-name
VITE_CLOUDINARY_UPLOAD_PRESET=your-upload-preset
VITE_CLOUDINARY_FOLDER=amenity-rules
VITE_UPLOAD_MAX_MB=10
```

3. Start the development server:

```bash
npm run dev
```

The app will usually be available at `http://localhost:5173`.

## Database Setup

This project currently uses Turso/LibSQL for app data.

1. Create a Turso database and token.
2. Add `VITE_TURSO_DATABASE_URL` and `VITE_TURSO_AUTH_TOKEN` to `.env`.
3. Run migrations:

```bash
npm run db:migrate
```

4. Seed demo users if needed:

```bash
npm run db:seed
```

5. Run both in sequence:

```bash
npm run db:setup
```

`supabase/` still exists for historical schema and RLS reference, but runtime app code is wired to Turso through [src/lib/turso.ts](/home/leadermalang/Desktop/inmobiliaria/src/lib/turso.ts:1) and [src/lib/supabase.ts](/home/leadermalang/Desktop/inmobiliaria/src/lib/supabase.ts:1).

## Available Scripts

- `npm run dev` starts the Vite dev server
- `npm run build` creates a production build
- `npm run build:dev` creates a development-mode build
- `npm run preview` previews the production build locally
- `npm run lint` runs ESLint
- `npm run test` runs Vitest
- `npm run test:watch` runs Vitest in watch mode
- `npm run test:coverage` runs test coverage
- `npm run db:migrate` applies Turso schema and pending SQL migrations
- `npm run db:seed` seeds demo users
- `npm run db:setup` runs migration plus seed

## Main Application Areas

- `Dashboard`: high-level resident/admin overview
- `Finanzas`: owner financial records and summaries
- `Reservas`: amenity reservations
- `ReservationsManagement`: admin/owner reservation management
- `Incidencias`: incident submission and tracking
- `Comunicados`: announcements list and detail view
- `AdminPanel`: administrative actions
- `BuildingsManagement`, `UnitsManagement`, `AmenitiesManagement`: property catalog administration
- `PermissionsManagement` and `RolesManagement`: access control screens

## Portal API Integration

Portal API requests are handled in [src/lib/portal-api.ts](/home/leadermalang/Desktop/inmobiliaria/src/lib/portal-api.ts:1).

Notable integrations include:

- `auth/login`
- `dashboard/expensas`
- `dashboard/reservas`
- `dashboard/incidencias`
- `dashboard/comunicados`
- `finanzas`
- `finanzas/resumen`
- `approvals/reservations`
- `propiedades`
- `unidades/:propertyId`
- `amenity/:propertyId`

Failed write operations can be queued and retried through [src/lib/portal-sync.ts](/home/leadermalang/Desktop/inmobiliaria/src/lib/portal-sync.ts:1).

## Testing

Run the test suite with:

```bash
npm run test -- --run
```

Focused test files also exist for:

- `src/components/__tests__`
- `src/pages/__tests__`
- `src/lib/__tests__`

## Verification Status

These checks were verified in the current workspace:

- `npm install`
- `npm run build`
- `npx vitest run src/components/__tests__/components.test.tsx`
- `npx vitest run src/lib/__tests__/portal-api.test.ts src/lib/__tests__/portal-sync.test.ts`

Note: `npm run lint` currently reports a large pre-existing TypeScript/ESLint backlog in the codebase, mostly around `any` usage and legacy compatibility wrappers. That is broader than a README update and should be handled as a dedicated cleanup pass.

## Deployment

The repo includes [vercel.json](/home/leadermalang/Desktop/inmobiliaria/vercel.json:1) and `public/_redirects`, which suggests deployment is intended to work on Vercel or other static hosting setups compatible with SPA routing.

Typical deployment flow:

```bash
npm install
npm run build
```

Deploy the generated `dist/` output.

## Notes

- The app uses localStorage-backed session compatibility helpers in the Turso layer.
- File uploads are designed around an external provider such as Cloudinary.
- The repository contains local modifications in some UI files outside this README update; those were preserved.
