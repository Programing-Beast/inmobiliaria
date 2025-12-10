# Inmobiliaria Platform - Setup Guide

## 🎯 Overview

This guide will help you set up the Inmobiliaria Platform with Supabase authentication and database.

## ✅ What Has Been Completed

### 1. Supabase Integration ✓
- Complete database schema with HYBRID translation approach
- Row Level Security (RLS) policies for multi-tenant isolation
- Role-permission system
- Sample data seeding scripts

### 2. Authentication System ✓
- AuthContext with React Context API
- ProtectedRoute component for route guarding
- Login with Supabase Auth
- Registration with Supabase Auth
- Logout functionality
- Profile management

### 3. Updated Components ✓
- **Login.tsx** - Integrated with Supabase Auth
- **Register.tsx** - Integrated with Supabase Auth (Tenant role only)
- **Header.tsx** - Uses Auth context for user profile
- **Sidebar.tsx** - Uses Auth context for role-based navigation
- **App.tsx** - Wrapped with AuthProvider and ProtectedRoute

## 🚀 Setup Instructions

### Step 1: Create Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Create a new project
3. Wait for project initialization (2-3 minutes)

### Step 2: Get API Credentials

1. Go to **Settings** → **API** in your Supabase dashboard
2. Copy the following:
   - **Project URL**
   - **anon/public key**

### Step 3: Configure Environment Variables

1. Create `.env` file in the project root:

```bash
cp .env.example .env
```

2. Edit `.env` and add your credentials:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### Step 4: Run Database Migrations

Choose one of these methods:

#### Option A: Supabase CLI (Recommended)

```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Link your project
supabase link --project-ref your-project-ref

# Run migrations
supabase db push
```

#### Option B: SQL Editor (Manual)

1. Go to **SQL Editor** in Supabase dashboard
2. Run each migration file in order:
   - `supabase/migrations/001_initial_schema.sql`
   - `supabase/migrations/002_row_level_security.sql`
   - `supabase/migrations/003_seed_permissions.sql`
   - `supabase/migrations/004_seed_sample_data.sql`

### Step 5: Configure Email Settings (Optional)

For email confirmation on registration:

1. Go to **Authentication** → **Settings** in Supabase dashboard
2. Configure **SMTP Settings** or use Supabase default
3. Enable **Email Confirmations** if desired

**Note:** During development, you can disable email confirmation:
- Go to **Authentication** → **Settings**
- Disable "Enable email confirmations"

### Step 6: Install Dependencies & Run

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

The application will be available at `http://localhost:5173`

## 🧪 Testing the Authentication

### Test User Registration

1. Go to `/register`
2. Fill in the form:
   - Full Name: Test User
   - Email: test@example.com
   - Password: Test123456
   - Confirm Password: Test123456
   - Role: Tenant (default and only option)
   - Accept terms
3. Click **Register**
4. Check your email for confirmation link (if enabled)

### Test User Login

1. Go to `/login`
2. Enter credentials
3. Should redirect to `/dashboard` on success

### Test Role-Based Access

After login, verify:
- **Tenant**: Can access Dashboard, Reservations, Incidents
- **Tenant**: Cannot access Finanzas
- **Owner**: Can access all Tenant features + Finanzas
- **Super Admin**: Can access everything including Aprobaciones

## 🔐 Creating Test Users

### Method 1: Via Registration (Tenant only)

Use the `/register` page - this creates **Tenant** users only.

### Method 2: Via Supabase Dashboard

For Owner or Super Admin accounts:

1. Go to **Authentication** → **Users** in Supabase dashboard
2. Click **Add User**
3. Enter email and password
4. After creation, go to **Table Editor** → **users** table
5. Find the user by email
6. Update the `role` column to `owner` or `super_admin`

### Method 3: Via SQL (Create all test users at once)

Run this SQL in the SQL Editor:

```sql
-- Create test users (replace with your desired emails)

-- Create Owner user
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'owner@test.com',
  crypt('owner123', gen_salt('bf')),
  now(),
  now(),
  now()
);

-- Update the user role in public.users (will be created by trigger)
UPDATE public.users
SET role = 'owner', full_name = 'Test Owner'
WHERE email = 'owner@test.com';

-- Create Super Admin user
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'admin@test.com',
  crypt('admin123', gen_salt('bf')),
  now(),
  now(),
  now()
);

UPDATE public.users
SET role = 'super_admin', full_name = 'Test Admin'
WHERE email = 'admin@test.com';
```

## 🏗️ Architecture Overview

### Authentication Flow

```
1. User visits protected route → ProtectedRoute checks auth
2. Not authenticated → Redirect to /login
3. User logs in → Supabase Auth creates session
4. AuthContext fetches user profile from database
5. Profile loaded → Navigate to dashboard
6. Components use useAuth() hook to access user data
```

### Role-Based Access Control

```
Database (Supabase)
    ↓
AuthContext (React Context)
    ↓
Components (Header, Sidebar, Pages)
    ↓
Conditional Rendering based on role
```

### Data Flow

```
Component → useAuth() → AuthContext → Supabase Client → Database
                                  ↓
                          RLS Policies Check
                                  ↓
                          Return filtered data
```

## 🔧 Troubleshooting

### Error: "Missing Supabase environment variables"

**Solution:** Ensure `.env` file exists with correct `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`

### Error: "relation does not exist"

**Solution:** Database migrations haven't been run. Follow Step 4 above.

### User can't see any data after login

**Possible causes:**
1. User doesn't have `building_id` set
2. RLS policies are blocking access
3. No data exists for that building

**Solution:**
```sql
-- Assign user to a building
UPDATE public.users
SET building_id = (SELECT id FROM buildings LIMIT 1)
WHERE email = 'user@example.com';
```

### Email confirmation not working

**Solution:** Disable email confirmation in Supabase dashboard for development:
- **Authentication** → **Settings** → Disable "Enable email confirmations"

### Role permissions not working

**Solution:** Check that:
1. User role is set correctly in `public.users` table
2. Role value matches enum: `regular_user`, `tenant`, `owner`, or `super_admin`
3. Sidebar normalizes roles correctly (lowercase with underscores)

## 📝 Next Steps

After authentication is working:

1. ✅ **Update Finance Module** - Remove "Pagos del mes", update terminology
2. ✅ **Update Reservations Module** - Multiple amenities, availability check
3. ✅ **Create Announcements Module** - Comunicados feature
4. ✅ **Create Admin Panel** - Interface for creating Owner users

## 🆘 Need Help?

1. Check Supabase logs: **Logs** → **Postgres Logs** in dashboard
2. Check browser console for JavaScript errors
3. Verify database schema matches migration files
4. Check RLS policies are enabled

## 📚 Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Auth Guide](https://supabase.com/docs/guides/auth)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- Project README: `README.md`
- Database Setup: `supabase/README.md`

---

**Important:** Never commit `.env` file to version control. It's already in `.gitignore`.
