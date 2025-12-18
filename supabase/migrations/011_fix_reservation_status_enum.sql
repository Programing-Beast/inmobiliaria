-- Migration to ensure reservation_status enum has the correct values
-- The enum should have: pending, approved, rejected, cancelled

DO $$
BEGIN
    -- Add 'approved' value if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum
        WHERE enumlabel = 'approved'
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'reservation_status')
    ) THEN
        ALTER TYPE reservation_status ADD VALUE IF NOT EXISTS 'approved';
    END IF;

    -- Add 'rejected' value if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum
        WHERE enumlabel = 'rejected'
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'reservation_status')
    ) THEN
        ALTER TYPE reservation_status ADD VALUE IF NOT EXISTS 'rejected';
    END IF;

    -- Add 'cancelled' value if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum
        WHERE enumlabel = 'cancelled'
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'reservation_status')
    ) THEN
        ALTER TYPE reservation_status ADD VALUE IF NOT EXISTS 'cancelled';
    END IF;
END$$;
