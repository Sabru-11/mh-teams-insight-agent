"use client";

import { useApi } from "@/hooks/use-api";
import { getDashboardStats, getSubscriptionHealth, type DashboardStats, type SubHealth } from "@/lib/api";
import { StatCard, LoadingSpinner, ErrorMessage, Badge } from "@/components/ui/shared";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { MessageSquare, Zap, Database, Radio, TicketCheck, Brain } from "lucide-react";
import { formatDuration } from "@/lib/utils";
import { HourlyChart } from "./hourly-chart";

export default function DashboardPage() {
  const { data: stats, loading, error, refetch } = useApi<DashboardStats>(() => getDashboardStats());
  const { data: subHealth } = useApi<SubHealth>(() => getSubscriptionHealth());

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} onRetry={refetch} />;
  if (!stats) return null;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Dashboard</h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Pipeline overview and system health</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard
          label="Messages (24h)"
          value={stats.messages_24h}
          icon={<MessageSquare className="h-5 w-5" />}
        />
        <StatCard
          label="Avg Pipeline"
          value={formatDuration(stats.avg_pipeline_ms)}
          icon={<Zap className="h-5 w-5" />}
        />
        <StatCard
          label="Cache Hit Rate"
          value={`${(stats.cache_hit_rate * 100).toFixed(1)}%`}
          icon={<Database className="h-5 w-5" />}
        />
        <StatCard
          label="Active Channels"
          value={stats.active_channels}
          icon={<Radio className="h-5 w-5" />}
        />
        <StatCard
          label="Tickets (7d)"
          value={stats.tickets_created_7d}
          icon={<TicketCheck className="h-5 w-5" />}
        />
        <StatCard
          label="KB Matches (7d)"
          value={stats.kb_matches_7d}
          icon={<Brain className="h-5 w-5" />}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Hourly volume chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Message Volume (24h)</CardTitle>
          </CardHeader>
          <CardContent>
            <HourlyChart data={stats.hourly_volume} />
          </CardContent>
        </Card>

        {/* Top intents */}
        <Card>
          <CardHeader>
            <CardTitle>Top Intents (7d)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.top_intents.map(({ intent, count }) => (
                <div key={intent} className="flex items-center justify-between">
                  <span className="text-sm text-zinc-700 dark:text-zinc-300">{intent}</span>
                  <Badge variant="info">{count}</Badge>
                </div>
              ))}
              {stats.top_intents.length === 0 && (
                <p className="text-sm text-zinc-400">No data yet</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Subscription health */}
      {subHealth && (
        <Card>
          <CardHeader>
            <CardTitle>Subscription Health</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-emerald-500" />
                <span className="text-sm text-zinc-700 dark:text-zinc-300">Active: {subHealth.active}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-amber-500" />
                <span className="text-sm text-zinc-700 dark:text-zinc-300">Pending: {subHealth.pending}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-orange-500" />
                <span className="text-sm text-zinc-700 dark:text-zinc-300">Expiring Soon: {subHealth.expiring_soon}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-red-500" />
                <span className="text-sm text-zinc-700 dark:text-zinc-300">Failed: {subHealth.failed}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-zinc-400" />
                <span className="text-sm text-zinc-700 dark:text-zinc-300">Inactive: {subHealth.inactive}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
