'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'

interface Token {
  id: string
  name: string
  scopes: string[]
  rate_limit_per_minute: number
  monthly_quota: number | null
  is_active: boolean
  last_used_at: string | null
  created_at: string
}

export default function TokensPage() {
  const [tokens, setTokens] = useState<Token[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [newToken, setNewToken] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    scopes: ['all'] as string[],
    rate_limit_per_minute: 60,
    monthly_quota: null as number | null,
  })

  useEffect(() => {
    loadTokens()
  }, [])

  const loadTokens = async () => {
    const { data, error } = await supabase
      .from('api_tokens')
      .select('*')
      .order('created_at', { ascending: false })

    if (!error && data) {
      setTokens(data)
    }
    setLoading(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      const url = editingId 
        ? `/api/dashboard/tokens/${editingId}`
        : '/api/dashboard/tokens'
      const method = editingId ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      let result: any = {}
      try {
        const text = await response.text()
        if (text) {
          result = JSON.parse(text)
        }
      } catch (parseError) {
        console.error('Failed to parse JSON response:', parseError)
        if (response.ok) {
          result = { message: 'Token saved successfully' }
        } else {
          result = { error: `Server returned ${response.status}` }
        }
      }
      
      if (response.ok) {
        if (result.token) {
          setNewToken(result.token)
        }
        setShowForm(false)
        setEditingId(null)
        setFormData({ name: '', scopes: ['all'], rate_limit_per_minute: 60, monthly_quota: null })
        loadTokens()
      } else {
        const errorMessage = result.error || `Server returned ${response.status}`
        console.error('Error saving token:', errorMessage)
        alert(`Error: ${errorMessage}`)
      }
    } catch (error: any) {
      console.error('Error saving token:', error)
      alert(`Error: ${error.message || 'Failed to save token'}`)
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (token: Token) => {
    setEditingId(token.id)
    setFormData({
      name: token.name,
      scopes: token.scopes,
      rate_limit_per_minute: token.rate_limit_per_minute,
      monthly_quota: token.monthly_quota,
    })
    setShowForm(true)
  }

  const handleCancel = () => {
    setShowForm(false)
    setEditingId(null)
    setFormData({ name: '', scopes: ['all'], rate_limit_per_minute: 60, monthly_quota: null })
  }

  const handleRevoke = async (tokenId: string) => {
    if (confirm('Are you sure you want to revoke this token?')) {
      await fetch(`/api/dashboard/tokens/${tokenId}`, { method: 'DELETE' })
      loadTokens()
    }
  }

  if (loading) {
    return <div>Loading...</div>
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">API Tokens</h1>
        <button
          onClick={() => {
            if (showForm) {
              handleCancel()
            } else {
              setShowForm(true)
            }
          }}
          className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
        >
          {showForm ? 'Cancel' : 'Create Token'}
        </button>
      </div>

      {newToken && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <p className="font-semibold text-yellow-800">Token created! Copy it now - you won&apos;t see it again:</p>
          <code className="block mt-2 p-2 bg-yellow-100 rounded text-sm break-all">{newToken}</code>
          <button
            onClick={() => {
              navigator.clipboard.writeText(newToken)
              setNewToken(null)
            }}
            className="mt-2 px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700"
          >
            Copy & Dismiss
          </button>
        </div>
      )}

      {showForm && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">
            {editingId ? 'Edit Token' : 'Create Token'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Name</label>
              <input
                type="text"
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">Scopes</label>
              <div className="flex flex-wrap gap-2">
                {[
                  { value: 'all', label: 'All', color: 'indigo' },
                  { value: 'chat', label: 'Chat', color: 'blue' },
                  { value: 'embeddings', label: 'Embeddings', color: 'purple' },
                  { value: 'models', label: 'Models', color: 'green' },
                ].map((scope) => {
                  const isSelected = formData.scopes.includes(scope.value)
                  const colorClasses = {
                    indigo: isSelected
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-md'
                      : 'bg-white text-indigo-600 border-indigo-300 hover:bg-indigo-50',
                    blue: isSelected
                      ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                      : 'bg-white text-blue-600 border-blue-300 hover:bg-blue-50',
                    purple: isSelected
                      ? 'bg-purple-600 text-white border-purple-600 shadow-md'
                      : 'bg-white text-purple-600 border-purple-300 hover:bg-purple-50',
                    green: isSelected
                      ? 'bg-green-600 text-white border-green-600 shadow-md'
                      : 'bg-white text-green-600 border-green-300 hover:bg-green-50',
                  }
                  
                  return (
                    <button
                      key={scope.value}
                      type="button"
                      onClick={() => {
                        let newScopes: string[]
                        if (scope.value === 'all') {
                          // If "all" is clicked, toggle it
                          newScopes = isSelected ? ['chat'] : ['all'] // Default to 'chat' if deselecting 'all' to ensure at least one scope
                        } else {
                          // If individual scope is clicked
                          if (isSelected) {
                            // Remove this scope
                            newScopes = formData.scopes.filter((s) => s !== scope.value)
                            // If no scopes left, select "all" to ensure at least one scope
                            if (newScopes.length === 0) {
                              newScopes = ['all']
                            }
                          } else {
                            // Add this scope, but remove "all" if it's selected
                            newScopes = formData.scopes.filter((s) => s !== 'all')
                            newScopes.push(scope.value)
                            // If all 3 individual scopes are selected, automatically select "all" instead
                            if (newScopes.length === 3 && !newScopes.includes('all')) {
                              newScopes = ['all']
                            }
                          }
                        }
                        setFormData({ ...formData, scopes: newScopes })
                      }}
                      className={`px-4 py-2 rounded-lg font-medium text-sm border-2 transition-all duration-200 transform hover:scale-105 active:scale-95 ${
                        colorClasses[scope.color as keyof typeof colorClasses]
                      }`}
                    >
                      {scope.label}
                      {isSelected && (
                        <span className="ml-2">✓</span>
                      )}
                    </button>
                  )
                })}
              </div>
              <p className="mt-2 text-xs text-gray-500">
                {formData.scopes.length === 0
                  ? 'Select at least one scope'
                  : formData.scopes.includes('all')
                  ? 'All permissions granted'
                  : `${formData.scopes.length} scope${formData.scopes.length > 1 ? 's' : ''} selected`}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Rate Limit (per minute)</label>
              <input
                type="number"
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                value={formData.rate_limit_per_minute}
                onChange={(e) =>
                  setFormData({ ...formData, rate_limit_per_minute: parseInt(e.target.value) })
                }
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Monthly Quota (optional)</label>
              <input
                type="number"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                value={formData.monthly_quota || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    monthly_quota: e.target.value ? parseInt(e.target.value) : null,
                  })
                }
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
            >
              {editingId ? 'Update' : 'Create'}
            </button>
          </form>
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Scopes</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rate Limit</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quota</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {tokens.map((token) => (
              <tr key={token.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {token.name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {token.scopes.join(', ')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {token.rate_limit_per_minute}/min
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {token.monthly_quota || 'Unlimited'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      token.is_active
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {token.is_active ? 'Active' : 'Revoked'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button
                    onClick={() => handleEdit(token)}
                    className="text-indigo-600 hover:text-indigo-900 mr-4"
                  >
                    Edit
                  </button>
                  {token.is_active && (
                    <button
                      onClick={() => handleRevoke(token.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Revoke
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

