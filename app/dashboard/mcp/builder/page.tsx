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

  const exampleTools = [
    {
      name: 'web_search',
      description: 'Search the web for information using DuckDuckGo',
      handler_type: 'http' as const,
      schema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'The search query to look up'
          }
        },
        required: ['query']
      },
      handler_config: {
        url: 'https://api.duckduckgo.com/?q={query}&format=json',
        method: 'GET'
      }
    },
    {
      name: 'calculate',
      description: 'Perform mathematical calculations',
      handler_type: 'function' as const,
      schema: {
        type: 'object',
        properties: {
          expression: {
            type: 'string',
            description: 'Mathematical expression to evaluate (e.g., "2 + 2", "10 * 5")'
          }
        },
        required: ['expression']
      },
      handler_config: {
        type: 'eval',
        sandbox: true
      }
    },
    {
      name: 'get_weather',
      description: 'Get current weather information for a location',
      handler_type: 'http' as const,
      schema: {
        type: 'object',
        properties: {
          location: {
            type: 'string',
            description: 'City name or location (e.g., "San Francisco", "New York")'
          },
          units: {
            type: 'string',
            description: 'Temperature units: "celsius" or "fahrenheit"',
            enum: ['celsius', 'fahrenheit']
          }
        },
        required: ['location']
      },
      handler_config: {
        url: 'https://api.openweathermap.org/data/2.5/weather?q={location}&units={units}&appid=YOUR_API_KEY',
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      }
    },
    {
      name: 'send_email',
      description: 'Send an email notification',
      handler_type: 'http' as const,
      schema: {
        type: 'object',
        properties: {
          to: {
            type: 'string',
            description: 'Recipient email address'
          },
          subject: {
            type: 'string',
            description: 'Email subject line'
          },
          body: {
            type: 'string',
            description: 'Email body content'
          }
        },
        required: ['to', 'subject', 'body']
      },
      handler_config: {
        url: 'https://api.example.com/send-email',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer {API_KEY}'
        },
        body: {
          to: '{to}',
          subject: '{subject}',
          body: '{body}'
        }
      }
    }
  ]

  const loadExample = (example: typeof exampleTools[0]) => {
    setToolForm({
      name: example.name,
      description: example.description,
      handler_type: example.handler_type,
      schema: JSON.parse(JSON.stringify(example.schema)), // Deep copy
      handler_config: JSON.parse(JSON.stringify(example.handler_config)) // Deep copy
    })
    setShowToolForm(true)
    setEditingTool(null)
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

      {/* Examples Section */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl shadow-lg border border-indigo-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Code className="w-6 h-6 text-indigo-600" />
          <h2 className="text-xl font-semibold text-gray-900">Example Tools</h2>
        </div>
        <p className="text-sm text-gray-600 mb-4">
          Click on any example below to load it into the editor. Edit and customize it to create your own tool!
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {exampleTools.map((example, index) => (
            <button
              key={index}
              onClick={() => loadExample(example)}
              className="text-left p-4 bg-white rounded-lg border border-gray-200 hover:border-indigo-400 hover:shadow-md transition-all group"
            >
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">
                  {example.name}
                </h3>
                <span className="text-xs px-2 py-1 bg-indigo-100 text-indigo-800 rounded">
                  {example.handler_type}
                </span>
              </div>
              <p className="text-sm text-gray-600 mb-2">{example.description}</p>
              <div className="text-xs text-gray-500">
                {Object.keys(example.schema.properties).length} property{Object.keys(example.schema.properties).length !== 1 ? 'ies' : ''}
              </div>
            </button>
          ))}
        </div>
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
            <div className="border border-gray-200 rounded-lg p-4 space-y-3 max-h-96 overflow-y-auto">
              {Object.keys(toolForm.schema.properties).length === 0 ? (
                  <div className="text-gray-500 text-sm text-center py-4">
                    No properties yet. Click &quot;Add Property&quot; to add one.
                  </div>
              ) : (
                Object.entries(toolForm.schema.properties).map(([name, prop]: [string, any]) => (
                  <div key={name} className="p-3 bg-gray-50 rounded-lg border border-gray-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="font-medium text-gray-900 mb-1">{name}</div>
                        <div className="text-xs text-gray-500 mb-2">
                          Type: <span className="font-mono">{prop.type}</span>
                          {prop.enum && (
                            <span className="ml-2">
                              Options: <span className="font-mono">{prop.enum.join(', ')}</span>
                            </span>
                          )}
                        </div>
                        <textarea
                          value={prop.description || ''}
                          onChange={(e) => {
                            const newProperties = { ...toolForm.schema.properties }
                            newProperties[name] = {
                              ...newProperties[name],
                              description: e.target.value
                            }
                            setToolForm({
                              ...toolForm,
                              schema: {
                                ...toolForm.schema,
                                properties: newProperties
                              }
                            })
                          }}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500"
                          placeholder="Property description..."
                          rows={2}
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-1 text-sm cursor-pointer">
                        <input
                          type="checkbox"
                          checked={toolForm.schema.required.includes(name)}
                          onChange={() => toggleRequired(name)}
                          className="cursor-pointer"
                        />
                        Required
                      </label>
                      <select
                        value={prop.type}
                        onChange={(e) => {
                          const newProperties = { ...toolForm.schema.properties }
                          newProperties[name] = {
                            ...newProperties[name],
                            type: e.target.value
                          }
                          setToolForm({
                            ...toolForm,
                            schema: {
                              ...toolForm.schema,
                              properties: newProperties
                            }
                          })
                        }}
                        className="text-xs px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500"
                      >
                        <option value="string">string</option>
                        <option value="number">number</option>
                        <option value="boolean">boolean</option>
                        <option value="object">object</option>
                        <option value="array">array</option>
                      </select>
                      <button
                        onClick={() => removeProperty(name)}
                        className="text-red-600 hover:text-red-800 text-sm font-medium"
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

