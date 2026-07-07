import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import {
  Search, X, MapPin, Package, Zap, Users, MessageSquare, ChevronRight, ArrowLeft,
} from "lucide-react";
import { DEFAULT_LANGUAGE } from "../lib/i18n";
import { useGlobalSearch, useHistoricalFigure, type ApiLanguage, type ApiSearchResultItem } from "../lib/api";

type SearchCategory = "cities" | "artifacts" | "quests" | "historical_figures" | "suggested_prompts";

const CATEGORY_ICONS: Record<SearchCategory, typeof MapPin> = {
  cities: MapPin,
  artifacts: Package,
  quests: Zap,
  historical_figures: Users,
  suggested_prompts: MessageSquare,
};

interface GlobalSearchProps {
  open: boolean;
  onClose: () => void;
}

/** Bell-style trigger button that owns its own open state and the Ctrl/Cmd+K
 * shortcut, so dropping it into the navbar is a single self-contained unit. */
export function GlobalSearchTrigger() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handler = (e: globalThis.KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title={t("search.shortcutHint")}
        className="w-9 h-9 rounded-full flex items-center justify-center transition-colors"
        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
      >
        <Search size={15} color="#B7BAC3" />
      </button>
      <GlobalSearch open={open} onClose={() => setOpen(false)} />
    </>
  );
}

