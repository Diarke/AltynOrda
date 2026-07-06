import { useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { Switch } from "../../components/ui/switch";
import { DataTable, type DataTableColumn } from "../components/DataTable";
import { FormDialog } from "../components/FormDialog";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { ImageUploader } from "../components/ImageUploader";
import { LanguageTabs } from "../components/LanguageTabs";
import {
  useAdminGalleryImages,
  useCreateAdminGalleryImage,
  useUpdateAdminGalleryImage,
  useDeleteAdminGalleryImage,
  type AdminGalleryImage,
  type AdminGalleryImageInput,
} from "../lib/adminApi";

const EMPTY_FORM: AdminGalleryImageInput = {
  title: "",
  description: "",
  language: "kk",
  group_key: null,
  image_url: "",
  alt_text: "",
  sort_order: 0,
  is_active: true,
};

export function GalleryPage() {
  const [page, setPage] = useState(1);
  const [language, setLanguage] = useState("kk");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AdminGalleryImage | null>(null);
  const [form, setForm] = useState<AdminGalleryImageInput>(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState<AdminGalleryImage | null>(null);

  const { data, isLoading } = useAdminGalleryImages({ page, pageSize: 20, language });
  const createMutation = useCreateAdminGalleryImage();
  const updateMutation = useUpdateAdminGalleryImage();
  const deleteMutation = useDeleteAdminGalleryImage();

  const openCreate = () => {
    setEditing(null);
    setForm({ ...EMPTY_FORM, language });
    setDialogOpen(true);
  };

  const openEdit = (image: AdminGalleryImage) => {
    setEditing(image);
    setForm({
      title: image.title,
      description: image.description,
      language: image.language,
      group_key: image.group_key,
      image_url: image.image_url,
      alt_text: image.alt_text,
      sort_order: image.sort_order,
      is_active: image.is_active,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.image_url) {
      toast.error("Please upload an image first");
      return;
    }
    try {
      if (editing) {
        await updateMutation.mutateAsync({ id: editing.id, data: form });
        toast.success("Gallery image updated");
      } else {
        await createMutation.mutateAsync(form);
        toast.success("Gallery image created");
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
      toast.success("Gallery image deleted");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setDeleteTarget(null);
    }
  };

  const columns: DataTableColumn<AdminGalleryImage>[] = [
    {
      key: "preview",
      header: "Preview",
      render: (img) => (
        <img src={img.image_url} alt={img.alt_text ?? ""} className="w-14 h-14 object-cover rounded-md" />
      ),
    },
    { key: "title", header: "Title", render: (img) => img.title || "—" },
    { key: "order", header: "Order", render: (img) => img.sort_order },
    { key: "active", header: "Active", render: (img) => (img.is_active ? "Yes" : "No") },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="orda-cinzel text-2xl font-bold">Gallery</h1>
          <p className="text-sm text-muted-foreground mt-1">Upload and manage gallery images per language.</p>
        </div>
        <Button onClick={openCreate}>
          <Plus size={16} /> New image
        </Button>
      </div>

      <LanguageTabs
        value={language}
        onChange={(value) => {
          setLanguage(value);
          setPage(1);
        }}
      />

      <DataTable
        columns={columns}
        rows={data?.data ?? []}
        rowKey={(img) => img.id}
        isLoading={isLoading}
        page={page}
        pageSize={20}
        total={data?.meta.total ?? 0}
        onPageChange={setPage}
        actions={(image) => (
          <div className="flex items-center justify-end gap-1">
            <Button variant="ghost" size="icon" onClick={() => openEdit(image)}>
              <Pencil size={14} />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(image)}>
              <Trash2 size={14} />
            </Button>
          </div>
        )}
      />

      <FormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={editing ? "Edit gallery image" : "New gallery image"}
        onSubmit={handleSubmit}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
      >
        <div className="space-y-1.5">
          <Label>Language</Label>
          <LanguageTabs value={form.language} onChange={(value) => setForm({ ...form, language: value as AdminGalleryImageInput["language"] })} />
        </div>
        <div className="space-y-1.5">
          <Label>Image</Label>
          <ImageUploader value={form.image_url || null} onChange={(url) => setForm({ ...form, image_url: url ?? "" })} />
        </div>
        <div className="space-y-1.5">
          <Label>Title</Label>
          <Input value={form.title ?? ""} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label>Description</Label>
          <Textarea value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label>Alt text</Label>
          <Input value={form.alt_text ?? ""} onChange={(e) => setForm({ ...form, alt_text: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-3 items-end">
          <div className="space-y-1.5">
            <Label>Sort order</Label>
            <Input
              type="number"
              value={form.sort_order}
              onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })}
            />
          </div>
          <div className="flex items-center gap-2 pb-2">
            <Switch checked={form.is_active} onCheckedChange={(checked) => setForm({ ...form, is_active: checked })} />
            <Label>Active</Label>
          </div>
        </div>
      </FormDialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete gallery image"
        description="Are you sure you want to delete this image? The uploaded file will also be removed from storage."
        onConfirm={handleDelete}
      />
    </div>
  );
}
