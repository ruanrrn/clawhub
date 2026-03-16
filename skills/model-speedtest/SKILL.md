---
name: model-speedtest
description: Test model latency by sending ping and measuring response time. Use when you need to benchmark different models' API response speeds with minimal payload. Triggers on phrases like 'test model speed', 'benchmark model latency', 'ping models', 'check model response time', '测试模型', '模型速度测试', 'ping 所有模型'.
---

# Model Speedtest

Test API latency for different models with a minimal ping/pong request.

**Dynamic Protocol Selection**: The script automatically detects and uses protocol specified in each provider's `api` field in `openclaw.json`.

**Latency Ranking**: All models (including failed ones) are sorted by latency for complete performance analysis.

## How it works

1. Reads `openclaw.json` to discover all configured providers and models
2. Detects API protocol for each provider from `api` field
3. Sends a minimal "ping" request using appropriate protocol adapter
4. Measures round-trip time
5. Displays results grouped by provider
6. **Ranks all models by latency** (including failed ones with error reasons)

## Usage

```bash
# Run from workspace root
node skills/model-speedtest/scripts/main.js
```

## Trigger Commands

You can trigger this skill by using any of the following phrases:

**English:**
- "test model speed"
- "benchmark model latency"
- "ping models"
- "check model response time"

**Chinese:**
- "测试模型"
- "模型速度测试"
- "ping 所有模型"
- "检查模型响应时间"

Example: "帮我测试模型" or "test model speed"

## Supported Protocols

| Protocol | Providers Example | Endpoint | Description |
|----------|------------------|----------|-------------|
| `openai-completions` | bigmodel, ark | `/chat/completions` | Standard OpenAI chat completion format |
| `openai-responses` | rightcode | `/responses` | OpenAI Responses format (input/output arrays) |
| `anthropic-messages` | anthropic | `/v1/messages` | Anthropic Messages API |

## Dynamic Protocol Detection

The script reads `api` field from each provider configuration:

```json
{
  "models": {
    "providers": {
      "rightcode": {
        "api": "openai-responses",
        ...
      },
      "bigmodel": {
        "api": "openai-completions",
        ...
      }
    }
  }
}
```

Output shows protocol for each provider:

```
## RIGHTCODE (openai-responses)

| Model | Latency | Status | Details |
|-------|---------|--------|---------|
| gpt-5.4-medium | 806ms | 🔑 Auth failed | Invalid API key |

## BIGMODEL (openai-completions)

| Model | Latency | Status | Details |
|-------|---------|--------|---------|
| glm-4.7 | 705ms | ⚠️ Non-pong | The user's input is simply "ping".
```

## Output Format

### Protocol Detection

```
📋 Protocols detected:

  rightcode: openai-responses (8 models)
  bigmodel: openai-completions (7 models)
  ark: openai-completions (1 models)
```

### Provider Results

Detailed results grouped by provider with protocol information:

```
## BIGMODEL (openai-completions)

| Model | Latency | Status | Details |
|-------|---------|--------|---------|
| glm-4.5 | 560ms | ⚠️ Non-pong | We are going to use the `sub |
```

### Latency Ranking

**All models sorted by latency** (fastest to slowest), including failed models with reason:

```
================================================================================
ALL MODELS SORTED BY LATENCY
================================================================================

| Rank | Model | Provider | Latency | Status | Reason |
|------|-------|----------|---------|--------|---------|
| 1 | glm-5 | bigmodel | 250ms | ❌ API error | API Error (1311): 当前订阅套餐暂未开... |
| 2 | glm-4.5 | bigmodel | 570ms | ⚠️ Non-pong | Responsive but not pong |
| 3 | glm-4.5-air | bigmodel | 613ms | ⚠️ Non-pong | Responsive but not pong |
| 4 | gpt-5.2-low | rightcode | 745ms | 🔑 Auth failed | Invalid API key |
| 5 | gpt-5.4 | rightcode | 746ms | 🔑 Auth failed | Invalid API key |
| 6 | glm-4.7 | bigmodel | 755ms | ⚠️ Non-pong | Responsive but not pong |
| 7 | gpt-5.4-xhigh | rightcode | 761ms | 🔑 Auth failed | Invalid API key |
| 8 | gpt-5.1 | rightcode | 763ms | 🔑 Auth failed | Invalid API key |
| 9 | gpt-5.2-medium | rightcode | 763ms | 🔑 Auth failed | Invalid API key |
| 10 | gpt-5.2 | rightcode | 765ms | 🔑 Auth failed | Invalid API key |
| 11 | ark-code-latest | ark | 787ms | ✅ OK | Perfect pong |
| 12 | gpt-5.4-medium | rightcode | 797ms | 🔑 Auth failed | Invalid API key |
| 13 | glm-4.6 | bigmodel | 938ms | ⚠️ Non-pong | Responsive but not pong |
| 14 | gpt-5.4-high | rightcode | 1796ms | 🔑 Auth failed | Invalid API key |
| 15 | glm-4.7-flashx | bigmodel | 5087ms | ❌ Error | TIMEOUT |
| 16 | glm-4.7-flash | bigmodel | 5093ms | ❌ Error | TIMEOUT |

