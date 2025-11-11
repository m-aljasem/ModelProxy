# ModelProxy

A production-ready, full-stack Next.js application that acts as a secure, multi-tenant proxy and management dashboard for AI providers (OpenAI, OpenRouter, and extensible to others).

## Features

- **Secure Token-Based Authentication** - Issue, revoke, and manage API tokens with scopes and quotas
- **Multi-Provider Support** - Unified interface for OpenAI, OpenRouter, and custom providers
- **Management Dashboard** - Full-featured UI for managing endpoints, tokens, providers, and viewing analytics
- **Streaming Support** - Server-Sent Events (SSE) for real-time chat completions
- **Rate Limiting & Quotas** - Per-token rate limits and monthly quotas
- **Audit Logging** - Comprehensive request logging with correlation IDs
- **Security** - IP whitelisting, token hashing, and strict CORS configuration
- **Extensible** - Easy to add new providers via adapter pattern

## Architecture

- **Frontend**: Next.js 14 (App Router) with TypeScript and TailwindCSS
- **Backend**: Next.js API Routes with provider adapters
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Deployment**: Vercel-ready

## Prerequisites

- Node.js 18+ and npm/yarn
- Supabase account and project
- OpenAI API key (optional, for OpenAI provider)
- OpenRouter API key (optional, for OpenRouter provider)

## Setup

### 1. Clone and Install

```bash
git clone <repository-url>
cd ModelProxy
npm install
```

### 2. Set Up Supabase

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Run the schema SQL in your Supabase SQL editor:

```bash
# Copy and paste the contents of supabase/schema.sql
```

3. Get your Supabase credentials:
   - Project URL
   - Anon key
   - Service role key

### 3. Configure Environment Variables

Create a `.env.local` file in the root directory:

```env
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Provider API Keys (optional, can be set per-provider in dashboard)
OPENAI_API_KEY=sk-...
OPENROUTER_API_KEY=sk-or-...

# JWT Secret (generate a random 32+ character string)
JWT_SECRET=your-random-secret-key-here

# App URL (for production)
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app
```

### 4. Run Database Migrations

The schema is already defined in `supabase/schema.sql`. Run it in your Supabase SQL editor.

### 5. Seed Initial Data (Optional)

You can manually create providers and endpoints via the dashboard, or use the Supabase dashboard to insert initial data.

### 6. Run Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

### 7. Create Your First User

1. Go to Supabase Dashboard → Authentication → Users
2. Create a new user manually, or enable email signup
3. Set the user's role in the `raw_user_meta_data` field:
   ```json
   { "role": "admin" }
   ```

## Deployment

### Deploy to Vercel

1. Push your code to GitHub
2. Import the project in Vercel
3. Add all environment variables in Vercel dashboard
4. Deploy

### Environment Variables for Production

Make sure to set all environment variables in your Vercel project settings.

## Usage

### Dashboard

1. Log in at `/login`
2. Navigate to different sections:
   - **Overview**: Dashboard with statistics
   - **Endpoints**: Configure API endpoints and models
   - **Tokens**: Create and manage API tokens
   - **Providers**: Add and configure AI providers
   - **Usage**: View analytics and usage statistics
   - **Logs**: Review request logs

### Creating an Endpoint

1. Go to **Providers** and add a provider (e.g., OpenAI)
2. Go to **Endpoints** and create a new endpoint:
   - Name: e.g., "GPT-4 Chat"
   - Path: e.g., "/api/chat"
   - Model: e.g., "gpt-4"
   - Provider: Select the provider you created

### Creating a Token

1. Go to **Tokens**
2. Click "Create Token"
3. Configure:
   - Name
   - Scopes (chat, embeddings, models, or all)
   - Rate limit (requests per minute)
   - Monthly quota (optional)
4. **Copy the token immediately** - it won't be shown again!

### Using the API

#### TypeScript/JavaScript

