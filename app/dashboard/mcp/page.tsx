'use client'

import { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, Power, PowerOff, Puzzle } from 'lucide-react'

interface MCPConfig {
  id: string
  name: string
  description?: string
  endpoint_id: string
  enabled_tools: string[]
  system_prompt?: string
  is_active: boolean
  endpoints: {
    id: string
    name: string
    model: string
    path: string
    providers: {
      id: string
      name: string
      type: string
    }
  }
}

export default function MCPConfigsPage() {
  const [configs, setConfigs] = useState<MCPConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    endpoint_id: '',
    description: '',
    system_prompt: '',
  })
  const [endpoints, setEndpoints] = useState<any[]>([])
  const [tools, setTools] = useState<any[]>([])
  const [selectedTools, setSelectedTools] = useState<string[]>([])

  useEffect(() => {
    loadConfigs()
    loadEndpoints()
    loadTools()
  }, [])

  const loadConfigs = async () => {
    try {
      const response = await fetch('/api/mcp/configs')
      const result = await response.json()
      if (response.ok && result.data) {
        setConfigs(result.data)
      }
    } catch (error) {
      console.error('Error loading MCP configs:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadEndpoints = async () => {
    try {
      const response = await fetch('/api/dashboard/endpoints')
      const result = await response.json()
      if (response.ok && result.data) {
        setEndpoints(result.data.filter((e: any) => e.is_active))
      }
    } catch (error) {
      console.error('Error loading endpoints:', error)
    }
  }

  const loadTools = async () => {
    try {
      const response = await fetch('/api/mcp/tools')
      const result = await response.json()
      if (response.ok && result.data) {
        setTools(result.data.filter((t: any) => t.is_active))
      }
    } catch (error) {
      console.error('Error loading tools:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const url = editingId ? `/api/mcp/configs/${editingId}` : '/api/mcp/configs'
      const method = editingId ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          enabled_tools: selectedTools,
        }),
      })

      const result = await response.json()

      if (response.ok) {
        setShowForm(false)
        setEditingId(null)
        setFormData({ name: '', endpoint_id: '', description: '', system_prompt: '' })
        setSelectedTools([])
        loadConfigs()
      } else {
        alert(`Error: ${result.error || 'Failed to save MCP config'}`)
      }
    } catch (error: any) {
      alert(`Error: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (config: MCPConfig) => {
    setEditingId(config.id)
    setFormData({
      name: config.name,
      endpoint_id: config.endpoint_id,
      description: config.description || '',
      system_prompt: config.system_prompt || '',
    })
    setSelectedTools(config.enabled_tools || [])
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this MCP config?')) return

    try {
      const response = await fetch(`/api/mcp/configs/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        loadConfigs()
      } else {
        const result = await response.json()
        alert(`Error: ${result.error || 'Failed to delete'}`)
      }
    } catch (error: any) {
      alert(`Error: ${error.message}`)
    }
  }

  const handleToggleActive = async (config: MCPConfig) => {
    try {
      const response = await fetch(`/api/mcp/configs/${config.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !config.is_active }),
      })

      if (response.ok) {
        loadConfigs()
      }
    } catch (error: any) {
      alert(`Error: ${error.message}`)
    }
  }

  if (loading && configs.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading MCP configs...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Puzzle className="w-8 h-8 text-indigo-600" />
            MCP Configurations
          </h1>
          <p className="text-gray-600 mt-2">
            Configure Model Context Protocol capabilities for your endpoints
          </p>
        </div>
        <button
          onClick={() => {
            setShowForm(true)
            setEditingId(null)
            setFormData({ name: '', endpoint_id: '', description: '', system_prompt: '' })
            setSelectedTools([])
          }}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          New MCP Config
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
          <h2 className="text-xl font-semibold mb-4">
            {editingId ? 'Edit MCP Config' : 'Create New MCP Config'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Endpoint *
              </label>
              <select
                value={formData.endpoint_id}
                onChange={(e) => setFormData({ ...formData, endpoint_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                required
              >
                <option value="">Select an endpoint</option>
                {endpoints.map((endpoint) => (
                  <option key={endpoint.id} value={endpoint.id}>
                    {endpoint.name} ({endpoint.model})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                rows={2}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                System Prompt
              </label>
              <textarea
                value={formData.system_prompt}
                onChange={(e) => setFormData({ ...formData, system_prompt: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                rows={4}
                placeholder="Optional system prompt to inject for MCP capabilities..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Enabled Tools *
              </label>
              <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-3">
                {tools.map((tool) => (
                  <label key={tool.id} className="flex items-start space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedTools.includes(tool.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedTools([...selectedTools, tool.id])
                        } else {
                          setSelectedTools(selectedTools.filter(id => id !== tool.id))
                        }
                      }}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{tool.name}</div>
                      <div className="text-sm text-gray-600">{tool.description}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                {editingId ? 'Update' : 'Create'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false)
                  setEditingId(null)
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Endpoint
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tools
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {configs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    No MCP configs found. Create one to get started.
                  </td>
                </tr>
              ) : (
                configs.map((config) => (
                  <tr key={config.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">{config.name}</div>
                      {config.description && (
                        <div className="text-sm text-gray-500">{config.description}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{config.endpoints?.name}</div>
                      <div className="text-sm text-gray-500">{config.endpoints?.model}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        {config.enabled_tools?.length || 0} tools enabled
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => handleToggleActive(config)}
                        className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${
                          config.is_active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {config.is_active ? (
                          <>
                            <Power className="w-4 h-4" />
                            Active
                          </>
                        ) : (
                          <>
                            <PowerOff className="w-4 h-4" />
                            Inactive
                          </>
                        )}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEdit(config)}
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          <Edit className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(config.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

