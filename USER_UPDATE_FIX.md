# User Update Error Fix

## Problem
When trying to update a user in the Admin Panel, an "Error updating user" message appeared without details.

## Root Cause
After implementing the multiple units and roles feature (Milestone 1), we added new tables `user_units` and `user_roles` but forgot to add Row Level Security (RLS) policies for them. This caused Supabase to block operations on these tables.

## Solution

### 1. Added RLS Policies Migration
**File:** `supabase/migrations/007_rls_for_new_tables.sql`

This migration adds proper RLS policies for:
- `user_units` table
- `user_roles` table

**Policies Added:**

#### user_units
- ✅ Users can view their own unit assignments
- ✅ Super admins can view all unit assignments
- ✅ Super admins can manage all unit assignments
- ✅ Users can update their own primary unit designation

#### user_roles
- ✅ Users can view their own roles
- ✅ Super admins can view all roles
- ✅ Super admins can manage all roles

### 2. Improved Error Messages
**File:** `src/pages/AdminPanel.tsx`

Updated the error handling to show more detailed error messages:

**Before:**
```typescript
toast.error("Error updating user");
```

**After:**
```typescript
const errorMessage = error.message || error.toString() || "Error updating user";
toast.error(`Update failed: ${errorMessage}`);
```

This helps identify the exact cause of failures.

### 3. Fixed TypeScript Warnings
Removed unused variables to clean up the codebase:
- Removed unused `t` (translation function)
- Removed unused `data` variables in API responses
- Removed unused `user` variable in updateUserProfile response

## How to Apply the Fix

### Step 1: Apply the RLS Migration

```bash
# Using Supabase CLI (recommended)
supabase db push

# Or manually through Supabase Dashboard:
# 1. Go to SQL Editor in Supabase Dashboard
# 2. Copy contents of supabase/migrations/007_rls_for_new_tables.sql
# 3. Execute the SQL
```

### Step 2: Test User Updates

1. Login as super_admin
2. Go to Admin Panel
3. Click Edit (pencil icon) on any user
4. Change role, building, or unit
5. Click "Update User"
6. Should see "User updated successfully" ✅

### Step 3: Verify Error Messages

If there's an issue, the error message will now show specific details instead of generic "Error updating user".

## What Was Happening Before

Without RLS policies on the new tables:
1. Super admin tried to update a user
2. The update to `users` table succeeded
3. BUT the system couldn't read from `user_units` or `user_roles` due to missing RLS policies
4. This caused silent failures or permission errors
5. Generic error message didn't help identify the issue

## What Happens Now

With proper RLS policies:
1. Super admin updates a user ✅
2. Update to `users` table succeeds ✅
3. System can read from `user_units` and `user_roles` ✅
4. All related data is accessible ✅
5. Clear success/error messages ✅

## Testing Checklist

- [ ] Migration applies without errors
- [ ] Super admin can update user role
- [ ] Super admin can update user building
- [ ] Super admin can update user unit
- [ ] Super admin can toggle user active status
- [ ] User list refreshes after update
- [ ] Success toast appears after successful update
- [ ] Detailed error message appears if update fails
- [ ] Regular users cannot update other users
- [ ] Users can view their own units and roles

## Security Notes

The RLS policies ensure:
- ✅ Users can only view their own units and roles
- ✅ Only super admins can assign/remove units and roles for other users
- ✅ Users cannot escalate their own privileges
- ✅ All database operations are protected at the database level

## Related Files

### Modified
1. `src/pages/AdminPanel.tsx` - Better error handling
2. `ADMIN_PASSWORD_RESET.md` - Updated (no changes needed)

### New
1. `supabase/migrations/007_rls_for_new_tables.sql` - RLS policies
2. `USER_UPDATE_FIX.md` - This documentation

## Additional Notes

### Why RLS Is Important
Row Level Security (RLS) in Supabase ensures that even if there's a bug in your frontend code, users can only access data they're authorized to see. It's a critical security layer.

### Best Practice
Always add RLS policies when creating new tables. The standard pattern:
1. Enable RLS: `ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;`
2. Add policies for each role/use case
3. Test with different user roles

### Common RLS Pattern
```sql
-- Users see their own data
CREATE POLICY "users_own_data" ON table_name
  FOR SELECT USING (user_id = auth.uid());

-- Admins see everything
CREATE POLICY "admins_all_data" ON table_name
  FOR ALL USING (is_super_admin());
```

## Troubleshooting

### Error: "new row violates row-level security policy"
- **Cause:** RLS policy blocking the operation
- **Solution:** Check if the policy's WITH CHECK clause allows the operation

### Error: "permission denied for table"
- **Cause:** No SELECT policy exists
- **Solution:** Add a policy for SELECT operations

### Still Getting Generic Error Messages
1. Check browser console (F12) for detailed errors
2. Check Supabase logs in Dashboard > Logs
3. Verify you're logged in as super_admin
4. Clear browser cache and reload

## Future Improvements

Consider adding:
1. Audit logging for user updates
2. Email notifications when user details change
3. Bulk user operations
4. User import/export functionality
5. Activity history for each user

## Support

If you encounter issues:
1. Check migration applied successfully in Supabase Dashboard > Database > Migrations
2. Verify RLS is enabled: Dashboard > Database > Tables > user_units/user_roles
3. Check policies exist: Dashboard > Database > Tables > Policies tab
4. Review error details in browser console and Supabase logs
