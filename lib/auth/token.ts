import bcrypt from 'bcryptjs'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { randomBytes } from 'crypto'

export interface TokenData {
  id: string
  name: string
  scopes: string[]
  rateLimitPerMinute: number
  monthlyQuota: number | null
  ipWhitelist: string[]
  isActive: boolean
}

export async function hashToken(token: string): Promise<string> {
  return bcrypt.hash(token, 10)
}

export async function verifyToken(token: string, hash: string): Promise<boolean> {
  return bcrypt.compare(token, hash)
}

export async function createToken(
  name: string,
  scopes: string[],
  rateLimitPerMinute: number = 60,
  monthlyQuota: number | null = null,
  ipWhitelist: string[] = [],
  createdBy?: string
): Promise<{ token: string; tokenData: TokenData }> {
  // Generate a secure token (64 bytes = 128 hex chars)
  const tokenBytes = randomBytes(64)
  const token = `mm_${tokenBytes.toString('hex')}`
  const tokenHash = await hashToken(token)

  const { data, error } = await supabaseAdmin
    .from('api_tokens')
    .insert({
      name,
      token_hash: tokenHash,
      scopes,
      rate_limit_per_minute: rateLimitPerMinute,
      monthly_quota: monthlyQuota,
      ip_whitelist: ipWhitelist,
      is_active: true,
      created_by: createdBy || null,
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create token: ${error.message}`)
  }

  return {
    token,
    tokenData: {
      id: data.id,
      name: data.name,
      scopes: data.scopes,
      rateLimitPerMinute: data.rate_limit_per_minute,
      monthlyQuota: data.monthly_quota,
      ipWhitelist: data.ip_whitelist || [],
      isActive: data.is_active,
    },
  }
}

export async function validateToken(token: string): Promise<TokenData | null> {
  const { data: tokens, error } = await supabaseAdmin
    .from('api_tokens')
    .select('*')
    .eq('is_active', true)

  if (error || !tokens) {
    return null
  }

  for (const tokenRecord of tokens) {
    const isValid = await verifyToken(token, tokenRecord.token_hash)
    if (isValid) {
      // Update last_used_at
      await supabaseAdmin
        .from('api_tokens')
        .update({ last_used_at: new Date().toISOString() })
        .eq('id', tokenRecord.id)

      return {
        id: tokenRecord.id,
        name: tokenRecord.name,
        scopes: tokenRecord.scopes,
        rateLimitPerMinute: tokenRecord.rate_limit_per_minute,
        monthlyQuota: tokenRecord.monthly_quota,
        ipWhitelist: tokenRecord.ip_whitelist || [],
        isActive: tokenRecord.is_active,
      }
    }
  }

  return null
}

export async function revokeToken(tokenId: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from('api_tokens')
    .update({ is_active: false })
    .eq('id', tokenId)

  if (error) {
    throw new Error(`Failed to revoke token: ${error.message}`)
  }
}

