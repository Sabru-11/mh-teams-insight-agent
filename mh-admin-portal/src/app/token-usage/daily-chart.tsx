"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";

interface DailyTokenChartProps {
  data: { date: string; prompt_tokens: number; completion_tokens: number; total_tokens: number; calls: number }[];
}

export function DailyTokenChart({ data }: DailyTokenChartProps) {
  const formatted = data.map((d) => ({
    ...d,
    date: d.date.slice(5), // "MM-DD"
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={formatted} margin={{ top: 4, right: 4, bottom: 0, left: -10 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-zinc-200 dark:stroke-zinc-800" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11, fill: "#a1a1aa" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: "#a1a1aa" }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v: number) => (v >= 1000 ? `${(v / 1000).toFixed(0)}K` : String(v))}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "#18181b",
            border: "1px solid #3f3f46",
            borderRadius: "8px",
            color: "#fafafa",
            fontSize: 12,
          }}
          formatter={(value, name) => [
            Number(value).toLocaleString(),
            name === "prompt_tokens" ? "Prompt" : "Completion",
          ]}
        />
        <Legend
          formatter={(value: string) =>
            value === "prompt_tokens" ? "Prompt Tokens" : "Completion Tokens"
          }
          wrapperStyle={{ fontSize: 12 }}
        />
        <Bar dataKey="prompt_tokens" fill="#3b82f6" radius={[4, 4, 0, 0]} stackId="tokens" />
        <Bar dataKey="completion_tokens" fill="#10b981" radius={[4, 4, 0, 0]} stackId="tokens" />
      </BarChart>
    </ResponsiveContainer>
  );
}
