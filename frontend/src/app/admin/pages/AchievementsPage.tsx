import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { DataTable, type DataTableColumn } from "../components/DataTable";
import { FormDialog } from "../components/FormDialog";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { useAdminAchievements, useCreateAdminAchievement, useDeleteAdminAchievement, useAdminUsers } from "../lib/adminApi";
import type { ApiAchievement } from "../../lib/api";

const ACHIEVEMENT_TYPES = [
  "explorer",
  "scholar",
  "collector",
  "completionist",
  "historian",
  "merchant",
  "archaeologist",
  "master_of_the_steppe",
  "ai_scholar",
];

const EMPTY_FORM = {
  user_id: "",
  achievement_type: "explorer",
  title: "",
  description: "",
  icon_url: null as string | null,
};

export function AchievementsPage() {
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState<ApiAchievement | null>(null);

  const { data, isLoading } = useAdminAchievements(page, 20);
  const { data: usersData } = useAdminUsers({ page: 1, pageSize: 100 });
  const createMutation = useCreateAdminAchievement();
  const deleteMutation = useDeleteAdminAchievement();

  const users = usersData?.data ?? [];
  const username = (id: string) => users.find((u) => u.id === id)?.username ?? id;

  const openCreate = () => {
    setForm({ ...EMPTY_FORM, user_id: users[0]?.id ?? "" });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    try {
      await createMutation.mutateAsync(form);
      toast.success("Achievement granted");
      setDialogOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync(deleteTarget.id);
      toast.success("Achievement revoked");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setDeleteTarget(null);
    }
  };

  const columns: DataTableColumn<ApiAchievement>[] = [
    { key: "title", header: "Title", render: (a) => <span className="font-medium">{a.title}</span> },
    { key: "user", header: "User", render: (a) => username(a.user_id) },
    { key: "type", header: "Type", render: (a) => a.achievement_type },
    { key: "rewards", header: "Rewards", render: (a) => `${a.reward_xp} XP / ${a.reward_coins} coins` },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="orda-cinzel text-2xl font-bold">Achievements</h1>
          <p className="text-sm text-muted-foreground mt-1">View awarded achievements and manually grant new ones.</p>
        </div>
        <Button onClick={openCreate} disabled={users.length === 0}>
          <Plus size={16} /> Grant achievement
        </Button>
      </div>

      <DataTable
        columns={columns}
        rows={data?.data ?? []}
        rowKey={(a) => a.id}
        isLoading={isLoading}
        page={page}
        pageSize={20}
        total={data?.meta.total ?? 0}
        onPageChange={setPage}
        actions={(achievement) => (
          <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(achievement)}>
            <Trash2 size={14} />
          </Button>
        )}
      />

      <FormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title="Grant achievement"
        onSubmit={handleSubmit}
        isSubmitting={createMutation.isPending}
        submitLabel="Grant"
      >
        <div className="space-y-1.5">
          <Label>User</Label>
          <Select value={form.user_id} onValueChange={(value) => setForm({ ...form, user_id: value })}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a user" />
            </SelectTrigger>
            <SelectContent>
              {users.map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  {user.username}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Type</Label>
          <Select value={form.achievement_type} onValueChange={(value) => setForm({ ...form, achievement_type: value })}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ACHIEVEMENT_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Title</Label>
          <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
        </div>
        <div className="space-y-1.5">
          <Label>Description</Label>
          <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required />
        </div>
      </FormDialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Revoke achievement"
        description={`Are you sure you want to revoke "${deleteTarget?.title}"?`}
        onConfirm={handleDelete}
        confirmLabel="Revoke"
      />
    </div>
  );
}
