import type { ReactNode } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { COLORS } from "../../styles/tokens";

interface ChartCardProps {
  title: string;
  subtitle?: string;
  children?: ReactNode;
  isLoading?: boolean;
  isEmpty?: boolean;
}

export function ChartCard({ title, subtitle, children, isLoading, isEmpty }: ChartCardProps) {
  return (
    <div
      className="rounded-2xl p-5"
      style={{ background: "rgba(34,38,47,0.5)", border: "1px solid rgba(255,255,255,0.06)" }}
    >
      <div className="mb-4">
        <h3 className="orda-cinzel text-sm font-semibold" style={{ color: "#F6F4EC" }}>
          {title}
        </h3>
        {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
      <div className="h-56">
        {isLoading ? (
          <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
            Loading…
          </div>
        ) : isEmpty ? (
          <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
            No data yet
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}

const tooltipStyle = {
  background: "#171A20",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 8,
  fontSize: 12,
  color: COLORS.text,
};

export function TimeSeriesChart({ data, dataKey = "value" }: { data: Array<Record<string, unknown>>; dataKey?: string }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
        <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
        <XAxis dataKey="date" tick={{ fill: COLORS.muted, fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: COLORS.muted, fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
        <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: COLORS.muted }} />
        <Line type="monotone" dataKey={dataKey} stroke={COLORS.gold} strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function CategoryBarChart({
  data,
  categoryKey,
  valueKey = "value",
}: {
  data: Array<Record<string, unknown>>;
  categoryKey: string;
  valueKey?: string;
}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
        <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
        <XAxis dataKey={categoryKey} tick={{ fill: COLORS.muted, fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: COLORS.muted, fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
        <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: COLORS.muted }} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
        <Bar dataKey={valueKey} fill={COLORS.teal} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
