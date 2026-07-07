import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  request,
  type ApiAchievement,
  type ApiCertificate,
  type ApiLanguage,
  type ApiUser,
  type PaginatedResponse,
} from "../../lib/api";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface AdminUser extends ApiUser {
  xp: number;
  coins: number;
  level: number;
  streak_days: number;
  equipped_frame: string;
}

export interface AdminQuizQuestion {
  question_kk: string;
  question_ru: string | null;
  question_en: string | null;
  options_kk: string[];
  options_ru: string[] | null;
  options_en: string[] | null;
  correct_answer_kk: string;
  correct_answer_ru: string | null;
  correct_answer_en: string | null;
}

export interface AdminQuest {
  id: string;
  city_id: string;
  difficulty: string;
  points: number;
  xp_reward: number;
  coin_reward: number;
  cooldown_hours: number;
  estimated_time_minutes: number;
  category: string;
  status: string;
  title_kk: string | null;
  title_ru: string | null;
  title_en: string | null;
  description_kk: string | null;
  description_ru: string | null;
  description_en: string | null;
  quiz_questions: AdminQuizQuestion[] | null;
  created_at: string;
}

export interface AdminCity {
  id: string;
  slug: string;
  latitude: number;
  longitude: number;
  image_url: string | null;
  name_kk: string | null;
  name_ru: string | null;
  name_en: string | null;
  description_kk: string | null;
  description_ru: string | null;
  description_en: string | null;
  historical_period_kk: string | null;
  historical_period_ru: string | null;
  historical_period_en: string | null;
  population_estimate_kk: string | null;
  population_estimate_ru: string | null;
  population_estimate_en: string | null;
  significance_kk: string | null;
  significance_ru: string | null;
  significance_en: string | null;
  historical_facts_kk: string[] | null;
  historical_facts_ru: string[] | null;
  historical_facts_en: string[] | null;
  trade_info_kk: string | null;
  trade_info_ru: string | null;
  trade_info_en: string | null;
  created_at: string;
}

export interface AdminArtifact {
  id: string;
  city_id: string;
  rarity: string;
  image_url: string | null;
  name_kk: string | null;
  name_ru: string | null;
  name_en: string | null;
  description_kk: string | null;
  description_ru: string | null;
  description_en: string | null;
  era_kk: string | null;
  era_ru: string | null;
  era_en: string | null;
  historical_context_kk: string | null;
  historical_context_ru: string | null;
  historical_context_en: string | null;
  created_at: string;
}

export interface AdminGalleryImage {
  id: string;
  title: string | null;
  description: string | null;
  language: ApiLanguage;
  group_key: string | null;
  image_url: string;
  alt_text: string | null;
  sort_order: number;
  is_active: boolean;
  city_id: string | null;
  created_at: string;
}

export type AchievementMetric =
  | "xp" | "coins" | "level" | "streak_days"
  | "quests_completed" | "cities_visited" | "artifacts_collected" | "certificates_issued";