```typescript
import { ModelProxyClient } from './sdks/typescript'

const client = new ModelProxyClient('https://your-domain.vercel.app', 'your-token')

// Chat completion
const response = await client.chatCompletion({
  endpoint: '/api/chat',
  messages: [
    { role: 'user', content: 'Hello!' }
  ]
})

// Streaming
for await (const chunk of client.chatCompletionStream({
  endpoint: '/api/chat',
  messages: [{ role: 'user', content: 'Hello!' }]
})) {
  console.log(chunk)
}

// Embeddings
const embeddings = await client.embeddings({
  endpoint: '/api/embeddings',
  input: 'Hello, world!'
})
```

#### Python

```python
from modelproxy import ModelProxyClient

client = ModelProxyClient('https://your-domain.vercel.app', 'your-token')

# Chat completion
response = client.chat_completion(
    endpoint='/api/chat',
    messages=[
        {'role': 'user', 'content': 'Hello!'}
    ]
)

# Streaming
for chunk in client.chat_completion_stream(
    endpoint='/api/chat',
    messages=[{'role': 'user', 'content': 'Hello!'}]
):
    print(chunk)

# Embeddings
embeddings = client.embeddings(
    endpoint='/api/embeddings',
    input='Hello, world!'
)
```

#### cURL

```bash
# Chat completion
curl -X POST https://your-domain.vercel.app/api/chat \
  -H "Authorization: Bearer your-token" \
  -H "Content-Type: application/json" \
  -d '{
    "endpoint": "/api/chat",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'

# Embeddings
curl -X POST https://your-domain.vercel.app/api/embeddings \
  -H "Authorization: Bearer your-token" \
  -H "Content-Type: application/json" \
  -d '{
    "endpoint": "/api/embeddings",
    "input": "Hello, world!"
  }'
```

## API Endpoints

### `/api/chat`

Create a chat completion.

**Request:**
```json
{
  "endpoint": "/api/chat",
  "messages": [
    { "role": "user", "content": "Hello!" }
  ],
  "stream": false
}
```

**Response:**
```json
{
  "id": "...",
  "model": "gpt-4",
  "choices": [...]
}
```

### `/api/embeddings`

Create embeddings.

**Request:**
```json
{
  "endpoint": "/api/embeddings",
  "input": "Hello, world!"
}
```

### `/api/models`

List available models.

**Query Parameters:**
- `provider` (optional): Filter by provider name

### `/api/health`

Health check endpoint.

## Adding a New Provider

1. Create a new provider class implementing `IProvider` interface:

```typescript
// lib/providers/custom.ts
import type { IProvider, ... } from './types'

export class CustomProvider implements IProvider {
  name = 'Custom'
  type = 'custom' as const
  
  // Implement required methods
  async chatCompletion(...) { ... }
  async *chatCompletionStream(...) { ... }
  async embeddings(...) { ... }
  async listModels(...) { ... }
}
```

2. Register it in `lib/providers/factory.ts`:

```typescript
import { CustomProvider } from './custom'

const providers = new Map([
  ...
  ['custom', () => new CustomProvider()],
])
```

## Testing

```bash
# Run tests
npm test

# Watch mode
npm run test:watch

# Coverage
npm run test:coverage
```

## Project Structure

```
ModelProxy/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   ├── dashboard/         # Dashboard pages
│   └── login/             # Auth pages
├── components/            # React components
├── lib/                   # Core libraries
│   ├── auth/             # Authentication & authorization
│   ├── providers/        # Provider adapters
│   ├── supabase/         # Supabase clients
│   └── utils/            # Utilities
├── sdks/                  # Client SDKs
│   ├── typescript/       # TypeScript SDK
│   └── python/           # Python SDK
├── supabase/              # Database schema
└── README.md
```

## Security Considerations

- **API Keys**: Store provider API keys encrypted in the database (consider using Supabase Vault)
- **Tokens**: Tokens are hashed using bcrypt before storage
- **Rate Limiting**: Implemented per-token to prevent abuse
- **IP Whitelisting**: Optional IP-based access control per token
- **CORS**: Configured for API endpoints
- **Audit Logging**: All requests are logged with correlation IDs

## License

MIT

## Contributing

Contributions welcome! Please open an issue or submit a pull request.

