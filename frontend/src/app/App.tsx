import { useState, useEffect, useRef, type ChangeEvent, type FormEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useLocation, useNavigate } from "react-router";
import { motion, useInView, useScroll, useTransform } from "motion/react";
import { useTranslation, type TFunction } from "react-i18next";
import { DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES, type SupportedLanguage } from "./lib/i18n";
import {
  useAuthSession,
  useArtifacts,
  useCertificates,
  useChatMutation,
  useCities,
  useCity,
  useCityGallery,
  useGroup,
  useGroups,
  useHomepageContent,
  useNotifications,
  useProgress,
  useQuests,
  useSuggestedPrompts,
  type ApiArtifact,
  type ApiCaravanBuilderData,
  type ApiChronographData,
  type ApiCity,
  type ApiKhansCourtData,
  type ApiLanguage,
  type ApiNotification,
  type ApiProgressSummary,
  type ApiQuest,
} from "./lib/api";
import {
  Map, Package, Award, MessageSquare, ChevronRight, Compass, ScrollText,
  ShoppingBag, Globe, Settings, User, ArrowRight, Play,
  Send, X, Menu, ChevronDown, Shield, Crown, BookOpen, Clock,
  MapPin, Download, Share2, Check, ChevronLeft, Star, Eye, Mountain,
  Volume2, TrendingUp, Wind, Zap, Feather, LogOut, Camera, Bell, Coins,
  Users, Copy, Trophy, Plus, Heart, GripVertical, ArrowUp, ArrowDown, Gavel, History, RotateCcw,
  Lock, ArrowUpDown
} from "lucide-react";
import { GLOBAL_CSS } from "./styles/globalCss";
import { GlobalSearchTrigger } from "./components/GlobalSearch";
import { NotificationBell, TYPE_ICON, TYPE_TARGET, formatRelativeTime } from "./components/NotificationCenter";
import { useActiveCity } from "./context/ActiveCityContext";
import mapBackground from "../assets/map-golden-horde.png";

// ─── Types ────────────────────────────────────────────────────────────────────
type View = "landing" | "chars" | "intro" | "auth" | "dashboard" | "city" | "ai" | "artifacts" | "quests" | "certificate" | "passport" | "notifications" | "privacy" | "terms" | "contacts" | "groups" | "group" | "join";
type CharType = "merchant" | "diplomat" | "explorer";

// ─── Route access control ──────────────────────────────────────────────────────
// Protected: require an authenticated session. Guest-only: only for signed-out
// visitors (e.g. redirect an already-logged-in user away from the auth screen).
// Admin: reserved for admin-only views (none exist yet in this app).
// "join" is intentionally NOT protected — an invite link (?code=...) needs to
// stay reachable while signed out; JoinPage itself prompts to sign in rather
// than losing the code to a forced redirect to /auth.
const PROTECTED_VIEWS: View[] = ["dashboard", "city", "ai", "artifacts", "quests", "certificate", "passport", "notifications", "groups", "group"];
const GUEST_ONLY_VIEWS: View[] = ["auth"];
const ADMIN_VIEWS: View[] = [];

function resolveView(target: View, isAuthenticated: boolean, role: string | null): View {
  if (PROTECTED_VIEWS.includes(target) && !isAuthenticated) return "auth";
  if (GUEST_ONLY_VIEWS.includes(target) && isAuthenticated) return "dashboard";
  if (ADMIN_VIEWS.includes(target) && role !== "admin") return "dashboard";
  return target;
}

// ─── URL routing ──────────────────────────────────────────────────────────────
// Every view maps to a real URL so the browser's history/back-button and page
// refreshes reflect actual app state instead of an in-memory-only view switch.
const VIEW_PATHS: Record<Exclude<View, "city" | "group">, string> = {
  landing: "/",
  chars: "/characters",
  intro: "/intro",
  auth: "/auth",
  dashboard: "/dashboard",
  ai: "/ai",
  artifacts: "/artifacts",
  quests: "/quests",
  certificate: "/certificate",
  passport: "/passport",
  notifications: "/notifications",
  privacy: "/privacy",
  terms: "/terms",
  contacts: "/contacts",
  groups: "/ordas",
  join: "/join",
};

function pathForView(v: View, entityId?: string | null): string {
  if (v === "city") return entityId ? `/city/${entityId}` : VIEW_PATHS.dashboard;
  if (v === "group") return entityId ? `/orda/${entityId}` : VIEW_PATHS.groups;
  return VIEW_PATHS[v];
}

function viewForPathname(pathname: string): View {
  if (pathname.startsWith("/city/")) return "city";
  if (pathname.startsWith("/orda/")) return "group";
  const match = (Object.entries(VIEW_PATHS) as [View, string][]).find(([, path]) => path === pathname);
  return match ? match[0] : "landing";
}

function cityIdFromPathname(pathname: string): string | null {
  const match = pathname.match(/^\/city\/([^/]+)\/?$/);
  return match ? decodeURIComponent(match[1]) : null;
}

function groupIdFromPathname(pathname: string): string | null {
  const match = pathname.match(/^\/orda\/([^/]+)\/?$/);
  return match ? decodeURIComponent(match[1]) : null;
}

interface City {
  id: string; slug: string; name: string; subtitle: string;
  cx: number; cy: number;
  description: string; founded: string; population: string;
  facts: string[]; importance: string; tradeInfo: string | null;
  color: string; size: number;
  sortOrder: number;
  imageUrl: string | null;
  // null when there's no signed-in user to evaluate journey progress against
  // (e.g. the anonymous landing-page map preview) — treated as unlocked.
  isUnlocked: boolean | null;
}

interface Artifact {
  id: string; name: string; category: string;
  description: string; found: string; city: string; icon: string;
  rarity: "common" | "rare" | "legendary";
}

// Real-world geographic bounding box the map's territory art was drawn to cover
// (Crimea in the west to Otrar in the east, Bolgar in the north to Otrar in the
// south, padded ~15% so no city sits flush against the SVG edge). Any city's
// lat/lng — including ones an admin adds later — projects into the map from
// this box; there is no per-city hardcoded position anymore.
const MAP_GEO_BOUNDS = { minLng: 33, maxLng: 71, minLat: 41, maxLat: 57 };
// Calibrated against the highlighted Golden Horde territory in the reference
// background image (src/assets/map-golden-horde.png) so markers land inside
// the illustrated territory rather than the old procedural map's shape.
const MAP_PIXEL_BOUNDS = { left: 280, right: 770, top: 65, bottom: 365 };

function projectLatLng(lat: number, lng: number): { cx: number; cy: number } {
  const { minLng, maxLng, minLat, maxLat } = MAP_GEO_BOUNDS;
  const { left, right, top, bottom } = MAP_PIXEL_BOUNDS;
  const xRatio = (lng - minLng) / (maxLng - minLng);
  // Latitude increases northward but SVG y increases downward, so invert.
  const yRatio = (maxLat - lat) / (maxLat - minLat);
  return {
    cx: left + xRatio * (right - left),
    cy: top + yRatio * (bottom - top),
  };
}

// After projecting, nudge apart any markers that would sit close enough for
// their rings/labels to collide (two real cities can be geographically close
// without their map labels being legible at that spacing) — small, generic,
// and works for any number of cities rather than special-casing a pair.
function resolveMarkerOverlaps<T extends { cx: number; cy: number }>(points: T[]): T[] {
  const MIN_SEPARATION = 70;
  const result = points.map((p) => ({ ...p }));
  for (let pass = 0; pass < 3; pass++) {
    for (let i = 0; i < result.length; i++) {
      for (let j = i + 1; j < result.length; j++) {
        const dx = result[j].cx - result[i].cx;
        const dy = result[j].cy - result[i].cy;
        const dist = Math.hypot(dx, dy) || 0.0001;
        if (dist < MIN_SEPARATION) {
          const push = (MIN_SEPARATION - dist) / 2;
          const ux = dx / dist;
          const uy = dy / dist;
          result[i].cx -= ux * push;
          result[i].cy -= uy * push;
          result[j].cx += ux * push;
          result[j].cy += uy * push;
        }
      }
    }
  }
  return result;
}

// Marker visual tier (color/size) is styling, not position, and stays hand-curated
// by slug like before — the Golden Horde's own capital reads as the largest gold
// dot, other capitals/hubs as bronze, everything else as silver.
const CITY_TIERS: Record<string, { color: string; size: number }> = {
  "sarai-batu": { color: "#B8892B", size: 10 },
  "sarayshyk": { color: "#8C6239", size: 7 },
  "otrar": { color: "#8C6239", size: 7 },
  "sygnak": { color: "#5C4E38", size: 6 },
  "bolgar": { color: "#5C4E38", size: 6 },
  "crimea": { color: "#5C4E38", size: 6 },
};
const DEFAULT_CITY_TIER = { color: "#5C4E38", size: 6 };

// Hand-placed against the actual background image (src/assets/map-golden-horde.png)
// rather than derived from the generic lat/lng projection below — the six launch
// cities' real historical relative positions (Sarai-Batu on the lower Volga near
// the Caspian, Bolgar upriver from it, Sarayshyk on the Ural, Otrar/Sygnak along
// the Syr Darya corridor with Otrar the more southwesterly of the two, Crimea on
// the peninsula west of Sarai-Batu) mapped onto where those rivers/coastlines
// actually fall in this specific illustration, clear of the mountain shading in
// the southeast corner. Percentages are of the map image's own bounds — any city
// without a curated slug here still falls back to `projectLatLng`.
const CITY_MAP_POSITIONS: Record<string, { left: number; top: number }> = {
  "sarai-batu": { left: 44, top: 52 },
  "bolgar": { left: 51, top: 21 },
  "sarayshyk": { left: 58, top: 40 },
  "otrar": { left: 66, top: 54 },
  "sygnak": { left: 74, top: 44 },
  "crimea": { left: 17, top: 57 },
};

function mapApiCity(city: ApiCity, t: TFunction): City {
  // The 6 launch cities have curated map styling (tier) and a translated one-line
  // subtitle; any other city (e.g. one an admin adds later) falls back to plain
  // colors/size and its real historical_period instead of a missing translation key.
  const isCuratedCity = Boolean(CITY_TIERS[city.slug]);
  const tier = CITY_TIERS[city.slug] || DEFAULT_CITY_TIER;
  const curatedPosition = CITY_MAP_POSITIONS[city.slug];
  const { cx, cy } = curatedPosition
    ? { cx: (curatedPosition.left / 100) * 900, cy: (curatedPosition.top / 100) * 480 }
    : projectLatLng(city.latitude, city.longitude);
  const subtitle = isCuratedCity ? t(`map.citySubtitles.${city.slug}`) : city.historical_period;

  return {
    id: city.id,
    slug: city.slug,
    name: city.name,
    subtitle,
    cx,
    cy,
    description: city.description,
    founded: city.historical_period,
    population: city.population_estimate || t("common.unknown"),
    facts: city.historical_facts?.length ? city.historical_facts : [city.significance || city.description, city.historical_period],
    importance: city.significance || city.description,
    tradeInfo: city.trade_info ?? null,
    color: tier.color,
    size: tier.size,
    sortOrder: city.sort_order,
    imageUrl: city.image_url ?? null,
    isUnlocked: city.is_unlocked,
  };
}

// Which journeys feature which cities, grounded in each city's real seeded role
// (see map.citySubtitles / significance text): Sarai Batu and Sygnak were khanate
// capitals, Sarayshyk/Otrar/Crimea were caravan-trade hubs, Otrar/Bolgar/Sygnak are
// the sites with the richest archaeological history. A city with no entry here
// (e.g. one an admin adds before categorizing it) shows on every journey by default
// rather than silently disappearing.
const JOURNEY_CITY_TAGS: Record<string, CharType[]> = {
  "sarai-batu": ["diplomat", "merchant"],
  "sarayshyk": ["merchant", "explorer"],
  "otrar": ["merchant", "explorer"],
  "sygnak": ["diplomat", "explorer"],
  "bolgar": ["explorer"],
  "crimea": ["diplomat", "merchant"],
};

// Suggested visiting order per journey — also the sequence routes are drawn in,
// and its first city is the one highlighted for first-time visitors.
const JOURNEY_ROUTE_ORDER: Record<CharType, string[]> = {
  diplomat: ["sarai-batu", "sygnak", "crimea"],
  merchant: ["sarai-batu", "sarayshyk", "otrar", "crimea"],
  explorer: ["otrar", "bolgar", "sygnak", "sarayshyk"],
};

// The caravan network as drawn when no single character journey is active (e.g.
// the anonymous landing-page map preview) — a fixed historical trade-route
// topology rather than a per-character subset, so the map reads as one coherent
// network: the Syr Darya corridor (Sygnak-Otrar-Sarayshyk) feeding the capital,
// which in turn connects north up the Volga to Bolgar and west to Crimea.
const WORLD_ROUTE_EDGES: [string, string][] = [
  ["sygnak", "otrar"],
  ["otrar", "sarayshyk"],
  ["sarayshyk", "sarai-batu"],
  ["sarai-batu", "bolgar"],
  ["sarai-batu", "crimea"],
];

function citiesForJourney(cities: City[], journey: CharType | undefined): City[] {
  if (!journey) return cities;
  return cities.filter((c) => (JOURNEY_CITY_TAGS[c.slug] ?? [journey]).includes(journey));
}

// Gentle perpendicular-offset arc between two map points, matching the curved
// caravan-route look of the original hand-drawn paths.
function routeCurvePath(from: { cx: number; cy: number }, to: { cx: number; cy: number }): string {
  const mx = (from.cx + to.cx) / 2;
  const my = (from.cy + to.cy) / 2;
  const dx = to.cx - from.cx;
  const dy = to.cy - from.cy;
  const bow = 0.15;
  const ctrlX = mx - dy * bow;
  const ctrlY = my + dx * bow;
  return `M ${from.cx},${from.cy} Q ${ctrlX},${ctrlY} ${to.cx},${to.cy}`;
}

function mapApiArtifact(artifact: ApiArtifact, cityName: string, t: TFunction): Artifact {
  const rarity = (artifact.rarity?.toLowerCase() as Artifact["rarity"]) || "common";
  const icons: Record<Artifact["rarity"], string> = {
    legendary: "⚜",
    rare: "🗿",
    common: "🪶",
  };

  return {
    id: artifact.id,
    name: artifact.name,
    category: artifact.era || t("common.historicalCategory"),
    description: artifact.description,
    found: artifact.historical_context || t("common.recoveredInField"),
    city: cityName,
    icon: icons[rarity],
    rarity,
  };
}

function mapApiQuest(quest: ApiQuest, cityName: string) {
  return {
    id: quest.id,
    title: quest.title,
    city: cityName,
    xp: quest.xp_reward,
    description: quest.description,
  };
}

function countCompletedByType(records: ApiProgressSummary["records"] | undefined, entityType: string) {
  return (records || []).filter((r) => r.entity_type === entityType && r.status === "completed").length;
}

// Overall journey completion: 40% weighted toward cities unlocked, 60% toward quests
// completed. Missing/zero totals (data not loaded yet, or an empty catalog) return 0
// rather than dividing by zero or showing a misleadingly full bar.
function calculateJourneyProgress({
  unlockedCities, totalCities, completedQuests, totalQuests,
}: {
  unlockedCities: number; totalCities: number; completedQuests: number; totalQuests: number;
}): number {
  if (!totalCities || !totalQuests) return 0;
  const cityScore = (unlockedCities / totalCities) * 40;
  const questScore = (completedQuests / totalQuests) * 60;
  const clamped = Math.min(100, Math.max(0, cityScore + questScore));
  return Math.round(clamped);
}

// ─── Data ─────────────────────────────────────────────────────────────────────
function getCharacterData(t: TFunction) {
  return {
    merchant: {
      name: t("chars.merchant.name"),
      shortName: t("chars.merchant.shortName"),
      title: t("chars.merchant.title"),
      description: t("chars.merchant.description"),
      icon: ShoppingBag,
      traits: t("chars.merchant.traits", { returnObjects: true }) as string[],
      color: "#B8892B",
    },
    diplomat: {
      name: t("chars.diplomat.name"),
      shortName: t("chars.diplomat.shortName"),
      title: t("chars.diplomat.title"),
      description: t("chars.diplomat.description"),
      icon: ScrollText,
      traits: t("chars.diplomat.traits", { returnObjects: true }) as string[],
      color: "#6B8CA3",
    },
    explorer: {
      name: t("chars.explorer.name"),
      shortName: t("chars.explorer.shortName"),
      title: t("chars.explorer.title"),
      description: t("chars.explorer.description"),
      icon: Compass,
      traits: t("chars.explorer.traits", { returnObjects: true }) as string[],
      color: "#7C8B5A",
    },
  };
}
type CharacterData = ReturnType<typeof getCharacterData>;

// ─── Utility ──────────────────────────────────────────────────────────────────
function DustParticles() {
  const particles = Array.from({ length: 18 }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    size: Math.random() * 3 + 1,
    duration: Math.random() * 8 + 6,
    delay: Math.random() * 10,
    opacity: Math.random() * 0.25 + 0.05,
  }));

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {particles.map((p) => (
        <div
          key={p.id}
          className="particle-rise absolute rounded-full"
          style={{
            left: `${p.left}%`,
            bottom: `${Math.random() * 40}%`,
            width: p.size,
            height: p.size,
            background: `rgba(184,137,43,${p.opacity})`,
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}
    </div>
  );
}

function RarityBadge({ rarity }: { rarity: Artifact["rarity"] }) {
  const { t } = useTranslation();
  const map = {
    legendary: ["#B8892B", t("common.rarity.legendary")],
    rare: ["#8A9199", t("common.rarity.rare")],
    common: ["#8C6239", t("common.rarity.common")],
  };
  const [color, label] = map[rarity];
  return (
    <span style={{ color, borderColor: color + "40", background: color + "15" }}
      className="border rounded px-2 py-0.5 text-[10px] font-semibold tracking-widest orda-cinzel">
      {label}
    </span>
  );
}

function ProgressRing({ value, size = 64, stroke = 5 }: { value: number; size?: number; stroke?: number }) {
  const r = (size - stroke * 2) / 2;
  const circ = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(59,42,19,0.06)" strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#B8892B" strokeWidth={stroke}
        strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={circ * (1 - value / 100)}
        style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(0.22,1,0.36,1)" }} />
    </svg>
  );
}

// ─── Navigation ───────────────────────────────────────────────────────────────
function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { i18n } = useTranslation();
  const { user, updateProfileMutation } = useAuthSession();
  const active = (i18n.resolvedLanguage || DEFAULT_LANGUAGE) as SupportedLanguage;

  const changeLanguage = (lng: SupportedLanguage) => {
    i18n.changeLanguage(lng);
    if (user) updateProfileMutation.mutate({ language: lng });
  };

  return (
    <div className={`flex items-center gap-1 ${compact ? "" : "rounded-full"}`}
      style={compact ? {} : { background: "rgba(59,42,19,0.04)", border: "1px solid rgba(59,42,19,0.06)", padding: "3px" }}>
      {SUPPORTED_LANGUAGES.map((lng) => (
        <button key={lng} onClick={() => changeLanguage(lng)}
          className="px-2 py-1 rounded-full text-[10px] font-semibold orda-cinzel tracking-wider transition-colors"
          style={{
            background: active === lng ? "rgba(184,137,43,0.15)" : "transparent",
            color: active === lng ? "#B8892B" : "#5C4E38",
          }}>
          {lng.toUpperCase()}
        </button>
      ))}
    </div>
  );
}

const LANDING_SECTION_IDS = ["journey-section", "map-section", "artifacts-section", "ai-historian-section", "about-section"];

// Sections below the fold can still resize as city/artifact data loads in, which
// would otherwise leave the initial scroll target drifting out of view — realign once more shortly after.
function smoothScrollToId(id: string) {
  const scroll = () => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  scroll();
  [400, 1200].forEach(delay => window.setTimeout(scroll, delay));
}

