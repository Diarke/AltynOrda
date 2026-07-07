import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { DEFAULT_LANGUAGE } from "./i18n";

const API_BASE_URL = (import.meta.env.VITE_API_URL || "http://localhost:8000/api/v1").replace(/\/$/, "");
const AUTH_STORAGE_KEY = "orda-auth";

export interface ApiTokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export type ApiLanguage = "kk" | "ru" | "en";

export interface ApiUser {
  id: string;
  email: string;
  username: string;
  full_name: string | null;
  role: "guest" | "user" | "admin";
  is_active: boolean;
  bio?: string | null;
  avatar_url?: string | null;
  language: ApiLanguage;
  created_at: string;
}

export interface ApiCity {
  id: string;
  name: string;
  slug: string;
  description: string;
  historical_period: string;
  latitude: number;
  longitude: number;
  image_url?: string | null;
  population_estimate?: string | null;
  significance?: string | null;
  historical_facts?: string[] | null;
  trade_info?: string | null;
  created_at: string;
}

export interface ApiCityGalleryImage {
  id: string;
  title?: string | null;
  description?: string | null;
  image_url: string;
  alt_text?: string | null;
  sort_order: number;
}

export interface ApiSuggestedPrompt {
  id: string;
  prompt_text: string;
  language: ApiLanguage;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export interface ApiHomepageContent {
  id: string;
  section: string;
  language: ApiLanguage;
  title?: string | null;
  body?: string | null;
  image_url?: string | null;
  cta_text?: string | null;
  cta_url?: string | null;
  sort_order: number;
}

export interface ApiArtifact {
  id: string;
  city_id: string;
  name: string;
  description: string;
  era: string;
  rarity: string;
  image_url?: string | null;
  historical_context?: string | null;
  created_at: string;
}

export interface ApiQuest {
  id: string;
  city_id: string;
  title: string;
  description: string;
  difficulty: string;
  points: number;
  xp_reward: number;
  coin_reward: number;
  cooldown_hours: number;
  estimated_time_minutes: number;
  category: string;
  status: string;
  completion_status: string;
  cooldown_until?: string | null;
  created_at: string;
}

export interface ApiProgressSummary {
  total_completed: number;
  total_in_progress: number;
  completion_percent: number;
  records: Array<{
    id: string;
    user_id: string;
    entity_type: string;
    entity_id: string;
    status: string;
    score: number;
    completed_at?: string | null;
    cooldown_until?: string | null;
    notes?: string | null;
    created_at: string;
    updated_at: string;
  }>;
}

export interface ApiProgressStats {
  user_id: string;
  level: number;
  title: string;
  xp: number;
  coins: number;
  streak_days: number;
  unlocks: Record<string, string[]>;
}

export interface ApiAchievement {
  id: string;
  user_id: string;
  achievement_type: string;
  title: string;
  description: string;
  icon_url?: string | null;
  reward_xp: number;
  reward_coins: number;
  achieved_at?: string | null;
}

export interface ApiCertificate {
  id: string;
  user_id: string;
  title: string;
  description: string;
  completion_percent: number;
  certificate_code: string;
  issued_at: string;
  created_at: string;
}

export interface ApiHistoricalFigure {
  id: string;
  name: string;
  title: string;
  description: string;
  era: string;
  significance?: string | null;
  image_url?: string | null;
  city_id?: string | null;
  sort_order: number;
  created_at: string;
}

export interface ApiSearchResultItem {
  id: string;
  type: "city" | "artifact" | "quest" | "historical_figure" | "suggested_prompt";
  title: string;
  subtitle?: string | null;
  city_id?: string | null;
}

export interface ApiGlobalSearchResponse {
  cities: ApiSearchResultItem[];
  artifacts: ApiSearchResultItem[];
  quests: ApiSearchResultItem[];
  historical_figures: ApiSearchResultItem[];
  suggested_prompts: ApiSearchResultItem[];
}

export interface ApiNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  entity_type: string | null;
  entity_id: string | null;
  is_read: boolean;
  created_at: string;
}

