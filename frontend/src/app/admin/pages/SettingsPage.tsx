import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Save } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { Switch } from "../../components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { DataTable, type DataTableColumn } from "../components/DataTable";
import { FormDialog } from "../components/FormDialog";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { LanguageTabs } from "../components/LanguageTabs";
import {
  useAdminGamificationSettings,
  useCreateAdminGamificationSetting,
  useUpdateAdminGamificationSetting,
  useDeleteAdminGamificationSetting,
  useAdminSystemPrompt,
  useUpdateAdminSystemPrompt,
  useAdminSuggestedPrompts,
  useCreateAdminSuggestedPrompt,
  useUpdateAdminSuggestedPrompt,
  useDeleteAdminSuggestedPrompt,
  type AdminGamificationSetting,
  type AdminSuggestedPrompt,
  type AdminSuggestedPromptInput,
} from "../lib/adminApi";

function GamificationSettingsTab() {
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AdminGamificationSetting | null>(null);
  const [form, setForm] = useState({ key: "", value: "" });
  const [deleteTarget, setDeleteTarget] = useState<AdminGamificationSetting | null>(null);

  const { data, isLoading } = useAdminGamificationSettings(page, 50);
  const createMutation = useCreateAdminGamificationSetting();
  const updateMutation = useUpdateAdminGamificationSetting();
  const deleteMutation = useDeleteAdminGamificationSetting();

  const openCreate = () => {
    setEditing(null);
    setForm({ key: "", value: "" });
    setDialogOpen(true);
  };

  const openEdit = (setting: AdminGamificationSetting) => {
    setEditing(setting);
    setForm({ key: setting.key, value: setting.value });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    try {
      if (editing) {
        await updateMutation.mutateAsync({ id: editing.id, value: form.value });
        toast.success("Setting updated");
      } else {
        await createMutation.mutateAsync(form);
        toast.success("Setting created");
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
      toast.success("Setting deleted");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setDeleteTarget(null);
    }
  };

  const columns: DataTableColumn<AdminGamificationSetting>[] = [
    { key: "key", header: "Key", render: (s) => <span className="font-mono text-xs">{s.key}</span> },
    { key: "value", header: "Value", render: (s) => s.value },
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={openCreate}>
          <Plus size={16} /> New setting
        </Button>
      </div>
      <DataTable
        columns={columns}
        rows={data?.data ?? []}
        rowKey={(s) => s.id}
        isLoading={isLoading}
        page={page}
        pageSize={50}
        total={data?.meta.total ?? 0}
        onPageChange={setPage}
        actions={(setting) => (
          <div className="flex items-center justify-end gap-1">
            <Button variant="ghost" size="icon" onClick={() => openEdit(setting)}>
              <Pencil size={14} />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(setting)}>
              <Trash2 size={14} />
            </Button>
          </div>
        )}
      />
      <FormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={editing ? "Edit setting" : "New setting"}
        onSubmit={handleSubmit}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
      >
        <div className="space-y-1.5">
          <Label>Key</Label>
          <Input value={form.key} onChange={(e) => setForm({ ...form, key: e.target.value })} disabled={!!editing} required />
        </div>
        <div className="space-y-1.5">
          <Label>Value</Label>
          <Input value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} required />
        </div>
      </FormDialog>
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete setting"
        description={`Are you sure you want to delete "${deleteTarget?.key}"?`}
        onConfirm={handleDelete}
      />
    </div>
  );
}

function SystemPromptTab() {
  const { data, isLoading } = useAdminSystemPrompt();
  const updateMutation = useUpdateAdminSystemPrompt();
  const [value, setValue] = useState("");

  useEffect(() => {
    if (data) setValue(data.value);
  }, [data]);

  const handleSave = async () => {
    try {
      await updateMutation.mutateAsync(value);
      toast.success("System prompt saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        The instruction given to the AI historian model. Changes here are saved but do not yet take effect on the
        live chat — a follow-up pass wires the chat service to read this value.
      </p>
      <Textarea
        className="min-h-64 font-mono text-xs"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        disabled={isLoading}
      />
      <Button onClick={handleSave} disabled={updateMutation.isPending}>
        <Save size={14} /> {updateMutation.isPending ? "Saving…" : "Save prompt"}
      </Button>
    </div>
  );
}

function SuggestedPromptsTab() {
  const [language, setLanguage] = useState("kk");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AdminSuggestedPrompt | null>(null);
  const [form, setForm] = useState<AdminSuggestedPromptInput>({
    prompt_text: "",
    language: "kk",
    sort_order: 0,
    is_active: true,
  });
  const [deleteTarget, setDeleteTarget] = useState<AdminSuggestedPrompt | null>(null);

  const { data, isLoading } = useAdminSuggestedPrompts(1, 100);
  const createMutation = useCreateAdminSuggestedPrompt();
  const updateMutation = useUpdateAdminSuggestedPrompt();
  const deleteMutation = useDeleteAdminSuggestedPrompt();

  const prompts = (data?.data ?? []).filter((p) => p.language === language);

  const openCreate = () => {
    setEditing(null);
    setForm({ prompt_text: "", language: language as AdminSuggestedPromptInput["language"], sort_order: 0, is_active: true });
    setDialogOpen(true);
  };

  const openEdit = (prompt: AdminSuggestedPrompt) => {
    setEditing(prompt);
    setForm({
      prompt_text: prompt.prompt_text,
      language: prompt.language,
      sort_order: prompt.sort_order,
      is_active: prompt.is_active,
    });
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
    { key: "text", header: "Prompt", render: (p) => p.prompt_text },
    { key: "order", header: "Order", render: (p) => p.sort_order },
    { key: "active", header: "Active", render: (p) => (p.is_active ? "Yes" : "No") },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <LanguageTabs value={language} onChange={setLanguage} />
        <Button onClick={openCreate}>
          <Plus size={16} /> New prompt
        </Button>
      </div>
      <DataTable
        columns={columns}
        rows={prompts}
        rowKey={(p) => p.id}
        isLoading={isLoading}
        page={1}
        pageSize={100}
        total={prompts.length}
        onPageChange={() => {}}
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
        title={editing ? "Edit suggested prompt" : "New suggested prompt"}
        onSubmit={handleSubmit}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
      >
        <div className="space-y-1.5">
          <Label>Language</Label>
          <LanguageTabs
            value={form.language}
            onChange={(value) => setForm({ ...form, language: value as AdminSuggestedPromptInput["language"] })}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Prompt text</Label>
          <Textarea value={form.prompt_text} onChange={(e) => setForm({ ...form, prompt_text: e.target.value })} required />
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
        title="Delete suggested prompt"
        description="Are you sure you want to delete this suggested prompt?"
        onConfirm={handleDelete}
      />
    </div>
  );
}

export function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="orda-cinzel text-2xl font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Gamification rules, the AI system prompt, and suggested prompts.</p>
      </div>

      <Tabs defaultValue="gamification">
        <TabsList>
          <TabsTrigger value="gamification">Gamification</TabsTrigger>
          <TabsTrigger value="system-prompt">AI System Prompt</TabsTrigger>
          <TabsTrigger value="suggested-prompts">Suggested Prompts</TabsTrigger>
        </TabsList>
        <TabsContent value="gamification">
          <GamificationSettingsTab />
        </TabsContent>
        <TabsContent value="system-prompt">
          <SystemPromptTab />
        </TabsContent>
        <TabsContent value="suggested-prompts">
          <SuggestedPromptsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