function NavBar({ view, onNav }: { view: View; onNav: (v: View) => void }) {
  const { t } = useTranslation();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const pendingSectionRef = useRef<string | null>(null);
  const { user, isAuthenticated } = useAuthSession();

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", h);
    return () => window.removeEventListener("scroll", h);
  }, []);

  const inApp = ["dashboard", "city", "ai", "artifacts", "quests", "certificate", "passport", "notifications", "groups", "group", "join"].includes(view);

  // Highlight the section currently in view while scrolling the landing page.
  useEffect(() => {
    if (view !== "landing") { setActiveSection(null); return; }
    const elements = LANDING_SECTION_IDS.map(id => document.getElementById(id)).filter((el): el is HTMLElement => el !== null);
    if (elements.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => { if (entry.isIntersecting) setActiveSection(entry.target.id); });
      },
      { rootMargin: "-35% 0px -55% 0px", threshold: 0 }
    );
    elements.forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, [view]);

  // If a section link is clicked from outside the landing page, jump to landing
  // first, then smoothly scroll to the target section once it has mounted.
  useEffect(() => {
    if (view === "landing" && pendingSectionRef.current) {
      const id = pendingSectionRef.current;
      pendingSectionRef.current = null;
      requestAnimationFrame(() => smoothScrollToId(id));
    }
  }, [view]);

  const goToSection = (id: string) => {
    if (view === "landing") {
      smoothScrollToId(id);
    } else {
      pendingSectionRef.current = id;
      onNav("landing");
    }
    setMenuOpen(false);
  };

  const scrollToTop = () => {
    if (view === "landing") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      onNav("landing");
    }
  };

  const navLinks: [string, View][] = [
    [t("nav.journey"), "dashboard"], [t("nav.map"), "dashboard"], [t("nav.artifacts"), "artifacts"], [t("nav.aiHistorian"), "ai"], [t("nav.ordas"), "groups"],
  ];
  const sectionLinks: [string, string][] = [
    [t("nav.journey"), "journey-section"], [t("nav.map"), "map-section"], [t("nav.artifacts"), "artifacts-section"],
    [t("nav.aiHistorian"), "ai-historian-section"], [t("nav.about"), "about-section"],
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 transition-all duration-500"
      style={{ background: scrolled || inApp ? "#E6D8B8" : "transparent", borderBottom: scrolled || inApp ? "1px solid rgba(59,42,19,0.18)" : "none" }}>
      <div className="max-w-[1440px] mx-auto px-6 lg:px-12 h-16 flex items-center justify-between">
        <button onClick={scrollToTop} className="nav-link flex items-center gap-3 group">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg,#B8892B,#8C6239)" }}>
            <span className="text-[#EDE1C4] font-bold text-sm orda-cinzel">O</span>
          </div>
          <span className="text-lg font-bold orda-cinzel tracking-[0.2em] text-[#B8892B]">ORDA</span>
        </button>

        <div className="hidden md:flex items-center gap-8">
          {inApp && navLinks.map(([label, target]) => (
            <button key={label} onClick={() => onNav(target)}
              className="nav-link text-sm orda-cinzel tracking-widest transition-colors duration-200"
              style={{ color: view === target ? "#B8892B" : "#5C4E38" }}
              onMouseEnter={e => { if (view !== target) (e.target as HTMLElement).style.color = "#2E2013"; }}
              onMouseLeave={e => { if (view !== target) (e.target as HTMLElement).style.color = "#5C4E38"; }}>
              {label}
            </button>
          ))}
          {!inApp && sectionLinks.map(([label, id]) => (
            <button key={id} onClick={() => goToSection(id)}
              className="nav-link relative text-sm orda-cinzel tracking-widest transition-colors duration-200 pb-1"
              style={{ color: activeSection === id ? "#B8892B" : "#5C4E38" }}
              onMouseEnter={e => { if (activeSection !== id) (e.target as HTMLElement).style.color = "#2E2013"; }}
              onMouseLeave={e => { if (activeSection !== id) (e.target as HTMLElement).style.color = "#5C4E38"; }}>
              {label}
              <span className="absolute left-0 right-0 -bottom-0.5 h-px rounded-full transition-all duration-300"
                style={{ background: activeSection === id ? "#B8892B" : "transparent", boxShadow: activeSection === id ? "0 0 8px rgba(184,137,43,0.6)" : "none" }} />
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          {inApp && (
            <>
              <GlobalSearchTrigger />
              <NotificationBell />
            </>
          )}
          {isAuthenticated && user?.role === "admin" && (
            <a
              href="/admin"
              title={t("nav.admin")}
              className="nav-link w-9 h-9 rounded-full flex items-center justify-center transition-colors"
              style={{ background: "rgba(184,137,43,0.12)", border: "1px solid rgba(184,137,43,0.25)" }}>
              <Shield size={15} color="#B8892B" />
            </a>
          )}
          {isAuthenticated ? (
            <button
              onClick={() => onNav("passport")}
              title={user ? `${user.username} · ${t("nav.passport")}` : t("nav.passport")}
              className="nav-link w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold orda-cinzel overflow-hidden"
              style={{ background: "linear-gradient(135deg,#B8892B,#8C6239)", color: "#EDE1C4" }}>
              {user?.avatar_url ? (
                <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                (user?.username?.[0] || "?").toUpperCase()
              )}
            </button>
          ) : (
            <button onClick={() => onNav("passport")} className="nav-link btn-primary text-sm py-2 px-5">
              {t("nav.enter")}
            </button>
          )}
          <button className="nav-link md:hidden" aria-label={menuOpen ? t("nav.closeMenu") : t("nav.openMenu")} onClick={() => setMenuOpen(!menuOpen)}>
            <Menu size={20} color="#2E2013" />
          </button>
        </div>
      </div>
      {menuOpen && (
        <div className="md:hidden glass-dark border-t border-[rgba(59,42,19,0.15)] px-6 py-4 flex flex-col gap-4">
          {inApp
            ? navLinks.map(([label, target]) => (
              <button key={label} className="nav-link text-sm orda-cinzel tracking-widest text-left"
                style={{ color: view === target ? "#B8892B" : "#5C4E38" }}
                onClick={() => { onNav(target); setMenuOpen(false); }}>
                {label}
              </button>
            ))
            : sectionLinks.map(([label, id]) => (
              <button key={id} className="nav-link text-sm orda-cinzel tracking-widest text-left"
                style={{ color: activeSection === id ? "#B8892B" : "#5C4E38" }}
                onClick={() => goToSection(id)}>
                {label}
              </button>
            ))}
          {isAuthenticated && user?.role === "admin" && (
            <a href="/admin" className="nav-link text-sm orda-cinzel tracking-widest text-left" style={{ color: "#B8892B" }}>
              {t("nav.admin")}
            </a>
          )}
          <LanguageSwitcher compact />
        </div>
      )}
    </nav>
  );
}

// ─── LANDING PAGE ─────────────────────────────────────────────────────────────
function Landing({ onStart }: { onStart: () => void }) {
  const { t } = useTranslation();
  const [mounted, setMounted] = useState(false);
  useEffect(() => { const timer = setTimeout(() => setMounted(true), 100); return () => clearTimeout(timer); }, []);

  return (
    <div className="relative w-full min-h-screen overflow-hidden flex flex-col">
      {/* Sky & Steppe Background */}
      <div className="absolute inset-0" style={{
        background: "linear-gradient(180deg, #D8C79C 0%, #DCCBA0 18%, #DCCBA0 35%, #DCCBA0 55%, #D8C79C 70%, #3B2A1A 82%, #EDE1C4 100%)"
      }} />

      {/* Horizon glow — golden sunset */}
      <div className="absolute bottom-0 left-0 right-0 h-[40%]" style={{
        background: "linear-gradient(0deg, rgba(184,137,43,0.1) 0%, rgba(180,100,20,0.06) 40%, transparent 100%)"
      }} />

      {/* Mountain silhouettes — ink-wash hills */}
      <svg className="absolute bottom-[14%] left-0 right-0 w-full" viewBox="0 0 1440 220" preserveAspectRatio="none">
        <path d="M0,220 L0,160 L80,90 L160,130 L260,50 L380,110 L480,60 L560,100 L660,30 L760,95 L860,55 L960,120 L1060,70 L1180,110 L1280,60 L1380,100 L1440,80 L1440,220 Z"
          fill="rgba(59,42,19,0.85)" />
        <path d="M0,220 L0,175 L100,130 L200,155 L320,105 L440,145 L560,120 L680,155 L800,115 L920,148 L1040,125 L1160,150 L1280,130 L1440,155 L1440,220 Z"
          fill="rgba(46,32,19,0.92)" />
      </svg>

      {/* Steppe ground */}
      <div className="absolute bottom-0 left-0 right-0 h-[14%]" style={{
        background: "linear-gradient(180deg,rgba(59,42,19,0) 0%,rgba(230,216,184,1) 100%)"
      }} />

      {/* Horse riders silhouette */}
      <svg className="absolute bottom-[13.5%] right-[8%] opacity-30" viewBox="0 0 300 80" width="220">
        {/* Rider 1 */}
        <ellipse cx="40" cy="55" rx="22" ry="10" fill="#3B2A1A" />
        <rect x="32" y="28" width="16" height="24" rx="3" fill="#3B2A1A" />
        <circle cx="40" cy="22" r="8" fill="#3B2A1A" />
        <line x1="56" y1="42" x2="72" y2="50" stroke="#3B2A1A" strokeWidth="3" />
        {/* Rider 2 */}
        <ellipse cx="110" cy="58" rx="18" ry="8" fill="#3B2A1A" />
        <rect x="103" y="34" width="14" height="20" rx="3" fill="#3B2A1A" />
        <circle cx="110" cy="28" r="7" fill="#3B2A1A" />
        {/* Rider 3 */}
        <ellipse cx="180" cy="56" rx="20" ry="9" fill="#3B2A1A" />
        <rect x="172" y="31" width="15" height="22" rx="3" fill="#3B2A1A" />
        <circle cx="180" cy="25" r="7.5" fill="#3B2A1A" />
        <line x1="194" y1="38" x2="210" y2="44" stroke="#3B2A1A" strokeWidth="2.5" />
      </svg>

      {/* Clouds */}
      <div className="cloud-a absolute top-[8%] left-[5%] pointer-events-none">
        <div className="w-64 h-16 rounded-full" style={{ background: "radial-gradient(ellipse,rgba(255,251,235,0.4) 0%,transparent 70%)", filter: "blur(20px)" }} />
      </div>
      <div className="cloud-b absolute top-[12%] right-[10%] pointer-events-none">
        <div className="w-96 h-20 rounded-full" style={{ background: "radial-gradient(ellipse,rgba(255,251,235,0.32) 0%,transparent 70%)", filter: "blur(24px)" }} />
      </div>

      <DustParticles />

      {/* Center content */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 pt-24 pb-40 text-center">
        {/* Logo emblem */}
        <div className={`mb-8 transition-all duration-1000 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl flex items-center justify-center relative"
            style={{ background: "linear-gradient(135deg,rgba(184,137,43,0.12),rgba(140,98,57,0.06))", border: "1px solid rgba(184,137,43,0.25)" }}>
            <div className="animate-pulse-gold absolute inset-0 rounded-2xl" />
            <span className="orda-cinzel text-3xl font-bold text-[#B8892B] gold-glow-text relative z-10">✦</span>
          </div>

          <div className="shimmer-text text-7xl md:text-9xl font-black orda-cinzel tracking-[0.3em] leading-none mb-2">
            ORDA
          </div>
          <div className="text-[#5C4E38] text-xs md:text-sm tracking-[0.35em] orda-cinzel uppercase mb-10">
            {t("hero.tagline")}
          </div>
        </div>

        {/* Divider */}
        <div className={`flex items-center gap-4 mb-10 w-full max-w-sm transition-all duration-1000 delay-200 ${mounted ? "opacity-100" : "opacity-0"}`}>
          <div className="flex-1 h-px" style={{ background: "linear-gradient(90deg,transparent,rgba(184,137,43,0.3))" }} />
          <span className="text-[#B8892B] text-base">⬦</span>
          <div className="flex-1 h-px" style={{ background: "linear-gradient(90deg,rgba(184,137,43,0.3),transparent)" }} />
        </div>

        {/* Description */}
        <p className={`text-[#5C4E38] text-base md:text-lg max-w-lg leading-relaxed orda-inter mb-12 transition-all duration-1000 delay-300 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
          {t("hero.description")}
        </p>

        {/* CTA Buttons */}
        <div className={`flex flex-col sm:flex-row gap-4 transition-all duration-1000 delay-500 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
          <button onClick={onStart} className="btn-primary text-base px-10 py-4 flex items-center gap-3">
            <span>{t("hero.startJourney")}</span>
            <ArrowRight size={18} />
          </button>
          <button className="btn-ghost text-base px-10 py-4 flex items-center gap-3">
            <Play size={16} />
            <span>{t("hero.watchDemo")}</span>
          </button>
        </div>

        {/* Scroll hint */}
        <button
          onClick={() => smoothScrollToId("journey-section")}
          aria-label={t("hero.scrollDown")}
          className={`nav-link mt-14 flex items-center justify-center rounded-full transition-all duration-1000 delay-700 ${mounted ? "opacity-60 hover:opacity-100" : "opacity-0"}`}
        >
          <ChevronDown size={22} color="#B8892B" className="animate-scroll" />
        </button>
      </div>

      {/* Features strip */}
      <div className="absolute bottom-0 left-0 right-0 h-16 flex items-center justify-center gap-12 border-t"
        style={{ borderColor: "rgba(59,42,19,0.15)", background: "rgba(230,216,184,0.92)" }}>
        {[[t("hero.features.cities"), MapPin], [t("hero.features.quests"), Zap], [t("hero.features.aiHistorian"), MessageSquare], [t("hero.features.artifacts"), Package]].map(([label, Icon]) => (
          <div key={label as string} className="flex items-center gap-2 text-[#5C4E38] text-sm orda-inter">
            <Icon size={14} color="#B8892B" />
            <span>{label as string}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── LANDING STORY (extends the Hero below) ───────────────────────────────────
function ScrollReveal({ children, delay = 0, className = "" }: { children: ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay }}
    >
      {children}
    </motion.div>
  );
}

function useParallaxY(distance = 50) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [distance, -distance]);
  return { ref, y };
}

function useCountUp(target: number, shouldStart: boolean, duration = 1400) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!shouldStart) return;
    let raf: number;
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      setValue(Math.round(target * (1 - Math.pow(1 - progress, 3))));
      if (progress < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [shouldStart, target, duration]);
  return value;
}

function StatCounter({ value, label }: { value: number; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const count = useCountUp(value, inView);
  return (
    <div ref={ref} className="text-center">
      <div className="text-4xl md:text-5xl font-black orda-cinzel text-[#B8892B]">{count}+</div>
      <div className="text-xs md:text-sm orda-inter text-[#5C4E38] mt-2 tracking-wide">{label}</div>
    </div>
  );
}


function JourneySection() {
  const { t } = useTranslation();
  const parallax = useParallaxY(50);
  const pillars = [
    { icon: Compass, title: t("journey.pillars.explore.title"), text: t("journey.pillars.explore.text") },
    { icon: MessageSquare, title: t("journey.pillars.converse.title"), text: t("journey.pillars.converse.text") },
    { icon: Zap, title: t("journey.pillars.quest.title"), text: t("journey.pillars.quest.text") },
  ];
  return (
    <section id="journey-section" ref={parallax.ref} className="relative py-28 md:py-36 overflow-hidden scroll-mt-24" style={{ background: "linear-gradient(180deg, #EDE1C4 0%, #E6D8B8 100%)" }}>
      <motion.div style={{ y: parallax.y }} className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 50% 30%, rgba(184,137,43,0.05) 0%, transparent 60%)" }} />
      </motion.div>
      <DustParticles />
      <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
        <ScrollReveal>
          <div className="badge-gold mb-6 inline-block">{t("journey.badge")}</div>
          <h2 className="orda-cinzel text-3xl md:text-5xl font-bold text-[#2E2013] mb-6 leading-tight">
            {t("journey.title1")}<br />{t("journey.title2")}
          </h2>
          <p className="orda-cormorant text-xl md:text-2xl italic text-[#5C4E38] max-w-2xl mx-auto leading-relaxed">
            {t("journey.description")}
          </p>
        </ScrollReveal>
        <ScrollReveal delay={0.15} className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-16">
          {pillars.map((item) => (
            <div key={item.title} className="rounded-[20px] p-7 card-hover gold-hover" style={{ background: "rgba(241,233,210,0.5)", border: "1px solid rgba(59,42,19,0.06)" }}>
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 mx-auto" style={{ background: "rgba(184,137,43,0.1)", border: "1px solid rgba(184,137,43,0.2)" }}>
                <item.icon size={20} color="#B8892B" />
              </div>
              <h3 className="orda-cinzel text-base font-semibold text-[#2E2013] mb-2">{item.title}</h3>
              <p className="orda-inter text-sm text-[#5C4E38] leading-relaxed">{item.text}</p>
            </div>
          ))}
        </ScrollReveal>
      </div>
    </section>
  );
}

function TimelineSection() {
  const { t } = useTranslation();
  const events = t("timeline.events", { returnObjects: true }) as { year: string; text: string }[];
  return (
    <section className="relative py-28 md:py-36" style={{ background: "#DCCBA0" }}>
      <div className="max-w-3xl mx-auto px-6">
        <ScrollReveal className="text-center mb-16">
          <div className="badge-gold mb-4 inline-block">{t("timeline.badge")}</div>
          <h2 className="orda-cinzel text-3xl md:text-4xl font-bold text-[#2E2013]">{t("timeline.title")}</h2>
        </ScrollReveal>
        <div className="relative">
          <div className="absolute left-[84px] top-0 bottom-0 w-px hidden sm:block"
            style={{ background: "linear-gradient(180deg, transparent, rgba(184,137,43,0.3) 8%, rgba(184,137,43,0.3) 92%, transparent)" }} />
          <div className="space-y-8">
            {events.map((item, i) => (
              <ScrollReveal key={item.year} delay={i * 0.05}>
                <div className="flex items-start gap-6">
                  <div className="w-20 flex-shrink-0 text-right pt-4 hidden sm:block">
                    <span className="orda-cinzel text-sm font-semibold text-[#B8892B]">{item.year}</span>
                  </div>
                  <div className="relative flex-shrink-0 hidden sm:block pt-5">
                    <div className="w-3 h-3 rounded-full border-2 border-[#B8892B]" style={{ background: "#DCCBA0", boxShadow: "0 0 10px rgba(184,137,43,0.4)" }} />
                  </div>
                  <div className="flex-1 rounded-[16px] p-5" style={{ background: "rgba(241,233,210,0.4)", border: "1px solid rgba(59,42,19,0.06)" }}>
                    <div className="sm:hidden orda-cinzel text-sm font-semibold text-[#B8892B] mb-1">{item.year}</div>
                    <p className="orda-inter text-sm text-[#5C4E38] leading-relaxed">{item.text}</p>
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function MapPreviewSection({ onExplore }: { onExplore: () => void }) {
  const { t } = useTranslation();
  const { data: citiesData, isLoading } = useCities();
  const cities = (citiesData?.data || []).map((c) => mapApiCity(c, t));
  const parallax = useParallaxY(40);

  return (
    <section id="map-section" ref={parallax.ref} className="relative py-28 md:py-36 overflow-hidden scroll-mt-24" style={{ background: "linear-gradient(180deg, #DCCBA0 0%, #E6D8B8 100%)" }}>
      <motion.div style={{ y: parallax.y }} className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 50% 60%, rgba(184,137,43,0.04) 0%, transparent 65%)" }} />
      </motion.div>
      <div className="relative z-10 max-w-5xl mx-auto px-6">
        <ScrollReveal className="text-center mb-12">
          <div className="badge-gold mb-4 inline-block">{t("mapPreview.badge")}</div>
          <h2 className="orda-cinzel text-3xl md:text-4xl font-bold text-[#2E2013] mb-4">{t("mapPreview.title")}</h2>
          <p className="orda-inter text-[#5C4E38] max-w-xl mx-auto">
            {t("mapPreview.description")}
          </p>
        </ScrollReveal>
        <ScrollReveal delay={0.15}>
          <div className="rounded-[24px] p-3 md:p-5" style={{ background: "rgba(241,233,210,0.6)", border: "1px solid rgba(184,137,43,0.12)" }}>
            <div className="h-[380px] md:h-[460px]">
              {isLoading ? (
                <div className="w-full h-full rounded-[16px]" style={{ background: "rgba(59,42,19,0.03)" }} />
              ) : (
                <InteractiveMap cities={cities} onSelectCity={onExplore} />
              )}
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}

function CitiesPreviewSection({ onExplore }: { onExplore: () => void }) {
  const { t } = useTranslation();
  const { data: citiesData, isLoading } = useCities();
  const cities = (citiesData?.data || []).map((c) => mapApiCity(c, t));
  const items: (City | null)[] = isLoading ? Array.from({ length: 6 }, () => null) : cities;

  return (
    <section className="relative py-28 md:py-36" style={{ background: "#E6D8B8" }}>
      <div className="max-w-6xl mx-auto px-6">
        <ScrollReveal className="text-center mb-14">
          <div className="badge-gold mb-4 inline-block">{t("citiesPreview.badge")}</div>
          <h2 className="orda-cinzel text-3xl md:text-4xl font-bold text-[#2E2013]">{t("citiesPreview.title")}</h2>
        </ScrollReveal>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((city, i) => (
            <ScrollReveal key={city?.id ?? `city-skeleton-${i}`} delay={i * 0.06}>
              {!city ? (
                <div className="rounded-[20px] h-40" style={{ background: "rgba(241,233,210,0.4)", border: "1px solid rgba(59,42,19,0.06)" }} />
              ) : (
                <div onClick={onExplore} className="rounded-[20px] p-6 cursor-pointer card-hover gold-hover h-40 flex flex-col justify-between"
                  style={{ background: "rgba(241,233,210,0.5)", border: "1px solid rgba(59,42,19,0.06)" }}>
                  <div>
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-3" style={{ background: "rgba(184,137,43,0.1)", border: `1px solid ${city.color}40` }}>
                      <MapPin size={15} color={city.color} />
                    </div>
                    <h3 className="orda-cinzel text-base font-semibold text-[#2E2013]">{city.name}</h3>
                    <p className="orda-inter text-xs text-[#5C4E38] mt-1">{city.subtitle}</p>
                  </div>
                  <span className="text-[10px] orda-cinzel tracking-widest text-[#B8892B]">{city.founded}</span>
                </div>
              )}
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function AIHistorianPreviewSection({ onExplore }: { onExplore: () => void }) {
  const { t } = useTranslation();
  return (
    <section id="ai-historian-section" className="relative py-28 md:py-36 overflow-hidden scroll-mt-24" style={{ background: "linear-gradient(180deg, #E6D8B8 0%, #EDE1C4 100%)" }}>
      <div className="max-w-4xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        <ScrollReveal>
          <div className="badge-teal mb-4 inline-block">{t("aiPreview.badge")}</div>
          <h2 className="orda-cinzel text-3xl md:text-4xl font-bold text-[#2E2013] mb-5">{t("aiPreview.title")}</h2>
          <p className="orda-inter text-[#5C4E38] leading-relaxed mb-6">
            {t("aiPreview.description")}
          </p>
          <button onClick={onExplore} className="btn-teal flex items-center gap-2">
            <MessageSquare size={16} /> {t("aiPreview.cta")}
          </button>
        </ScrollReveal>
        <ScrollReveal delay={0.15}>
          <div className="rounded-[20px] p-6 space-y-4" style={{ background: "rgba(241,233,210,0.8)", border: "1px solid rgba(107,140,163,0.15)" }}>
            <div className="flex justify-end">
              <div className="max-w-[80%] rounded-[16px] rounded-tr-[4px] px-4 py-3"
                style={{ background: "linear-gradient(135deg, rgba(184,137,43,0.15), rgba(184,137,43,0.08))", border: "1px solid rgba(184,137,43,0.2)" }}>
                <p className="orda-inter text-sm text-[#2E2013]">{t("aiPreview.sampleQuestion")}</p>
              </div>
            </div>
            <div className="flex justify-start gap-3">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: "rgba(107,140,163,0.12)", border: "1px solid rgba(107,140,163,0.2)" }}>
                <span className="text-sm">⚜</span>
              </div>
              <div className="max-w-[85%] rounded-[16px] rounded-tl-[4px] px-4 py-3" style={{ background: "rgba(241,233,210,0.7)", border: "1px solid rgba(59,42,19,0.07)" }}>
                <p className="orda-inter text-sm text-[#2E2013] leading-relaxed">
                  {t("aiPreview.sampleAnswer")}
                </p>
              </div>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}

function ArtifactsPreviewSection({ onExplore }: { onExplore: () => void }) {
  const { t } = useTranslation();
  const { data: artifactsData, isLoading } = useArtifacts();
  const items: (ApiArtifact | null)[] = isLoading ? Array.from({ length: 4 }, () => null) : (artifactsData?.data || []).slice(0, 4);
  const rarityIcons: Record<string, string> = { legendary: "⚜", rare: "🗿", common: "🪶" };

  return (
    <section id="artifacts-section" className="relative py-28 md:py-36 scroll-mt-24" style={{ background: "#EDE1C4" }}>
      <div className="max-w-6xl mx-auto px-6">
        <ScrollReveal className="text-center mb-14">
          <div className="badge-gold mb-4 inline-block">{t("artifactsPreview.badge")}</div>
          <h2 className="orda-cinzel text-3xl md:text-4xl font-bold text-[#2E2013]">{t("artifactsPreview.title")}</h2>
        </ScrollReveal>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
          {items.map((artifact, i) => (
            <ScrollReveal key={artifact?.id ?? `artifact-skeleton-${i}`} delay={i * 0.06}>
              {!artifact ? (
                <div className="rounded-[20px] aspect-square" style={{ background: "rgba(241,233,210,0.5)" }} />
              ) : (
                <div onClick={onExplore} className="rounded-[20px] p-5 cursor-pointer card-hover gold-hover aspect-square flex flex-col items-center justify-center text-center"
                  style={{ background: "rgba(241,233,210,0.6)", border: "1px solid rgba(59,42,19,0.06)" }}>
                  <span className="text-4xl mb-3">{rarityIcons[artifact.rarity?.toLowerCase()] || "🪶"}</span>
                  <h3 className="orda-cinzel text-xs font-semibold text-[#2E2013]">{artifact.name}</h3>
                  <span className="text-[10px] orda-inter text-[#5C4E38] mt-1">{artifact.era}</span>
                </div>
              )}
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function AdventureSection() {
  const { t } = useTranslation();
  const items = [
    { icon: Zap, title: t("adventure.items.quests.title"), text: t("adventure.items.quests.text") },
    { icon: TrendingUp, title: t("adventure.items.rank.title"), text: t("adventure.items.rank.text") },
    { icon: Award, title: t("adventure.items.achievements.title"), text: t("adventure.items.achievements.text") },
    { icon: BookOpen, title: t("adventure.items.certificate.title"), text: t("adventure.items.certificate.text") },
  ];
  return (
    <section className="relative py-28 md:py-36" style={{ background: "linear-gradient(180deg, #EDE1C4 0%, #E6D8B8 100%)" }}>
      <div className="max-w-5xl mx-auto px-6">
        <ScrollReveal className="text-center mb-14">
          <div className="badge-gold mb-4 inline-block">{t("adventure.badge")}</div>
          <h2 className="orda-cinzel text-3xl md:text-4xl font-bold text-[#2E2013] mb-4">{t("adventure.title")}</h2>
          <p className="orda-inter text-[#5C4E38] max-w-xl mx-auto">
            {t("adventure.description")}
          </p>
        </ScrollReveal>
        <ScrollReveal delay={0.15} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {items.map((item) => (
            <div key={item.title} className="rounded-[20px] p-6 text-center card-hover gold-hover" style={{ background: "rgba(241,233,210,0.5)", border: "1px solid rgba(59,42,19,0.06)" }}>
              <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4 mx-auto" style={{ background: "rgba(184,137,43,0.1)", border: "1px solid rgba(184,137,43,0.2)" }}>
                <item.icon size={18} color="#B8892B" />
              </div>
              <h3 className="orda-cinzel text-sm font-semibold text-[#2E2013] mb-2">{item.title}</h3>
              <p className="orda-inter text-xs text-[#5C4E38] leading-relaxed">{item.text}</p>
            </div>
          ))}
        </ScrollReveal>
      </div>
    </section>
  );
}

function StatisticsSection() {
  const { t, i18n } = useTranslation();
  const language = (i18n.resolvedLanguage || DEFAULT_LANGUAGE) as ApiLanguage;
  const { data: citiesData } = useCities();
  const { data: artifactsData } = useArtifacts();
  const { data: questsData } = useQuests();
  const { data: statsContent } = useHomepageContent("stats", language);
  const citiesTotal = citiesData?.meta.total ?? 0;
  const artifactsTotal = artifactsData?.meta.total ?? 0;
  const questsTotal = questsData?.meta.total ?? 0;
  const yearsOfHistory = Number(statsContent?.[0]?.title) || 0;

  return (
    <section className="relative py-24 md:py-32"
      style={{ background: "#DCCBA0", borderTop: "1px solid rgba(59,42,19,0.04)", borderBottom: "1px solid rgba(59,42,19,0.04)" }}>
      <div className="max-w-5xl mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <StatCounter value={citiesTotal} label={t("stats.cities")} />
          <StatCounter value={artifactsTotal} label={t("stats.artifacts")} />
          <StatCounter value={questsTotal} label={t("stats.quests")} />
          <StatCounter value={yearsOfHistory} label={t("stats.years")} />
        </div>
      </div>
    </section>
  );
}

function FinalCTASection({ onStart }: { onStart: () => void }) {
  const { t } = useTranslation();
  return (
    <section className="relative py-32 md:py-40 overflow-hidden text-center" style={{ background: "radial-gradient(ellipse at 50% 40%, rgba(184,137,43,0.08) 0%, #EDE1C4 65%)" }}>
      <DustParticles />
      <div className="relative z-10 max-w-2xl mx-auto px-6">
        <ScrollReveal>
          <span className="orda-cinzel text-2xl text-[#B8892B] block mb-4">⬦</span>
          <h2 className="orda-cinzel text-3xl md:text-5xl font-bold text-[#2E2013] mb-6">{t("finalCta.title")}</h2>
          <p className="orda-inter text-[#5C4E38] text-base md:text-lg mb-10 leading-relaxed">
            {t("finalCta.description")}
          </p>
          <button onClick={onStart} className="btn-primary text-base px-10 py-4 inline-flex items-center gap-3">
            <span>{t("finalCta.cta")}</span>
            <ArrowRight size={18} />
          </button>
        </ScrollReveal>
      </div>
    </section>
  );
}

function LandingFooter({ onNav }: { onNav: (v: View) => void }) {
  const { t } = useTranslation();
  const exploreLinks: [string, string][] = [
    [t("footer.links.about"), "about-section"],
    [t("footer.links.journey"), "journey-section"],
    [t("footer.links.map"), "map-section"],
    [t("footer.links.artifacts"), "artifacts-section"],
    [t("footer.links.aiHistorian"), "ai-historian-section"],
  ];
  const legalLinks: [string, View][] = [
    [t("footer.links.contacts"), "contacts"],
    [t("footer.links.privacy"), "privacy"],
    [t("footer.links.terms"), "terms"],
  ];
  return (
    <footer id="about-section" className="relative py-12 border-t scroll-mt-24" style={{ background: "#D8C79C", borderColor: "rgba(59,42,19,0.05)" }}>
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-8">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg,#B8892B,#8C6239)" }}>
              <span className="text-[#EDE1C4] font-bold text-sm orda-cinzel">O</span>
            </div>
            <span className="text-base font-bold orda-cinzel tracking-[0.2em] text-[#B8892B]">ORDA</span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
            {exploreLinks.map(([label, id]) => (
              <button key={id} onClick={() => smoothScrollToId(id)}
                className="nav-link text-xs orda-inter text-[#5C4E38] hover:text-[#2E2013] transition-colors">
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t" style={{ borderColor: "rgba(59,42,19,0.04)" }}>
          <p className="text-[11px] orda-inter text-[#5C4E38]">{t("footer.copyright", { year: new Date().getFullYear() })}</p>
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
            {legalLinks.map(([label, v]) => (
              <button key={v} onClick={() => onNav(v)}
                className="nav-link text-[11px] orda-inter text-[#5C4E38] hover:text-[#2E2013] transition-colors">
                {label}
              </button>
            ))}
            <span className="text-[11px] orda-inter select-none" style={{ color: "#5C4E38", opacity: 0.4, cursor: "not-allowed" }}
              title={t("footer.links.comingSoon")}>
              {t("footer.links.github")}
            </span>
          </div>
          <p className="text-[11px] orda-inter text-[#5C4E38]">{t("footer.subtitle")}</p>
        </div>
      </div>
    </footer>
  );
}

function LandingStory({ onStart, onNav }: { onStart: () => void; onNav: (v: View) => void }) {
  return (
    <div className="relative">
      <JourneySection />
      <TimelineSection />
      <MapPreviewSection onExplore={onStart} />
      <CitiesPreviewSection onExplore={onStart} />
      <AIHistorianPreviewSection onExplore={onStart} />
      <ArtifactsPreviewSection onExplore={onStart} />
      <AdventureSection />
      <StatisticsSection />
      <FinalCTASection onStart={onStart} />
      <LandingFooter onNav={onNav} />
    </div>
  );
}

// ─── CHARACTER SELECTION ──────────────────────────────────────────────────────
function CharacterSelect({ onSelect }: { onSelect: (c: CharType) => void }) {
  const { t } = useTranslation();
  const [hovered, setHovered] = useState<CharType | null>(null);
  const characterData = getCharacterData(t);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-24 relative">
      <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at center top, rgba(184,137,43,0.04) 0%, transparent 60%)" }} />

      <div className="animate-fade-in text-center mb-16">
        <div className="badge-gold mb-6 inline-block">{t("chars.badge")}</div>
        <h1 className="orda-cinzel text-4xl md:text-5xl font-bold text-[#2E2013] mb-4">{t("chars.title")}</h1>
        <p className="orda-inter text-[#5C4E38] text-base max-w-md mx-auto leading-relaxed">
          {t("chars.description")}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl w-full">
        {(Object.entries(characterData) as [CharType, CharacterData[CharType]][]).map(([key, char], i) => {
          const Icon = char.icon;
          const isHovered = hovered === key;
          return (
            <div key={key}
              className="animate-slide-up card-hover gold-hover cursor-pointer relative rounded-[20px] p-8 flex flex-col items-center text-center"
              style={{
                animationDelay: `${i * 0.12}s`,
                background: isHovered ? `rgba(241,233,210,0.9)` : "rgba(241,233,210,0.6)",
                border: isHovered ? `1px solid ${char.color}50` : "1px solid rgba(59,42,19,0.06)",
                boxShadow: isHovered ? "0 10px 24px rgba(59,42,19,0.2)" : "0 4px 14px rgba(59,42,19,0.12)",
              }}
              onMouseEnter={() => setHovered(key)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => onSelect(key)}>

              {/* Border animation on hover */}
              {isHovered && (
                <div className="absolute inset-0 rounded-[20px] pointer-events-none animate-border-spin"
                  style={{ border: "2px solid transparent" }} />
              )}

              {/* Icon circle */}
              <div className="w-20 h-20 rounded-full flex items-center justify-center mb-6 relative transition-all duration-300"
                style={{
                  background: `linear-gradient(135deg, ${char.color}18, ${char.color}08)`,
                  border: `1px solid ${char.color}30`,
                  boxShadow: isHovered ? `0 4px 12px ${char.color}30` : "none",
                }}>
                <Icon size={32} color={char.color} />
              </div>

              <span className="badge-gold mb-3 text-[10px]">{char.title}</span>
              <h3 className="orda-cinzel text-xl font-bold text-[#2E2013] mb-3">{char.name}</h3>
              <p className="orda-inter text-sm text-[#5C4E38] leading-relaxed mb-6">{char.description}</p>

              <div className="flex flex-wrap gap-2 justify-center mb-6">
                {char.traits.map(trait => (
                  <span key={trait} className="text-xs px-3 py-1 rounded-full orda-inter"
                    style={{ background: `${char.color}12`, color: char.color, border: `1px solid ${char.color}25` }}>
                    {trait}
                  </span>
                ))}
              </div>

              <button className="w-full py-3 rounded-xl text-sm font-semibold orda-cinzel tracking-widest transition-all duration-300"
                style={{
                  background: isHovered ? `linear-gradient(135deg, ${char.color}, ${char.color}cc)` : "rgba(59,42,19,0.04)",
                  color: isHovered ? "#EDE1C4" : char.color,
                  border: `1px solid ${char.color}30`,
                }}>
                {t("chars.choose", { name: char.shortName })}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── STORY INTRO ──────────────────────────────────────────────────────────────
function StoryIntro({ character, onBegin }: { character: CharType; onBegin: () => void }) {
  const { t } = useTranslation();
  const [phase, setPhase] = useState(0);
  const char = getCharacterData(t)[character];

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 800),
      setTimeout(() => setPhase(2), 2000),
      setTimeout(() => setPhase(3), 3400),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden"
      style={{ background: "radial-gradient(ellipse at center, #E2D3AC 0%, #EDE1C4 100%)" }}>

      {/* Parchment texture overlay */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03] animate-grain"
        style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")" }} />

      {/* Glowing orb */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full pointer-events-none"
        style={{ background: "radial-gradient(ellipse, rgba(184,137,43,0.06) 0%, transparent 70%)", filter: "blur(40px)" }} />

      <div className="relative z-10 max-w-2xl w-full px-8 text-center">
        {/* AI Emblem */}
        <div className={`transition-all duration-1000 ${phase >= 1 ? "opacity-100 scale-100" : "opacity-0 scale-90"}`}>
          <div className="w-24 h-24 mx-auto mb-8 rounded-full flex items-center justify-center animate-float"
            style={{ background: "linear-gradient(135deg,rgba(184,137,43,0.15),rgba(184,137,43,0.05))", border: "1px solid rgba(184,137,43,0.3)", boxShadow: "0 4px 16px rgba(59,42,19,0.15)" }}>
            <span className="text-3xl">⚜</span>
          </div>
        </div>

        {/* Parchment card */}
        <div className={`transition-all duration-1000 delay-300 ${phase >= 2 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
          <div className="rounded-[20px] p-10 mb-8 relative"
            style={{ background: "rgba(243,233,210,0.95)", border: "1px solid rgba(184,137,43,0.25)", boxShadow: "0 8px 28px rgba(59,42,19,0.18)" }}>

            <div className="text-[#B8892B] text-xs tracking-[0.3em] orda-cinzel mb-6">{t("intro.oracleSpeaks")}</div>

            <blockquote className="orda-cormorant text-2xl md:text-3xl text-[#2E2013] leading-relaxed italic font-light mb-6">
              "{t("intro.quote")}"
            </blockquote>

            <div className="flex items-center justify-center gap-3 text-sm text-[#5C4E38] orda-inter">
              <span className="w-8 h-px bg-[#B8892B]/30" />
              <span>{t("intro.youArePrefix")} <span className="text-[#B8892B]">{char.name}</span>{t("intro.youAreSuffix")}</span>
              <span className="w-8 h-px bg-[#B8892B]/30" />
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className={`transition-all duration-1000 delay-700 ${phase >= 3 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
          <button onClick={onBegin} className="btn-primary text-base px-14 py-4 flex items-center gap-3 mx-auto">
            <span>{t("intro.begin")}</span>
            <ChevronRight size={18} />
          </button>
          <p className="text-[#5C4E38] text-xs mt-4 orda-inter tracking-wide">
            {t("intro.footer")}
          </p>
        </div>
      </div>

      <DustParticles />
    </div>
  );
}

// ─── INTERACTIVE MAP ──────────────────────────────────────────────────────────
// "rivers"/"borders" were separate toggleable SVG layers over the old procedural
// map; both are now baked into the static background image (map-golden-horde.png)
// and can no longer be shown/hidden independently, so those two toggles are gone.
type MapLayerKey = "cities" | "tradeRoutes";
const MAP_INTRO_STORAGE_KEY = "orda-map-intro-seen";

function InteractiveMap({ cities, onSelectCity, journey, completedCitySlugs, cityProgress, activeCityId }: {
  cities: City[];
  onSelectCity: (city: City) => void;
  journey?: CharType;
  completedCitySlugs?: Set<string>;
  cityProgress?: Record<string, { percent: number; status: "not_started" | "in_progress" | "completed" }>;
  activeCityId?: string | null;
}) {
  const { t } = useTranslation();
  const [hovered, setHovered] = useState<string | null>(null);
  const [layers, setLayers] = useState<Record<MapLayerKey, boolean>>({
    cities: true, tradeRoutes: true,
  });
  const [introDismissed, setIntroDismissed] = useState(() =>
    typeof window === "undefined" || window.localStorage.getItem(MAP_INTRO_STORAGE_KEY) === "1"
  );

  // Linear-journey unlock reveal: whenever a city flips from locked to unlocked
  // (quest completion unlocked the next one, reflected here as soon as the
  // `cities` query refetches — no page reload needed), briefly highlight it.
  const previouslyUnlockedRef = useRef<Set<string> | null>(null);
  const [justUnlockedIds, setJustUnlockedIds] = useState<Set<string>>(new Set());
  useEffect(() => {
    const currentlyUnlocked = new Set(cities.filter(c => c.isUnlocked !== false).map(c => c.id));
    const previous = previouslyUnlockedRef.current;
    previouslyUnlockedRef.current = currentlyUnlocked;
    if (!previous) return; // first render — nothing "just" unlocked yet
    const newlyUnlocked = [...currentlyUnlocked].filter(id => !previous.has(id));
    if (newlyUnlocked.length === 0) return;
    setJustUnlockedIds(new Set(newlyUnlocked));
    const timer = setTimeout(() => setJustUnlockedIds(new Set()), 3000);
    return () => clearTimeout(timer);
  }, [cities]);

  const dismissIntro = () => {
    setIntroDismissed(true);
    if (typeof window !== "undefined") window.localStorage.setItem(MAP_INTRO_STORAGE_KEY, "1");
  };

  const toggleLayer = (key: MapLayerKey) => setLayers(prev => ({ ...prev, [key]: !prev[key] }));

  // Journey filtering + anti-overlap nudge happen together so a smaller subset
  // (fewer cities on screen) gets less/no nudging than the full 6-city view.
  const visibleCities = resolveMarkerOverlaps(citiesForJourney(cities, journey));
  // `Map` the class is shadowed in this file by the `Map` icon imported from
  // lucide-react above — `globalThis.Map` reaches past that shadowing to the
  // real built-in constructor.
  const citiesBySlug = new globalThis.Map(visibleCities.map(c => [c.slug, c]));

  const routeOrder = journey ? JOURNEY_ROUTE_ORDER[journey].filter(slug => citiesBySlug.has(slug)) : [];
  const routeSegments = routeOrder.slice(0, -1).map((slug, i) => {
    const nextSlug = routeOrder[i + 1];
    const from = citiesBySlug.get(slug)!;
    const to = citiesBySlug.get(nextSlug)!;
    const fromDone = completedCitySlugs?.has(slug) ?? false;
    const toDone = completedCitySlugs?.has(nextSlug) ?? false;
    const state: "completed" | "current" | "future" = fromDone && toDone ? "completed" : fromDone ? "current" : "future";
    return { key: `${slug}-${nextSlug}`, path: routeCurvePath(from, to), state };
  });

  const showIntro = Boolean(journey) && !introDismissed;
  const recommendedSlug = journey ? JOURNEY_ROUTE_ORDER[journey][0] : undefined;

  const LAYER_TOGGLES: { key: MapLayerKey; label: string }[] = [
    { key: "cities", label: t("map.layers.cities") },
    { key: "tradeRoutes", label: t("map.layers.tradeRoutes") },
  ];

  // Every layer (background art, route overlay, fog patches, markers) shares this
  // one coordinate space and stretches to fill the container edge-to-edge, so a
  // percentage position always means the same point on every layer regardless of
  // how the container itself is sized — that's what keeps markers, routes and fog
  // aligned to the background as the map scales responsively.
  const pct = (x: number, y: number) => ({ left: `${(x / 900) * 100}%`, top: `${(y / 480) * 100}%` });
  const lockedCities = visibleCities.filter((c) => c.isUnlocked === false);

  return (
    <div className="relative w-full h-full rounded-[10px] overflow-hidden"
      style={{
        background: "#E6D8B8",
        border: "3px solid rgba(59,42,19,0.55)",
        boxShadow: "inset 0 0 50px rgba(59,42,19,0.22), inset 0 0 0 1px rgba(255,251,235,0.4)",
      }}>

      {/* Shared filter defs — referenced by id from the separate per-marker SVGs below. */}
      <svg width="0" height="0" style={{ position: "absolute" }}>
        <defs>
          <filter id="marker-emboss" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="1" stdDeviation="0.8" floodColor="#3B2A1A" floodOpacity="0.45" />
          </filter>
          <filter id="active-glow" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="3.5" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="locked-blur" x="-50%" y="-50%" width="200%" height="200%">
            <feColorMatrix type="saturate" values="0.05" />
            <feGaussianBlur stdDeviation="2.6" />
          </filter>
        </defs>
      </svg>

      {/* ── Background layer: the actual historical map image — a single static
          background, stretched to fill the box edge-to-edge (objectFit: "fill")
          so its 0–100% bounds line up exactly with the percentage coordinates
          every other layer (routes, fog, markers) is positioned with. */}
      <div className="absolute inset-0 pointer-events-none">
        <img src={mapBackground} alt="" className="w-full h-full" style={{ objectFit: "fill" }} />
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 900 480" preserveAspectRatio="none">
          {/* Compass rose */}
          <g transform="translate(820,60)">
            <circle cx="0" cy="0" r="22" fill="rgba(243,233,210,0.9)" stroke="rgba(59,42,19,0.35)" strokeWidth="1" />
            <text x="0" y="-8" textAnchor="middle" fill="#8C6239" fontSize="8" fontFamily="Cinzel,serif">N</text>
            <text x="0" y="14" textAnchor="middle" fill="rgba(59,42,19,0.55)" fontSize="6" fontFamily="Cinzel,serif">S</text>
            <text x="12" y="3" textAnchor="middle" fill="rgba(59,42,19,0.55)" fontSize="6" fontFamily="Cinzel,serif">E</text>
            <text x="-12" y="3" textAnchor="middle" fill="rgba(59,42,19,0.55)" fontSize="6" fontFamily="Cinzel,serif">W</text>
            <path d="M 0,-18 L 3,-4 L 0,-8 L -3,-4 Z" fill="#8C6239" />
            <path d="M 0,18 L 3,4 L 0,8 L -3,4 Z" fill="rgba(59,42,19,0.3)" />
          </g>

          {/* Scale bar */}
          <g transform="translate(60,448)">
            <line x1="0" y1="0" x2="80" y2="0" stroke="rgba(59,42,19,0.5)" strokeWidth="1" />
            <line x1="0" y1="-4" x2="0" y2="4" stroke="rgba(59,42,19,0.5)" strokeWidth="1" />
            <line x1="80" y1="-4" x2="80" y2="4" stroke="rgba(59,42,19,0.5)" strokeWidth="1" />
            <text x="40" y="14" textAnchor="middle" fill="rgba(59,42,19,0.6)" fontSize="8" fontFamily="Inter,sans-serif">{t("map.scale")}</text>
          </g>

          {/* Title overlay */}
          <text x="450" y="32" textAnchor="middle" fill="rgba(59,42,19,0.4)"
            fontSize="11" fontFamily="Cinzel,serif" letterSpacing="4">
            {t("map.titleOverlay")}
          </text>
        </svg>

        {/* Soft vignette, blending the image's own edges into the frame */}
        <div className="absolute inset-0"
          style={{ background: "radial-gradient(ellipse at 45% 45%, transparent 60%, rgba(59,42,19,0.16) 100%)" }} />
      </div>

      {/* ── SVG route overlay: dashed caravan roads, a layer of its own on top of
          the background, sharing the same stretched coordinate space. */}
      {layers.tradeRoutes && (
        <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 900 480" preserveAspectRatio="none">
          {routeSegments.map((segment) => {
            if (segment.state === "completed") {
              return (
                <path key={segment.key} d={segment.path} className="route-path"
                  stroke="#B8892B" strokeOpacity="0.75" strokeWidth="2" fill="none" />
              );
            }
            if (segment.state === "current") {
              return (
                <path key={segment.key} d={segment.path} className="route-path"
                  stroke="#8C6239" strokeOpacity="0.9" strokeWidth="2.25" fill="none" />
              );
            }
            return (
              <path key={segment.key} d={segment.path} className="route-path"
                stroke="rgba(59,42,19,0.32)" strokeWidth="1.25" fill="none" />
            );
          })}
          {/* World route network — shown when no single character journey is
              active, colored by the same real completion data as the journey
              routes above (gold once both ends are done, faded otherwise). */}
          {!journey && WORLD_ROUTE_EDGES.map(([fromSlug, toSlug]) => {
            const from = citiesBySlug.get(fromSlug);
            const to = citiesBySlug.get(toSlug);
            if (!from || !to) return null;
            const fromDone = completedCitySlugs?.has(fromSlug) ?? false;
            const toDone = completedCitySlugs?.has(toSlug) ?? false;
            const isDone = fromDone && toDone;
            return (
              <path key={`${fromSlug}-${toSlug}`} d={routeCurvePath(from, to)}
                className="route-path"
                stroke={isDone ? "#B8892B" : "rgba(59,42,19,0.32)"}
                strokeOpacity={isDone ? 0.75 : 1}
                strokeWidth={isDone ? 2 : 1.25}
                fill="none" />
            );
          })}
        </svg>
      )}

      {/* ── Fog-of-war overlays: one soft parchment cloud per locked city, hiding
          it (and its name) from view like an unexplored region on a campaign map. */}
      {layers.cities && lockedCities.map((city) => {
        const { left, top } = pct(city.cx, city.cy);
        return (
          <div key={`fog-${city.id}`} className="absolute pointer-events-none"
            style={{
              left, top, width: "17%", height: "32%", transform: "translate(-50%,-50%)",
              background: "radial-gradient(ellipse at center, rgba(230,216,184,0.96) 0%, rgba(230,216,184,0.85) 45%, rgba(230,216,184,0) 78%)",
            }} />
        );
      })}

      {/* Layer toggles */}
      <div className="absolute top-3 left-3 z-10 flex flex-wrap gap-1.5" style={{ maxWidth: "calc(100% - 24px)" }}>
        {LAYER_TOGGLES.map(({ key, label }) => (
          <button key={key} onClick={() => toggleLayer(key)}
            className="text-[10px] sm:text-xs px-2.5 py-1 rounded-lg orda-inter transition-colors"
            style={{
              background: layers[key] ? "rgba(184,137,43,0.12)" : "rgba(59,42,19,0.04)",
              color: layers[key] ? "#B8892B" : "#5C4E38",
              border: `1px solid ${layers[key] ? "rgba(184,137,43,0.2)" : "rgba(59,42,19,0.06)"}`,
            }}>
            {label}
          </button>
        ))}
      </div>

      {/* First-visit guidance */}
      {showIntro && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 glass rounded-full pl-4 pr-2 py-2 flex items-center gap-2 animate-fade-in"
          style={{ maxWidth: "min(360px, 90%)" }}>
          <span className="text-[11px] sm:text-xs orda-inter text-[#2E2013] whitespace-nowrap overflow-hidden text-ellipsis">
            {t("map.firstVisitHint")}
          </span>
          <button onClick={dismissIntro} aria-label={t("map.dismissHint")}
            className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center hover:bg-[rgba(59,42,19,0.08)] transition-colors">
            <X size={11} color="#5C4E38" />
          </button>
        </div>
      )}

      {/* ── City markers: absolutely positioned HTML elements, placed by percentage
          — the part of this map that's actually interactive. Each carries its own
          small local SVG icon; only the wrapper's left/top position (and the label
          below it) is real DOM/CSS, so positioning stays correct at any container
          size without recomputing anything. */}
      {layers.cities && visibleCities.map((city) => {
        const isHov = hovered === city.id;
        const isRecommended = showIntro && city.slug === recommendedSlug;
        // The one globally active city (from ActiveCityContext) — stays highlighted
        // here regardless of hover, so the map always agrees with the quest panel,
        // artifact panel, bottom carousel, and AI historian about which city is "it".
        const isActive = Boolean(activeCityId) && city.id === activeCityId;
        // Explicitly false = locked (there's a signed-in user and they haven't
        // reached it yet). null/true = unlocked or unknown (no user context,
        // e.g. the anonymous landing preview) — never locked in that case.
        const isLocked = city.isUnlocked === false;
        const isJustUnlocked = justUnlockedIds.has(city.id);
        const isCompleted = cityProgress?.[city.slug]?.status === "completed";
        const markerFill = isLocked ? "#9C8F72" : isCompleted ? "#8C6239" : city.color;
        const { left, top } = pct(city.cx, city.cy);
        const R = city.size;
        const box = (R + 20) * 2;
        const c = box / 2;
        return (
          <button key={city.id} type="button" className="city-marker absolute flex flex-col items-center"
            style={{ left, top, transform: "translate(-50%,-50%)", background: "none", border: "none", padding: 0, cursor: isLocked ? "not-allowed" : "pointer" }}
            disabled={isLocked}
            onClick={() => { if (!isLocked) onSelectCity(city); }}
            onMouseEnter={() => setHovered(city.id)}
            onMouseLeave={() => setHovered(null)}>
            <svg width={box} height={box} viewBox={`0 0 ${box} ${box}`} style={{ overflow: "visible" }}>
              {/* Recommended starting-city highlight (persistent, first visit only) — a
                  static soft ring, no expanding/pulsing animation. */}
              {isRecommended && !isLocked && (
                <circle cx={c} cy={c} r={R + 10}
                  fill="none" stroke="#B8892B" strokeWidth="1.25" opacity="0.5"
                  className="animate-fade-in" />
              )}

              {/* Active/selected city — the one explicit soft golden glow on the map,
                  with only a very slight, slow breathing scale (no expanding rings). */}
              {isActive && !isLocked && (
                <circle cx={c} cy={c} r={R + 9}
                  fill="none" stroke="#B8892B" strokeWidth="1.5" opacity="0.85"
                  filter="url(#active-glow)"
                  style={{ animation: "breathe 4s ease-in-out infinite", transformOrigin: `${c}px ${c}px` }} />
              )}

              {/* Just-unlocked reveal — a brief static highlight announcing the new
                  destination, fades in and holds rather than pulsing/expanding. */}
              {isJustUnlocked && (
                <circle cx={c} cy={c} r={R + 6}
                  fill="none" stroke="#B8892B" strokeWidth="2" opacity="0.9"
                  className="animate-fade-in" />
              )}

              <g opacity={isLocked ? 0.22 : 1} filter={isLocked ? "url(#locked-blur)" : "url(#marker-emboss)"}
                style={{ transition: "opacity 0.4s ease" }}
                className={isJustUnlocked ? "animate-scale-in" : undefined}>
                {/* Outer ring — engraved settlement mark */}
                <circle cx={c} cy={c} r={R + 4}
                  fill="none"
                  stroke={isLocked ? "#9C8F72" : "#3B2A1A"}
                  strokeWidth={isHov || isActive ? 1.5 : 1}
                  opacity={isHov || isActive ? 0.7 : 0.35}
                  style={{ transition: "all 0.25s ease" }} />

                {/* Main dot */}
                <circle cx={c} cy={c} r={R}
                  fill={markerFill}
                  stroke="#3B2A1A" strokeWidth="0.75"
                  opacity={isHov && !isLocked ? 1 : isActive && !isLocked ? 1 : 0.85}
                  style={{ transition: "transform 0.25s ease, opacity 0.25s ease", transform: isHov && !isLocked ? "scale(1.08)" : "scale(1)", transformOrigin: `${c}px ${c}px` }} />

                {/* Inner mark — small ink dot, like an atlas settlement pip (hidden
                    under the completed check so the two don't visually clash) */}
                {!isCompleted && (
                  <circle cx={c} cy={c} r={R * 0.32}
                    fill="#F3E9D2" opacity="0.9" />
                )}

                {/* Completed-city indicator */}
                {isCompleted && !isLocked && (
                  <path d={`M ${c - R * 0.35},${c} L ${c - R * 0.08},${c + R * 0.3} L ${c + R * 0.4},${c - R * 0.35}`}
                    fill="none" stroke="#F3E9D2" strokeWidth={Math.max(1, R * 0.18)} strokeLinecap="round" strokeLinejoin="round" />
                )}

                {/* Capital pennant */}
                {city.slug === "sarai-batu" && !isLocked && (
                  <path d={`M ${c},${c - R - 4} L ${c},${c - R - 15} L ${c + 8},${c - R - 11} Z`}
                    fill="#B8892B" stroke="#3B2A1A" strokeWidth="0.5" />
                )}
              </g>
            </svg>

            {/* Label — locked cities stay nameless under the fog; hovering still
                reveals identity via the tooltip below, not the map label itself. */}
            {!isLocked && (
              <span className="orda-cinzel whitespace-nowrap" style={{
                marginTop: 2, fontSize: 10, letterSpacing: 1,
                color: isHov || isActive ? "#8C6239" : "#3B2A1A",
                fontWeight: isActive || city.slug === "sarai-batu" ? 700 : 400,
                transition: "color 0.2s ease",
              }}>
                {city.name.toUpperCase()}
              </span>
            )}
          </button>
        );
      })}

      {/* Hover tooltip — compact, doesn't move the marker */}
      {hovered && (() => {
        const city = visibleCities.find(c => c.id === hovered);
        if (!city) return null;

        if (city.isUnlocked === false) {
          return (
            <div className="absolute bottom-4 left-4 right-4 sm:right-auto glass rounded-[14px] px-4 py-3 pointer-events-none animate-fade-in"
              style={{ maxWidth: "min(260px, 100%)" }}>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm">🔒</span>
                <span className="text-[#5C4E38] text-xs orda-cinzel tracking-widest truncate">{city.name}</span>
              </div>
              <div className="text-[#5C4E38] text-xs orda-inter">{t("map.lockedTooltip")}</div>
            </div>
          );
        }

        const progress = cityProgress?.[city.slug];
        const statusLabel = progress
          ? progress.status === "completed" ? t("map.status.completed")
          : progress.status === "in_progress" ? t("map.status.inProgress")
          : t("map.status.notStarted")
          : null;
        const statusColor = progress?.status === "completed" ? "#7C8B5A" : progress?.status === "in_progress" ? "#6B8CA3" : "#5C4E38";
        return (
          <div className="absolute bottom-4 left-4 right-4 sm:right-auto glass rounded-[14px] px-4 py-3 pointer-events-none animate-fade-in"
            style={{ maxWidth: "min(260px, 100%)" }}>
            <div className="text-[#B8892B] text-xs orda-cinzel tracking-widest mb-1 truncate">{city.name}</div>
            <div className="text-[#5C4E38] text-xs orda-inter truncate">{city.subtitle}</div>
            {progress && (
              <div className="flex items-center justify-between mt-2 mb-1">
                <span className="text-[10px] orda-inter" style={{ color: statusColor }}>{statusLabel}</span>
                <span className="text-[10px] orda-cinzel text-[#B8892B]">{progress.percent}%</span>
              </div>
            )}
            <div className="text-[#5C4E38] text-xs orda-inter mt-1">{t("map.clickToExplore")}</div>
          </div>
        );
      })()}
    </div>
  );
}

// ─── ORACLE WIDGET ──────────────────────────────────────────────────────────
// A condensed, always-on-screen sibling of the full AIHistorian page (App.tsx,
// further down) — same data/hooks, a narrow "carved wooden lectern" frame
// instead of a full chat page, and a link out to the full page for long reading.
function OracleWidget({ onNav }: { onNav: (v: View) => void }) {
  const { t, i18n } = useTranslation();
  const chatMutation = useChatMutation();
  const language = (i18n.resolvedLanguage || DEFAULT_LANGUAGE) as ApiLanguage;
  const { data: promptsData } = useSuggestedPrompts(language);
  const { activeCityId } = useActiveCity();
  const { data: citiesData } = useCities();
  const activeCity = activeCityId ? (citiesData?.data || []).find((c) => c.id === activeCityId) : null;
  const [messages, setMessages] = useState<{ role: "ai" | "user"; text: string }[]>([
    { role: "ai", text: t("aiHistorian.greeting") },
  ]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const send = async () => {
    if (!input.trim()) return;
    const userMsg = input.trim();
    setInput("");
    setMessages(m => [...m, { role: "user", text: userMsg }]);
    setTyping(true);
    try {
      const response = await chatMutation.mutateAsync({ message: userMsg, cityId: activeCityId });
      setMessages(m => [...m, { role: "ai", text: response.answer }]);
    } catch {
      setMessages(m => [...m, { role: "ai", text: t("aiHistorian.unavailable") }]);
    } finally {
      setTyping(false);
    }
  };

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, typing]);

  const suggestions = (promptsData?.length
    ? promptsData.map((p) => p.prompt_text)
    : (t("aiHistorian.suggestions", { returnObjects: true }) as string[])
  ).slice(0, 2);

  return (
    <div className="rounded-[14px] overflow-hidden flex flex-col flex-1 min-h-0"
      style={{ background: "#2E2013", border: "2px solid rgba(140,98,57,0.6)", boxShadow: "0 6px 20px rgba(46,32,19,0.35)" }}>

      {/* Dark-wood header */}
      <div className="flex items-center gap-2 px-4 py-3 flex-shrink-0"
        style={{ background: "linear-gradient(180deg,#3B2A1A,#2E2013)", borderBottom: "1px solid rgba(184,137,43,0.3)" }}>
        <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: "rgba(184,137,43,0.15)", border: "1px solid rgba(184,137,43,0.4)" }}>
          <span className="text-xs">⚜</span>
        </div>
        <div className="min-w-0">
          <div className="orda-cinzel text-xs font-bold tracking-wide" style={{ color: "#D8C79C" }}>{t("aiHistorian.title")}</div>
          {activeCity && <div className="text-[9px] orda-inter truncate" style={{ color: "#9C8F72" }}>{activeCity.name}</div>}
        </div>
      </div>

      {/* Parchment message pane, framed by the wood */}
      <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2.5" style={{ background: "#EADFC0" }}>
        {messages.length === 1 && suggestions.length > 0 && (
          <div className="space-y-1.5 mb-1">
            {suggestions.map((s) => (
              <button key={s} onClick={() => setInput(s)}
                className="w-full text-left p-2 rounded-[10px] text-[11px] orda-inter leading-snug"
                style={{ background: "rgba(184,137,43,0.08)", border: "1px solid rgba(59,42,19,0.12)", color: "#5C4E38" }}>
                {s}
              </button>
            ))}
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} ai-bubble`}>
            <div className={`max-w-[88%] rounded-[10px] px-3 py-2 ${msg.role === "user" ? "rounded-tr-[3px]" : "rounded-tl-[3px]"}`}
              style={msg.role === "ai"
                ? { background: "rgba(241,233,210,0.9)", border: "1px solid rgba(59,42,19,0.1)" }
                : { background: "linear-gradient(135deg, rgba(184,137,43,0.22), rgba(184,137,43,0.12))", border: "1px solid rgba(184,137,43,0.3)" }}>
              <p className="orda-inter text-[11px] text-[#2E2013] leading-relaxed">{msg.text}</p>
            </div>
          </div>
        ))}
        {typing && (
          <div className="flex justify-start ai-bubble">
            <div className="rounded-[10px] rounded-tl-[3px] px-3 py-2" style={{ background: "rgba(241,233,210,0.9)", border: "1px solid rgba(59,42,19,0.1)" }}>
              <div className="flex gap-1 items-center h-3">
                {[0, 0.2, 0.4].map((d, i) => (
                  <div key={i} className="w-1 h-1 rounded-full bg-[#8C6239]" style={{ animation: `scroll-bounce 1.2s ease-in-out ${d}s infinite` }} />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input, still within the wooden frame */}
      <div className="flex-shrink-0 p-2.5" style={{ background: "#2E2013", borderTop: "1px solid rgba(184,137,43,0.3)" }}>
        <div className="flex items-center gap-1.5 pl-3 pr-1.5 py-1 rounded-full" style={{ background: "rgba(234,223,192,0.1)", border: "1px solid rgba(184,137,43,0.25)" }}>
          <input
            className="flex-1 bg-transparent outline-none text-[11px] py-1.5"
            style={{ color: "#EADFC0" }}
            placeholder={t("aiHistorian.placeholder")}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); send(); } }}
          />
          <button onClick={send} disabled={!input.trim()} aria-label={t("aiHistorian.sendMessage")}
            className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-colors"
            style={{ background: input.trim() ? "#B8892B" : "transparent", cursor: input.trim() ? "pointer" : "not-allowed" }}>
            <Send size={12} color={input.trim() ? "#2E2013" : "#6B5B47"} />
          </button>
        </div>
        <button onClick={() => onNav("ai")} className="w-full text-center mt-2 text-[9px] orda-inter tracking-wide hover:opacity-80 transition-opacity" style={{ color: "#9C8F72" }}>
          {t("dashboard.openFullOracle")}
        </button>
      </div>
    </div>
  );
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
function Dashboard({ character, onSelectCity, onNav }: {
  character: CharType; onSelectCity: (c: City) => void; onNav: (v: View) => void;
}) {
  const { t } = useTranslation();
  const char = getCharacterData(t)[character];
  const { activeCityId } = useActiveCity();
  const { user } = useAuthSession();

  const { data: citiesData, isLoading: citiesLoading } = useCities();
  const { data: artifactsData } = useArtifacts();
  const { data: questsData, isLoading: questsLoading } = useQuests();
  const { summaryQuery, statsQuery, achievementsQuery } = useProgress();
  const [mobileSheet, setMobileSheet] = useState<"left" | "right" | null>(null);
  // "world"/"cities" both mean "stay on the map" (there's no separate all-cities
  // page) — "timeline" swaps the sidebar's lower section to the journey log.
  const [activeTab, setActiveTab] = useState<"world" | "cities" | "timeline">("world");
  const cityStripRef = useRef<HTMLDivElement>(null);
  const cities = (citiesData?.data || []).map((c) => mapApiCity(c, t));
  const cityNameById = (id: string) => cities.find(c => c.id === id)?.name || t("common.unknown");
  const activeCity = activeCityId ? cities.find(c => c.id === activeCityId) || null : null;
  const artifactsList = artifactsData?.data || [];
  const questsList = questsData?.data || [];

  const summary = summaryQuery.data;
  const stats = statsQuery.data;
  const records = summary?.records;
  const totalQuests = questsData?.meta.total ?? 0;
  const questsCompleted = countCompletedByType(records, "quest");

  // A city counts as "unlocked" once the player has completed at least one quest
  // there — there's no separate city-visit tracking, so this is derived from real
  // quest-completion data (the same source the map's route coloring below uses).
  const completedCitySlugs = new Set(
    questsList
      .filter(q => q.completion_status === "completed")
      .map(q => cities.find(c => c.id === q.city_id)?.slug)
      .filter((slug): slug is string => Boolean(slug))
  );
  const openedCitiesCount = cities.filter(c => c.isUnlocked !== false).length;

  const journeyPercent = calculateJourneyProgress({
    unlockedCities: completedCitySlugs.size,
    totalCities: cities.length,
    completedQuests: questsCompleted,
    totalQuests,
  });

  // Prefer a quest from the active city once one is selected — same "single source
  // of truth" rule as everything else on this screen. Falls back to the first
  // incomplete quest anywhere once no city has been picked yet.
  const incompleteQuests = questsList
    .map(q => ({ ...mapApiQuest(q, cityNameById(q.city_id)), completionStatus: q.completion_status, city_id: q.city_id }))
    .filter(q => q.completionStatus !== "completed");
  const activeQuest =
    (activeCityId ? incompleteQuests.find(q => q.city_id === activeCityId) : undefined) ||
    incompleteQuests[0] ||
    null;

  // Chronological journey log for the Timeline tab — same source/pattern as the
  // Passport page's own timeline (see describeProgressRecord below).
  const timeline = (records || [])
    .filter(r => r.completed_at)
    .slice()
    .sort((a, b) => new Date(b.completed_at as string).getTime() - new Date(a.completed_at as string).getTime())
    .slice(0, 8);
  const achievements = achievementsQuery.data || [];

  // Per-city completion %, feeding the map tooltip's status/percent lines and the
  // active-city "exam progress" bar below — `Map` the class is shadowed by the
  // `Map` icon imported from lucide-react above.
  const questsByCityId = new globalThis.Map<string, ApiQuest[]>();
  questsList.forEach((q) => {
    const list = questsByCityId.get(q.city_id) || [];
    list.push(q);
    questsByCityId.set(q.city_id, list);
  });
  const cityProgress: Record<string, { percent: number; status: "not_started" | "in_progress" | "completed" }> = {};
  cities.forEach((city) => {
    const cityQuests = questsByCityId.get(city.id) || [];
    const total = cityQuests.length;
    const completed = cityQuests.filter((q) => q.completion_status === "completed").length;
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
    const status: "not_started" | "in_progress" | "completed" =
      total === 0 || completed === 0 ? "not_started" : completed === total ? "completed" : "in_progress";
    cityProgress[city.slug] = { percent, status };
  });
  const activeCityProgress = activeCity ? cityProgress[activeCity.slug] : undefined;

  const closeMobileSheet = () => setMobileSheet(null);
  const NAV_TABS: { key: "world" | "cities" | "current" | "artifacts" | "timeline"; label: string; icon: typeof Globe }[] = [
    { key: "world", label: t("dashboard.tabs.world"), icon: Globe },
    { key: "cities", label: t("dashboard.tabs.cities"), icon: Compass },
    { key: "current", label: t("dashboard.tabs.currentCity"), icon: MapPin },
    { key: "artifacts", label: t("dashboard.tabs.artifacts"), icon: Package },
    { key: "timeline", label: t("dashboard.tabs.timeline"), icon: Clock },
  ];
  const handleTabClick = (key: typeof NAV_TABS[number]["key"]) => {
    if (key === "artifacts") { onNav("artifacts"); return; }
    if (key === "current") { if (activeCity) onSelectCity(activeCity); return; }
    if (key === "cities") { setActiveTab("cities"); cityStripRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }); return; }
    setActiveTab(key);
  };

  return (
    <div className="h-screen pt-16 flex flex-col overflow-hidden" style={{ background: "#EDE1C4" }}>
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[280px_1fr_300px] gap-0 overflow-hidden">

        {/* Mobile drawer backdrop */}
        {mobileSheet && (
          <div className="fixed inset-0 z-30 md:hidden" style={{ background: "rgba(46,32,19,0.55)" }} onClick={closeMobileSheet} />
        )}

        {/* Left Sidebar — the explorer's passport */}
        <aside
          className={`${mobileSheet === "left" ? "flex fixed inset-x-0 bottom-0 z-40 max-h-[70vh] rounded-t-[24px] animate-slide-up" : "hidden"} md:flex md:static md:max-h-none md:rounded-none md:z-auto order-2 md:order-1 overflow-y-auto border-b md:border-b-0 md:border-r flex-col gap-4 p-5`}
          style={{ borderColor: "rgba(59,42,19,0.18)", background: "#DCCBA0" }}>

          {/* Player card: avatar, level, XP, coins, notifications */}
          <div className="rounded-[16px] p-4" style={{ background: "rgba(241,233,210,0.6)", border: "1px solid rgba(59,42,19,0.14)" }}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0"
                style={{ background: `linear-gradient(135deg, ${char.color}25, ${char.color}0a)`, border: `2px solid ${char.color}45` }}>
                {user?.avatar_url ? (
                  <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <char.icon size={20} color={char.color} />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[#2E2013] text-sm font-semibold orda-cinzel truncate">{user?.username || char.name}</div>
                <div className="text-[10px] text-[#5C4E38] orda-inter">{t("dashboard.level", { level: stats?.level ?? 1 })}</div>
              </div>
              <NotificationBell />
            </div>

            {/* XP bar — a progress scroll, grounded in the same journey-completion
                percent used elsewhere (there's no separate xp-to-next-level curve
                in the API, so this stays honestly labeled as journey progress). */}
            <div className="mb-1 flex items-center justify-between">
              <span className="text-[9px] orda-cinzel tracking-[0.15em] text-[#5C4E38]">{t("dashboard.journey")}</span>
              <span className="text-[10px] orda-cinzel text-[#B8892B] font-semibold">{stats?.xp ?? 0} XP</span>
            </div>
            <div className="w-full h-2 rounded-full mb-3" style={{ background: "rgba(59,42,19,0.1)", border: "1px solid rgba(59,42,19,0.08)" }}>
              <div className="h-full rounded-full progress-bar-fill" style={{ width: `${journeyPercent}%`, background: "linear-gradient(90deg,#B8892B,#8C6239)" }} />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg" style={{ background: "rgba(184,137,43,0.08)" }}>
                <Coins size={13} color="#B8892B" />
                <span className="text-xs orda-cinzel text-[#2E2013] font-semibold">{stats?.coins ?? 0}</span>
              </div>
              <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg" style={{ background: "rgba(184,137,43,0.08)" }}>
                <MapPin size={13} color="#B8892B" />
                <span className="text-xs orda-cinzel text-[#2E2013] font-semibold">{openedCitiesCount}/{cities.length}</span>
              </div>
            </div>
          </div>

          {/* Current Path — the player's permanently-visible, backend-persisted
              progression route (`user.journey`), so it reads correctly even
              right after a refresh instead of silently defaulting. */}
          <div className="rounded-[16px] p-4" style={{ background: `linear-gradient(135deg, ${char.color}14, rgba(241,233,210,0.65))`, border: `1.5px solid ${char.color}50` }}>
            <span className="badge-gold text-[9px] inline-block mb-2">{t("dashboard.currentPath", { role: char.name })}</span>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${char.color}22`, border: `1px solid ${char.color}50` }}>
                <char.icon size={18} color={char.color} />
              </div>
              <div className="min-w-0">
                <div className="orda-cinzel text-sm font-bold text-[#2E2013] truncate">{char.name}</div>
                <div className="orda-inter text-[10px] text-[#5C4E38] truncate">{char.title}</div>
              </div>
            </div>
            <p className="orda-inter text-[11px] text-[#5C4E38] leading-relaxed line-clamp-2">{char.description}</p>
            {activeQuest && (
              <div className="flex items-center gap-1.5 mt-2 pt-2" style={{ borderTop: `1px solid ${char.color}25` }}>
                <Zap size={11} color={char.color} className="flex-shrink-0" />
                <span className="orda-inter text-[10px] text-[#2E2013] truncate">{activeQuest.title}</span>
              </div>
            )}
          </div>

          {/* Sidebar tab switcher — mirrors the bottom nav's Timeline tab */}
          <div className="flex rounded-full p-1" style={{ background: "rgba(59,42,19,0.06)" }}>
            {(["city", "timeline"] as const).map((tab) => (
              <button key={tab}
                onClick={() => setActiveTab(tab === "city" ? "world" : "timeline")}
                className={`flex-1 py-1.5 rounded-full text-[10px] orda-cinzel tracking-wide transition-colors ${
                  (tab === "city" ? activeTab !== "timeline" : activeTab === "timeline") ? "tab-active" : "tab-inactive"
                }`}
                style={(tab === "city" ? activeTab !== "timeline" : activeTab === "timeline") ? { background: "#B8892B", color: "#EDE1C4", borderBottom: "none" } : { borderBottom: "none" }}>
                {tab === "city" ? t("dashboard.tabs.currentCity") : t("dashboard.tabs.timeline")}
              </button>
            ))}
          </div>

          {activeTab !== "timeline" ? (
            /* Current-city card: illustration, summary, exam progress, mission */
            activeCity ? (
              <div className="rounded-[16px] overflow-hidden" style={{ background: "rgba(241,233,210,0.6)", border: "1px solid rgba(59,42,19,0.14)" }}>
                <div className="h-28 relative">
                  {activeCity.imageUrl ? (
                    <img src={activeCity.imageUrl} alt={activeCity.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full" style={{ background: `linear-gradient(135deg, ${activeCity.color}30, #DCCBA0)` }} />
                  )}
                  <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, transparent 40%, rgba(46,32,19,0.55) 100%)" }} />
                  <div className="absolute bottom-2 left-3 right-3">
                    <div className="text-white text-sm font-bold orda-cinzel" style={{ textShadow: "0 1px 4px rgba(0,0,0,0.6)" }}>{activeCity.name}</div>
                  </div>
                </div>
                <div className="p-4">
                  <p className="text-[11px] orda-inter text-[#5C4E38] leading-relaxed line-clamp-3 mb-3">{activeCity.description}</p>

                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-[9px] orda-cinzel tracking-[0.15em] text-[#5C4E38]">{t("dashboard.examProgress")}</span>
                    <span className="text-[10px] orda-cinzel text-[#B8892B] font-semibold">{activeCityProgress?.percent ?? 0}%</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full mb-3" style={{ background: "rgba(59,42,19,0.1)" }}>
                    <div className="h-full rounded-full progress-bar-fill" style={{ width: `${activeCityProgress?.percent ?? 0}%`, background: "linear-gradient(90deg,#B8892B,#8C6239)" }} />
                  </div>

                  {questsLoading ? (
                    <div className="h-10 rounded-lg mb-3" style={{ background: "rgba(59,42,19,0.05)" }} />
                  ) : activeQuest ? (
                    <div className="rounded-lg p-2.5 mb-3" style={{ background: "rgba(184,137,43,0.06)", border: "1px solid rgba(184,137,43,0.12)" }}>
                      <div className="text-[10px] orda-cinzel tracking-widest text-[#5C4E38] mb-1">{t("dashboard.currentMission")}</div>
                      <div className="text-xs orda-cinzel text-[#2E2013] font-semibold">{activeQuest.title}</div>
                      <span className="badge-gold text-[9px] mt-1 inline-block">+{activeQuest.xp} XP</span>
                    </div>
                  ) : (
                    <p className="text-[11px] orda-inter text-[#5C4E38] mb-3">{t("dashboard.noQuests")}</p>
                  )}

                  <button onClick={() => onNav("quests")} className="btn-primary w-full text-[11px] py-2.5 flex items-center justify-center gap-2">
                    <ScrollText size={13} /> {t("dashboard.openExamination")}
                  </button>
                </div>
              </div>
            ) : (
              <div className="rounded-[16px] p-4 text-center" style={{ background: "rgba(241,233,210,0.4)", border: "1px solid rgba(59,42,19,0.1)" }}>
                <p className="text-[11px] orda-inter text-[#5C4E38]">{t("dashboard.noActiveCity")}</p>
              </div>
            )
          ) : (
            /* Timeline tab: achievements + completed-quest/artifact/city log */
            <div className="flex-1 min-h-0 flex flex-col gap-4">
              {achievements.length > 0 && (
                <div>
                  <div className="text-[10px] orda-cinzel tracking-[0.2em] text-[#5C4E38] mb-2 px-1">{t("dashboard.achievementsLabel")}</div>
                  <div className="space-y-2">
                    {achievements.slice(0, 3).map((a) => (
                      <div key={a.id} className="flex items-center gap-3 p-2 rounded-xl" style={{ background: "rgba(184,137,43,0.06)" }}>
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "rgba(184,137,43,0.15)" }}>
                          <Award size={13} color="#B8892B" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs orda-cinzel text-[#2E2013] truncate">{a.title}</div>
                          <div className="text-[10px] orda-inter text-[#5C4E38] truncate">{a.description}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex-1 min-h-0">
                <div className="text-[10px] orda-cinzel tracking-[0.2em] text-[#5C4E38] mb-2 px-1">{t("dashboard.journeyLog")}</div>
                {summaryQuery.isLoading ? (
                  <div className="h-16 rounded-xl" style={{ background: "rgba(59,42,19,0.03)" }} />
                ) : timeline.length > 0 ? (
                  <div className="relative">
                    <div className="absolute left-[5px] top-1 bottom-1 w-px" style={{ background: "rgba(184,137,43,0.25)" }} />
                    <div className="space-y-3">
                      {timeline.map((record) => (
                        <div key={record.id} className="flex items-start gap-3">
                          <div className="w-[11px] h-[11px] rounded-full mt-0.5 flex-shrink-0" style={{ background: "#B8892B" }} />
                          <div className="min-w-0">
                            <p className="text-xs orda-inter text-[#2E2013]">{describeProgressRecord(t, record, cities, artifactsList, questsList)}</p>
                            <p className="text-[10px] orda-inter text-[#5C4E38]">{new Date(record.completed_at as string).toLocaleDateString()}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-[11px] orda-inter text-[#5C4E38] px-1">{t("dashboard.noQuests")}</p>
                )}
              </div>
            </div>
          )}
        </aside>

        {/* Map Center */}
        <main className="order-1 lg:order-2 p-4 flex flex-col overflow-hidden min-h-[360px] relative">
          <div className="mb-3">
            <h2 className="orda-cinzel text-base font-bold text-[#2E2013] tracking-wider">{t("dashboard.interactiveMap")}</h2>
            <p className="text-xs text-[#5C4E38] orda-inter">{t("dashboard.mapSubtitle")}</p>
          </div>
          <div className="flex-1 min-h-0">
            <InteractiveMap cities={cities} onSelectCity={onSelectCity} journey={character} completedCitySlugs={completedCitySlugs} cityProgress={cityProgress} activeCityId={activeCityId} />
          </div>

          {/* Bottom navigation — rounded parchment tabs, gold active state */}
          <div className="mt-3 flex justify-center">
            <div className="inline-flex rounded-full p-1 gap-1" style={{ background: "rgba(220,203,160,0.7)", border: "1px solid rgba(59,42,19,0.14)" }}>
              {NAV_TABS.map(({ key, label, icon: Icon }) => {
                const isActive = key === "world" ? activeTab === "world" : key === "cities" ? activeTab === "cities" : key === "timeline" ? activeTab === "timeline" : false;
                const isDisabled = key === "current" && !activeCity;
                return (
                  <button key={key} onClick={() => handleTabClick(key)} disabled={isDisabled}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] orda-cinzel tracking-wide transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    style={isActive ? { background: "#B8892B", color: "#EDE1C4" } : { color: "#5C4E38" }}>
                    <Icon size={12} />
                    <span className="hidden sm:inline">{label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* City quick-access row — the active one stays visually distinct from the rest */}
          <div ref={cityStripRef} className="mt-3 flex gap-3 overflow-x-auto pb-1">
            {(citiesLoading ? Array.from({ length: 6 }) : cities).map((city, index) => (
              citiesLoading || !city ? (
                <div key={`city-skeleton-${index}`} className="rounded-[12px] px-3 py-2 h-9 w-24 flex-shrink-0" style={{ background: "rgba(59,42,19,0.04)", border: "1px solid rgba(59,42,19,0.06)" }} />
              ) : city.isUnlocked === false ? (
                <button key={city.id} disabled title={t("map.lockedTooltip")}
                  className="flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl text-xs orda-cinzel tracking-wide opacity-40 blur-[0.5px]"
                  style={{ background: "rgba(241,233,210,0.3)", border: "1px solid rgba(59,42,19,0.04)", color: "#9C8F72", cursor: "not-allowed" }}>
                  <span className="text-[11px]">🔒</span>
                  {city.name}
                </button>
              ) : (
                <button key={city.id} onClick={() => onSelectCity(city)}
                  className="flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl text-xs orda-cinzel tracking-wide transition-all hover:border-[#B8892B50] hover:text-[#B8892B]"
                  style={{
                    background: city.id === activeCityId ? "rgba(184,137,43,0.12)" : "rgba(241,233,210,0.6)",
                    border: `1px solid ${city.id === activeCityId ? "rgba(184,137,43,0.4)" : "rgba(59,42,19,0.06)"}`,
                    color: city.id === activeCityId ? "#B8892B" : "#5C4E38",
                  }}>
                  <MapPin size={11} color="#B8892B" />
                  {city.name}
                </button>
              )
            ))}
          </div>

          {/* Mobile sidebar toggles */}
          <div className="md:hidden absolute bottom-20 left-3 right-3 flex justify-between pointer-events-none">
            <button onClick={() => setMobileSheet(mobileSheet === "left" ? null : "left")}
              className="pointer-events-auto glass rounded-full px-4 py-2 text-[11px] orda-cinzel tracking-wide text-[#B8892B] flex items-center gap-1.5">
              <User size={12} /> {t("dashboard.mobileQuestsPanel")}
            </button>
            <button onClick={() => setMobileSheet(mobileSheet === "right" ? null : "right")}
              className="pointer-events-auto glass rounded-full px-4 py-2 text-[11px] orda-cinzel tracking-wide text-[#B8892B] flex items-center gap-1.5">
              <MessageSquare size={12} /> {t("aiHistorian.title")}
            </button>
          </div>
        </main>

        {/* Right Panel — AI Oracle */}
        <aside
          className={`${mobileSheet === "right" ? "flex fixed inset-x-0 bottom-0 z-40 max-h-[70vh] rounded-t-[24px] animate-slide-up" : "hidden"} lg:flex lg:static lg:max-h-none lg:rounded-none lg:z-auto order-3 flex-col min-h-0 p-4`}
          style={{ borderLeft: "1px solid rgba(59,42,19,0.18)", background: "#DCCBA0" }}>
          <OracleWidget onNav={onNav} />
        </aside>
      </div>
    </div>
  );
}

// ─── CITY PAGE ────────────────────────────────────────────────────────────────
function CityPage({ city, onBack, onNav }: { city: City; onBack: () => void; onNav: (v: View) => void }) {
  const { t, i18n } = useTranslation();
  const { data: artifactsData, isLoading: artifactsLoading } = useArtifacts();
  const artifacts = (artifactsData?.data || []).filter((artifact) => artifact.city_id === city.id).slice(0, 3);
  const [activeTab, setActiveTab] = useState<"overview" | "timeline" | "gallery" | "stats">("overview");
  const [selectedArtifact, setSelectedArtifact] = useState<Artifact | null>(null);
  const language = (i18n.resolvedLanguage || DEFAULT_LANGUAGE) as ApiLanguage;
  const { data: galleryData, isLoading: galleryLoading } = useCityGallery(city.id, language);
  const galleryImages = galleryData || [];

  const timelineEvents = [
    { year: "1220s", event: t("city.timelineEvents.mongolArrival") },
    { year: city.founded, event: t("city.timelineEvents.settlementEstablished", { city: city.name }) },
    { year: "1280s", event: t("city.timelineEvents.peakProsperity") },
    { year: "1313", event: t("city.timelineEvents.islamConversion") },
    { year: "1395", event: t("city.timelineEvents.timurInvasion") },
    { year: "1438", event: t("city.timelineEvents.dissolution") },
  ];

  const statsGrid = [
    [t("city.statsLabels.tradeRoutes"), "12", t("city.statsLabels.tradeRoutesSub")],
    [t("city.statsLabels.mosques"), "13", t("city.statsLabels.mosquesSub")],
    [t("city.statsLabels.population2"), city.population, t("city.statsLabels.populationSub")],
    [t("city.statsLabels.languages"), "7+", t("city.statsLabels.languagesSub")],
    [t("city.statsLabels.crafts"), "40+", t("city.statsLabels.craftsSub")],
    [t("city.statsLabels.caravanserais"), "8", t("city.statsLabels.caravanseraisSub")],
    [t("city.statsLabels.palaces"), "3", t("city.statsLabels.palacesSub")],
    [t("city.statsLabels.centuries"), "3", t("city.statsLabels.centuriesSub")],
  ];

  return (
    <div className="min-h-screen pt-16 animate-fade-in" style={{ background: "#EDE1C4" }}>
      {/* Hero Banner */}
      <div className="relative min-h-[300px] sm:h-72 overflow-hidden">
        <div className="absolute inset-0"
          style={{ background: "linear-gradient(135deg, #DCCBA0 0%, #EDE1C4 50%, #DCCBA0 100%)" }} />
        <div className="absolute inset-0"
          style={{ background: `radial-gradient(ellipse at 30% 60%, ${city.color}18 0%, transparent 60%)` }} />

        {/* Decorative pattern */}
        <svg className="absolute right-0 top-0 h-full opacity-10" viewBox="0 0 400 280" preserveAspectRatio="xMaxYMid slice">
          {Array.from({ length: 8 }, (_, i) =>
            Array.from({ length: 6 }, (_, j) => (
              <circle key={`${i}-${j}`} cx={i * 55 + 20} cy={j * 50 + 15} r="2"
                fill={city.color} opacity="0.6" />
            ))
          )}
          <path d="M 50,140 L 350,140" stroke={city.color} strokeWidth="0.5" opacity="0.3" />
          <path d="M 200,20 L 200,260" stroke={city.color} strokeWidth="0.5" opacity="0.3" />
        </svg>

        <div className="relative z-10 h-full flex flex-col justify-end px-8 lg:px-16 pb-8">
          <button onClick={onBack} className="flex items-center gap-2 text-sm text-[#5C4E38] hover:text-[#2E2013] transition-colors mb-4 orda-inter">
            <ChevronLeft size={16} /> {t("city.backToMap")}
          </button>
          <div className="flex flex-col sm:flex-row sm:items-end gap-4 sm:gap-6">
            <div>
              <div className="badge-gold mb-3">{t("city.goldenHordeCity")}</div>
              <h1 className="orda-cinzel text-3xl sm:text-4xl md:text-5xl font-bold text-[#2E2013] mb-2 gold-glow-text">{city.name}</h1>
              <p className="orda-cormorant text-xl text-[#B8892B] italic">{city.subtitle}</p>
            </div>
            <div className="sm:ml-auto flex flex-wrap gap-3 flex-shrink-0">
              <button onClick={() => onNav("quests")} className="btn-primary text-sm py-3 px-6 flex items-center gap-2">
                <Zap size={14} /> {t("city.quest")}
              </button>
              <button onClick={() => onNav("ai")} className="btn-teal text-sm py-3 px-6 flex items-center gap-2">
                <MessageSquare size={14} /> {t("city.talkToAi")}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b px-8 lg:px-16 flex gap-6 sm:gap-8 overflow-x-auto"
        style={{ borderColor: "rgba(59,42,19,0.06)" }}>
        {(["overview", "timeline", "gallery", "stats"] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`py-4 text-sm orda-cinzel tracking-wider capitalize transition-all duration-200 flex-shrink-0 whitespace-nowrap ${activeTab === tab ? "tab-active" : "tab-inactive"}`}>
            {t(`city.tabs.${tab}`)}
          </button>
        ))}
      </div>

      <div className="max-w-[1200px] mx-auto px-8 lg:px-16 py-10">
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-slide-up">
            <div className="lg:col-span-2 space-y-6">
              {/* Description */}
              <div className="rounded-[20px] p-7" style={{ background: "rgba(241,233,210,0.5)", border: "1px solid rgba(59,42,19,0.06)" }}>
                <h2 className="orda-cinzel text-lg font-semibold text-[#2E2013] mb-4">{t("city.historicalOverview")}</h2>
                <p className="orda-inter text-[#5C4E38] leading-[1.85] text-base">{city.description}</p>
              </div>

              {/* Importance */}
              <div className="rounded-[20px] p-7" style={{ background: "rgba(184,137,43,0.04)", border: "1px solid rgba(184,137,43,0.1)" }}>
                <div className="flex items-center gap-3 mb-3">
                  <Crown size={18} color="#B8892B" />
                  <h2 className="orda-cinzel text-base font-semibold text-[#B8892B]">{t("city.strategicImportance")}</h2>
                </div>
                <p className="orda-cormorant text-xl italic text-[#2E2013] leading-relaxed">{city.importance}</p>
              </div>

              {/* Facts */}
              <div className="rounded-[20px] p-7" style={{ background: "rgba(241,233,210,0.5)", border: "1px solid rgba(59,42,19,0.06)" }}>
                <h2 className="orda-cinzel text-base font-semibold text-[#2E2013] mb-4">{t("city.remarkableFacts")}</h2>
                <div className="space-y-3">
                  {city.facts.map((fact, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold orda-cinzel mt-0.5"
                        style={{ background: "rgba(184,137,43,0.12)", color: "#B8892B", border: "1px solid rgba(184,137,43,0.2)" }}>
                        {i + 1}
                      </div>
                      <p className="orda-inter text-sm text-[#5C4E38] leading-relaxed">{fact}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Trade information */}
              {city.tradeInfo && (
                <div className="rounded-[20px] p-7" style={{ background: "rgba(107,140,163,0.04)", border: "1px solid rgba(107,140,163,0.12)" }}>
                  <div className="flex items-center gap-3 mb-3">
                    <ShoppingBag size={18} color="#6B8CA3" />
                    <h2 className="orda-cinzel text-base font-semibold text-[#6B8CA3]">{t("city.tradeInformation")}</h2>
                  </div>
                  <p className="orda-inter text-sm text-[#5C4E38] leading-relaxed">{city.tradeInfo}</p>
                </div>
              )}
            </div>

            {/* Sidebar stats */}
            <div className="space-y-4">
              {[[t("city.founded"), city.founded], [t("city.population"), city.population], [t("city.era"), t("city.eraValue")], [t("city.region"), t("city.regionValue")]].map(([k, v]) => (
                <div key={k} className="rounded-[16px] p-5" style={{ background: "rgba(241,233,210,0.4)", border: "1px solid rgba(59,42,19,0.06)" }}>
                  <div className="text-[10px] orda-cinzel tracking-[0.2em] text-[#5C4E38] mb-1">{k}</div>
                  <div className="text-[#2E2013] text-base orda-cinzel font-semibold">{v}</div>
                </div>
              ))}

              {/* Related Artifacts */}
              <div className="rounded-[16px] p-5" style={{ background: "rgba(241,233,210,0.4)", border: "1px solid rgba(59,42,19,0.06)" }}>
                <div className="text-[10px] orda-cinzel tracking-[0.2em] text-[#5C4E38] mb-3">{t("city.cityArtifacts")}</div>
                {(artifactsLoading ? Array.from({ length: 3 }) : artifacts).map((a, index) => (
                  artifactsLoading || !a ? (
                    <div key={`city-artifact-skeleton-${index}`} className="rounded-[14px] p-4" style={{ background: "rgba(59,42,19,0.03)", border: "1px solid rgba(59,42,19,0.05)" }}>
                      <div className="h-2 w-24 rounded-full mb-2" style={{ background: "rgba(59,42,19,0.05)" }} />
                      <div className="h-2 w-16 rounded-full" style={{ background: "rgba(59,42,19,0.05)" }} />
                    </div>
                  ) : (
                    <div key={a.id} className="rounded-[14px] p-4 cursor-pointer hover:bg-[rgba(59,42,19,0.05)] transition-colors"
                      style={{ background: "rgba(59,42,19,0.03)", border: "1px solid rgba(59,42,19,0.05)" }}
                      onClick={() => setSelectedArtifact(mapApiArtifact(a, city.name, t))}>
                      <div className="text-[10px] orda-cinzel tracking-[0.2em] text-[#B8892B] mb-1">{a.era}</div>
                      <div className="text-sm orda-cinzel text-[#2E2013]">{a.name}</div>
                    </div>
                  )
                ))}
                <button onClick={() => onNav("artifacts")} className="mt-3 w-full py-2 rounded-xl text-xs orda-cinzel text-[#B8892B] hover:bg-[#B8892B10] transition-colors">
                  {t("city.viewAllArtifacts")}
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === "timeline" && (
          <div className="max-w-2xl animate-slide-up">
            <h2 className="orda-cinzel text-xl font-bold text-[#2E2013] mb-8">{t("city.historicalTimeline")}</h2>
            <div className="relative">
              <div className="absolute left-[72px] top-0 bottom-0 w-px" style={{ background: "linear-gradient(180deg, transparent, rgba(184,137,43,0.3) 10%, rgba(184,137,43,0.3) 90%, transparent)" }} />
              <div className="space-y-6">
                {timelineEvents.map((e, i) => (
                  <div key={i} className="flex items-start gap-6 animate-slide-right" style={{ animationDelay: `${i * 0.1}s` }}>
                    <div className="w-16 flex-shrink-0 text-right">
                      <span className="text-xs orda-cinzel text-[#B8892B] font-semibold">{e.year}</span>
                    </div>
                    <div className="relative">
                      <div className="w-3 h-3 rounded-full mt-1 border-2 border-[#B8892B]"
                        style={{ background: "#EDE1C4", boxShadow: "0 0 8px rgba(184,137,43,0.4)" }} />
                    </div>
                    <div className="flex-1 pb-2">
                      <p className="orda-inter text-sm text-[#5C4E38] leading-relaxed">{e.event}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === "gallery" && (
          <div className="animate-slide-up">
            <h2 className="orda-cinzel text-xl font-bold text-[#2E2013] mb-8">{t("city.gallery")}</h2>
            {galleryLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {Array.from({ length: 4 }, (_, i) => (
                  <div key={i} className="aspect-[4/3] rounded-[16px]" style={{ background: "rgba(241,233,210,0.5)" }} />
                ))}
              </div>
            ) : galleryImages.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {galleryImages.map((image) => (
                  <div key={image.id} className="aspect-[4/3] rounded-[16px] overflow-hidden relative gold-hover cursor-pointer"
                    style={{ border: "1px solid rgba(59,42,19,0.06)" }}>
                    <img src={image.image_url} alt={image.alt_text || image.title || city.name}
                      className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
                    {image.title && (
                      <div className="absolute inset-x-0 bottom-0 px-3 py-2"
                        style={{ background: "linear-gradient(0deg, rgba(230,216,184,0.9), transparent)" }}>
                        <span className="text-xs orda-cinzel text-[#2E2013]">{image.title}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-[20px] p-10 text-center" style={{ background: "rgba(241,233,210,0.4)", border: "1px solid rgba(59,42,19,0.06)" }}>
                <p className="orda-inter text-sm text-[#5C4E38]">{t("city.noGalleryImages")}</p>
              </div>
            )}
          </div>
        )}

        {activeTab === "stats" && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-slide-up">
            {statsGrid.map(([label, value, sub]) => (
              <div key={label} className="rounded-[20px] p-6 text-center"
                style={{ background: "rgba(241,233,210,0.5)", border: "1px solid rgba(59,42,19,0.06)" }}>
                <div className="text-3xl font-bold orda-cinzel text-[#B8892B] mb-1">{value}</div>
                <div className="text-sm orda-cinzel text-[#2E2013] mb-1">{label}</div>
                <div className="text-[11px] orda-inter text-[#5C4E38]">{sub}</div>
              </div>
            ))}
          </div>
        )}
      </div>
      <ArtifactDetailModal artifact={selectedArtifact} onClose={() => setSelectedArtifact(null)} />
    </div>
  );
}

// ─── AI HISTORIAN ─────────────────────────────────────────────────────────────
function AIHistorian({ onBack }: { onBack: () => void }) {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const rrNavigate = useNavigate();
  const chatMutation = useChatMutation();
  const language = (i18n.resolvedLanguage || DEFAULT_LANGUAGE) as ApiLanguage;
  const { data: promptsData } = useSuggestedPrompts(language);
  const { activeCityId, setActiveCityId } = useActiveCity();
  const { data: citiesData } = useCities();
  const activeCity = activeCityId ? (citiesData?.data || []).find((c) => c.id === activeCityId) : null;
  const [messages, setMessages] = useState<{ role: "ai" | "user"; text: string }[]>([
    { role: "ai", text: t("aiHistorian.greeting") },
  ]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-grow the textarea only as the user actually types multiple lines — capped at
  // 140px, then it scrolls internally instead of growing further.
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
  }, [input]);

  // Deep-link from global search: land here with the picked suggested question prefilled.
  useEffect(() => {
    const prefill = (location.state as { prefillPrompt?: string } | null)?.prefillPrompt;
    if (!prefill) return;
    setInput(prefill);
    rrNavigate(location.pathname, { replace: true, state: {} });
  }, [location.state]);

  const send = async () => {
    if (!input.trim()) return;
    const userMsg = input.trim();
    setInput("");
    setMessages(m => [...m, { role: "user", text: userMsg }]);
    setTyping(true);

    try {
      const response = await chatMutation.mutateAsync({ message: userMsg, cityId: activeCityId });
      setMessages(m => [...m, { role: "ai", text: response.answer }]);
    } catch {
      setMessages(m => [...m, { role: "ai", text: t("aiHistorian.unavailable") }]);
    } finally {
      setTyping(false);
    }
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  const suggestions = promptsData?.length
    ? promptsData.map((p) => p.prompt_text)
    : (t("aiHistorian.suggestions", { returnObjects: true }) as string[]);

  return (
    <div className="h-screen pt-16 flex flex-col overflow-hidden" style={{ background: "#EDE1C4" }}>
      <div className="flex-1 min-h-0 max-w-[900px] mx-auto w-full px-4 sm:px-6 flex flex-col">

        {/* Header */}
        <div className="flex items-center gap-4 py-4 flex-shrink-0 animate-fade-in">
          <button onClick={onBack} className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-[rgba(59,42,19,0.06)] transition-colors"
            style={{ border: "1px solid rgba(59,42,19,0.06)" }}>
            <ChevronLeft size={16} color="#5C4E38" />
          </button>
          <div className="flex items-center gap-4 flex-1">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center animate-float"
              style={{ background: "linear-gradient(135deg,rgba(107,140,163,0.15),rgba(107,140,163,0.05))", border: "1px solid rgba(107,140,163,0.25)", boxShadow: "0 3px 10px rgba(59,42,19,0.15)" }}>
              <span className="text-xl">⚜</span>
            </div>
            <div>
              <h1 className="orda-cinzel text-lg font-bold text-[#2E2013]">{t("aiHistorian.title")}</h1>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#7C8B5A]" style={{ boxShadow: "0 0 6px rgba(124,139,90,0.6)" }} />
                <span className="text-xs orda-inter text-[#5C4E38]">{t("aiHistorian.status")}</span>
              </div>
            </div>
          </div>
          <div className="badge-teal">{t("aiHistorian.beta")}</div>
        </div>

        {/* Active-city context — the same activeCityId the map, quest panel, and
            artifact filtering all share, so the historian's answers stay scoped
            to whatever city the user was just looking at. */}
        {activeCity && (
          <button onClick={() => setActiveCityId(null)}
            className="self-start flex-shrink-0 inline-flex items-center gap-2 mb-3 px-3 py-1.5 rounded-full text-xs orda-inter transition-colors hover:opacity-80"
            style={{ background: "rgba(107,140,163,0.1)", color: "#6B8CA3", border: "1px solid rgba(107,140,163,0.25)" }}>
            <MapPin size={11} />
            {t("aiHistorian.discussingCity", { city: activeCity.name })}
            <X size={11} />
          </button>
        )}

        {/* Scrollable messages area — the only part of this view that scrolls */}
        <div className="flex-1 min-h-0 space-y-4 overflow-y-auto pr-1">
          {/* Suggested questions (show initially) */}
          {messages.length === 1 && (
            <div className="animate-slide-up">
              <p className="text-xs orda-cinzel tracking-widest text-[#5C4E38] mb-3">{t("aiHistorian.suggestedQuestions")}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {suggestions.map((s) => (
                  <button key={s} onClick={() => { setInput(s); }}
                    className="text-left p-3 rounded-[14px] text-xs orda-inter text-[#5C4E38] hover:text-[#2E2013] transition-all gold-hover"
                    style={{ background: "rgba(241,233,210,0.5)", border: "1px solid rgba(59,42,19,0.06)" }}>
                    <ChevronRight size={12} className="inline mr-1 text-[#B8892B]" />
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} ai-bubble`}
              style={{ animationDelay: "0s" }}>
              {msg.role === "ai" && (
                <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mr-3 mt-1"
                  style={{ background: "rgba(107,140,163,0.12)", border: "1px solid rgba(107,140,163,0.2)" }}>
                  <span className="text-sm">⚜</span>
                </div>
              )}
              <div className={`max-w-[80%] rounded-[18px] px-5 py-4 ${msg.role === "user" ? "rounded-tr-[6px]" : "rounded-tl-[6px]"}`}
                style={msg.role === "ai"
                  ? { background: "rgba(241,233,210,0.7)", border: "1px solid rgba(59,42,19,0.07)" }
                  : { background: "linear-gradient(135deg, rgba(184,137,43,0.15), rgba(184,137,43,0.08))", border: "1px solid rgba(184,137,43,0.2)" }}>
                <p className="orda-inter text-sm text-[#2E2013] leading-[1.75]">{msg.text}</p>
                {msg.role === "ai" && (
                  <div className="mt-3 pt-3 border-t border-[rgba(59,42,19,0.15)] flex items-center justify-between">
                    <span className="text-[10px] orda-inter text-[#5C4E38] flex items-center gap-1">
                      <BookOpen size={10} /> {t("aiHistorian.basedOnRecords")}
                    </span>
                    <span className="text-[10px] orda-cinzel text-[#B8892B]">{t("aiHistorian.aiLabel")}</span>
                  </div>
                )}
              </div>
            </div>
          ))}

          {typing && (
            <div className="flex justify-start ai-bubble">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mr-3"
                style={{ background: "rgba(107,140,163,0.12)", border: "1px solid rgba(107,140,163,0.2)" }}>
                <span className="text-sm">⚜</span>
              </div>
              <div className="rounded-[18px] rounded-tl-[6px] px-5 py-4"
                style={{ background: "rgba(241,233,210,0.7)", border: "1px solid rgba(59,42,19,0.07)" }}>
                <div className="flex gap-1.5 items-center h-5">
                  {[0, 0.2, 0.4].map((d, i) => (
                    <div key={i} className="w-1.5 h-1.5 rounded-full bg-[#6B8CA3]"
                      style={{ animation: `scroll-bounce 1.2s ease-in-out ${d}s infinite` }} />
                  ))}
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Compact input bar — fixed at the bottom of the flex column, never scrolls */}
        <div className="flex-shrink-0 py-4 animate-slide-up" style={{ animationDelay: "0.2s" }}>
          <div className="flex items-center gap-2 pl-5 pr-2 py-2 rounded-[20px]"
            style={{ background: "rgba(241,233,210,0.6)", border: "1px solid rgba(59,42,19,0.08)" }}>
            <textarea
              ref={textareaRef}
              className="flex-1 bg-transparent outline-none text-sm text-[#2E2013] orda-inter placeholder-[#5C4E38] resize-none leading-relaxed py-[15px] max-h-[140px] overflow-y-auto"
              placeholder={t("aiHistorian.placeholder")}
              rows={1}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            />
            <button onClick={send} disabled={!input.trim()}
              aria-label={t("aiHistorian.sendMessage")}
              className="teal-hover w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all"
              style={{
                background: input.trim() ? "linear-gradient(135deg,#6B8CA3,#4F7086)" : "rgba(107,140,163,0.08)",
                boxShadow: input.trim() ? "0 4px 20px rgba(107,140,163,0.35)" : "none",
                cursor: input.trim() ? "pointer" : "not-allowed",
              }}>
              <Send size={16} color={input.trim() ? "#EDE1C4" : "#9C8F72"} />
            </button>
          </div>
          <p className="text-center text-[10px] orda-inter text-[#5C4E38] mt-2">
            {t("aiHistorian.disclaimer")}
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── ARTIFACT GALLERY ─────────────────────────────────────────────────────────
// Shared modal for viewing a single artifact's details inline, over whatever page
// triggered it (dashboard, city page, gallery) — no navigation away is required.
function ArtifactDetailModal({ artifact, onClose }: { artifact: Artifact | null; onClose: () => void }) {
  const { t } = useTranslation();

  // Close on Escape and lock background scroll while open. Freezing the body in
  // place with `position: fixed` (rather than just `overflow: hidden`) is required
  // here — plain `overflow: hidden` resets body's scrollTop to 0 immediately in
  // most browsers, which is exactly the "loses scroll position" bug this guards against.
  useEffect(() => {
    if (!artifact) return;
    const scrollY = window.scrollY;
    const body = document.body;
    const previous = { position: body.style.position, top: body.style.top, width: body.style.width, overflow: body.style.overflow };
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.width = "100%";
    body.style.overflow = "hidden";
    const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handleKey);
    return () => {
      body.style.position = previous.position;
      body.style.top = previous.top;
      body.style.width = previous.width;
      body.style.overflow = previous.overflow;
      window.removeEventListener("keydown", handleKey);
      // Restoring scroll has to wait a frame — the browser hasn't relaid-out body
      // back to its full scrollable height yet in this same synchronous tick (it's
      // still collapsed from `position: fixed`), so an immediate scrollTo clamps to
      // whatever short height it briefly reports. `behavior: "instant"` overrides the
      // app's global `scroll-behavior: smooth` on <html>, which would otherwise
      // animate this restoration into view.
      requestAnimationFrame(() => {
        window.scrollTo({ left: 0, top: scrollY, behavior: "instant" });
      });
    };
  }, [artifact, onClose]);

  if (!artifact) return null;

  // Rendered into document.body via a portal so `position: fixed` is always relative
  // to the real viewport — several ancestors up the tree run a `transform`-based
  // entrance animation (e.g. `.view-enter`), and any ancestor with a non-"none"
  // transform creates a new containing block that would otherwise hijack "fixed"
  // positioning and center the modal against page content instead of the viewport.
  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center sm:p-4"
      style={{ background: "rgba(46,32,19,0.55)" }}
      onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-t-[24px] sm:rounded-[24px] p-6 sm:p-8 animate-slide-up sm:animate-scale-in max-h-[90vh] overflow-y-auto fixed bottom-0 left-0 right-0 sm:static"
        style={{ background: "#F3E9D2", border: "1px solid rgba(184,137,43,0.3)", boxShadow: "0 12px 36px rgba(59,42,19,0.3)" }}
        onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-start mb-6">
          <div>
            <RarityBadge rarity={artifact.rarity} />
            <h2 className="orda-cinzel text-xl font-bold text-[#2E2013] mt-2">{artifact.name}</h2>
            <p className="orda-inter text-sm text-[#5C4E38]">{artifact.category}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-[rgba(59,42,19,0.06)] flex-shrink-0">
            <X size={16} color="#5C4E38" />
          </button>
        </div>

        <div className="aspect-video rounded-[16px] flex items-center justify-center mb-6"
          style={{ background: "rgba(230,216,184,0.6)", border: "1px solid rgba(59,42,19,0.04)" }}>
          <span className="text-8xl">{artifact.icon}</span>
        </div>

        <p className="orda-inter text-sm text-[#5C4E38] leading-[1.8] mb-6">{artifact.description}</p>

        <div className="grid grid-cols-2 gap-3">
          {[[t("artifactGallery.found"), artifact.found], [t("artifactGallery.city"), artifact.city]].map(([k, v]) => (
            <div key={k} className="p-3 rounded-[12px]" style={{ background: "rgba(59,42,19,0.03)", border: "1px solid rgba(59,42,19,0.05)" }}>
              <div className="text-[10px] orda-cinzel tracking-widest text-[#5C4E38] mb-1">{k}</div>
              <div className="text-sm orda-cinzel text-[#2E2013]">{v}</div>
            </div>
          ))}
        </div>
      </div>
    </div>,
    document.body
  );
}

function ArtifactGallery({ onBack }: { onBack: () => void }) {
  const { t } = useTranslation();
  const location = useLocation();
  const rrNavigate = useNavigate();
  const { data: citiesData } = useCities();
  const { data: artifactsData, isLoading, error } = useArtifacts();
  const [selected, setSelected] = useState<Artifact | null>(null);
  const [filter, setFilter] = useState("All");
  const { activeCityId, setActiveCityId } = useActiveCity();
  const cities = (citiesData?.data || []).map((c) => mapApiCity(c, t));
  const activeCity = activeCityId ? cities.find((c) => c.id === activeCityId) || null : null;

  // Scoped to the globally active city (map, quest panel, AI historian all agree
  // on the same one) whenever one is selected — clearable via the chip below.
  const cityScopedArtifacts = activeCityId
    ? (artifactsData?.data || []).filter((a) => a.city_id === activeCityId)
    : (artifactsData?.data || []);
  const artifactItems = cityScopedArtifacts.map((artifact) => mapApiArtifact(artifact, cities.find((city) => city.id === artifact.city_id)?.name || t("common.unknown"), t));
  const categories = ["All", ...Array.from(new Set(artifactItems.map(a => a.category)))];
  const filtered = filter === "All" ? artifactItems : artifactItems.filter(a => a.category === filter);

  // Deep-link from global search: land here already scoped to the result the user picked.
  useEffect(() => {
    const targetId = (location.state as { selectedArtifactId?: string } | null)?.selectedArtifactId;
    if (!targetId || artifactItems.length === 0) return;
    const match = artifactItems.find((a) => a.id === targetId);
    if (match) setSelected(match);
    rrNavigate(location.pathname, { replace: true, state: {} });
  }, [location.state, artifactItems]);

  return (
    <div className="min-h-screen pt-16 animate-fade-in" style={{ background: "#EDE1C4" }}>
      <div className="max-w-[1200px] mx-auto px-6 lg:px-12 py-10">

        {/* Header */}
        <div className="flex items-center gap-4 mb-10">
          <button onClick={onBack} className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-[rgba(59,42,19,0.06)] transition-colors"
            style={{ border: "1px solid rgba(59,42,19,0.06)" }}>
            <ChevronLeft size={16} color="#5C4E38" />
          </button>
          <div>
            <h1 className="orda-cinzel text-3xl font-bold text-[#2E2013]">{t("artifactGallery.title")}</h1>
            <p className="orda-inter text-sm text-[#5C4E38] mt-1">{t("artifactGallery.subtitle", { count: artifactItems.length })}</p>
          </div>
        </div>

        {/* Active-city filter chip — same activeCityId the map/quest panel/AI historian share */}
        {activeCity && (
          <button onClick={() => setActiveCityId(null)}
            className="inline-flex items-center gap-2 mb-4 px-3 py-1.5 rounded-full text-xs orda-inter transition-colors hover:opacity-80"
            style={{ background: "rgba(184,137,43,0.1)", color: "#B8892B", border: "1px solid rgba(184,137,43,0.25)" }}>
            <MapPin size={11} />
            {t("artifactGallery.filteringByCity", { city: activeCity.name })}
            <X size={11} />
          </button>
        )}

        {/* Filter tabs */}
        <div className="flex gap-2 flex-wrap mb-8">
          {categories.map(cat => (
            <button key={cat} onClick={() => setFilter(cat)}
              className="px-4 py-2 rounded-xl text-xs orda-cinzel tracking-wider transition-all"
              style={{
                background: filter === cat ? "rgba(184,137,43,0.15)" : "rgba(241,233,210,0.5)",
                color: filter === cat ? "#B8892B" : "#5C4E38",
                border: `1px solid ${filter === cat ? "rgba(184,137,43,0.3)" : "rgba(59,42,19,0.06)"}`,
              }}>
              {cat === "All" ? t("artifactGallery.all") : cat}
            </button>
          ))}
        </div>

        {/* Grid */}
        {error && <div className="mb-4 text-sm text-[#5C4E38]">{t("artifactGallery.unableToLoad")}</div>}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {isLoading ? Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="rounded-[20px] p-5" style={{ background: "rgba(241,233,210,0.6)", border: "1px solid rgba(59,42,19,0.06)" }}>
              <div className="aspect-square rounded-[14px] mb-4" style={{ background: "rgba(230,216,184,0.5)" }} />
              <div className="h-2 w-20 rounded-full mb-2" style={{ background: "rgba(59,42,19,0.05)" }} />
              <div className="h-2 w-24 rounded-full" style={{ background: "rgba(59,42,19,0.05)" }} />
            </div>
          )) : filtered.map((artifact, i) => (
            <div key={artifact.id}
              className="rounded-[20px] p-5 cursor-pointer card-hover gold-hover animate-scale-in"
              style={{ animationDelay: `${i * 0.07}s`, background: "rgba(241,233,210,0.6)", border: "1px solid rgba(59,42,19,0.06)" }}
              onClick={() => setSelected(artifact)}>

              {/* Display area */}
              <div className="aspect-square rounded-[14px] flex items-center justify-center mb-4 relative overflow-hidden"
                style={{ background: "rgba(230,216,184,0.5)", border: "1px solid rgba(59,42,19,0.04)" }}>
                <div className="absolute inset-0"
                  style={{ background: `radial-gradient(ellipse at center, ${artifact.rarity === "legendary" ? "rgba(184,137,43,0.1)" : artifact.rarity === "rare" ? "rgba(107,140,163,0.06)" : "rgba(59,42,19,0.03)"} 0%, transparent 70%)` }} />
                <span className="text-5xl relative z-10">{artifact.icon}</span>
              </div>

              <RarityBadge rarity={artifact.rarity} />
              <h3 className="orda-cinzel text-sm font-semibold text-[#2E2013] mt-2 mb-1">{artifact.name}</h3>
              <p className="orda-inter text-[11px] text-[#5C4E38] leading-relaxed line-clamp-2">{artifact.description}</p>
              <div className="flex items-center gap-2 mt-3">
                <MapPin size={10} color="#B8892B" />
                <span className="text-[10px] orda-inter text-[#5C4E38]">{artifact.city}</span>
              </div>
            </div>
          ))}
        </div>
        {!isLoading && !error && filtered.length === 0 && (
          <div className="rounded-[20px] p-10 text-center" style={{ background: "rgba(241,233,210,0.4)", border: "1px solid rgba(59,42,19,0.06)" }}>
            <Package size={28} color="#5C4E38" className="mx-auto mb-3" />
            <p className="orda-inter text-sm text-[#5C4E38]">{t("artifactGallery.noResults")}</p>
          </div>
        )}
      </div>

      <ArtifactDetailModal artifact={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

// ─── QUEST MINI-GAMES ─────────────────────────────────────────────────────────
// Per-`game_type` icon so gameified quests visibly stand out in the quest list
// instead of reading as identical generic cards.
const GAME_TYPE_ICON: Record<string, typeof Zap> = {
  khans_court: Gavel,
  chronograph: History,
  caravan_builder: ShoppingBag,
};

function KhansCourtGame({ data, onWin }: { data: ApiKhansCourtData; onWin: () => void }) {
  const { t } = useTranslation();
  const [index, setIndex] = useState(0);
  const [hearts, setHearts] = useState(3);
  const [correctCount, setCorrectCount] = useState(0);
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const [phase, setPhase] = useState<"playing" | "won" | "lost">("playing");

  const reset = () => {
    setIndex(0); setHearts(3); setCorrectCount(0); setFeedback(null); setPhase("playing");
  };

  const answer = (choice: boolean) => {
    if (feedback) return;
    const statement = data.statements[index];
    const isCorrect = choice === statement.answer;
    const nextHearts = isCorrect ? hearts : hearts - 1;
    const nextCorrect = isCorrect ? correctCount + 1 : correctCount;
    setFeedback(isCorrect ? "correct" : "wrong");
    if (!isCorrect) setHearts(nextHearts);
    else setCorrectCount(nextCorrect);

    setTimeout(() => {
      const isLast = index === data.statements.length - 1;
      if (nextHearts <= 0) {
        setPhase("lost");
      } else if (isLast) {
        setPhase(nextCorrect >= 3 ? "won" : "lost");
      } else {
        setIndex((i) => i + 1);
        setFeedback(null);
      }
    }, 900);
  };

  if (phase === "won") {
    return (
      <div className="animate-scale-in rounded-[16px] p-6 text-center" style={{ background: "rgba(124,139,90,0.06)", border: "1px solid rgba(124,139,90,0.2)" }}>
        <Gavel size={26} color="#7C8B5A" className="mx-auto mb-3" />
        <div className="text-[#7C8B5A] text-sm orda-cinzel tracking-widest mb-2">{t("games.khansCourt.won")}</div>
        <p className="orda-inter text-xs text-[#5C4E38] mb-4">{t("games.khansCourt.wonSubtitle", { correct: correctCount, total: data.statements.length })}</p>
        <button onClick={onWin} className="btn-primary text-sm px-8 py-2.5">{t("games.claimReward")}</button>
      </div>
    );
  }
  if (phase === "lost") {
    return (
      <div className="animate-scale-in rounded-[16px] p-6 text-center" style={{ background: "rgba(162,62,46,0.05)", border: "1px solid rgba(162,62,46,0.18)" }}>
        <Heart size={22} color="#A23E2E" className="mx-auto mb-3" />
        <div className="text-[#A23E2E] text-sm orda-cinzel tracking-widest mb-2">{t("games.khansCourt.lost")}</div>
        <p className="orda-inter text-xs text-[#5C4E38] mb-4">{t("games.khansCourt.lostSubtitle", { correct: correctCount, total: data.statements.length })}</p>
        <button onClick={reset} className="btn-ghost text-sm px-8 py-2.5 inline-flex items-center gap-2"><RotateCcw size={14} /> {t("games.tryAgain")}</button>
      </div>
    );
  }

  const statement = data.statements[index];
  return (
    <div className="rounded-[16px] p-6" style={{ background: "#2E2013" }}>
      <div className="flex items-center justify-between mb-5">
        <span className="orda-cinzel text-[10px] tracking-[0.2em]" style={{ color: "#D8C79C" }}>{t("games.khansCourt.title")}</span>
        <div className="flex items-center gap-1">
          {Array.from({ length: 3 }).map((_, i) => (
            <Heart key={i} size={14} color={i < hearts ? "#A23E2E" : "#5C4E38"} fill={i < hearts ? "#A23E2E" : "none"} />
          ))}
        </div>
      </div>
      <div className="text-center mb-2" style={{ color: "#9C8F72" }}>
        <span className="orda-inter text-[10px]">{t("games.khansCourt.statementCount", { current: index + 1, total: data.statements.length })}</span>
      </div>
      <p className="orda-cormorant text-xl italic text-center leading-relaxed mb-6 px-2" style={{ color: "#EADFC0" }}>
        "{statement.text}"
      </p>
      <div className="grid grid-cols-2 gap-3">
        <button onClick={() => answer(true)} disabled={Boolean(feedback)}
          className="py-3.5 rounded-xl orda-cinzel text-sm font-semibold tracking-widest transition-all disabled:cursor-default"
          style={{
            background: feedback ? (statement.answer === true ? "rgba(124,139,90,0.25)" : "rgba(234,223,192,0.08)") : "rgba(124,139,90,0.15)",
            border: `1px solid ${feedback && statement.answer === true ? "#7C8B5A" : "rgba(124,139,90,0.3)"}`,
            color: "#A8C08A",
          }}>
          {t("games.khansCourt.true")}
        </button>
        <button onClick={() => answer(false)} disabled={Boolean(feedback)}
          className="py-3.5 rounded-xl orda-cinzel text-sm font-semibold tracking-widest transition-all disabled:cursor-default"
          style={{
            background: feedback ? (statement.answer === false ? "rgba(124,139,90,0.25)" : "rgba(234,223,192,0.08)") : "rgba(162,62,46,0.12)",
            border: `1px solid ${feedback && statement.answer === false ? "#7C8B5A" : "rgba(162,62,46,0.3)"}`,
            color: "#D69B8C",
          }}>
          {t("games.khansCourt.false")}
        </button>
      </div>
      {feedback && (
        <p className="text-center orda-inter text-xs mt-4" style={{ color: feedback === "correct" ? "#A8C08A" : "#D69B8C" }}>
          {feedback === "correct" ? t("games.khansCourt.correct") : t("games.khansCourt.incorrect")}
        </p>
      )}
    </div>
  );
}

function ChronographGame({ data, onWin }: { data: ApiChronographData; onWin: () => void }) {
  const { t } = useTranslation();
  const shuffle = () => {
    const indices = data.events.map((_, i) => i);
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    // Re-shuffle once more if it happens to already be in the correct order.
    if (indices.every((eventIdx, pos) => data.events[eventIdx].order === pos + 1)) {
      return [...indices].reverse();
    }
    return indices;
  };
  const [order, setOrder] = useState<number[]>(shuffle);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);
  const [won, setWon] = useState(false);

  const isCorrectPosition = (pos: number) => data.events[order[pos]].order === pos + 1;
  const allCorrect = order.every((_, pos) => isCorrectPosition(pos));

  const move = (from: number, to: number) => {
    if (to < 0 || to >= order.length) return;
    setChecked(false);
    setOrder((current) => {
      const next = [...current];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
  };

  const handleCheck = () => {
    setChecked(true);
    if (allCorrect) setWon(true);
  };

  if (won) {
    return (
      <div className="animate-scale-in rounded-[16px] p-6 text-center" style={{ background: "rgba(124,139,90,0.06)", border: "1px solid rgba(124,139,90,0.2)" }}>
        <History size={26} color="#7C8B5A" className="mx-auto mb-3" />
        <div className="text-[#7C8B5A] text-sm orda-cinzel tracking-widest mb-2">{t("games.chronograph.won")}</div>
        <button onClick={onWin} className="btn-primary text-sm px-8 py-2.5">{t("games.claimReward")}</button>
      </div>
    );
  }

  return (
    <div className="rounded-[16px] p-6" style={{ background: "rgba(241,233,210,0.6)", border: "1px solid rgba(59,42,19,0.14)" }}>
      <div className="flex items-center gap-2 mb-1">
        <History size={14} color="#B8892B" />
        <span className="orda-cinzel text-[10px] tracking-[0.2em] text-[#5C4E38]">{t("games.chronograph.title")}</span>
      </div>
      <p className="orda-inter text-xs text-[#5C4E38] mb-4">{t("games.chronograph.instructions")}</p>

      <div className="space-y-2 mb-4">
        {order.map((eventIdx, pos) => {
          const event = data.events[eventIdx];
          const showResult = checked;
          const correct = isCorrectPosition(pos);
          return (
            <div key={eventIdx}
              draggable
              onDragStart={() => setDragIndex(pos)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => { if (dragIndex !== null && dragIndex !== pos) move(dragIndex, pos); setDragIndex(null); }}
              onDragEnd={() => setDragIndex(null)}
              className="flex items-center gap-3 p-3 rounded-[12px] cursor-move transition-colors"
              style={{
                background: showResult ? (correct ? "rgba(124,139,90,0.1)" : "rgba(162,62,46,0.08)") : "rgba(243,233,210,0.9)",
                border: `1px solid ${showResult ? (correct ? "rgba(124,139,90,0.3)" : "rgba(162,62,46,0.25)") : "rgba(59,42,19,0.12)"}`,
                opacity: dragIndex === pos ? 0.4 : 1,
              }}>
              <GripVertical size={14} color="#9C8F72" className="flex-shrink-0" />
              <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] orda-cinzel font-bold flex-shrink-0"
                style={{ background: "rgba(184,137,43,0.15)", color: "#B8892B" }}>{pos + 1}</span>
              <span className="orda-inter text-xs text-[#2E2013] flex-1">{event.text}</span>
              <div className="flex flex-col gap-0.5 flex-shrink-0">
                <button onClick={() => move(pos, pos - 1)} disabled={pos === 0} aria-label={t("games.chronograph.moveUp")}
                  className="w-5 h-5 rounded flex items-center justify-center hover:bg-[rgba(59,42,19,0.06)] disabled:opacity-20 transition-colors">
                  <ArrowUp size={11} color="#5C4E38" />
                </button>
                <button onClick={() => move(pos, pos + 1)} disabled={pos === order.length - 1} aria-label={t("games.chronograph.moveDown")}
                  className="w-5 h-5 rounded flex items-center justify-center hover:bg-[rgba(59,42,19,0.06)] disabled:opacity-20 transition-colors">
                  <ArrowDown size={11} color="#5C4E38" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {checked && !allCorrect && (
        <p className="text-xs orda-inter text-center mb-3" style={{ color: "#A23E2E" }}>{t("games.chronograph.notQuite")}</p>
      )}
      <button onClick={handleCheck} className="btn-primary w-full text-sm py-3">{t("games.chronograph.checkOrder")}</button>
    </div>
  );
}

function CaravanBuilderGame({ data, onWin }: { data: ApiCaravanBuilderData; onWin: () => void }) {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [checked, setChecked] = useState(false);
  const [won, setWon] = useState(false);

  const toggle = (key: string) => {
    if (checked) setChecked(false);
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const correctKeys = new Set(data.goods.filter((g) => g.correct).map((g) => g.key));
  const isExactMatch = selected.size === correctKeys.size && [...selected].every((k) => correctKeys.has(k));

  const handleLoad = () => {
    setChecked(true);
    if (isExactMatch) setWon(true);
  };

  if (won) {
    return (
      <div className="animate-scale-in rounded-[16px] p-6 text-center" style={{ background: "rgba(124,139,90,0.06)", border: "1px solid rgba(124,139,90,0.2)" }}>
        <ShoppingBag size={26} color="#7C8B5A" className="mx-auto mb-3" />
        <div className="text-[#7C8B5A] text-sm orda-cinzel tracking-widest mb-2">{t("games.caravanBuilder.won")}</div>
        <button onClick={onWin} className="btn-primary text-sm px-8 py-2.5">{t("games.claimReward")}</button>
      </div>
    );
  }

  return (
    <div className="rounded-[16px] p-6" style={{ background: "rgba(241,233,210,0.6)", border: "1px solid rgba(59,42,19,0.14)" }}>
      <div className="flex items-center gap-2 mb-1">
        <ShoppingBag size={14} color="#B8892B" />
        <span className="orda-cinzel text-[10px] tracking-[0.2em] text-[#5C4E38]">{t("games.caravanBuilder.title")}</span>
      </div>
      <p className="orda-inter text-xs text-[#5C4E38] mb-4">{t("games.caravanBuilder.instructions")}</p>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
        {data.goods.map((good) => {
          const isSelected = selected.has(good.key);
          const showResult = checked;
          const isRight = good.correct === isSelected;
          return (
            <button key={good.key} onClick={() => toggle(good.key)}
              className="p-3 rounded-[12px] text-center transition-all orda-cinzel text-xs font-semibold"
              style={{
                background: showResult
                  ? (isRight ? "rgba(124,139,90,0.12)" : "rgba(162,62,46,0.1)")
                  : isSelected ? "rgba(184,137,43,0.15)" : "rgba(243,233,210,0.9)",
                border: `1.5px solid ${showResult ? (isRight ? "#7C8B5A" : "#A23E2E") : isSelected ? "#B8892B" : "rgba(59,42,19,0.12)"}`,
                color: isSelected || showResult ? "#2E2013" : "#5C4E38",
              }}>
              {good.label}
            </button>
          );
        })}
      </div>

      {checked && !isExactMatch && (
        <p className="text-xs orda-inter text-center mb-3" style={{ color: "#A23E2E" }}>{t("games.caravanBuilder.notQuite")}</p>
      )}
      <button onClick={handleLoad} disabled={selected.size === 0} className="btn-primary w-full text-sm py-3 disabled:opacity-50">
        {t("games.caravanBuilder.loadCaravan")}
      </button>
    </div>
  );
}

// ─── QUEST VIEW ───────────────────────────────────────────────────────────────
type QuestUiState = "locked" | "available" | "in_progress" | "completed";
const QUEST_STATE_SORT_WEIGHT: Record<QuestUiState, number> = { in_progress: 0, available: 1, completed: 2, locked: 3 };
type QuestStatusFilter = "all" | "available" | "in_progress" | "completed";
type QuestSortMode = "recommended" | "closest" | "reward" | "newest";

function QuestView({ onBack }: { onBack: () => void }) {
  const { t } = useTranslation();
  const location = useLocation();
  const rrNavigate = useNavigate();
  const { activeCityId, setActiveCityId } = useActiveCity();
  const { data: citiesData } = useCities();
  // Quest counts are small (≈42 across all cities) — fetch once, then scope/filter/sort
  // client-side against activeCityId so switching cities is an instant re-filter, not a refetch.
  const { data: questsData, isLoading, error } = useQuests(1, 100);
  const { completeQuestMutation } = useProgress();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [completedQuestId, setCompletedQuestId] = useState<string | null>(null);
  const [scopeAllCities, setScopeAllCities] = useState(false);
  const [statusFilter, setStatusFilter] = useState<QuestStatusFilter>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [difficultyFilter, setDifficultyFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<QuestSortMode>("recommended");

  const cities = (citiesData?.data || []).map((c) => mapApiCity(c, t));
  // `Map` the class is shadowed in this file by the `Map` icon imported from
  // lucide-react above — `globalThis.Map` reaches past that shadowing.
  const cityById = new globalThis.Map(cities.map((c) => [c.id, c]));
  const activeCity = activeCityId ? cityById.get(activeCityId) : undefined;

  const getQuestState = (quest: ApiQuest): QuestUiState => {
    const city = cityById.get(quest.city_id);
    if (city?.isUnlocked === false) return "locked";
    if (quest.completion_status === "completed") return "completed";
    if (quest.completion_status === "in_progress") return "in_progress";
    return "available";
  };

  const allQuestItems = (questsData?.data || []).map((quest) => ({
    ...quest,
    cityName: cityById.get(quest.city_id)?.name || t("common.unknown"),
    state: getQuestState(quest),
  }));

  const categories = Array.from(new Set(allQuestItems.map((q) => q.category).filter(Boolean)));
  const difficulties = Array.from(new Set(allQuestItems.map((q) => q.difficulty).filter(Boolean)));

  let questItems = allQuestItems;
  if (!scopeAllCities && activeCityId) questItems = questItems.filter((q) => q.city_id === activeCityId);
  if (statusFilter !== "all") questItems = questItems.filter((q) => q.state === statusFilter);
  if (typeFilter !== "all") questItems = questItems.filter((q) => q.category === typeFilter);
  if (difficultyFilter !== "all") questItems = questItems.filter((q) => q.difficulty === difficultyFilter);

  questItems = [...questItems].sort((a, b) => {
    switch (sortBy) {
      case "closest":
        return a.estimated_time_minutes - b.estimated_time_minutes;
      case "reward":
        return (b.xp_reward + b.coin_reward) - (a.xp_reward + a.coin_reward);
      case "newest":
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      case "recommended":
      default:
        return QUEST_STATE_SORT_WEIGHT[a.state] - QUEST_STATE_SORT_WEIGHT[b.state];
    }
  });

  const expandedQuest = questItems.find((q) => q.id === expandedId);

  // Deep-link from global search: land here already scoped to the result the user picked,
  // syncing activeCityId so the quest list (and the rest of the app) agrees on the city.
  useEffect(() => {
    const targetId = (location.state as { selectedQuestId?: string } | null)?.selectedQuestId;
    if (!targetId || allQuestItems.length === 0) return;
    const match = allQuestItems.find((q) => q.id === targetId);
    if (match) {
      setExpandedId(match.id);
      setCompletedQuestId(null);
      setScopeAllCities(false);
      setStatusFilter("all");
      if (match.city_id !== activeCityId) setActiveCityId(match.city_id);
    }
    rrNavigate(location.pathname, { replace: true, state: {} });
  }, [location.state, allQuestItems]);

  const isOnCooldown = Boolean(
    expandedQuest?.completion_status === "completed" &&
    expandedQuest.cooldown_until &&
    new Date(expandedQuest.cooldown_until).getTime() > Date.now()
  );
  const justCompleted = Boolean(expandedQuest) && expandedQuest?.id === completedQuestId && completeQuestMutation.isSuccess;

  const handleComplete = () => {
    if (!expandedQuest) return;
    completeQuestMutation.mutate(expandedQuest.id, {
      onSuccess: () => setCompletedQuestId(expandedQuest.id),
    });
  };

  const handleQuestClick = (questId: string, state: QuestUiState) => {
    if (state === "locked") return;
    setExpandedId((prev) => (prev === questId ? null : questId));
    setCompletedQuestId(null);
  };

  const STATUS_FILTERS: QuestStatusFilter[] = ["all", "available", "in_progress", "completed"];
  const SORT_MODES: QuestSortMode[] = ["recommended", "closest", "reward", "newest"];

  return (
    <div className="min-h-screen pt-16 animate-fade-in" style={{ background: "#EDE1C4" }}>
      <div className="max-w-3xl mx-auto px-6 py-10">
        <div className="flex items-center gap-4 mb-10">
          <button onClick={onBack} className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-[rgba(59,42,19,0.06)] transition-colors"
            style={{ border: "1px solid rgba(59,42,19,0.06)" }}>
            <ChevronLeft size={16} color="#5C4E38" />
          </button>
          <div>
            <h1 className="orda-cinzel text-3xl font-bold text-[#2E2013]">{t("quests.title")}</h1>
            <p className="orda-inter text-sm text-[#5C4E38] mt-1">
              {!scopeAllCities && activeCity ? t("quests.subtitleCity", { city: activeCity.name }) : t("quests.subtitle")}
            </p>
          </div>
        </div>

        {/* Status + scope filters */}
        <div className="flex flex-wrap items-center gap-2 mb-3">
          {STATUS_FILTERS.map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className="px-3 py-1.5 rounded-full text-xs orda-inter transition-colors"
              style={{
                background: statusFilter === s ? "rgba(184,137,43,0.15)" : "rgba(241,233,210,0.4)",
                border: `1px solid ${statusFilter === s ? "rgba(184,137,43,0.35)" : "rgba(59,42,19,0.08)"}`,
                color: statusFilter === s ? "#B8892B" : "#5C4E38",
                fontWeight: statusFilter === s ? 600 : 400,
              }}>
              {t(`quests.filters.${s}`)}
            </button>
          ))}
          <span className="w-px h-4 mx-1" style={{ background: "rgba(59,42,19,0.12)" }} />
          <button onClick={() => setScopeAllCities((v) => !v)}
            className="px-3 py-1.5 rounded-full text-xs orda-inter transition-colors flex items-center gap-1.5"
            style={{
              background: !scopeAllCities ? "rgba(184,137,43,0.15)" : "rgba(241,233,210,0.4)",
              border: `1px solid ${!scopeAllCities ? "rgba(184,137,43,0.35)" : "rgba(59,42,19,0.08)"}`,
              color: !scopeAllCities ? "#B8892B" : "#5C4E38",
              fontWeight: !scopeAllCities ? 600 : 400,
            }}>
            <MapPin size={11} /> {scopeAllCities ? t("quests.filters.allCities") : t("quests.filters.thisCity")}
          </button>
        </div>

        {/* Type / difficulty / sort */}
        <div className="flex flex-wrap items-center gap-2 mb-8">
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}
            className="text-xs orda-inter rounded-lg"
            style={{ appearance: "auto", width: "auto", padding: "6px 10px", background: "#F6EFDC", border: "1px solid rgba(59,42,19,0.2)", color: "#2E2013" }}>
            <option value="all">{t("quests.filters.allTypes")}</option>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={difficultyFilter} onChange={(e) => setDifficultyFilter(e.target.value)}
            className="text-xs orda-inter rounded-lg"
            style={{ appearance: "auto", width: "auto", padding: "6px 10px", background: "#F6EFDC", border: "1px solid rgba(59,42,19,0.2)", color: "#2E2013" }}>
            <option value="all">{t("quests.filters.allDifficulties")}</option>
            {difficulties.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
          <div className="flex items-center gap-1.5 ml-auto">
            <ArrowUpDown size={12} color="#5C4E38" />
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value as QuestSortMode)}
              className="text-xs orda-inter rounded-lg"
              style={{ appearance: "auto", width: "auto", padding: "6px 10px", background: "#F6EFDC", border: "1px solid rgba(59,42,19,0.2)", color: "#2E2013" }}>
              {SORT_MODES.map((s) => <option key={s} value={s}>{t(`quests.sort.${s}`)}</option>)}
            </select>
          </div>
        </div>

        {/* Quest list — each item expands inline into an accordion */}
        <div className="grid grid-cols-1 gap-3">
          {(isLoading ? Array.from({ length: 4 }) : questItems).map((q, index) => (
            isLoading || !q ? (
              <div key={`quest-skeleton-${index}`} className="rounded-[16px] p-5" style={{ background: "rgba(241,233,210,0.4)", border: "1px solid rgba(59,42,19,0.06)" }}>
                <div className="h-4 w-32 rounded-full mb-2" style={{ background: "rgba(59,42,19,0.05)" }} />
                <div className="h-2 w-20 rounded-full" style={{ background: "rgba(59,42,19,0.05)" }} />
              </div>
            ) : (
              <div key={q.id} className="rounded-[16px] overflow-hidden quest-card"
                style={{
                  background: q.state === "completed" ? "rgba(59,42,19,0.03)" : expandedId === q.id ? "rgba(184,137,43,0.08)" : "rgba(241,233,210,0.4)",
                  border: `1px solid ${expandedId === q.id ? "rgba(184,137,43,0.25)" : "rgba(59,42,19,0.06)"}`,
                  opacity: q.state === "locked" ? 0.55 : q.state === "completed" ? 0.75 : 1,
                }}>
                <div onClick={() => handleQuestClick(q.id, q.state)} className="p-5"
                  style={{ cursor: q.state === "locked" ? "not-allowed" : "pointer" }}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                        style={{ background: "rgba(184,137,43,0.1)", border: "1px solid rgba(184,137,43,0.2)" }}>
                        {q.state === "locked" ? <Lock size={16} color="#9C8F72" /> : q.state === "completed" ? <Check size={16} color="#7C8B5A" /> : (() => {
                          const GameIcon = (q.game_type && GAME_TYPE_ICON[q.game_type]) || Zap;
                          return <GameIcon size={16} color="#B8892B" />;
                        })()}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold orda-cinzel text-[#2E2013] truncate">{q.title}</div>
                        <div className="text-[11px] orda-inter text-[#5C4E38]">{q.cityName}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {q.state === "completed" && <span className="badge-green">{t("quests.state.completed")}</span>}
                      {q.state === "in_progress" && <span className="badge-gold">{t("quests.state.inProgress")}</span>}
                      {q.state === "locked" && <span className="badge-gold" style={{ opacity: 0.6 }}>{t("quests.state.locked")}</span>}
                      {q.state !== "locked" && <span className="badge-gold">+{q.xp_reward} XP</span>}
                      <ChevronDown size={14} color="#5C4E38" style={{ transform: expandedId === q.id ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
                    </div>
                  </div>
                </div>

                {expandedId === q.id && (
                  <div className="px-5 pb-6 pt-1 animate-fade-in" style={{ borderTop: "1px solid rgba(59,42,19,0.08)" }}>
                    <p className="orda-cormorant text-lg italic text-[#2E2013] leading-relaxed my-4">{q.description}</p>

                    {justCompleted ? (
                      <div className="animate-scale-in rounded-[16px] p-6 text-center"
                        style={{ background: "rgba(124,139,90,0.06)", border: "1px solid rgba(124,139,90,0.2)" }}>
                        <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4"
                          style={{ background: "rgba(124,139,90,0.15)" }}>
                          <Check size={22} color="#7C8B5A" />
                        </div>
                        <div className="text-[#7C8B5A] text-sm orda-cinzel tracking-widest mb-2">{t("quests.questComplete")}</div>
                        <div className="flex items-center justify-center gap-4">
                          <span className="badge-green">+{completeQuestMutation.data?.xp_gained ?? q.xp_reward} XP</span>
                          <span className="badge-gold">+{completeQuestMutation.data?.coins_gained ?? 0} {t("passport.coins")}</span>
                        </div>
                        {completeQuestMutation.data?.unlocked_city && (
                          <div className="mt-4 pt-4 animate-scale-in" style={{ borderTop: "1px solid rgba(184,137,43,0.15)" }}>
                            <div className="text-lg mb-1">🔓</div>
                            <p className="orda-inter text-xs text-[#B8892B]">
                              {t("quests.cityUnlocked", { city: completeQuestMutation.data.unlocked_city.name })}
                            </p>
                          </div>
                        )}
                      </div>
                    ) : isOnCooldown ? (
                      <div className="rounded-[16px] p-6 text-center"
                        style={{ background: "rgba(59,42,19,0.03)", border: "1px solid rgba(59,42,19,0.06)" }}>
                        <div className="text-[#5C4E38] text-sm orda-cinzel tracking-widest mb-2">{t("quests.onCooldown")}</div>
                        <p className="orda-inter text-xs text-[#5C4E38]">
                          {q.cooldown_until
                            ? t("quests.availableAgain", { date: new Date(q.cooldown_until).toLocaleString() })
                            : t("quests.checkBackLater")}
                        </p>
                      </div>
                    ) : q.game_type === "khans_court" && q.game_data ? (
                      <KhansCourtGame key={q.id} data={q.game_data as ApiKhansCourtData} onWin={handleComplete} />
                    ) : q.game_type === "chronograph" && q.game_data ? (
                      <ChronographGame key={q.id} data={q.game_data as ApiChronographData} onWin={handleComplete} />
                    ) : q.game_type === "caravan_builder" && q.game_data ? (
                      <CaravanBuilderGame key={q.id} data={q.game_data as ApiCaravanBuilderData} onWin={handleComplete} />
                    ) : (
                      <>
                        <button onClick={handleComplete} disabled={completeQuestMutation.isPending}
                          className="btn-primary w-full flex items-center justify-center gap-2"
                          style={{ opacity: completeQuestMutation.isPending ? 0.7 : 1 }}>
                          <Zap size={16} /> {completeQuestMutation.isPending ? t("quests.completing") : t("quests.completeQuest")}
                        </button>
                        {completeQuestMutation.isError && (
                          <p className="mt-3 text-xs text-center orda-inter" style={{ color: "#A23E2E" }}>
                            {(completeQuestMutation.error as Error).message}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            )
          ))}
          {!isLoading && !error && questItems.length === 0 && (
            <div className="rounded-[16px] p-8 text-center" style={{ background: "rgba(241,233,210,0.4)", border: "1px solid rgba(59,42,19,0.06)" }}>
              <Zap size={24} color="#5C4E38" className="mx-auto mb-3" />
              <p className="orda-inter text-sm text-[#5C4E38]">{t("quests.noQuestsAvailable")}</p>
            </div>
          )}
        </div>

        {error && <div className="mt-4 text-sm text-[#5C4E38]">{t("quests.unableToLoad")}</div>}
      </div>
    </div>
  );
}

// ─── CERTIFICATE ──────────────────────────────────────────────────────────────
function Certificate({ character, onBack }: { character: CharType; onBack: () => void }) {
  const { t } = useTranslation();
  const { certificatesQuery, issueCertificateMutation } = useCertificates();
  const { data: citiesData } = useCities();
  const { data: questsData } = useQuests();
  const { summaryQuery } = useProgress();
  const char = getCharacterData(t)[character];
  const certificate = certificatesQuery.data?.[0];

  const records = summaryQuery.data?.records;
  const citiesTotal = citiesData?.data.length ?? 0;
  // A city counts as "unlocked" once the player has completed at least one quest
  // there — there's no separate city-visit tracking (same logic the dashboard's
  // journey-progress calculation and map route coloring both use).
  const citiesVisited = new Set(
    (questsData?.data || []).filter(q => q.completion_status === "completed").map(q => q.city_id)
  ).size;
  const artifactsCollected = countCompletedByType(records, "artifact");
  const questsCompleted = countCompletedByType(records, "quest");
  const totalQuests = questsData?.meta.total ?? 0;

  const confettiPieces = Array.from({ length: 40 }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    color: ["#B8892B", "#8C6239", "#6B8CA3", "#7C8B5A", "#C9A227"][Math.floor(Math.random() * 5)],
    delay: Math.random() * 3,
    duration: Math.random() * 3 + 2,
    size: Math.random() * 8 + 4,
  }));

  return (
    <div className="min-h-screen pt-16 flex flex-col items-center justify-center px-4 py-10 relative overflow-hidden"
      style={{ background: "#EDE1C4" }}>

      {/* Confetti */}
      {confettiPieces.map(p => (
        <div key={p.id} className="confetti-piece fixed pointer-events-none"
          style={{
            left: `${p.left}%`, top: "-20px",
            width: p.size, height: p.size * 0.6,
            background: p.color, borderRadius: 2,
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`,
            opacity: 0.8,
          }} />
      ))}

      <div className="animate-scale-in text-center mb-8">
        <div className="badge-gold mb-4 inline-block">{t("certificate.journeyComplete")}</div>
        <h1 className="orda-cinzel text-3xl font-bold text-[#2E2013] mb-2">{t("certificate.title")}</h1>
        <p className="orda-inter text-sm text-[#5C4E38]">{t("certificate.subtitle")}</p>
      </div>

      {certificatesQuery.isLoading && (
        <p className="text-sm text-[#5C4E38] orda-inter mb-4">{t("certificate.loading")}</p>
      )}
      {certificatesQuery.error && (
        <p className="text-sm text-[#5C4E38] orda-inter mb-4">{t("certificate.unableToLoad")}</p>
      )}

      {/* Certificate */}
      <div className="certificate-frame rounded-[24px] max-w-2xl w-full animate-scale-in"
        style={{ background: "linear-gradient(135deg, #E2D3AC 0%, #DCCBA0 50%, #E2D3AC 100%)", animationDelay: "0.2s" }}>

        {/* Inner border */}
        <div className="m-4 rounded-[18px] p-10 relative"
          style={{ border: "1px solid rgba(184,137,43,0.15)" }}>

          {/* Corner ornaments */}
          {["top-4 left-4", "top-4 right-4", "bottom-4 left-4", "bottom-4 right-4"].map((pos, i) => (
            <div key={i} className={`absolute ${pos} text-[#B8892B] text-xl opacity-40`}>✦</div>
          ))}

          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg,rgba(184,137,43,0.15),rgba(184,137,43,0.05))", border: "1px solid rgba(184,137,43,0.25)" }}>
              <span className="text-2xl">⚜</span>
            </div>
            <div className="text-[#B8892B] text-[10px] tracking-[0.4em] orda-cinzel mb-1">{t("certificate.academyName")}</div>
            <div className="w-32 h-px mx-auto" style={{ background: "linear-gradient(90deg,transparent,rgba(184,137,43,0.4),transparent)" }} />
          </div>

          {/* Certificate body */}
          <div className="text-center space-y-4">
            <p className="orda-cormorant text-lg italic text-[#5C4E38]">{t("certificate.thisCertifies")}</p>
            <div className="py-4 border-b border-t" style={{ borderColor: "rgba(184,137,43,0.12)" }}>
              <h2 className="orda-cinzel text-4xl font-bold text-[#B8892B]">{certificate?.title || t("certificate.defaultTitle")}</h2>
            </div>
            <p className="orda-cormorant text-lg italic text-[#5C4E38]">{t("certificate.hasCompleted")}</p>
            <div className="flex items-center justify-center gap-3">
              <char.icon size={20} color={char.color} />
              <span className="orda-cinzel text-xl text-[#2E2013]">{t("certificate.characterOf", { name: char.name })}</span>
            </div>
            <p className="orda-cormorant text-base italic text-[#5C4E38] max-w-sm mx-auto leading-relaxed">
              {t("certificate.traversed")}
            </p>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-4 mt-8 pt-8 border-t" style={{ borderColor: "rgba(184,137,43,0.08)" }}>
            {[[`${citiesVisited}/${citiesTotal}`, t("certificate.cities")], [`${artifactsCollected}`, t("certificate.artifacts")], [`${questsCompleted}/${totalQuests}`, t("certificate.quests")]].map(([v, l]) => (
              <div key={l} className="text-center">
                <div className="text-xl font-bold orda-cinzel text-[#B8892B]">{v}</div>
                <div className="text-xs orda-inter text-[#5C4E38]">{l}</div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="mt-8 flex items-center justify-between">
            <div>
              <div className="text-[10px] orda-cinzel tracking-widest text-[#5C4E38]">{t("certificate.issuedBy")}</div>
              <div className="text-sm orda-cinzel text-[#B8892B]">{t("certificate.academyName")}</div>
            </div>
            <div className="text-right">
              <div className="text-[10px] orda-cinzel tracking-widest text-[#5C4E38]">{t("certificate.date")}</div>
              <div className="text-sm orda-cinzel text-[#B8892B]">
                {certificate ? new Date(certificate.issued_at).toLocaleDateString() : t("certificate.notYetIssued")}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col items-center gap-3 mt-8 animate-slide-up w-full" style={{ animationDelay: "0.5s" }}>
        <div className="flex flex-wrap justify-center gap-4">
          <button onClick={() => issueCertificateMutation.mutate({ title: t("certificate.issueTitle") })}
            disabled={issueCertificateMutation.isPending}
            className="btn-primary flex items-center gap-2" style={{ opacity: issueCertificateMutation.isPending ? 0.7 : 1 }}>
            <Download size={16} /> {issueCertificateMutation.isPending ? t("certificate.issuing") : certificate ? t("certificate.reissue") : t("certificate.issue")}
          </button>
          <button className="btn-ghost flex items-center gap-2">
            <Share2 size={16} /> {t("certificate.shareAchievement")}
          </button>
          <button onClick={onBack} className="btn-ghost">
            {t("certificate.backToJourney")}
          </button>
        </div>
        {issueCertificateMutation.isError && (
          <p className="text-xs orda-inter" style={{ color: "#A23E2E" }}>
            {(issueCertificateMutation.error as Error).message}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── PASSPORT OF THE GREAT STEPPE ─────────────────────────────────────────────
function describeProgressRecord(
  t: TFunction,
  record: ApiProgressSummary["records"][number],
  cities: City[],
  artifactsList: ApiArtifact[],
  questsList: ApiQuest[],
): string {
  if (record.entity_type === "city") {
    return t("passport.timelineVisited", { name: cities.find(c => c.id === record.entity_id)?.name ?? t("passport.aCity") });
  }
  if (record.entity_type === "artifact") {
    return t("passport.timelineCollected", { name: artifactsList.find(a => a.id === record.entity_id)?.name ?? t("passport.anArtifact") });
  }
  if (record.entity_type === "quest") {
    return t("passport.timelineCompleted", { name: questsList.find(q => q.id === record.entity_id)?.title ?? t("passport.aQuest") });
  }
  return t("passport.timelineProgress");
}

function Passport({ onBack, onLogout }: { onBack: () => void; onLogout: () => void }) {
  const { t } = useTranslation();
  const { user, updateProfileMutation, uploadAvatarMutation, logoutMutation } = useAuthSession();
  const { data: citiesData } = useCities();
  const { data: artifactsData } = useArtifacts();
  const { data: questsData } = useQuests();
  const { summaryQuery, statsQuery, achievementsQuery } = useProgress();
  const { certificatesQuery } = useCertificates();
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const [fullName, setFullName] = useState("");
  const [bio, setBio] = useState("");

  useEffect(() => {
    if (user) {
      setFullName(user.full_name ?? "");
      setBio(user.bio ?? "");
    }
  }, [user?.id]);

  const cities = (citiesData?.data || []).map((c) => mapApiCity(c, t));
  const artifactsList = artifactsData?.data || [];
  const questsList = questsData?.data || [];
  const stats = statsQuery.data;
  const summary = summaryQuery.data;
  const records = summary?.records || [];
  const achievements = achievementsQuery.data || [];
  const certificates = certificatesQuery.data || [];

  // A city counts as "unlocked" once the player has completed at least one quest
  // there — there's no separate city-visit tracking (same logic the dashboard's
  // journey-progress calculation and map route coloring both use).
  const citiesVisited = new Set(
    questsList.filter(q => q.completion_status === "completed").map(q => q.city_id)
  ).size;
  const artifactsCollected = countCompletedByType(records, "artifact");
  const questsCompleted = countCompletedByType(records, "quest");

  const timeline = records
    .filter(r => r.completed_at)
    .slice()
    .sort((a, b) => new Date(b.completed_at as string).getTime() - new Date(a.completed_at as string).getTime())
    .slice(0, 10);

  const saveSettings = (e: FormEvent) => {
    e.preventDefault();
    updateProfileMutation.mutate({ full_name: fullName || null, bio: bio || null });
  };

  const handleAvatarChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadAvatarMutation.mutate(file);
    e.target.value = "";
  };

  return (
    <div className="min-h-screen pt-16 pb-16 animate-fade-in" style={{ background: "#EDE1C4" }}>
      <div className="max-w-[1200px] mx-auto px-6 lg:px-12 py-10">
        <div className="flex items-center gap-4 mb-10">
          <button onClick={onBack} className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-[rgba(59,42,19,0.06)] transition-colors"
            style={{ border: "1px solid rgba(59,42,19,0.06)" }}>
            <ChevronLeft size={16} color="#5C4E38" />
          </button>
          <div>
            <div className="badge-gold mb-2 inline-block">{t("passport.officialDocument")}</div>
            <h1 className="orda-cinzel text-3xl font-bold text-[#2E2013]">{t("passport.title")}</h1>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left column — identity */}
          <div className="space-y-6">
            <div className="certificate-frame rounded-[24px] p-7 text-center"
              style={{ background: "linear-gradient(135deg, #E2D3AC 0%, #DCCBA0 50%, #E2D3AC 100%)" }}>
              <div className="relative w-24 h-24 mx-auto mb-4">
                <div className="w-24 h-24 rounded-full overflow-hidden flex items-center justify-center text-3xl font-bold orda-cinzel"
                  style={{ background: "linear-gradient(135deg,#B8892B,#8C6239)", color: "#EDE1C4" }}>
                  {user?.avatar_url ? (
                    <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    (user?.username?.[0] || "?").toUpperCase()
                  )}
                </div>
                <button onClick={() => avatarInputRef.current?.click()} disabled={uploadAvatarMutation.isPending}
                  className="absolute bottom-0 right-0 w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ background: "#F3E9D2", border: "2px solid #EDE1C4" }}>
                  <Camera size={13} color="#B8892B" />
                </button>
                <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
              </div>
              <h2 className="orda-cinzel text-xl font-bold text-[#2E2013]">{user?.username || "…"}</h2>
              <div className="badge-gold mt-2 inline-block">{stats?.title || t("passport.defaultTitle")}</div>
              <div className="mt-4 pt-4 border-t space-y-2" style={{ borderColor: "rgba(184,137,43,0.1)" }}>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#5C4E38] orda-inter">{t("passport.registered")}</span>
                  <span className="text-[#2E2013] orda-inter">{user ? new Date(user.created_at).toLocaleDateString() : "—"}</span>
                </div>
                {uploadAvatarMutation.isError && (
                  <p className="text-[11px] orda-inter" style={{ color: "#A23E2E" }}>
                    {(uploadAvatarMutation.error as Error).message}
                  </p>
                )}
              </div>
            </div>

            {/* Language */}
            <div className="rounded-[16px] p-5" style={{ background: "rgba(241,233,210,0.4)", border: "1px solid rgba(59,42,19,0.06)" }}>
              <div className="flex items-center gap-2 mb-3">
                <Globe size={14} color="#B8892B" />
                <span className="text-[10px] orda-cinzel tracking-[0.2em] text-[#5C4E38]">{t("passport.language")}</span>
              </div>
              <select
                value={user?.language || DEFAULT_LANGUAGE}
                onChange={(e) => updateProfileMutation.mutate({ language: e.target.value as ApiLanguage })}
                className="input-field"
                style={{ appearance: "auto" }}>
                {SUPPORTED_LANGUAGES.map((code) => (
                  <option key={code} value={code} style={{ background: "#E2D3AC" }}>{t(`language.${code}`)}</option>
                ))}
              </select>
            </div>

            {/* Settings */}
            <div className="rounded-[16px] p-5" style={{ background: "rgba(241,233,210,0.4)", border: "1px solid rgba(59,42,19,0.06)" }}>
              <div className="flex items-center gap-2 mb-4">
                <Settings size={14} color="#B8892B" />
                <span className="text-[10px] orda-cinzel tracking-[0.2em] text-[#5C4E38]">{t("passport.settings")}</span>
              </div>
              <form onSubmit={saveSettings} className="space-y-3">
                <input className="input-field" type="text" placeholder={t("passport.fullNamePlaceholder")} value={fullName}
                  onChange={(e) => setFullName(e.target.value)} />
                <textarea className="input-field resize-none" rows={3} placeholder={t("passport.bioPlaceholder")} value={bio}
                  onChange={(e) => setBio(e.target.value)} />
                {updateProfileMutation.isError && (
                  <p className="text-[11px] orda-inter" style={{ color: "#A23E2E" }}>
                    {(updateProfileMutation.error as Error).message}
                  </p>
                )}
                <button type="submit" disabled={updateProfileMutation.isPending}
                  className="btn-primary w-full text-sm py-2.5"
                  style={{ opacity: updateProfileMutation.isPending ? 0.7 : 1 }}>
                  {updateProfileMutation.isPending ? t("common.saving") : t("common.save")}
                </button>
              </form>
            </div>

            <button
              onClick={() => logoutMutation.mutate(undefined, { onSuccess: onLogout })}
              disabled={logoutMutation.isPending}
              className="btn-ghost w-full flex items-center justify-center gap-2 text-sm">
              <LogOut size={15} /> {logoutMutation.isPending ? t("passport.signingOut") : t("passport.logout")}
            </button>
          </div>

          {/* Right column — progression & history */}
          <div className="lg:col-span-2 space-y-6">
            {/* Stat tiles */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                [t("passport.level"), stats?.level ?? "—"],
                [t("passport.xp"), stats?.xp ?? "—"],
                [t("passport.coins"), stats?.coins ?? "—"],
                [t("passport.dailyStreak"), stats?.streak_days ?? "—"],
              ].map(([label, value]) => (
                <div key={label} className="rounded-[16px] p-4 text-center" style={{ background: "rgba(241,233,210,0.4)", border: "1px solid rgba(59,42,19,0.06)" }}>
                  <div className="text-xl font-bold orda-cinzel text-[#B8892B]">{value}</div>
                  <div className="text-[10px] orda-inter text-[#5C4E38] mt-1">{label}</div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-4">
              {[
                [t("passport.visitedCities"), `${citiesVisited}/${cities.length}`, MapPin],
                [t("passport.completedQuests"), `${questsCompleted}/${questsList.length}`, Zap],
                [t("passport.collectedArtifacts"), `${artifactsCollected}/${artifactsList.length}`, Package],
              ].map(([label, value, Icon]) => (
                <div key={label as string} className="rounded-[16px] p-4 text-center" style={{ background: "rgba(184,137,43,0.04)", border: "1px solid rgba(184,137,43,0.1)" }}>
                  {typeof Icon !== "string" && <Icon size={16} color="#B8892B" className="mx-auto mb-2" />}
                  <div className="text-lg font-bold orda-cinzel text-[#2E2013]">{value as string}</div>
                  <div className="text-[10px] orda-inter text-[#5C4E38] mt-1">{label as string}</div>
                </div>
              ))}
            </div>

            {/* Achievements */}
            <div className="rounded-[20px] p-6" style={{ background: "rgba(241,233,210,0.4)", border: "1px solid rgba(59,42,19,0.06)" }}>
              <div className="flex items-center gap-2 mb-4">
                <Award size={16} color="#B8892B" />
                <h2 className="orda-cinzel text-sm font-semibold text-[#2E2013] tracking-wider">{t("passport.achievements")}</h2>
              </div>
              {achievementsQuery.isLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {Array.from({ length: 2 }).map((_, i) => (
                    <div key={i} className="h-14 rounded-xl" style={{ background: "rgba(59,42,19,0.03)" }} />
                  ))}
                </div>
              ) : achievements.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {achievements.map((achievement) => (
                    <div key={achievement.id} className="flex items-center gap-3 p-3 rounded-xl"
                      style={{ background: "rgba(184,137,43,0.05)", border: "1px solid rgba(184,137,43,0.1)" }}>
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ background: "rgba(184,137,43,0.15)" }}>
                        <Check size={15} color="#B8892B" />
                      </div>
                      <div>
                        <div className="text-xs orda-cinzel text-[#2E2013]">{achievement.title}</div>
                        <div className="text-[10px] orda-inter text-[#5C4E38]">{achievement.description}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs orda-inter text-[#5C4E38]">{t("passport.noAchievements")}</p>
              )}
            </div>

            {/* Certificates */}
            <div className="rounded-[20px] p-6" style={{ background: "rgba(241,233,210,0.4)", border: "1px solid rgba(59,42,19,0.06)" }}>
              <div className="flex items-center gap-2 mb-4">
                <BookOpen size={16} color="#B8892B" />
                <h2 className="orda-cinzel text-sm font-semibold text-[#2E2013] tracking-wider">{t("passport.certificates")}</h2>
              </div>
              {certificatesQuery.isLoading ? (
                <div className="h-14 rounded-xl" style={{ background: "rgba(59,42,19,0.03)" }} />
              ) : certificates.length > 0 ? (
                <div className="space-y-2">
                  {certificates.map((certificate) => (
                    <div key={certificate.id} className="flex items-center justify-between p-3 rounded-xl"
                      style={{ background: "rgba(184,137,43,0.05)", border: "1px solid rgba(184,137,43,0.1)" }}>
                      <div>
                        <div className="text-xs orda-cinzel text-[#2E2013]">{certificate.title}</div>
                        <div className="text-[10px] orda-inter text-[#5C4E38]">{new Date(certificate.issued_at).toLocaleDateString()}</div>
                      </div>
                      <span className="badge-gold">{certificate.completion_percent}%</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs orda-inter text-[#5C4E38]">{t("passport.noCertificates")}</p>
              )}
            </div>

            {/* Journey Timeline */}
            <div className="rounded-[20px] p-6" style={{ background: "rgba(241,233,210,0.4)", border: "1px solid rgba(59,42,19,0.06)" }}>
              <div className="flex items-center gap-2 mb-4">
                <Clock size={16} color="#B8892B" />
                <h2 className="orda-cinzel text-sm font-semibold text-[#2E2013] tracking-wider">{t("passport.journeyTimeline")}</h2>
              </div>
              {summaryQuery.isLoading ? (
                <div className="h-14 rounded-xl" style={{ background: "rgba(59,42,19,0.03)" }} />
              ) : timeline.length > 0 ? (
                <div className="relative">
                  <div className="absolute left-[5px] top-1 bottom-1 w-px" style={{ background: "rgba(184,137,43,0.2)" }} />
                  <div className="space-y-4">
                    {timeline.map((record) => (
                      <div key={record.id} className="flex items-start gap-4 pl-0">
                        <div className="w-[11px] h-[11px] rounded-full mt-1 flex-shrink-0" style={{ background: "#B8892B" }} />
                        <div>
                          <p className="text-xs orda-inter text-[#2E2013]">{describeProgressRecord(t, record, cities, artifactsList, questsList)}</p>
                          <p className="text-[10px] orda-inter text-[#5C4E38]">{new Date(record.completed_at as string).toLocaleString()}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-xs orda-inter text-[#5C4E38]">{t("passport.noTimeline")}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── AUTH ─────────────────────────────────────────────────────────────────────
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;
const MIN_USERNAME_LENGTH = 3;

interface AuthFormErrors {
  email?: string;
  username?: string;
  password?: string;
}

function AuthGate({ onAuthenticated }: { onAuthenticated: () => void }) {
  const { t } = useTranslation();
  const { loginMutation, registerMutation } = useAuthSession();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [errors, setErrors] = useState<AuthFormErrors>({});
  const [success, setSuccess] = useState(false);

  const activeMutation = mode === "login" ? loginMutation : registerMutation;

  const validate = (): boolean => {
    const nextErrors: AuthFormErrors = {};
    if (!EMAIL_PATTERN.test(email)) {
      nextErrors.email = t("auth.errors.emailInvalid");
    }
    if (mode === "register" && username.trim().length < MIN_USERNAME_LENGTH) {
      nextErrors.username = t("auth.errors.usernameTooShort", { count: MIN_USERNAME_LENGTH });
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      nextErrors.password = t("auth.errors.passwordTooShort", { count: MIN_PASSWORD_LENGTH });
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    try {
      if (mode === "login") {
        await loginMutation.mutateAsync({ email, password, rememberMe });
      } else {
        await registerMutation.mutateAsync({ email, username, password, full_name: fullName || undefined });
      }
      setSuccess(true);
    } catch {
      // surfaced via activeMutation.error below
    }
  };

  useEffect(() => {
    if (!success) return;
    const timer = setTimeout(onAuthenticated, 900);
    return () => clearTimeout(timer);
  }, [success, onAuthenticated]);

  return (
    <div className="min-h-screen pt-16 flex items-center justify-center px-4 animate-fade-in"
      style={{ background: "radial-gradient(ellipse at top, rgba(184,137,43,0.04) 0%, #EDE1C4 60%)" }}>
      <div className="max-w-md w-full glass-dark rounded-[24px] p-8 animate-scale-in">
        {success ? (
          <div className="animate-scale-in text-center py-6">
            <div className="w-14 h-14 mx-auto mb-4 rounded-full flex items-center justify-center"
              style={{ background: "rgba(124,139,90,0.15)" }}>
              <Check size={26} color="#7C8B5A" />
            </div>
            <div className="text-[#7C8B5A] text-sm orda-cinzel tracking-widest mb-2">
              {mode === "login" ? t("auth.welcomeBackShort") : t("auth.accountCreated")}
            </div>
            <p className="orda-inter text-sm text-[#5C4E38]">{t("auth.enteringSteppe")}</p>
          </div>
        ) : (
          <>
            <div className="text-center mb-8">
              <div className="w-14 h-14 mx-auto mb-4 rounded-2xl flex items-center justify-center"
                style={{ background: "linear-gradient(135deg,#B8892B,#8C6239)" }}>
                <span className="text-[#EDE1C4] font-bold text-xl orda-cinzel">O</span>
              </div>
              <h1 className="orda-cinzel text-2xl font-bold text-[#2E2013] mb-2">
                {mode === "login" ? t("auth.welcomeBack") : t("auth.joinJourney")}
              </h1>
              <p className="orda-inter text-sm text-[#5C4E38]">
                {mode === "login" ? t("auth.signInSubtitle") : t("auth.registerSubtitle")}
              </p>
            </div>

            <div className="flex gap-2 mb-6 p-1 rounded-xl" style={{ background: "rgba(59,42,19,0.03)" }}>
              {(["login", "register"] as const).map((m) => (
                <button key={m} type="button" onClick={() => { setMode(m); setErrors({}); }}
                  className="flex-1 py-2 rounded-lg text-xs orda-cinzel tracking-widest transition-all"
                  style={{ background: mode === m ? "rgba(184,137,43,0.15)" : "transparent", color: mode === m ? "#B8892B" : "#5C4E38" }}>
                  {m === "login" ? t("auth.signIn") : t("auth.register")}
                </button>
              ))}
            </div>

            <form onSubmit={submit} className="space-y-4" noValidate>
              <div>
                <input className="input-field" type="email" placeholder={t("auth.email")} value={email}
                  onChange={(e) => setEmail(e.target.value)} />
                {errors.email && <p className="mt-1.5 text-xs orda-inter" style={{ color: "#A23E2E" }}>{errors.email}</p>}
              </div>
              {mode === "register" && (
                <>
                  <div>
                    <input className="input-field" type="text" placeholder={t("auth.username")} value={username}
                      onChange={(e) => setUsername(e.target.value)} />
                    {errors.username && <p className="mt-1.5 text-xs orda-inter" style={{ color: "#A23E2E" }}>{errors.username}</p>}
                  </div>
                  <input className="input-field" type="text" placeholder={t("auth.fullNameOptional")} value={fullName}
                    onChange={(e) => setFullName(e.target.value)} />
                </>
              )}
              <div>
                <input className="input-field" type="password" placeholder={t("auth.password")} value={password}
                  onChange={(e) => setPassword(e.target.value)} />
                {errors.password && <p className="mt-1.5 text-xs orda-inter" style={{ color: "#A23E2E" }}>{errors.password}</p>}
              </div>

              {mode === "login" && (
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded" style={{ accentColor: "#B8892B" }} />
                  <span className="text-xs orda-inter text-[#5C4E38]">{t("auth.rememberMe")}</span>
                </label>
              )}

              {activeMutation.error && (
                <p className="text-xs text-center orda-inter" style={{ color: "#A23E2E" }}>
                  {(activeMutation.error as Error).message}
                </p>
              )}

              <button type="submit" disabled={activeMutation.isPending}
                className="btn-primary w-full flex items-center justify-center gap-2"
                style={{ opacity: activeMutation.isPending ? 0.7 : 1 }}>
                {activeMutation.isPending ? t("auth.pleaseWait") : mode === "login" ? t("auth.signIn") : t("auth.createAccount")}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

// ─── NOTIFICATIONS PAGE ────────────────────────────────────────────────────────
function NotificationsPage({ onBack }: { onBack: () => void }) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { notificationsQuery, unreadCountQuery, markReadMutation, markAllReadMutation, deleteMutation } = useNotifications();
  const notifications = notificationsQuery.data?.data || [];
  const unreadCount = unreadCountQuery.data?.unread_count ?? 0;

  const handleSelect = (notification: ApiNotification) => {
    if (!notification.is_read) markReadMutation.mutate(notification.id);
    const target = TYPE_TARGET[notification.type];
    if (target) navigate(target);
  };

  return (
    <div className="min-h-screen pt-16 animate-fade-in" style={{ background: "#EDE1C4" }}>
      <div className="max-w-2xl mx-auto px-6 py-10">
        <div className="flex items-center gap-4 mb-10">
          <button onClick={onBack} className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-[rgba(59,42,19,0.06)] transition-colors"
            style={{ border: "1px solid rgba(59,42,19,0.06)" }}>
            <ChevronLeft size={16} color="#5C4E38" />
          </button>
          <div className="flex-1">
            <h1 className="orda-cinzel text-3xl font-bold text-[#2E2013]">{t("notificationsPage.title")}</h1>
            <p className="orda-inter text-sm text-[#5C4E38] mt-1">{t("notificationsPage.subtitle")}</p>
          </div>
          {unreadCount > 0 && (
            <button onClick={() => markAllReadMutation.mutate()}
              className="flex items-center gap-1.5 text-xs orda-inter text-[#B8892B] hover:text-[#2E2013] transition-colors flex-shrink-0">
              <Check size={13} /> {t("notificationCenter.markAllRead")}
            </button>
          )}
        </div>

        {notificationsQuery.isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-16 rounded-[16px]" style={{ background: "rgba(241,233,210,0.4)" }} />
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="rounded-[20px] p-10 text-center" style={{ background: "rgba(241,233,210,0.4)", border: "1px solid rgba(59,42,19,0.06)" }}>
            <Bell size={24} color="#5C4E38" className="mx-auto mb-3" />
            <p className="orda-inter text-sm text-[#5C4E38]">{t("notificationCenter.empty")}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map((notification) => {
              const Icon = TYPE_ICON[notification.type] ?? Bell;
              return (
                <div key={notification.id}
                  className="group relative flex items-start gap-3 p-4 rounded-[16px] cursor-pointer transition-colors hover:bg-[rgba(59,42,19,0.05)]"
                  style={{ background: "rgba(241,233,210,0.4)", border: `1px solid ${notification.is_read ? "rgba(59,42,19,0.06)" : "rgba(184,137,43,0.2)"}` }}
                  onClick={() => handleSelect(notification)}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: notification.is_read ? "rgba(59,42,19,0.04)" : "rgba(184,137,43,0.12)", border: `1px solid ${notification.is_read ? "rgba(59,42,19,0.06)" : "rgba(184,137,43,0.25)"}` }}>
                    <Icon size={16} color={notification.is_read ? "#5C4E38" : "#B8892B"} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="orda-cinzel text-sm text-[#2E2013] truncate">{notification.title}</span>
                      {!notification.is_read && <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: "#6B8CA3" }} />}
                    </div>
                    <p className="orda-inter text-xs text-[#5C4E38] leading-relaxed mt-0.5">{notification.message}</p>
                    <span className="orda-inter text-[10px] text-[#9C8F72] mt-1 block">
                      {formatRelativeTime(notification.created_at, i18n.resolvedLanguage || "en")}
                    </span>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(notification.id); }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity w-7 h-7 rounded-lg flex items-center justify-center hover:bg-[rgba(59,42,19,0.06)] flex-shrink-0"
                    aria-label={t("notificationCenter.delete")}>
                    <X size={13} color="#5C4E38" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── STATIC PAGES (Privacy / Terms / Contacts) ────────────────────────────────
function LegalPage({ page, onNav }: { page: "privacy" | "terms"; onNav: (v: View) => void }) {
  const { t } = useTranslation();
  const sections = t(`${page}.sections`, { returnObjects: true }) as { heading: string; body: string }[];
  return (
    <div className="min-h-screen pt-16 pb-20 animate-fade-in" style={{ background: "#EDE1C4" }}>
      <div className="max-w-3xl mx-auto px-6 py-10">
        <button onClick={() => onNav("landing")}
          className="nav-link flex items-center gap-2 text-sm text-[#5C4E38] hover:text-[#2E2013] transition-colors mb-8 orda-inter">
          <ChevronLeft size={16} /> {t("common.backToHome")}
        </button>
        <div className="badge-gold mb-4 inline-block">{t(`${page}.badge`)}</div>
        <h1 className="orda-cinzel text-3xl md:text-4xl font-bold text-[#2E2013] mb-4">{t(`${page}.title`)}</h1>
        <p className="orda-inter text-sm text-[#5C4E38] mb-10">{t(`${page}.updated`)}</p>
        <div className="space-y-6">
          {sections.map((section, i) => (
            <div key={i} className="rounded-[20px] p-7" style={{ background: "rgba(241,233,210,0.5)", border: "1px solid rgba(59,42,19,0.06)" }}>
              <h2 className="orda-cinzel text-base font-semibold text-[#2E2013] mb-3">{section.heading}</h2>
              <p className="orda-inter text-sm text-[#5C4E38] leading-relaxed">{section.body}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ContactsPage({ onNav }: { onNav: (v: View) => void }) {
  const { t } = useTranslation();
  const email = t("contacts.email");
  return (
    <div className="min-h-screen pt-16 pb-20 flex items-center justify-center px-4 animate-fade-in"
      style={{ background: "radial-gradient(ellipse at top, rgba(184,137,43,0.04) 0%, #EDE1C4 60%)" }}>
      <div className="max-w-md w-full">
        <button onClick={() => onNav("landing")}
          className="nav-link flex items-center gap-2 text-sm text-[#5C4E38] hover:text-[#2E2013] transition-colors mb-8 orda-inter">
          <ChevronLeft size={16} /> {t("common.backToHome")}
        </button>
        <div className="glass-dark rounded-[24px] p-8 text-center animate-scale-in">
          <div className="w-14 h-14 mx-auto mb-4 rounded-2xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg,#B8892B,#8C6239)" }}>
            <MessageSquare size={22} color="#EDE1C4" />
          </div>
          <h1 className="orda-cinzel text-2xl font-bold text-[#2E2013] mb-2">{t("contacts.title")}</h1>
          <p className="orda-inter text-sm text-[#5C4E38] mb-6 leading-relaxed">{t("contacts.intro")}</p>
          <a href={`mailto:${email}`} className="nav-link btn-primary inline-flex items-center justify-center gap-2 text-sm px-6 py-3 mb-4">
            {email}
          </a>
          <p className="orda-inter text-xs text-[#5C4E38]">{t("contacts.responseTime")}</p>
        </div>
      </div>
    </div>
  );
}

// ─── ORDAS (SOCIAL GROUPS) ──────────────────────────────────────────────────────
function GroupsPage({ onBack, onSelectGroup }: { onBack: () => void; onSelectGroup: (id: string) => void }) {
  const { t } = useTranslation();
  const { myGroupsQuery, createGroupMutation, joinGroupMutation } = useGroups();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");

  const handleCreate = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    createGroupMutation.mutate({ name: name.trim() }, {
      onSuccess: (group) => onSelectGroup(group.id),
    });
  };

  const handleJoin = (e: FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    joinGroupMutation.mutate({ invite_code: code.trim() }, {
      onSuccess: (group) => onSelectGroup(group.id),
    });
  };

  const groups = myGroupsQuery.data || [];

  return (
    <div className="min-h-screen pt-16 pb-20 px-4 sm:px-8 animate-fade-in" style={{ background: "#EDE1C4" }}>
      <div className="max-w-3xl mx-auto">
        <button onClick={onBack} className="nav-link flex items-center gap-2 text-sm text-[#5C4E38] hover:text-[#2E2013] transition-colors mb-6 orda-inter">
          <ChevronLeft size={16} /> {t("common.backToHome")}
        </button>

        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg,#B8892B,#8C6239)" }}>
            <Users size={18} color="#EDE1C4" />
          </div>
          <h1 className="orda-cinzel text-2xl font-bold text-[#2E2013]">{t("groups.title")}</h1>
        </div>
        <p className="orda-inter text-sm text-[#5C4E38] mb-8">{t("groups.subtitle")}</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          <form onSubmit={handleCreate} className="rounded-[16px] p-5" style={{ background: "rgba(241,233,210,0.6)", border: "1px solid rgba(59,42,19,0.14)" }}>
            <h2 className="orda-cinzel text-sm font-semibold text-[#2E2013] mb-3 flex items-center gap-2">
              <Plus size={15} color="#B8892B" /> {t("groups.createTitle")}
            </h2>
            <input value={name} onChange={(e) => setName(e.target.value)}
              placeholder={t("groups.createPlaceholder")} maxLength={100}
              className="input-field text-sm mb-3" />
            {createGroupMutation.isError && (
              <p className="text-xs mb-2" style={{ color: "#A23E2E" }}>{(createGroupMutation.error as Error).message}</p>
            )}
            <button type="submit" disabled={!name.trim() || createGroupMutation.isPending}
              className="btn-primary w-full text-sm py-2.5 disabled:opacity-50">
              {createGroupMutation.isPending ? t("groups.creating") : t("groups.createButton")}
            </button>
          </form>

          <form onSubmit={handleJoin} className="rounded-[16px] p-5" style={{ background: "rgba(241,233,210,0.6)", border: "1px solid rgba(59,42,19,0.14)" }}>
            <h2 className="orda-cinzel text-sm font-semibold text-[#2E2013] mb-3 flex items-center gap-2">
              <Users size={15} color="#B8892B" /> {t("groups.joinTitle")}
            </h2>
            <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder={t("groups.joinPlaceholder")} maxLength={16}
              className="input-field text-sm mb-3 orda-cinzel tracking-widest" />
            {joinGroupMutation.isError && (
              <p className="text-xs mb-2" style={{ color: "#A23E2E" }}>{(joinGroupMutation.error as Error).message}</p>
            )}
            <button type="submit" disabled={!code.trim() || joinGroupMutation.isPending}
              className="btn-ghost w-full text-sm py-2.5 disabled:opacity-50">
              {joinGroupMutation.isPending ? t("groups.joining") : t("groups.joinButton")}
            </button>
          </form>
        </div>

        <h2 className="orda-cinzel text-xs tracking-[0.2em] text-[#5C4E38] mb-3">{t("groups.myOrdas")}</h2>
        {myGroupsQuery.isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="h-16 rounded-[14px]" style={{ background: "rgba(59,42,19,0.04)" }} />
            ))}
          </div>
        ) : groups.length > 0 ? (
          <div className="space-y-2">
            {groups.map((group) => (
              <button key={group.id} onClick={() => onSelectGroup(group.id)}
                className="card-hover w-full flex items-center justify-between gap-3 p-4 rounded-[14px] text-left transition-colors"
                style={{ background: "rgba(184,137,43,0.05)", border: "1px solid rgba(184,137,43,0.12)" }}>
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "rgba(184,137,43,0.15)" }}>
                    <Users size={15} color="#B8892B" />
                  </div>
                  <div className="min-w-0">
                    <div className="orda-cinzel text-sm font-semibold text-[#2E2013] truncate">{group.name}</div>
                    <div className="orda-inter text-xs text-[#5C4E38]">{t("groups.memberCount", { count: group.member_count })}</div>
                  </div>
                </div>
                <ChevronRight size={16} color="#B8892B" className="flex-shrink-0" />
              </button>
            ))}
          </div>
        ) : (
          <div className="rounded-[14px] p-6 text-center" style={{ background: "rgba(59,42,19,0.02)", border: "1px solid rgba(59,42,19,0.05)" }}>
            <p className="text-sm orda-inter text-[#5C4E38]">{t("groups.noGroups")}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function GroupDetailPage({ groupId, onBack }: { groupId: string | null; onBack: () => void }) {
  const { t } = useTranslation();
  const { groupQuery, membersQuery, leaderboardQuery } = useGroup(groupId ?? undefined);
  const [copied, setCopied] = useState(false);

  const group = groupQuery.data;
  const members = membersQuery.data || [];
  const leaderboard = leaderboardQuery.data || [];
  const inviteLink = group && typeof window !== "undefined" ? `${window.location.origin}/join?code=${group.invite_code}` : "";

  const copyLink = () => {
    if (!inviteLink) return;
    navigator.clipboard.writeText(inviteLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (groupQuery.isError) {
    return (
      <div className="min-h-screen pt-16 flex flex-col items-center justify-center gap-4 px-4" style={{ background: "#EDE1C4" }}>
        <p className="orda-inter text-sm text-[#5C4E38]">{t("groups.notFound")}</p>
        <button onClick={onBack} className="btn-ghost text-sm px-6 py-2.5">{t("groups.backToOrdas")}</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-16 pb-20 px-4 sm:px-8 animate-fade-in" style={{ background: "#EDE1C4" }}>
      <div className="max-w-3xl mx-auto">
        <button onClick={onBack} className="nav-link flex items-center gap-2 text-sm text-[#5C4E38] hover:text-[#2E2013] transition-colors mb-6 orda-inter">
          <ChevronLeft size={16} /> {t("groups.backToOrdas")}
        </button>

        {groupQuery.isLoading || !group ? (
          <div className="h-24 rounded-[16px] animate-pulse" style={{ background: "rgba(59,42,19,0.04)" }} />
        ) : (
          <>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "linear-gradient(135deg,#B8892B,#8C6239)" }}>
                <Users size={20} color="#EDE1C4" />
              </div>
              <div>
                <h1 className="orda-cinzel text-xl font-bold text-[#2E2013]">{group.name}</h1>
                <p className="orda-inter text-xs text-[#5C4E38]">{t("groups.memberCount", { count: group.member_count })}</p>
              </div>
            </div>

            <div className="rounded-[16px] p-5 mb-6" style={{ background: "rgba(184,137,43,0.05)", border: "1px solid rgba(184,137,43,0.15)" }}>
              <div className="text-[10px] orda-cinzel tracking-[0.2em] text-[#5C4E38] mb-2">{t("groups.inviteLink")}</div>
              <div className="flex items-center gap-2">
                <div className="flex-1 min-w-0 orda-inter text-xs sm:text-sm text-[#2E2013] px-3 py-2.5 rounded-lg truncate" style={{ background: "rgba(241,233,210,0.7)", border: "1px solid rgba(59,42,19,0.1)" }}>
                  {inviteLink}
                </div>
                <button onClick={copyLink} className="btn-teal text-xs px-4 py-2.5 flex items-center gap-1.5 flex-shrink-0">
                  <Copy size={13} /> {copied ? t("groups.copied") : t("groups.copyLink")}
                </button>
              </div>
              <div className="mt-2 orda-inter text-[11px] text-[#5C4E38]">{t("groups.inviteCode")}: <span className="orda-cinzel text-[#B8892B] tracking-widest">{group.invite_code}</span></div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h2 className="orda-cinzel text-xs tracking-[0.2em] text-[#5C4E38] mb-3 flex items-center gap-2">
                  <Users size={13} color="#B8892B" /> {t("groups.members")}
                </h2>
                {membersQuery.isLoading ? (
                  <div className="h-32 rounded-[14px] animate-pulse" style={{ background: "rgba(59,42,19,0.04)" }} />
                ) : (
                  <div className="space-y-2">
                    {members.map((member) => (
                      <div key={member.user_id} className="flex items-center gap-3 p-3 rounded-[12px]" style={{ background: "rgba(241,233,210,0.5)", border: "1px solid rgba(59,42,19,0.06)" }}>
                        <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden orda-cinzel text-xs font-bold" style={{ background: "rgba(184,137,43,0.15)", color: "#B8892B" }}>
                          {member.avatar_url ? <img src={member.avatar_url} alt="" className="w-full h-full object-cover" /> : member.username[0]?.toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="orda-cinzel text-xs font-semibold text-[#2E2013] truncate">{member.username}</span>
                            {member.is_owner && <Crown size={11} color="#B8892B" />}
                          </div>
                          <div className="orda-inter text-[10px] text-[#5C4E38]">{t("groups.levelXp", { level: member.level, xp: member.xp })}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h2 className="orda-cinzel text-xs tracking-[0.2em] text-[#5C4E38] mb-3 flex items-center gap-2">
                  <Trophy size={13} color="#B8892B" /> {t("groups.leaderboard")}
                </h2>
                {leaderboardQuery.isLoading ? (
                  <div className="h-32 rounded-[14px] animate-pulse" style={{ background: "rgba(59,42,19,0.04)" }} />
                ) : (
                  <div className="space-y-2">
                    {leaderboard.map((entry) => {
                      // Top 3 read as medals (gold/silver/bronze) — everyone else is a
                      // plain numbered row. Same three tones used for artifact rarity
                      // elsewhere in the app, kept consistent here.
                      const medal = entry.rank === 1 ? "#B8892B" : entry.rank === 2 ? "#9AA0A6" : entry.rank === 3 ? "#8C6239" : null;
                      return (
                        <div key={entry.user_id} className="flex items-center gap-3 p-3 rounded-[12px]"
                          style={medal
                            ? { background: `${medal}18`, border: `1px solid ${medal}45` }
                            : { background: "rgba(241,233,210,0.5)", border: "1px solid rgba(59,42,19,0.06)" }}>
                          <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 orda-cinzel text-xs font-bold"
                            style={medal ? { background: medal, color: "#F3E9D2" } : { color: "#5C4E38" }}>
                            {medal ? <Crown size={13} color="#F3E9D2" /> : `#${entry.rank}`}
                          </div>
                          <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden orda-cinzel text-xs font-bold" style={{ background: "rgba(184,137,43,0.15)", color: "#B8892B" }}>
                            {entry.avatar_url ? <img src={entry.avatar_url} alt="" className="w-full h-full object-cover" /> : entry.username[0]?.toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="orda-cinzel text-xs font-semibold text-[#2E2013] truncate">{entry.username}</div>
                            <div className="flex items-center flex-wrap gap-x-2.5 gap-y-0.5 mt-0.5">
                              <span className="orda-inter text-[10px] text-[#5C4E38]">{t("groups.levelShort", { level: entry.level })}</span>
                              <span className="orda-inter text-[10px] text-[#B8892B] font-semibold">{entry.xp} XP</span>
                              <span className="orda-inter text-[10px] text-[#5C4E38] flex items-center gap-0.5"><Coins size={10} color="#B8892B" />{entry.coins}</span>
                              <span className="orda-inter text-[10px] text-[#5C4E38] flex items-center gap-0.5"><ScrollText size={10} color="#8C6239" />{entry.completed_quests}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function JoinPage({ onDone, onSignIn }: { onDone: (groupId: string) => void; onSignIn: () => void }) {
  const { t } = useTranslation();
  const location = useLocation();
  const { isAuthenticated } = useAuthSession();
  const { joinGroupMutation } = useGroups();
  const codeFromUrl = new URLSearchParams(location.search).get("code") || "";
  const [code, setCode] = useState(codeFromUrl);
  const attemptedRef = useRef(false);

  useEffect(() => {
    if (isAuthenticated && codeFromUrl && !attemptedRef.current) {
      attemptedRef.current = true;
      joinGroupMutation.mutate({ invite_code: codeFromUrl }, {
        onSuccess: (group) => onDone(group.id),
      });
    }
  }, [isAuthenticated, codeFromUrl]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    joinGroupMutation.mutate({ invite_code: code.trim() }, {
      onSuccess: (group) => onDone(group.id),
    });
  };

  return (
    <div className="min-h-screen pt-16 flex items-center justify-center px-4 animate-fade-in" style={{ background: "#EDE1C4" }}>
      <div className="max-w-sm w-full rounded-[20px] p-8 text-center" style={{ background: "rgba(241,233,210,0.6)", border: "1px solid rgba(59,42,19,0.14)" }}>
        <div className="w-14 h-14 mx-auto mb-4 rounded-2xl flex items-center justify-center" style={{ background: "linear-gradient(135deg,#B8892B,#8C6239)" }}>
          <Users size={22} color="#EDE1C4" />
        </div>
        <h1 className="orda-cinzel text-xl font-bold text-[#2E2013] mb-2">{t("groups.joinPageTitle")}</h1>

        {!isAuthenticated ? (
          <>
            <p className="orda-inter text-sm text-[#5C4E38] mb-6">{t("groups.joinPageSigninPrompt")}</p>
            <button onClick={onSignIn} className="btn-primary w-full text-sm py-3">{t("groups.joinPageSigninButton")}</button>
          </>
        ) : joinGroupMutation.isPending ? (
          <p className="orda-inter text-sm text-[#5C4E38]">{t("groups.joining")}</p>
        ) : (
          <form onSubmit={handleSubmit}>
            <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder={t("groups.joinPlaceholder")} maxLength={16}
              className="input-field text-sm mb-3 orda-cinzel tracking-widest text-center" />
            {joinGroupMutation.isError && (
              <p className="text-xs mb-3" style={{ color: "#A23E2E" }}>{(joinGroupMutation.error as Error).message}</p>
            )}
            <button type="submit" disabled={!code.trim()} className="btn-primary w-full text-sm py-3 disabled:opacity-50">
              {t("groups.joinButton")}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

// ─── APP ──────────────────────────────────────────────────────────────────────
export default function App() {
  const { t, i18n } = useTranslation();
  const { isAuthenticated, user, updateProfileMutation } = useAuthSession();
  const location = useLocation();
  const rrNavigate = useNavigate();
  // The backend-persisted choice (`user.journey`) is the source of truth once
  // signed in — it's what makes the selected path survive a refresh. Before
  // that (picking a path pre-signup, from the anonymous Landing flow) there's
  // no user yet, so the pick is held here until `onAuthenticated` persists it.
  const [pendingCharacter, setPendingCharacter] = useState<CharType | null>(null);
  const character: CharType = (user?.journey as CharType | undefined) ?? pendingCharacter ?? "explorer";
  const { activeCityId, setActiveCityId } = useActiveCity();

  const view = viewForPathname(location.pathname);
  const cityId = view === "city" ? cityIdFromPathname(location.pathname) : null;
  const groupId = view === "group" ? groupIdFromPathname(location.pathname) : null;
  // The city list endpoint only returns summary fields; the detail page needs the
  // full record (description, significance, historical_facts, trade_info, ...), so
  // it's fetched separately by id rather than derived from the summary list.
  const { data: cityDetailData, isError: cityDetailError, isLoading: cityDetailLoading } = useCity(cityId ?? undefined);
  const selectedCity = cityDetailData ? mapApiCity(cityDetailData, t) : null;

  // The `/city/:id` URL is the shareable/bookmarkable source of truth for that
  // route — keep the global activeCityId in sync with it whenever it's present,
  // so navigating directly to a city (or refreshing on one) also becomes "active"
  // everywhere else (map highlight, quest/artifact panels, AI historian context).
  useEffect(() => {
    if (cityId) setActiveCityId(cityId);
  }, [cityId, setActiveCityId]);

  const navigate = (v: View) => {
    const resolved = resolveView(v, isAuthenticated, user?.role ?? null);
    rrNavigate(pathForView(resolved));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // react-router marks the first history entry with the key "default" — if we're
  // still on it there's nothing in-app to go back to, so fall back to the dashboard
  // instead of letting the browser leave the app entirely.
  const goBack = () => {
    if (location.key !== "default") rrNavigate(-1);
    else navigate("dashboard");
  };

  // Passive route guard: if a session expires (or refresh fails) while on a protected
  // route, drop back to auth; conversely, bounce an already-authenticated visitor away
  // from the guest-only auth screen. Runs on every route change, not just login/logout,
  // so directly opening a URL (or pressing Back into one) is guarded too.
  useEffect(() => {
    if (PROTECTED_VIEWS.includes(view) && !isAuthenticated) {
      rrNavigate("/auth", { replace: true });
    } else if (GUEST_ONLY_VIEWS.includes(view) && isAuthenticated) {
      rrNavigate("/dashboard", { replace: true });
    }
  }, [view, isAuthenticated]);

  // A /city/:id URL that doesn't resolve (bad id, deleted city) settles back on
  // the dashboard once the lookup has actually failed — not while still loading.
  useEffect(() => {
    if (view === "city" && cityId && cityDetailError) {
      rrNavigate("/dashboard", { replace: true });
    }
  }, [view, cityId, cityDetailError]);

  // Honor the account's saved language preference (e.g. after signing in on a new device).
  useEffect(() => {
    if (user?.language && user.language !== i18n.resolvedLanguage) {
      i18n.changeLanguage(user.language);
    }
  }, [user?.language]);

  const handleCharSelect = (c: CharType) => {
    setPendingCharacter(c);
    // Already signed in (e.g. revisiting character select later to switch
    // paths) — persist immediately rather than waiting for onAuthenticated,
    // which won't fire again this session.
    if (isAuthenticated) updateProfileMutation.mutate({ journey: c });
    navigate("intro");
  };

  const handleCitySelect = (city: City) => {
    setActiveCityId(city.id);
    rrNavigate(pathForView("city", city.id));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleGroupSelect = (id: string) => {
    rrNavigate(pathForView("group", id));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen orda-inter" style={{ background: "#EDE1C4", color: "#2E2013" }}>
      <style>{GLOBAL_CSS}</style>

      <NavBar view={view} onNav={navigate} />

      <div key={location.pathname} className="view-enter">
        {view === "landing" && (
          <>
            <Landing onStart={() => navigate("chars")} />
            <LandingStory onStart={() => navigate("chars")} onNav={navigate} />
          </>
        )}
        {view === "chars" && (
          <div className="min-h-screen pt-16" style={{ background: "radial-gradient(ellipse at top, rgba(184,137,43,0.04) 0%, #EDE1C4 60%)" }}>
            <CharacterSelect onSelect={handleCharSelect} />
          </div>
        )}
        {view === "intro" && (
          <StoryIntro character={character} onBegin={() => navigate("dashboard")} />
        )}
        {view === "auth" && (
          <AuthGate onAuthenticated={() => {
            // A path picked before signing up (Landing → chars → intro →
            // forced through /auth) only reaches the backend now that there's
            // a user to attach it to.
            if (pendingCharacter) updateProfileMutation.mutate({ journey: pendingCharacter });
            navigate("dashboard");
          }} />
        )}
        {view === "dashboard" && (
          <Dashboard character={character} onSelectCity={handleCitySelect} onNav={navigate} />
        )}
        {view === "city" && (
          selectedCity ? (
            <CityPage city={selectedCity} onBack={() => navigate("dashboard")} onNav={navigate} />
          ) : (
            <div className="min-h-screen pt-16 flex items-center justify-center" style={{ background: "#EDE1C4" }}>
              <div className="animate-pulse-gold w-10 h-10 rounded-full" style={{ background: "rgba(184,137,43,0.15)" }} />
            </div>
          )
        )}
        {view === "ai" && (
          <AIHistorian onBack={goBack} />
        )}
        {view === "artifacts" && (
          <ArtifactGallery onBack={goBack} />
        )}
        {view === "quests" && (
          <QuestView onBack={goBack} />
        )}
        {view === "certificate" && (
          <Certificate character={character} onBack={goBack} />
        )}
        {view === "passport" && (
          <Passport onBack={goBack} onLogout={() => navigate("landing")} />
        )}
        {view === "notifications" && (
          <NotificationsPage onBack={goBack} />
        )}
        {view === "privacy" && <LegalPage page="privacy" onNav={navigate} />}
        {view === "terms" && <LegalPage page="terms" onNav={navigate} />}
        {view === "contacts" && <ContactsPage onNav={navigate} />}
        {view === "groups" && (
          <GroupsPage onBack={() => navigate("dashboard")} onSelectGroup={handleGroupSelect} />
        )}
        {view === "group" && (
          <GroupDetailPage groupId={groupId} onBack={() => navigate("groups")} />
        )}
        {view === "join" && (
          <JoinPage onDone={handleGroupSelect} onSignIn={() => navigate("auth")} />
        )}
      </div>
    </div>
  );
}