export interface AdminAchievementDefinition {
  id: string;
  key: string;
  title_kk: string | null;
  title_ru: string | null;
  title_en: string | null;
  description_kk: string | null;
  description_ru: string | null;
  description_en: string | null;
  icon_url: string | null;
  metric: AchievementMetric;
  threshold: number;
  reward_xp: number;
  reward_coins: number;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export interface AdminHomepageContent {
  id: string;
  section: string;
  language: ApiLanguage;
  group_key: string | null;
  title: string | null;
  body: string | null;
  image_url: string | null;
  cta_text: string | null;
  cta_url: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export interface AdminGamificationSetting {
  id: string;
  key: string;
  value: string;
  created_at: string;
  updated_at: string;
}

export interface AdminSystemSetting {
  id: string;
  key: string;
  value: string;
  created_at: string;
  updated_at: string;
}

export interface AdminHistoricalDocument {
  id: string;
  city_id: string | null;
  title: string;
  content: string;
  source: string;
  source_type: string;
  author: string | null;
  year: string | null;
  language: ApiLanguage;
  group_key: string | null;
  embedded_chunks: number;
  created_at: string;
}

export interface AdminSuggestedPrompt {
  id: string;
  prompt_text: string;
  language: ApiLanguage;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export interface AdminSystemPrompt {
  value: string;
  updated_at: string | null;
}

export interface AdminUploadResult {
  url: string;
  bucket: string;
  key: string;
  created_at: string | null;
}

export interface TimeSeriesPoint {
  date: string;
  value: number;
}

export interface AdminStatistics {
  total_users: number;
  new_users: number;
  daily_active_users: number;
  completed_quests: number;
  average_xp: number;
  average_coins: number;
  most_visited_city: string | null;
  most_popular_artifact: string | null;
  most_used_ai_prompt: string | null;
  certificates_issued: number;
}

export interface AdminUserGrowth {
  series: TimeSeriesPoint[];
}

export interface AdminQuestCompletion {
  series: TimeSeriesPoint[];
  by_status: Record<string, number>;
  top_quests: { title: string; completions: number }[];
}

export interface AdminAIUsage {
  series: TimeSeriesPoint[];
  total_messages: number;
}

export interface AdminXPStats {
  average_xp: number;
  max_xp: number;
  buckets: { range: string; count: number }[];
}

export interface AdminCoinHolder {
  user_id: string;
  username: string;
  coins: number;
}

export interface AdminCoinEconomy {
  total_coins_in_circulation: number;
  average_coins: number;
  total_coins_spent_on_cosmetics: number;
  top_holders: AdminCoinHolder[];
}

export interface AdminCertificatesAnalytics {
  series: TimeSeriesPoint[];
  total_issued: number;
}

export interface AdminActivityItem {
  type: string;
  user_id: string | null;
  username: string | null;
  description: string;
  created_at: string;
}

export interface AdminRecentActivity {
  items: AdminActivityItem[];
}

// ─── Shared helpers ─────────────────────────────────────────────────────────

type QueryParams = Record<string, string | number | boolean | undefined | null>;

function toQueryString(params?: QueryParams): string {
  if (!params) return "";
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") qs.set(key, String(value));
  });
  const suffix = qs.toString();
  return suffix ? `?${suffix}` : "";
}

/** Generic paginated-list hook factory for the admin CRUD entities. */
function useAdminList<T>(entityKey: string, path: string, params?: QueryParams) {
  return useQuery({
    queryKey: ["admin", entityKey, "list", params ?? {}],
    queryFn: () => request<PaginatedResponse<T>>(`/admin/${path}${toQueryString(params)}`),
  });
}

function invalidate(queryClient: ReturnType<typeof useQueryClient>, entityKey: string) {
  queryClient.invalidateQueries({ queryKey: ["admin", entityKey] });
}

// ─── Statistics & analytics ─────────────────────────────────────────────────

export function useAdminStatistics() {
  return useQuery({
    queryKey: ["admin", "statistics"],
    queryFn: () => request<AdminStatistics>("/admin/statistics"),
  });
}

export function useAdminUserGrowth(days = 30) {
  return useQuery({
    queryKey: ["admin", "analytics", "user-growth", days],
    queryFn: () => request<AdminUserGrowth>(`/admin/analytics/user-growth?days=${days}`),
  });
}

export function useAdminQuestCompletion(days = 30) {
  return useQuery({
    queryKey: ["admin", "analytics", "quest-completion", days],
    queryFn: () => request<AdminQuestCompletion>(`/admin/analytics/quest-completion?days=${days}`),
  });
}

export function useAdminAIUsage(days = 30) {
  return useQuery({
    queryKey: ["admin", "analytics", "ai-usage", days],
    queryFn: () => request<AdminAIUsage>(`/admin/analytics/ai-usage?days=${days}`),
  });
}

export function useAdminXPStats() {
  return useQuery({
    queryKey: ["admin", "analytics", "xp-stats"],
    queryFn: () => request<AdminXPStats>("/admin/analytics/xp-stats"),
  });
}

export function useAdminCoinEconomy() {
  return useQuery({
    queryKey: ["admin", "analytics", "coin-economy"],
    queryFn: () => request<AdminCoinEconomy>("/admin/analytics/coin-economy"),
  });
}

export function useAdminCertificatesAnalytics(days = 30) {
  return useQuery({
    queryKey: ["admin", "analytics", "certificates", days],
    queryFn: () => request<AdminCertificatesAnalytics>(`/admin/analytics/certificates?days=${days}`),
  });
}

export function useAdminRecentActivity(limit = 20) {
  return useQuery({
    queryKey: ["admin", "analytics", "recent-activity", limit],
    queryFn: () => request<AdminRecentActivity>(`/admin/analytics/recent-activity?limit=${limit}`),
  });
}

// ─── Users ───────────────────────────────────────────────────────────────────

export function useAdminUsers(params: {
  page?: number;
  pageSize?: number;
  q?: string;
  role?: string;
  isActive?: boolean;
}) {
  return useAdminList<AdminUser>("users", "users", {
    page: params.page ?? 1,
    page_size: params.pageSize ?? 20,
    q: params.q,
    role: params.role,
    is_active: params.isActive,
  });
}

export function useUpdateAdminUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Pick<AdminUser, "role" | "is_active" | "xp" | "coins" | "level">> }) =>
      request<AdminUser>(`/admin/users/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    onSuccess: () => invalidate(queryClient, "users"),
  });
}

export function useDeleteAdminUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => request<void>(`/admin/users/${id}`, { method: "DELETE" }),
    onSuccess: () => invalidate(queryClient, "users"),
  });
}

// ─── Cities ──────────────────────────────────────────────────────────────────

export type AdminCityInput = Omit<AdminCity, "id" | "created_at">;

export function useAdminCities(page = 1, pageSize = 20, q?: string) {
  return useAdminList<AdminCity>("cities", "cities", { page, page_size: pageSize, q });
}

export function useCreateAdminCity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: AdminCityInput) =>
      request<AdminCity>("/admin/cities", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => invalidate(queryClient, "cities"),
  });
}

export function useUpdateAdminCity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<AdminCityInput> }) =>
      request<AdminCity>(`/admin/cities/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    onSuccess: () => invalidate(queryClient, "cities"),
  });
}

