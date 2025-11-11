import axios, { AxiosInstance } from 'axios'
import type {
  IProvider,
  ChatCompletionRequest,
  ChatCompletionResponse,
  ChatCompletionChunk,
  EmbeddingRequest,
  EmbeddingResponse,
  Model,
  ProviderConfig,
} from './types'

export class OpenRouterProvider implements IProvider {
  name = 'OpenRouter'
  type = 'openrouter' as const

  private createClient(config: ProviderConfig): AxiosInstance {
    return axios.create({
      baseURL: config.baseUrl || 'https://openrouter.ai/api/v1',
      headers: {
        'Authorization': `Bearer ${config.apiKey || process.env.OPENROUTER_API_KEY}`,
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'https://modelproxy.app',
        'X-Title': 'ModelProxy',
      },
    })
  }

  async chatCompletion(
    request: ChatCompletionRequest,
    config: ProviderConfig
  ): Promise<ChatCompletionResponse> {
    const client = this.createClient(config)
    const response = await client.post('/chat/completions', {
      model: request.model,
      messages: request.messages,
      temperature: request.temperature,
      max_tokens: request.max_tokens,
    })

    return response.data
  }

  async *chatCompletionStream(
    request: ChatCompletionRequest,
    config: ProviderConfig
  ): AsyncGenerator<ChatCompletionChunk> {
    const client = this.createClient(config)
    const response = await client.post(
      '/chat/completions',
      {
        model: request.model,
        messages: request.messages,
        temperature: request.temperature,
        max_tokens: request.max_tokens,
        stream: true,
      },
      {
        responseType: 'stream',
      }
    )

    const stream = response.data as NodeJS.ReadableStream
    const chunks: ChatCompletionChunk[] = []
    let buffer = ''
    let resolve: () => void
    let reject: (err: Error) => void
    let done = false

    const promise = new Promise<void>((res, rej) => {
      resolve = res
      reject = rej
    })

    stream.on('data', (chunk: Buffer) => {
      buffer += chunk.toString('utf8')
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (trimmed.startsWith('data: ')) {
          const data = trimmed.slice(6)
          if (data === '[DONE]') {
            done = true
            resolve()
            return
          }
          try {
            chunks.push(JSON.parse(data))
          } catch (e) {
            // Skip invalid JSON
          }
        }
      }
    })

    stream.on('end', () => {
      done = true
      resolve()
    })

    stream.on('error', (err: Error) => {
      done = true
      reject(err)
    })

    // Yield chunks as they arrive
    while (!done || chunks.length > 0) {
      if (chunks.length > 0) {
        yield chunks.shift()!
      } else {
        await new Promise((res) => setTimeout(res, 10))
      }
    }

    await promise
  }

  async embeddings(
    request: EmbeddingRequest,
    config: ProviderConfig
  ): Promise<EmbeddingResponse> {
    const client = this.createClient(config)
    const response = await client.post('/embeddings', {
      model: request.model,
      input: request.input,
    })

    return response.data
  }

  async listModels(config: ProviderConfig): Promise<Model[]> {
    const client = this.createClient(config)
    const response = await client.get('/models')
    
    return response.data.data.map((model: any) => ({
      id: model.id,
      object: model.object || 'model',
      created: model.created || Date.now(),
      owned_by: model.name || 'openrouter',
    }))
  }
}

