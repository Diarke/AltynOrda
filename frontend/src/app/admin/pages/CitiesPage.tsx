import { useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { DataTable, type DataTableColumn } from "../components/DataTable";
import { FormDialog } from "../components/FormDialog";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { ImageUploader } from "../components/ImageUploader";
import {
  useAdminCities,
  useCreateAdminCity,
  useUpdateAdminCity,
  useDeleteAdminCity,
  type AdminCityInput,
} from "../lib/adminApi";
import type { ApiCity } from "../../lib/api";

const EMPTY_FORM: AdminCityInput = {
  name: "",
  slug: "",
  description: "",
  historical_period: "",
  latitude: 0,
  longitude: 0,
  image_url: null,
  population_estimate: null,
  significance: null,
};

export function CitiesPage() {
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ApiCity | null>(null);
  const [form, setForm] = useState<AdminCityInput>(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState<ApiCity | null>(null);

  const { data, isLoading } = useAdminCities(page, 20);
  const createMutation = useCreateAdminCity();
  const updateMutation = useUpdateAdminCity();
  const deleteMutation = useDeleteAdminCity();

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (city: ApiCity) => {
    setEditing(city);
    setForm({
      name: city.name,
      slug: city.slug,
      description: city.description,
      historical_period: city.historical_period,
      latitude: city.latitude,
      longitude: city.longitude,
      image_url: city.image_url ?? null,
      population_estimate: city.population_estimate ?? null,
      significance: city.significance ?? null,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    try {
      if (editing) {
        await updateMutation.mutateAsync({ id: editing.id, data: form });
        toast.success("City updated");
      } else {
        await createMutation.mutateAsync(form);
        toast.success("City created");
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
      toast.success("City deleted");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setDeleteTarget(null);
    }
  };

  const columns: DataTableColumn<ApiCity>[] = [
    { key: "name", header: "Name", render: (c) => <span className="font-medium">{c.name}</span> },
    { key: "slug", header: "Slug", render: (c) => c.slug },
    { key: "period", header: "Period", render: (c) => c.historical_period },
    {
      key: "coords",
      header: "Coordinates",
      render: (c) => `${c.latitude.toFixed(2)}, ${c.longitude.toFixed(2)}`,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="orda-cinzel text-2xl font-bold">Cities</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage the historical cities on the map.</p>
        </div>
        <Button onClick={openCreate}>
          <Plus size={16} /> New city
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
        actions={(city) => (
          <div className="flex items-center justify-end gap-1">
            <Button variant="ghost" size="icon" onClick={() => openEdit(city)}>
              <Pencil size={14} />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(city)}>
              <Trash2 size={14} />
            </Button>
          </div>
        )}
      />

      <FormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={editing ? "Edit city" : "New city"}
        onSubmit={handleSubmit}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
      >
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div className="space-y-1.5">
            <Label>Slug</Label>
            <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} required />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Description</Label>
          <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label>Historical period</Label>
            <Input
              value={form.historical_period}
              onChange={(e) => setForm({ ...form, historical_period: e.target.value })}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label>Latitude</Label>
            <Input
              type="number"
              step="any"
              value={form.latitude}
              onChange={(e) => setForm({ ...form, latitude: Number(e.target.value) })}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label>Longitude</Label>
            <Input
              type="number"
              step="any"
              value={form.longitude}
              onChange={(e) => setForm({ ...form, longitude: Number(e.target.value) })}
              required
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Population estimate</Label>
            <Input
              value={form.population_estimate ?? ""}
              onChange={(e) => setForm({ ...form, population_estimate: e.target.value || null })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Significance</Label>
            <Input
              value={form.significance ?? ""}
              onChange={(e) => setForm({ ...form, significance: e.target.value || null })}
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Image</Label>
          <ImageUploader value={form.image_url ?? null} onChange={(url) => setForm({ ...form, image_url: url })} />
        </div>
      </FormDialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete city"
        description={`Are you sure you want to delete "${deleteTarget?.name}"? This cannot be undone.`}
        onConfirm={handleDelete}
      />
    </div>
  );
}
