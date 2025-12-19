# Turso Database Setup

This project has been migrated from Supabase to Turso (LibSQL).

## Prerequisites

1. Create a Turso account at https://turso.tech
2. Install the Turso CLI: `curl -sSfL https://get.tur.so/install.sh | bash`

## Setup Steps

### 1. Create a Database

```bash
turso db create reservation
```

### 2. Get Your Database URL

```bash
turso db show reservation --url
```

This will output something like: `libsql://reservation-yourusername.turso.io`

### 3. Create an Auth Token

```bash
turso db tokens create reservation
```

### 4. Update Environment Variables

Edit your `.env` file:

```env
VITE_TURSO_DATABASE_URL=libsql://reservation-yourusername.turso.io
VITE_TURSO_AUTH_TOKEN=your-auth-token-here
VITE_JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
```

### 5. Initialize the Database Schema

Connect to your database and run the schema:

```bash
turso db shell reservation < turso/schema.sql
```

Or manually copy and paste the contents of `turso/schema.sql` into the Turso shell.

### 6. Create an Admin User

After the schema is initialized, create your first admin user. Connect to the database shell:

```bash
turso db shell reservation
```

Then run (replace with your details):

```sql
-- Generate a password hash first (this is a SHA-256 hash of 'admin123')
-- In production, use a proper password hashing mechanism
INSERT INTO users (id, email, password_hash, full_name, role, is_active, created_at, updated_at)
VALUES (
    'admin-user-001',
    'admin@example.com',
    '240be518fabd2724ddb6f04eeb9d5b5e9e13d09c79d2fda8d12f8e5c5fb36a4a',  -- This is SHA-256 of 'admin123'
    'Admin User',
    'super_admin',
    1,
    datetime('now'),
    datetime('now')
);
```

**Important**: Change the default password after first login!

## Features Changes After Migration

### What Works

- User authentication (sign up, sign in, sign out)
- All CRUD operations for buildings, units, users, amenities, reservations, etc.
- Permission system and role management
- Multiple units/roles per user

### What Changed

1. **Authentication**: Now uses local password hashing instead of Supabase Auth
   - Passwords are stored as SHA-256 hashes (upgrade to bcrypt for production)
   - No email verification (can be added with external email service)
   - Password reset requires manual admin intervention

2. **Real-time Subscriptions**: Not supported
   - Turso doesn't support real-time database subscriptions
   - Consider implementing polling for real-time features

3. **File Storage**: Not supported
   - Turso is a database only, no file storage
   - Use a separate service like Cloudinary, AWS S3, or Uploadthing

## Database Structure

The schema includes:

- `buildings` - Building/condominium information
- `units` - Individual units/apartments
- `users` - User accounts with password hashes
- `user_units` - Many-to-many user-unit relationships
- `user_roles` - Many-to-many user-role relationships
- `payments` - Financial transactions
- `amenities` - Building facilities
- `reservations` - Amenity bookings
- `incidents` - Maintenance/complaint tracking
- `announcements` - Building announcements
- `documents` - Document metadata
- `permissions` - System permissions
- `role_permissions` - Role-permission mappings

## Security Notes

1. The current password hashing uses SHA-256 which is NOT recommended for production
   - Consider using bcrypt, Argon2, or scrypt
   - This would require a backend server for proper password hashing

2. All database queries are made directly from the browser
   - Turso auth tokens should be treated as semi-sensitive
   - Consider adding a backend API for sensitive operations

3. No rate limiting is implemented
   - Consider adding rate limiting for authentication endpoints
