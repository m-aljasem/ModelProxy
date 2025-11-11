import OpenAI from 'openai'
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

export class OpenAIProvider implements IProvider {
  name = 'OpenAI'
  type = 'openai' as const

  private createClient(config: ProviderConfig): OpenAI {
    return new OpenAI({
      apiKey: config.apiKey || process.env.OPENAI_API_KEY,
      baseURL: config.baseUrl || 'https://api.openai.com/v1',
    })
  }

  async chatCompletion(
    request: ChatCompletionRequest,
    config: ProviderConfig
  ): Promise<ChatCompletionResponse> {
    const client = this.createClient(config)
    const response = await client.chat.completions.create({
      model: request.model,
      messages: request.messages as OpenAI.Chat.Completions.ChatCompletionMessageParam[],
      temperature: request.temperature,
      max_tokens: request.max_tokens,
      stream: false,
    })

    return {
      id: response.id,
      object: response.object,
      created: response.created,
      model: response.model,
      choices: response.choices.map((choice) => ({
        index: choice.index,
        message: {
          role: choice.message.role as 'system' | 'user' | 'assistant',
          content: choice.message.content || '',
        },
        finish_reason: choice.finish_reason,
      })),
      usage: response.usage
        ? {
            prompt_tokens: response.usage.prompt_tokens,
            completion_tokens: response.usage.completion_tokens,
            total_tokens: response.usage.total_tokens,
          }
        : undefined,
    }
  }

  async *chatCompletionStream(
    request: ChatCompletionRequest,
    config: ProviderConfig
  ): AsyncGenerator<ChatCompletionChunk> {
    const client = this.createClient(config)
    const stream = await client.chat.completions.create({
      model: request.model,
      messages: request.messages as OpenAI.Chat.Completions.ChatCompletionMessageParam[],
      temperature: request.temperature,
      max_tokens: request.max_tokens,
      stream: true,
    })

    for await (const chunk of stream) {
      yield {
        id: chunk.id,
        object: chunk.object,
        created: chunk.created,
        model: chunk.model,
        choices: chunk.choices.map((choice) => ({
          index: choice.index,
          delta: {
            role: choice.delta.role as 'system' | 'user' | 'assistant' | undefined,
            content: choice.delta.content || '',
          },
          finish_reason: choice.finish_reason,
        })),
      }
    }
  }

  async embeddings(
    request: EmbeddingRequest,
    config: ProviderConfig
  ): Promise<EmbeddingResponse> {
    const client = this.createClient(config)
    const response = await client.embeddings.create({
      model: request.model,
      input: request.input,
    })

    return {
      object: response.object,
      data: response.data.map((item) => ({
        object: item.object,
        embedding: item.embedding,
        index: item.index,
      })),
      model: response.model,
      usage: {
        prompt_tokens: response.usage.prompt_tokens,
        total_tokens: response.usage.total_tokens,
      },
    }
  }

  async listModels(config: ProviderConfig): Promise<Model[]> {
    const client = this.createClient(config)
    const response = await client.models.list()
    
    return response.data.map((model) => ({
      id: model.id,
      object: model.object,
      created: model.created,
      owned_by: model.owned_by || 'openai',
    }))
  }
}

