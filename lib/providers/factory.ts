import { OpenAIProvider } from './openai'
import { OpenRouterProvider } from './openrouter'
import type { IProvider, ProviderType } from './types'

const providers = new Map<ProviderType, () => IProvider>([
  ['openai', () => new OpenAIProvider()],
  ['openrouter', () => new OpenRouterProvider()],
])

export function createProvider(type: ProviderType): IProvider {
  const factory = providers.get(type)
  if (!factory) {
    throw new Error(`Unknown provider type: ${type}`)
  }
  return factory()
}

export function getProviderTypes(): ProviderType[] {
  return Array.from(providers.keys())
}

