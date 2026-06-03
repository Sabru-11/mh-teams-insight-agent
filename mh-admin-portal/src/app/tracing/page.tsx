"use client";

import { useState } from "react";
import { useApi } from "@/hooks/use-api";
import { getPipelineRuns, getTraceGraph, type PipelineRunsResponse, type TraceGraphResponse } from "@/lib/api";
import { Badge, Button, Input, LoadingSpinner, ErrorMessage, EmptyState } from "@/components/ui/shared";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Activity, Search, ChevronRight, Clock, ArrowLeft } from "lucide-react";
import { formatDuration, formatRelativeTime, truncateId } from "@/lib/utils";
import { TraceDebugger } from "./trace-debugger";

export default function TracingPage() {
  const [page, setPage] = useState(1);
  const { data: runs, loading, error, refetch } = useApi<PipelineRunsResponse>(
    () => getPipelineRuns(page, 20),
    [page]
  );

  const [searchRunId, setSearchRunId] = useState("");
  const [selectedGraph, setSelectedGraph] = useState<TraceGraphResponse | null>(null);
  const [graphLoading, setGraphLoading] = useState(false);
  const [graphError, setGraphError] = useState<string | null>(null);

  const loadGraph = async (runId: string) => {
    setGraphLoading(true);
    setGraphError(null);
    try {
      const graph = await getTraceGraph(runId);
      setSelectedGraph(graph);
    } catch (e: unknown) {
      setGraphError(e instanceof Error ? e.message : "Failed to load trace graph");
    } finally {
      setGraphLoading(false);
    }
  };

  const handleSearch = () => {
    if (searchRunId.trim()) loadGraph(searchRunId.trim());
  };

  // When debugger is open, show it full-screen
  if (selectedGraph && !graphLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedGraph(null)}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to runs
          </Button>
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
            Pipeline Debugger
          </h2>
        </div>
        <TraceDebugger
          data={selectedGraph}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Pipeline Tracing</h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Inspect agent runs — click a run to open the visual debugger
        </p>
      </div>

      {/* Search by run ID */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <div className="flex-1">
              <Input
                placeholder="Search by Run ID..."
                value={searchRunId}
                onChange={(e) => setSearchRunId(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
            </div>
            <Button onClick={handleSearch} size="md">
              <Search className="h-4 w-4" />
              Search
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Loading / Error for graph */}
      {graphLoading && (
        <Card>
          <CardContent className="py-8">
            <LoadingSpinner />
          </CardContent>
        </Card>
      )}
      {graphError && (
        <Card>
          <CardContent className="py-4">
            <ErrorMessage message={graphError} />
          </CardContent>
        </Card>
      )}

      {/* Recent runs table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Pipeline Runs</CardTitle>
        </CardHeader>
        <CardContent>
          {loading && <LoadingSpinner />}
          {error && <ErrorMessage message={error} onRetry={refetch} />}
          {runs && runs.runs.length === 0 && (
            <EmptyState message="No pipeline runs yet" icon={<Activity className="h-10 w-10" />} />
          )}
          {runs && runs.runs.length > 0 && (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-200 text-left text-xs font-medium text-zinc-500 dark:border-zinc-800">
                      <th className="pb-2 pr-4">Run ID</th>
                      <th className="pb-2 pr-4">Message</th>
                      <th className="pb-2 pr-4">Card Type</th>
                      <th className="pb-2 pr-4">Duration</th>
                      <th className="pb-2 pr-4">Agents</th>
                      <th className="pb-2 pr-4">Time</th>
                      <th className="pb-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {runs.runs.map((run) => (
                      <tr
                        key={run.run_id}
                        className="cursor-pointer border-b border-zinc-100 hover:bg-zinc-50 dark:border-zinc-800/50 dark:hover:bg-zinc-800/30"
                        onClick={() => loadGraph(run.run_id)}
                      >
                        <td className="py-3 pr-4 font-mono text-xs">{truncateId(run.run_id, 12)}</td>
                        <td className="py-3 pr-4 font-mono text-xs">{truncateId(run.message_id, 12)}</td>
                        <td className="py-3 pr-4">
                          {run.card_type ? (
                            <Badge variant={run.card_type === "fix_found" ? "success" : run.card_type === "ticket_created" ? "warning" : "default"}>
                              {run.card_type}
                            </Badge>
                          ) : (
                            <span className="text-zinc-400">—</span>
                          )}
                        </td>
                        <td className="py-3 pr-4 text-zinc-700 dark:text-zinc-300">
                          {formatDuration(run.total_duration_ms)}
                        </td>
                        <td className="py-3 pr-4">
                          <Badge variant="outline">{run.agent_count}</Badge>
                        </td>
                        <td className="py-3 pr-4 text-xs text-zinc-500">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatRelativeTime(run.created_at)}
                          </div>
                        </td>
                        <td className="py-3">
                          <ChevronRight className="h-4 w-4 text-zinc-400" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="mt-4 flex items-center justify-between">
                <p className="text-xs text-zinc-500">{runs.total} total runs</p>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" disabled={page === 1} onClick={() => setPage(page - 1)}>
                    Previous
                  </Button>
                  <Button variant="ghost" size="sm" disabled={runs.runs.length < 20} onClick={() => setPage(page + 1)}>
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
