import { useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Eye, Search } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { DataTable, type DataTableColumn } from "../components/DataTable";
import { FormDialog } from "../components/FormDialog";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { ImageUploader } from "../components/ImageUploader";
import { CityPreview } from "../components/EntityPreviews";
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
  historical_facts: null,
  trade_info: null,
};

function factsToText(facts: string[] | null | undefined): string {
  return (facts ?? []).join("\n");
}

function textToFacts(text: string): string[] | null {
  const lines = text.split("\n").map((line) => line.trim()).filter(Boolean);
  return lines.length > 0 ? lines : null;
}

export function CitiesPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ApiCity | null>(null);
  const [form, setForm] = useState<AdminCityInput>(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState<ApiCity | null>(null);
  const [previewTarget, setPreviewTarget] = useState<ApiCity | null>(null);

  const { data, isLoading } = useAdminCities(page, 20, search || undefined);
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
      historical_facts: city.historical_facts ?? null,
      trade_info: city.trade_info ?? null,
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

      <div className="relative max-w-sm">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by name, slug, or period…"
          className="pl-9"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
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
        actions={(city) => (
          <div className="flex items-center justify-end gap-1">
            <Button variant="ghost" size="icon" onClick={() => setPreviewTarget(city)}>
              <Eye size={14} />
            </Button>
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
        className="sm:max-w-4xl max-h-[85vh] overflow-y-auto"
      >
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
          <div className="space-y-4">
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
              <Label>Historical facts (one per line)</Label>
              <Textarea
                rows={5}
                value={factsToText(form.historical_facts)}
                onChange={(e) => setForm({ ...form, historical_facts: textToFacts(e.target.value) })}
                placeholder={"Founded in...\nKnown for...\nDeclined after..."}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Trade information</Label>
              <Textarea
                rows={3}
                value={form.trade_info ?? ""}
                onChange={(e) => setForm({ ...form, trade_info: e.target.value || null })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Image</Label>
              <ImageUploader value={form.image_url ?? null} onChange={(url) => setForm({ ...form, image_url: url })} aspect={16 / 9} />
            </div>
          </div>

          <div className="space-y-1.5 lg:sticky lg:top-0">
            <Label className="text-muted-foreground">Live preview</Label>
            <CityPreview city={form} />
          </div>
        </div>
      </FormDialog>

      <Dialog open={!!previewTarget} onOpenChange={(open) => !open && setPreviewTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="orda-cinzel">Preview</DialogTitle>
          </DialogHeader>
          {previewTarget && <CityPreview city={previewTarget} />}
        </DialogContent>
      </Dialog>

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
