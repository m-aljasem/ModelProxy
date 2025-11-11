'use client'

import { useState, useEffect } from 'react'

interface Endpoint {
  id: string
  name: string
  path: string
  model: string
  is_active: boolean
  providers: { name: string; type: string }
}

export default function EndpointsPage() {
  const [endpoints, setEndpoints] = useState<Endpoint[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
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
      const response = await fetch('/api/dashboard/endpoints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const result = await response.json()

      if (response.ok) {
        setShowForm(false)
        setFormData({ name: '', path: '', model: '', provider_id: '' })
        loadEndpoints()
      } else {
        console.error('Error creating endpoint:', result.error)
        alert(`Error: ${result.error}`)
      }
    } catch (error: any) {
      console.error('Error creating endpoint:', error)
      alert(`Error: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div>Loading...</div>
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Endpoints</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
        >
          {showForm ? 'Cancel' : 'Create Endpoint'}
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Create Endpoint</h2>
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
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Path</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Model</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Provider</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
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
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

