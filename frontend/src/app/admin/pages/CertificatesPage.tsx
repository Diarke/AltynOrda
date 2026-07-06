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
import { useAdminCertificates, useCreateAdminCertificate, useDeleteAdminCertificate, useAdminUsers } from "../lib/adminApi";
import type { ApiCertificate } from "../../lib/api";

const EMPTY_FORM = {
  user_id: "",
  title: "ORDA Historical Journey Certificate",
  description: "",
  completion_percent: 100,
  certificate_code: "",
  issued_at: new Date().toISOString().slice(0, 10),
};

export function CertificatesPage() {
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState<ApiCertificate | null>(null);

  const { data, isLoading } = useAdminCertificates(page, 20);
  const { data: usersData } = useAdminUsers({ page: 1, pageSize: 100 });
  const createMutation = useCreateAdminCertificate();
  const deleteMutation = useDeleteAdminCertificate();

  const users = usersData?.data ?? [];
  const username = (id: string) => users.find((u) => u.id === id)?.username ?? id;

  const openCreate = () => {
    setForm({
      ...EMPTY_FORM,
      user_id: users[0]?.id ?? "",
      certificate_code: `CERT-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    try {
      await createMutation.mutateAsync(form);
      toast.success("Certificate issued");
      setDialogOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync(deleteTarget.id);
      toast.success("Certificate deleted");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setDeleteTarget(null);
    }
  };

  const columns: DataTableColumn<ApiCertificate>[] = [
    { key: "title", header: "Title", render: (c) => <span className="font-medium">{c.title}</span> },
    { key: "user", header: "User", render: (c) => username(c.user_id) },
    { key: "code", header: "Code", render: (c) => c.certificate_code },
    { key: "completion", header: "Completion", render: (c) => `${c.completion_percent}%` },
    { key: "issued", header: "Issued", render: (c) => c.issued_at },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="orda-cinzel text-2xl font-bold">Certificates</h1>
          <p className="text-sm text-muted-foreground mt-1">View issued certificates and manually issue new ones.</p>
        </div>
        <Button onClick={openCreate} disabled={users.length === 0}>
          <Plus size={16} /> Issue certificate
        </Button>
      </div>

      <DataTable
        columns={columns}
        rows={data?.data ?? []}
        rowKey={(c) => c.id}
        isLoading={isLoading}
        page={page}
        pageSize={20}
        total={data?.meta.total ?? 0}
        onPageChange={setPage}
        actions={(certificate) => (
          <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(certificate)}>
            <Trash2 size={14} />
          </Button>
        )}
      />

      <FormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title="Issue certificate"
        onSubmit={handleSubmit}
        isSubmitting={createMutation.isPending}
        submitLabel="Issue"
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
          <Label>Title</Label>
          <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
        </div>
        <div className="space-y-1.5">
          <Label>Description</Label>
          <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Completion %</Label>
            <Input
              type="number"
              min={0}
              max={100}
              value={form.completion_percent}
              onChange={(e) => setForm({ ...form, completion_percent: Number(e.target.value) })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Certificate code</Label>
            <Input value={form.certificate_code} onChange={(e) => setForm({ ...form, certificate_code: e.target.value })} required />
          </div>
        </div>
      </FormDialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete certificate"
        description={`Are you sure you want to delete "${deleteTarget?.title}"?`}
        onConfirm={handleDelete}
      />
    </div>
  );
}