🏆 Fastest (responsive): glm-4.5 (bigmodel) - 570ms
🐌 Slowest (responsive): glm-4.6 (bigmodel) - 938ms

❌ Failed models: 11
  - glm-5 (bigmodel): API Error (1311): 当前订阅套餐暂未开放GLM-5权限
  - gpt-5.2-low (rightcode): Invalid API key
  - gpt-5.4 (rightcode): Invalid API key
  - gpt-5.4-xhigh (rightcode): Invalid API key
  - gpt-5.1 (rightcode): Invalid API key
  - gpt-5.2-medium (rightcode): Invalid API key
  - gpt-5.2 (rightcode): Invalid API key
  - gpt-5.4-medium (rightcode): Invalid API key
  - gpt-5.4-high (rightcode): Invalid API key
  - glm-4.7-flashx (bigmodel): TIMEOUT
  - glm-4.7-flash (bigmodel): TIMEOUT
```

**Note**:
- **All models** are sorted by latency, including failed ones
- Failed models show their error reason in the "Reason" column
- 🏆/🐌 statistics only include **responsive** models (OK, Non-pong, Empty) for meaningful comparison
- Failed models are listed separately at the end with detailed error messages

### Status Types

| Status | Reason | Meaning |
|--------|---------|---------|
| ✅ OK | Perfect pong | Model responded with "pong" (case-insensitive) |
| ⚠️ Non-pong | Responsive but not pong | Model returned content, but not "pong" (common for reasoning models) |
| ⚪ Empty | Empty response | Model responded but with no content |
| ⏱️ Timeout | >5000ms timeout | Request took >5 seconds |
| 🚫 Rate limit | Rate limited | API returned rate limit error |
| 🔑 Auth failed | Invalid API key | API key is invalid or missing |
| ❌ API error | API returned error | API returned an error (e.g., subscription not enabled) |
| ❌ Error | Unknown error | Network or parsing error |

## Error Handling

| Error Type | Display | Example |
|------------|---------|---------|
| Timeout (>5s) | `⏱️ Timeout` | GLM-4.7-Flash: `>5000ms Timeout` |
| Auth Failed | `🔑 Auth failed` | Rightcode: `Invalid API key` |
| Rate Limited | `🚫 Rate limit` | BigModel code 1302 |
| Subscription Error | `❌ API error` | GLM-5: `当前订阅套餐暂未开放GLM-5权限` |
| Server Error | `❌ API error` | Generic API error |

## Known Behaviors

### Reasoning Models (GLM Series)

BigModel's reasoning models (GLM 4.5, 4.6, 4.7, Flash series) return thinking content instead of "pong":

- **Status**: Will show as `⚠️` (Non-pong) because they don't respond with "pong"
- **Latency**: Still accurate (measures time to first response)
- **Ranking**: Included in latency ranking (response is still measured)

### OpenAI Responses Protocol

Providers using `openai-responses` protocol (like rightcode) use a different request/response format:

- **Request**: `{ model, input: [...], max_output_tokens }`
- **Response**: `{ output: [{ content: [{ text: '...' }] }] }`

The script automatically handles this format when the provider's `api` field is set to `openai-responses`.

### Subscription Restrictions

Some models require specific subscription tiers:

- **GLM-5**: Requires premium subscription - will return API Error (1311)
- **GLM Flash Series**: May have rate limits during high load

### API Key Issues

If a provider shows all models as `🔑 Auth failed`:
- Check `openclaw.json` for correct API keys
- Rightcode models currently show invalid API key
- Verify the key has the correct permissions

## Example Output

```
🔍 Model Speedtest

Reading configuration...
Found 3 providers: rightcode, bigmodel, ark

📋 Protocols detected:

  rightcode: openai-responses (8 models)
  bigmodel: openai-completions (7 models)
  ark: openai-completions (1 models)

Testing 16 models...

================================================================================
RESULTS BY PROVIDER
================================================================================