export function useDeleteAdminCity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => request<void>(`/admin/cities/${id}`, { method: "DELETE" }),
    onSuccess: () => invalidate(queryClient, "cities"),
  });
}

// ─── Artifacts ───────────────────────────────────────────────────────────────

export type AdminArtifactInput = Omit<AdminArtifact, "id" | "created_at">;

export function useAdminArtifacts(
  page = 1,
  pageSize = 20,
  filters?: { q?: string; cityId?: string; rarity?: string }
) {
  return useAdminList<AdminArtifact>("artifacts", "artifacts", {
    page,
    page_size: pageSize,
    q: filters?.q,
    city_id: filters?.cityId,
    rarity: filters?.rarity,
  });
}

export function useCreateAdminArtifact() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: AdminArtifactInput) =>
      request<AdminArtifact>("/admin/artifacts", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => invalidate(queryClient, "artifacts"),
  });
}

export function useUpdateAdminArtifact() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<AdminArtifactInput> }) =>
      request<AdminArtifact>(`/admin/artifacts/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    onSuccess: () => invalidate(queryClient, "artifacts"),
  });
}

export function useDeleteAdminArtifact() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => request<void>(`/admin/artifacts/${id}`, { method: "DELETE" }),
    onSuccess: () => invalidate(queryClient, "artifacts"),
  });
}

// ─── Quests ──────────────────────────────────────────────────────────────────

export type AdminQuestInput = Omit<AdminQuest, "id" | "created_at">;

export function useAdminQuests(
  page = 1,
  pageSize = 20,
  filters?: { q?: string; cityId?: string; difficulty?: string; category?: string }
) {
  return useAdminList<AdminQuest>("quests", "quests", {
    page,
    page_size: pageSize,
    q: filters?.q,
    city_id: filters?.cityId,
    difficulty: filters?.difficulty,
    category: filters?.category,
  });
}

export function useCreateAdminQuest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<AdminQuestInput>) =>
      request<AdminQuest>("/admin/quests", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => invalidate(queryClient, "quests"),
  });
}

export function useUpdateAdminQuest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<AdminQuestInput> }) =>
      request<AdminQuest>(`/admin/quests/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    onSuccess: () => invalidate(queryClient, "quests"),
  });
}