function GlobalSearch({ open, onClose }: GlobalSearchProps) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const language = (i18n.resolvedLanguage || DEFAULT_LANGUAGE) as ApiLanguage;

  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [figureId, setFigureId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data, isLoading, isFetching } = useGlobalSearch(debouncedQuery, language, open);
  const { data: figure, isLoading: figureLoading } = useHistoricalFigure(figureId ?? undefined);

  // Every keystroke re-arms a short timer so the request fires once typing
  // pauses — short enough that results still feel instant, not laggy.
  useEffect(() => {
    const handle = setTimeout(() => setDebouncedQuery(query), 200);
    return () => clearTimeout(handle);
  }, [query]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setDebouncedQuery("");
      setActiveIndex(0);
      setFigureId(null);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  useEffect(() => {
    setActiveIndex(0);
  }, [data]);

  const sections = useMemo(() => {
    const order: [SearchCategory, ApiSearchResultItem[]][] = [
      ["cities", data?.cities ?? []],
      ["artifacts", data?.artifacts ?? []],
      ["quests", data?.quests ?? []],
      ["historical_figures", data?.historical_figures ?? []],
      ["suggested_prompts", data?.suggested_prompts ?? []],
    ];
    let counter = 0;
    return order
      .filter(([, items]) => items.length > 0)
      .map(([category, items]) => {
        const startIndex = counter;
        counter += items.length;
        return { category, items, startIndex };
      });
  }, [data]);

  const totalResults = sections.reduce((sum, s) => sum + s.items.length, 0);

  const selectResult = (category: SearchCategory, item: ApiSearchResultItem) => {
    switch (category) {
      case "cities":
        navigate(`/city/${item.id}`);
        onClose();
        break;
      case "artifacts":
        navigate("/artifacts", { state: { selectedArtifactId: item.id } });
        onClose();
        break;
      case "quests":
        navigate("/quests", { state: { selectedQuestId: item.id } });
        onClose();
        break;
      case "suggested_prompts":
        navigate("/ai", { state: { prefillPrompt: item.title } });
        onClose();
        break;
      case "historical_figures":
        setFigureId(item.id);
        break;
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      if (figureId) setFigureId(null);
      else onClose();
      return;
    }
    if (figureId) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, Math.max(totalResults - 1, 0)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const flat = sections.flatMap((s) => s.items.map((item) => ({ category: s.category, item })));
      const target = flat[activeIndex];
      if (target) selectResult(target.category, target.item);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-start justify-center px-4 pt-[12vh]"
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(12px)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl rounded-[20px] overflow-hidden animate-scale-in"
        style={{ background: "#171A20", border: "1px solid rgba(212,175,55,0.15)", boxShadow: "0 0 80px rgba(212,175,55,0.1)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Input row */}
        <div className="flex items-center gap-3 px-5 h-14 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
          {figureId ? (
            <button onClick={() => setFigureId(null)} className="flex-shrink-0" aria-label={t("common.back")}>
              <ArrowLeft size={16} color="#B7BAC3" />
            </button>
          ) : (
            <Search size={16} color="#B7BAC3" className="flex-shrink-0" />
          )}
          {!figureId && (
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t("search.placeholder")}
              className="flex-1 bg-transparent outline-none orda-inter text-sm text-[#F6F4EC] placeholder:text-[#6B6E77]"
            />
          )}
          {figureId && <span className="flex-1 orda-cinzel text-sm text-[#F6F4EC]">{t("search.categories.historicalFigures")}</span>}
          <button onClick={onClose} className="flex-shrink-0 w-6 h-6 rounded-lg flex items-center justify-center hover:bg-white/5" aria-label={t("search.close")}>
            <X size={13} color="#B7BAC3" />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-[60vh] overflow-y-auto p-2">
          {figureId ? (
            <FigureDetail figure={figure} loading={figureLoading} />
          ) : debouncedQuery.trim().length === 0 ? (
            <div className="py-10 text-center px-6">
              <Search size={22} color="#4A4D57" className="mx-auto mb-3" />
              <p className="orda-inter text-xs text-[#6B6E77]">{t("search.emptyPrompt")}</p>
            </div>
          ) : isLoading || isFetching ? (
            <div className="space-y-2 p-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-11 rounded-[12px]" style={{ background: "rgba(255,255,255,0.04)" }} />
              ))}
            </div>
          ) : totalResults === 0 ? (
            <div className="py-10 text-center px-6">
              <p className="orda-inter text-sm text-[#B7BAC3]">{t("search.noResults", { query: debouncedQuery })}</p>
            </div>
          ) : (
            sections.map(({ category, items, startIndex }) => (
              <div key={category} className="mb-2">
                <div className="px-3 pt-2 pb-1 text-[10px] orda-cinzel tracking-widest text-[#6B6E77]">
                  {t(`search.categories.${categoryLabelKey(category)}`)}
                </div>
                {items.map((item, i) => {
                  const globalIndex = startIndex + i;
                  const Icon = CATEGORY_ICONS[category];
                  const isActive = globalIndex === activeIndex;
                  return (
                    <button
                      key={item.id}
                      onMouseEnter={() => setActiveIndex(globalIndex)}
                      onClick={() => selectResult(category, item)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-[12px] text-left transition-colors"
                      style={{ background: isActive ? "rgba(212,175,55,0.1)" : "transparent" }}
                    >
                      <div className="w-8 h-8 rounded-[10px] flex items-center justify-center flex-shrink-0"
                        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
                        <Icon size={14} color={isActive ? "#D4AF37" : "#B7BAC3"} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="orda-inter text-sm text-[#F6F4EC] truncate">{item.title}</div>
                        {item.subtitle && <div className="orda-inter text-[11px] text-[#6B6E77] truncate">{item.subtitle}</div>}
                      </div>
                      <ChevronRight size={13} color="#4A4D57" className="flex-shrink-0" />
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        <div className="flex items-center justify-between px-5 h-10 border-t text-[10px] orda-inter text-[#6B6E77]"
          style={{ borderColor: "rgba(255,255,255,0.06)" }}>
          <span>{t("search.hintNavigate")}</span>
          <span>{t("search.hintClose")}</span>
        </div>
      </div>
    </div>
  );
}

function categoryLabelKey(category: SearchCategory): string {
  switch (category) {
    case "cities": return "cities";
    case "artifacts": return "artifacts";
    case "quests": return "quests";
    case "historical_figures": return "historicalFigures";
    case "suggested_prompts": return "suggestedPrompts";
  }
}

function FigureDetail({ figure, loading }: { figure: { name: string; title: string; description: string; era: string; significance?: string | null; image_url?: string | null } | undefined; loading: boolean }) {
  const { t } = useTranslation();
  if (loading || !figure) {
    return (
      <div className="p-4 space-y-3">
        <div className="h-4 w-40 rounded-full" style={{ background: "rgba(255,255,255,0.05)" }} />
        <div className="h-3 w-24 rounded-full" style={{ background: "rgba(255,255,255,0.05)" }} />
        <div className="h-16 rounded-[12px]" style={{ background: "rgba(255,255,255,0.04)" }} />
      </div>
    );
  }
  return (
    <div className="p-4">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-11 h-11 rounded-[12px] flex items-center justify-center overflow-hidden flex-shrink-0"
          style={{ background: "rgba(212,175,55,0.1)", border: "1px solid rgba(212,175,55,0.2)" }}>
          {figure.image_url ? (
            <img src={figure.image_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <Users size={18} color="#D4AF37" />
          )}
        </div>
        <div>
          <div className="orda-cinzel text-sm font-semibold text-[#F6F4EC]">{figure.name}</div>
          <div className="orda-inter text-[11px] text-[#B7BAC3]">{figure.title} · {figure.era}</div>
        </div>
      </div>
      <p className="orda-inter text-sm text-[#B7BAC3] leading-relaxed">{figure.description}</p>
      {figure.significance && (
        <div className="mt-3 pt-3 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
          <div className="text-[10px] orda-cinzel tracking-widest text-[#6B6E77] mb-1">{t("search.significance")}</div>
          <p className="orda-inter text-xs text-[#B7BAC3] leading-relaxed">{figure.significance}</p>
        </div>
      )}
    </div>
  );
}
