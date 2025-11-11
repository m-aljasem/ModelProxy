-- Seed script for initial data
-- Run this after setting up the schema

-- Insert sample providers (update with your actual API keys)
INSERT INTO providers (name, type, api_key_encrypted, is_active)
VALUES
  ('OpenAI Production', 'openai', 'your-openai-key-here', true),
  ('OpenRouter Production', 'openrouter', 'your-openrouter-key-here', true)
ON CONFLICT (name) DO NOTHING;

-- Insert sample endpoints
INSERT INTO endpoints (name, path, model, provider_id, is_active)
SELECT 
  'GPT-4 Chat',
  '/api/chat',
  'gpt-4',
  p.id,
  true
FROM providers p
WHERE p.name = 'OpenAI Production'
ON CONFLICT (name) DO NOTHING;

INSERT INTO endpoints (name, path, model, provider_id, is_active)
SELECT 
  'GPT-3.5 Chat',
  '/api/chat',
  'gpt-3.5-turbo',
  p.id,
  true
FROM providers p
WHERE p.name = 'OpenAI Production'
ON CONFLICT (name) DO NOTHING;

INSERT INTO endpoints (name, path, model, provider_id, is_active)
SELECT 
  'Text Embeddings',
  '/api/embeddings',
  'text-embedding-ada-002',
  p.id,
  true
FROM providers p
WHERE p.name = 'OpenAI Production'
ON CONFLICT (name) DO NOTHING;

