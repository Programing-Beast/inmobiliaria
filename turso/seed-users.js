import { createClient } from '@libsql/client';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
const envPath = join(__dirname, '..', '.env');
const envContent = readFileSync(envPath, 'utf-8');
const env = {};
envContent.split(/\r?\n/).forEach(line => {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith('#')) {
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex > 0) {
      env[trimmed.substring(0, eqIndex).trim()] = trimmed.substring(eqIndex + 1).trim();
    }
  }
});

const client = createClient({
  url: env.VITE_TURSO_DATABASE_URL,
  authToken: env.VITE_TURSO_AUTH_TOKEN
});

const generateUUID = () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
  const r = (Math.random() * 16) | 0;
  return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
});

const hashPassword = async (password) => {
  const data = new TextEncoder().encode(password);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
};

const now = () => new Date().toISOString();

// ============================================
// USERS WITH MULTIPLE ROLES
// ============================================
const USERS = [
  {
    email: 'nomanbutt8322@gmail.com',
    password: 'Noman@123',
    full_name: 'Super Administrator',
    roles: ['super_admin', 'owner']  // Multiple roles
  },
  {
    email: 'faridawan0@gmail.com',
    password: 'owner123',
    full_name: 'Property Owner',
    roles: ['owner', 'tenant']  // Owner who also rents
  },
  {
    email: 'tenant@example.com',
    password: 'tenant123',
    full_name: 'John Tenant',
    roles: ['tenant']
  },
  {
    email: 'user@example.com',
    password: 'user123',
    full_name: 'Regular User',
    roles: ['regular_user']
  }
];

async function seed() {
  console.log('🌱 Seeding users with multiple roles...\n');
  const timestamp = now();

  for (const user of USERS) {
    const userId = generateUUID();
    const passwordHash = await hashPassword(user.password);
    const primaryRole = user.roles[0];

    try {
      // Check if exists
      const existing = await client.execute({
        sql: 'SELECT id FROM users WHERE email = ?',
        args: [user.email]
      });

      if (existing.rows.length > 0) {
        console.log(`○ Exists: ${user.email}`);
        continue;
      }

      // Create user with primary role
      await client.execute({
        sql: `INSERT INTO users (id, email, password_hash, full_name, role, is_active, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, 1, ?, ?)`,
        args: [userId, user.email, passwordHash, user.full_name, primaryRole, timestamp, timestamp]
      });

      // Assign ALL roles to user_roles table
      for (const role of user.roles) {
        await client.execute({
          sql: 'INSERT INTO user_roles (id, user_id, role, created_at) VALUES (?, ?, ?, ?)',
          args: [generateUUID(), userId, role, timestamp]
        });
      }

      console.log(`✓ Created: ${user.email}`);
      console.log(`  Password: ${user.password}`);
      console.log(`  Roles: ${user.roles.join(', ')}`);
      console.log('');
    } catch (error) {
      console.error(`✗ Error: ${user.email} - ${error.message}`);
    }
  }

  // Summary
  console.log('\n📊 Summary:');
  const userCount = await client.execute('SELECT COUNT(*) FROM users');
  const roleCount = await client.execute('SELECT COUNT(*) FROM user_roles');
  console.log(`  Users: ${userCount.rows[0][0]}`);
  console.log(`  Role assignments: ${roleCount.rows[0][0]}`);

  console.log('\n✅ Done!');
}

seed().catch(console.error);
