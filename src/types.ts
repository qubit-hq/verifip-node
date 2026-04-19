export interface CheckResponse {
  request_id: string;
  ip: string;
  fraud_score: number;
  is_proxy: boolean;
  is_vpn: boolean;
  is_tor: boolean;
  is_datacenter: boolean;
  country_code: string;
  country_name: string;
  region: string;
  city: string;
  isp: string;
  asn: number;
  connection_type: ConnectionType;
  hostname: string;
  signal_breakdown: Record<string, number>;
  error?: string;
}

export type ConnectionType =
  | "Data Center"
  | "Residential"
  | "Mobile"
  | "Education"
  | "Corporate";

export interface BatchRequest {
  ips: string[];
}

export interface BatchResponse {
  results: CheckResponse[];
}

export interface HealthResponse {
  status: "ok" | "degraded";
  version: string;
  data_loaded_at: string;
  redis: string;
  postgres: string;
  uptime_seconds: number;
}

export interface ErrorResponse {
  error: string;
  message: string;
  retry_after?: number;
}

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: Date;
}

export interface VerifIPClientOptions {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
  maxRetries?: number;
}
