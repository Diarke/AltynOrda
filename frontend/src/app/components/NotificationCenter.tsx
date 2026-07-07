import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { Bell, Zap, Award, Package, ScrollText, Compass, Star, X, Check } from "lucide-react";
import { useNotifications, type ApiNotification } from "../lib/api";

const TYPE_ICON: Record<string, typeof Bell> = {
  quest_available: Zap,
  achievement_unlocked: Award,
  artifact_discovered: Package,
  certificate_ready: ScrollText,
  daily_quest_refreshed: Compass,
  daily_reward: Star,
};

const TYPE_TARGET: Record<string, string> = {
  quest_available: "/quests",
  achievement_unlocked: "/passport",
  artifact_discovered: "/artifacts",
  certificate_ready: "/certificate",
  daily_quest_refreshed: "/quests",
  daily_reward: "/passport",
};

function formatRelativeTime(iso: string, locale: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return new Intl.RelativeTimeFormat(locale, { numeric: "auto" }).format(0, "minute");
  if (minutes < 60) return new Intl.RelativeTimeFormat(locale, { numeric: "auto" }).format(-minutes, "minute");
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return new Intl.RelativeTimeFormat(locale, { numeric: "auto" }).format(-hours, "hour");
  const days = Math.floor(hours / 24);
  return new Intl.RelativeTimeFormat(locale, { numeric: "auto" }).format(-days, "day");
}

export function NotificationBell() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const { notificationsQuery, unreadCountQuery, markReadMutation, markAllReadMutation, deleteMutation } =
    useNotifications();

  const unreadCount = unreadCountQuery.data?.unread_count ?? 0;
  const notifications = notificationsQuery.data?.data ?? [];

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleSelect = (notification: ApiNotification) => {
    if (!notification.is_read) markReadMutation.mutate(notification.id);
    const target = TYPE_TARGET[notification.type];
    if (target) {
      navigate(target);
      setOpen(false);
    }
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative w-9 h-9 rounded-full flex items-center justify-center"
        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
      >
        <Bell size={15} color="#B7BAC3" />
        {unreadCount > 0 && (
          <span
            className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center text-[10px] font-bold leading-none"
            style={{ background: "#57D6D1", color: "#0F1115", border: "2px solid #0F1115" }}
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 top-12 w-[360px] rounded-[16px] overflow-hidden animate-scale-in z-[70]"
          style={{ background: "#171A20", border: "1px solid rgba(212,175,55,0.15)", boxShadow: "0 20px 60px rgba(0,0,0,0.5)" }}
        >
          <div className="flex items-center justify-between px-4 h-11 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
            <span className="orda-cinzel text-xs tracking-widest text-[#F6F4EC]">{t("notificationCenter.title")}</span>
            {unreadCount > 0 && (
              <button
                onClick={() => markAllReadMutation.mutate()}
                className="flex items-center gap-1 text-[11px] orda-inter text-[#D4AF37] hover:text-[#F6F4EC] transition-colors"
              >
                <Check size={11} /> {t("notificationCenter.markAllRead")}
              </button>
            )}
          </div>

          <div className="max-h-[400px] overflow-y-auto">
            {notificationsQuery.isLoading ? (
              <div className="p-3 space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-14 rounded-[12px]" style={{ background: "rgba(255,255,255,0.04)" }} />
                ))}
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-10 text-center px-6">
                <Bell size={20} color="#4A4D57" className="mx-auto mb-3" />
                <p className="orda-inter text-xs text-[#6B6E77]">{t("notificationCenter.empty")}</p>
              </div>
            ) : (
              <div className="p-2">
                {notifications.map((notification) => {
                  const Icon = TYPE_ICON[notification.type] ?? Bell;
                  return (
                    <div
                      key={notification.id}
                      className="group relative flex items-start gap-3 px-3 py-2.5 rounded-[12px] cursor-pointer transition-colors hover:bg-white/[0.03]"
                      onClick={() => handleSelect(notification)}
                    >
                      <div
                        className="w-8 h-8 rounded-[10px] flex items-center justify-center flex-shrink-0 mt-0.5"
                        style={{
                          background: notification.is_read ? "rgba(255,255,255,0.04)" : "rgba(212,175,55,0.12)",
                          border: `1px solid ${notification.is_read ? "rgba(255,255,255,0.06)" : "rgba(212,175,55,0.25)"}`,
                        }}
                      >
                        <Icon size={14} color={notification.is_read ? "#B7BAC3" : "#D4AF37"} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="orda-inter text-sm text-[#F6F4EC] truncate">{notification.title}</span>
                          {!notification.is_read && <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: "#57D6D1" }} />}
                        </div>
                        <p className="orda-inter text-[11px] text-[#B7BAC3] leading-relaxed line-clamp-2">{notification.message}</p>
                        <span className="orda-inter text-[10px] text-[#6B6E77]">
                          {formatRelativeTime(notification.created_at, i18n.resolvedLanguage || "en")}
                        </span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteMutation.mutate(notification.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity w-6 h-6 rounded-lg flex items-center justify-center hover:bg-white/5 flex-shrink-0"
                        aria-label={t("notificationCenter.delete")}
                      >
                        <X size={12} color="#B7BAC3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
