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

export interface EmailResponse {
  request_id: string;
  email: string;
  risk_score: number;
  valid_syntax: boolean;
  mx_found: boolean;
  is_disposable: boolean;
  is_free_provider: boolean;
  is_role_based: boolean;
  domain_age_days: number;
  domain: string;
  signal_breakdown: Record<string, number>;
  error?: string;
}

export interface PhoneResponse {
  request_id: string;
  phone: string;
  risk_score: number;
  valid: boolean;
  country_code: string;
  carrier: string;
  line_type: string;
  is_voip: boolean;
  signal_breakdown: Record<string, number>;
  error?: string;
}

export interface URLResponse {
  request_id: string;
  url: string;
  risk_score: number;
  is_phishing: boolean;
  is_malware: boolean;
  safe_browsing_threat: string;
  in_phishtank: boolean;
  spamhaus_dbl: boolean;
  domain_age_days: number;
  ssl_valid: boolean;
  ssl_issuer: string;
  signal_breakdown: Record<string, number>;
  error?: string;
}

export interface WHOISResponse {
  request_id: string;
  ip: string;
  network_cidr: string;
  network_name: string;
  org_name: string;
  abuse_contact: string;
  rir: string;
  allocation_date: string;
  country_code: string;
  asn: number;
  asn_org: string;
}

export interface ReportResponse {
  request_id: string;
  status: string;
  message: string;
}

export interface AssessResponse {
  request_id: string;
  overall_risk: number;
  ip?: CheckResponse;
  email?: EmailResponse;
  phone?: PhoneResponse;
  url?: URLResponse;
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