export function useDeleteAdminQuest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => request<void>(`/admin/quests/${id}`, { method: "DELETE" }),
    onSuccess: () => invalidate(queryClient, "quests"),
  });
}

// ─── Gallery images ──────────────────────────────────────────────────────────

export type AdminGalleryImageInput = Omit<AdminGalleryImage, "id" | "created_at">;

export function useAdminGalleryImages(params: { page?: number; pageSize?: number; language?: string; cityId?: string; q?: string }) {
  return useAdminList<AdminGalleryImage>("gallery-images", "gallery-images", {
    page: params.page ?? 1,
    page_size: params.pageSize ?? 20,
    language: params.language,
    city_id: params.cityId,
    q: params.q,
  });
}

export function useCreateAdminGalleryImage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: AdminGalleryImageInput) =>
      request<AdminGalleryImage>("/admin/gallery-images", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => invalidate(queryClient, "gallery-images"),
  });
}

export function useUpdateAdminGalleryImage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<AdminGalleryImageInput> }) =>
      request<AdminGalleryImage>(`/admin/gallery-images/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    onSuccess: () => invalidate(queryClient, "gallery-images"),
  });
}

export function useDeleteAdminGalleryImage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => request<void>(`/admin/gallery-images/${id}`, { method: "DELETE" }),
    onSuccess: () => invalidate(queryClient, "gallery-images"),
  });
}

// ─── Homepage content ────────────────────────────────────────────────────────

export type AdminHomepageContentInput = Omit<AdminHomepageContent, "id" | "created_at">;

export function useAdminHomepageContent(params: { page?: number; pageSize?: number; section?: string; language?: string; q?: string }) {
  return useAdminList<AdminHomepageContent>("homepage-content", "homepage-content", {
    page: params.page ?? 1,
    page_size: params.pageSize ?? 50,
    section: params.section,
    language: params.language,
    q: params.q,
  });
}

export function useCreateAdminHomepageContent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: AdminHomepageContentInput) =>
      request<AdminHomepageContent>("/admin/homepage-content", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => invalidate(queryClient, "homepage-content"),
  });
}

export function useUpdateAdminHomepageContent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<AdminHomepageContentInput> }) =>
      request<AdminHomepageContent>(`/admin/homepage-content/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    onSuccess: () => invalidate(queryClient, "homepage-content"),
  });
}

export function useDeleteAdminHomepageContent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => request<void>(`/admin/homepage-content/${id}`, { method: "DELETE" }),
    onSuccess: () => invalidate(queryClient, "homepage-content"),
  });
}

// ─── Gamification & system settings ─────────────────────────────────────────

export function useAdminGamificationSettings(page = 1, pageSize = 50) {
  return useAdminList<AdminGamificationSetting>("gamification-settings", "gamification-settings", {
    page,
    page_size: pageSize,
  });
}

export function useCreateAdminGamificationSetting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { key: string; value: string }) =>
      request<AdminGamificationSetting>("/admin/gamification-settings", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => invalidate(queryClient, "gamification-settings"),
  });
}

export function useUpdateAdminGamificationSetting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, value }: { id: string; value: string }) =>
      request<AdminGamificationSetting>(`/admin/gamification-settings/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ value }),
      }),
    onSuccess: () => invalidate(queryClient, "gamification-settings"),
  });
}

export function useDeleteAdminGamificationSetting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => request<void>(`/admin/gamification-settings/${id}`, { method: "DELETE" }),
    onSuccess: () => invalidate(queryClient, "gamification-settings"),
  });
}

export function useAdminSystemSettings(page = 1, pageSize = 50) {
  return useAdminList<AdminSystemSetting>("system-settings", "system-settings", { page, page_size: pageSize });
}

export function useCreateAdminSystemSetting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { key: string; value: string }) =>
      request<AdminSystemSetting>("/admin/system-settings", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => invalidate(queryClient, "system-settings"),
  });
}

export function useUpdateAdminSystemSetting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, value }: { id: string; value: string }) =>
      request<AdminSystemSetting>(`/admin/system-settings/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ value }),
      }),
    onSuccess: () => invalidate(queryClient, "system-settings"),
  });
}

