# VIEW Inmobiliaria — Resident Portal

A resident and building management portal for VIEW, a real estate company in Paraguay. Residents (owners and tenants) log in to make reservations, file incidents, view announcements, and access financial documents. Building administrators review and approve requests through the KOVE/APEX backend.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 18 + TypeScript 5 + Vite 5 |
| Routing | React Router 6 |
| Styling | Tailwind CSS 3 + shadcn/ui (Radix UI) |
| Icons | Lucide React |
| i18n | i18next (Spanish + English) |
| Local DB | Turso (LibSQL / SQLite at the edge) |
| Backend API | KOVE / Oracle APEX (`https://kove.app.kove.com.py/ords/inmobiliaria_view/portal`) |
| Deployment | Vercel (SPA, `dev` branch → preview, `main` branch → production) |

---

## Prerequisites

- Node.js 18+
- npm 9+
- A Turso account and database (or the team's shared `.env` values)
- Access to the KOVE portal credentials

---

## Environment Variables

Create a `.env.local` file in the project root. All variables must be prefixed with `VITE_` to be accessible in the browser bundle.

```env
# ── Turso (Local edge database) ──────────────────────────────────────
VITE_TURSO_DATABASE_URL=libsql://your-db.turso.io
VITE_TURSO_AUTH_TOKEN=eyJ...

# ── KOVE / APEX API ──────────────────────────────────────────────────
# Base URL of the Oracle APEX portal API
VITE_PORTAL_API_BASE_URL=https://kove.app.kove.com.py/ords/inmobiliaria_view/portal

# HTTP Basic credentials for APEX auth endpoints
VITE_APEX_API_USER=your_apex_user
VITE_APEX_API_PASSWORD=your_apex_password

# ── Optional: override individual KOVE endpoint paths ─────────────────
# Only set these if KOVE changes their routing. Defaults are listed.
VITE_PORTAL_DASHBOARD_INCIDENTS_PATH=dashboard/incidencias
VITE_PORTAL_DASHBOARD_EXPENSAS_PATH=dashboard/expensas
VITE_PORTAL_DASHBOARD_RESERVAS_PATH=dashboard/reservas
VITE_PORTAL_DASHBOARD_COMUNICADOS_PATH=dashboard/comunicados
VITE_PORTAL_APPROVALS_RESERVATIONS_PATH=approvals/reservations
VITE_PORTAL_FINANZAS_RESUMEN_PATH=finanzas/resumen
VITE_PORTAL_FINANZAS_PAGOS_PATH=finanzas
VITE_PORTAL_FINANZAS_PDF_PATH=download/pdf

# ── File uploads (optional) ───────────────────────────────────────────
VITE_UPLOAD_PROVIDER=cloudinary
VITE_CLOUDINARY_CLOUD_NAME=your_cloud
VITE_CLOUDINARY_UPLOAD_PRESET=your_preset
VITE_CLOUDINARY_FOLDER=inmobiliaria
VITE_UPLOAD_MAX_MB=10
```

---

## Getting Started

```bash
# 1. Install dependencies
npm install

# 2. Create environment file from the table above
#    (ask the team for the actual values)
cp .env.example .env.local

# 3. Run database migrations (first time only)
npm run db:migrate

# 4. (Optional) Seed demo users
npm run db:seed

# 5. Start the dev server
npm run dev
```

The app runs at `http://localhost:5173`.

---

## NPM Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Start Vite dev server with HMR |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run ESLint |
| `npm run test` | Run Vitest test suite once |
| `npm run test:watch` | Run Vitest in watch mode |
| `npm run test:coverage` | Run tests with coverage report |
| `npm run db:migrate` | Apply Turso schema migrations (`turso/migrate.js`) |
| `npm run db:seed` | Seed demo users into Turso (`turso/seed-users.js`) |
| `npm run db:setup` | Run migrate + seed in sequence |

---

## Architecture

```
Browser
  │
  ├── AuthContext (src/contexts/AuthContext.tsx)
  │     ├── Authenticates via KOVE /auth/login
  │     ├── Stores portalProperties[], selectedProperty, portalUnits[]
  │     └── Caches role + properties in localStorage
  │
  ├── PropertySelector (src/components/PropertySelector.tsx)
  │     └── Header dropdown — sets AuthContext.selectedProperty
  │         All four data pages subscribe to this value
  │
  ├── Pages (src/pages/)
  │     ├── Fetch live data from KOVE via src/lib/portal-api.ts
  │     ├── Filter by AuthContext.selectedProperty
  │     └── Cache building/unit/amenity catalog in Turso
  │
  └── Turso (src/lib/turso.ts  +  src/lib/portal-sync.ts)
        ├── Stores: users, buildings, units, amenities, reservations, incidents
        ├── Sync direction: KOVE → Turso (one-way, on first load)
        └── Source of truth: KOVE wins on any conflict
```

### Key Patterns

**KOVE is the source of truth.** Role, property assignment, and reservation status always come from KOVE. Turso is a local cache for catalog data (buildings, units, amenities) to avoid repeated KOVE pagination on every page load.

**Cache-before-sync.** Pages check Turso first. If the local table is empty, they fetch from KOVE and sync once. Subsequent visits use Turso — no repeated HTTP calls. Example: `src/pages/Reservas.tsx` `fetchAmenitiesForProperty`.

**Pass-through filter.** KOVE already scopes API responses to the authenticated user. Items with no `idPropiedad` field must pass through (not be filtered out) because KOVE already did the scoping. Every page that filters by property uses this pattern:
```ts
if (propertyId === null && !propertyName) return true; // KOVE-scoped, no property field
```

**Auto-migration.** New Turso columns are added at runtime: `PRAGMA table_info` checks if the column exists; if not, `ALTER TABLE` adds it. No manual SQL needed after deploy. See `hasAmenitiesTypeColumn()` in `src/lib/turso.ts`.

**Shared property selector.** `AuthContext.selectedProperty` holds the active building. `PropertySelector` in the Header sets it. All pages (Reservas, Incidencias, Comunicados, Finanzas) read it from `useAuth()` and filter their data accordingly.

---

## Source Layout

```
src/
├── App.tsx                  # Route tree + role guards
├── main.tsx                 # React root, i18n init
├── index.css                # Global styles (Tailwind base + custom vars)
│
├── assets/                  # Static images (logo, backgrounds)
│
├── contexts/
│   └── AuthContext.tsx      # Auth state, selectedProperty, setCurrentUnit
│
├── components/
│   ├── ui/                  # shadcn/ui primitives (Button, Select, Card…)
│   ├── w3crm/               # W3CRM design-system wrappers (StatCard, DataCard…)
│   ├── Header.tsx           # Top nav — includes PropertySelector
│   ├── Sidebar.tsx          # Left nav — role-gated menu items
│   ├── PropertySelector.tsx # Shared building dropdown (multi-property users only)
│   ├── OwnerContextSwitcher.tsx  # Unit switcher for owners with multiple units
│   ├── UnitSwitcher.tsx     # Unit switcher dropdown
│   ├── ProtectedRoute.tsx   # Redirects unauthenticated to /login
│   ├── RoleGuard.tsx        # Renders 403 if role not in allowed list
│   ├── Unauthorized.tsx     # 403 page component
│   ├── SyncQueuePanel.tsx   # Displays failed-sync queue status
│   └── NavLink.tsx          # React Router NavLink wrapper
│
├── pages/
│   ├── MainLayout.tsx       # Authenticated shell (Header + Sidebar + Outlet)
│   ├── Login.tsx            # Login form → KOVE /auth/login
│   ├── Register.tsx         # Registration → KOVE /auth/register + building/unit fields
│   ├── ForgotPassword.tsx   # Forgot password flow
│   ├── ResetPassword.tsx    # Reset via KOVE token
│   ├── DashboardW3CRM.tsx   # Home (stats, upcoming reservations, activity)
│   ├── Reservas.tsx         # Amenity reservations (tenant + owner)
│   ├── ReservationsManagement.tsx  # Admin reservation approval view
│   ├── Incidencias.tsx      # Incident filing and tracking
│   ├── Comunicados.tsx      # Announcement list
│   ├── ComunicadoDetalle.tsx # Announcement detail + PDF download
│   ├── Finanzas.tsx         # Financial documents (invoices, receipts)
│   ├── Documentos.tsx       # Document repository
│   ├── Aprobaciones.tsx     # Admin approval workflow
│   ├── AdminPanel.tsx       # Admin overview
│   ├── BuildingsManagement.tsx  # CRUD for buildings
│   ├── UnitsManagement.tsx  # CRUD for units
│   ├── AmenitiesManagement.tsx  # CRUD for amenities
│   ├── PermissionsManagement.tsx # Role-permission matrix
│   ├── RolesManagement.tsx  # Role assignment
│   ├── Profile.tsx          # User profile + language selector
│   └── NotFound.tsx         # 404 page
│
├── lib/
│   ├── portal-api.ts        # All KOVE API calls (portalRequest, portalLogin…)
│   ├── portal-sync.ts       # Sync helpers (createReservationSynced, syncPortalAmenitiesForBuilding…)
│   ├── portal-availability.ts  # Reservation slot normalisation
│   ├── turso.ts             # Turso/LibSQL client + all DB functions
│   ├── supabase.ts          # Backward-compat shim re-exporting turso.ts functions
│   ├── upload.ts            # Cloudinary file upload helper
│   ├── database.types.ts    # TypeScript types (UserRole, ReservationStatus…)
│   ├── i18n-helpers.ts      # useLocalizedField hook
│   └── utils.ts             # cn() and misc utilities
│
├── i18n/
│   ├── config.ts            # i18next initialisation
│   └── locales/
│       ├── en.json          # English strings
│       └── es.json          # Spanish strings (primary)
│
├── hooks/
│   ├── use-mobile.tsx       # useIsMobile() breakpoint hook
│   └── use-toast.ts        # useToast() wrapper
│
└── test/
    └── setup.ts             # Vitest global setup (Testing Library matchers)
```

---

## Authentication Flow

1. User submits email + password on `/login`
2. `AuthContext.handleSignIn` calls `signIn(email, password)` — Turso verifies local password hash
3. On success, calls `ensurePortalAuth(email, { password })` — POSTs to KOVE `/auth/login`
4. KOVE returns `{ token, rol, propiedades[] }` — stored in localStorage
5. `syncPortalRoleToLocalUser()` updates Turso `users.role` to match KOVE role
6. `fetchProfile()` loads profile from Turso, hydrates `portalProperties` from localStorage
7. `selectedProperty` is restored from localStorage or defaults to first property

On every subsequent KOVE API request, `portalRequest()` calls `ensurePortalAuth()`, which checks JWT expiry and silently re-logins if the token is stale.

### Roles

| Role | Access |
|---|---|
| `super_admin` | All data, all buildings, all admin panels |
| `owner` | Own building: reservations, incidents, announcements, finances |
| `tenant` | Own building: reservations, incidents, announcements, finances |
| `regular_user` | Dashboard only |

Roles sync from KOVE on every login. KOVE `"OWNER"` → Turso `"owner"`.

---

## KOVE API Reference

Base URL: `https://kove.app.kove.com.py/ords/inmobiliaria_view/portal`

All requests include `Authorization: Bearer <token>` and a `correo` header (user email), except auth endpoints which use HTTP Basic.

| Method | Path | Purpose |
|---|---|---|
| POST | `/auth/login` | Login — returns token, role, properties |
| POST | `/auth/register` | Register new user (sends `edificio` + `unidad` for admin context) |
| POST | `/auth/forgotpassword` | Send reset link |
| POST | `/auth/resetpassword` | Reset with token |
| GET | `/mis-propiedades` | User's assigned buildings (paginated) |
| GET | `/mis-unidades` | User's assigned units |
| GET | `/dashboard/reservas` | Upcoming reservations |
| GET | `/dashboard/incidencias` | Incident list |
| GET | `/dashboard/comunicados` | Announcements |
| GET | `/amenity/{idPropiedad}` | Amenity catalog for a building |
| GET | `/reservas/amenities/{id}/info` | Amenity hours + capacity |
| GET | `/reservas/amenities/{id}/availability` | Available time slots |
| POST | `/reservas` | Create reservation |
| POST | `/incidencias` | Create incident |
| GET | `/finanzas` | Financial documents (filtered by `correo` param) |
| GET | `/download/pdf/{empresa}/{factura}` | Download invoice PDF |

---

## How to Add a New Page

1. Create `src/pages/MyPage.tsx`
2. Add route in `src/App.tsx` inside the `<MainLayout>` block:
   ```tsx
   <Route path="/my-page" element={<RoleGuard roles={["owner", "tenant"]}><MyPage /></RoleGuard>} />
   ```
3. Add sidebar entry in `src/components/Sidebar.tsx`:
   ```ts
   { key: "my-page", label: t('nav.myPage'), icon: SomeIcon, path: "/my-page", roles: ["owner", "tenant"] }
   ```
4. Add translation keys in `src/i18n/locales/es.json` and `en.json`
5. To filter data by the active property, read from context:
   ```ts
   const { selectedProperty } = useAuth();
   // then filter your API response by selectedProperty.idPropiedad
   ```

---

## How to Add a Translation Key

1. Add the key to `src/i18n/locales/es.json` and `en.json` under the appropriate section
2. Use it: `const { t } = useTranslation(); t('section.myKey')`

---

## How to Add a Turso Column

Use the auto-migration pattern — no manual SQL needed after deploy:

```ts
// In src/lib/turso.ts
let myColumnExists: boolean | null = null;

const hasMyColumn = async (): Promise<boolean> => {
  if (myColumnExists !== null) return myColumnExists;
  try {
    const result = await db.execute({ sql: "PRAGMA table_info(my_table)", args: [] });
    const cols = rowsToObjects<{ name?: string }>(result);
    const exists = cols.some(c => c.name === "my_column");
    if (!exists) await db.execute({ sql: "ALTER TABLE my_table ADD COLUMN my_column TEXT", args: [] });
    myColumnExists = true;
  } catch {
    myColumnExists = false;
  }
  return myColumnExists;
};
```

Then conditionally include `my_column` in `createX()` and `updateX()` (see `hasAmenitiesTypeColumn` for the full pattern).

---

## Deployment

**Branch strategy:**
- `dev` → Vercel preview (auto-deploys on push)
- `main` → Vercel production (merge via GitHub PR from `dev`)

```bash
git push main dev            # push local dev branch to remote
# then open GitHub → PR: dev → main → Merge
```

> Note: the git remote is named `main`, not `origin`. Use `git push main dev` from CLI.

**Vercel env vars** are managed in the Vercel dashboard under Settings → Environment Variables. They mirror the `.env.local` keys listed above.

---

## Database

Schema: `turso/schema.sql`. Migration runner: `turso/migrate.js`.

| Table | Purpose |
|---|---|
| `users` | Accounts, role, building/unit FK |
| `user_roles` | Multiple roles per user |
| `user_units` | Multiple units per user |
| `buildings` | Building catalog (`portal_id` = KOVE `idPropiedad`) |
| `units` | Unit catalog |
| `amenities` | Amenity catalog (auto-synced from KOVE on first page load) |
| `reservations` | Local copy (`portal_id` = KOVE `idReserva`) |
| `incidents` | Local copy |
| `documents` | Building documents |
| `permissions` / `role_permissions` | RBAC matrix |

---

## Known Limitations / Future Work

**Turso removal path:** Turso is a caching layer. If KOVE adds `GET /mis-amenidades` (analogous to `/mis-unidades`), the amenity sync can be removed. Auth session management (password hashing) would need to move to KOVE-token-only. After that, Turso can be dropped entirely.

**Finance property filtering:** KOVE's `/finanzas` only accepts `correo` — no property filter parameter. Property-level filtering is done client-side. If KOVE adds a property param, update `portalGetFinanzasPagos()` in `src/lib/portal-api.ts`.

**`supabase.ts` shim:** This file re-exports Turso functions under old Supabase names for backward compatibility. It can be removed once all imports across the codebase point directly to `turso.ts`.
