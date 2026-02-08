import { createClient } from '@libsql/client';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables manually
const envPath = join(__dirname, '..', '.env');
const envContent = readFileSync(envPath, 'utf-8');
const env = {};
envContent.split(/\r?\n/).forEach(line => {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith('#')) {
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex > 0) {
      const key = trimmed.substring(0, eqIndex).trim();
      const value = trimmed.substring(eqIndex + 1).trim();
      env[key] = value;
    }
  }
});

const url = env.VITE_TURSO_DATABASE_URL;
const authToken = env.VITE_TURSO_AUTH_TOKEN;

if (!url || !authToken || authToken === 'your-turso-auth-token-here') {
  console.error('Error: Please set VITE_TURSO_DATABASE_URL and VITE_TURSO_AUTH_TOKEN in .env file');
  process.exit(1);
}

console.log('Connecting to:', url);

const client = createClient({ url, authToken });

async function migrate() {
  console.log('Creating tables...\n');

  // Create tables one by one
  const tables = [
    {
      name: 'buildings',
      sql: `CREATE TABLE IF NOT EXISTS buildings (
        id TEXT PRIMARY KEY,
        portal_id INTEGER,
        name TEXT NOT NULL,
        address TEXT,
        welcome_message_es TEXT,
        welcome_message_en TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      )`
    },
    {
      name: 'units',
      sql: `CREATE TABLE IF NOT EXISTS units (
        id TEXT PRIMARY KEY,
        building_id TEXT NOT NULL,
        portal_id INTEGER,
        unit_number TEXT NOT NULL,
        floor INTEGER,
        area_sqm REAL,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (building_id) REFERENCES buildings(id) ON DELETE CASCADE,
        UNIQUE(building_id, unit_number)
      )`
    },
    {
      name: 'users',
      sql: `CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        full_name TEXT NOT NULL,
        role TEXT DEFAULT 'regular_user' CHECK(role IN ('regular_user', 'tenant', 'owner', 'super_admin')),
        unit_id TEXT,
        building_id TEXT,
        is_active INTEGER DEFAULT 1,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE SET NULL,
        FOREIGN KEY (building_id) REFERENCES buildings(id) ON DELETE SET NULL
      )`
    },
    {
      name: 'user_units',
      sql: `CREATE TABLE IF NOT EXISTS user_units (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        unit_id TEXT NOT NULL,
        is_primary INTEGER DEFAULT 0,
        relationship_type TEXT DEFAULT 'owner',
        start_date TEXT,
        end_date TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE CASCADE,
        UNIQUE(user_id, unit_id)
      )`
    },
    {
      name: 'user_roles',
      sql: `CREATE TABLE IF NOT EXISTS user_roles (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('regular_user', 'tenant', 'owner', 'super_admin')),
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(user_id, role)
      )`
    },
    {
      name: 'permissions',
      sql: `CREATE TABLE IF NOT EXISTS permissions (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        resource TEXT NOT NULL,
        action TEXT NOT NULL,
        description TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      )`
    },
    {
      name: 'role_permissions',
      sql: `CREATE TABLE IF NOT EXISTS role_permissions (
        id TEXT PRIMARY KEY,
        role TEXT NOT NULL CHECK(role IN ('regular_user', 'tenant', 'owner', 'super_admin')),
        permission_id TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE,
        UNIQUE(role, permission_id)
      )`
    },
    {
      name: 'payments',
      sql: `CREATE TABLE IF NOT EXISTS payments (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        unit_id TEXT NOT NULL,
        concept_type TEXT NOT NULL CHECK(concept_type IN ('invoice_credit', 'invoice_cash', 'receipt', 'credit_note')),
        concept_description TEXT,
        amount REAL NOT NULL,
        status TEXT DEFAULT 'pending' CHECK(status IN ('paid', 'pending', 'overdue')),
        due_date TEXT,
        payment_date TEXT,
        receipt_url TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE CASCADE
      )`
    },
    {
      name: 'amenities',
      sql: `CREATE TABLE IF NOT EXISTS amenities (
        id TEXT PRIMARY KEY,
        building_id TEXT NOT NULL,
        portal_id INTEGER,
        name_es TEXT NOT NULL,
        name_en TEXT,
        description_es TEXT,
        description_en TEXT,
        rules_pdf_url TEXT,
        max_capacity INTEGER,
        requires_approval INTEGER DEFAULT 0,
        is_active INTEGER DEFAULT 1,
        requires_deposit INTEGER DEFAULT 0,
        deposit_amount REAL,
        price_per_hour REAL,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (building_id) REFERENCES buildings(id) ON DELETE CASCADE
      )`
    },
    {
      name: 'reservations',
      sql: `CREATE TABLE IF NOT EXISTS reservations (
        id TEXT PRIMARY KEY,
        portal_id INTEGER,
        user_id TEXT NOT NULL,
        amenity_id TEXT NOT NULL,
        reservation_date TEXT NOT NULL,
        start_time TEXT NOT NULL,
        end_time TEXT NOT NULL,
        status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected', 'cancelled')),
        notes TEXT,
        approved_by TEXT,
        approved_at TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (amenity_id) REFERENCES amenities(id) ON DELETE CASCADE,
        FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL
      )`
    },
    {
      name: 'incidents',
      sql: `CREATE TABLE IF NOT EXISTS incidents (
        id TEXT PRIMARY KEY,
        portal_id INTEGER,
        user_id TEXT NOT NULL,
        building_id TEXT NOT NULL,
        type TEXT NOT NULL CHECK(type IN ('maintenance', 'complaint', 'suggestion')),
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        status TEXT DEFAULT 'open' CHECK(status IN ('open', 'in_progress', 'resolved', 'closed')),
        location TEXT,
        priority TEXT DEFAULT 'medium',
        assigned_to TEXT,
        resolved_at TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (building_id) REFERENCES buildings(id) ON DELETE CASCADE,
        FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL
      )`
    },
    {
      name: 'announcements',
      sql: `CREATE TABLE IF NOT EXISTS announcements (
        id TEXT PRIMARY KEY,
        building_id TEXT NOT NULL,
        title_es TEXT NOT NULL,
        title_en TEXT,
        content_es TEXT NOT NULL,
        content_en TEXT,
        is_published INTEGER DEFAULT 0,
        published_at TEXT,
        created_by TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (building_id) REFERENCES buildings(id) ON DELETE CASCADE,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
      )`
    },
    {
      name: 'documents',
      sql: `CREATE TABLE IF NOT EXISTS documents (
        id TEXT PRIMARY KEY,
        building_id TEXT NOT NULL,
        user_id TEXT,
        title_es TEXT NOT NULL,
        title_en TEXT,
        description_es TEXT,
        description_en TEXT,
        file_url TEXT NOT NULL,
        file_type TEXT,
        category TEXT,
        is_public INTEGER DEFAULT 1,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (building_id) REFERENCES buildings(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      )`
    }
  ];

  // Create tables
  for (const table of tables) {
    try {
      await client.execute(table.sql);
      console.log(`✓ Created table: ${table.name}`);
    } catch (error) {
      if (error.message?.includes('already exists')) {
        console.log(`○ Table exists: ${table.name}`);
      } else {
        console.error(`✗ Error creating ${table.name}:`, error.message);
      }
    }
  }

  // Create indexes
  console.log('\nCreating indexes...');
  const indexes = [
    'CREATE INDEX IF NOT EXISTS idx_units_building ON units(building_id)',
    'CREATE INDEX IF NOT EXISTS idx_users_building ON users(building_id)',
    'CREATE INDEX IF NOT EXISTS idx_users_unit ON users(unit_id)',
    'CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)',
    'CREATE INDEX IF NOT EXISTS idx_user_units_user ON user_units(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_user_units_unit ON user_units(unit_id)',
    'CREATE INDEX IF NOT EXISTS idx_user_roles_user ON user_roles(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status)',
    'CREATE INDEX IF NOT EXISTS idx_amenities_building ON amenities(building_id)',
    'CREATE INDEX IF NOT EXISTS idx_reservations_user ON reservations(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_reservations_amenity ON reservations(amenity_id)',
    'CREATE INDEX IF NOT EXISTS idx_reservations_date ON reservations(reservation_date)',
    'CREATE INDEX IF NOT EXISTS idx_incidents_building ON incidents(building_id)',
    'CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status)',
    'CREATE INDEX IF NOT EXISTS idx_announcements_building ON announcements(building_id)',
    'CREATE INDEX IF NOT EXISTS idx_announcements_published ON announcements(is_published)',
    'CREATE INDEX IF NOT EXISTS idx_documents_building ON documents(building_id)'
  ];

  for (const idx of indexes) {
    try {
      await client.execute(idx);
    } catch (error) {
      // Silently ignore index errors
    }
  }
  console.log('✓ Indexes created');

  // Seed permissions
  console.log('\nSeeding permissions...');
  const permissions = [
    ['perm-buildings-read', 'View Buildings', 'buildings', 'read', 'Can view buildings'],
    ['perm-buildings-write', 'Manage Buildings', 'buildings', 'write', 'Can create/edit buildings'],
    ['perm-units-read', 'View Units', 'units', 'read', 'Can view units'],
    ['perm-units-write', 'Manage Units', 'units', 'write', 'Can create/edit units'],
    ['perm-users-read', 'View Users', 'users', 'read', 'Can view users'],
    ['perm-users-write', 'Manage Users', 'users', 'write', 'Can create/edit users'],
    ['perm-amenities-read', 'View Amenities', 'amenities', 'read', 'Can view amenities'],
    ['perm-amenities-write', 'Manage Amenities', 'amenities', 'write', 'Can create/edit amenities'],
    ['perm-reservations-read', 'View Reservations', 'reservations', 'read', 'Can view reservations'],
    ['perm-reservations-write', 'Manage Reservations', 'reservations', 'write', 'Can create/edit reservations'],
    ['perm-reservations-approve', 'Approve Reservations', 'reservations', 'approve', 'Can approve/reject reservations'],
    ['perm-payments-read', 'View Payments', 'payments', 'read', 'Can view payments'],
    ['perm-payments-write', 'Manage Payments', 'payments', 'write', 'Can create/edit payments'],
    ['perm-incidents-read', 'View Incidents', 'incidents', 'read', 'Can view incidents'],
    ['perm-incidents-write', 'Manage Incidents', 'incidents', 'write', 'Can create/edit incidents'],
    ['perm-announcements-read', 'View Announcements', 'announcements', 'read', 'Can view announcements'],
    ['perm-announcements-write', 'Manage Announcements', 'announcements', 'write', 'Can create/edit announcements'],
    ['perm-documents-read', 'View Documents', 'documents', 'read', 'Can view documents'],
    ['perm-documents-write', 'Manage Documents', 'documents', 'write', 'Can upload/edit documents'],
    ['perm-admin-panel', 'Access Admin Panel', 'admin', 'access', 'Can access admin panel']
  ];

  for (const p of permissions) {
    try {
      await client.execute({
        sql: 'INSERT OR IGNORE INTO permissions (id, name, resource, action, description) VALUES (?, ?, ?, ?, ?)',
        args: p
      });
    } catch (error) {
      // Ignore
    }
  }
  console.log('✓ Permissions seeded');

  // Seed role permissions
  console.log('\nSeeding role permissions...');

  // Super admin permissions
  const saPerms = ['perm-buildings-read', 'perm-buildings-write', 'perm-units-read', 'perm-units-write',
    'perm-users-read', 'perm-users-write', 'perm-amenities-read', 'perm-amenities-write',
    'perm-reservations-read', 'perm-reservations-write', 'perm-reservations-approve',
    'perm-payments-read', 'perm-payments-write', 'perm-incidents-read', 'perm-incidents-write',
    'perm-announcements-read', 'perm-announcements-write', 'perm-documents-read', 'perm-documents-write',
    'perm-admin-panel'];

  for (let i = 0; i < saPerms.length; i++) {
    try {
      await client.execute({
        sql: 'INSERT OR IGNORE INTO role_permissions (id, role, permission_id) VALUES (?, ?, ?)',
        args: [`rp-sa-${i + 1}`, 'super_admin', saPerms[i]]
      });
    } catch (error) {}
  }

  // Owner permissions
  const ownerPerms = ['perm-buildings-read', 'perm-units-read', 'perm-users-read', 'perm-amenities-read',
    'perm-amenities-write', 'perm-reservations-read', 'perm-reservations-write', 'perm-reservations-approve',
    'perm-payments-read', 'perm-incidents-read', 'perm-incidents-write', 'perm-announcements-read',
    'perm-announcements-write', 'perm-documents-read', 'perm-documents-write'];

  for (let i = 0; i < ownerPerms.length; i++) {
    try {
      await client.execute({
        sql: 'INSERT OR IGNORE INTO role_permissions (id, role, permission_id) VALUES (?, ?, ?)',
        args: [`rp-o-${i + 1}`, 'owner', ownerPerms[i]]
      });
    } catch (error) {}
  }

  // Tenant permissions
  const tenantPerms = ['perm-buildings-read', 'perm-units-read', 'perm-amenities-read',
    'perm-reservations-read', 'perm-reservations-write', 'perm-payments-read',
    'perm-incidents-read', 'perm-incidents-write', 'perm-announcements-read', 'perm-documents-read'];

  for (let i = 0; i < tenantPerms.length; i++) {
    try {
      await client.execute({
        sql: 'INSERT OR IGNORE INTO role_permissions (id, role, permission_id) VALUES (?, ?, ?)',
        args: [`rp-t-${i + 1}`, 'tenant', tenantPerms[i]]
      });
    } catch (error) {}
  }

  // Regular user permissions
  const regPerms = ['perm-buildings-read', 'perm-amenities-read', 'perm-reservations-read',
    'perm-reservations-write', 'perm-announcements-read', 'perm-documents-read'];

  for (let i = 0; i < regPerms.length; i++) {
    try {
      await client.execute({
        sql: 'INSERT OR IGNORE INTO role_permissions (id, role, permission_id) VALUES (?, ?, ?)',
        args: [`rp-r-${i + 1}`, 'regular_user', regPerms[i]]
      });
    } catch (error) {}
  }

  console.log('✓ Role permissions seeded');

  // Verify tables
  console.log('\n--- Verification ---');
  const tablesResult = await client.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name");
  console.log('Tables:', tablesResult.rows.map(r => r[0]).join(', '));

  const permCount = await client.execute('SELECT COUNT(*) as count FROM permissions');
  console.log('Permissions count:', permCount.rows[0][0]);

  const rpCount = await client.execute('SELECT COUNT(*) as count FROM role_permissions');
  console.log('Role permissions count:', rpCount.rows[0][0]);

  console.log('\n✓ Migration completed successfully!');
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
