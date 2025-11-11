# Environment Variables Setup

## Create `.env.local` file

Create a file named `.env.local` in the root directory of your project (same level as `package.json`).

## Required Environment Variables

Copy and paste this template into your `.env.local` file, then fill in your actual values:

```env
# Supabase Configuration
# Get these from: https://app.supabase.com → Your Project → Settings → API

# Server-side variables (for API routes and server components)
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# Client-side variables (required for client components - must have NEXT_PUBLIC_ prefix)
# These are the SAME values as above, just with NEXT_PUBLIC_ prefix
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

# JWT Secret (generate a random 32+ character string)
# Generate one with: openssl rand -base64 32
JWT_SECRET=your-random-secret-key-minimum-32-characters-long

# Provider API Keys (optional - can be set per-provider in dashboard)
OPENAI_API_KEY=sk-...
OPENROUTER_API_KEY=sk-or-...

# App URL (for production)
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app

# Node Environment
NODE_ENV=development
```

## Where to Find Supabase Credentials

1. Go to [https://app.supabase.com](https://app.supabase.com)
2. Select your project (or create a new one)
3. Go to **Settings** → **API**
4. You'll find:
   - **Project URL** → This is your `SUPABASE_URL`
   - **anon public** key → This is your `SUPABASE_ANON_KEY`
   - **service_role** key → This is your `SUPABASE_SERVICE_ROLE_KEY` (keep this secret!)

## Generate JWT Secret

Run this command in your terminal to generate a secure JWT secret:

```bash
openssl rand -base64 32
```

Or use an online generator, but make sure it's at least 32 characters long.

## Important Notes

- **NEXT_PUBLIC_ prefix**: Variables prefixed with `NEXT_PUBLIC_` are exposed to the browser. Only use this for the anon key and URL, NEVER for the service role key!
- **Duplicate values**: You need both `SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_URL` with the same value (same for ANON_KEY). This is because:
  - Server-side code uses `SUPABASE_URL` and `SUPABASE_ANON_KEY`
  - Client-side code can only access `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Never commit `.env.local` to git (it's already in `.gitignore`)
- For production (Vercel), add these same variables in your Vercel project settings
- The `SUPABASE_SERVICE_ROLE_KEY` has admin access - keep it secret! Never add `NEXT_PUBLIC_` prefix to it!