export interface ApiUnreadCount {
  unread_count: number;
}

export interface ApiChatResponse {
  answer: string;
  sources: Array<{
    document_title: string;
    chunk_text: string;
    similarity: number;
  }>;
  verified: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    page_size: number;
    total: number;
    total_pages: number;
  };
}

interface AuthSession {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

// "Remember me" controls which storage backend holds the session: localStorage
// survives browser restarts, sessionStorage is cleared when the tab/browser closes.
function readStorage(storage: Storage): AuthSession | null {
  try {
    const raw = storage.getItem(AUTH_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function getStoredAuth(): AuthSession | null {
  if (typeof window === "undefined") return null;
  return readStorage(window.localStorage) || readStorage(window.sessionStorage);
}

function isRemembered(): boolean {
  if (typeof window === "undefined") return true;
  return Boolean(readStorage(window.localStorage));
}

function persistAuth(session: AuthSession | null, remember = true) {
  if (typeof window === "undefined") return;
  if (session) {
    const target = remember ? window.localStorage : window.sessionStorage;
    const other = remember ? window.sessionStorage : window.localStorage;
    target.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
    other.removeItem(AUTH_STORAGE_KEY);
    return;
  }
  window.localStorage.removeItem(AUTH_STORAGE_KEY);
  window.sessionStorage.removeItem(AUTH_STORAGE_KEY);
}

export function getAccessToken() {
  return getStoredAuth()?.access_token ?? null;
}

export function setAuthSession(session: AuthSession, remember = true) {
  persistAuth(session, remember);
}

export function clearAuthSession() {
  persistAuth(null);
}

async function parseJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  if (!text) return {} as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    return {} as T;
  }
}

export async function request<T>(path: string, init: RequestInit = {}, requireAuth = true): Promise<T> {
  const headers = new Headers(init.headers);
  // Let the browser set the multipart boundary itself for FormData bodies.
  if (!(init.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const session = getStoredAuth();
  if (requireAuth && session?.access_token) {
    headers.set("Authorization", `Bearer ${session.access_token}`);
  }

  let response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
    credentials: "include",
  });

  if (response.status === 401 && requireAuth && session?.refresh_token) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      const nextSession = getStoredAuth();
      if (nextSession?.access_token) {
        headers.set("Authorization", `Bearer ${nextSession.access_token}`);
        response = await fetch(`${API_BASE_URL}${path}`, {
          ...init,
          headers,
          credentials: "include",
        });
      }
    }
  }

  const payload = await parseJson<Record<string, unknown>>(response);
  if (!response.ok) {
    const message =
      (payload?.message as string | undefined) ||
      (payload?.detail as string | undefined) ||
      "Request failed";
    throw new Error(message);
  }

  if (payload && typeof payload === "object" && "data" in payload) {
    const data = payload.data as T;
    if (payload && typeof payload === "object" && "meta" in payload) {
      return payload as T;
    }
    return data as T;
  }

  return payload as T;
}

async function refreshAccessToken(): Promise<boolean> {
  const session = getStoredAuth();
  if (!session?.refresh_token) return false;
  try {
    const payload = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ refresh_token: session.refresh_token }),
    }).then((res) => res.json());
    const nextSession = payload?.data as AuthSession | undefined;
    if (nextSession?.access_token && nextSession.refresh_token) {
      setAuthSession(nextSession, isRemembered());
      return true;
    }
  } catch {
    clearAuthSession();
  }
  return false;
}

export async function registerUser(input: { email: string; username: string; password: string; full_name?: string | null; rememberMe?: boolean }) {
  const { rememberMe = true, ...body } = input;
  const payload = await request<{ access_token: string; refresh_token: string; token_type: string }>("/auth/register", {
    method: "POST",
    body: JSON.stringify(body),
  }, false);
  setAuthSession(payload, rememberMe);
  return payload;
}

