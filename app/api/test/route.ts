import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

/**
 * Mock API endpoint for testing
 * Returns a simple success message without requiring real OpenAI/OpenRouter models
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Return a mock response that simulates a successful API call
    return NextResponse.json({
      message: 'the api is working',
      success: true,
      timestamp: new Date().toISOString(),
      requestBody: body,
    })
  } catch (error: any) {
    return NextResponse.json({
      message: 'the api is working',
      success: true,
      timestamp: new Date().toISOString(),
      error: error.message,
    })
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'the api is working',
    success: true,
    timestamp: new Date().toISOString(),
  })
}