## BIGMODEL (openai-completions)

| Model | Latency | Status | Details |
|-------|---------|--------|---------|
| glm-4.5 | 570ms | ⚠️ Non-pong | We are going to simulate ping command |
| glm-4.7 | 755ms | ⚠️ Non-pong | The user just sent single word "ping".

## ARK (openai-completions)

| Model | Latency | Status | Details |
|-------|---------|--------|---------|
| ark-code-latest | 787ms | ✅ OK | Pong! 🏓

================================================================================
SUMMARY
================================================================================

Total models tested: 16
Perfect pong (✅ OK): 1/16
Responsive (including non-pong): 5/16
Failed: 11/16

--- Provider Breakdown ---

bigmodel (openai-completions): 0/7 pong | 4/7 responsive
ark (openai-completions): 1/1 pong | 1/1 responsive

================================================================================
ALL MODELS SORTED BY LATENCY
================================================================================

| Rank | Model | Provider | Latency | Status | Reason |
|------|-------|----------|---------|--------|---------|
| 1 | glm-5 | bigmodel | 250ms | ❌ API error | API Error (1311): 当前订阅套餐暂未开... |
| 2 | glm-4.5 | bigmodel | 570ms | ⚠️ Non-pong | Responsive but not pong |
| 3 | glm-4.5-air | bigmodel | 613ms | ⚠️ Non-pong | Responsive but not pong |
| 4 | gpt-5.2-low | rightcode | 745ms | 🔑 Auth failed | Invalid API key |
| 5 | gpt-5.4 | rightcode | 746ms | 🔑 Auth failed | Invalid API key |
| 6 | glm-4.7 | bigmodel | 755ms | ⚠️ Non-pong | Responsive but not pong |
| 7 | gpt-5.4-xhigh | rightcode | 761ms | 🔑 Auth failed | Invalid API key |
| 8 | gpt-5.1 | rightcode | 763ms | 🔑 Auth failed | Invalid API key |
| 9 | gpt-5.2-medium | rightcode | 763ms | 🔑 Auth failed | Invalid API key |
| 10 | gpt-5.2 | rightcode | 765ms | 🔑 Auth failed | Invalid API key |
| 11 | ark-code-latest | ark | 787ms | ✅ OK | Perfect pong |
| 12 | gpt-5.4-medium | rightcode | 797ms | 🔑 Auth failed | Invalid API key |
| 13 | glm-4.6 | bigmodel | 938ms | ⚠️ Non-pong | Responsive but not pong |
| 14 | gpt-5.4-high | rightcode | 1796ms | 🔑 Auth failed | Invalid API key |
| 15 | glm-4.7-flashx | bigmodel | 5087ms | ❌ Error | TIMEOUT |
| 16 | glm-4.7-flash | bigmodel | 5093ms | ❌ Error | TIMEOUT |

🏆 Fastest (responsive): glm-4.5 (bigmodel) - 570ms
🐌 Slowest (responsive): glm-4.6 (bigmodel) - 938ms

❌ Failed models: 11
  - glm-5 (bigmodel): API Error (1311): 当前订阅套餐暂未开放GLM-5权限
  - gpt-5.2-low (rightcode): Invalid API key
  - gpt-5.4 (rightcode): Invalid API key
  - gpt-5.4-xhigh (rightcode): Invalid API key
  - gpt-5.1 (rightcode): Invalid API key
  - gpt-5.2-medium (rightcode): Invalid API key
  - gpt-5.2 (rightcode): Invalid API key
  - gpt-5.4-medium (rightcode): Invalid API key
  - gpt-5.4-high (rightcode): Invalid API key
  - glm-4.7-flashx (bigmodel): TIMEOUT
  - glm-4.7-flash (bigmodel): TIMEOUT
```

## Tips

- Run periodically to monitor API performance
- The script automatically detects protocols - no manual configuration needed
- **Use latency ranking** to quickly identify the fastest models for your use case
- **All models** are sorted by latency, including failed ones with their error reasons
- Non-pong responses (⚠️) are still included in ranking - they have valid latency data
- Failed models (auth failed, timeout, error) are now **included** in the ranking with their error reasons
- 🏆/🐌 statistics only include **responsive** models (OK, Non-pong, Empty) for meaningful comparison
- If all models from a provider fail as `🔑 Auth failed`, update the API key
- GLM-5 requires a premium subscription; check your BigModel plan
- GLM Flash models may have rate limits during peak hours
- To add support for a new protocol, create an adapter in `protocols/` directory and add it to `PROTOCOL_ADAPTERS` in `main.js`
