import { makeError, VerifIPError } from "./errors";
import {
  AssessResponse,
  BatchResponse,
  CheckResponse,
  EmailResponse,
  ErrorResponse,
  HealthResponse,
  PhoneResponse,
  RateLimitInfo,
  ReportResponse,
  URLResponse,
  VerifIPClientOptions,
  WHOISResponse,
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

  async checkEmail(email: string): Promise<EmailResponse> {
    if (!email) throw new Error("email is required");
    return this.request<EmailResponse>("GET", `/v1/email?email=${encodeURIComponent(email)}`);
  }

  async checkPhone(phone: string): Promise<PhoneResponse> {
    if (!phone) throw new Error("phone is required");
    return this.request<PhoneResponse>("GET", `/v1/phone?phone=${encodeURIComponent(phone)}`);
  }

  async checkUrl(url: string): Promise<URLResponse> {
    if (!url) throw new Error("url is required");
    return this.request<URLResponse>("GET", `/v1/url?url=${encodeURIComponent(url)}`);
  }

  async checkWhois(ip: string): Promise<WHOISResponse> {
    if (!ip) throw new Error("ip is required");
    return this.request<WHOISResponse>("GET", `/v1/whois?ip=${encodeURIComponent(ip)}`);
  }

  async report(ip: string, isFraud: boolean, category?: string, comment?: string): Promise<ReportResponse> {
    if (!ip) throw new Error("ip is required");
    const body: Record<string, unknown> = { ip, is_fraud: isFraud };
    if (category) body.category = category;
    if (comment) body.comment = comment;
    return this.request<ReportResponse>("POST", "/v1/report", body);
  }

  async assess(options: { ip?: string; email?: string; phone?: string; url?: string }): Promise<AssessResponse> {
    const params = new URLSearchParams();
    if (options.ip) params.set("ip", options.ip);
    if (options.email) params.set("email", options.email);
    if (options.phone) params.set("phone", options.phone);
    if (options.url) params.set("url", options.url);
    if (!params.toString()) throw new Error("at least one parameter required");
    return this.request<AssessResponse>("GET", `/v1/assess?${params.toString()}`);
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
