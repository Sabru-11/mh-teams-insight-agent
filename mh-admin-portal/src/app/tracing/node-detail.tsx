"use client";

import { useState } from "react";
import type { TraceNodeExecution } from "@/lib/api";
import { Badge } from "@/components/ui/shared";
import {
  Zap,
  Hash,
  Clock,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Brain,
} from "lucide-react";

interface NodeDetailProps {
  node: TraceNodeExecution;
}

function JsonBlock({ data, label }: { data: unknown; label: string }) {
  const [open, setOpen] = useState(false);
  if (!data) return null;

  return (
    <div className="border border-zinc-200 rounded-lg dark:border-zinc-800">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-3 py-2 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 rounded-lg"
      >
        {label}
        {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
      </button>
      {open && (
        <pre className="max-h-64 overflow-auto border-t border-zinc-200 bg-zinc-50 px-3 py-2 text-[11px] text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 rounded-b-lg">
          {JSON.stringify(data, null, 2)}
        </pre>
      )}
    </div>
  );
}

export function NodeDetailPanel({ node }: NodeDetailProps) {
  const statusIcon =
    node.status === "success" ? (
      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
    ) : (
      <XCircle className="h-4 w-4 text-red-500" />
    );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {statusIcon}
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            {node.agent_name}
          </h3>
        </div>
        <Badge variant={node.status === "success" ? "success" : "danger"}>{node.status}</Badge>
      </div>

      {/* Metrics grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900/50">
          <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
            <Zap className="h-3 w-3" />
            Duration
          </div>
          <p className="mt-1 text-lg font-bold text-zinc-900 dark:text-zinc-100">
            {node.duration_ms}ms
          </p>
        </div>

        {node.token_usage && (
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900/50">
            <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
              <Hash className="h-3 w-3" />
              Tokens
            </div>
            <p className="mt-1 text-lg font-bold text-zinc-900 dark:text-zinc-100">
              {node.token_usage.total_tokens}
            </p>
            <p className="text-[10px] text-zinc-400">
              {node.token_usage.prompt_tokens} in / {node.token_usage.completion_tokens} out
            </p>
          </div>
        )}

        {node.token_usage?.model && (
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900/50">
            <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
              <Brain className="h-3 w-3" />
              Model
            </div>
            <p className="mt-1 text-sm font-mono font-medium text-zinc-900 dark:text-zinc-100">
              {node.token_usage.model}
            </p>
          </div>
        )}

        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900/50">
          <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
            <Clock className="h-3 w-3" />
            Started
          </div>
          <p className="mt-1 text-xs font-mono text-zinc-700 dark:text-zinc-300">
            {new Date(node.started_at).toLocaleTimeString()}
          </p>
        </div>
      </div>

      {/* Error */}
      {node.error && (
        <div className="flex items-start gap-2 rounded-lg bg-red-50 px-4 py-3 dark:bg-red-900/20">
          <AlertTriangle className="mt-0.5 h-4 w-4 text-red-500" />
          <div>
            <p className="text-xs font-medium text-red-700 dark:text-red-400">Error</p>
            <p className="mt-1 text-xs text-red-600 dark:text-red-300 font-mono">{node.error}</p>
          </div>
        </div>
      )}

      {/* Decision breakdown */}
      {node.decision_detail && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-950/30">
          <p className="text-xs font-semibold text-blue-700 dark:text-blue-400 mb-2">
            Decision Score Breakdown
          </p>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-mono text-blue-900 dark:text-blue-200">
              Score: {node.decision_detail.score?.toFixed(3)}
            </span>
            <span className="text-xs text-blue-600 dark:text-blue-400">
              Threshold: {node.decision_detail.threshold}
            </span>
          </div>
          <Badge variant="info">{node.decision_detail.action}</Badge>
          {node.decision_detail.breakdown && (
            <div className="mt-2 space-y-1">
              {Object.entries(node.decision_detail.breakdown).map(([key, val]) => (
                <div key={key} className="flex justify-between text-[11px]">
                  <span className="text-blue-700 dark:text-blue-300">{key}</span>
                  <span className="font-mono text-blue-900 dark:text-blue-200">
                    {(val as number).toFixed(3)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Resolution detail */}
      {node.resolution_detail && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-800 dark:bg-emerald-950/30">
          <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 mb-1">
            KB Match
          </p>
          <p className="text-sm text-emerald-900 dark:text-emerald-200">
            {node.resolution_detail.title}
          </p>
          <div className="mt-1 flex gap-2 text-[11px] text-emerald-600 dark:text-emerald-400">
            <span>Action: {node.resolution_detail.action_recommendation}</span>
            <span>Confidence: {node.resolution_detail.confidence?.toFixed(2)}</span>
          </div>
        </div>
      )}

      {/* Input / Output */}
      <div className="space-y-2">
        <JsonBlock data={node.input_data} label="Input Data" />
        <JsonBlock data={node.output_data} label="Output Data" />
      </div>

    </div>
  );
}
