import { useState } from "react";
import { Button } from "../../components/ui/button";
import { ChartCard, TimeSeriesChart, CategoryBarChart } from "../components/ChartCard";
import {
  useAdminUserGrowth,
  useAdminQuestCompletion,
  useAdminAIUsage,
  useAdminXPStats,
  useAdminCertificatesAnalytics,
} from "../lib/adminApi";

const RANGES = [7, 30, 90];

export function AnalyticsPage() {
  const [days, setDays] = useState(30);

  const { data: userGrowth, isLoading: userGrowthLoading } = useAdminUserGrowth(days);
  const { data: questCompletion, isLoading: questLoading } = useAdminQuestCompletion(days);
  const { data: aiUsage, isLoading: aiUsageLoading } = useAdminAIUsage(days);
  const { data: xpStats, isLoading: xpLoading } = useAdminXPStats();
  const { data: certificates, isLoading: certificatesLoading } = useAdminCertificatesAnalytics(days);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="orda-cinzel text-2xl font-bold">Analytics</h1>
          <p className="text-sm text-muted-foreground mt-1">Deeper look at platform trends.</p>
        </div>
        <div className="flex items-center gap-1">
          {RANGES.map((range) => (
            <Button key={range} size="sm" variant={days === range ? "default" : "outline"} onClick={() => setDays(range)}>
              {range}d
            </Button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard
          title="User growth"
          subtitle={`New signups, last ${days} days`}
          isLoading={userGrowthLoading}
          isEmpty={!userGrowth?.series.length}
        >
          <TimeSeriesChart data={userGrowth?.series ?? []} />
        </ChartCard>

        <ChartCard
          title="Quest completion"
          subtitle={`Completions per day, last ${days} days`}
          isLoading={questLoading}
          isEmpty={!questCompletion?.series.length}
        >
          <TimeSeriesChart data={questCompletion?.series ?? []} />
        </ChartCard>

        <ChartCard
          title="Top quests by completions"
          isLoading={questLoading}
          isEmpty={!questCompletion?.top_quests.length}
        >
          <CategoryBarChart data={questCompletion?.top_quests ?? []} categoryKey="title" valueKey="completions" />
        </ChartCard>

        <ChartCard
          title="AI historian usage"
          subtitle={`${aiUsage?.total_messages ?? 0} total questions asked`}
          isLoading={aiUsageLoading}
          isEmpty={!aiUsage?.series.length}
        >
          <TimeSeriesChart data={aiUsage?.series ?? []} />
        </ChartCard>

        <ChartCard
          title="XP distribution"
          subtitle={`Average ${xpStats?.average_xp.toFixed(0) ?? 0} · Max ${xpStats?.max_xp ?? 0}`}
          isLoading={xpLoading}
          isEmpty={!xpStats?.buckets.length}
        >
          <CategoryBarChart data={xpStats?.buckets ?? []} categoryKey="range" valueKey="count" />
        </ChartCard>

        <ChartCard
          title="Certificates issued"
          subtitle={`${certificates?.total_issued ?? 0} total issued`}
          isLoading={certificatesLoading}
          isEmpty={!certificates?.series.length}
        >
          <TimeSeriesChart data={certificates?.series ?? []} />
        </ChartCard>
      </div>
    </div>
  );
}
