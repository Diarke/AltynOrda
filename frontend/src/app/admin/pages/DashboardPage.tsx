import { Users, Zap, Award, MessageSquare, Coins, TrendingUp, GraduationCap } from "lucide-react";
import { StatTile } from "../components/StatTile";
import { ChartCard, TimeSeriesChart, CategoryBarChart } from "../components/ChartCard";
import {
  useAdminStatistics,
  useAdminUserGrowth,
  useAdminQuestCompletion,
  useAdminAIUsage,
  useAdminXPStats,
  useAdminCoinEconomy,
  useAdminCertificatesAnalytics,
  useAdminRecentActivity,
} from "../lib/adminApi";

export function DashboardPage() {
  const { data: stats } = useAdminStatistics();
  const { data: userGrowth, isLoading: userGrowthLoading } = useAdminUserGrowth(30);
  const { data: questCompletion, isLoading: questLoading } = useAdminQuestCompletion(30);
  const { data: aiUsage, isLoading: aiUsageLoading } = useAdminAIUsage(30);
  const { data: xpStats, isLoading: xpLoading } = useAdminXPStats();
  const { data: coinEconomy, isLoading: coinLoading } = useAdminCoinEconomy();
  const { data: certificates, isLoading: certificatesLoading } = useAdminCertificatesAnalytics(30);
  const { data: activity, isLoading: activityLoading } = useAdminRecentActivity(15);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="orda-cinzel text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Platform overview at a glance.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatTile label="Total users" value={stats?.total_users ?? "—"} icon={Users} hint={`+${stats?.new_users ?? 0} in 30d`} />
        <StatTile label="Daily active" value={stats?.daily_active_users ?? "—"} icon={TrendingUp} />
        <StatTile label="Completed quests" value={stats?.completed_quests ?? "—"} icon={Zap} />
        <StatTile label="Certificates issued" value={stats?.certificates_issued ?? "—"} icon={GraduationCap} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="User growth" subtitle="New signups, last 30 days" isLoading={userGrowthLoading} isEmpty={!userGrowth?.series.length}>
          <TimeSeriesChart data={userGrowth?.series ?? []} />
        </ChartCard>
        <ChartCard title="Quest completion" subtitle="Completions per day, last 30 days" isLoading={questLoading} isEmpty={!questCompletion?.series.length}>
          <TimeSeriesChart data={questCompletion?.series ?? []} />
        </ChartCard>
        <ChartCard title="AI historian usage" subtitle={`${aiUsage?.total_messages ?? 0} questions asked`} isLoading={aiUsageLoading} isEmpty={!aiUsage?.series.length}>
          <TimeSeriesChart data={aiUsage?.series ?? []} />
        </ChartCard>
        <ChartCard title="Certificates issued" subtitle="Last 30 days" isLoading={certificatesLoading} isEmpty={!certificates?.series.length}>
          <TimeSeriesChart data={certificates?.series ?? []} />
        </ChartCard>
        <ChartCard title="XP distribution" subtitle={`Average ${xpStats?.average_xp.toFixed(0) ?? 0} XP per user`} isLoading={xpLoading} isEmpty={!xpStats?.buckets.length}>
          <CategoryBarChart data={xpStats?.buckets ?? []} categoryKey="range" valueKey="count" />
        </ChartCard>
        <ChartCard title="Coin economy" subtitle={`${coinEconomy?.total_coins_in_circulation ?? 0} coins in circulation`} isLoading={coinLoading} isEmpty={!coinEconomy?.top_holders.length}>
          <div className="h-full overflow-y-auto space-y-2 pr-1">
            {coinEconomy?.top_holders.map((holder, index) => (
              <div key={holder.user_id} className="flex items-center justify-between text-sm py-1.5" style={{ borderBottom: "1px solid rgba(59,42,19,0.05)" }}>
                <span className="flex items-center gap-2">
                  <span className="text-muted-foreground text-xs w-4">{index + 1}</span>
                  {holder.username}
                </span>
                <span className="flex items-center gap-1 font-medium" style={{ color: "#B8892B" }}>
                  <Coins size={12} /> {holder.coins}
                </span>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>

      <div className="rounded-2xl p-5" style={{ background: "rgba(241,233,210,0.5)", border: "1px solid rgba(59,42,19,0.06)" }}>
        <h3 className="orda-cinzel text-sm font-semibold mb-4">Recent activity</h3>
        {activityLoading ? (
          <p className="text-xs text-muted-foreground">Loading…</p>
        ) : !activity?.items.length ? (
          <p className="text-xs text-muted-foreground">No recent activity.</p>
        ) : (
          <div className="space-y-3">
            {activity.items.map((item, index) => (
              <div key={index} className="flex items-start gap-3 text-sm">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                  style={{ background: "rgba(184,137,43,0.1)" }}
                >
                  {item.type === "chat" ? (
                    <MessageSquare size={13} color="#B8892B" />
                  ) : item.type === "certificate" ? (
                    <Award size={13} color="#B8892B" />
                  ) : (
                    <Zap size={13} color="#B8892B" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="truncate">
                    <span className="font-medium">{item.username ?? "Someone"}</span>{" "}
                    <span className="text-muted-foreground">{item.description}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">{new Date(item.created_at).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
