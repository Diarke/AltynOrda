import { useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, X, Eye, Search, Zap, MapPin } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Badge } from "../../components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { DataTable, type DataTableColumn } from "../components/DataTable";
import { FormDialog } from "../components/FormDialog";
import { ConfirmDialog } from "../components/ConfirmDialog";
import {
  useAdminQuests,
  useCreateAdminQuest,
  useUpdateAdminQuest,
  useDeleteAdminQuest,
  useAdminCities,
  type AdminQuest,
  type AdminQuestInput,
  type AdminQuizQuestion,
} from "../lib/adminApi";

const DIFFICULTIES = ["easy", "medium", "hard"];

const EMPTY_FORM: AdminQuestInput = {
  city_id: "",
  title: "",
  description: "",
  difficulty: "medium",
  points: 100,
  xp_reward: 100,
  coin_reward: 10,
  cooldown_hours: 24,
  estimated_time_minutes: 15,
  category: "exploration",
  status: "not_started",
  quiz_questions: null,
};

function emptyQuestion(): AdminQuizQuestion {
  return { question: "", options: ["", ""], correct_answer: "" };
}

export function QuestsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [cityFilter, setCityFilter] = useState("all");
  const [difficultyFilter, setDifficultyFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AdminQuest | null>(null);
  const [form, setForm] = useState<AdminQuestInput>(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState<AdminQuest | null>(null);
  const [previewTarget, setPreviewTarget] = useState<AdminQuest | null>(null);

  const { data, isLoading } = useAdminQuests(page, 20, {
    q: search || undefined,
    cityId: cityFilter === "all" ? undefined : cityFilter,
    difficulty: difficultyFilter === "all" ? undefined : difficultyFilter,
  });
  const { data: citiesData } = useAdminCities(1, 100);
  const createMutation = useCreateAdminQuest();
  const updateMutation = useUpdateAdminQuest();
  const deleteMutation = useDeleteAdminQuest();

  const cities = citiesData?.data ?? [];
  const cityName = (id: string) => cities.find((c) => c.id === id)?.name ?? id;
  const questions = form.quiz_questions ?? [];

  const openCreate = () => {
    setEditing(null);
    setForm({ ...EMPTY_FORM, city_id: cities[0]?.id ?? "" });
    setDialogOpen(true);
  };

  const openEdit = (quest: AdminQuest) => {
    setEditing(quest);
    setForm({
      city_id: quest.city_id,
      title: quest.title,
      description: quest.description,
      difficulty: quest.difficulty,
      points: quest.points,
      xp_reward: quest.xp_reward,
      coin_reward: quest.coin_reward,
      cooldown_hours: quest.cooldown_hours,
      estimated_time_minutes: quest.estimated_time_minutes,
      category: quest.category,
      status: quest.status,
      quiz_questions: quest.quiz_questions,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    try {
      if (editing) {
        await updateMutation.mutateAsync({ id: editing.id, data: form });
        toast.success("Quest updated");
      } else {
        await createMutation.mutateAsync(form);
        toast.success("Quest created");
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
      toast.success("Quest deleted");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setDeleteTarget(null);
    }
  };

  const updateQuestion = (index: number, patch: Partial<AdminQuizQuestion>) => {
    const next = questions.map((q, i) => (i === index ? { ...q, ...patch } : q));
    setForm({ ...form, quiz_questions: next });
  };

  const columns: DataTableColumn<AdminQuest>[] = [
    { key: "title", header: "Title", render: (q) => <span className="font-medium">{q.title}</span> },
    { key: "city", header: "City", render: (q) => cityName(q.city_id) },
    { key: "difficulty", header: "Difficulty", render: (q) => <Badge variant="outline">{q.difficulty}</Badge> },
    { key: "xp", header: "XP / Coins", render: (q) => `${q.xp_reward} / ${q.coin_reward}` },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="orda-cinzel text-2xl font-bold">Quests</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage interactive quests and their quizzes.</p>
        </div>
        <Button onClick={openCreate} disabled={cities.length === 0}>
          <Plus size={16} /> New quest
        </Button>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by title or description…"
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
              <SelectItem key={city.id} value={city.id}>{city.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={difficultyFilter} onValueChange={(v) => { setDifficultyFilter(v); setPage(1); }}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All difficulties</SelectItem>
            {DIFFICULTIES.map((d) => (
              <SelectItem key={d} value={d}>{d}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={columns}
        rows={data?.data ?? []}
        rowKey={(q) => q.id}
        isLoading={isLoading}
        page={page}
        pageSize={20}
        total={data?.meta.total ?? 0}
        onPageChange={setPage}
        actions={(quest) => (
          <div className="flex items-center justify-end gap-1">
            <Button variant="ghost" size="icon" onClick={() => setPreviewTarget(quest)}>
              <Eye size={14} />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => openEdit(quest)}>
              <Pencil size={14} />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(quest)}>
              <Trash2 size={14} />
            </Button>
          </div>
        )}
      />

      <FormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={editing ? "Edit quest" : "New quest"}
        onSubmit={handleSubmit}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
        className="sm:max-w-2xl max-h-[85vh] overflow-y-auto"
      >
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
          <Label>Title</Label>
          <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
        </div>
        <div className="space-y-1.5">
          <Label>Description</Label>
          <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label>Difficulty</Label>
            <Select value={form.difficulty} onValueChange={(value) => setForm({ ...form, difficulty: value })}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DIFFICULTIES.map((d) => (
                  <SelectItem key={d} value={d}>
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Category</Label>
            <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Points</Label>
            <Input
              type="number"
              value={form.points}
              onChange={(e) => setForm({ ...form, points: Number(e.target.value) })}
            />
          </div>
        </div>
        <div className="grid grid-cols-4 gap-3">
          <div className="space-y-1.5">
            <Label>XP reward</Label>
            <Input
              type="number"
              value={form.xp_reward}
              onChange={(e) => setForm({ ...form, xp_reward: Number(e.target.value) })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Coin reward</Label>
            <Input
              type="number"
              value={form.coin_reward}
              onChange={(e) => setForm({ ...form, coin_reward: Number(e.target.value) })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Cooldown (h)</Label>
            <Input
              type="number"
              value={form.cooldown_hours}
              onChange={(e) => setForm({ ...form, cooldown_hours: Number(e.target.value) })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Est. minutes</Label>
            <Input
              type="number"
              value={form.estimated_time_minutes}
              onChange={(e) => setForm({ ...form, estimated_time_minutes: Number(e.target.value) })}
            />
          </div>
        </div>

        <div className="space-y-2 pt-2" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="flex items-center justify-between">
            <Label>Quiz questions (optional)</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setForm({ ...form, quiz_questions: [...questions, emptyQuestion()] })}
            >
              <Plus size={12} /> Add question
            </Button>
          </div>
          {questions.map((question, index) => (
            <div key={index} className="rounded-lg p-3 space-y-2" style={{ background: "rgba(255,255,255,0.03)" }}>
              <div className="flex items-center gap-2">
                <Input
                  placeholder={`Question ${index + 1}`}
                  value={question.question}
                  onChange={(e) => updateQuestion(index, { question: e.target.value })}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setForm({ ...form, quiz_questions: questions.filter((_, i) => i !== index) })}
                >
                  <X size={14} />
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {question.options.map((option, optIndex) => (
                  <Input
                    key={optIndex}
                    placeholder={`Option ${optIndex + 1}`}
                    value={option}
                    onChange={(e) => {
                      const nextOptions = question.options.map((o, i) => (i === optIndex ? e.target.value : o));
                      updateQuestion(index, { options: nextOptions });
                    }}
                  />
                ))}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => updateQuestion(index, { options: [...question.options, ""] })}
              >
                <Plus size={12} /> Add option
              </Button>
              <Input
                placeholder="Correct answer (must match one option exactly)"
                value={question.correct_answer}
                onChange={(e) => updateQuestion(index, { correct_answer: e.target.value })}
              />
            </div>
          ))}
        </div>
      </FormDialog>

      <Dialog open={!!previewTarget} onOpenChange={(open) => !open && setPreviewTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="orda-cinzel">Preview</DialogTitle>
          </DialogHeader>
          {previewTarget && (
            <div className="rounded-2xl p-6 border" style={{ background: "rgba(23,26,32,0.8)", borderColor: "rgba(212,175,55,0.12)" }}>
              <Badge className="mb-3">{previewTarget.category}</Badge>
              <h3 className="orda-cinzel text-xl font-bold mb-1" style={{ color: "#F6F4EC" }}>{previewTarget.title}</h3>
              <div className="flex items-center gap-2 mb-4 text-xs" style={{ color: "#B7BAC3" }}>
                <MapPin size={12} color="#D4AF37" /> {cityName(previewTarget.city_id)}
              </div>
              <p className="text-sm italic mb-4" style={{ color: "#F6F4EC" }}>{previewTarget.description}</p>
              <div className="flex items-center gap-4 text-xs" style={{ color: "#B7BAC3" }}>
                <span className="flex items-center gap-1"><Zap size={12} color="#D4AF37" /> +{previewTarget.xp_reward} XP</span>
                <span>+{previewTarget.coin_reward} coins</span>
                <Badge variant="outline">{previewTarget.difficulty}</Badge>
              </div>
              {previewTarget.quiz_questions && previewTarget.quiz_questions.length > 0 && (
                <p className="text-xs mt-3 pt-3 border-t" style={{ color: "#B7BAC3", borderColor: "rgba(255,255,255,0.06)" }}>
                  {previewTarget.quiz_questions.length} quiz question(s) attached
                </p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete quest"
        description={`Are you sure you want to delete "${deleteTarget?.title}"? This cannot be undone.`}
        onConfirm={handleDelete}
      />
    </div>
  );
}
