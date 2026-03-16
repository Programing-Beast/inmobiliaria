-- Update incidents priority default from 'medium' to 'low'
-- Note: SQLite doesn't support ALTER COLUMN DEFAULT directly
-- This migration only updates existing NULL priority values to 'low'
-- New inserts will use the updated default from schema.sql

-- Update any existing incidents with NULL priority to 'low'
UPDATE incidents
SET priority = 'low'
WHERE priority IS NULL;

-- If you want to change existing 'medium' priorities to 'low', uncomment below:
-- UPDATE incidents
-- SET priority = 'low'
-- WHERE priority = 'medium';
