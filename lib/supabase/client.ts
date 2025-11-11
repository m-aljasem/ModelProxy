'use client'

import { createClient } from '@supabase/supabase-js'

// Client-side Supabase client
// In Next.js, environment variables without NEXT_PUBLIC_ prefix are NOT available in client components
// We need NEXT_PUBLIC_ prefixed variables for client-side usage
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  const errorMsg = 
    'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. ' +
    'Please add these to your .env.local file with NEXT_PUBLIC_ prefix. ' +
    `Current values: URL=${supabaseUrl ? 'set' : 'missing'}, KEY=${supabaseAnonKey ? 'set' : 'missing'}`
  console.error(errorMsg)
  throw new Error(errorMsg)
}

// Log in development to help debug
if (process.env.NODE_ENV === 'development') {
  console.log('Supabase client initialized:', {
    url: supabaseUrl ? `${supabaseUrl.substring(0, 20)}...` : 'missing',
    hasKey: !!supabaseAnonKey,
  })
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})

