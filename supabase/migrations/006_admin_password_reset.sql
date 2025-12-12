-- =====================================================
-- Admin Password Reset Function
-- Allows super_admin users to reset passwords for any user
-- =====================================================

-- Create a function to allow admins to update user passwords
-- This function uses the auth.users table which requires elevated privileges
CREATE OR REPLACE FUNCTION admin_update_user_password(
  user_id UUID,
  new_password TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER -- This is required to access auth schema
AS $$
DECLARE
  calling_user_id UUID;
  calling_user_role user_role;
  encrypted_password TEXT;
BEGIN
  -- Get the current user's ID from the JWT
  calling_user_id := auth.uid();

  -- Check if calling user exists and get their role
  SELECT role INTO calling_user_role
  FROM public.users
  WHERE id = calling_user_id;

  -- Only super_admin can change other users' passwords
  IF calling_user_role != 'super_admin' THEN
    RAISE EXCEPTION 'Only super admins can change user passwords'
      USING HINT = 'Permission denied';
  END IF;

  -- Prevent admin from changing their own password (use regular password change for that)
  IF calling_user_id = user_id THEN
    RAISE EXCEPTION 'Use the regular password change function to update your own password'
      USING HINT = 'Cannot use admin function on yourself';
  END IF;

  -- Validate password length
  IF LENGTH(new_password) < 6 THEN
    RAISE EXCEPTION 'Password must be at least 6 characters long'
      USING HINT = 'Password too short';
  END IF;

  -- Use Supabase's built-in password encryption
  -- Note: This uses crypt with bcrypt algorithm
  encrypted_password := crypt(new_password, gen_salt('bf'));

  -- Update the user's password in auth.users
  UPDATE auth.users
  SET
    encrypted_password = encrypted_password,
    updated_at = NOW()
  WHERE id = user_id;

  -- Check if update was successful
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found'
      USING HINT = 'Invalid user ID';
  END IF;

  -- Return success
  RETURN json_build_object(
    'success', true,
    'message', 'Password updated successfully',
    'user_id', user_id
  );

EXCEPTION
  WHEN OTHERS THEN
    -- Return error details
    RETURN json_build_object(
      'success', false,
      'message', SQLERRM,
      'error_code', SQLSTATE
    );
END;
$$;

-- Grant execute permission to authenticated users (the function itself checks for super_admin)
GRANT EXECUTE ON FUNCTION admin_update_user_password TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION admin_update_user_password IS 'Allows super_admin users to reset passwords for other users. Requires super_admin role and cannot be used to change own password.';