export function useDeleteAdminSystemSetting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => request<void>(`/admin/system-settings/${id}`, { method: "DELETE" }),
    onSuccess: () => invalidate(queryClient, "system-settings"),
  });
}

export function useAdminSystemPrompt() {
  return useQuery({
    queryKey: ["admin", "system-prompt"],
    queryFn: () => request<AdminSystemPrompt>("/admin/system-settings/ai-system-prompt"),
  });
}

export function useUpdateAdminSystemPrompt() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (value: string) =>
      request<AdminSystemPrompt>("/admin/system-settings/ai-system-prompt", {
        method: "PUT",
        body: JSON.stringify({ value }),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "system-prompt"] }),
  });
}

// ─── Historical documents ────────────────────────────────────────────────────

export type AdminHistoricalDocumentInput = Omit<
  AdminHistoricalDocument,
  "id" | "created_at" | "embedded_chunks"
>;

export function useAdminHistoricalDocuments(
  page = 1,
  pageSize = 20,
  filters?: { q?: string; cityId?: string; sourceType?: string; language?: string }
) {
  return useAdminList<AdminHistoricalDocument>("historical-documents", "historical-documents", {
    page,
    page_size: pageSize,
    q: filters?.q,
    city_id: filters?.cityId,
    source_type: filters?.sourceType,
    language: filters?.language,
  });
}

export interface AdminHistoricalDocumentUploadInput {
  file: File;
  source: string;
  source_type: string;
  language: string;
  title?: string;
  author?: string;
  year?: string;
  city_id?: string | null;
  group_key?: string | null;
}

export function useUploadAdminHistoricalDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: AdminHistoricalDocumentUploadInput) => {
      const formData = new FormData();
      formData.append("file", input.file);
      formData.append("source", input.source);
      formData.append("source_type", input.source_type);
      formData.append("language", input.language);
      if (input.title) formData.append("title", input.title);
      if (input.author) formData.append("author", input.author);
      if (input.year) formData.append("year", input.year);
      if (input.city_id) formData.append("city_id", input.city_id);
      if (input.group_key) formData.append("group_key", input.group_key);
      return request<AdminHistoricalDocument>("/admin/historical-documents/upload", {
        method: "POST",
        body: formData,
      });
    },
    onSuccess: () => invalidate(queryClient, "historical-documents"),
  });
}

export function useCreateAdminHistoricalDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: AdminHistoricalDocumentInput) =>
      request<AdminHistoricalDocument>("/admin/historical-documents", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => invalidate(queryClient, "historical-documents"),
  });
}

export function useUpdateAdminHistoricalDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<AdminHistoricalDocumentInput> }) =>
      request<AdminHistoricalDocument>(`/admin/historical-documents/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    onSuccess: () => invalidate(queryClient, "historical-documents"),
  });
}

export function useDeleteAdminHistoricalDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => request<void>(`/admin/historical-documents/${id}`, { method: "DELETE" }),
    onSuccess: () => invalidate(queryClient, "historical-documents"),
  });
}

// ─── Certificates ────────────────────────────────────────────────────────────

export type AdminCertificateInput = Omit<ApiCertificate, "id" | "created_at">;

export function useAdminCertificates(page = 1, pageSize = 20, q?: string) {
  return useAdminList<ApiCertificate>("certificates", "certificates", { page, page_size: pageSize, q });
}

export function useCreateAdminCertificate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: AdminCertificateInput) =>
      request<ApiCertificate>("/admin/certificates", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => invalidate(queryClient, "certificates"),
  });
}

export function useUpdateAdminCertificate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Pick<AdminCertificateInput, "title" | "description" | "completion_percent">> }) =>
      request<ApiCertificate>(`/admin/certificates/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    onSuccess: () => invalidate(queryClient, "certificates"),
  });
}

export function useDeleteAdminCertificate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => request<void>(`/admin/certificates/${id}`, { method: "DELETE" }),
    onSuccess: () => invalidate(queryClient, "certificates"),
  });
}

