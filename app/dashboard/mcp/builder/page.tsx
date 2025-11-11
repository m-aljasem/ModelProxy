'use client'

import { useState, useEffect } from 'react'
import { Wrench, Plus, Save, Play, Code, Settings } from 'lucide-react'

interface Tool {
  id: string
  name: string
  description: string
  schema: any
  handler_type: 'http' | 'function' | 'script'
  handler_config: any
}

export default function MCPBuilderPage() {
  const [tools, setTools] = useState<Tool[]>([])
  const [loading, setLoading] = useState(true)
  const [showToolForm, setShowToolForm] = useState(false)
  const [editingTool, setEditingTool] = useState<Tool | null>(null)
  const [toolForm, setToolForm] = useState({
    name: '',
    description: '',
    handler_type: 'http' as 'http' | 'function' | 'script',
    schema: {
      type: 'object',
      properties: {} as Record<string, any>,
      required: [] as string[]
    },
    handler_config: {} as any,
  })

  useEffect(() => {
    loadTools()
  }, [])

  const loadTools = async () => {
    try {
      const response = await fetch('/api/mcp/tools')
      const result = await response.json()
      if (response.ok && result.data) {
        setTools(result.data)
      }
    } catch (error) {
      console.error('Error loading tools:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveTool = async () => {
    try {
      const url = editingTool ? `/api/mcp/tools/${editingTool.id}` : '/api/mcp/tools'
      const method = editingTool ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(toolForm),
      })

      const result = await response.json()

      if (response.ok) {
        setShowToolForm(false)
        setEditingTool(null)
        resetToolForm()
        loadTools()
        alert('Tool saved successfully!')
      } else {
        alert(`Error: ${result.error || 'Failed to save tool'}`)
      }
    } catch (error: any) {
      alert(`Error: ${error.message}`)
    }
  }

  const resetToolForm = () => {
    setToolForm({
      name: '',
      description: '',
      handler_type: 'http',
      schema: {
        type: 'object',
        properties: {},
        required: []
      },
      handler_config: {}
    })
  }

  const addProperty = () => {
    const propName = prompt('Property name:')
    if (!propName) return

    const propType = prompt('Property type (string, number, boolean, object, array):') || 'string'
    const propDescription = prompt('Property description:') || ''

    setToolForm({
      ...toolForm,
      schema: {
        ...toolForm.schema,
        properties: {
          ...toolForm.schema.properties,
          [propName]: {
            type: propType,
            description: propDescription
          }
        }
      }
    })
  }

  const removeProperty = (propName: string) => {
    const newProperties = { ...toolForm.schema.properties }
    delete newProperties[propName]
    setToolForm({
      ...toolForm,
      schema: {
        ...toolForm.schema,
        properties: newProperties,
        required: toolForm.schema.required.filter(r => r !== propName)
      }
    })
  }

  const toggleRequired = (propName: string) => {
    const isRequired = toolForm.schema.required.includes(propName)
    setToolForm({
      ...toolForm,
      schema: {
        ...toolForm.schema,
        required: isRequired
          ? toolForm.schema.required.filter(r => r !== propName)
          : [...toolForm.schema.required, propName]
      }
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Wrench className="w-8 h-8 text-indigo-600" />
            MCP Builder
          </h1>
          <p className="text-gray-600 mt-2">
            Create custom MCP tools and capabilities for your models
          </p>
        </div>
        <button
          onClick={() => {
            setShowToolForm(true)
            setEditingTool(null)
            resetToolForm()
          }}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          New Tool
        </button>
      </div>

      {showToolForm && (
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200 space-y-6">
          <h2 className="text-xl font-semibold">
            {editingTool ? 'Edit Tool' : 'Create New Tool'}
          </h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tool Name *
              </label>
              <input
                type="text"
                value={toolForm.name}
                onChange={(e) => setToolForm({ ...toolForm, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                placeholder="e.g., web_search"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Handler Type *
              </label>
              <select
                value={toolForm.handler_type}
                onChange={(e) => setToolForm({ ...toolForm, handler_type: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              >
                <option value="http">HTTP Request</option>
                <option value="function">Function</option>
                <option value="script">Script</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description *
            </label>
            <textarea
              value={toolForm.description}
              onChange={(e) => setToolForm({ ...toolForm, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              rows={3}
              placeholder="What does this tool do?"
              required
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Schema Properties
              </label>
              <button
                onClick={addProperty}
                className="text-sm text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
              >
                <Plus className="w-4 h-4" />
                Add Property
              </button>
            </div>
            <div className="border border-gray-200 rounded-lg p-4 space-y-2 max-h-64 overflow-y-auto">
              {Object.keys(toolForm.schema.properties).length === 0 ? (
                  <div className="text-gray-500 text-sm text-center py-4">
                    No properties yet. Click &quot;Add Property&quot; to add one.
                  </div>
              ) : (
                Object.entries(toolForm.schema.properties).map(([name, prop]: [string, any]) => (
                  <div key={name} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{name}</div>
                      <div className="text-sm text-gray-600">
                        {prop.type} - {prop.description || 'No description'}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="flex items-center gap-1 text-sm">
                        <input
                          type="checkbox"
                          checked={toolForm.schema.required.includes(name)}
                          onChange={() => toggleRequired(name)}
                        />
                        Required
                      </label>
                      <button
                        onClick={() => removeProperty(name)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Handler Configuration (JSON)
            </label>
            <textarea
              value={JSON.stringify(toolForm.handler_config, null, 2)}
              onChange={(e) => {
                try {
                  setToolForm({
                    ...toolForm,
                    handler_config: JSON.parse(e.target.value)
                  })
                } catch {
                  // Invalid JSON, ignore
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-mono text-sm"
              rows={6}
              placeholder='{"url": "https://api.example.com", "method": "GET"}'
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleSaveTool}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <Save className="w-5 h-5" />
              Save Tool
            </button>
            <button
              onClick={() => {
                setShowToolForm(false)
                setEditingTool(null)
              }}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold">Available Tools</h2>
          <p className="text-sm text-gray-600 mt-1">
            Tools you can use in your MCP configurations
          </p>
        </div>
        <div className="p-6">
          {loading ? (
            <div className="text-center text-gray-500 py-8">Loading tools...</div>
          ) : tools.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              No tools found. Create one to get started.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {tools.map((tool) => (
                <div
                  key={tool.id}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-gray-900">{tool.name}</h3>
                    <span className="text-xs px-2 py-1 bg-indigo-100 text-indigo-800 rounded">
                      {tool.handler_type}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">{tool.description}</p>
                  <div className="text-xs text-gray-500">
                    {Object.keys(tool.schema.properties || {}).length} properties
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

