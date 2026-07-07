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
import { LanguageTabs } from "../components/LanguageTabs";
import { CityPreview } from "../components/EntityPreviews";
import {
  useAdminCities,
  useCreateAdminCity,
  useUpdateAdminCity,
  useDeleteAdminCity,
  type AdminCity,
  type AdminCityInput,
} from "../lib/adminApi";
import { displayField } from "../lib/localizedDisplay";

type Lang = "kk" | "ru" | "en";

const EMPTY_FORM: AdminCityInput = {
  slug: "",
  latitude: 0,
  longitude: 0,
  image_url: null,
  name_kk: "",
  name_ru: null,
  name_en: null,
  description_kk: "",
  description_ru: null,
  description_en: null,
  historical_period_kk: "",
  historical_period_ru: null,
  historical_period_en: null,
  population_estimate_kk: null,
  population_estimate_ru: null,
  population_estimate_en: null,
  significance_kk: null,
  significance_ru: null,
  significance_en: null,
  historical_facts_kk: null,
  historical_facts_ru: null,
  historical_facts_en: null,
  trade_info_kk: null,
  trade_info_ru: null,
  trade_info_en: null,
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
  const [editing, setEditing] = useState<AdminCity | null>(null);
  const [form, setForm] = useState<AdminCityInput>(EMPTY_FORM);
  const [lang, setLang] = useState<Lang>("kk");
  const [deleteTarget, setDeleteTarget] = useState<AdminCity | null>(null);
  const [previewTarget, setPreviewTarget] = useState<AdminCity | null>(null);

  const { data, isLoading } = useAdminCities(page, 20, search || undefined);
  const createMutation = useCreateAdminCity();
  const updateMutation = useUpdateAdminCity();
  const deleteMutation = useDeleteAdminCity();

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setLang("kk");
    setDialogOpen(true);
  };

  const openEdit = (city: AdminCity) => {
    setEditing(city);
    setForm({
      slug: city.slug,
      latitude: city.latitude,
      longitude: city.longitude,
      image_url: city.image_url,
      name_kk: city.name_kk,
      name_ru: city.name_ru,
      name_en: city.name_en,
      description_kk: city.description_kk,
      description_ru: city.description_ru,
      description_en: city.description_en,
      historical_period_kk: city.historical_period_kk,
      historical_period_ru: city.historical_period_ru,
      historical_period_en: city.historical_period_en,
      population_estimate_kk: city.population_estimate_kk,
      population_estimate_ru: city.population_estimate_ru,
      population_estimate_en: city.population_estimate_en,
      significance_kk: city.significance_kk,
      significance_ru: city.significance_ru,
      significance_en: city.significance_en,
      historical_facts_kk: city.historical_facts_kk,
      historical_facts_ru: city.historical_facts_ru,
      historical_facts_en: city.historical_facts_en,
      trade_info_kk: city.trade_info_kk,
      trade_info_ru: city.trade_info_ru,
      trade_info_en: city.trade_info_en,
    });
    setLang("kk");
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

  const columns: DataTableColumn<AdminCity>[] = [
    { key: "name", header: "Name", render: (c) => <span className="font-medium">{displayField(c, "name")}</span> },
    { key: "slug", header: "Slug", render: (c) => c.slug },
    { key: "period", header: "Period", render: (c) => displayField(c, "historical_period") },
    {
      key: "coords",
      header: "Coordinates",
      render: (c) => `${c.latitude.toFixed(2)}, ${c.longitude.toFixed(2)}`,
    },
  ];

  const previewCity = {
    name: form[`name_${lang}`] ?? "",
    historical_period: form[`historical_period_${lang}`] ?? "",
    description: form[`description_${lang}`] ?? "",
    significance: form[`significance_${lang}`],
    population_estimate: form[`population_estimate_${lang}`],
    historical_facts: form[`historical_facts_${lang}`],
    trade_info: form[`trade_info_${lang}`],
    image_url: form.image_url,
  };

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
            <div className="space-y-1.5">
              <Label>Slug</Label>
              <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} required />
            </div>
            <div className="grid grid-cols-2 gap-3">
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
            <div className="space-y-1.5">
              <Label>Image</Label>
              <ImageUploader value={form.image_url ?? null} onChange={(url) => setForm({ ...form, image_url: url })} aspect={16 / 9} />
            </div>

            <div className="pt-2 border-t" />

            <div className="space-y-1.5">
              <Label>Language</Label>
              <LanguageTabs value={lang} onChange={(value) => setLang(value as Lang)} />
              <p className="text-xs text-muted-foreground">
                Switching tabs edits that language only — the other two are untouched until you fill them in.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input
                value={form[`name_${lang}`] ?? ""}
                onChange={(e) => setForm({ ...form, [`name_${lang}`]: e.target.value })}
                required={lang === "kk"}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea
                value={form[`description_${lang}`] ?? ""}
                onChange={(e) => setForm({ ...form, [`description_${lang}`]: e.target.value })}
                required={lang === "kk"}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Historical period</Label>
              <Input
                value={form[`historical_period_${lang}`] ?? ""}
                onChange={(e) => setForm({ ...form, [`historical_period_${lang}`]: e.target.value })}
                required={lang === "kk"}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Population estimate</Label>
                <Input
                  value={form[`population_estimate_${lang}`] ?? ""}
                  onChange={(e) => setForm({ ...form, [`population_estimate_${lang}`]: e.target.value || null })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Significance</Label>
                <Input
                  value={form[`significance_${lang}`] ?? ""}
                  onChange={(e) => setForm({ ...form, [`significance_${lang}`]: e.target.value || null })}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Historical facts (one per line)</Label>
              <Textarea
                rows={5}
                value={factsToText(form[`historical_facts_${lang}`])}
                onChange={(e) => setForm({ ...form, [`historical_facts_${lang}`]: textToFacts(e.target.value) })}
                placeholder={"Founded in...\nKnown for...\nDeclined after..."}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Trade information</Label>
              <Textarea
                rows={3}
                value={form[`trade_info_${lang}`] ?? ""}
                onChange={(e) => setForm({ ...form, [`trade_info_${lang}`]: e.target.value || null })}
              />
            </div>
          </div>

          <div className="space-y-1.5 lg:sticky lg:top-0">
            <Label className="text-muted-foreground">Live preview ({lang})</Label>
            <CityPreview city={previewCity} />
          </div>
        </div>
      </FormDialog>

      <Dialog open={!!previewTarget} onOpenChange={(open) => !open && setPreviewTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="orda-cinzel">Preview</DialogTitle>
          </DialogHeader>
          {previewTarget && (
            <CityPreview
              city={{
                name: displayField(previewTarget, "name"),
                historical_period: displayField(previewTarget, "historical_period"),
                description: displayField(previewTarget, "description"),
                significance: displayField(previewTarget, "significance"),
                population_estimate: displayField(previewTarget, "population_estimate"),
                historical_facts: previewTarget.historical_facts_kk ?? previewTarget.historical_facts_en ?? previewTarget.historical_facts_ru,
                trade_info: displayField(previewTarget, "trade_info"),
                image_url: previewTarget.image_url,
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete city"
        description={`Are you sure you want to delete "${deleteTarget ? displayField(deleteTarget, "name") : ""}"? This cannot be undone.`}
        onConfirm={handleDelete}
      />
    </div>
  );
}
