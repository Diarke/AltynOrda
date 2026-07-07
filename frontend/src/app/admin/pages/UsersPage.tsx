import { useState } from "react";
import { toast } from "sonner";
import { Pencil, Trash2, Search, Eye } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Badge } from "../../components/ui/badge";
import { Switch } from "../../components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { DataTable, type DataTableColumn } from "../components/DataTable";
import { FormDialog } from "../components/FormDialog";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { useAdminUsers, useUpdateAdminUser, useDeleteAdminUser, type AdminUser } from "../lib/adminApi";

const ROLES = ["guest", "user", "admin"];

interface EditForm {
  role: string;
  is_active: boolean;
  xp: number;
  coins: number;
  level: number;
}

export function UsersPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [editing, setEditing] = useState<AdminUser | null>(null);
  const [form, setForm] = useState<EditForm | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);
  const [previewTarget, setPreviewTarget] = useState<AdminUser | null>(null);

  const { data, isLoading } = useAdminUsers({
    page,
    pageSize: 20,
    q: search || undefined,
    role: roleFilter === "all" ? undefined : roleFilter,
  });
  const updateMutation = useUpdateAdminUser();
  const deleteMutation = useDeleteAdminUser();

  const openEdit = (user: AdminUser) => {
    setEditing(user);
    setForm({ role: user.role, is_active: user.is_active, xp: user.xp, coins: user.coins, level: user.level });
  };

  const handleSubmit = async () => {
    if (!editing || !form) return;
    try {
      await updateMutation.mutateAsync({ id: editing.id, data: form });
      toast.success("User updated");
      setEditing(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync(deleteTarget.id);
      toast.success("User deleted");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setDeleteTarget(null);
    }
  };

  const columns: DataTableColumn<AdminUser>[] = [
    {
      key: "user",
      header: "User",
      render: (u) => (
        <div>
          <div className="font-medium">{u.username}</div>
          <div className="text-xs text-muted-foreground">{u.email}</div>
        </div>
      ),
    },
    { key: "role", header: "Role", render: (u) => <Badge variant={u.role === "admin" ? "default" : "outline"}>{u.role}</Badge> },
    { key: "level", header: "Level", render: (u) => u.level },
    { key: "xp", header: "XP", render: (u) => u.xp },
    { key: "coins", header: "Coins", render: (u) => u.coins },
    { key: "active", header: "Status", render: (u) => (u.is_active ? <Badge variant="secondary">Active</Badge> : <Badge variant="destructive">Disabled</Badge>) },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="orda-cinzel text-2xl font-bold">Users</h1>
        <p className="text-sm text-muted-foreground mt-1">Search, moderate, and adjust player accounts.</p>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by username or email…"
            className="pl-9"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <Select
          value={roleFilter}
          onValueChange={(value) => {
            setRoleFilter(value);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All roles</SelectItem>
            {ROLES.map((role) => (
              <SelectItem key={role} value={role}>
                {role}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={columns}
        rows={data?.data ?? []}
        rowKey={(u) => u.id}
        isLoading={isLoading}
        page={page}
        pageSize={20}
        total={data?.meta.total ?? 0}
        onPageChange={setPage}
        actions={(user) => (
          <div className="flex items-center justify-end gap-1">
            <Button variant="ghost" size="icon" onClick={() => setPreviewTarget(user)}>
              <Eye size={14} />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => openEdit(user)}>
              <Pencil size={14} />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(user)}>
              <Trash2 size={14} />
            </Button>
          </div>
        )}
      />

      {editing && form && (
        <FormDialog
          open={!!editing}
          onOpenChange={(open) => !open && setEditing(null)}
          title={`Edit ${editing.username}`}
          onSubmit={handleSubmit}
          isSubmitting={updateMutation.isPending}
        >
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select value={form.role} onValueChange={(value) => setForm({ ...form, role: value })}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((role) => (
                    <SelectItem key={role} value={role}>
                      {role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2 pt-6">
              <Switch checked={form.is_active} onCheckedChange={(checked) => setForm({ ...form, is_active: checked })} />
              <Label>Active</Label>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>Level</Label>
              <Input type="number" value={form.level} onChange={(e) => setForm({ ...form, level: Number(e.target.value) })} />
            </div>
            <div className="space-y-1.5">
              <Label>XP</Label>
              <Input type="number" value={form.xp} onChange={(e) => setForm({ ...form, xp: Number(e.target.value) })} />
            </div>
            <div className="space-y-1.5">
              <Label>Coins</Label>
              <Input type="number" value={form.coins} onChange={(e) => setForm({ ...form, coins: Number(e.target.value) })} />
            </div>
          </div>
        </FormDialog>
      )}

      <Dialog open={!!previewTarget} onOpenChange={(open) => !open && setPreviewTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="orda-cinzel">Preview</DialogTitle>
          </DialogHeader>
          {previewTarget && (
            <div className="rounded-xl p-4 space-y-2" style={{ background: "rgba(255,255,255,0.03)" }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold" style={{ background: "linear-gradient(135deg,#D4AF37,#C9962C)", color: "#0F1115" }}>
                  {previewTarget.username[0]?.toUpperCase()}
                </div>
                <div>
                  <div className="font-medium">{previewTarget.username}</div>
                  <div className="text-xs text-muted-foreground">{previewTarget.email}</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs pt-2">
                <div>Role: <Badge variant={previewTarget.role === "admin" ? "default" : "outline"}>{previewTarget.role}</Badge></div>
                <div>Status: {previewTarget.is_active ? <Badge variant="secondary">Active</Badge> : <Badge variant="destructive">Disabled</Badge>}</div>
                <div>Level: {previewTarget.level}</div>
                <div>XP: {previewTarget.xp}</div>
                <div>Coins: {previewTarget.coins}</div>
                <div>Streak: {previewTarget.streak_days}d</div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete user"
        description={`Are you sure you want to delete "${deleteTarget?.username}"? This cannot be undone.`}
        onConfirm={handleDelete}
      />
    </div>
  );
}
