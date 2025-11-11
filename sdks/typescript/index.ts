export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface ChatCompletionOptions {
  endpoint: string
  model?: string
  messages: ChatMessage[]
  temperature?: number
  max_tokens?: number
  stream?: boolean
}

export interface EmbeddingOptions {
  endpoint: string
  model?: string
  input: string | string[]
}

export class ModelProxyClient {
  private baseUrl: string
  private token: string

  constructor(baseUrl: string, token: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '')
    this.token = token
  }

  private async request<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.token}`,
        ...options.headers,
      },
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }))
      throw new Error(error.error || `HTTP ${response.status}`)
    }

    return response.json()
  }

  async chatCompletion(options: ChatCompletionOptions) {
    return this.request('/api/chat', {
      method: 'POST',
      body: JSON.stringify({
        endpoint: options.endpoint,
        model: options.model,
        messages: options.messages,
        temperature: options.temperature,
        max_tokens: options.max_tokens,
        stream: false,
      }),
    })
  }

  async *chatCompletionStream(options: ChatCompletionOptions) {
    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.token}`,
      },
      body: JSON.stringify({
        endpoint: options.endpoint,
        model: options.model,
        messages: options.messages,
        temperature: options.temperature,
        max_tokens: options.max_tokens,
        stream: true,
      }),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }))
      throw new Error(error.error || `HTTP ${response.status}`)
    }

    const reader = response.body?.getReader()
    const decoder = new TextDecoder()

    if (!reader) {
      throw new Error('No response body')
    }

    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (trimmed.startsWith('data: ')) {
          const data = trimmed.slice(6)
          if (data === '[DONE]') {
            return
          }
          try {
            yield JSON.parse(data)
          } catch (e) {
            // Skip invalid JSON
          }
        }
      }
    }
  }

  async embeddings(options: EmbeddingOptions) {
    return this.request('/api/embeddings', {
      method: 'POST',
      body: JSON.stringify({
        endpoint: options.endpoint,
        model: options.model,
        input: options.input,
      }),
    })
  }

  async listModels(provider?: string) {
    const url = provider ? `/api/models?provider=${provider}` : '/api/models'
    return this.request(url)
  }

  async health() {
    return this.request('/api/health')
  }
}

