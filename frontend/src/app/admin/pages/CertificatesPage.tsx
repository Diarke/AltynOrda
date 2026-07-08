import { useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Eye, Search, Award } from "lucide-react";
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
  useAdminCertificates,
  useCreateAdminCertificate,
  useUpdateAdminCertificate,
  useDeleteAdminCertificate,
  useAdminUsers,
} from "../lib/adminApi";
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
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ApiCertificate | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState<ApiCertificate | null>(null);
  const [previewTarget, setPreviewTarget] = useState<ApiCertificate | null>(null);

  const { data, isLoading } = useAdminCertificates(page, 20, search || undefined);
  const { data: usersData } = useAdminUsers({ page: 1, pageSize: 100 });
  const createMutation = useCreateAdminCertificate();
  const updateMutation = useUpdateAdminCertificate();
  const deleteMutation = useDeleteAdminCertificate();

  const users = usersData?.data ?? [];
  const username = (id: string) => users.find((u) => u.id === id)?.username ?? id;

  const openCreate = () => {
    setEditing(null);
    setForm({
      ...EMPTY_FORM,
      user_id: users[0]?.id ?? "",
      certificate_code: `CERT-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
    });
    setDialogOpen(true);
  };

  const openEdit = (certificate: ApiCertificate) => {
    setEditing(certificate);
    setForm({
      user_id: certificate.user_id,
      title: certificate.title,
      description: certificate.description,
      completion_percent: certificate.completion_percent,
      certificate_code: certificate.certificate_code,
      issued_at: certificate.issued_at,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    try {
      if (editing) {
        await updateMutation.mutateAsync({
          id: editing.id,
          data: { title: form.title, description: form.description, completion_percent: form.completion_percent },
        });
        toast.success("Certificate updated");
      } else {
        await createMutation.mutateAsync(form);
        toast.success("Certificate issued");
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

      <div className="relative max-w-sm">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by title or code…"
          className="pl-9"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
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
          <div className="flex items-center justify-end gap-1">
            <Button variant="ghost" size="icon" onClick={() => setPreviewTarget(certificate)}>
              <Eye size={14} />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => openEdit(certificate)}>
              <Pencil size={14} />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(certificate)}>
              <Trash2 size={14} />
            </Button>
          </div>
        )}
      />

      <FormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={editing ? "Edit certificate" : "Issue certificate"}
        onSubmit={handleSubmit}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
        submitLabel={editing ? "Save" : "Issue"}
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
            <Input value={form.certificate_code} onChange={(e) => setForm({ ...form, certificate_code: e.target.value })} required disabled={!!editing} />
          </div>
        </div>
      </FormDialog>

      <Dialog open={!!previewTarget} onOpenChange={(open) => !open && setPreviewTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="orda-cinzel">Preview</DialogTitle>
          </DialogHeader>
          {previewTarget && (
            <div className="rounded-2xl p-6 text-center border" style={{ background: "linear-gradient(135deg, #E2D3AC 0%, #DCCBA0 50%, #E2D3AC 100%)", borderColor: "rgba(184,137,43,0.25)" }}>
              <Award size={28} color="#B8892B" className="mx-auto mb-3" />
              <h3 className="orda-cinzel text-lg font-bold mb-1" style={{ color: "#B8892B" }}>{previewTarget.title}</h3>
              <p className="text-xs mb-3" style={{ color: "#5C4E38" }}>{previewTarget.description}</p>
              <p className="text-sm" style={{ color: "#2E2013" }}>Awarded to {username(previewTarget.user_id)}</p>
              <p className="text-[11px] mt-2" style={{ color: "#5C4E38" }}>{previewTarget.certificate_code} · {previewTarget.completion_percent}% complete</p>
            </div>
          )}
        </DialogContent>
      </Dialog>

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
