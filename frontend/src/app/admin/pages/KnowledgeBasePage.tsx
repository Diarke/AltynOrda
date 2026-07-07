import { useRef, useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Search, UploadCloud, FileText } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { Badge } from "../../components/ui/badge";
import { Switch } from "../../components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { DataTable, type DataTableColumn } from "../components/DataTable";
import { FormDialog } from "../components/FormDialog";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { LanguageTabs } from "../components/LanguageTabs";
import {
  useAdminHistoricalDocuments,
  useUploadAdminHistoricalDocument,
  useAdminCities,
  useAdminSuggestedPrompts,
  useCreateAdminSuggestedPrompt,
  useUpdateAdminSuggestedPrompt,
  useDeleteAdminSuggestedPrompt,
  type AdminSuggestedPrompt,
  type AdminSuggestedPromptInput,
} from "../lib/adminApi";

const SOURCE_TYPES = ["primary", "secondary", "archaeological"];
const ACCEPTED_EXTENSIONS = ".pdf,.docx,.txt,.md,.markdown";

const EMPTY_UPLOAD_FORM = {
  title: "",
  source: "",
  source_type: "secondary",
  language: "kk" as const,
  author: "",
  year: "",
  city_id: "none",
};

const EMPTY_PROMPT_FORM: AdminSuggestedPromptInput = {
  prompt_text: "",
  language: "kk",
  sort_order: 0,
  is_active: true,
};

