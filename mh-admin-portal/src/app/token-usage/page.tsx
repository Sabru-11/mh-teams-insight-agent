"use client";

import { useState } from "react";
import { useApi } from "@/hooks/use-api";
import { getTokenUsage, type TokenUsageResponse } from "@/lib/api";
import { StatCard, LoadingSpinner, ErrorMessage, Badge, Button, EmptyState } from "@/components/ui/shared";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Coins, TrendingUp, Cpu, Hash, ChevronDown, ChevronUp } from "lucide-react";
import { DailyTokenChart } from "./daily-chart";
import { cn } from "@/lib/utils";

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

function formatCost(cost: number): string {
  if (cost < 0.01) return `$${cost.toFixed(4)}`;
  return `$${cost.toFixed(2)}`;
}

const agentBadgeColor: Record<string, "info" | "success" | "warning" | "danger" | "default"> = {
  triage: "info",
  resolution_finder: "success",
  responder: "warning",
  ticket_manager: "danger",
};

export default function TokenUsagePage() {
  const [days, setDays] = useState(7);
  const { data, loading, error, refetch } = useApi<TokenUsageResponse>(
    () => getTokenUsage(days),
    [days]
  );

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} onRetry={refetch} />;
  if (!data) return null;

  const { totals, channels, daily } = data;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Token Usage</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            LLM token consumption and estimated costs per channel
          </p>
        </div>
        <div className="flex gap-1 rounded-lg border border-zinc-200 bg-white p-1 dark:border-zinc-800 dark:bg-zinc-900">
          {[7, 14, 30].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                days === d
                  ? "bg-blue-600 text-white"
                  : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
              )}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      {/* Grand totals */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Tokens"
          value={formatNumber(totals.total_tokens)}
          subtitle={`${formatNumber(totals.prompt_tokens)} in / ${formatNumber(totals.completion_tokens)} out`}
          icon={<Hash className="h-5 w-5" />}
        />
        <StatCard
          label="Prompt Tokens"
          value={formatNumber(totals.prompt_tokens)}
          icon={<TrendingUp className="h-5 w-5" />}
        />
        <StatCard
          label="Completion Tokens"
          value={formatNumber(totals.completion_tokens)}
          icon={<Cpu className="h-5 w-5" />}
        />
        <StatCard
          label="Estimated Cost"
          value={formatCost(totals.estimated_cost)}
          subtitle={`Last ${days} days`}
          icon={<Coins className="h-5 w-5" />}
        />
      </div>

      {/* Daily chart */}
      <Card>
        <CardHeader>
          <CardTitle>Daily Token Usage</CardTitle>
          <CardDescription>Prompt vs completion tokens over time</CardDescription>
        </CardHeader>
        <CardContent>
          {daily.length > 0 ? (
            <DailyTokenChart data={daily} />
          ) : (
            <EmptyState message="No token data yet — send messages to start tracking" />
          )}
        </CardContent>
      </Card>

      {/* Per-channel breakdown */}
      <div>
        <h3 className="mb-3 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          Usage by Channel
        </h3>
        {channels.length === 0 ? (
          <EmptyState message="No token usage data recorded yet" icon={<Coins className="h-10 w-10" />} />
        ) : (
          <div className="space-y-3">
            {channels.map((ch) => (
              <ChannelCard key={ch.channel_id} channel={ch} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ChannelCard({ channel }: { channel: TokenUsageResponse["channels"][0] }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card>
      <div
        className="flex cursor-pointer items-center justify-between p-5"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
            <Hash className="h-5 w-5" />
          </div>
          <div>
            <p className="font-medium text-zinc-900 dark:text-zinc-100">
              {channel.channel_name || "Unnamed Channel"}
            </p>
            <p className="text-xs font-mono text-zinc-400">
              {channel.channel_id.length > 30
                ? channel.channel_id.slice(0, 30) + "…"
                : channel.channel_id}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="text-right">
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              {formatNumber(channel.total_tokens)} tokens
            </p>
            <p className="text-xs text-zinc-500">
              {formatCost(channel.estimated_cost)}
            </p>
          </div>

          {/* Token bar */}
          <div className="hidden w-40 sm:block">
            <div className="flex h-2 rounded-full bg-zinc-100 dark:bg-zinc-800">
              <div
                className="rounded-l-full bg-blue-500"
                style={{
                  width: `${channel.total_tokens > 0 ? (channel.prompt_tokens / channel.total_tokens) * 100 : 0}%`,
                }}
              />
              <div
                className="rounded-r-full bg-emerald-500"
                style={{
                  width: `${channel.total_tokens > 0 ? (channel.completion_tokens / channel.total_tokens) * 100 : 0}%`,
                }}
              />
            </div>
            <div className="mt-1 flex justify-between text-[10px] text-zinc-400">
              <span>{formatNumber(channel.prompt_tokens)} in</span>
              <span>{formatNumber(channel.completion_tokens)} out</span>
            </div>
          </div>

          {expanded ? (
            <ChevronUp className="h-4 w-4 text-zinc-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-zinc-400" />
          )}
        </div>
      </div>

      {expanded && (
        <div className="border-t border-zinc-200 px-5 pb-5 dark:border-zinc-800">
          <table className="mt-3 w-full text-sm">
            <thead>
              <tr className="text-left text-xs font-medium text-zinc-500 dark:text-zinc-400">
                <th className="pb-2 pr-3">Agent</th>
                <th className="pb-2 pr-3">Model</th>
                <th className="pb-2 pr-3 text-right">Prompt</th>
                <th className="pb-2 pr-3 text-right">Completion</th>
                <th className="pb-2 pr-3 text-right">Total</th>
                <th className="pb-2 pr-3 text-right">Calls</th>
                <th className="pb-2 text-right">Cost</th>
              </tr>
            </thead>
            <tbody>
              {channel.agents.map((a, i) => (
                <tr key={i} className="border-t border-zinc-100 dark:border-zinc-800/50">
                  <td className="py-2 pr-3">
                    <Badge variant={agentBadgeColor[a.agent] || "default"}>{a.agent}</Badge>
                  </td>
                  <td className="py-2 pr-3 font-mono text-xs text-zinc-500">{a.model}</td>
                  <td className="py-2 pr-3 text-right text-zinc-700 dark:text-zinc-300">
                    {formatNumber(a.prompt_tokens)}
                  </td>
                  <td className="py-2 pr-3 text-right text-zinc-700 dark:text-zinc-300">
                    {formatNumber(a.completion_tokens)}
                  </td>
                  <td className="py-2 pr-3 text-right font-medium text-zinc-900 dark:text-zinc-100">
                    {formatNumber(a.total_tokens)}
                  </td>
                  <td className="py-2 pr-3 text-right text-zinc-500">{a.calls}</td>
                  <td className="py-2 text-right text-zinc-500">{formatCost(a.estimated_cost)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
