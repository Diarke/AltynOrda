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
import { ImageUploader } from "../components/ImageUploader";
import { ArtifactPreview } from "../components/EntityPreviews";
import {
  useAdminArtifacts,
  useCreateAdminArtifact,
  useUpdateAdminArtifact,
  useDeleteAdminArtifact,
  useAdminCities,
  type AdminArtifactInput,
} from "../lib/adminApi";
import type { ApiArtifact } from "../../lib/api";

const RARITIES = ["common", "rare", "legendary"];

const EMPTY_FORM: AdminArtifactInput = {
  city_id: "",
  name: "",
  description: "",
  era: "",
  rarity: "common",
  image_url: null,
  historical_context: null,
};

export function ArtifactsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [cityFilter, setCityFilter] = useState("all");
  const [rarityFilter, setRarityFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ApiArtifact | null>(null);
  const [form, setForm] = useState<AdminArtifactInput>(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState<ApiArtifact | null>(null);
  const [previewTarget, setPreviewTarget] = useState<ApiArtifact | null>(null);

  const { data, isLoading } = useAdminArtifacts(page, 20, {
    q: search || undefined,
    cityId: cityFilter === "all" ? undefined : cityFilter,
    rarity: rarityFilter === "all" ? undefined : rarityFilter,
  });
  const { data: citiesData } = useAdminCities(1, 100);
  const createMutation = useCreateAdminArtifact();
  const updateMutation = useUpdateAdminArtifact();
  const deleteMutation = useDeleteAdminArtifact();

  const cities = citiesData?.data ?? [];
  const cityName = (id: string) => cities.find((c) => c.id === id)?.name ?? id;

  const openCreate = () => {
    setEditing(null);
    setForm({ ...EMPTY_FORM, city_id: cities[0]?.id ?? "" });
    setDialogOpen(true);
  };

  const openEdit = (artifact: ApiArtifact) => {
    setEditing(artifact);
    setForm({
      city_id: artifact.city_id,
      name: artifact.name,
      description: artifact.description,
      era: artifact.era,
      rarity: artifact.rarity,
      image_url: artifact.image_url ?? null,
      historical_context: artifact.historical_context ?? null,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    try {
      if (editing) {
        await updateMutation.mutateAsync({ id: editing.id, data: form });
        toast.success("Artifact updated");
      } else {
        await createMutation.mutateAsync(form);
        toast.success("Artifact created");
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
      toast.success("Artifact deleted");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setDeleteTarget(null);
    }
  };

  const columns: DataTableColumn<ApiArtifact>[] = [
    { key: "name", header: "Name", render: (a) => <span className="font-medium">{a.name}</span> },
    { key: "city", header: "City", render: (a) => cityName(a.city_id) },
    { key: "era", header: "Era", render: (a) => a.era },
    { key: "rarity", header: "Rarity", render: (a) => a.rarity },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="orda-cinzel text-2xl font-bold">Artifacts</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage collectible historical artifacts.</p>
        </div>
        <Button onClick={openCreate} disabled={cities.length === 0}>
          <Plus size={16} /> New artifact
        </Button>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name or era…"
            className="pl-9"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <Select value={cityFilter} onValueChange={(v) => { setCityFilter(v); setPage(1); }}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All cities</SelectItem>
            {cities.map((city) => (
              <SelectItem key={city.id} value={city.id}>{city.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={rarityFilter} onValueChange={(v) => { setRarityFilter(v); setPage(1); }}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All rarities</SelectItem>
            {RARITIES.map((rarity) => (
              <SelectItem key={rarity} value={rarity}>{rarity}</SelectItem>
            ))}
          </SelectContent>
        </Select>
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
        actions={(artifact) => (
          <div className="flex items-center justify-end gap-1">
            <Button variant="ghost" size="icon" onClick={() => setPreviewTarget(artifact)}>
              <Eye size={14} />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => openEdit(artifact)}>
              <Pencil size={14} />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(artifact)}>
              <Trash2 size={14} />
            </Button>
          </div>
        )}
      />

      <FormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={editing ? "Edit artifact" : "New artifact"}
        onSubmit={handleSubmit}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
        className="sm:max-w-3xl max-h-[85vh] overflow-y-auto"
      >
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-6">
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>City</Label>
              <Select value={form.city_id} onValueChange={(value) => setForm({ ...form, city_id: value })}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a city" />
                </SelectTrigger>
                <SelectContent>
                  {cities.map((city) => (
                    <SelectItem key={city.id} value={city.id}>
                      {city.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Era</Label>
                <Input value={form.era} onChange={(e) => setForm({ ...form, era: e.target.value })} required />
              </div>
              <div className="space-y-1.5">
                <Label>Rarity</Label>
                <Select value={form.rarity} onValueChange={(value) => setForm({ ...form, rarity: value })}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {RARITIES.map((rarity) => (
                      <SelectItem key={rarity} value={rarity}>
                        {rarity}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Historical context</Label>
              <Textarea
                value={form.historical_context ?? ""}
                onChange={(e) => setForm({ ...form, historical_context: e.target.value || null })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Image</Label>
              <ImageUploader value={form.image_url ?? null} onChange={(url) => setForm({ ...form, image_url: url })} aspect={1} />
            </div>
          </div>
          <div className="space-y-1.5 lg:sticky lg:top-0">
            <Label className="text-muted-foreground">Live preview</Label>
            <ArtifactPreview artifact={form} />
          </div>
        </div>
      </FormDialog>

      <Dialog open={!!previewTarget} onOpenChange={(open) => !open && setPreviewTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="orda-cinzel">Preview</DialogTitle>
          </DialogHeader>
          {previewTarget && <ArtifactPreview artifact={previewTarget} />}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete artifact"
        description={`Are you sure you want to delete "${deleteTarget?.name}"? This cannot be undone.`}
        onConfirm={handleDelete}
      />
    </div>
  );
}
