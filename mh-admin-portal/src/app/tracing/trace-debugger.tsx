"use client";

import { useMemo, useState, useCallback } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  type NodeTypes,
  MarkerType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { PipelineNode, type PipelineNodeData } from "./pipeline-node";
import { NodeDetailPanel } from "./node-detail";
import type {
  TraceGraphResponse,
  TraceNodeExecution,
} from "@/lib/api";
import { Badge } from "@/components/ui/shared";
import { Zap, Hash, Clock, X } from "lucide-react";

interface TraceDebuggerProps {
  data: TraceGraphResponse;
}

// Layout constants
const NODE_W = 180;
const NODE_H = 72;
const GAP_Y = 100;
const CENTER_X = 400;

// Node positioning — top-to-bottom flow matching the pipeline order
const NODE_POSITIONS: Record<string, { x: number; y: number }> = {
  triage:                { x: CENTER_X,         y: 0 },
  kb_cache_check:        { x: CENTER_X,         y: GAP_Y },
  context_agent:         { x: CENTER_X + 220,   y: GAP_Y * 2 },
  decision:              { x: CENTER_X + 220,   y: GAP_Y * 3 },
  ticket_manager:        { x: CENTER_X + 440,   y: GAP_Y * 4 },
  resolution_finder:     { x: CENTER_X + 220,   y: GAP_Y * 4 },
  store_kb:              { x: CENTER_X,         y: GAP_Y * 4 },
  recurring_escalation:  { x: CENTER_X + 440,   y: GAP_Y * 3 },
  responder:             { x: CENTER_X + 220,   y: GAP_Y * 5 },
};

const nodeTypes: NodeTypes = { pipeline: PipelineNode as unknown as NodeTypes["pipeline"] };

export function TraceDebugger({ data }: TraceDebuggerProps) {
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  const executionMap = useMemo(() => {
    const map: Record<string, TraceNodeExecution> = {};
    for (const exec of data.execution) {
      map[exec.node] = exec;
    }
    return map;
  }, [data.execution]);

  const handleNodeClick = useCallback((nodeId: string) => {
    setSelectedNode((prev) => (prev === nodeId ? null : nodeId));
  }, []);

  const nodes = useMemo(() => {
    return data.topology.nodes.map((topoNode) => {
      const exec = executionMap[topoNode.id];
      const isActive = data.active_path.includes(topoNode.id);
      const pos = NODE_POSITIONS[topoNode.id] || { x: CENTER_X, y: 0 };

      const nodeData: PipelineNodeData = {
        label: topoNode.label,
        nodeId: topoNode.id,
        status: isActive ? (exec?.status === "failed" ? "failed" : "success") : "skipped",
        durationMs: exec?.duration_ms || 0,
        totalTokens: exec?.token_usage?.total_tokens ?? null,
        hasLlm: topoNode.has_llm,
        isSelected: selectedNode === topoNode.id,
        onClick: handleNodeClick,
      };

      return {
        id: topoNode.id,
        type: "pipeline",
        position: pos,
        data: nodeData,
      };
    });
  }, [data, executionMap, selectedNode, handleNodeClick]);

  const edges = useMemo(() => {
    return data.topology.edges.map((e, i) => {
      const sourceActive = data.active_path.includes(e.from);
      const targetActive = data.active_path.includes(e.to === "__end__" ? e.from : e.to);
      const isActivePath = sourceActive && targetActive;

      return {
        id: `edge-${i}`,
        source: e.from,
        target: e.to === "__end__" ? e.from : e.to,
        label: e.label || undefined,
        type: "smoothstep",
        animated: isActivePath,
        style: {
          stroke: isActivePath ? "#10b981" : "#a1a1aa",
          strokeWidth: isActivePath ? 2 : 1,
          strokeDasharray: isActivePath ? undefined : "5 5",
        },
        labelStyle: { fontSize: 10, fill: "#71717a" },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: isActivePath ? "#10b981" : "#a1a1aa",
          width: 16,
          height: 16,
        },
      };
    }).filter((e) => e.source !== e.target);
  }, [data]);

  const selectedExec = selectedNode ? executionMap[selectedNode] : null;

  return (
    <div className="flex h-[calc(100vh-220px)] gap-4">
      {/* Graph panel */}
      <div className="flex-1 rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 overflow-hidden">
        {/* Header bar */}
        <div className="flex items-center justify-between border-b border-zinc-200 bg-zinc-50 px-4 py-2 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-zinc-500">{data.run_id.slice(0, 8)}…</span>
            <Badge variant="outline">{data.channel_name || "Unknown"}</Badge>
          </div>
          <div className="flex items-center gap-4 text-xs text-zinc-500">
            <span className="flex items-center gap-1">
              <Zap className="h-3 w-3" />
              {data.total_duration_ms}ms
            </span>
            <span className="flex items-center gap-1">
              <Hash className="h-3 w-3" />
              {data.total_tokens} tokens
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {data.execution.length} nodes
            </span>
          </div>
        </div>

        {/* Message preview */}
        {data.message_body && (
          <div className="border-b border-zinc-200 px-4 py-2 dark:border-zinc-800">
            <p className="text-xs text-zinc-500 truncate">
              <span className="font-medium">Message:</span> {data.message_body}
            </p>
          </div>
        )}

        {/* React Flow canvas */}
        <div className="h-[calc(100%-80px)]">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.3 }}
            minZoom={0.3}
            maxZoom={1.5}
            proOptions={{ hideAttribution: true }}
          >
            <Background gap={20} size={1} />
            <Controls showInteractive={false} />
          </ReactFlow>
        </div>
      </div>

      {/* Detail panel */}
      {selectedExec && (
        <div className="w-[380px] shrink-0 overflow-y-auto rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">
              Node Inspector
            </h3>
            <button
              onClick={() => setSelectedNode(null)}
              className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <NodeDetailPanel node={selectedExec} />
        </div>
      )}

      {/* Empty state for detail panel */}
      {!selectedExec && (
        <div className="w-[380px] shrink-0 flex items-center justify-center rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700">
          <div className="text-center">
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
              <Zap className="h-5 w-5 text-zinc-400" />
            </div>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Click a node to inspect
            </p>
            <p className="text-xs text-zinc-400">
              View input/output and tokens
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
