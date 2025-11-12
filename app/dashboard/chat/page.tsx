'use client'

import { useState, useEffect, useRef } from 'react'
import { Send, Loader2, MessageSquare } from 'lucide-react'

interface Endpoint {
  id: string
  name: string
  path: string
  model: string
  is_active: boolean
  requires_auth?: boolean
  model_id?: string
  providers: { id: string; name: string; type: string }
}

interface Provider {
  id: string
  name: string
  type: string
}

interface Model {
  id: string
  name: string
  provider_id: string
  model_identifier: string
  description: string | null
  is_active: boolean
  providers: { id: string; name: string; type: string }
}

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

type SelectionMode = 'endpoint' | 'provider_model'

export default function ChatPage() {
  const [selectionMode, setSelectionMode] = useState<SelectionMode>('endpoint')
  const [endpoints, setEndpoints] = useState<Endpoint[]>([])
  const [providers, setProviders] = useState<Provider[]>([])
  const [models, setModels] = useState<Model[]>([])
  const [selectedEndpoint, setSelectedEndpoint] = useState<Endpoint | null>(null)
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null)
  const [selectedModel, setSelectedModel] = useState<Model | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingEndpoints, setLoadingEndpoints] = useState(true)
  const [apiToken, setApiToken] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadEndpoints()
    loadProviders()
    // Load token from localStorage if available
    const savedToken = localStorage.getItem('chat_api_token')
    if (savedToken) {
      setApiToken(savedToken)
    }
  }, [])

  useEffect(() => {
    // Load models when provider is selected
    if (selectedProvider) {
      loadModels(selectedProvider.id)
    } else {
      setModels([])
      setSelectedModel(null)
    }
  }, [selectedProvider])

  useEffect(() => {
    // Save token to localStorage when it changes
    if (apiToken) {
      localStorage.setItem('chat_api_token', apiToken)
    }
  }, [apiToken])

  useEffect(() => {
    // Scroll to bottom when messages change
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const loadEndpoints = async () => {
    try {
      const response = await fetch('/api/dashboard/endpoints')
      const result = await response.json()
      
      if (response.ok && result.data) {
        const activeEndpoints = result.data.filter((e: Endpoint) => e.is_active)
        setEndpoints(activeEndpoints)
      } else {
        console.error('Error loading endpoints:', result.error)
      }
    } catch (error) {
      console.error('Error loading endpoints:', error)
    } finally {
      setLoadingEndpoints(false)
    }
  }

  // Auto-select first endpoint when endpoints load and we're in endpoint mode
  useEffect(() => {
    if (endpoints.length > 0 && !selectedEndpoint && selectionMode === 'endpoint') {
      setSelectedEndpoint(endpoints[0])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endpoints, selectionMode])

  const loadProviders = async () => {
    try {
      const response = await fetch('/api/dashboard/providers')
      const result = await response.json()
      
      if (response.ok && result.data) {
        const activeProviders = result.data.filter((p: any) => p.is_active)
        setProviders(activeProviders.map((p: any) => ({ id: p.id, name: p.name, type: p.type })))
      } else {
        console.error('Error loading providers:', result.error)
      }
    } catch (error) {
      console.error('Error loading providers:', error)
    }
  }

  const loadModels = async (providerId: string) => {
    try {
      const response = await fetch('/api/dashboard/models')
      const result = await response.json()
      
      if (response.ok && result.data) {
        // Filter models by provider and active status
        const filteredModels = result.data.filter((m: Model) => 
          m.provider_id === providerId && m.is_active
        )
        setModels(filteredModels)
      } else {
        console.error('Error loading models:', result.error)
      }
    } catch (error) {
      console.error('Error loading models:', error)
    }
  }

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || loading) return

    // Determine endpoint and model based on selection mode
    let endpointToUse: Endpoint | null = null
    let modelToUse: string | null = null
    let requiresAuth = true

    if (selectionMode === 'endpoint') {
      if (!selectedEndpoint) {
        setError('Please select an endpoint')
        return
      }
      endpointToUse = selectedEndpoint
      requiresAuth = selectedEndpoint.requires_auth !== false
      // Only use endpoint's model if it doesn't have a predefined model
      if (!selectedEndpoint.model_id && selectedEndpoint.model) {
        modelToUse = selectedEndpoint.model
      }
    } else {
      // Provider + Model mode
      if (!selectedProvider || !selectedModel) {
        setError('Please select both a provider and a model')
        return
      }
      
      // Find an endpoint for this provider (we'll override the model)
      const providerEndpoint = endpoints.find(e => 
        e.providers?.id === selectedProvider.id && e.is_active
      )
      
      if (!providerEndpoint) {
        setError(`No endpoint found for provider "${selectedProvider.name}". Please create an endpoint for this provider first.`)
        return
      }
      
      endpointToUse = providerEndpoint
      requiresAuth = providerEndpoint.requires_auth !== false
      modelToUse = selectedModel.model_identifier
    }

    if (requiresAuth && !apiToken) {
      setError('API token is required')
      return
    }

    setError(null)
    
    // Add user message to chat
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputMessage,
      timestamp: new Date(),
    }
    setMessages(prev => [...prev, userMessage])
    setInputMessage('')
    setLoading(true)

    try {
      const requestBody: any = {
        endpoint: endpointToUse.path,
        messages: [
          ...messages.map(m => ({
            role: m.role,
            content: m.content,
          })),
          {
            role: 'user',
            content: inputMessage,
          },
        ],
      }

      // Include model if we have one (either from endpoint or selected model)
      if (modelToUse) {
        requestBody.model = modelToUse
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }

      if (requiresAuth && apiToken) {
        headers['Authorization'] = `Bearer ${apiToken}`
      }

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
      })

      const data = await response.json()

      if (response.ok && data.choices && data.choices[0]) {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.choices[0].message?.content || 'No response content',
          timestamp: new Date(),
        }
        setMessages(prev => [...prev, assistantMessage])
      } else {
        setError(data.error || 'Failed to get response from the model')
        // Remove the user message on error
        setMessages(prev => prev.filter(m => m.id !== userMessage.id))
      }
    } catch (error: any) {
      setError(error.message || 'An error occurred while sending the message')
      // Remove the user message on error
      setMessages(prev => prev.filter(m => m.id !== userMessage.id))
    } finally {
      setLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const clearChat = () => {
    setMessages([])
    setError(null)
  }

  // Determine if auth is required based on current selection
  const requiresAuth = (() => {
    if (selectionMode === 'endpoint') {
      return selectedEndpoint ? (selectedEndpoint.requires_auth !== false) : true
    } else {
      // For provider+model mode, find the endpoint for the provider
      if (selectedProvider) {
        const providerEndpoint = endpoints.find(e => 
          e.providers?.id === selectedProvider.id && e.is_active
        )
        return providerEndpoint ? (providerEndpoint.requires_auth !== false) : true
      }
      return true
    }
  })()

  const isReadyToChat = (() => {
    if (selectionMode === 'endpoint') {
      return !!selectedEndpoint
    } else {
      return !!selectedProvider && !!selectedModel
    }
  })()

  if (loadingEndpoints) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Chat</h1>
        <div className="flex gap-2">
          <button
            onClick={clearChat}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
          >
            Clear Chat
          </button>
        </div>
      </div>

      {/* Configuration Panel */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        {/* Selection Mode Toggle */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Selection Mode
          </label>
          <div className="flex gap-4">
            <label className="flex items-center">
              <input
                type="radio"
                name="selectionMode"
                value="endpoint"
                checked={selectionMode === 'endpoint'}
                onChange={(e) => {
                  setSelectionMode('endpoint')
                  setSelectedProvider(null)
                  setSelectedModel(null)
                  setMessages([])
                  setError(null)
                }}
                className="mr-2"
              />
              Select Endpoint
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="selectionMode"
                value="provider_model"
                checked={selectionMode === 'provider_model'}
                onChange={(e) => {
                  setSelectionMode('provider_model')
                  setSelectedEndpoint(null)
                  setMessages([])
                  setError(null)
                }}
                className="mr-2"
              />
              Select Provider + Model
            </label>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {selectionMode === 'endpoint' ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Endpoint
              </label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                value={selectedEndpoint?.id || ''}
                onChange={(e) => {
                  const endpoint = endpoints.find(ep => ep.id === e.target.value)
                  setSelectedEndpoint(endpoint || null)
                  setMessages([])
                  setError(null)
                }}
              >
                <option value="">Select an endpoint</option>
                {endpoints.map((endpoint) => (
                  <option key={endpoint.id} value={endpoint.id}>
                    {endpoint.name} ({endpoint.model})
                  </option>
                ))}
              </select>
              {selectedEndpoint && (
                <p className="mt-1 text-xs text-gray-500">
                  Provider: {selectedEndpoint.providers?.name || 'N/A'}
                </p>
              )}
            </div>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Provider
                </label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  value={selectedProvider?.id || ''}
                  onChange={(e) => {
                    const provider = providers.find(p => p.id === e.target.value)
                    setSelectedProvider(provider || null)
                    setSelectedModel(null)
                    setMessages([])
                    setError(null)
                  }}
                >
                  <option value="">Select a provider</option>
                  {providers.map((provider) => (
                    <option key={provider.id} value={provider.id}>
                      {provider.name} ({provider.type})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Model
                </label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  value={selectedModel?.id || ''}
                  onChange={(e) => {
                    const model = models.find(m => m.id === e.target.value)
                    setSelectedModel(model || null)
                    setMessages([])
                    setError(null)
                  }}
                  disabled={!selectedProvider || models.length === 0}
                >
                  <option value="">
                    {!selectedProvider 
                      ? 'Select a provider first'
                      : models.length === 0
                      ? 'No models available'
                      : 'Select a model'}
                  </option>
                  {models.map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.name} ({model.model_identifier})
                    </option>
                  ))}
                </select>
                {selectedProvider && models.length === 0 && (
                  <p className="mt-1 text-xs text-gray-500">
                    No predefined models found for this provider. Add models in the Models page.
                  </p>
                )}
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              API Token {!requiresAuth && <span className="text-gray-500 font-normal">(Not required)</span>}
            </label>
            <input
              type="password"
              disabled={!requiresAuth}
              className={`w-full px-3 py-2 border border-gray-300 rounded-md ${
                !requiresAuth ? 'bg-gray-100 cursor-not-allowed' : ''
              }`}
              placeholder={requiresAuth ? "Enter your API token" : "Token not required"}
              value={apiToken}
              onChange={(e) => setApiToken(e.target.value)}
            />
            <p className="mt-1 text-xs text-gray-500">
              {requiresAuth 
                ? 'Required for this selection'
                : 'Authentication not required'}
            </p>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Chat Messages */}
      <div className="flex-1 bg-white rounded-lg shadow overflow-hidden flex flex-col">
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <MessageSquare className="w-16 h-16 mb-4" />
              <p className="text-lg">Start a conversation</p>
              <p className="text-sm mt-2">
                {selectionMode === 'endpoint'
                  ? 'Select an endpoint and send a message to begin'
                  : 'Select a provider and model, then send a message to begin'}
              </p>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-4 py-2 ${
                    message.role === 'user'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words">{message.content}</p>
                  <p
                    className={`text-xs mt-1 ${
                      message.role === 'user' ? 'text-indigo-200' : 'text-gray-500'
                    }`}
                  >
                    {message.timestamp.toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))
          )}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 rounded-lg px-4 py-2">
                <Loader2 className="w-5 h-5 animate-spin text-gray-600" />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="border-t border-gray-200 p-4">
          <div className="flex gap-2">
            <textarea
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={
                isReadyToChat
                  ? "Type your message... (Press Enter to send, Shift+Enter for new line)"
                  : selectionMode === 'endpoint'
                  ? "Select an endpoint first"
                  : "Select a provider and model first"
              }
              disabled={!isReadyToChat || loading}
              rows={3}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
            <button
              onClick={handleSendMessage}
              disabled={!isReadyToChat || !inputMessage.trim() || loading}
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

