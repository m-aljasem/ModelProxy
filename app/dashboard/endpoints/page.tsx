'use client'

import { useState, useEffect } from 'react'

interface Endpoint {
  id: string
  name: string
  path: string
  model: string
  is_active: boolean
  providers: { id: string; name: string; type: string }
}

export default function EndpointsPage() {
  const [endpoints, setEndpoints] = useState<Endpoint[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    path: '',
    model: '',
    provider_id: '',
  })
  const [providers, setProviders] = useState<any[]>([])

  useEffect(() => {
    loadEndpoints()
    loadProviders()
  }, [])

  const loadEndpoints = async () => {
    try {
      const response = await fetch('/api/dashboard/endpoints')
      const result = await response.json()
      
      if (response.ok && result.data) {
        setEndpoints(result.data)
      } else {
        console.error('Error loading endpoints:', result.error)
      }
    } catch (error) {
      console.error('Error loading endpoints:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadProviders = async () => {
    try {
      const response = await fetch('/api/dashboard/providers')
      const result = await response.json()
      
      if (response.ok && result.data) {
        setProviders(result.data.filter((p: any) => p.is_active).map((p: any) => ({ id: p.id, name: p.name })))
      }
    } catch (error) {
      console.error('Error loading providers:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      const url = editingId 
        ? `/api/dashboard/endpoints/${editingId}`
        : '/api/dashboard/endpoints'
      const method = editingId ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const result = await response.json()

      if (response.ok) {
        setShowForm(false)
        setEditingId(null)
        setFormData({ name: '', path: '', model: '', provider_id: '' })
        loadEndpoints()
      } else {
        console.error('Error saving endpoint:', result.error)
        alert(`Error: ${result.error}`)
      }
    } catch (error: any) {
      console.error('Error saving endpoint:', error)
      alert(`Error: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (endpoint: Endpoint) => {
    setEditingId(endpoint.id)
    setFormData({
      name: endpoint.name,
      path: endpoint.path,
      model: endpoint.model,
      provider_id: (endpoint.providers as any)?.id || '',
    })
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this endpoint?')) {
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/dashboard/endpoints/${id}`, {
        method: 'DELETE',
      })

      const result = await response.json()

      if (response.ok) {
        loadEndpoints()
      } else {
        console.error('Error deleting endpoint:', result.error)
        alert(`Error: ${result.error}`)
      }
    } catch (error: any) {
      console.error('Error deleting endpoint:', error)
      alert(`Error: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    setShowForm(false)
    setEditingId(null)
    setFormData({ name: '', path: '', model: '', provider_id: '' })
  }

  if (loading) {
    return <div>Loading...</div>
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Endpoints</h1>
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
          {showForm ? 'Cancel' : 'Create Endpoint'}
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">
            {editingId ? 'Edit Endpoint' : 'Create Endpoint'}
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
              <label className="block text-sm font-medium text-gray-700">Path</label>
              <input
                type="text"
                required
                placeholder="/api/chat"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                value={formData.path}
                onChange={(e) => setFormData({ ...formData, path: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Model</label>
              <input
                type="text"
                required
                placeholder="gpt-4"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                value={formData.model}
                onChange={(e) => setFormData({ ...formData, model: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Provider</label>
              <select
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                value={formData.provider_id}
                onChange={(e) => setFormData({ ...formData, provider_id: e.target.value })}
              >
                <option value="">Select provider</option>
                {providers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
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
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Path</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Model</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Provider</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {endpoints.map((endpoint) => (
              <tr key={endpoint.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {endpoint.name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{endpoint.path}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{endpoint.model}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {endpoint.providers?.name || 'N/A'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      endpoint.is_active
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {endpoint.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button
                    onClick={() => handleEdit(endpoint)}
                    className="text-indigo-600 hover:text-indigo-900 mr-4"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(endpoint.id)}
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

