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
    const response = await fetch('/api/dashboard/tokens', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    })

    const result = await response.json()
    if (result.token) {
      setNewToken(result.token)
      setShowForm(false)
      setFormData({ name: '', scopes: ['all'], rate_limit_per_minute: 60, monthly_quota: null })
      loadTokens()
    }
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
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
        >
          {showForm ? 'Cancel' : 'Create Token'}
        </button>
      </div>

      {newToken && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <p className="font-semibold text-yellow-800">Token created! Copy it now - you won't see it again:</p>
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
          <h2 className="text-xl font-semibold mb-4">Create Token</h2>
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
              <label className="block text-sm font-medium text-gray-700">Scopes</label>
              <select
                multiple
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                value={formData.scopes}
                onChange={(e) => {
                  const selected = Array.from(e.target.selectedOptions, (opt) => opt.value)
                  setFormData({ ...formData, scopes: selected })
                }}
              >
                <option value="all">All</option>
                <option value="chat">Chat</option>
                <option value="embeddings">Embeddings</option>
                <option value="models">Models</option>
              </select>
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
              Create
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
                <td className="px-6 py-4 whitespace-nowrap text-sm">
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

