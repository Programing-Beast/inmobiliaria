-- =====================================================
-- Fix Permissions Table - Add missing columns
-- =====================================================

-- Add resource column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'permissions' AND column_name = 'resource') THEN
        ALTER TABLE permissions ADD COLUMN resource TEXT;

        -- Update existing permissions to extract resource from name
        UPDATE permissions SET resource =
            CASE
                WHEN name LIKE '%_dashboard%' THEN 'dashboard'
                WHEN name LIKE '%_finances%' THEN 'finances'
                WHEN name LIKE '%_payments%' THEN 'payments'
                WHEN name LIKE '%_reservations%' THEN 'reservations'
                WHEN name LIKE '%_amenities%' THEN 'amenities'
                WHEN name LIKE '%_incidents%' THEN 'incidents'
                WHEN name LIKE '%_announcements%' THEN 'announcements'
                WHEN name LIKE '%_documents%' THEN 'documents'
                WHEN name LIKE '%_users%' THEN 'users'
                WHEN name LIKE '%_approvals%' THEN 'approvals'
                ELSE split_part(name, '_', 2)
            END
        WHERE resource IS NULL;

        -- Make it NOT NULL after populating
        ALTER TABLE permissions ALTER COLUMN resource SET NOT NULL;
    END IF;
END $$;

-- Add action column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'permissions' AND column_name = 'action') THEN
        ALTER TABLE permissions ADD COLUMN action TEXT;

        -- Update existing permissions to extract action from name
        UPDATE permissions SET action = split_part(name, '_', 1)
        WHERE action IS NULL;

        -- Make it NOT NULL after populating
        ALTER TABLE permissions ALTER COLUMN action SET NOT NULL;
    END IF;
END $$;

-- Add description column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'permissions' AND column_name = 'description') THEN
        ALTER TABLE permissions ADD COLUMN description TEXT;
    END IF;
END $$;

-- Verify the structure
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'permissions';
