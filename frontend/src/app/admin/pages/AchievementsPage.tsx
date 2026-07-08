import { useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Eye, Search } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { DataTable, type DataTableColumn } from "../components/DataTable";
import { FormDialog } from "../components/FormDialog";
import { ConfirmDialog } from "../components/ConfirmDialog";
import {
  useAdminAchievements,
  useCreateAdminAchievement,
  useUpdateAdminAchievement,
  useDeleteAdminAchievement,
  useAdminUsers,
} from "../lib/adminApi";
import type { ApiAchievement } from "../../lib/api";

const EMPTY_FORM = {
  user_id: "",
  achievement_type: "",
  title: "",
  description: "",
  icon_url: null as string | null,
};

export function AchievementsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ApiAchievement | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState<ApiAchievement | null>(null);
  const [previewTarget, setPreviewTarget] = useState<ApiAchievement | null>(null);

  const { data, isLoading } = useAdminAchievements(page, 20, search || undefined);
  const { data: usersData } = useAdminUsers({ page: 1, pageSize: 100 });
  const createMutation = useCreateAdminAchievement();
  const updateMutation = useUpdateAdminAchievement();
  const deleteMutation = useDeleteAdminAchievement();

  const users = usersData?.data ?? [];
  const username = (id: string) => users.find((u) => u.id === id)?.username ?? id;

  const openCreate = () => {
    setEditing(null);
    setForm({ ...EMPTY_FORM, user_id: users[0]?.id ?? "" });
    setDialogOpen(true);
  };

  const openEdit = (achievement: ApiAchievement) => {
    setEditing(achievement);
    setForm({
      user_id: achievement.user_id,
      achievement_type: achievement.achievement_type,
      title: achievement.title,
      description: achievement.description,
      icon_url: achievement.icon_url,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    try {
      if (editing) {
        await updateMutation.mutateAsync({
          id: editing.id,
          data: { title: form.title, description: form.description, icon_url: form.icon_url },
        });
        toast.success("Achievement updated");
      } else {
        await createMutation.mutateAsync(form);
        toast.success("Achievement granted");
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

      <div className="relative max-w-sm">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by title or type…"
          className="pl-9"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
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
          <div className="flex items-center justify-end gap-1">
            <Button variant="ghost" size="icon" onClick={() => setPreviewTarget(achievement)}>
              <Eye size={14} />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => openEdit(achievement)}>
              <Pencil size={14} />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(achievement)}>
              <Trash2 size={14} />
            </Button>
          </div>
        )}
      />

      <FormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={editing ? "Edit achievement" : "Grant achievement"}
        onSubmit={handleSubmit}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
        submitLabel={editing ? "Save" : "Grant"}
      >
        <div className="space-y-1.5">
          <Label>User</Label>
          <Select value={form.user_id} onValueChange={(value) => setForm({ ...form, user_id: value })} disabled={!!editing}>
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
          <Label>Type slug</Label>
          <Input
            value={form.achievement_type}
            onChange={(e) => setForm({ ...form, achievement_type: e.target.value })}
            placeholder="e.g. explorer_bronze"
            required
            disabled={!!editing}
          />
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

      <Dialog open={!!previewTarget} onOpenChange={(open) => !open && setPreviewTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="orda-cinzel">Preview</DialogTitle>
          </DialogHeader>
          {previewTarget && (
            <div className="flex items-center gap-3 p-4 rounded-xl" style={{ background: "rgba(184,137,43,0.05)", border: "1px solid rgba(184,137,43,0.15)" }}>
              <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "rgba(184,137,43,0.15)" }}>
                {previewTarget.icon_url ? <img src={previewTarget.icon_url} alt="" className="w-6 h-6" /> : "🏆"}
              </div>
              <div>
                <div className="text-sm orda-cinzel" style={{ color: "#2E2013" }}>{previewTarget.title}</div>
                <div className="text-xs" style={{ color: "#5C4E38" }}>{previewTarget.description}</div>
                <div className="text-[11px] mt-1" style={{ color: "#B8892B" }}>+{previewTarget.reward_xp} XP / +{previewTarget.reward_coins} coins</div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

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
