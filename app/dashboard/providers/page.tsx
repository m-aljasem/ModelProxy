'use client'

import { useState, useEffect } from 'react'

interface Provider {
  id: string
  name: string
  type: string
  is_active: boolean
  created_at: string
}

export default function ProvidersPage() {
  const [providers, setProviders] = useState<Provider[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    type: 'openai',
    api_key: '',
    base_url: '',
  })

  useEffect(() => {
    loadProviders()
  }, [])

  const loadProviders = async () => {
    try {
      const response = await fetch('/api/dashboard/providers')
      const result = await response.json()
      
      if (response.ok && result.data) {
        setProviders(result.data)
      } else {
        console.error('Error loading providers:', result.error)
      }
    } catch (error) {
      console.error('Error loading providers:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      const url = editingId 
        ? `/api/dashboard/providers/${editingId}`
        : '/api/dashboard/providers'
      const method = editingId ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          type: formData.type,
          api_key: formData.api_key,
          base_url: formData.base_url || null,
        }),
      })

      // Check if response has content before parsing
      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text()
        console.error('Non-JSON response:', text)
        alert(`Error: Unexpected response format`)
        return
      }

      // Check if response is ok before parsing
      if (!response.ok) {
        const errorText = await response.text()
        let errorMessage = 'Unknown error'
        try {
          const errorJson = JSON.parse(errorText)
          errorMessage = errorJson.error || errorMessage
        } catch {
          errorMessage = errorText || `HTTP ${response.status}`
        }
        alert(`Error: ${errorMessage}`)
        return
      }

      const result = await response.json()

      if (result.data) {
        setShowForm(false)
        setEditingId(null)
        setFormData({ name: '', type: 'openai', api_key: '', base_url: '' })
        // Reload providers list
        await loadProviders()
      } else {
        console.error('Error saving provider:', result.error)
        alert(`Error: ${result.error || 'Unknown error'}`)
      }
    } catch (error: any) {
      console.error('Error saving provider:', error)
      alert(`Error: ${error.message || 'Failed to save provider'}`)
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (provider: Provider) => {
    setEditingId(provider.id)
    setFormData({
      name: provider.name,
      type: provider.type,
      api_key: '', // Don't show existing API key for security
      base_url: '', // We'll need to fetch this if needed
    })
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this provider? This will also delete all associated endpoints.')) {
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/dashboard/providers/${id}`, {
        method: 'DELETE',
      })

      const result = await response.json()

      if (response.ok) {
        loadProviders()
      } else {
        console.error('Error deleting provider:', result.error)
        alert(`Error: ${result.error}`)
      }
    } catch (error: any) {
      console.error('Error deleting provider:', error)
      alert(`Error: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    setShowForm(false)
    setEditingId(null)
    setFormData({ name: '', type: 'openai', api_key: '', base_url: '' })
  }

  if (loading) {
    return <div>Loading...</div>
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Providers</h1>
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
          {showForm ? 'Cancel' : 'Add Provider'}
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">
            {editingId ? 'Edit Provider' : 'Add Provider'}
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
              <label className="block text-sm font-medium text-gray-700">Type</label>
              <select
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              >
                <option value="openai">OpenAI</option>
                <option value="openrouter">OpenRouter</option>
                <option value="custom">Custom</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">API Key</label>
              <input
                type="password"
                required={!editingId}
                placeholder={editingId ? 'Leave blank to keep existing key' : ''}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                value={formData.api_key}
                onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
              />
              {editingId && (
                <p className="mt-1 text-sm text-gray-500">Leave blank to keep the existing API key</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Base URL (optional)</label>
              <input
                type="text"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                value={formData.base_url}
                onChange={(e) => setFormData({ ...formData, base_url: e.target.value })}
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
            >
              {editingId ? 'Update' : 'Add Provider'}
            </button>
          </form>
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {providers.map((provider) => (
              <tr key={provider.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {provider.name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{provider.type}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      provider.is_active
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {provider.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(provider.created_at).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button
                    onClick={() => handleEdit(provider)}
                    className="text-indigo-600 hover:text-indigo-900 mr-4"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(provider.id)}
                    className="text-red-600 hover:text-red-900"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

