import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'

/**
 * Create a Supabase client for API routes
 * This reads cookies from the NextRequest object and can set them in the response
 */
export function createApiRouteClient(
  request: NextRequest,
  response?: NextResponse
) {
  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_ANON_KEY environment variables')
  }

  let responseRef = response || new NextResponse()

  return {
    client: createServerClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        cookies: {
          get(name: string) {
            const cookie = request.cookies.get(name)
            return cookie?.value
          },
          set(name: string, value: string, options: CookieOptions) {
            // Update both request and response cookies
            request.cookies.set({ name, value, ...options })
            responseRef.cookies.set({ name, value, ...options })
          },
          remove(name: string, options: CookieOptions) {
            request.cookies.set({ name, value: '', ...options })
            responseRef.cookies.set({ name, value: '', ...options })
          },
        },
      }
    ),
    response: responseRef,
  }
}

