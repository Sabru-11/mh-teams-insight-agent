"use client";

import { useState } from "react";
import { useApi } from "@/hooks/use-api";
import { getConfig, updateConfig, type AppConfig } from "@/lib/api";
import { Button, LoadingSpinner, ErrorMessage } from "@/components/ui/shared";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Save, RotateCcw, Settings } from "lucide-react";

interface SettingRowProps {
  label: string;
  description: string;
  value: string | number;
  onChange: (val: string) => void;
  type?: "text" | "number";
  step?: string;
  readOnly?: boolean;
}

function SettingRow({ label, description, value, onChange, type = "number", step, readOnly }: SettingRowProps) {
  return (
    <div className="flex flex-col gap-2 border-b border-zinc-100 py-4 last:border-0 dark:border-zinc-800/50 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex-1">
        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{label}</p>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">{description}</p>
      </div>
      <input
        type={type}
        step={step}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        readOnly={readOnly}
        className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 sm:w-48"
      />
    </div>
  );
}

export default function SettingsPage() {
  const { data: config, loading, error, refetch } = useApi<AppConfig>(() => getConfig());
  const [edits, setEdits] = useState<Partial<AppConfig>>({});
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} onRetry={refetch} />;
  if (!config) return null;

  const merged = { ...config, ...edits };
  const hasChanges = Object.keys(edits).length > 0;

  const handleChange = (key: keyof AppConfig, val: string) => {
    const numericKeys: (keyof AppConfig)[] = [
      "semantic_match_threshold",
      "semantic_surface_threshold",
      "decision_ticket_threshold",
      "wait_window_seconds",
      "max_concurrent_pipelines",
    ];
    const parsed = numericKeys.includes(key) ? Number(val) : val;
    setEdits((prev) => ({ ...prev, [key]: parsed }));
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveMsg(null);
    try {
      await updateConfig(edits);
      setEdits({});
      refetch();
      setSaveMsg("Configuration saved successfully");
      setTimeout(() => setSaveMsg(null), 3000);
    } catch (e: unknown) {
      setSaveMsg(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => setEdits({});

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Configuration</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Pipeline thresholds and system settings</p>
        </div>
        {hasChanges && (
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={handleReset}>
              <RotateCcw className="h-4 w-4" />
              Reset
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving}>
              <Save className="h-4 w-4" />
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        )}
      </div>

      {saveMsg && (
        <div className={`rounded-lg px-4 py-2 text-sm ${saveMsg.includes("success") ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400" : "bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-400"}`}>
          {saveMsg}
        </div>
      )}

      {/* Semantic thresholds */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-blue-600" />
            Semantic Search Thresholds
          </CardTitle>
          <CardDescription>
            Controls how KB matches are classified. Scores above match threshold trigger immediate fix;
            between surface and match triggers surface_fix with context.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SettingRow
            label="Match Threshold"
            description="Score >= this value → immediate KB match (default: 0.85)"
            value={merged.semantic_match_threshold}
            onChange={(v) => handleChange("semantic_match_threshold", v)}
            step="0.01"
          />
          <SettingRow
            label="Surface Threshold"
            description="Score >= this value → surface_fix with reranking (default: 0.70)"
            value={merged.semantic_surface_threshold}
            onChange={(v) => handleChange("semantic_surface_threshold", v)}
            step="0.01"
          />
        </CardContent>
      </Card>

      {/* Decision thresholds */}
      <Card>
        <CardHeader>
          <CardTitle>Decision Agent</CardTitle>
          <CardDescription>
            Controls when the decision agent recommends ticket creation vs KB retrieval
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SettingRow
            label="Ticket Threshold"
            description="Weighted score >= this triggers ticket creation (default: 0.55)"
            value={merged.decision_ticket_threshold}
            onChange={(v) => handleChange("decision_ticket_threshold", v)}
            step="0.01"
          />
        </CardContent>
      </Card>

      {/* Pipeline settings */}
      <Card>
        <CardHeader>
          <CardTitle>Pipeline Settings</CardTitle>
          <CardDescription>Concurrency limits and timing windows</CardDescription>
        </CardHeader>
        <CardContent>
          <SettingRow
            label="Wait Window (seconds)"
            description="Delay before processing to batch rapid messages"
            value={merged.wait_window_seconds}
            onChange={(v) => handleChange("wait_window_seconds", v)}
          />
          <SettingRow
            label="Max Concurrent Pipelines"
            description="Maximum parallel pipeline executions"
            value={merged.max_concurrent_pipelines}
            onChange={(v) => handleChange("max_concurrent_pipelines", v)}
          />
        </CardContent>
      </Card>

      {/* Model info (read-only) */}
      <Card>
        <CardHeader>
          <CardTitle>Model Configuration</CardTitle>
          <CardDescription>Read-only model settings (change via environment variables)</CardDescription>
        </CardHeader>
        <CardContent>
          <SettingRow
            label="Embedding Model"
            description="Model used for KB vector embeddings"
            value={merged.embedding_model}
            onChange={() => {}}
            type="text"
            readOnly
          />
          <SettingRow
            label="LLM Model"
            description="Primary language model for agents"
            value={merged.llm_model}
            onChange={() => {}}
            type="text"
            readOnly
          />
        </CardContent>
      </Card>
    </div>
  );
}
