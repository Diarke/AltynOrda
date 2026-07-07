import { useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Eye, Search } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { Switch } from "../../components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { DataTable, type DataTableColumn } from "../components/DataTable";
import { FormDialog } from "../components/FormDialog";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { ImageUploader } from "../components/ImageUploader";
import { LanguageTabs } from "../components/LanguageTabs";
import { HomepageSectionPreview } from "../components/EntityPreviews";
import {
  useAdminHomepageContent,
  useCreateAdminHomepageContent,
  useUpdateAdminHomepageContent,
  useDeleteAdminHomepageContent,
  type AdminHomepageContent,
  type AdminHomepageContentInput,
} from "../lib/adminApi";

const SECTIONS = [
  { value: "hero", label: "Hero" },
  { value: "stats", label: "Statistics" },
  { value: "cards", label: "Cards" },
  { value: "timeline", label: "Timeline" },
  { value: "footer", label: "Footer" },
];

const SECTION_HINTS: Record<string, string> = {
  hero: "The full-screen landing banner: headline, tagline, and the primary call to action.",
  stats: "Numeric highlights on the landing page (e.g. years of history, cities, artifacts). Put the number in Title and its label in Body.",
  cards: "Feature/pillar cards shown below the hero (explore, converse, quest, etc).",
  timeline: "Entries in the historical timeline strip.",
  footer: "Footer links and closing call-to-action content.",
};

const EMPTY_FORM: AdminHomepageContentInput = {
  section: "hero",
  language: "kk",
  group_key: null,
  title: "",
  body: "",
  image_url: null,
  cta_text: "",
  cta_url: "",
  sort_order: 0,
  is_active: true,
};

export function HomepagePage() {
  const [activeSection, setActiveSection] = useState("hero");
  const [page, setPage] = useState(1);
  const [language, setLanguage] = useState("kk");
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AdminHomepageContent | null>(null);
  const [form, setForm] = useState<AdminHomepageContentInput>(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState<AdminHomepageContent | null>(null);
  const [previewTarget, setPreviewTarget] = useState<AdminHomepageContent | null>(null);

  const { data, isLoading } = useAdminHomepageContent({
    page,
    pageSize: 50,
    language,
    section: activeSection,
    q: search || undefined,
  });
  const createMutation = useCreateAdminHomepageContent();
  const updateMutation = useUpdateAdminHomepageContent();
  const deleteMutation = useDeleteAdminHomepageContent();

  const openCreate = () => {
    setEditing(null);
    setForm({ ...EMPTY_FORM, language, section: activeSection });
    setDialogOpen(true);
  };

  const openEdit = (item: AdminHomepageContent) => {
    setEditing(item);
    setForm({
      section: item.section,
      language: item.language,
      group_key: item.group_key,
      title: item.title,
      body: item.body,
      image_url: item.image_url,
      cta_text: item.cta_text,
      cta_url: item.cta_url,
      sort_order: item.sort_order,
      is_active: item.is_active,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    try {
      if (editing) {
        await updateMutation.mutateAsync({ id: editing.id, data: form });
        toast.success("Homepage content updated");
      } else {
        await createMutation.mutateAsync(form);
        toast.success("Homepage content created");
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
      toast.success("Homepage content deleted");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setDeleteTarget(null);
    }
  };

  const columns: DataTableColumn<AdminHomepageContent>[] = [
    { key: "title", header: "Title", render: (c) => c.title || "—" },
    { key: "body", header: "Body", render: (c) => <span className="line-clamp-1 text-muted-foreground">{c.body || "—"}</span> },
    { key: "order", header: "Order", render: (c) => c.sort_order },
    { key: "active", header: "Active", render: (c) => (c.is_active ? "Yes" : "No") },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="orda-cinzel text-2xl font-bold">Homepage Builder</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Edit every block of the landing page — nothing here is hardcoded in the frontend.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus size={16} /> New block
        </Button>
      </div>

      <Tabs value={activeSection} onValueChange={(v) => { setActiveSection(v); setPage(1); }}>
        <TabsList>
          {SECTIONS.map((s) => (
            <TabsTrigger key={s.value} value={s.value}>{s.label}</TabsTrigger>
          ))}
        </TabsList>

        {SECTIONS.map((s) => (
          <TabsContent key={s.value} value={s.value} className="space-y-4">
            <p className="text-xs text-muted-foreground">{SECTION_HINTS[s.value]}</p>

            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="relative flex-1 max-w-sm">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by title or body…"
                  className="pl-9"
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                />
              </div>
              <LanguageTabs value={language} onChange={(value) => { setLanguage(value); setPage(1); }} />
            </div>

            <DataTable
              columns={columns}
              rows={data?.data ?? []}
              rowKey={(c) => c.id}
              isLoading={isLoading}
              page={page}
              pageSize={50}
              total={data?.meta.total ?? 0}
              onPageChange={setPage}
              emptyMessage="No content blocks yet for this section/language."
              actions={(item) => (
                <div className="flex items-center justify-end gap-1">
                  <Button variant="ghost" size="icon" onClick={() => setPreviewTarget(item)}>
                    <Eye size={14} />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => openEdit(item)}>
                    <Pencil size={14} />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(item)}>
                    <Trash2 size={14} />
                  </Button>
                </div>
              )}
            />
          </TabsContent>
        ))}
      </Tabs>

      <FormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={editing ? "Edit content block" : "New content block"}
        onSubmit={handleSubmit}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
        className="sm:max-w-3xl max-h-[85vh] overflow-y-auto"
      >
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Section</Label>
                <Select value={form.section} onValueChange={(value) => setForm({ ...form, section: value })}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SECTIONS.map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Language</Label>
                <LanguageTabs value={form.language} onChange={(value) => setForm({ ...form, language: value as AdminHomepageContentInput["language"] })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>{form.section === "stats" ? "Number" : "Title"}</Label>
              <Input value={form.title ?? ""} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>{form.section === "stats" ? "Label" : "Body"}</Label>
              <Textarea value={form.body ?? ""} onChange={(e) => setForm({ ...form, body: e.target.value })} />
            </div>
            {form.section !== "stats" && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>CTA text</Label>
                  <Input value={form.cta_text ?? ""} onChange={(e) => setForm({ ...form, cta_text: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>CTA URL</Label>
                  <Input value={form.cta_url ?? ""} onChange={(e) => setForm({ ...form, cta_url: e.target.value })} />
                </div>
              </div>
            )}
            {form.section !== "stats" && (
              <div className="space-y-1.5">
                <Label>Image</Label>
                <ImageUploader value={form.image_url ?? null} onChange={(url) => setForm({ ...form, image_url: url })} aspect={16 / 9} />
              </div>
            )}
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
            <HomepageSectionPreview section={form} />
          </div>
        </div>
      </FormDialog>

      <Dialog open={!!previewTarget} onOpenChange={(open) => !open && setPreviewTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="orda-cinzel">Preview</DialogTitle>
          </DialogHeader>
          {previewTarget && <HomepageSectionPreview section={previewTarget} />}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete content block"
        description="Are you sure you want to delete this homepage content block?"
        onConfirm={handleDelete}
      />
    </div>
  );
}
