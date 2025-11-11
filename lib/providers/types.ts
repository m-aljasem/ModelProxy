export type ProviderType = 'openai' | 'openrouter' | 'custom'

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface ChatCompletionRequest {
  model: string
  messages: ChatMessage[]
  temperature?: number
  max_tokens?: number
  stream?: boolean
  [key: string]: unknown
}

export interface ChatCompletionResponse {
  id: string
  object: string
  created: number
  model: string
  choices: Array<{
    index: number
    message: ChatMessage
    finish_reason: string | null
  }>
  usage?: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

export interface ChatCompletionChunk {
  id: string
  object: string
  created: number
  model: string
  choices: Array<{
    index: number
    delta: Partial<ChatMessage>
    finish_reason: string | null
  }>
}

export interface EmbeddingRequest {
  model: string
  input: string | string[]
  [key: string]: unknown
}

export interface EmbeddingResponse {
  object: string
  data: Array<{
    object: string
    embedding: number[]
    index: number
  }>
  model: string
  usage: {
    prompt_tokens: number
    total_tokens: number
  }
}

export interface Model {
  id: string
  object: string
  created: number
  owned_by: string
}

export interface ProviderConfig {
  apiKey?: string
  baseUrl?: string
  [key: string]: unknown
}

export interface IProvider {
  name: string
  type: ProviderType
  
  chatCompletion(
    request: ChatCompletionRequest,
    config: ProviderConfig
  ): Promise<ChatCompletionResponse>
  
  chatCompletionStream(
    request: ChatCompletionRequest,
    config: ProviderConfig
  ): AsyncGenerator<ChatCompletionChunk>
  
  embeddings(
    request: EmbeddingRequest,
    config: ProviderConfig
  ): Promise<EmbeddingResponse>
  
  listModels(config: ProviderConfig): Promise<Model[]>
}

