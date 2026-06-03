"use client";

import { useState } from "react";
import { useApi } from "@/hooks/use-api";
import {
  getChannels,
  monitorChannel,
  deactivateChannel,
  renewChannelSubscription,
  type ChannelsResponse,
} from "@/lib/api";
import { Badge, Button, Input, LoadingSpinner, ErrorMessage, EmptyState } from "@/components/ui/shared";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Radio, Plus, Power, PowerOff, Clock, AlertTriangle, RefreshCw } from "lucide-react";
import { truncateId } from "@/lib/utils";

const statusBadge = (status: string, mins: number | null) => {
  if (status === "active" && mins !== null && mins < 20)
    return <Badge variant="warning">Expiring</Badge>;
  switch (status) {
    case "active":
      return <Badge variant="success">Active</Badge>;
    case "pending":
      return <Badge variant="info">Pending</Badge>;
    case "failed":
      return <Badge variant="danger">Failed</Badge>;
    case "inactive":
      return <Badge variant="outline">Inactive</Badge>;
    default:
      return <Badge>{status}</Badge>;
  }
};

export default function ChannelsPage() {
  const { data, loading, error, refetch } = useApi<ChannelsResponse>(() => getChannels());
  const [showAdd, setShowAdd] = useState(false);
  const [newTeamId, setNewTeamId] = useState("");
  const [newChannelId, setNewChannelId] = useState("");
  const [newChannelName, setNewChannelName] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const handleMonitor = async () => {
    if (!newTeamId || !newChannelId) return;
    setActionLoading("add");
    try {
      await monitorChannel(newChannelId, newTeamId, newChannelName);
      setShowAdd(false);
      setNewTeamId("");
      setNewChannelId("");
      setNewChannelName("");
      refetch();
    } catch {
      // error handled by UI
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeactivate = async (channelId: string) => {
    setActionLoading(channelId);
    try {
      await deactivateChannel(channelId);
      refetch();
    } finally {
      setActionLoading(null);
    }
  };

  const handleReactivate = async (channelId: string, teamId: string) => {
    setActionLoading(channelId);
    try {
      await monitorChannel(channelId, teamId);
      refetch();
    } finally {
      setActionLoading(null);
    }
  };

  const handleRenew = async (channelId: string) => {
    setActionLoading(channelId);
    try {
      await renewChannelSubscription(channelId);
      refetch();
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} onRetry={refetch} />;
  if (!data) return null;

  const { teams, summary } = data;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Channels</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Manage Teams channel subscriptions</p>
        </div>
        <Button onClick={() => setShowAdd(!showAdd)} size="sm">
          <Plus className="h-4 w-4" />
          Add Channel
        </Button>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <div className="rounded-lg border border-zinc-200 bg-white p-3 text-center dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{summary.total_configured}</p>
          <p className="text-xs text-zinc-500">Total</p>
        </div>
        <div className="rounded-lg border border-zinc-200 bg-white p-3 text-center dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-2xl font-bold text-emerald-600">{summary.active}</p>
          <p className="text-xs text-zinc-500">Active</p>
        </div>
        <div className="rounded-lg border border-zinc-200 bg-white p-3 text-center dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-2xl font-bold text-blue-600">{summary.monitored}</p>
          <p className="text-xs text-zinc-500">Monitored</p>
        </div>
        <div className="rounded-lg border border-zinc-200 bg-white p-3 text-center dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-2xl font-bold text-amber-600">{summary.expiring_soon}</p>
          <p className="text-xs text-zinc-500">Expiring Soon</p>
        </div>
        <div className="rounded-lg border border-zinc-200 bg-white p-3 text-center dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-2xl font-bold text-red-600">{summary.failed}</p>
          <p className="text-xs text-zinc-500">Failed</p>
        </div>
      </div>

      {/* Add channel form */}
      {showAdd && (
        <Card>
          <CardHeader>
            <CardTitle>Add Channel Subscription</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Input
                label="Team ID"
                placeholder="e0c11623-0567-..."
                value={newTeamId}
                onChange={(e) => setNewTeamId(e.target.value)}
              />
              <Input
                label="Channel ID"
                placeholder="19:abc...@thread.tacv2"
                value={newChannelId}
                onChange={(e) => setNewChannelId(e.target.value)}
              />
              <Input
                label="Channel Name (optional)"
                placeholder="General"
                value={newChannelName}
                onChange={(e) => setNewChannelName(e.target.value)}
              />
            </div>
            <div className="mt-4 flex gap-2">
              <Button onClick={handleMonitor} disabled={actionLoading === "add" || !newTeamId || !newChannelId}>
                {actionLoading === "add" ? "Registering..." : "Register"}
              </Button>
              <Button variant="ghost" onClick={() => setShowAdd(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Teams & channels list */}
      {teams.length === 0 ? (
        <EmptyState message="No channels configured" icon={<Radio className="h-10 w-10" />} />
      ) : (
        <div className="space-y-4">
          {teams.map((team) => (
            <Card key={team.team_id}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Radio className="h-4 w-4 text-blue-600" />
                  Team: {truncateId(team.team_id, 12)}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-zinc-200 text-left text-xs font-medium text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                        <th className="pb-2 pr-4">Channel</th>
                        <th className="pb-2 pr-4">Status</th>
                        <th className="pb-2 pr-4">Expires</th>
                        <th className="pb-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {team.channels.map((ch) => (
                        <tr key={ch.channel_id} className="border-b border-zinc-100 dark:border-zinc-800/50">
                          <td className="py-3 pr-4">
                            <div>
                              <p className="font-medium text-zinc-900 dark:text-zinc-100">
                                {ch.channel_name || "Unnamed"}
                              </p>
                              <p className="text-xs text-zinc-400 font-mono">{truncateId(ch.channel_id, 24)}</p>
                            </div>
                          </td>
                          <td className="py-3 pr-4">
                            {statusBadge(ch.subscription_status, ch.minutes_until_expiry)}
                          </td>
                          <td className="py-3 pr-4">
                            {ch.minutes_until_expiry !== null ? (
                              <div className="flex items-center gap-1 text-xs text-zinc-500">
                                <Clock className="h-3 w-3" />
                                {ch.minutes_until_expiry}m
                              </div>
                            ) : (
                              <span className="text-xs text-zinc-400">—</span>
                            )}
                          </td>
                          <td className="py-3">
                            {ch.subscription_status === "active" ? (
                              <div className="flex items-center gap-2">
                                {ch.minutes_until_expiry !== null && ch.minutes_until_expiry < 20 && (
                                  <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => handleRenew(ch.channel_id)}
                                    disabled={actionLoading === ch.channel_id}
                                  >
                                    <RefreshCw className="h-3 w-3" />
                                    Renew
                                  </Button>
                                )}
                                <Button
                                  variant="danger"
                                  size="sm"
                                  onClick={() => handleDeactivate(ch.channel_id)}
                                  disabled={actionLoading === ch.channel_id}
                                >
                                  <PowerOff className="h-3 w-3" />
                                  Deactivate
                                </Button>
                              </div>
                            ) : ch.subscription_status !== "pending" ? (
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => handleReactivate(ch.channel_id, team.team_id)}
                                disabled={actionLoading === ch.channel_id}
                              >
                                <Power className="h-3 w-3" />
                                Reactivate
                              </Button>
                            ) : (
                              <span className="flex items-center gap-1 text-xs text-amber-600">
                                <AlertTriangle className="h-3 w-3" />
                                Registering...
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
