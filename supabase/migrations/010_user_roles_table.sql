-- Create user_roles junction table for many-to-many relationship
-- This allows assigning multiple roles to a single user

CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role user_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, role)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role);

-- Enable RLS
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- RLS Policies (drop if exist first to avoid errors)
DROP POLICY IF EXISTS "Super admins can manage user_roles" ON user_roles;
DROP POLICY IF EXISTS "Users can view own roles" ON user_roles;

-- Super admins can do everything
CREATE POLICY "Super admins can manage user_roles" ON user_roles
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'super_admin'
    )
  );

-- Users can view their own roles
CREATE POLICY "Users can view own roles" ON user_roles
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Migrate existing roles from users table to user_roles table
-- This inserts the current role of each user into the user_roles table
INSERT INTO user_roles (user_id, role)
SELECT id, role FROM users
WHERE role IS NOT NULL
ON CONFLICT (user_id, role) DO NOTHING;

-- Grant permissions
GRANT ALL ON user_roles TO authenticated;

-- Notify schema reload
NOTIFY pgrst, 'reload schema';
