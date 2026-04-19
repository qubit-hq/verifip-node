import { makeError, VerifIPError } from "./errors";
import {
  BatchResponse,
  CheckResponse,
  ErrorResponse,
  HealthResponse,
  RateLimitInfo,
  VerifIPClientOptions,
} from "./types";
import { VERSION } from "./version";

const DEFAULT_BASE_URL = "https://api.verifip.com";
const DEFAULT_TIMEOUT = 30000;
const DEFAULT_MAX_RETRIES = 3;
const RETRYABLE_STATUS_CODES = new Set([429, 500, 502, 503, 504]);

export class VerifIPClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly timeout: number;
  private readonly maxRetries: number;
  private _rateLimit: RateLimitInfo | null = null;

  constructor(options: VerifIPClientOptions) {
    if (!options.apiKey) throw new Error("apiKey is required");
    this.apiKey = options.apiKey;
    this.baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
    this.timeout = options.timeout ?? DEFAULT_TIMEOUT;
    this.maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
  }

  get rateLimit(): RateLimitInfo | null {
    return this._rateLimit;
  }

  async check(ip: string): Promise<CheckResponse> {
    if (!ip) throw new Error("ip is required");
    return this.request<CheckResponse>("GET", `/v1/check?ip=${encodeURIComponent(ip)}`);
  }

  async checkBatch(ips: string[]): Promise<BatchResponse> {
    if (!ips || ips.length === 0) throw new Error("ips array is required and cannot be empty");
    if (ips.length > 100) throw new Error("Maximum 100 IPs per batch request");
    return this.request<BatchResponse>("POST", "/v1/check/batch", { ips });
  }

  async health(): Promise<HealthResponse> {
    return this.request<HealthResponse>("GET", "/health", undefined, false);
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    auth: boolean = true
  ): Promise<T> {
    const url = this.baseUrl + path;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeout);

      try {
        const headers: Record<string, string> = {
          "User-Agent": `verifip-node/${VERSION}`,
          Accept: "application/json",
        };
        if (auth) headers["Authorization"] = `Bearer ${this.apiKey}`;
        if (body) headers["Content-Type"] = "application/json";

        const response = await fetch(url, {
          method,
          headers,
          body: body ? JSON.stringify(body) : undefined,
          signal: controller.signal,
        });

        this.updateRateLimit(response.headers);

        if (response.ok) {
          const result = (await response.json()) as T;
          clearTimeout(timer);
          return result;
        }

        const errorData = (await response.json().catch(() => ({}))) as Partial<ErrorResponse>;
        const err = makeError(
          response.status,
          errorData.error ?? "",
          errorData.message ?? response.statusText,
          errorData.retry_after
        );

        if (RETRYABLE_STATUS_CODES.has(response.status) && attempt < this.maxRetries) {
          lastError = err;
          const delay = Math.min(errorData.retry_after ?? 0.5 * 2 ** attempt, 30);
          const jitter = Math.random() * 0.25 * delay;
          await sleep((delay + jitter) * 1000);
          continue;
        }

        throw err;
      } catch (error) {
        if (error instanceof VerifIPError) throw error;
        lastError = error as Error;
        if (attempt < this.maxRetries) {
          await sleep(500 * 2 ** attempt);
          continue;
        }
        throw new VerifIPError(`Connection error: ${(error as Error).message}`);
      } finally {
        clearTimeout(timer);
      }
    }

    throw lastError ?? new VerifIPError("Request failed after retries");
  }

  private updateRateLimit(headers: Headers): void {
    const limit = headers.get("x-ratelimit-limit");
    if (limit === null) return;
    this._rateLimit = {
      limit: parseInt(limit, 10),
      remaining: parseInt(headers.get("x-ratelimit-remaining") ?? "0", 10),
      reset: new Date(parseInt(headers.get("x-ratelimit-reset") ?? "0", 10) * 1000),
    };
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
