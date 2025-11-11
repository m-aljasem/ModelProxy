'use client'

import { useState, useEffect } from 'react'
import { Play, CheckCircle, XCircle, Loader2 } from 'lucide-react'

interface Endpoint {
  id: string
  name: string
  path: string
  model: string
  is_active: boolean
  providers: { name: string; type: string }
}

interface TestResult {
  endpoint: string
  success: boolean
  response?: any
  error?: string
  timestamp: string
  duration?: number
}

export default function TestPage() {
  const [endpoints, setEndpoints] = useState<Endpoint[]>([])
  const [loading, setLoading] = useState(true)
  const [testing, setTesting] = useState(false)
  const [testResults, setTestResults] = useState<TestResult[]>([])
  const [selectedEndpoint, setSelectedEndpoint] = useState<string>('')
  const [testType, setTestType] = useState<'real' | 'mock'>('real')
  const [apiToken, setApiToken] = useState<string>('')

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

  const testMockAPI = async (): Promise<TestResult> => {
    const startTime = Date.now()
    try {
      const response = await fetch('/api/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          test: true,
          message: 'Testing mock API',
        }),
      })

      const data = await response.json()
      const duration = Date.now() - startTime

      return {
        endpoint: '/api/test (Mock)',
        success: response.ok && data.message === 'the api is working',
        response: data,
        timestamp: new Date().toISOString(),
        duration,
      }
    } catch (error: any) {
      return {
        endpoint: '/api/test (Mock)',
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
        duration: Date.now() - startTime,
      }
    }
  }

  const testRealAPI = async (endpointPath: string): Promise<TestResult> => {
    const startTime = Date.now()
    try {
      if (!apiToken) {
        return {
          endpoint: endpointPath,
          success: false,
          error: 'API token is required',
          timestamp: new Date().toISOString(),
        }
      }

      // Test chat endpoint
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiToken}`,
        },
        body: JSON.stringify({
          endpoint: endpointPath,
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'user',
              content: 'Say "the api is working"',
            },
          ],
        }),
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
      }
    } catch (error: any) {
      return {
        endpoint: endpointPath,
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
        duration: Date.now() - startTime,
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
      if (selectedEndpoint) {
        // Test specific endpoint
        const result = await testRealAPI(selectedEndpoint)
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
                  API Token
                </label>
                <input
                  type="password"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="Enter your API token"
                  value={apiToken}
                  onChange={(e) => setApiToken(e.target.value)}
                />
                <p className="mt-1 text-sm text-gray-500">
                  Required for testing real endpoints
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Endpoint (optional - leave empty to test all)
                </label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  value={selectedEndpoint}
                  onChange={(e) => setSelectedEndpoint(e.target.value)}
                >
                  <option value="">All Active Endpoints</option>
                  {endpoints.map((endpoint) => (
                    <option key={endpoint.id} value={endpoint.path}>
                      {endpoint.name} ({endpoint.path})
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          <button
            onClick={handleTest}
            disabled={testing || (testType === 'real' && !apiToken && !selectedEndpoint)}
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

