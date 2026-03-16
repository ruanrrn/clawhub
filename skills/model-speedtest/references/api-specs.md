# API Protocol Specifications

This document describes the API protocols supported by model-speedtest.

## Supported Protocols

### 1. OpenAI Completions API

**Used by**: bigmodel, ark

**Endpoint**: `POST /chat/completions`

**Request Format**:
```json
{
  "model": "string",
  "messages": [
    { "role": "user", "content": "ping" }
  ],
  "max_tokens": 10,
  "temperature": 0
}
```

**Response Format**:
```json
{
  "choices": [
    {
      "message": {
        "content": "pong"
      }
    }
  ]
}
```

**Headers**:
- `Authorization: Bearer {apiKey}`
- `Content-Type: application/json`

---

### 2. OpenAI Responses API

**Used by**: rightcode

**Endpoint**: `POST /responses`

**Request Format**:
```json
{
  "model": "string",
  "input": [
    { "role": "user", "content": "ping" }
  ],
  "max_tokens": 10,
  "temperature": 0
}
```

**Response Format**:
```json
{
  "messages": [
    { "content": "pong" }
  ]
}
```

**Headers**:
- `Authorization: Bearer {apiKey}`
- `Content-Type: application/json`

---

### 3. Anthropic Messages API

**Used by**: anthropic

**Endpoint**: `POST /v1/messages`

**Request Format**:
```json
{
  "model": "string",
  "max_tokens": 10,
  "messages": [
    { "role": "user", "content": "ping" }
  ]
}
```

**Response Format**:
```json
{
  "content": [
    { "type": "text", "text": "pong" }
  ]
}
```

**Headers**:
- `x-api-key: {apiKey}`
- `anthropic-version: 2023-06-01`
- `Content-Type: application/json`

---

## Protocol Detection

The protocol is determined by the `api` field in openclaw.json:

```json
{
  "models": {
    "providers": {
      "bigmodel": {
        "api": "openai-completions"
      },
      "rightcode": {
        "api": "openai-responses"
      },
      "anthropic": {
        "api": "anthropic-messages"
      }
    }
  }
}
```
