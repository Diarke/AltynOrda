import type { ComponentType } from "react";

interface StatTileProps {
  label: string;
  value: string | number;
  icon?: ComponentType<{ size?: number; color?: string }>;
  hint?: string;
}

export function StatTile({ label, value, icon: Icon, hint }: StatTileProps) {
  return (
    <div
      className="rounded-2xl p-5"
      style={{ background: "rgba(34,38,47,0.5)", border: "1px solid rgba(255,255,255,0.06)" }}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
        {Icon && (
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: "rgba(212,175,55,0.1)" }}
          >
            <Icon size={15} color="#D4AF37" />
          </div>
        )}
      </div>
      <div className="orda-cinzel text-2xl font-bold" style={{ color: "#F6F4EC" }}>
        {value}
      </div>
      {hint && <div className="text-xs text-muted-foreground mt-1">{hint}</div>}
    </div>
  );
}