function UploadTab() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [form, setForm] = useState(EMPTY_UPLOAD_FORM);
  const uploadMutation = useUploadAdminHistoricalDocument();
  const { data: citiesData } = useAdminCities(1, 100);
  const { data: recentDocs } = useAdminHistoricalDocuments(1, 8);
  const cities = citiesData?.data ?? [];

  const handleUpload = async () => {
    if (!file) {
      toast.error("Choose a PDF, DOCX, TXT, or Markdown file first");
      return;
    }
    if (!form.source.trim()) {
      toast.error("Please provide a source");
      return;
    }
    try {
      await uploadMutation.mutateAsync({
        file,
        source: form.source,
        source_type: form.source_type,
        language: form.language,
        title: form.title || undefined,
        author: form.author || undefined,
        year: form.year || undefined,
        city_id: form.city_id === "none" ? null : form.city_id,
      });
      toast.success("File uploaded, extracted, and indexed for the AI historian");
      setFile(null);
      setForm(EMPTY_UPLOAD_FORM);
      if (inputRef.current) inputRef.current.value = "";
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed");
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
      <div className="space-y-4">
        <div
          className="rounded-2xl border-2 border-dashed p-8 text-center cursor-pointer transition-colors"
          style={{ borderColor: file ? "rgba(212,175,55,0.4)" : "rgba(255,255,255,0.12)" }}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const dropped = e.dataTransfer.files?.[0];
            if (dropped) setFile(dropped);
          }}
        >
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED_EXTENSIONS}
            className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          {file ? (
            <>
              <FileText size={28} className="mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm font-medium">{file.name}</p>
              <p className="text-xs text-muted-foreground mt-1">{(file.size / 1024).toFixed(0)} KB — click to change</p>
            </>
          ) : (
            <>
              <UploadCloud size={28} className="mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm font-medium">Drop a file here, or click to browse</p>
              <p className="text-xs text-muted-foreground mt-1">PDF, DOCX, TXT, or Markdown — text is extracted automatically</p>
            </>
          )}
        </div>

        <div className="space-y-1.5">
          <Label>Language</Label>
          <LanguageTabs value={form.language} onChange={(value) => setForm({ ...form, language: value as typeof form.language })} />
        </div>
        <div className="space-y-1.5">
          <Label>Title (optional — defaults to filename)</Label>
          <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>City (optional)</Label>
            <Select value={form.city_id} onValueChange={(value) => setForm({ ...form, city_id: value })}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="No specific city" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No specific city</SelectItem>
                {cities.map((city) => (
                  <SelectItem key={city.id} value={city.id}>{city.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Source type</Label>
            <Select value={form.source_type} onValueChange={(value) => setForm({ ...form, source_type: value })}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SOURCE_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label>Source</Label>
            <Input value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} placeholder="e.g. uploaded-book.pdf" required />
          </div>
          <div className="space-y-1.5">
            <Label>Author</Label>
            <Input value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Year</Label>
            <Input value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} />
          </div>
        </div>
        <Button onClick={handleUpload} disabled={uploadMutation.isPending} className="w-full">
          <UploadCloud size={16} /> {uploadMutation.isPending ? "Uploading & indexing…" : "Upload & index"}
        </Button>
      </div>

      <div className="space-y-2">
        <Label className="text-muted-foreground">Recently indexed</Label>
        <div className="space-y-2">
          {(recentDocs?.data ?? []).map((doc) => (
            <div key={doc.id} className="rounded-lg p-3 text-xs" style={{ background: "rgba(255,255,255,0.03)" }}>
              <div className="font-medium truncate">{doc.title}</div>
              <div className="flex items-center gap-2 mt-1 text-muted-foreground">
                <Badge variant="outline" className="text-[10px]">{doc.language}</Badge>
                <span>{doc.embedded_chunks} chunks</span>
              </div>
            </div>
          ))}
          {(recentDocs?.data ?? []).length === 0 && (
            <p className="text-xs text-muted-foreground">No documents indexed yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function SuggestedPromptsTab() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [language, setLanguage] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AdminSuggestedPrompt | null>(null);
  const [form, setForm] = useState<AdminSuggestedPromptInput>(EMPTY_PROMPT_FORM);
  const [deleteTarget, setDeleteTarget] = useState<AdminSuggestedPrompt | null>(null);

  const { data, isLoading } = useAdminSuggestedPrompts(page, 20, {
    q: search || undefined,
    language: language === "all" ? undefined : language,
  });
  const createMutation = useCreateAdminSuggestedPrompt();
  const updateMutation = useUpdateAdminSuggestedPrompt();
  const deleteMutation = useDeleteAdminSuggestedPrompt();

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_PROMPT_FORM);
    setDialogOpen(true);
  };

  const openEdit = (prompt: AdminSuggestedPrompt) => {
    setEditing(prompt);
    setForm({ prompt_text: prompt.prompt_text, language: prompt.language, sort_order: prompt.sort_order, is_active: prompt.is_active });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    try {
      if (editing) {
        await updateMutation.mutateAsync({ id: editing.id, data: form });
        toast.success("Prompt updated");
      } else {
        await createMutation.mutateAsync(form);
        toast.success("Prompt created");
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
      toast.success("Prompt deleted");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setDeleteTarget(null);
    }
  };

  const columns: DataTableColumn<AdminSuggestedPrompt>[] = [
    { key: "prompt", header: "Prompt", render: (p) => <span className="line-clamp-1">{p.prompt_text}</span> },
    { key: "language", header: "Language", render: (p) => <Badge variant="outline">{p.language}</Badge> },
    { key: "order", header: "Order", render: (p) => p.sort_order },
    { key: "active", header: "Active", render: (p) => (p.is_active ? "Yes" : "No") },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Starter questions shown to players in the AI Historian chat.</p>
        <Button onClick={openCreate}>
          <Plus size={16} /> New prompt
        </Button>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search prompts…"
            className="pl-9"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <Select value={language} onValueChange={(v) => { setLanguage(v); setPage(1); }}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All languages</SelectItem>
            <SelectItem value="kk">kk</SelectItem>
            <SelectItem value="ru">ru</SelectItem>
            <SelectItem value="en">en</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={columns}
        rows={data?.data ?? []}
        rowKey={(p) => p.id}
        isLoading={isLoading}
        page={page}
        pageSize={20}
        total={data?.meta.total ?? 0}
        onPageChange={setPage}
        actions={(prompt) => (
          <div className="flex items-center justify-end gap-1">
            <Button variant="ghost" size="icon" onClick={() => openEdit(prompt)}>
              <Pencil size={14} />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(prompt)}>
              <Trash2 size={14} />
            </Button>
          </div>
        )}
      />

      <FormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={editing ? "Edit prompt" : "New prompt"}
        onSubmit={handleSubmit}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
      >
        <div className="space-y-1.5">
          <Label>Language</Label>
          <LanguageTabs value={form.language} onChange={(value) => setForm({ ...form, language: value as AdminSuggestedPromptInput["language"] })} />
        </div>
        <div className="space-y-1.5">
          <Label>Prompt text</Label>
          <Textarea value={form.prompt_text} onChange={(e) => setForm({ ...form, prompt_text: e.target.value })} required />
        </div>
        <div className="grid grid-cols-2 gap-3 items-end">
          <div className="space-y-1.5">
            <Label>Sort order</Label>
            <Input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} />
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
        title="Delete prompt"
        description="Are you sure you want to delete this suggested prompt?"
        onConfirm={handleDelete}
      />
    </div>
  );
}

export function KnowledgeBasePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="orda-cinzel text-2xl font-bold">AI Knowledge Base</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Upload source material for the AI historian's RAG index, and manage the starter questions shown in chat.
        </p>
      </div>

      <Tabs defaultValue="upload">
        <TabsList>
          <TabsTrigger value="upload">Upload files</TabsTrigger>
          <TabsTrigger value="prompts">Suggested prompts</TabsTrigger>
        </TabsList>
        <TabsContent value="upload">
          <UploadTab />
        </TabsContent>
        <TabsContent value="prompts">
          <SuggestedPromptsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
