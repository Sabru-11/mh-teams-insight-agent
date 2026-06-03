const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const ADMIN_KEY = process.env.NEXT_PUBLIC_ADMIN_API_KEY || "";

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "X-Admin-Key": ADMIN_KEY,
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`API ${res.status}: ${body}`);
  }
  return res.json();
}

// ── Channels ──────────────────────────────────────────────
export interface ChannelInfo {
  channel_id: string;
  channel_name: string;
  monitored: boolean;
  subscription_status: string;
  expires_at: string | null;
  minutes_until_expiry: number | null;
}

export interface TeamInfo {
  team_id: string;
  team_name: string;
  channels: ChannelInfo[];
}

export interface ChannelsSummary {
  total_configured: number;
  monitored: number;
  active: number;
  expiring_soon: number;
  failed: number;
}

export interface ChannelsResponse {
  teams: TeamInfo[];
  summary: ChannelsSummary;
}

export function getChannels(): Promise<ChannelsResponse> {
  return apiFetch("/api/v1/admin/channels");
}

export function monitorChannel(
  channelId: string,
  teamId: string,
  channelName?: string
): Promise<{ channel_id: string; status: string; message: string }> {
  return apiFetch(`/api/v1/admin/channels/${encodeURIComponent(channelId)}/monitor`, {
    method: "POST",
    body: JSON.stringify({ team_id: teamId, channel_name: channelName || "" }),
  });
}

export function deactivateChannel(
  channelId: string
): Promise<{ channel_id: string; status: string; message: string }> {
  return apiFetch(`/api/v1/admin/channels/${encodeURIComponent(channelId)}/monitor`, {
    method: "DELETE",
  });
}

export function renewChannelSubscription(
  channelId: string
): Promise<{ channel_id: string; status: string; message: string }> {
  return apiFetch(`/api/v1/admin/channels/${encodeURIComponent(channelId)}/renew`, {
    method: "POST",
  });
}

// ── Tracing ───────────────────────────────────────────────
export interface TraceStage {
  agent: string;
  status: string;
  duration_ms: number;
  started_at: string;
  error?: string;
  decision?: {
    action: string;
    score: number;
    threshold: number;
    breakdown: Record<string, number>;
  };
  resolution?: {
    action_recommendation: string;
    match_source: string;
    confidence: number;
    reranked: boolean;
  };
}

export interface TraceResponse {
  run_id: string;
  total_duration_ms: number;
  stage_count: number;
  stages: TraceStage[];
}

export function getTrace(runId: string): Promise<TraceResponse> {
  return apiFetch(`/api/v1/admin/trace/${encodeURIComponent(runId)}`);
}

// ── Pipeline Runs (for tracing list) ──────────────────────
export interface PipelineRun {
  run_id: string;
  message_id: string;
  channel_id: string;
  total_duration_ms: number;
  card_type: string | null;
  agent_count: number;
  created_at: string;
}

export interface PipelineRunsResponse {
  runs: PipelineRun[];
  total: number;
}

export function getPipelineRuns(
  page = 1,
  limit = 20
): Promise<PipelineRunsResponse> {
  return apiFetch(`/api/v1/admin/pipeline-runs?page=${page}&limit=${limit}`);
}

// ── Outcomes ──────────────────────────────────────────────
export interface OutcomeStats {
  channel_id: string;
  lookback_days: number;
  total_outcomes: number;
  positive: number;
  negative: number;
  neutral: number;
  avg_response_time_ms: number;
}

export function getOutcomes(
  channelId: string,
  lookbackDays = 30
): Promise<OutcomeStats> {
  return apiFetch(
    `/api/v1/admin/outcomes/${encodeURIComponent(channelId)}?lookback_days=${lookbackDays}`
  );
}

// ── KB Stats ──────────────────────────────────────────────
export interface KbStats {
  last_7_days: {
    total_messages: number;
    classified_rate: number;
    ticket_eligible: number;
    fyi_count: number;
  };
  collection?: {
    name: string;
    points_count: number;
    vector_size: number;
    distance: string;
  };
}

export function getKbStats(): Promise<KbStats> {
  return apiFetch("/api/v1/admin/kb/stats");
}

// ── Subscription Health ───────────────────────────────────
export interface SubHealth {
  active: number;
  pending: number;
  expiring_soon: number;
  failed: number;
  inactive: number;
  subscriptions: {
    channel_name: string;
    status: string;
    expires_at: string | null;
    minutes_until_expiry: number | null;
  }[];
}

export function getSubscriptionHealth(): Promise<SubHealth> {
  return apiFetch("/api/v1/admin/subscriptions/health");
}

// ── Dashboard Stats ───────────────────────────────────────
export interface DashboardStats {
  messages_24h: number;
  messages_7d: number;
  avg_pipeline_ms: number;
  cache_hit_rate: number;
  tickets_created_7d: number;
  kb_matches_7d: number;
  active_channels: number;
  top_intents: { intent: string; count: number }[];
  hourly_volume: { hour: string; count: number }[];
}

