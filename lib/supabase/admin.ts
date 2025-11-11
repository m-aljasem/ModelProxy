import { createClient } from '@supabase/supabase-js'

// Custom fetch with timeout and better error handling for WSL2
// This preserves all headers set by Supabase client (especially Authorization)
function createFetchWithTimeout(timeoutMs: number = 30000): typeof fetch {
  return async (url: string | URL | Request, options?: RequestInit): Promise<Response> => {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

    try {
      // Preserve all existing headers (especially Authorization and apikey from Supabase)
      const existingHeaders = options?.headers || {}
      const headers = new Headers(existingHeaders)
      
      // Only add Connection header if not already present
      if (!headers.has('Connection')) {
        headers.set('Connection', 'keep-alive')
      }

      // Add keepalive and other options for better WSL2 compatibility
      const fetchOptions: RequestInit = {
        ...options,
        signal: controller.signal,
        keepalive: true,
        headers: headers, // Use the merged headers
      }

      const response = await fetch(url, fetchOptions)
      clearTimeout(timeoutId)
      return response
    } catch (error: any) {
      clearTimeout(timeoutId)
      if (error.name === 'AbortError') {
        throw new Error(`Request to Supabase timed out after ${timeoutMs}ms. This might be a WSL2 network issue.`)
      }
      if (error.message?.includes('fetch failed') || 
          error.message?.includes('ECONNREFUSED') ||
          error.message?.includes('Connection reset') ||
          error.code === 'ECONNREFUSED') {
        throw new Error(
          `Network error: Cannot connect to Supabase from WSL2. ` +
          `This is a known WSL2 networking issue. ` +
          `Solutions: ` +
          `1. Restart WSL: wsl --shutdown (from Windows PowerShell) ` +
          `2. Check WSL2 network settings ` +
          `3. Try running the server on Windows instead of WSL2 ` +
          `Original error: ${error.message || error}`
        )
      }
      throw error
    }
  }
}

// Server-only admin client with service role key
// This should NEVER be used in client components
let supabaseAdmin: ReturnType<typeof createClient> | null = null

try {
  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase environment variables:', {
      hasUrl: !!supabaseUrl,
      hasServiceKey: !!supabaseServiceKey,
    })
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set')
  }

  // Create admin client with service role key
  // The service role key bypasses RLS policies
  // Supabase client automatically sets Authorization and apikey headers
  supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
    global: {
      fetch: createFetchWithTimeout(30000), // 30 second timeout for WSL2
      // Don't override headers - let Supabase set Authorization and apikey automatically
    },
  })
  
  // Verify the client is properly initialized
  if (supabaseAdmin) {
    console.log('Supabase admin client initialized successfully')
    console.log('Service role key present:', !!supabaseServiceKey && supabaseServiceKey.length > 0)
  }
} catch (error) {
  console.error('Failed to initialize Supabase admin client:', error)
  // Don't throw - let the API routes handle the error
}

export { supabaseAdmin }

