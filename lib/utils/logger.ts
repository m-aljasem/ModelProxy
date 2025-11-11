import { randomBytes } from 'crypto'
import { supabaseAdmin } from '@/lib/supabase/admin'

export interface LogContext {
  correlationId?: string
  tokenId?: string
  endpointId?: string
  providerId?: string
  userId?: string
  [key: string]: unknown
}

export function generateCorrelationId(): string {
  return randomBytes(16).toString('hex')
}

export async function logUsage(params: {
  tokenId: string | null
  endpointId: string | null
  providerId: string | null
  status: 'success' | 'error' | 'timeout' | 'rate_limited'
  statusCode: number
  latencyMs: number
  requestSize: number
  responseSize: number
  model: string | null
  costEstimate: number | null
  errorMessage: string | null
  correlationId: string
  ipAddress: string | null
  userAgent: string | null
}): Promise<void> {
  try {
    if (!supabaseAdmin) {
      console.error('Supabase admin client not initialized for usage logging')
      return
    }
    const admin = supabaseAdmin as any
    await admin.rpc('log_usage', {
      p_token_id: params.tokenId,
      p_endpoint_id: params.endpointId,
      p_provider_id: params.providerId,
      p_status: params.status,
      p_status_code: params.statusCode,
      p_latency_ms: params.latencyMs,
      p_request_size: params.requestSize,
      p_response_size: params.responseSize,
      p_model: params.model,
      p_cost_estimate: params.costEstimate,
      p_error_message: params.errorMessage,
      p_correlation_id: params.correlationId,
      p_ip_address: params.ipAddress,
      p_user_agent: params.userAgent,
    })
  } catch (error) {
    console.error('Failed to log usage:', error)
  }
}

export async function logAudit(params: {
  userId: string | null
  action: string
  resourceType: string
  resourceId: string | null
  details: Record<string, unknown>
  ipAddress: string | null
}): Promise<void> {
  try {
    if (!supabaseAdmin) {
      console.error('Supabase admin client not initialized for audit logging')
      return
    }
    const admin = supabaseAdmin as any
    await admin.from('audit_logs').insert({
      user_id: params.userId,
      action: params.action,
      resource_type: params.resourceType,
      resource_id: params.resourceId,
      details: params.details,
      ip_address: params.ipAddress,
    })
  } catch (error) {
    console.error('Failed to log audit:', error)
  }
}

export function structuredLog(
  level: 'info' | 'warn' | 'error',
  message: string,
  context: LogContext = {}
): void {
  const logEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...context,
  }

  if (level === 'error') {
    console.error(JSON.stringify(logEntry))
  } else if (level === 'warn') {
    console.warn(JSON.stringify(logEntry))
  } else {
    console.log(JSON.stringify(logEntry))
  }
}

