'use client'

import { useState, useEffect } from 'react'

interface Model {
  id: string
  name: string
  provider_id: string
  model_identifier: string
  description: string | null
  is_active: boolean
  created_at: string
  providers: { id: string; name: string; type: string }
}

interface Provider {
  id: string
  name: string
  type: string
}

export default function ModelsPage() {
  const [models, setModels] = useState<Model[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    provider_id: '',
    model_identifier: '',
    description: '',
  })
  const [providers, setProviders] = useState<Provider[]>([])

  useEffect(() => {
    loadModels()
    loadProviders()
  }, [])

  const loadModels = async () => {
    try {
      const response = await fetch('/api/dashboard/models')
      let result: any = {}
      
      try {
        const text = await response.text()
        if (text) {
          result = JSON.parse(text)
        }
      } catch (parseError) {
        console.error('Failed to parse JSON response:', parseError)
        if (!response.ok) {
          result = { error: `Server returned ${response.status}` }
        }
      }
      
      if (response.ok && result.data) {
        setModels(result.data)
      } else {
        console.error('Error loading models:', result.error)
      }
    } catch (error) {
      console.error('Error loading models:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadProviders = async () => {
    try {
      const response = await fetch('/api/dashboard/providers')
      let result: any = {}
      
      try {
        const text = await response.text()
        if (text) {
          result = JSON.parse(text)
        }
      } catch (parseError) {
        console.error('Failed to parse JSON response:', parseError)
      }
      
      if (response.ok && result.data) {
        setProviders(result.data.filter((p: any) => p.is_active).map((p: any) => ({ id: p.id, name: p.name, type: p.type })))
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
        ? `/api/dashboard/models/${editingId}`
        : '/api/dashboard/models'
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
          result = { message: 'Model saved successfully' }
        } else {
          throw new Error('Invalid response from server')
        }
      }

      if (response.ok) {
        setShowForm(false)
        setEditingId(null)
        setFormData({ name: '', provider_id: '', model_identifier: '', description: '' })
        loadModels()
      } else {
        const errorMessage = result.error || result.message || `Server returned ${response.status}`
        console.error('Error saving model:', errorMessage)
        alert(`Error: ${errorMessage}`)
      }
    } catch (error: any) {
      console.error('Error saving model:', error)
      const errorMessage = error.message || 'Failed to save model. Please try again.'
      alert(`Error: ${errorMessage}`)
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (model: Model) => {
    setEditingId(model.id)
    setFormData({
      name: model.name,
      provider_id: model.provider_id,
      model_identifier: model.model_identifier,
      description: model.description || '',
    })
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this model?')) {
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/dashboard/models/${id}`, {
        method: 'DELETE',
      })

      let result: any = {}
      try {
        const text = await response.text()
        if (text) {
          result = JSON.parse(text)
        }
      } catch (parseError) {
        console.error('Failed to parse JSON response:', parseError)
        if (!response.ok) {
          result = { error: `Server returned ${response.status}` }
        }
      }

      if (response.ok) {
        loadModels()
      } else {
        const errorMessage = result.error || `Server returned ${response.status}`
        console.error('Error deleting model:', errorMessage)
        alert(`Error: ${errorMessage}`)
      }
    } catch (error: any) {
      console.error('Error deleting model:', error)
      alert(`Error: ${error.message || 'Failed to delete model'}`)
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    setShowForm(false)
    setEditingId(null)
    setFormData({ name: '', provider_id: '', model_identifier: '', description: '' })
  }

  if (loading && models.length === 0) {
    return <div>Loading...</div>
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Models</h1>
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
          {showForm ? 'Cancel' : 'Add Model'}
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">
            {editingId ? 'Edit Model' : 'Add Model'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Name</label>
              <input
                type="text"
                required
                placeholder="GPT-4"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
              <p className="mt-1 text-xs text-gray-500">Display name for this model</p>
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
                    {p.name} ({p.type})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Model Identifier</label>
              <input
                type="text"
                required
                placeholder="gpt-4"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                value={formData.model_identifier}
                onChange={(e) => setFormData({ ...formData, model_identifier: e.target.value })}
              />
              <p className="mt-1 text-xs text-gray-500">The actual model identifier used by the provider API</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Description (Optional)</label>
              <textarea
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of this model..."
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
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Provider</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Identifier</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {models.map((model) => (
              <tr key={model.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {model.name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {model.providers?.name || 'N/A'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <code className="bg-gray-100 px-2 py-1 rounded">{model.model_identifier}</code>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {model.description || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      model.is_active
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {model.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button
                    onClick={() => handleEdit(model)}
                    className="text-indigo-600 hover:text-indigo-900 mr-4"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(model.id)}
                    className="text-red-600 hover:text-red-900"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {models.length === 0 && (
          <div className="px-6 py-8 text-center text-gray-500">
            No models found. Add your first model to get started.
          </div>
        )}
      </div>
    </div>
  )
}

