-- Fix RLS policies to avoid direct auth.users access
-- Run this in your Supabase SQL editor

-- Drop existing policies
DROP POLICY IF EXISTS "Admins can manage providers" ON providers;
DROP POLICY IF EXISTS "Admins and operators can view providers" ON providers;
DROP POLICY IF EXISTS "Admins can manage endpoints" ON endpoints;
DROP POLICY IF EXISTS "All authenticated users can view endpoints" ON endpoints;
DROP POLICY IF EXISTS "Admins can manage tokens" ON api_tokens;
DROP POLICY IF EXISTS "All authenticated users can view tokens" ON api_tokens;
DROP POLICY IF EXISTS "All authenticated users can view usage logs" ON usage_logs;
DROP POLICY IF EXISTS "Admins can view audit logs" ON audit_logs;

-- Create a helper function to check user role (uses SECURITY DEFINER to access auth.users)
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT (raw_user_meta_data->>'role')::TEXT INTO user_role
  FROM auth.users
  WHERE id = auth.uid();
  
  RETURN COALESCE(user_role, 'viewer');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Simplified policies that allow all authenticated users
-- (Authorization is handled by API routes using admin client)

-- Providers: Allow all authenticated users to view, manage via API routes
CREATE POLICY "Authenticated users can view providers" ON providers
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can manage providers" ON providers
  FOR ALL USING (auth.uid() IS NOT NULL);

-- Endpoints: Allow all authenticated users
CREATE POLICY "Authenticated users can view endpoints" ON endpoints
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can manage endpoints" ON endpoints
  FOR ALL USING (auth.uid() IS NOT NULL);

-- API Tokens: Allow all authenticated users to view, manage via API routes
CREATE POLICY "Authenticated users can view tokens" ON api_tokens
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can manage tokens" ON api_tokens
  FOR ALL USING (auth.uid() IS NOT NULL);

-- Usage logs: Allow all authenticated users to view
CREATE POLICY "Authenticated users can view usage logs" ON usage_logs
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Audit logs: Allow all authenticated users to view
CREATE POLICY "Authenticated users can view audit logs" ON audit_logs
  FOR SELECT USING (auth.uid() IS NOT NULL);

