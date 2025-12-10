# Supabase Database Setup

This directory contains all database migrations for the Inmobiliaria Platform using the **HYBRID translation approach**.

## Migration Files

1. **001_initial_schema.sql** - Core database schema with tables, enums, indexes, and triggers
2. **002_row_level_security.sql** - RLS policies for multi-tenant security
3. **003_seed_permissions.sql** - Default permissions and role mappings
4. **004_seed_sample_data.sql** - Sample buildings, units, and amenities for testing

## Setup Instructions

### 1. Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Create a new project
3. Wait for the project to be ready (this may take a few minutes)

### 2. Get Your API Credentials

1. Go to **Settings** > **API** in your Supabase project
2. Copy your **Project URL** and **anon/public key**
3. Create a `.env` file in the project root:

```bash
cp .env.example .env
```

4. Add your credentials to `.env`:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### 3. Run Migrations

You have two options to run migrations:

#### Option A: Using Supabase CLI (Recommended)

1. Install Supabase CLI:
```bash
npm install -g supabase
```

2. Login to Supabase:
```bash
supabase login
```

3. Link your project:
```bash
supabase link --project-ref your-project-ref
```

4. Run all migrations:
```bash
supabase db push
```

#### Option B: Manual SQL Execution

1. Go to **SQL Editor** in your Supabase dashboard
2. Run each migration file in order:
   - Copy contents of `001_initial_schema.sql`
   - Paste and run in SQL Editor
   - Repeat for files 002, 003, and 004

### 4. Verify Setup

After running migrations, verify in Supabase dashboard:

1. **Database** > **Tables** - Should see all tables (buildings, users, payments, etc.)
2. **Database** > **Policies** - Should see RLS policies for each table
3. **Authentication** > **Policies** - RLS should be enabled
4. **Table Editor** > **buildings** - Should see 2 sample buildings

## Database Structure

### Core Tables

- **buildings** - Building/condominium information
- **units** - Individual units/apartments within buildings
- **users** - User profiles (extends auth.users)
- **payments** - Payment records with concept types
- **amenities** - Building amenities with HYBRID translations
- **reservations** - Amenity booking system
- **incidents** - Maintenance/complaint tracking
- **announcements** - Building announcements with HYBRID translations
- **documents** - File storage metadata with HYBRID translations
- **permissions** - System permissions
- **role_permissions** - Role-to-permission mappings

### User Roles

1. **regular_user** - Default role on registration
2. **tenant** - Dashboard, Reservations, Incidents
3. **owner** - All tenant permissions + Finance + User Management
4. **super_admin** - All permissions including Approvals

## HYBRID Translation Approach

### Static UI Content (react-i18next)
Buttons, labels, menus, validation messages → Stored in JSON files:
- `src/i18n/locales/es.json`
- `src/i18n/locales/en.json`

### Dynamic Database Content
Admin-created content → Stored in database columns with `_es` and `_en` suffixes:

**Example: Amenities**
```sql
display_name_es: "Quincho Norte"
display_name_en: "North BBQ Area"
rules_es: "Horario: 10:00 - 22:00..."
rules_en: "Hours: 10:00 AM - 10:00 PM..."
```

**Usage in React:**
```typescript
import { useLocalizedField } from '@/lib/i18n-helpers';

const getLocalizedField = useLocalizedField();
const amenityName = getLocalizedField(amenity, 'display_name');
```

### Database Field Convention

✅ **CORRECT** - English database fields:
- Enums: `paid`, `pending`, `overdue`, `invoice_credit`
- Technical names: `quincho_norte`, `piscina`
- Table/column names: `payments`, `reservations`, `user_id`

❌ **INCORRECT** - Spanish database fields:
- ~~`pagado`, `pendiente`, `vencido`~~
- ~~`pagos`, `reservas`, `usuario_id`~~

## Sample Data

The seed migration creates:

### Buildings
- **Edificio Los Robles** (Santiago Centro)
  - 6 units (A-101, A-102, A-201, A-202, B-301, B-302)
  - 5 amenities (2 quinchos, pool, gym, event hall)

- **Condominio Vista Mar** (Viña del Mar)
  - 4 units (1A, 1B, 2A, 2B)
  - 4 amenities (quincho, adult pool, children pool, tennis court)

### Test Users

After running migrations, you can create test users via the Registration form:

**Recommended test users:**
- `owner@test.com` / `owner123` → Role: Owner
- `tenant@test.com` / `tenant123` → Role: Tenant
- `admin@test.com` / `admin123` → Role: Super Admin

## Security Features

### Row Level Security (RLS)

All tables have RLS enabled with policies:

1. **Users see only their building's data**
2. **Owners see all building finances**
3. **Tenants cannot see finances**
4. **Super Admins see everything**

### Helper Functions

- `auth.user_role()` - Get current user's role
- `auth.user_building()` - Get current user's building
- `auth.is_super_admin()` - Check if super admin
- `auth.is_owner()` - Check if owner

## Troubleshooting

### Error: "Missing Supabase environment variables"
- Check that `.env` file exists in project root
- Verify `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set
- Restart dev server: `npm run dev`

### Error: "relation does not exist"
- Migrations haven't been run yet
- Run migrations using CLI or SQL Editor

### Error: "permission denied for table"
- RLS policies may not be set up correctly
- Re-run `002_row_level_security.sql`
- Check that user has correct role assigned

### Users can't see data
- Verify user has `building_id` set in users table
- Check RLS policies are enabled
- Verify user role has correct permissions in role_permissions table

## Next Steps

After database setup:

1. ✅ Create `.env` with Supabase credentials
2. ✅ Run all migrations
3. ⏳ Update Registration form (remove unit field)
4. ⏳ Implement Supabase Auth integration
5. ⏳ Expand i18n translations
6. ⏳ Update Finance module
7. ⏳ Update Reservations module
8. ⏳ Create Announcements module
9. ⏳ Create admin panel
10. ⏳ Test with all roles

## Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [Supabase Auth](https://supabase.com/docs/guides/auth)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
