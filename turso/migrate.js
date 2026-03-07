import { createClient } from "@libsql/client";
import { existsSync, readdirSync, readFileSync } from "fs";
import { dirname, extname, join } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const loadEnv = () => {
  const envPath = join(__dirname, "..", ".env");
  const envContent = readFileSync(envPath, "utf-8");
  const env = {};

  envContent.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;

    const eqIndex = trimmed.indexOf("=");
    if (eqIndex <= 0) return;

    const key = trimmed.substring(0, eqIndex).trim();
    const value = trimmed.substring(eqIndex + 1).trim();
    env[key] = value;
  });

  return env;
};

const parseSqlStatements = (sqlContent) => {
  const sql = sqlContent.replace(/^\uFEFF/, "");
  const statements = [];
  let current = "";
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let inLineComment = false;
  let inBlockComment = false;

  for (let i = 0; i < sql.length; i += 1) {
    const char = sql[i];
    const next = sql[i + 1];

    if (inLineComment) {
      if (char === "\n") {
        inLineComment = false;
        current += "\n";
      }
      continue;
    }

    if (inBlockComment) {
      if (char === "*" && next === "/") {
        inBlockComment = false;
        i += 1;
        current += " ";
      }
      continue;
    }

    if (!inSingleQuote && !inDoubleQuote) {
      if (char === "-" && next === "-") {
        inLineComment = true;
        i += 1;
        continue;
      }
      if (char === "/" && next === "*") {
        inBlockComment = true;
        i += 1;
        continue;
      }
    }

    if (char === "'" && inSingleQuote && next === "'") {
      current += "''";
      i += 1;
      continue;
    }

    if (char === "'" && !inDoubleQuote) {
      const escaped = sql[i - 1] === "\\";
      if (!escaped) inSingleQuote = !inSingleQuote;
      current += char;
      continue;
    }

    if (char === '"' && inDoubleQuote && next === '"') {
      current += '""';
      i += 1;
      continue;
    }

    if (char === '"' && !inSingleQuote) {
      const escaped = sql[i - 1] === "\\";
      if (!escaped) inDoubleQuote = !inDoubleQuote;
      current += char;
      continue;
    }

    if (char === ";" && !inSingleQuote && !inDoubleQuote) {
      const statement = current.trim();
      if (statement) statements.push(statement);
      current = "";
      continue;
    }

    current += char;
  }

  const trailing = current.trim();
  if (trailing) {
    statements.push(trailing);
  }

  return statements;
};

const isSafeIdempotentError = (message) => {
  if (!message) return false;
  return /duplicate column name|already exists/i.test(message);
};

const ensureMigrationsTable = async (client) => {
  await client.execute(`
    CREATE TABLE IF NOT EXISTS _schema_migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
};

const getAppliedMigrations = async (client) => {
  const result = await client.execute({
    sql: "SELECT name FROM _schema_migrations ORDER BY name",
    args: [],
  });

  return new Set(result.rows.map((row) => String(row[0])));
};

const executeSqlFile = async (client, filePath, options = {}) => {
  const { allowIdempotentErrors = false, label = filePath } = options;
  const content = readFileSync(filePath, "utf-8");
  const statements = parseSqlStatements(content);
  if (statements.length === 0) return;

  for (const statement of statements) {
    try {
      await client.execute(statement);
    } catch (error) {
      const message = error?.message || String(error);
      if (allowIdempotentErrors && isSafeIdempotentError(message)) {
        console.log(`Skipped idempotent statement in ${label}: ${message}`);
        continue;
      }
      throw error;
    }
  }
};

const applyPendingMigrations = async (client) => {
  const migrationsDir = join(__dirname, "migrations");
  if (!existsSync(migrationsDir)) {
    console.log("No migrations directory found.");
    return { appliedCount: 0, skippedCount: 0 };
  }

  const migrationFiles = readdirSync(migrationsDir)
    .filter((file) => extname(file).toLowerCase() === ".sql")
    .sort((a, b) => a.localeCompare(b));

  if (migrationFiles.length === 0) {
    console.log("No migration files found.");
    return { appliedCount: 0, skippedCount: 0 };
  }

  const applied = await getAppliedMigrations(client);
  let appliedCount = 0;
  let skippedCount = 0;

  for (const file of migrationFiles) {
    if (applied.has(file)) {
      skippedCount += 1;
      continue;
    }

    const filePath = join(migrationsDir, file);
    console.log(`Applying migration: ${file}`);
    await executeSqlFile(client, filePath, { allowIdempotentErrors: true, label: file });

    await client.execute({
      sql: "INSERT INTO _schema_migrations (name, applied_at) VALUES (?, ?)",
      args: [file, new Date().toISOString()],
    });
    appliedCount += 1;
  }

  return { appliedCount, skippedCount };
};

const migrate = async () => {
  const env = loadEnv();
  const url = env.VITE_TURSO_DATABASE_URL;
  const authToken = env.VITE_TURSO_AUTH_TOKEN;

  if (!url || !authToken || authToken === "your-turso-auth-token-here") {
    console.error("Error: Please set VITE_TURSO_DATABASE_URL and VITE_TURSO_AUTH_TOKEN in .env file");
    process.exit(1);
  }

  console.log(`Connecting to: ${url}`);
  const client = createClient({ url, authToken });

  const schemaPath = join(__dirname, "schema.sql");
  console.log("Applying base schema...");
  await executeSqlFile(client, schemaPath, { label: "schema.sql" });

  await ensureMigrationsTable(client);
  const { appliedCount, skippedCount } = await applyPendingMigrations(client);

  const tableCountResult = await client.execute({
    sql: "SELECT COUNT(*) FROM sqlite_master WHERE type = 'table'",
    args: [],
  });
  const migrationCountResult = await client.execute({
    sql: "SELECT COUNT(*) FROM _schema_migrations",
    args: [],
  });

  console.log("Migration completed.");
  console.log(`Tables present: ${tableCountResult.rows[0][0]}`);
  console.log(`Migrations applied this run: ${appliedCount}`);
  console.log(`Migrations already applied: ${skippedCount}`);
  console.log(`Total migration records: ${migrationCountResult.rows[0][0]}`);
};

migrate().catch((error) => {
  console.error("Migration failed:", error);
  process.exit(1);
});
