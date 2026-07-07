import { useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Eye, Search } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { Badge } from "../../components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { DataTable, type DataTableColumn } from "../components/DataTable";
import { FormDialog } from "../components/FormDialog";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { LanguageTabs } from "../components/LanguageTabs";
import { displayField } from "../lib/localizedDisplay";
import {
  useAdminHistoricalDocuments,
  useCreateAdminHistoricalDocument,
  useUpdateAdminHistoricalDocument,
  useDeleteAdminHistoricalDocument,
  useAdminCities,
  type AdminHistoricalDocument,
  type AdminHistoricalDocumentInput,
} from "../lib/adminApi";

const SOURCE_TYPES = ["primary", "secondary", "archaeological"];

const EMPTY_FORM: AdminHistoricalDocumentInput = {
  city_id: null,
  title: "",
  content: "",
  source: "",
  source_type: "secondary",
  author: null,
  year: null,
  language: "kk",
  group_key: null,
};

export function HistoricalDocumentsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [cityFilter, setCityFilter] = useState("all");
  const [sourceTypeFilter, setSourceTypeFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AdminHistoricalDocument | null>(null);
  const [form, setForm] = useState<AdminHistoricalDocumentInput>(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState<AdminHistoricalDocument | null>(null);
  const [previewTarget, setPreviewTarget] = useState<AdminHistoricalDocument | null>(null);

  const { data, isLoading } = useAdminHistoricalDocuments(page, 20, {
    q: search || undefined,
    cityId: cityFilter === "all" ? undefined : cityFilter,
    sourceType: sourceTypeFilter === "all" ? undefined : sourceTypeFilter,
  });
  const { data: citiesData } = useAdminCities(1, 100);
  const createMutation = useCreateAdminHistoricalDocument();
  const updateMutation = useUpdateAdminHistoricalDocument();
  const deleteMutation = useDeleteAdminHistoricalDocument();

  const cities = citiesData?.data ?? [];
  const cityName = (id: string | null) => {
    const city = id ? cities.find((c) => c.id === id) : undefined;
    return city ? displayField(city, "name") : (id ?? "—");
  };

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (doc: AdminHistoricalDocument) => {
    setEditing(doc);
    setForm({
      city_id: doc.city_id,
      title: doc.title,
      content: doc.content,
      source: doc.source,
      source_type: doc.source_type,
      author: doc.author,
      year: doc.year,
      language: doc.language,
      group_key: doc.group_key,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    try {
      if (editing) {
        await updateMutation.mutateAsync({ id: editing.id, data: form });
        toast.success("Document updated and re-indexed for the AI historian");
      } else {
        await createMutation.mutateAsync(form);
        toast.success("Document created and indexed for the AI historian");
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
      toast.success("Document deleted");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setDeleteTarget(null);
    }
  };

  const columns: DataTableColumn<AdminHistoricalDocument>[] = [
    { key: "title", header: "Title", render: (d) => <span className="font-medium">{d.title}</span> },
    { key: "city", header: "City", render: (d) => cityName(d.city_id) },
    { key: "language", header: "Language", render: (d) => <Badge variant="outline">{d.language}</Badge> },
    {
      key: "embedded",
      header: "Indexed chunks",
      render: (d) => (d.embedded_chunks > 0 ? <Badge>{d.embedded_chunks}</Badge> : <Badge variant="secondary">0</Badge>),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="orda-cinzel text-2xl font-bold">Historical Documents</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Source material for the AI historian. Saving a document embeds it into the AI's knowledge base immediately.
            For uploading PDF/DOCX/TXT/Markdown files, see AI Knowledge Base.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus size={16} /> New document
        </Button>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by title, source, or author…"
            className="pl-9"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <Select value={cityFilter} onValueChange={(v) => { setCityFilter(v); setPage(1); }}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All cities</SelectItem>
            {cities.map((city) => (
              <SelectItem key={city.id} value={city.id}>{displayField(city, "name")}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sourceTypeFilter} onValueChange={(v) => { setSourceTypeFilter(v); setPage(1); }}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All source types</SelectItem>
            {SOURCE_TYPES.map((type) => (
              <SelectItem key={type} value={type}>{type}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={columns}
        rows={data?.data ?? []}
        rowKey={(d) => d.id}
        isLoading={isLoading}
        page={page}
        pageSize={20}
        total={data?.meta.total ?? 0}
        onPageChange={setPage}
        actions={(doc) => (
          <div className="flex items-center justify-end gap-1">
            <Button variant="ghost" size="icon" onClick={() => setPreviewTarget(doc)}>
              <Eye size={14} />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => openEdit(doc)}>
              <Pencil size={14} />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(doc)}>
              <Trash2 size={14} />
            </Button>
          </div>
        )}
      />

      <FormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={editing ? "Edit historical document" : "New historical document"}
        onSubmit={handleSubmit}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
        className="sm:max-w-2xl max-h-[85vh] overflow-y-auto"
      >
        <div className="space-y-1.5">
          <Label>Language</Label>
          <LanguageTabs
            value={form.language}
            onChange={(value) => setForm({ ...form, language: value as AdminHistoricalDocumentInput["language"] })}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Title</Label>
          <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
        </div>
        <div className="space-y-1.5">
          <Label>Content</Label>
          <Textarea
            className="min-h-40"
            value={form.content}
            onChange={(e) => setForm({ ...form, content: e.target.value })}
            required
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>City (optional)</Label>
            <Select
              value={form.city_id ?? "none"}
              onValueChange={(value) => setForm({ ...form, city_id: value === "none" ? null : value })}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="No specific city" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No specific city</SelectItem>
                {cities.map((city) => (
                  <SelectItem key={city.id} value={city.id}>
                    {displayField(city, "name")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Source type</Label>
            <Select
              value={form.source_type}
              onValueChange={(value) => setForm({ ...form, source_type: value as AdminHistoricalDocumentInput["source_type"] })}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SOURCE_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label>Source</Label>
            <Input value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} required />
          </div>
          <div className="space-y-1.5">
            <Label>Author</Label>
            <Input value={form.author ?? ""} onChange={(e) => setForm({ ...form, author: e.target.value || null })} />
          </div>
          <div className="space-y-1.5">
            <Label>Year</Label>
            <Input value={form.year ?? ""} onChange={(e) => setForm({ ...form, year: e.target.value || null })} />
          </div>
        </div>
      </FormDialog>

      <Dialog open={!!previewTarget} onOpenChange={(open) => !open && setPreviewTarget(null)}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="orda-cinzel">{previewTarget?.title}</DialogTitle>
          </DialogHeader>
          {previewTarget && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Badge variant="outline">{previewTarget.language}</Badge>
                <Badge variant="outline">{previewTarget.source_type}</Badge>
                <span>{cityName(previewTarget.city_id)}</span>
                {previewTarget.author && <span>· {previewTarget.author}</span>}
                {previewTarget.year && <span>· {previewTarget.year}</span>}
              </div>
              <p className="text-sm whitespace-pre-wrap leading-relaxed" style={{ color: "#B7BAC3" }}>
                {previewTarget.content}
              </p>
              <p className="text-xs pt-2 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                Source: {previewTarget.source} · {previewTarget.embedded_chunks} indexed chunks
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete document"
        description={`Are you sure you want to delete "${deleteTarget?.title}"? Its AI index entries will also be removed.`}
        onConfirm={handleDelete}
      />
    </div>
  );
}
