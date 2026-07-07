import { useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Eye, Search } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { Switch } from "../../components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { DataTable, type DataTableColumn } from "../components/DataTable";
import { FormDialog } from "../components/FormDialog";
import { ConfirmDialog } from "../components/ConfirmDialog";
import {
  useAdminAchievementDefinitions,
  useCreateAdminAchievementDefinition,
  useUpdateAdminAchievementDefinition,
  useDeleteAdminAchievementDefinition,
  type AdminAchievementDefinition,
  type AdminAchievementDefinitionInput,
  type AchievementMetric,
} from "../lib/adminApi";

const METRICS: { value: AchievementMetric; label: string }[] = [
  { value: "xp", label: "Total XP" },
  { value: "coins", label: "Total coins" },
  { value: "level", label: "Level reached" },
  { value: "streak_days", label: "Login streak (days)" },
  { value: "quests_completed", label: "Quests completed" },
  { value: "cities_visited", label: "Cities visited" },
  { value: "artifacts_collected", label: "Artifacts collected" },
  { value: "certificates_issued", label: "Certificates issued" },
];

const EMPTY_FORM: AdminAchievementDefinitionInput = {
  key: "",
  title: "",
  description: "",
  icon_url: null,
  metric: "quests_completed",
  threshold: 1,
  reward_xp: 50,
  reward_coins: 10,
  sort_order: 0,
  is_active: true,
};

export function AchievementDefinitionsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [metricFilter, setMetricFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AdminAchievementDefinition | null>(null);
  const [form, setForm] = useState<AdminAchievementDefinitionInput>(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState<AdminAchievementDefinition | null>(null);
  const [previewTarget, setPreviewTarget] = useState<AdminAchievementDefinition | null>(null);

  const { data, isLoading } = useAdminAchievementDefinitions(page, 20, {
    q: search || undefined,
    metric: metricFilter === "all" ? undefined : metricFilter,
  });
  const createMutation = useCreateAdminAchievementDefinition();
  const updateMutation = useUpdateAdminAchievementDefinition();
  const deleteMutation = useDeleteAdminAchievementDefinition();

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (definition: AdminAchievementDefinition) => {
    setEditing(definition);
    setForm({
      key: definition.key,
      title: definition.title,
      description: definition.description,
      icon_url: definition.icon_url,
      metric: definition.metric,
      threshold: definition.threshold,
      reward_xp: definition.reward_xp,
      reward_coins: definition.reward_coins,
      sort_order: definition.sort_order,
      is_active: definition.is_active,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    try {
      if (editing) {
        await updateMutation.mutateAsync({ id: editing.id, data: form });
        toast.success("Achievement definition updated");
      } else {
        await createMutation.mutateAsync(form);
        toast.success("Achievement definition created");
      }
      setDialogOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync(deleteTarget.id);
      toast.success("Achievement definition deleted");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setDeleteTarget(null);
    }
  };

  const metricLabel = (metric: AchievementMetric) => METRICS.find((m) => m.value === metric)?.label ?? metric;

  const columns: DataTableColumn<AdminAchievementDefinition>[] = [
    { key: "title", header: "Title", render: (d) => <span className="font-medium">{d.title}</span> },
    { key: "key", header: "Key", render: (d) => d.key },
    { key: "condition", header: "Condition", render: (d) => `${metricLabel(d.metric)} ≥ ${d.threshold.toLocaleString()}` },
    { key: "rewards", header: "Rewards", render: (d) => `${d.reward_xp} XP / ${d.reward_coins} coins` },
    { key: "active", header: "Active", render: (d) => (d.is_active ? "Yes" : "No") },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="orda-cinzel text-2xl font-bold">Achievement Definitions</h1>
          <p className="text-sm text-muted-foreground mt-1">
            The catalog of achievements players can earn automatically as they play. Editing a
            definition here changes what real users can unlock — nothing is hardcoded.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus size={16} /> New achievement
        </Button>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by title, key, or description…"
            className="pl-9"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <Select value={metricFilter} onValueChange={(v) => { setMetricFilter(v); setPage(1); }}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All metrics</SelectItem>
            {METRICS.map((m) => (
              <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={columns}
        rows={data?.data ?? []}
        rowKey={(d) => d.id}
        isLoading={isLoading}
        page={page}
        pageSize={20}
        total={data?.meta.total ?? 0}
        onPageChange={setPage}
        actions={(definition) => (
          <div className="flex items-center justify-end gap-1">
            <Button variant="ghost" size="icon" onClick={() => setPreviewTarget(definition)}>
              <Eye size={14} />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => openEdit(definition)}>
              <Pencil size={14} />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(definition)}>
              <Trash2 size={14} />
            </Button>
          </div>
        )}
      />

      <FormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={editing ? "Edit achievement definition" : "New achievement definition"}
        onSubmit={handleSubmit}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
      >
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Key (unique slug)</Label>
            <Input value={form.key} onChange={(e) => setForm({ ...form, key: e.target.value })} required />
          </div>
          <div className="space-y-1.5">
            <Label>Title</Label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Description</Label>
          <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Metric</Label>
            <Select value={form.metric} onValueChange={(value) => setForm({ ...form, metric: value as AchievementMetric })}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {METRICS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Threshold</Label>
            <Input
              type="number"
              value={form.threshold}
              onChange={(e) => setForm({ ...form, threshold: Number(e.target.value) })}
              required
            />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3 items-end">
          <div className="space-y-1.5">
            <Label>Reward XP</Label>
            <Input
              type="number"
              value={form.reward_xp}
              onChange={(e) => setForm({ ...form, reward_xp: Number(e.target.value) })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Reward coins</Label>
            <Input
              type="number"
              value={form.reward_coins}
              onChange={(e) => setForm({ ...form, reward_coins: Number(e.target.value) })}
            />
          </div>
          <div className="flex items-center gap-2 pb-2">
            <Switch checked={form.is_active} onCheckedChange={(checked) => setForm({ ...form, is_active: checked })} />
            <Label>Active</Label>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Sort order</Label>
          <Input
            type="number"
            value={form.sort_order}
            onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })}
          />
        </div>
      </FormDialog>

      <Dialog open={!!previewTarget} onOpenChange={(open) => !open && setPreviewTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="orda-cinzel">Preview</DialogTitle>
          </DialogHeader>
          {previewTarget && (
            <div className="flex items-center gap-3 p-4 rounded-xl" style={{ background: "rgba(212,175,55,0.05)", border: "1px solid rgba(212,175,55,0.15)" }}>
              <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "rgba(212,175,55,0.15)" }}>
                {previewTarget.icon_url || "🏆"}
              </div>
              <div>
                <div className="text-sm orda-cinzel" style={{ color: "#F6F4EC" }}>{previewTarget.title}</div>
                <div className="text-xs" style={{ color: "#B7BAC3" }}>{previewTarget.description}</div>
                <div className="text-[11px] mt-1" style={{ color: "#D4AF37" }}>
                  {metricLabel(previewTarget.metric)} ≥ {previewTarget.threshold.toLocaleString()} · +{previewTarget.reward_xp} XP / +{previewTarget.reward_coins} coins
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete achievement definition"
        description={`Are you sure you want to delete "${deleteTarget?.title}"? Users who already earned it keep the badge, but no one else will be able to.`}
        onConfirm={handleDelete}
      />
    </div>
  );
}
