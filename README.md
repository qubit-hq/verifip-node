# VerifIP TypeScript/JavaScript SDK

Official TypeScript SDK for the [VerifIP](https://verifip.com) IP fraud risk scoring API.

## Installation

```bash
npm install verifip
```

## Quick Start

```typescript
import { VerifIPClient } from "verifip";

const client = new VerifIPClient({ apiKey: "vip_your_api_key" });

const result = await client.check("185.220.101.1");
console.log(result.fraud_score);       // 70
console.log(result.is_tor);            // true
console.log(result.signal_breakdown);  // { tor_exit: 25, vpn_detected: 20, ... }
```

## Methods

### `check(ip: string): Promise<CheckResponse>`

```typescript
const result = await client.check("185.220.101.1");
// result.fraud_score, result.is_tor, result.country_code, etc.
```

### `checkBatch(ips: string[]): Promise<BatchResponse>`

Check up to 100 IPs. Requires Starter plan or higher.

```typescript
const batch = await client.checkBatch(["185.220.101.1", "8.8.8.8"]);
for (const result of batch.results) {
  console.log(`${result.ip}: ${result.fraud_score}`);
}
```

### `health(): Promise<HealthResponse>`

```typescript
const health = await client.health();
console.log(health.status); // "ok"
```

## Error Handling

```typescript
import { VerifIPClient, AuthenticationError, RateLimitError } from "verifip";

try {
  const result = await client.check("1.2.3.4");
} catch (e) {
  if (e instanceof AuthenticationError) {
    console.log("Invalid API key");
  } else if (e instanceof RateLimitError) {
    console.log(`Retry after ${e.retryAfter} seconds`);
  }
}
```

## Configuration

```typescript
const client = new VerifIPClient({
  apiKey: "vip_your_key",       // required
  baseUrl: "https://api.verifip.com", // default
  timeout: 30000,                // ms, default 30000
  maxRetries: 3,                 // retries on 429/5xx, default 3
});
```

## Rate Limits

```typescript
await client.check("8.8.8.8");
if (client.rateLimit) {
  console.log(`${client.rateLimit.remaining}/${client.rateLimit.limit} left`);
}
```

## Requirements

- Node.js 18+ (uses built-in `fetch`)
- Zero runtime dependencies

## Links

- [API Documentation](https://verifip.com/docs)
- [GitHub](https://github.com/qubit-hq/verifip-node)
- [npm](https://www.npmjs.com/package/verifip)
- [Changelog](https://github.com/qubit-hq/verifip-node/releases)
