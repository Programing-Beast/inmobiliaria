# Quick Fix Guide - User Update "CORS Error"

## The Problem
```
Error updating user: TypeError: NetworkError when attempting to fetch resource.
Cross-Origin Request Blocked...
```

## TL;DR - The Fix

**It's NOT a CORS issue - it's an RLS (Row Level Security) policy conflict!**

### Quick Fix (2 minutes):

```bash
# Run this command:
supabase db push
```

This applies migration `008_fix_user_update_policy.sql` which fixes the conflicting RLS policies.

---

## What Was Wrong?

The RLS policy was preventing super admins from updating user roles because:
- One policy said: "Users can update their profile BUT role must stay the same"
- Another policy said: "Super admins can do anything"
- PostgreSQL uses AND logic: **BOTH must pass**
- Result: ❌ Blocked (first policy failed)

## What's Fixed?

New policy structure:
- ✅ Regular users can update name/email only
- ✅ Regular users **cannot** change their own role/building/unit
- ✅ Super admins can update **everything**
- ✅ No more policy conflicts

## Test It

1. Apply migration: `supabase db push`
2. Login as super admin
3. Go to Admin Panel
4. Edit any user → Change role
5. Click Update
6. ✅ Should work!

## Full Documentation

- **Detailed Fix:** `CORS_ERROR_FIX.md`
- **RLS Setup:** `USER_UPDATE_FIX.md`
- **Password Reset:** `ADMIN_PASSWORD_RESET.md`
- **Milestone 1:** `MILESTONE_1_IMPLEMENTATION.md`

## Need Help?

Check browser console (F12) for actual errors, or review the detailed docs above.

---

**Migration to apply:** `supabase/migrations/008_fix_user_update_policy.sql`