export function getDashboardStats(): Promise<DashboardStats> {
  return apiFetch("/api/v1/admin/dashboard/stats");
}

// ── Configuration ─────────────────────────────────────────
export interface AppConfig {
  semantic_match_threshold: number;
  semantic_surface_threshold: number;
  decision_ticket_threshold: number;
  wait_window_seconds: number;
  max_concurrent_pipelines: number;
  embedding_model: string;
  llm_model: string;
}

export function getConfig(): Promise<AppConfig> {
  return apiFetch("/api/v1/admin/config");
}

export function updateConfig(
  updates: Partial<AppConfig>
): Promise<AppConfig> {
  return apiFetch("/api/v1/admin/config", {
    method: "PATCH",
    body: JSON.stringify(updates),
  });
}

// ── Token Usage ───────────────────────────────────────────
export interface TokenAgentBreakdown {
  agent: string;
  model: string;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  calls: number;
  estimated_cost: number;
}

export interface TokenChannelUsage {
  channel_id: string;
  channel_name: string;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  estimated_cost: number;
  agents: TokenAgentBreakdown[];
}

export interface TokenDailyUsage {
  date: string;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  calls: number;
}

export interface TokenUsageResponse {
  days: number;
  totals: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
    estimated_cost: number;
  };
  channels: TokenChannelUsage[];
  daily: TokenDailyUsage[];
}

export function getTokenUsage(days = 7): Promise<TokenUsageResponse> {
  return apiFetch(`/api/v1/admin/token-usage?days=${days}`);
}

// ── KB Upload ─────────────────────────────────────────────
export interface KbArticleInput {
  title: string;
  content: string;
  category?: string;
  priority?: string;
  source?: string;
}

export interface KbUploadResponse {
  uploaded: number;
  point_ids: string[];  // Qdrant uses UUID strings
}

export function uploadKbArticles(
  articles: KbArticleInput[]
): Promise<KbUploadResponse> {
  return apiFetch("/api/v1/admin/kb/upload", {
    method: "POST",
    body: JSON.stringify({ articles }),
  });
}

export interface KbFileUploadResponse {
  uploaded: number;
  filename: string;
  articles_extracted: number;
  point_ids: string[];  // Qdrant uses UUID strings
}

export async function uploadKbFile(
  file: File,
  category: string,
  priority: string
): Promise<KbFileUploadResponse> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("category", category);
  formData.append("priority", priority);

  const url = `${API_BASE}/api/v1/admin/kb/upload-file`;
  const res = await fetch(url, {
    method: "POST",
    body: formData,
    headers: { "X-Admin-Key": ADMIN_KEY },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`API ${res.status}: ${body}`);
  }
  return res.json();
}

const SUPPORTED_KB_FILE_TYPES = [".pdf", ".docx", ".txt", ".md", ".csv", ".xlsx", ".json"] as const;
export { SUPPORTED_KB_FILE_TYPES };

// ── Trace Graph (Pipeline Debugger) ───────────────────────
export interface GraphTopologyNode {
  id: string;
  label: string;
  has_llm: boolean;
}

export interface GraphTopologyEdge {
  from: string;
  to: string;
  label: string | null;
}

export interface TraceNodeExecution {
  node: string;
  agent_name: string;
  status: string;
  duration_ms: number;
  token_usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
    model: string;
  } | null;
  started_at: string;
  error: string | null;
  input_data: Record<string, unknown> | null;
  output_data: Record<string, unknown> | null;
  decision_detail?: {
    action: string;
    score: number;
    threshold: number;
    breakdown: Record<string, number>;
  };
  resolution_detail?: {
    action_recommendation: string;
    match_source: string;
    confidence: number;
    title: string;
  };
}

export interface TraceGraphResponse {
  run_id: string;
  message_body: string;
  channel_name: string;
  total_duration_ms: number;
  total_tokens: number;
  topology: {
    nodes: GraphTopologyNode[];
    edges: GraphTopologyEdge[];
  };
  execution: TraceNodeExecution[];
  active_path: string[];
  skipped_nodes: string[];
}

export interface ReplayResponse {
  original_run_id: string;
  new_run_id: string;
  status: string;
  error?: string;
}

export function getTraceGraph(runId: string): Promise<TraceGraphResponse> {
  return apiFetch(`/api/v1/admin/trace/${encodeURIComponent(runId)}/graph`);
}

export function replayTrace(
  runId: string,
  fromNode?: string
): Promise<ReplayResponse> {
  return apiFetch(`/api/v1/admin/trace/${encodeURIComponent(runId)}/replay`, {
    method: "POST",
    body: JSON.stringify({ from_node: fromNode || null }),
  });
}
