"""ModelProxy Python Client SDK"""

import json
import requests
from typing import List, Dict, Optional, Iterator, Union


class ModelProxyClient:
    """Client for interacting with ModelProxy API"""

    def __init__(self, base_url: str, token: str):
        """
        Initialize the ModelProxy client.

        Args:
            base_url: Base URL of the ModelProxy API (e.g., 'https://modelproxy.app')
            token: API token for authentication
        """
        self.base_url = base_url.rstrip('/')
        self.token = token
        self.headers = {
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {token}',
        }

    def _request(self, method: str, path: str, **kwargs) -> requests.Response:
        """Make an HTTP request"""
        url = f"{self.base_url}{path}"
        kwargs.setdefault('headers', {}).update(self.headers)
        response = requests.request(method, url, **kwargs)
        
        if not response.ok:
            try:
                error = response.json()
                raise Exception(error.get('error', f'HTTP {response.status_code}'))
            except json.JSONDecodeError:
                raise Exception(f'HTTP {response.status_code}: {response.text}')
        
        return response

    def chat_completion(
        self,
        endpoint: str,
        messages: List[Dict[str, str]],
        model: Optional[str] = None,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
    ) -> Dict:
        """
        Create a chat completion.

        Args:
            endpoint: Endpoint path (e.g., '/api/chat')
            messages: List of message dicts with 'role' and 'content'
            model: Optional model override
            temperature: Optional temperature parameter
            max_tokens: Optional max tokens parameter

        Returns:
            Chat completion response
        """
        payload = {
            'endpoint': endpoint,
            'messages': messages,
        }
        if model:
            payload['model'] = model
        if temperature is not None:
            payload['temperature'] = temperature
        if max_tokens is not None:
            payload['max_tokens'] = max_tokens

        response = self._request('POST', '/api/chat', json=payload)
        return response.json()

    def chat_completion_stream(
        self,
        endpoint: str,
        messages: List[Dict[str, str]],
        model: Optional[str] = None,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
    ) -> Iterator[Dict]:
        """
        Create a streaming chat completion.

        Args:
            endpoint: Endpoint path (e.g., '/api/chat')
            messages: List of message dicts with 'role' and 'content'
            model: Optional model override
            temperature: Optional temperature parameter
            max_tokens: Optional max tokens parameter

        Yields:
            Chat completion chunks
        """
        payload = {
            'endpoint': endpoint,
            'messages': messages,
            'stream': True,
        }
        if model:
            payload['model'] = model
        if temperature is not None:
            payload['temperature'] = temperature
        if max_tokens is not None:
            payload['max_tokens'] = max_tokens

        response = self._request('POST', '/api/chat', json=payload, stream=True)
        
        buffer = ''
        for chunk in response.iter_content(chunk_size=None, decode_unicode=True):
            if chunk:
                buffer += chunk
                lines = buffer.split('\n')
                buffer = lines.pop() if lines else ''

                for line in lines:
                    line = line.strip()
                    if line.startswith('data: '):
                        data = line[6:]
                        if data == '[DONE]':
                            return
                        try:
                            yield json.loads(data)
                        except json.JSONDecodeError:
                            pass

    def embeddings(
        self,
        endpoint: str,
        input: Union[str, List[str]],
        model: Optional[str] = None,
    ) -> Dict:
        """
        Create embeddings.

        Args:
            endpoint: Endpoint path (e.g., '/api/embeddings')
            input: Text or list of texts to embed
            model: Optional model override

        Returns:
            Embeddings response
        """
        payload = {
            'endpoint': endpoint,
            'input': input,
        }
        if model:
            payload['model'] = model

        response = self._request('POST', '/api/embeddings', json=payload)
        return response.json()

    def list_models(self, provider: Optional[str] = None) -> Dict:
        """
        List available models.

        Args:
            provider: Optional provider name to filter by

        Returns:
            Models response
        """
        path = '/api/models'
        if provider:
            path += f'?provider={provider}'
        
        response = self._request('GET', path)
        return response.json()

    def health(self) -> Dict:
        """
        Check API health.

        Returns:
            Health status
        """
        response = self._request('GET', '/api/health')
        return response.json()