export async function loginUser(input: { email: string; password: string; rememberMe?: boolean }) {
  const { rememberMe = true, ...body } = input;
  const payload = await request<{ access_token: string; refresh_token: string; token_type: string }>("/auth/login", {
    method: "POST",
    body: JSON.stringify(body),
  }, false);
  setAuthSession(payload, rememberMe);
  return payload;
}

export async function logoutUser() {
  try {
    await request<void>("/auth/logout", { method: "POST" });
  } finally {
    clearAuthSession();
  }
}

export async function getCurrentUser() {
  return request<ApiUser>("/users/me");
}

export async function updateProfileUser(input: { full_name?: string | null; bio?: string | null; language?: ApiLanguage }) {
  return request<ApiUser>("/users/me", {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function uploadAvatar(file: File) {
  const formData = new FormData();
  formData.append("file", file);
  return request<ApiUser>("/users/me/avatar", {
    method: "POST",
    body: formData,
  });
}

export async function listCities(page = 1, pageSize = 20, language: ApiLanguage = "kk") {
  return request<PaginatedResponse<ApiCity>>(`/cities?page=${page}&page_size=${pageSize}&language=${language}`);
}

export async function getCity(cityId: string, language: ApiLanguage = "kk") {
  return request<ApiCity>(`/cities/${cityId}?language=${language}`);
}

export async function getCityGallery(cityId: string, language: ApiLanguage) {
  return request<ApiCityGalleryImage[]>(`/cities/${cityId}/gallery?language=${language}`);
}

export async function getSuggestedPrompts(language: ApiLanguage) {
  return request<ApiSuggestedPrompt[]>(`/chat/suggested-prompts?language=${language}`);
}

export async function getHomepageContent(section: string, language: ApiLanguage) {
  return request<ApiHomepageContent[]>(`/homepage-content?section=${section}&language=${language}`);
}

export async function listArtifacts(page = 1, pageSize = 20, language: ApiLanguage = "kk") {
  return request<PaginatedResponse<ApiArtifact>>(`/artifacts?page=${page}&page_size=${pageSize}&language=${language}`);
}

export async function listQuests(page = 1, pageSize = 20, language: ApiLanguage = "kk") {
  return request<PaginatedResponse<ApiQuest>>(`/quests?page=${page}&page_size=${pageSize}&language=${language}`);
}

export async function getProgressSummary() {
  return request<ApiProgressSummary>("/progress");
}

export async function getProgressStats(language: ApiLanguage = "kk") {
  return request<ApiProgressStats>(`/progress/stats?language=${language}`);
}

export async function listAchievements(language: ApiLanguage = "kk") {
  return request<ApiAchievement[]>(`/progress/achievements?language=${language}`);
}

export async function completeQuest(questId: string) {
  return request<{ success: boolean; message: string; xp_gained: number; coins_gained: number; level: number; unlocks: Record<string, string[]> }>(`/progress/quests/${questId}/complete`, {
    method: "POST",
  });
}

export async function listCertificates(language: ApiLanguage = "kk") {
  return request<ApiCertificate[]>(`/certificates?language=${language}`);
}

export async function issueCertificate(input: { title?: string }) {
  return request<ApiCertificate>("/certificates", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function chatWithHistorian(message: string, cityId?: string | null, language?: ApiLanguage) {
  return request<ApiChatResponse>("/chat", {
    method: "POST",
    body: JSON.stringify({ message, city_id: cityId, language }),
  });
}

export async function getHistoricalFigure(figureId: string) {
  return request<ApiHistoricalFigure>(`/historical-figures/${figureId}`);
}

export async function globalSearch(query: string, language: ApiLanguage) {
  return request<ApiGlobalSearchResponse>(
    `/search?q=${encodeURIComponent(query)}&language=${language}`
  );
}

export async function listNotifications(
  page = 1,
  pageSize = 30,
  unreadOnly = false,
  language: ApiLanguage = "kk"
) {
  return request<PaginatedResponse<ApiNotification>>(
    `/notifications?page=${page}&page_size=${pageSize}&unread_only=${unreadOnly}&language=${language}`
  );
}

export async function getUnreadNotificationCount() {
  return request<ApiUnreadCount>("/notifications/unread-count");
}

export async function markNotificationRead(notificationId: string) {
  return request<ApiNotification>(`/notifications/${notificationId}/read`, {
    method: "POST",
  });
}

export async function markAllNotificationsRead() {
  return request<null>("/notifications/read-all", { method: "POST" });
}

export async function deleteNotification(notificationId: string) {
  return request<null>(`/notifications/${notificationId}`, { method: "DELETE" });
}

export function useAuthSession() {
  const queryClient = useQueryClient();
  const profileQuery = useQuery({
    queryKey: ["auth", "me"],
    queryFn: getCurrentUser,
    enabled: Boolean(getAccessToken()),
    staleTime: 5 * 60_000,
    retry: 1,
  });

  const loginMutation = useMutation({
    mutationFn: loginUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
      queryClient.invalidateQueries({ queryKey: ["progress"] });
      queryClient.invalidateQueries({ queryKey: ["certificates"] });
    },
  });

  const registerMutation = useMutation({
    mutationFn: registerUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
      queryClient.invalidateQueries({ queryKey: ["progress"] });
      queryClient.invalidateQueries({ queryKey: ["certificates"] });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: logoutUser,
    onSuccess: () => {
      queryClient.clear();
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: updateProfileUser,
    onSuccess: (updatedUser) => {
      queryClient.setQueryData(["auth", "me"], updatedUser);
      queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
    },
  });

  const uploadAvatarMutation = useMutation({
    mutationFn: uploadAvatar,
    onSuccess: (updatedUser) => {
      queryClient.setQueryData(["auth", "me"], updatedUser);
      queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
    },
  });

  return {
    user: profileQuery.data ?? null,
    profileQuery,
    loginMutation,
    registerMutation,
    logoutMutation,
    updateProfileMutation,
    uploadAvatarMutation,
    isAuthenticated: Boolean(getAccessToken()) || profileQuery.isSuccess,
  };
}

export function useCities(page = 1, pageSize = 20) {
  const { i18n } = useTranslation();
  const language = (i18n.resolvedLanguage || DEFAULT_LANGUAGE) as ApiLanguage;
  return useQuery({
    queryKey: ["cities", page, pageSize, language],
    queryFn: () => listCities(page, pageSize, language),
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
    retry: 2,
  });
}

// The list endpoint only returns summary fields (no description/significance/facts/trade
// info) — city detail pages need the full record, fetched separately by id.
export function useCity(cityId: string | undefined) {
  const { i18n } = useTranslation();
  const language = (i18n.resolvedLanguage || DEFAULT_LANGUAGE) as ApiLanguage;
  return useQuery({
    queryKey: ["city", cityId, language],
    queryFn: () => getCity(cityId as string, language),
    enabled: Boolean(cityId),
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
    retry: 1,
  });
}

export function useCityGallery(cityId: string | undefined, language: ApiLanguage) {
  return useQuery({
    queryKey: ["city-gallery", cityId, language],
    queryFn: () => getCityGallery(cityId as string, language),
    enabled: Boolean(cityId),
    staleTime: 10 * 60_000,
    gcTime: 30 * 60_000,
    retry: 1,
  });
}

export function useSuggestedPrompts(language: ApiLanguage) {
  return useQuery({
    queryKey: ["suggested-prompts", language],
    queryFn: () => getSuggestedPrompts(language),
    staleTime: 10 * 60_000,
    gcTime: 30 * 60_000,
    retry: 1,
  });
}

export function useHomepageContent(section: string, language: ApiLanguage) {
  return useQuery({
    queryKey: ["homepage-content", section, language],
    queryFn: () => getHomepageContent(section, language),
    staleTime: 10 * 60_000,
    gcTime: 30 * 60_000,
    retry: 1,
  });
}

export function useArtifacts(page = 1, pageSize = 20) {
  const { i18n } = useTranslation();
  const language = (i18n.resolvedLanguage || DEFAULT_LANGUAGE) as ApiLanguage;
  return useQuery({
    queryKey: ["artifacts", page, pageSize, language],
    queryFn: () => listArtifacts(page, pageSize, language),
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
    retry: 2,
  });
}

export function useQuests(page = 1, pageSize = 20) {
  const { i18n } = useTranslation();
  const language = (i18n.resolvedLanguage || DEFAULT_LANGUAGE) as ApiLanguage;
  return useQuery({
    queryKey: ["quests", page, pageSize, language],
    queryFn: () => listQuests(page, pageSize, language),
    staleTime: 30_000,
    gcTime: 10 * 60_000,
    retry: 2,
  });
}

export function useProgress(enabled = true) {
  const queryClient = useQueryClient();
  const { i18n } = useTranslation();
  const language = (i18n.resolvedLanguage || DEFAULT_LANGUAGE) as ApiLanguage;
  const summaryQuery = useQuery({
    queryKey: ["progress", "summary"],
    queryFn: getProgressSummary,
    enabled: Boolean(getAccessToken()) && enabled,
    staleTime: 30_000,
    retry: 2,
  });

  const statsQuery = useQuery({
    queryKey: ["progress", "stats", language],
    queryFn: () => getProgressStats(language),
    enabled: Boolean(getAccessToken()) && enabled,
    staleTime: 30_000,
    retry: 2,
  });

  const achievementsQuery = useQuery({
    queryKey: ["progress", "achievements", language],
    queryFn: () => listAchievements(language),
    enabled: Boolean(getAccessToken()) && enabled,
    staleTime: 30_000,
    retry: 2,
  });

  const completeQuestMutation = useMutation({
    mutationFn: completeQuest,
    onMutate: async (questId: string) => {
      await queryClient.cancelQueries({ queryKey: ["progress", "summary"] });
      const previous = queryClient.getQueryData<ApiProgressSummary>(["progress", "summary"]);
      queryClient.setQueryData<ApiProgressSummary | undefined>(["progress", "summary"], (current) => {
        if (!current) return current;
        return {
          ...current,
          total_completed: current.total_completed + 1,
          completion_percent: Math.min(100, current.completion_percent + 2),
          records: current.records.concat({
            id: questId,
            user_id: "optimistic",
            entity_type: "quest",
            entity_id: questId,
            status: "completed",
            score: 10,
            completed_at: new Date().toISOString(),
            cooldown_until: null,
            notes: "Completed optimistically",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }),
        };
      });
      return { previous };
    },
    onError: (_error, _questId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["progress", "summary"], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["progress"] });
      queryClient.invalidateQueries({ queryKey: ["quests"] });
      // Completing a quest can unlock achievements/artifacts server-side, each of
      // which creates a notification — refresh right away instead of waiting for the poll.
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  return {
    summaryQuery,
    statsQuery,
    achievementsQuery,
    completeQuestMutation,
  };
}

export function useCertificates(enabled = true) {
  const queryClient = useQueryClient();
  const { i18n } = useTranslation();
  const language = (i18n.resolvedLanguage || DEFAULT_LANGUAGE) as ApiLanguage;
  const certificatesQuery = useQuery({
    queryKey: ["certificates", language],
    queryFn: () => listCertificates(language),
    enabled: Boolean(getAccessToken()) && enabled,
    staleTime: 5 * 60_000,
    retry: 2,
  });

  const issueCertificateMutation = useMutation({
    mutationFn: issueCertificate,
    onSuccess: (certificate) => {
      queryClient.setQueryData<ApiCertificate[] | undefined>(["certificates"], (current) => {
        if (!current) return [certificate];
        return [certificate, ...current.filter((item) => item.id !== certificate.id)];
      });
      queryClient.invalidateQueries({ queryKey: ["certificates"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  return {
    certificatesQuery,
    issueCertificateMutation,
  };
}

export function useChatMutation() {
  const { i18n } = useTranslation();
  return useMutation({
    mutationFn: ({ message, cityId }: { message: string; cityId?: string | null }) =>
      chatWithHistorian(message, cityId, (i18n.resolvedLanguage || DEFAULT_LANGUAGE) as ApiLanguage),
    retry: 1,
  });
}

export function useHistoricalFigure(figureId: string | undefined) {
  return useQuery({
    queryKey: ["historical-figure", figureId],
    queryFn: () => getHistoricalFigure(figureId as string),
    enabled: Boolean(figureId),
    staleTime: 10 * 60_000,
    gcTime: 30 * 60_000,
    retry: 1,
  });
}

// Debounced by the caller — this hook just fires whenever `query` changes, so
// results stay in sync with keystrokes without re-implementing caching here.
export function useGlobalSearch(query: string, language: ApiLanguage, enabled = true) {
  const trimmed = query.trim();
  return useQuery({
    queryKey: ["search", trimmed, language],
    queryFn: () => globalSearch(trimmed, language),
    enabled: enabled && trimmed.length > 0,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    retry: 0,
  });
}

// Polls on an interval since there is no push/websocket channel from the backend —
// this is what keeps the unread count and list "synchronized" across tabs/devices.
const NOTIFICATIONS_POLL_INTERVAL = 30_000;

export function useNotifications(enabled = true) {
  const queryClient = useQueryClient();
  const { i18n } = useTranslation();
  const language = (i18n.resolvedLanguage || DEFAULT_LANGUAGE) as ApiLanguage;
  const authed = Boolean(getAccessToken()) && enabled;

  const notificationsQuery = useQuery({
    queryKey: ["notifications", "list", language],
    queryFn: () => listNotifications(1, 30, false, language),
    enabled: authed,
    staleTime: 15_000,
    refetchInterval: NOTIFICATIONS_POLL_INTERVAL,
    retry: 1,
  });

  const unreadCountQuery = useQuery({
    queryKey: ["notifications", "unread-count"],
    queryFn: getUnreadNotificationCount,
    enabled: authed,
    staleTime: 15_000,
    refetchInterval: NOTIFICATIONS_POLL_INTERVAL,
    retry: 1,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["notifications"] });

  const markReadMutation = useMutation({
    mutationFn: markNotificationRead,
    onMutate: async (notificationId: string) => {
      queryClient.setQueryData<PaginatedResponse<ApiNotification> | undefined>(
        ["notifications", "list"],
        (current) => {
          if (!current) return current;
          return {
            ...current,
            data: current.data.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n)),
          };
        }
      );
      queryClient.setQueryData<ApiUnreadCount | undefined>(["notifications", "unread-count"], (current) =>
        current ? { unread_count: Math.max(0, current.unread_count - 1) } : current
      );
    },
    onSettled: invalidate,
  });

  const markAllReadMutation = useMutation({
    mutationFn: markAllNotificationsRead,
    onMutate: async () => {
      queryClient.setQueryData<PaginatedResponse<ApiNotification> | undefined>(
        ["notifications", "list"],
        (current) => (current ? { ...current, data: current.data.map((n) => ({ ...n, is_read: true })) } : current)
      );
      queryClient.setQueryData<ApiUnreadCount>(["notifications", "unread-count"], { unread_count: 0 });
    },
    onSettled: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteNotification,
    onMutate: async (notificationId: string) => {
      queryClient.setQueryData<PaginatedResponse<ApiNotification> | undefined>(
        ["notifications", "list"],
        (current) =>
          current ? { ...current, data: current.data.filter((n) => n.id !== notificationId) } : current
      );
    },
    onSettled: invalidate,
  });

  return {
    notificationsQuery,
    unreadCountQuery,
    markReadMutation,
    markAllReadMutation,
    deleteMutation,
  };
}
