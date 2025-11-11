import { NextRequest, NextResponse } from 'next/server'
import { validateToken, type TokenData } from './token'
import { supabaseAdmin } from '@/lib/supabase/admin'

export interface AuthenticatedRequest extends NextRequest {
  tokenData?: TokenData
}

export async function authenticateToken(
  request: NextRequest
): Promise<{ tokenData: TokenData | null; error: string | null }> {
  const authHeader = request.headers.get('authorization')
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { tokenData: null, error: 'Missing or invalid authorization header' }
  }

  const token = authHeader.slice(7)
  const tokenData = await validateToken(token)

  if (!tokenData) {
    return { tokenData: null, error: 'Invalid or expired token' }
  }

  // Check IP whitelist if configured
  if (tokenData.ipWhitelist.length > 0) {
    const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0] ||
                     request.headers.get('x-real-ip') ||
                     'unknown'
    
    if (!tokenData.ipWhitelist.includes(clientIp)) {
      return { tokenData: null, error: 'IP address not allowed' }
    }
  }

  return { tokenData, error: null }
}

export async function checkRateLimit(
  tokenId: string,
  rateLimitPerMinute: number
): Promise<{ allowed: boolean; remaining: number }> {
  const oneMinuteAgo = new Date(Date.now() - 60 * 1000).toISOString()

  const { data, error } = await supabaseAdmin
    .from('usage_logs')
    .select('id')
    .eq('token_id', tokenId)
    .gte('created_at', oneMinuteAgo)

  if (error) {
    // On error, allow the request but log it
    console.error('Rate limit check error:', error)
    return { allowed: true, remaining: rateLimitPerMinute }
  }

  const requestCount = data?.length || 0
  const remaining = Math.max(0, rateLimitPerMinute - requestCount)
  const allowed = requestCount < rateLimitPerMinute

  return { allowed, remaining }
}

export async function checkQuota(
  tokenId: string,
  monthlyQuota: number | null
): Promise<{ allowed: boolean; remaining: number | null }> {
  if (monthlyQuota === null) {
    return { allowed: true, remaining: null }
  }

  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)

  const { data, error } = await supabaseAdmin
    .from('usage_logs')
    .select('id')
    .eq('token_id', tokenId)
    .gte('created_at', startOfMonth.toISOString())

  if (error) {
    console.error('Quota check error:', error)
    return { allowed: true, remaining: monthlyQuota }
  }

  const requestCount = data?.length || 0
  const remaining = Math.max(0, monthlyQuota - requestCount)
  const allowed = requestCount < monthlyQuota

  return { allowed, remaining }
}

export async function checkScope(
  tokenData: TokenData,
  requiredScope: string
): Promise<boolean> {
  return tokenData.scopes.includes('all') || tokenData.scopes.includes(requiredScope)
}

