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
import { ImageUploader } from "../components/ImageUploader";
import { LanguageTabs } from "../components/LanguageTabs";
import { GalleryImagePreview } from "../components/EntityPreviews";
import { displayField } from "../lib/localizedDisplay";
import {
  useAdminGalleryImages,
  useCreateAdminGalleryImage,
  useUpdateAdminGalleryImage,
  useDeleteAdminGalleryImage,
  useAdminCities,
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
  city_id: null,
};

export function GalleryPage() {
  const [page, setPage] = useState(1);
  const [language, setLanguage] = useState("kk");
  const [search, setSearch] = useState("");
  const [cityFilter, setCityFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AdminGalleryImage | null>(null);
  const [form, setForm] = useState<AdminGalleryImageInput>(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState<AdminGalleryImage | null>(null);
  const [previewTarget, setPreviewTarget] = useState<AdminGalleryImage | null>(null);

  const { data, isLoading } = useAdminGalleryImages({
    page,
    pageSize: 20,
    language,
    q: search || undefined,
    cityId: cityFilter === "all" ? undefined : cityFilter,
  });
  const { data: citiesData } = useAdminCities(1, 100);
  const cities = citiesData?.data ?? [];
  const createMutation = useCreateAdminGalleryImage();
  const updateMutation = useUpdateAdminGalleryImage();
  const deleteMutation = useDeleteAdminGalleryImage();

  const cityName = (id: string | null) => {
    const city = cities.find((c) => c.id === id);
    return city ? displayField(city, "name") : "—";
  };

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
      city_id: image.city_id,
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
    { key: "city", header: "City", render: (img) => cityName(img.city_id) },
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

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by title or alt text…"
            className="pl-9"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <Select value={cityFilter} onValueChange={(v) => { setCityFilter(v); setPage(1); }}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All (sitewide + cities)</SelectItem>
            {cities.map((city) => (
              <SelectItem key={city.id} value={city.id}>{displayField(city, "name")}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

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
            <Button variant="ghost" size="icon" onClick={() => setPreviewTarget(image)}>
              <Eye size={14} />
            </Button>
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
        className="sm:max-w-3xl max-h-[85vh] overflow-y-auto"
      >
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Language</Label>
              <LanguageTabs value={form.language} onChange={(value) => setForm({ ...form, language: value as AdminGalleryImageInput["language"] })} />
            </div>
            <div className="space-y-1.5">
              <Label>City (optional)</Label>
              <Select
                value={form.city_id ?? "none"}
                onValueChange={(value) => setForm({ ...form, city_id: value === "none" ? null : value })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Sitewide (no city)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sitewide (no city)</SelectItem>
                  {cities.map((city) => (
                    <SelectItem key={city.id} value={city.id}>
                      {displayField(city, "name")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Image</Label>
              <ImageUploader value={form.image_url || null} onChange={(url) => setForm({ ...form, image_url: url ?? "" })} aspect={4 / 3} />
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
          </div>
          <div className="space-y-1.5 lg:sticky lg:top-0">
            <Label className="text-muted-foreground">Live preview</Label>
            <GalleryImagePreview image={{ title: form.title, alt_text: form.alt_text, image_url: form.image_url || "" }} />
          </div>
        </div>
      </FormDialog>

      <Dialog open={!!previewTarget} onOpenChange={(open) => !open && setPreviewTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="orda-cinzel">Preview</DialogTitle>
          </DialogHeader>
          {previewTarget && <GalleryImagePreview image={previewTarget} />}
        </DialogContent>
      </Dialog>

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
