"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { cn } from "@/lib/utils";
import { Cpu, Database, Brain, Zap, CheckCircle2, XCircle, MinusCircle } from "lucide-react";

export interface PipelineNodeData {
  [key: string]: unknown;
  label: string;
  nodeId: string;
  status: "success" | "failed" | "skipped";
  durationMs: number;
  totalTokens: number | null;
  hasLlm: boolean;
  isSelected: boolean;
  onClick: (nodeId: string) => void;
}

const statusConfig = {
  success: {
    border: "border-emerald-500",
    bg: "bg-emerald-50 dark:bg-emerald-950/30",
    icon: <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />,
    pulse: "",
  },
  failed: {
    border: "border-red-500",
    bg: "bg-red-50 dark:bg-red-950/30",
    icon: <XCircle className="h-3.5 w-3.5 text-red-500" />,
    pulse: "",
  },
  skipped: {
    border: "border-zinc-300 dark:border-zinc-700 border-dashed",
    bg: "bg-zinc-50 dark:bg-zinc-900/50",
    icon: <MinusCircle className="h-3.5 w-3.5 text-zinc-400" />,
    pulse: "",
  },
};

function PipelineNodeComponent({ data }: NodeProps & { data: PipelineNodeData }) {
  const config = statusConfig[data.status];
  const nodeData = data as PipelineNodeData;

  return (
    <div
      className={cn(
        "cursor-pointer rounded-lg border-2 px-4 py-3 shadow-sm transition-all min-w-[160px]",
        config.border,
        config.bg,
        nodeData.isSelected
          ? "ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-zinc-900 shadow-lg scale-105"
          : "hover:shadow-md hover:scale-102"
      )}
      onClick={() => nodeData.onClick(nodeData.nodeId)}
    >
      <Handle type="target" position={Position.Top} className="!w-2 !h-2 !bg-zinc-400" />

      <div className="flex items-center gap-2 mb-1">
        {config.icon}
        <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 truncate">
          {nodeData.label}
        </span>
      </div>

      {nodeData.status !== "skipped" && (
        <div className="flex items-center justify-between gap-3 text-[10px] text-zinc-500 dark:text-zinc-400">
          <span className="flex items-center gap-1">
            <Zap className="h-2.5 w-2.5" />
            {nodeData.durationMs}ms
          </span>
          {nodeData.totalTokens !== null && nodeData.totalTokens > 0 && (
            <span className="flex items-center gap-1">
              {nodeData.hasLlm ? (
                <Brain className="h-2.5 w-2.5" />
              ) : (
                <Database className="h-2.5 w-2.5" />
              )}
              {nodeData.totalTokens}t
            </span>
          )}
        </div>
      )}

      {nodeData.status === "skipped" && (
        <p className="text-[10px] text-zinc-400 italic">skipped</p>
      )}

      <Handle type="source" position={Position.Bottom} className="!w-2 !h-2 !bg-zinc-400" />
    </div>
  );
}

export const PipelineNode = memo(PipelineNodeComponent);
