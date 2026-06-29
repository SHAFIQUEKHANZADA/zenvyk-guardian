"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/feedback";
import { CHART, tooltipStyle } from "./chart-theme";
import type { TimeseriesPoint } from "@/lib/api";
import { LineChart as LineChartIcon } from "lucide-react";

export function VerificationChart({ data }: { data: TimeseriesPoint[] }) {
  return (
    <Card className="h-full">
      <CardHeader>
        <div>
          <CardTitle>Verification Overview</CardTitle>
          <p className="mt-0.5 text-xs text-muted">
            Pass / Flagged / Blocked over time
          </p>
        </div>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <EmptyState
            icon={<LineChartIcon className="h-6 w-6" />}
            title="No verification history yet"
            description="Time-series data will appear here once the backend reports it."
            className="h-[260px]"
          />
        ) : (
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid stroke={CHART.grid} vertical={false} />
                <XAxis
                  dataKey="date"
                  stroke={CHART.axis}
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke={CHART.axis}
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
                <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: CHART.grid }} />
                <Legend
                  iconType="circle"
                  wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                />
                <Line
                  type="monotone"
                  dataKey="pass"
                  name="Pass"
                  stroke={CHART.pass}
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="flagged"
                  name="Flagged"
                  stroke={CHART.flagged}
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="blocked"
                  name="Blocked"
                  stroke={CHART.blocked}
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
