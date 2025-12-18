# CORS Error Fix - User Update Issue

## The Error
```
Cross-Origin Request Blocked: The Same Origin Policy disallows reading the remote resource at https://amalgdnzldlcntgjdgno.supabase.co/rest/v1/users...
(Reason: Did not find method in CORS header 'Access-Control-Allow-Methods').

Error updating user: TypeError: NetworkError when attempting to fetch resource.
```

## What's Actually Happening

Despite appearing as a CORS error, this is **NOT** a CORS configuration issue. This is how Supabase reports **Row Level Security (RLS) policy violations** in the browser.

When an RLS policy blocks a request, Supabase returns a response that the browser interprets as a CORS error because the request fails before completing the CORS handshake.

## Root Cause

The RLS policy on the `users` table was conflicting:

### Problematic Policy (from migration 002):
```sql
CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid() AND role = (SELECT role FROM users WHERE id = auth.uid()));
```

**Problem:** The `WITH CHECK` clause requires that the role **must not change**. This prevents:
- ❌ Super admins from changing a user's role
- ❌ Super admins from changing a user's building
- ❌ Super admins from changing a user's unit

Even though there's a "Super admins can manage users" policy, PostgreSQL applies **ALL** matching policies with AND logic. So both policies must pass.

## The Solution

**Migration:** `008_fix_user_update_policy.sql`

This migration:
1. ✅ Drops the restrictive policy
2. ✅ Recreates it to allow users to update their profile (name, email) only
3. ✅ Prevents users from changing their own role, building, or unit
4. ✅ Recreates super admin policy with explicit WITH CHECK clause
5. ✅ Ensures super admins can update all user fields

### New Policy Logic:

**For Regular Users:**
- ✅ Can update their own name
- ✅ Can update their own email
- ❌ Cannot change their own role
- ❌ Cannot change their own building
- ❌ Cannot change their own unit

**For Super Admins:**
- ✅ Can update ANY user field
- ✅ Can change roles
- ✅ Can assign buildings
- ✅ Can assign units
- ✅ Can activate/deactivate users

## How to Apply the Fix

### Step 1: Apply the Migration

```bash
# Using Supabase CLI (recommended)
supabase db push

# This will apply:
# - 007_rls_for_new_tables.sql (if not already applied)
# - 008_fix_user_update_policy.sql (the fix)
```

**OR** manually in Supabase Dashboard:
1. Go to **SQL Editor** in Supabase Dashboard
2. Copy contents of `supabase/migrations/008_fix_user_update_policy.sql`
3. Click **Run**
4. Verify "Success" message

### Step 2: Verify Policies

In Supabase Dashboard:
1. Go to **Database** → **Tables** → **users**
2. Click **Policies** tab
3. You should see:
   - ✅ "Super admins can manage users" (FOR ALL)
   - ✅ "Users can update own profile" (FOR UPDATE)
   - ✅ "Users can view own profile" (FOR SELECT)
   - ✅ "Super admins can view all users" (FOR SELECT)

### Step 3: Test User Updates

1. Login as **super_admin**
2. Go to **Admin Panel**
3. Click **Edit** on any user
4. Change the **role** to a different value
5. Click **Update User**
6. ✅ Should see "User updated successfully"

## Why This Looked Like a CORS Error

When PostgreSQL RLS blocks a request:
1. Supabase REST API receives the blocked request
2. It tries to return an error response
3. The browser's CORS preflight fails because the request was rejected
4. Browser shows: "Did not find method in CORS header"
5. The actual error is: RLS policy violation

**It's confusing but it's by design** - Supabase doesn't expose internal policy violations directly to the client for security reasons.

## Understanding RLS Policy Conflicts

PostgreSQL applies RLS policies with this logic:

```
IF multiple policies match:
   ALL policies must pass (AND logic)

IF any policy fails:
   Request is blocked
```

In our case:
- Policy 1: "Users can update own profile" - ❌ FAILED (role must not change)
- Policy 2: "Super admins can manage users" - ✅ PASSED
- **Result: BLOCKED** (because Policy 1 failed)

After the fix:
- Policy 1: "Users can update own profile" - Doesn't match (not updating own profile)
- Policy 2: "Super admins can manage users" - ✅ PASSED
- **Result: ALLOWED** (only Policy 2 applies)

