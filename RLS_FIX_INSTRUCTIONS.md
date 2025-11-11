# Fix RLS Permission Errors

## Problem
The RLS policies are trying to access `auth.users` table directly, which causes "permission denied for table users" errors.

## Solution

Run the SQL in `supabase/rls_fix.sql` in your Supabase SQL Editor:

1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Copy and paste the contents of `supabase/rls_fix.sql`
4. Click **Run**

This will:
- Drop the old policies that try to access `auth.users`
- Create simplified policies that only check if user is authenticated
- Since we're using API routes with admin client, authorization is handled there

## Alternative: Disable RLS (Not Recommended for Production)

If you want to disable RLS entirely for testing (NOT recommended for production):

```sql
ALTER TABLE providers DISABLE ROW LEVEL SECURITY;
ALTER TABLE endpoints DISABLE ROW LEVEL SECURITY;
ALTER TABLE api_tokens DISABLE ROW LEVEL SECURITY;
ALTER TABLE usage_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs DISABLE ROW LEVEL SECURITY;
```

## After Running the Fix

1. Try adding a provider again
2. The error should be resolved
3. All authenticated users can now manage providers/endpoints (authorization is handled by API routes)