// ─── Achievements ────────────────────────────────────────────────────────────

export type AdminAchievementInput = Omit<ApiAchievement, "id" | "reward_xp" | "reward_coins" | "achieved_at">;

export function useAdminAchievements(page = 1, pageSize = 20, q?: string) {
  return useAdminList<ApiAchievement>("achievements", "achievements", { page, page_size: pageSize, q });
}

export function useCreateAdminAchievement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: AdminAchievementInput) =>
      request<ApiAchievement>("/admin/achievements", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => invalidate(queryClient, "achievements"),
  });
}

export function useUpdateAdminAchievement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Pick<AdminAchievementInput, "title" | "description" | "icon_url">> }) =>
      request<ApiAchievement>(`/admin/achievements/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    onSuccess: () => invalidate(queryClient, "achievements"),
  });
}

export function useDeleteAdminAchievement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => request<void>(`/admin/achievements/${id}`, { method: "DELETE" }),
    onSuccess: () => invalidate(queryClient, "achievements"),
  });
}

// ─── Achievement definitions (catalog) ───────────────────────────────────────

export type AdminAchievementDefinitionInput = Omit<AdminAchievementDefinition, "id" | "created_at">;

export function useAdminAchievementDefinitions(
  page = 1,
  pageSize = 50,
  filters?: { q?: string; metric?: string; isActive?: boolean }
) {
  return useAdminList<AdminAchievementDefinition>("achievement-definitions", "achievement-definitions", {
    page,
    page_size: pageSize,
    q: filters?.q,
    metric: filters?.metric,
    is_active: filters?.isActive,
  });
}

export function useCreateAdminAchievementDefinition() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: AdminAchievementDefinitionInput) =>
      request<AdminAchievementDefinition>("/admin/achievement-definitions", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => invalidate(queryClient, "achievement-definitions"),
  });
}

export function useUpdateAdminAchievementDefinition() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<AdminAchievementDefinitionInput> }) =>
      request<AdminAchievementDefinition>(`/admin/achievement-definitions/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    onSuccess: () => invalidate(queryClient, "achievement-definitions"),
  });
}

export function useDeleteAdminAchievementDefinition() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => request<void>(`/admin/achievement-definitions/${id}`, { method: "DELETE" }),
    onSuccess: () => invalidate(queryClient, "achievement-definitions"),
  });
}

// ─── Suggested prompts ───────────────────────────────────────────────────────

export type AdminSuggestedPromptInput = Omit<AdminSuggestedPrompt, "id" | "created_at">;

export function useAdminSuggestedPrompts(
  page = 1,
  pageSize = 50,
  filters?: { q?: string; language?: string; isActive?: boolean }
) {
  return useAdminList<AdminSuggestedPrompt>("suggested-prompts", "suggested-prompts", {
    page,
    page_size: pageSize,
    q: filters?.q,
    language: filters?.language,
    is_active: filters?.isActive,
  });
}

export function useCreateAdminSuggestedPrompt() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: AdminSuggestedPromptInput) =>
      request<AdminSuggestedPrompt>("/admin/suggested-prompts", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => invalidate(queryClient, "suggested-prompts"),
  });
}

export function useUpdateAdminSuggestedPrompt() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<AdminSuggestedPromptInput> }) =>
      request<AdminSuggestedPrompt>(`/admin/suggested-prompts/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    onSuccess: () => invalidate(queryClient, "suggested-prompts"),
  });
}

export function useDeleteAdminSuggestedPrompt() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => request<void>(`/admin/suggested-prompts/${id}`, { method: "DELETE" }),
    onSuccess: () => invalidate(queryClient, "suggested-prompts"),
  });
}

// ─── Uploads ─────────────────────────────────────────────────────────────────

export function useUploadAdminImage() {
  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      return request<AdminUploadResult>("/admin/upload", { method: "POST", body: formData });
    },
  });
}

export function useDeleteAdminUpload() {
  return useMutation({
    mutationFn: (key: string) => request<void>(`/admin/upload/${encodeURIComponent(key)}`, { method: "DELETE" }),
  });
}