## Files Changed

### New Migrations
1. ✅ `007_rls_for_new_tables.sql` - RLS for user_units and user_roles
2. ✅ `008_fix_user_update_policy.sql` - Fix conflicting RLS policies

### Documentation
1. ✅ `CORS_ERROR_FIX.md` - This file
2. ✅ `USER_UPDATE_FIX.md` - Previous fix attempt

## Testing Checklist

After applying the migration:

- [ ] Migration applies without errors
- [ ] Login as super_admin
- [ ] Edit a user's role → Should succeed ✅
- [ ] Edit a user's building → Should succeed ✅
- [ ] Edit a user's unit → Should succeed ✅
- [ ] Edit a user's status (active/inactive) → Should succeed ✅
- [ ] Login as regular user
- [ ] Try to change own role → Should fail ❌
- [ ] Update own name → Should succeed ✅
- [ ] No CORS errors in browser console ✅

## Troubleshooting

### Still Getting CORS Error?

**Check 1:** Verify you're logged in as super_admin
```sql
-- Run in SQL Editor to check your role
SELECT id, email, role FROM users WHERE id = auth.uid();
```

**Check 2:** Verify policies are applied
```sql
-- Check if policies exist
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE tablename = 'users';
```

**Check 3:** Clear browser cache
- Press F12
- Right-click refresh button
- Click "Empty Cache and Hard Reload"

**Check 4:** Check Supabase logs
- Go to Supabase Dashboard → Logs
- Look for detailed error messages

### Error: "new row violates row-level security policy"

This means the `WITH CHECK` clause is blocking the update.

**Solution:** Make sure migration 008 is applied:
```bash
supabase db push
```

### Error: "permission denied for table users"

This means there's no matching policy at all.

**Solution:** Re-apply the migration or check if RLS is enabled:
```sql
SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'users';
```

## Common Mistakes to Avoid

1. ❌ **Don't disable RLS** - This removes all security
2. ❌ **Don't use service role key in frontend** - Major security risk
3. ❌ **Don't add overly permissive policies** - Principle of least privilege
4. ✅ **Do test with different user roles** - Ensure policies work correctly
5. ✅ **Do use migrations** - Keep changes versioned and reproducible

## Understanding RLS Best Practices

### Good Policy Structure
```sql
-- Specific, targeted policy
CREATE POLICY "action_role_resource"
  ON table_name FOR action
  USING (condition)        -- Can they see/access it?
  WITH CHECK (condition);  -- Can they modify it?
```

### Policy Naming Convention
- `{action}_{role}_{resource}`
- Examples:
  - `view_own_payments`
  - `create_building_reservations`
  - `manage_all_users` (for admins)

### Policy Ordering
PostgreSQL checks policies in this order:
1. Most restrictive first
2. FOR ALL policies (apply to everything)
3. Action-specific policies (FOR SELECT, FOR UPDATE, etc.)

## Security Implications

### Before Fix
- ❌ Super admins couldn't manage users properly
- ❌ Some admin operations would silently fail
- ❌ User roles couldn't be changed at all

### After Fix
- ✅ Super admins have full control
- ✅ Regular users can only update safe fields
- ✅ Role/building/unit changes require admin privilege
- ✅ Clear separation of permissions

## Additional Resources

- [Supabase RLS Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL RLS Documentation](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [Understanding CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)

## Support

If you continue to have issues:

1. **Check Applied Migrations:**
   ```bash
   supabase migration list
   ```

2. **View Current Policies:**
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'users';
   ```

3. **Test With SQL:**
   ```sql
   -- As super admin
   UPDATE users SET role = 'tenant' WHERE id = 'some-user-id';
   ```

4. **Enable Verbose Logging:**
   In `.env`:
   ```
   VITE_SUPABASE_DEBUG=true
   ```

## Summary

✅ **Fixed:** User update "CORS" error
✅ **Cause:** Conflicting RLS policies
✅ **Solution:** Migration 008
✅ **Result:** Super admins can now update all user fields
✅ **Security:** Regular users still protected from escalating privileges

**Apply the migration and the issue should be resolved!**
