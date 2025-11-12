'use client'

import { useState, useEffect } from 'react'
import { Play, CheckCircle, XCircle, Loader2 } from 'lucide-react'

interface Endpoint {
  id: string
  name: string
  path: string
  model: string
  is_active: boolean
  requires_auth?: boolean
  providers: { name: string; type: string }
}

interface TestResult {
  endpoint: string
  success: boolean
  response?: any
  error?: string
  timestamp: string
  duration?: number
  curlCommand?: string
  requestBody?: any
}

export default function TestPage() {
  const [endpoints, setEndpoints] = useState<Endpoint[]>([])
  const [loading, setLoading] = useState(true)
  const [testing, setTesting] = useState(false)
  const [testResults, setTestResults] = useState<TestResult[]>([])
  const [selectedEndpointPath, setSelectedEndpointPath] = useState<string>('')
  const [testType, setTestType] = useState<'real' | 'mock'>('real')
  const [apiToken, setApiToken] = useState<string>('')
  
  // Get the selected endpoint object
  const selectedEndpoint = endpoints.find(e => e.path === selectedEndpointPath)
  const requiresAuth = selectedEndpoint ? (selectedEndpoint.requires_auth !== false) : true

  useEffect(() => {
    loadEndpoints()
  }, [])

  const loadEndpoints = async () => {
    try {
      const response = await fetch('/api/dashboard/endpoints')
      const result = await response.json()
      
      if (response.ok && result.data) {
        setEndpoints(result.data.filter((e: Endpoint) => e.is_active))
      } else {
        console.error('Error loading endpoints:', result.error)
      }
    } catch (error) {
      console.error('Error loading endpoints:', error)
    } finally {
      setLoading(false)
    }
  }

  const generateCurlCommand = (url: string, method: string, headers: Record<string, string>, body: any): string => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
    const fullUrl = `${baseUrl}${url}`
    let curl = `curl -X ${method} "${fullUrl}"`
    
    // Add headers
    for (const [key, value] of Object.entries(headers)) {
      // Escape quotes in header values
      const escapedValue = value.replace(/"/g, '\\"')
      curl += ` \\\n  -H "${key}: ${escapedValue}"`
    }
    
    // Add body if present
    if (body) {
      const bodyStr = JSON.stringify(body)
      // Escape single quotes for shell compatibility
      const escapedBody = bodyStr.replace(/'/g, "'\\''")
      curl += ` \\\n  -d '${escapedBody}'`
    }
    
    return curl
  }

  const testMockAPI = async (): Promise<TestResult> => {
    const startTime = Date.now()
    const requestBody = {
      test: true,
      message: 'Testing mock API',
    }
    const headers = { 'Content-Type': 'application/json' }
    
    try {
      const response = await fetch('/api/test', {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
      })

      const data = await response.json()
      const duration = Date.now() - startTime

      return {
        endpoint: '/api/test (Mock)',
        success: response.ok && data.message === 'the api is working',
        response: data,
        timestamp: new Date().toISOString(),
        duration,
        curlCommand: generateCurlCommand('/api/test', 'POST', headers, requestBody),
        requestBody,
      }
    } catch (error: any) {
      return {
        endpoint: '/api/test (Mock)',
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
        duration: Date.now() - startTime,
        curlCommand: generateCurlCommand('/api/test', 'POST', headers, requestBody),
        requestBody,
      }
    }
  }

  const testRealAPI = async (endpointPath: string): Promise<TestResult> => {
    const startTime = Date.now()
    try {
      // Find the endpoint to get its model and auth requirements
      const endpoint = endpoints.find(e => e.path === endpointPath)
      const endpointRequiresAuth = endpoint ? (endpoint.requires_auth !== false) : true
      const endpointModel = endpoint?.model || 'gpt-3.5-turbo'
      
      if (endpointRequiresAuth && !apiToken) {
        return {
          endpoint: endpointPath,
          success: false,
          error: 'API token is required for this endpoint',
          timestamp: new Date().toISOString(),
        }
      }

      const requestBody: any = {
        endpoint: endpointPath,
        messages: [
          {
            role: 'user',
            content: 'Say "the api is working"',
          },
        ],
      }
      
      // Only include model if endpoint doesn't have a predefined model (model_id)
      // For now, we'll include it if the endpoint has a model specified
      if (endpointModel) {
        requestBody.model = endpointModel
      }
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }
      
      // Only add Authorization header if auth is required
      if (endpointRequiresAuth && apiToken) {
        headers['Authorization'] = `Bearer ${apiToken}`
      }

      // Test chat endpoint
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
      })

      const data = await response.json()
      const duration = Date.now() - startTime

      return {
        endpoint: endpointPath,
        success: response.ok,
        response: data,
        error: response.ok ? undefined : data.error || 'Unknown error',
        timestamp: new Date().toISOString(),
        duration,
        curlCommand: generateCurlCommand('/api/chat', 'POST', headers, requestBody),
        requestBody,
      }
    } catch (error: any) {
      // Find the endpoint for error case too
      const endpoint = endpoints.find(e => e.path === endpointPath)
      const endpointRequiresAuth = endpoint ? (endpoint.requires_auth !== false) : true
      const endpointModel = endpoint?.model || 'gpt-3.5-turbo'
      
      const requestBody: any = {
        endpoint: endpointPath,
        messages: [
          {
            role: 'user',
            content: 'Say "the api is working"',
          },
        ],
      }
      
      if (endpointModel) {
        requestBody.model = endpointModel
      }
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }
      
      if (endpointRequiresAuth && apiToken) {
        headers['Authorization'] = `Bearer ${apiToken}`
      }
      
      return {
        endpoint: endpointPath,
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
        duration: Date.now() - startTime,
        curlCommand: generateCurlCommand('/api/chat', 'POST', headers, requestBody),
        requestBody,
      }
    }
  }

  const handleTest = async () => {
    setTesting(true)
    const results: TestResult[] = []

    if (testType === 'mock') {
      // Test mock API
      const mockResult = await testMockAPI()
      results.push(mockResult)
    } else {
      // Test real APIs
      if (selectedEndpointPath) {
        // Test specific endpoint
        const result = await testRealAPI(selectedEndpointPath)
        results.push(result)
      } else {
        // Test all active endpoints
        for (const endpoint of endpoints) {
          const result = await testRealAPI(endpoint.path)
          results.push(result)
        }
      }
    }

    setTestResults(results)
    setTesting(false)
  }

  const clearResults = () => {
    setTestResults([])
  }

  if (loading) {
    return <div>Loading...</div>
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">API Testing</h1>
        <button
          onClick={clearResults}
          className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
        >
          Clear Results
        </button>
      </div>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Test Configuration</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Test Type
            </label>
            <div className="flex gap-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  value="mock"
                  checked={testType === 'mock'}
                  onChange={(e) => setTestType(e.target.value as 'mock')}
                  className="mr-2"
                />
                Mock API (No real models required)
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="real"
                  checked={testType === 'real'}
                  onChange={(e) => setTestType(e.target.value as 'real')}
                  className="mr-2"
                />
                Real API (Tests user-defined endpoints)
              </label>
            </div>
          </div>

          {testType === 'real' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Endpoint (optional - leave empty to test all)
                </label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  value={selectedEndpointPath}
                  onChange={(e) => setSelectedEndpointPath(e.target.value)}
                >
                  <option value="">All Active Endpoints</option>
                  {endpoints.map((endpoint) => (
                    <option key={endpoint.id} value={endpoint.path}>
                      {endpoint.name} ({endpoint.path})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  API Token {!requiresAuth && <span className="text-gray-500 font-normal">(Not required for selected endpoint)</span>}
                </label>
                <input
                  type="password"
                  disabled={!requiresAuth}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-md ${
                    !requiresAuth ? 'bg-gray-100 cursor-not-allowed' : ''
                  }`}
                  placeholder={requiresAuth ? "Enter your API token" : "Token not required for this endpoint"}
                  value={apiToken}
                  onChange={(e) => setApiToken(e.target.value)}
                />
                <p className="mt-1 text-sm text-gray-500">
                  {requiresAuth 
                    ? 'Required for testing this endpoint'
                    : 'This endpoint does not require authentication'}
                </p>
              </div>
            </>
          )}

          <button
            onClick={handleTest}
            disabled={testing || (testType === 'real' && requiresAuth && !apiToken && !selectedEndpointPath)}
            className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {testing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Testing...
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                Run Test
              </>
            )}
          </button>
        </div>
      </div>

      {testResults.length > 0 && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold">Test Results</h2>
          </div>
          <div className="divide-y divide-gray-200">
            {testResults.map((result, index) => (
              <div key={index} className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    {result.success ? (
                      <CheckCircle className="w-6 h-6 text-green-600" />
                    ) : (
                      <XCircle className="w-6 h-6 text-red-600" />
                    )}
                    <div>
                      <h3 className="font-semibold text-gray-900">{result.endpoint}</h3>
                      <p className="text-sm text-gray-500">
                        {new Date(result.timestamp).toLocaleString()}
                        {result.duration && ` • ${result.duration}ms`}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`px-3 py-1 text-xs font-semibold rounded-full ${
                      result.success
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {result.success ? 'Success' : 'Failed'}
                  </span>
                </div>

                {result.curlCommand && (
                  <div className="mt-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">cURL Command:</p>
                    <pre className="bg-gray-900 text-gray-100 p-3 rounded-md text-xs overflow-auto max-h-64">
                      <code>{result.curlCommand}</code>
                    </pre>
                  </div>
                )}

                {result.error && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-sm text-red-800 font-medium">Error:</p>
                    <p className="text-sm text-red-600">{result.error}</p>
                  </div>
                )}

                {result.response && (
                  <div className="mt-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">Response:</p>
                    <pre className="bg-gray-50 p-3 rounded-md text-xs overflow-auto max-h-64">
                      {JSON.stringify(result.response, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {testResults.length === 0 && !testing && (
        <div className="bg-gray-50 rounded-lg p-8 text-center">
          <p className="text-gray-500">No test results yet. Run a test to see results here.</p>
        </div>
      )}
    </div>
  )
}

