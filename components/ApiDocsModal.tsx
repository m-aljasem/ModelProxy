'use client'

import { useState } from 'react'
import { X, Copy, Check } from 'lucide-react'

interface Endpoint {
  id: string
  name: string
  path: string
  model: string
  is_active: boolean
  providers: { id: string; name: string; type: string }
}

interface ApiDocsModalProps {
  endpoint: Endpoint
  isOpen: boolean
  onClose: () => void
}

type CodeLanguage = 'curl' | 'python' | 'typescript' | 'php'

export default function ApiDocsModal({ endpoint, isOpen, onClose }: ApiDocsModalProps) {
  const [activeTab, setActiveTab] = useState<CodeLanguage>('curl')
  const [copied, setCopied] = useState<string | null>(null)

  if (!isOpen) return null

  const baseUrl = typeof window !== 'undefined' 
    ? window.location.origin 
    : process.env.NEXT_PUBLIC_APP_URL || 'https://your-domain.com'
  
  const apiUrl = `${baseUrl}${endpoint.path}`
  const tokenPlaceholder = 'YOUR_API_TOKEN'

  const generateCodeExample = (language: CodeLanguage): string => {
    const exampleMessages = [
      { role: 'user', content: 'Hello, how are you?' }
    ]

    switch (language) {
      case 'curl':
        return `curl -X POST ${apiUrl} \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer ${tokenPlaceholder}" \\
  -d '{
    "endpoint": "${endpoint.path}",
    "model": "${endpoint.model}",
    "messages": [
      {
        "role": "user",
        "content": "Hello, how are you?"
      }
    ],
    "stream": false
  }'`
      
      case 'python':
        return `import requests

url = "${apiUrl}"
headers = {
    "Content-Type": "application/json",
    "Authorization": f"Bearer {tokenPlaceholder}"
}

payload = {
    "endpoint": "${endpoint.path}",
    "model": "${endpoint.model}",
    "messages": [
        {
            "role": "user",
            "content": "Hello, how are you?"
        }
    ],
    "stream": False
}

response = requests.post(url, json=payload, headers=headers)
print(response.json())`
      
      case 'typescript':
        return `const response = await fetch("${apiUrl}", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": \`Bearer ${tokenPlaceholder}\`
  },
  body: JSON.stringify({
    endpoint: "${endpoint.path}",
    model: "${endpoint.model}",
    messages: [
      {
        role: "user",
        content: "Hello, how are you?"
      }
    ],
    stream: false
  })
});

const data = await response.json();
console.log(data);`
      
      case 'php':
        return `<?php

$url = "${apiUrl}";
$token = "${tokenPlaceholder}";

$data = [
    "endpoint" => "${endpoint.path}",
    "model" => "${endpoint.model}",
    "messages" => [
        [
            "role" => "user",
            "content" => "Hello, how are you?"
        ]
    ],
    "stream" => false
];

$ch = curl_init($url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    "Content-Type: application/json",
    "Authorization: Bearer " . $token
]);

$response = curl_exec($ch);
curl_close($ch);

echo $response;
?>`
      
      default:
        return ''
    }
  }

  const handleCopy = async (code: string, language: string) => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(language)
      setTimeout(() => setCopied(null), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const tabs: { id: CodeLanguage; label: string }[] = [
    { id: 'curl', label: 'cURL' },
    { id: 'python', label: 'Python' },
    { id: 'typescript', label: 'TypeScript' },
    { id: 'php', label: 'PHP' }
  ]

  const currentCode = generateCodeExample(activeTab)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">API Documentation</h2>
            <p className="text-sm text-gray-500 mt-1">{endpoint.name} - {endpoint.path}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 px-6">
          <div className="flex space-x-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-3 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'text-indigo-600 border-b-2 border-indigo-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Code Content */}
        <div className="flex-1 overflow-auto p-6">
          <div className="bg-gray-900 rounded-lg p-4 relative">
            <button
              onClick={() => handleCopy(currentCode, activeTab)}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white transition-colors"
              title="Copy to clipboard"
            >
              {copied === activeTab ? (
                <Check className="w-5 h-5 text-green-400" />
              ) : (
                <Copy className="w-5 h-5" />
              )}
            </button>
            <pre className="text-sm text-gray-100 overflow-x-auto">
              <code>{currentCode}</code>
            </pre>
          </div>

          {/* Additional Info */}
          <div className="mt-6 space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2">Endpoint Details</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li><strong>URL:</strong> <code className="bg-blue-100 px-1 rounded">{apiUrl}</code></li>
                <li><strong>Method:</strong> POST</li>
                <li><strong>Model:</strong> {endpoint.model}</li>
                <li><strong>Provider:</strong> {endpoint.providers?.name || 'N/A'}</li>
              </ul>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h3 className="font-semibold text-yellow-900 mb-2">Authentication</h3>
              <p className="text-sm text-yellow-800">
                All requests require a Bearer token in the Authorization header. 
                Create an API token from the Tokens section in the dashboard.
              </p>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-2">Request Body</h3>
              <pre className="text-xs bg-white p-3 rounded border overflow-x-auto">
                <code>{JSON.stringify({
                  endpoint: endpoint.path,
                  model: endpoint.model,
                  messages: [
                    { role: 'user', content: 'Hello, how are you?' }
                  ],
                  stream: false
                }, null, 2)}</code>
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

