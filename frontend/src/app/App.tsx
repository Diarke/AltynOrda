import { useState, useEffect, useRef, type ChangeEvent, type FormEvent, type ReactNode } from "react";
import { motion, useInView, useScroll, useTransform } from "motion/react";
import { useTranslation, type TFunction } from "react-i18next";
import { DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES, type SupportedLanguage } from "./lib/i18n";
import {
  useAuthSession,
  useArtifacts,
  useCertificates,
  useChatMutation,
  useCities,
  useProgress,
  useQuests,
  type ApiArtifact,
  type ApiCity,
  type ApiLanguage,
  type ApiProgressSummary,
  type ApiQuest,
} from "./lib/api";
import {
  Map, Package, Award, MessageSquare, ChevronRight, Compass, ScrollText,
  ShoppingBag, Globe, Search, Settings, User, Bell, ArrowRight, Play,
  Mic, Send, X, Menu, ChevronDown, Shield, Crown, BookOpen, Clock,
  MapPin, Download, Share2, Check, ChevronLeft, Star, Eye, Mountain,
  Volume2, Paperclip, TrendingUp, Wind, Zap, Feather, LogOut, Camera
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
type View = "landing" | "chars" | "intro" | "auth" | "dashboard" | "city" | "ai" | "artifacts" | "quests" | "certificate" | "passport";
type CharType = "merchant" | "diplomat" | "explorer";

// ─── Route access control ──────────────────────────────────────────────────────
// Protected: require an authenticated session. Guest-only: only for signed-out
// visitors (e.g. redirect an already-logged-in user away from the auth screen).
// Admin: reserved for admin-only views (none exist yet in this app).
const PROTECTED_VIEWS: View[] = ["dashboard", "city", "ai", "artifacts", "quests", "certificate", "passport"];
const GUEST_ONLY_VIEWS: View[] = ["auth"];
const ADMIN_VIEWS: View[] = [];

function resolveView(target: View, isAuthenticated: boolean, role: string | null): View {
  if (PROTECTED_VIEWS.includes(target) && !isAuthenticated) return "auth";
  if (GUEST_ONLY_VIEWS.includes(target) && isAuthenticated) return "dashboard";
  if (ADMIN_VIEWS.includes(target) && role !== "admin") return "dashboard";
  return target;
}

interface City {
  id: string; name: string; subtitle: string;
  cx: number; cy: number;
  description: string; founded: string; population: string;
  facts: string[]; importance: string;
  color: string; size: number;
}

interface Artifact {
  id: string; name: string; category: string;
  description: string; found: string; city: string; icon: string;
  rarity: "common" | "rare" | "legendary";
}

const CITY_SLUGS: Record<string, string> = {
  "Sarai Batu": "sarai-batu",
  "Sarayshyk": "sarayshyk",
  "Otrar": "otrar",
  "Sygnak": "sygnak",
  "Bolgar": "bolgar",
  "Kaffa": "kaffa",
};

const CITY_LAYOUTS: Record<string, { cx: number; cy: number; color: string; size: number }> = {
  "sarai-batu": { cx: 370, cy: 295, color: "#D4AF37", size: 10 },
  "sarayshyk": { cx: 490, cy: 295, color: "#C9962C", size: 7 },
  "otrar": { cx: 730, cy: 415, color: "#C9962C", size: 7 },
  "sygnak": { cx: 630, cy: 415, color: "#B7BAC3", size: 6 },
  "bolgar": { cx: 418, cy: 105, color: "#B7BAC3", size: 6 },
  "kaffa": { cx: 92, cy: 335, color: "#B7BAC3", size: 6 },
};

function mapApiCity(city: ApiCity, t: TFunction): City {
  const slug = CITY_SLUGS[city.name];
  const layout = (slug && CITY_LAYOUTS[slug]) || { cx: 360, cy: 260, color: "#B7BAC3", size: 6 };
  const subtitle = slug ? t(`map.citySubtitles.${slug}`) : city.historical_period;

  return {
    id: city.id,
    name: city.name,
    subtitle,
    cx: layout.cx,
    cy: layout.cy,
    description: city.description,
    founded: city.historical_period,
    population: city.population_estimate || t("common.unknown"),
    facts: [city.significance || city.description, city.historical_period],
    importance: city.significance || city.description,
    color: layout.color,
    size: layout.size,
  };
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

// ─── Global Styles ────────────────────────────────────────────────────────────
const GLOBAL_CSS = `
  html { scroll-behavior: smooth; }

  .nav-link { outline: none; }
  .nav-link:focus-visible { outline: 2px solid #D4AF37; outline-offset: 4px; border-radius: 4px; }

  @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-14px)} }
  @keyframes pulse-gold { 0%,100%{box-shadow:0 0 0 0 rgba(212,175,55,0)} 50%{box-shadow:0 0 28px 6px rgba(212,175,55,0.25)} }
  @keyframes pulse-ring { 0%{transform:scale(1);opacity:0.6} 100%{transform:scale(2.5);opacity:0} }
  @keyframes drift-a { 0%{transform:translateX(0) translateY(0)} 100%{transform:translateX(-120px) translateY(-30px)} }
  @keyframes drift-b { 0%{transform:translateX(0) translateY(0)} 100%{transform:translateX(90px) translateY(-20px)} }
  @keyframes route-dash { to{stroke-dashoffset:-800} }
  @keyframes fade-in { from{opacity:0;transform:translateY(24px)} to{opacity:1;transform:translateY(0)} }
  @keyframes fade-in-fast { from{opacity:0} to{opacity:1} }
  @keyframes scale-in { from{opacity:0;transform:scale(0.88)} to{opacity:1;transform:scale(1)} }
  @keyframes slide-up { from{opacity:0;transform:translateY(36px)} to{opacity:1;transform:translateY(0)} }
  @keyframes slide-right { from{opacity:0;transform:translateX(-24px)} to{opacity:1;transform:translateX(0)} }
  @keyframes scroll-bounce { 0%,100%{transform:translateY(0);opacity:1} 50%{transform:translateY(10px);opacity:0.4} }
  @keyframes shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
  @keyframes confetti-fall { 0%{transform:translateY(-40px) rotate(0deg);opacity:1} 100%{transform:translateY(110vh) rotate(720deg);opacity:0} }
  @keyframes type-cursor { 0%,100%{opacity:1} 50%{opacity:0} }
  @keyframes grain-move { 0%,100%{transform:translate(0,0)} 20%{transform:translate(-2%,-3%)} 40%{transform:translate(3%,2%)} 60%{transform:translate(-1%,4%)} 80%{transform:translate(2%,-2%)} }
  @keyframes map-glow { 0%,100%{filter:drop-shadow(0 0 4px rgba(212,175,55,0.4))} 50%{filter:drop-shadow(0 0 12px rgba(212,175,55,0.8))} }
  @keyframes particle-up { 0%{opacity:0;transform:translateY(0) scale(1)} 30%{opacity:1} 100%{opacity:0;transform:translateY(-120px) scale(0)} }
  @keyframes border-spin { 0%{border-color:rgba(212,175,55,0.2) rgba(212,175,55,0.05) rgba(212,175,55,0.05) rgba(212,175,55,0.05)} 25%{border-color:rgba(212,175,55,0.05) rgba(212,175,55,0.2) rgba(212,175,55,0.05) rgba(212,175,55,0.05)} 50%{border-color:rgba(212,175,55,0.05) rgba(212,175,55,0.05) rgba(212,175,55,0.2) rgba(212,175,55,0.05)} 75%{border-color:rgba(212,175,55,0.05) rgba(212,175,55,0.05) rgba(212,175,55,0.05) rgba(212,175,55,0.2)} }

  .orda-cinzel { font-family:'Cinzel',serif; }
  .orda-cormorant { font-family:'Cormorant Garamond',serif; }
  .orda-inter { font-family:'Inter',sans-serif; }

  .glass { background:rgba(34,38,47,0.65);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);border:1px solid rgba(255,255,255,0.07); }
  .glass-dark { background:rgba(15,17,21,0.82);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);border:1px solid rgba(255,255,255,0.06); }
  .glass-gold { background:rgba(212,175,55,0.05);backdrop-filter:blur(12px);border:1px solid rgba(212,175,55,0.15); }

  .gold-hover { transition:all 0.25s ease; }
  .gold-hover:hover { box-shadow:0 0 40px rgba(212,175,55,0.2),0 0 80px rgba(212,175,55,0.06);border-color:rgba(212,175,55,0.35)!important; }
  .gold-glow-text { text-shadow:0 0 30px rgba(212,175,55,0.6); }
  .teal-glow { box-shadow:0 0 24px rgba(87,214,209,0.35); }

  .animate-float { animation:float 7s ease-in-out infinite; }
  .animate-pulse-gold { animation:pulse-gold 2.5s ease-in-out infinite; }
  .animate-fade-in { animation:fade-in 0.7s cubic-bezier(0.22,1,0.36,1) forwards; }
  .animate-scale-in { animation:scale-in 0.55s cubic-bezier(0.22,1,0.36,1) forwards; }
  .animate-slide-up { animation:slide-up 0.65s cubic-bezier(0.22,1,0.36,1) forwards; }
  .animate-slide-right { animation:slide-right 0.55s cubic-bezier(0.22,1,0.36,1) forwards; }
  .animate-scroll { animation:scroll-bounce 1.8s ease-in-out infinite; }
  .animate-grain { animation:grain-move 8s steps(1) infinite; }
  .animate-map-glow { animation:map-glow 3s ease-in-out infinite; }
  .animate-border-spin { animation:border-spin 4s linear infinite; }

  .shimmer-text {
    background:linear-gradient(90deg,#D4AF37 0%,#F6F4EC 45%,#D4AF37 55%,#C9962C 100%);
    background-size:200% auto;
    background-clip:text;-webkit-background-clip:text;color:transparent;
    animation:shimmer 4s linear infinite;
  }

  .route-path { stroke-dasharray:10 5;animation:route-dash 18s linear infinite; }
  .route-path-rev { stroke-dasharray:10 5;animation:route-dash 22s linear infinite reverse; }

  .city-dot-pulse { animation:map-glow 3s ease-in-out infinite; }

  .card-hover { transition:transform 0.3s cubic-bezier(0.22,1,0.36,1),box-shadow 0.3s ease; }
  .card-hover:hover { transform:translateY(-6px) scale(1.01); }

  .view-enter { animation:fade-in 0.6s cubic-bezier(0.22,1,0.36,1) forwards; }
  .view-enter-fast { animation:fade-in-fast 0.35s ease forwards; }

  ::-webkit-scrollbar { width:3px; }
  ::-webkit-scrollbar-track { background:transparent; }
  ::-webkit-scrollbar-thumb { background:rgba(212,175,55,0.25);border-radius:2px; }

  .ai-bubble { animation:slide-up 0.35s cubic-bezier(0.22,1,0.36,1) forwards; }

  .particle-rise { animation:particle-up linear forwards; }

  .cloud-a { animation:drift-a 60s linear infinite alternate; }
  .cloud-b { animation:drift-b 80s linear infinite alternate; }

  .progress-bar-fill { transition:width 1.2s cubic-bezier(0.22,1,0.36,1); }

  .btn-primary {
    background:linear-gradient(135deg,#D4AF37,#C9962C);
    color:#0F1115;font-family:'Cinzel',serif;font-weight:600;
    border:none;border-radius:12px;padding:14px 32px;
    cursor:pointer;letter-spacing:0.08em;
    transition:all 0.25s cubic-bezier(0.22,1,0.36,1);
    box-shadow:0 4px 24px rgba(212,175,55,0.25);
  }
  .btn-primary:hover { transform:translateY(-2px);box-shadow:0 8px 40px rgba(212,175,55,0.4); }
  .btn-primary:active { transform:translateY(0); }

  .btn-ghost {
    background:transparent;color:#F6F4EC;font-family:'Cinzel',serif;font-weight:600;
    border:1px solid rgba(246,244,236,0.2);border-radius:12px;padding:14px 32px;
    cursor:pointer;letter-spacing:0.08em;
    transition:all 0.25s cubic-bezier(0.22,1,0.36,1);
  }
  .btn-ghost:hover { border-color:rgba(212,175,55,0.5);color:#D4AF37;background:rgba(212,175,55,0.05); }

  .btn-teal {
    background:linear-gradient(135deg,#57D6D1,#3ABAB5);
    color:#0F1115;font-family:'Inter',sans-serif;font-weight:600;
    border:none;border-radius:10px;padding:10px 22px;
    cursor:pointer;letter-spacing:0.04em;
    transition:all 0.2s ease;
    box-shadow:0 4px 20px rgba(87,214,209,0.25);
  }
  .btn-teal:hover { transform:translateY(-2px);box-shadow:0 6px 32px rgba(87,214,209,0.4); }

  .input-field {
    background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);
    border-radius:12px;padding:14px 18px;color:#F6F4EC;font-family:'Inter',sans-serif;
    width:100%;outline:none;transition:border-color 0.2s ease;
  }
  .input-field:focus { border-color:rgba(212,175,55,0.4);box-shadow:0 0 0 3px rgba(212,175,55,0.08); }
  .input-field::placeholder { color:#B7BAC3; }

  .badge-gold { background:rgba(212,175,55,0.12);color:#D4AF37;border:1px solid rgba(212,175,55,0.25);border-radius:6px;padding:3px 10px;font-size:11px;font-family:'Cinzel',serif;letter-spacing:0.1em; }
  .badge-teal { background:rgba(87,214,209,0.1);color:#57D6D1;border:1px solid rgba(87,214,209,0.2);border-radius:6px;padding:3px 10px;font-size:11px;font-family:'Inter',sans-serif; }
  .badge-green { background:rgba(111,207,151,0.1);color:#6FCF97;border:1px solid rgba(111,207,151,0.2);border-radius:6px;padding:3px 10px;font-size:11px; }

  .tab-active { border-bottom:2px solid #D4AF37;color:#D4AF37; }
  .tab-inactive { border-bottom:2px solid transparent;color:#B7BAC3; }
  .tab-inactive:hover { color:#F6F4EC;border-bottom-color:rgba(212,175,55,0.3); }

  .quest-card { transition:all 0.3s cubic-bezier(0.22,1,0.36,1); }
  .quest-card:hover { transform:translateX(4px); }

  .tooltip { position:relative; }
  .tooltip:hover::after { content:attr(data-tip);position:absolute;bottom:calc(100% + 8px);left:50%;transform:translateX(-50%);background:#22262F;color:#F6F4EC;padding:6px 12px;border-radius:8px;font-size:12px;white-space:nowrap;border:1px solid rgba(255,255,255,0.08);pointer-events:none;z-index:100; }

  .certificate-frame { box-shadow:0 0 60px rgba(212,175,55,0.15),inset 0 0 80px rgba(212,175,55,0.04);border:1px solid rgba(212,175,55,0.25); }

  .map-territory { filter:url(#parchment-filter); }

  .notification-dot { width:8px;height:8px;background:#57D6D1;border-radius:50%;position:absolute;top:-2px;right:-2px;border:2px solid #0F1115; }

  /* FIX: конфетти не анимировалось — класс существовал в JSX, но не был описан в CSS */
  .confetti-piece { animation: confetti-fall linear forwards; }
`;

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
      color: "#D4AF37",
    },
    diplomat: {
      name: t("chars.diplomat.name"),
      shortName: t("chars.diplomat.shortName"),
      title: t("chars.diplomat.title"),
      description: t("chars.diplomat.description"),
      icon: ScrollText,
      traits: t("chars.diplomat.traits", { returnObjects: true }) as string[],
      color: "#57D6D1",
    },
    explorer: {
      name: t("chars.explorer.name"),
      shortName: t("chars.explorer.shortName"),
      title: t("chars.explorer.title"),
      description: t("chars.explorer.description"),
      icon: Compass,
      traits: t("chars.explorer.traits", { returnObjects: true }) as string[],
      color: "#6FCF97",
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
            background: `rgba(212,175,55,${p.opacity})`,
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
    legendary: ["#D4AF37", t("common.rarity.legendary")],
    rare: ["#57D6D1", t("common.rarity.rare")],
    common: ["#B7BAC3", t("common.rarity.common")],
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
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#D4AF37" strokeWidth={stroke}
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
      style={compact ? {} : { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)", padding: "3px" }}>
      {SUPPORTED_LANGUAGES.map((lng) => (
        <button key={lng} onClick={() => changeLanguage(lng)}
          className="px-2 py-1 rounded-full text-[10px] font-semibold orda-cinzel tracking-wider transition-colors"
          style={{
            background: active === lng ? "rgba(212,175,55,0.15)" : "transparent",
            color: active === lng ? "#D4AF37" : "#B7BAC3",
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
  const { user } = useAuthSession();

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", h);
    return () => window.removeEventListener("scroll", h);
  }, []);

  const inApp = ["dashboard", "city", "ai", "artifacts", "quests", "certificate", "passport"].includes(view);

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
    [t("nav.journey"), "dashboard"], [t("nav.map"), "dashboard"], [t("nav.artifacts"), "artifacts"], [t("nav.aiHistorian"), "ai"],
  ];
  const sectionLinks: [string, string][] = [
    [t("nav.journey"), "journey-section"], [t("nav.map"), "map-section"], [t("nav.artifacts"), "artifacts-section"],
    [t("nav.aiHistorian"), "ai-historian-section"], [t("nav.about"), "about-section"],
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 transition-all duration-500"
      style={{ background: scrolled || inApp ? "rgba(15,17,21,0.92)" : "transparent", backdropFilter: scrolled || inApp ? "blur(20px)" : "none", borderBottom: scrolled || inApp ? "1px solid rgba(255,255,255,0.06)" : "none" }}>
      <div className="max-w-[1440px] mx-auto px-6 lg:px-12 h-16 flex items-center justify-between">
        <button onClick={scrollToTop} className="nav-link flex items-center gap-3 group">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg,#D4AF37,#C9962C)" }}>
            <span className="text-[#0F1115] font-bold text-sm orda-cinzel">O</span>
          </div>
          <span className="text-lg font-bold orda-cinzel tracking-[0.2em] text-[#D4AF37]">ORDA</span>
        </button>

        <div className="hidden md:flex items-center gap-8">
          {inApp && navLinks.map(([label, target]) => (
            <button key={label} onClick={() => onNav(target)}
              className="nav-link text-sm orda-cinzel tracking-widest transition-colors duration-200"
              style={{ color: view === target ? "#D4AF37" : "#B7BAC3" }}
              onMouseEnter={e => { if (view !== target) (e.target as HTMLElement).style.color = "#F6F4EC"; }}
              onMouseLeave={e => { if (view !== target) (e.target as HTMLElement).style.color = "#B7BAC3"; }}>
              {label}
            </button>
          ))}
          {!inApp && sectionLinks.map(([label, id]) => (
            <button key={id} onClick={() => goToSection(id)}
              className="nav-link relative text-sm orda-cinzel tracking-widest transition-colors duration-200 pb-1"
              style={{ color: activeSection === id ? "#D4AF37" : "#B7BAC3" }}
              onMouseEnter={e => { if (activeSection !== id) (e.target as HTMLElement).style.color = "#F6F4EC"; }}
              onMouseLeave={e => { if (activeSection !== id) (e.target as HTMLElement).style.color = "#B7BAC3"; }}>
              {label}
              <span className="absolute left-0 right-0 -bottom-0.5 h-px rounded-full transition-all duration-300"
                style={{ background: activeSection === id ? "#D4AF37" : "transparent", boxShadow: activeSection === id ? "0 0 8px rgba(212,175,55,0.6)" : "none" }} />
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          {inApp && (
            <>
              <button className="w-9 h-9 rounded-full flex items-center justify-center transition-colors"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <Search size={15} color="#B7BAC3" />
              </button>
              <button className="relative w-9 h-9 rounded-full flex items-center justify-center"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <Bell size={15} color="#B7BAC3" />
                <span className="notification-dot" />
              </button>
            </>
          )}
          {inApp ? (
            <button
              onClick={() => onNav("passport")}
              title={user ? `${user.username} · ${t("nav.passport")}` : t("nav.passport")}
              className="nav-link w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold orda-cinzel overflow-hidden"
              style={{ background: "linear-gradient(135deg,#D4AF37,#C9962C)", color: "#0F1115" }}>
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
            <Menu size={20} color="#F6F4EC" />
          </button>
        </div>
      </div>
      {menuOpen && (
        <div className="md:hidden glass-dark border-t border-white/5 px-6 py-4 flex flex-col gap-4">
          {inApp
            ? navLinks.map(([label, target]) => (
              <button key={label} className="nav-link text-sm orda-cinzel tracking-widest text-left"
                style={{ color: view === target ? "#D4AF37" : "#B7BAC3" }}
                onClick={() => { onNav(target); setMenuOpen(false); }}>
                {label}
              </button>
            ))
            : sectionLinks.map(([label, id]) => (
              <button key={id} className="nav-link text-sm orda-cinzel tracking-widest text-left"
                style={{ color: activeSection === id ? "#D4AF37" : "#B7BAC3" }}
                onClick={() => goToSection(id)}>
                {label}
              </button>
            ))}
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
        background: "linear-gradient(180deg, #080A0F 0%, #0D1018 18%, #141820 35%, #1A1C14 55%, #2A2210 70%, #1A1408 82%, #0F1115 100%)"
      }} />

      {/* Stars */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 80 }, (_, i) => (
          <div key={i} className="absolute rounded-full"
            style={{
              left: `${Math.random() * 100}%`, top: `${Math.random() * 55}%`,
              width: Math.random() * 2 + 0.5, height: Math.random() * 2 + 0.5,
              background: "rgba(246,244,236,0.6)",
              animation: `star-twinkle ${Math.random() * 4 + 2}s ease-in-out ${Math.random() * 5}s infinite`,
            }}
          />
        ))}
      </div>

      {/* Horizon glow — golden sunset */}
      <div className="absolute bottom-0 left-0 right-0 h-[40%]" style={{
        background: "linear-gradient(0deg, rgba(212,175,55,0.08) 0%, rgba(180,100,20,0.05) 40%, transparent 100%)"
      }} />

      {/* Mountain silhouettes */}
      <svg className="absolute bottom-[14%] left-0 right-0 w-full" viewBox="0 0 1440 220" preserveAspectRatio="none">
        <path d="M0,220 L0,160 L80,90 L160,130 L260,50 L380,110 L480,60 L560,100 L660,30 L760,95 L860,55 L960,120 L1060,70 L1180,110 L1280,60 L1380,100 L1440,80 L1440,220 Z"
          fill="rgba(8,10,16,0.95)" />
        <path d="M0,220 L0,175 L100,130 L200,155 L320,105 L440,145 L560,120 L680,155 L800,115 L920,148 L1040,125 L1160,150 L1280,130 L1440,155 L1440,220 Z"
          fill="rgba(10,12,18,0.98)" />
      </svg>

      {/* Steppe ground */}
      <div className="absolute bottom-0 left-0 right-0 h-[14%]" style={{
        background: "linear-gradient(180deg,rgba(20,18,12,0.0) 0%,rgba(15,17,21,1) 100%)"
      }} />

      {/* Horse riders silhouette */}
      <svg className="absolute bottom-[13.5%] right-[8%] opacity-30" viewBox="0 0 300 80" width="220">
        {/* Rider 1 */}
        <ellipse cx="40" cy="55" rx="22" ry="10" fill="#1A1408" />
        <rect x="32" y="28" width="16" height="24" rx="3" fill="#1A1408" />
        <circle cx="40" cy="22" r="8" fill="#1A1408" />
        <line x1="56" y1="42" x2="72" y2="50" stroke="#1A1408" strokeWidth="3" />
        {/* Rider 2 */}
        <ellipse cx="110" cy="58" rx="18" ry="8" fill="#1A1408" />
        <rect x="103" y="34" width="14" height="20" rx="3" fill="#1A1408" />
        <circle cx="110" cy="28" r="7" fill="#1A1408" />
        {/* Rider 3 */}
        <ellipse cx="180" cy="56" rx="20" ry="9" fill="#1A1408" />
        <rect x="172" y="31" width="15" height="22" rx="3" fill="#1A1408" />
        <circle cx="180" cy="25" r="7.5" fill="#1A1408" />
        <line x1="194" y1="38" x2="210" y2="44" stroke="#1A1408" strokeWidth="2.5" />
      </svg>

      {/* Clouds */}
      <div className="cloud-a absolute top-[8%] left-[5%] pointer-events-none">
        <div className="w-64 h-16 rounded-full" style={{ background: "radial-gradient(ellipse,rgba(246,244,236,0.04) 0%,transparent 70%)", filter: "blur(20px)" }} />
      </div>
      <div className="cloud-b absolute top-[12%] right-[10%] pointer-events-none">
        <div className="w-96 h-20 rounded-full" style={{ background: "radial-gradient(ellipse,rgba(246,244,236,0.03) 0%,transparent 70%)", filter: "blur(24px)" }} />
      </div>

      <DustParticles />

      {/* Center content */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 pt-24 pb-40 text-center">
        {/* Logo emblem */}
        <div className={`mb-8 transition-all duration-1000 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl flex items-center justify-center relative"
            style={{ background: "linear-gradient(135deg,rgba(212,175,55,0.12),rgba(201,150,44,0.06))", border: "1px solid rgba(212,175,55,0.25)" }}>
            <div className="animate-pulse-gold absolute inset-0 rounded-2xl" />
            <span className="orda-cinzel text-3xl font-bold text-[#D4AF37] gold-glow-text relative z-10">✦</span>
          </div>

          <div className="shimmer-text text-7xl md:text-9xl font-black orda-cinzel tracking-[0.3em] leading-none mb-2">
            ORDA
          </div>
          <div className="text-[#B7BAC3] text-xs md:text-sm tracking-[0.35em] orda-cinzel uppercase mb-10">
            {t("hero.tagline")}
          </div>
        </div>

        {/* Divider */}
        <div className={`flex items-center gap-4 mb-10 w-full max-w-sm transition-all duration-1000 delay-200 ${mounted ? "opacity-100" : "opacity-0"}`}>
          <div className="flex-1 h-px" style={{ background: "linear-gradient(90deg,transparent,rgba(212,175,55,0.3))" }} />
          <span className="text-[#D4AF37] text-base">⬦</span>
          <div className="flex-1 h-px" style={{ background: "linear-gradient(90deg,rgba(212,175,55,0.3),transparent)" }} />
        </div>

        {/* Description */}
        <p className={`text-[#B7BAC3] text-base md:text-lg max-w-lg leading-relaxed orda-inter mb-12 transition-all duration-1000 delay-300 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
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
          <ChevronDown size={22} color="#D4AF37" className="animate-scroll" />
        </button>
      </div>

      {/* Features strip */}
      <div className="absolute bottom-0 left-0 right-0 h-16 flex items-center justify-center gap-12 border-t"
        style={{ borderColor: "rgba(255,255,255,0.04)", background: "rgba(15,17,21,0.7)", backdropFilter: "blur(20px)" }}>
        {[[t("hero.features.cities"), MapPin], [t("hero.features.quests"), Zap], [t("hero.features.aiHistorian"), MessageSquare], [t("hero.features.artifacts"), Package]].map(([label, Icon]) => (
          <div key={label as string} className="flex items-center gap-2 text-[#B7BAC3] text-sm orda-inter">
            <Icon size={14} color="#D4AF37" />
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
      <div className="text-4xl md:text-5xl font-black orda-cinzel text-[#D4AF37]">{count}+</div>
      <div className="text-xs md:text-sm orda-inter text-[#B7BAC3] mt-2 tracking-wide">{label}</div>
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
    <section id="journey-section" ref={parallax.ref} className="relative py-28 md:py-36 overflow-hidden scroll-mt-24" style={{ background: "linear-gradient(180deg, #0F1115 0%, #12141B 100%)" }}>
      <motion.div style={{ y: parallax.y }} className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 50% 30%, rgba(212,175,55,0.05) 0%, transparent 60%)" }} />
      </motion.div>
      <DustParticles />
      <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
        <ScrollReveal>
          <div className="badge-gold mb-6 inline-block">{t("journey.badge")}</div>
          <h2 className="orda-cinzel text-3xl md:text-5xl font-bold text-[#F6F4EC] mb-6 leading-tight">
            {t("journey.title1")}<br />{t("journey.title2")}
          </h2>
          <p className="orda-cormorant text-xl md:text-2xl italic text-[#B7BAC3] max-w-2xl mx-auto leading-relaxed">
            {t("journey.description")}
          </p>
        </ScrollReveal>
        <ScrollReveal delay={0.15} className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-16">
          {pillars.map((item) => (
            <div key={item.title} className="rounded-[20px] p-7 card-hover gold-hover" style={{ background: "rgba(34,38,47,0.5)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 mx-auto" style={{ background: "rgba(212,175,55,0.1)", border: "1px solid rgba(212,175,55,0.2)" }}>
                <item.icon size={20} color="#D4AF37" />
              </div>
              <h3 className="orda-cinzel text-base font-semibold text-[#F6F4EC] mb-2">{item.title}</h3>
              <p className="orda-inter text-sm text-[#B7BAC3] leading-relaxed">{item.text}</p>
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
    <section className="relative py-28 md:py-36" style={{ background: "#0D0F15" }}>
      <div className="max-w-3xl mx-auto px-6">
        <ScrollReveal className="text-center mb-16">
          <div className="badge-gold mb-4 inline-block">{t("timeline.badge")}</div>
          <h2 className="orda-cinzel text-3xl md:text-4xl font-bold text-[#F6F4EC]">{t("timeline.title")}</h2>
        </ScrollReveal>
        <div className="relative">
          <div className="absolute left-[84px] top-0 bottom-0 w-px hidden sm:block"
            style={{ background: "linear-gradient(180deg, transparent, rgba(212,175,55,0.3) 8%, rgba(212,175,55,0.3) 92%, transparent)" }} />
          <div className="space-y-8">
            {events.map((item, i) => (
              <ScrollReveal key={item.year} delay={i * 0.05}>
                <div className="flex items-start gap-6">
                  <div className="w-20 flex-shrink-0 text-right pt-4 hidden sm:block">
                    <span className="orda-cinzel text-sm font-semibold text-[#D4AF37]">{item.year}</span>
                  </div>
                  <div className="relative flex-shrink-0 hidden sm:block pt-5">
                    <div className="w-3 h-3 rounded-full border-2 border-[#D4AF37]" style={{ background: "#0D0F15", boxShadow: "0 0 10px rgba(212,175,55,0.4)" }} />
                  </div>
                  <div className="flex-1 rounded-[16px] p-5" style={{ background: "rgba(34,38,47,0.4)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <div className="sm:hidden orda-cinzel text-sm font-semibold text-[#D4AF37] mb-1">{item.year}</div>
                    <p className="orda-inter text-sm text-[#B7BAC3] leading-relaxed">{item.text}</p>
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
    <section id="map-section" ref={parallax.ref} className="relative py-28 md:py-36 overflow-hidden scroll-mt-24" style={{ background: "linear-gradient(180deg, #0D0F15 0%, #12141B 100%)" }}>
      <motion.div style={{ y: parallax.y }} className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 50% 60%, rgba(212,175,55,0.04) 0%, transparent 65%)" }} />
      </motion.div>
      <div className="relative z-10 max-w-5xl mx-auto px-6">
        <ScrollReveal className="text-center mb-12">
          <div className="badge-gold mb-4 inline-block">{t("mapPreview.badge")}</div>
          <h2 className="orda-cinzel text-3xl md:text-4xl font-bold text-[#F6F4EC] mb-4">{t("mapPreview.title")}</h2>
          <p className="orda-inter text-[#B7BAC3] max-w-xl mx-auto">
            {t("mapPreview.description")}
          </p>
        </ScrollReveal>
        <ScrollReveal delay={0.15}>
          <div className="rounded-[24px] p-3 md:p-5" style={{ background: "rgba(23,26,32,0.6)", border: "1px solid rgba(212,175,55,0.12)" }}>
            <div className="h-[380px] md:h-[460px]">
              {isLoading ? (
                <div className="w-full h-full rounded-[16px]" style={{ background: "rgba(255,255,255,0.03)" }} />
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
    <section className="relative py-28 md:py-36" style={{ background: "#12141B" }}>
      <div className="max-w-6xl mx-auto px-6">
        <ScrollReveal className="text-center mb-14">
          <div className="badge-gold mb-4 inline-block">{t("citiesPreview.badge")}</div>
          <h2 className="orda-cinzel text-3xl md:text-4xl font-bold text-[#F6F4EC]">{t("citiesPreview.title")}</h2>
        </ScrollReveal>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((city, i) => (
            <ScrollReveal key={city?.id ?? `city-skeleton-${i}`} delay={i * 0.06}>
              {!city ? (
                <div className="rounded-[20px] h-40" style={{ background: "rgba(34,38,47,0.4)", border: "1px solid rgba(255,255,255,0.06)" }} />
              ) : (
                <div onClick={onExplore} className="rounded-[20px] p-6 cursor-pointer card-hover gold-hover h-40 flex flex-col justify-between"
                  style={{ background: "rgba(34,38,47,0.5)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div>
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-3" style={{ background: "rgba(212,175,55,0.1)", border: `1px solid ${city.color}40` }}>
                      <MapPin size={15} color={city.color} />
                    </div>
                    <h3 className="orda-cinzel text-base font-semibold text-[#F6F4EC]">{city.name}</h3>
                    <p className="orda-inter text-xs text-[#B7BAC3] mt-1">{city.subtitle}</p>
                  </div>
                  <span className="text-[10px] orda-cinzel tracking-widest text-[#D4AF37]">{city.founded}</span>
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
    <section id="ai-historian-section" className="relative py-28 md:py-36 overflow-hidden scroll-mt-24" style={{ background: "linear-gradient(180deg, #12141B 0%, #0F1115 100%)" }}>
      <div className="max-w-4xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        <ScrollReveal>
          <div className="badge-teal mb-4 inline-block">{t("aiPreview.badge")}</div>
          <h2 className="orda-cinzel text-3xl md:text-4xl font-bold text-[#F6F4EC] mb-5">{t("aiPreview.title")}</h2>
          <p className="orda-inter text-[#B7BAC3] leading-relaxed mb-6">
            {t("aiPreview.description")}
          </p>
          <button onClick={onExplore} className="btn-teal flex items-center gap-2">
            <MessageSquare size={16} /> {t("aiPreview.cta")}
          </button>
        </ScrollReveal>
        <ScrollReveal delay={0.15}>
          <div className="rounded-[20px] p-6 space-y-4" style={{ background: "rgba(23,26,32,0.8)", border: "1px solid rgba(87,214,209,0.15)" }}>
            <div className="flex justify-end">
              <div className="max-w-[80%] rounded-[16px] rounded-tr-[4px] px-4 py-3"
                style={{ background: "linear-gradient(135deg, rgba(212,175,55,0.15), rgba(212,175,55,0.08))", border: "1px solid rgba(212,175,55,0.2)" }}>
                <p className="orda-inter text-sm text-[#F6F4EC]">{t("aiPreview.sampleQuestion")}</p>
              </div>
            </div>
            <div className="flex justify-start gap-3">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: "rgba(87,214,209,0.12)", border: "1px solid rgba(87,214,209,0.2)" }}>
                <span className="text-sm">⚜</span>
              </div>
              <div className="max-w-[85%] rounded-[16px] rounded-tl-[4px] px-4 py-3" style={{ background: "rgba(34,38,47,0.7)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <p className="orda-inter text-sm text-[#F6F4EC] leading-relaxed">
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
    <section id="artifacts-section" className="relative py-28 md:py-36 scroll-mt-24" style={{ background: "#0F1115" }}>
      <div className="max-w-6xl mx-auto px-6">
        <ScrollReveal className="text-center mb-14">
          <div className="badge-gold mb-4 inline-block">{t("artifactsPreview.badge")}</div>
          <h2 className="orda-cinzel text-3xl md:text-4xl font-bold text-[#F6F4EC]">{t("artifactsPreview.title")}</h2>
        </ScrollReveal>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
          {items.map((artifact, i) => (
            <ScrollReveal key={artifact?.id ?? `artifact-skeleton-${i}`} delay={i * 0.06}>
              {!artifact ? (
                <div className="rounded-[20px] aspect-square" style={{ background: "rgba(34,38,47,0.5)" }} />
              ) : (
                <div onClick={onExplore} className="rounded-[20px] p-5 cursor-pointer card-hover gold-hover aspect-square flex flex-col items-center justify-center text-center"
                  style={{ background: "rgba(34,38,47,0.6)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <span className="text-4xl mb-3">{rarityIcons[artifact.rarity?.toLowerCase()] || "🪶"}</span>
                  <h3 className="orda-cinzel text-xs font-semibold text-[#F6F4EC]">{artifact.name}</h3>
                  <span className="text-[10px] orda-inter text-[#B7BAC3] mt-1">{artifact.era}</span>
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
    <section className="relative py-28 md:py-36" style={{ background: "linear-gradient(180deg, #0F1115 0%, #12141B 100%)" }}>
      <div className="max-w-5xl mx-auto px-6">
        <ScrollReveal className="text-center mb-14">
          <div className="badge-gold mb-4 inline-block">{t("adventure.badge")}</div>
          <h2 className="orda-cinzel text-3xl md:text-4xl font-bold text-[#F6F4EC] mb-4">{t("adventure.title")}</h2>
          <p className="orda-inter text-[#B7BAC3] max-w-xl mx-auto">
            {t("adventure.description")}
          </p>
        </ScrollReveal>
        <ScrollReveal delay={0.15} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {items.map((item) => (
            <div key={item.title} className="rounded-[20px] p-6 text-center card-hover gold-hover" style={{ background: "rgba(34,38,47,0.5)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4 mx-auto" style={{ background: "rgba(212,175,55,0.1)", border: "1px solid rgba(212,175,55,0.2)" }}>
                <item.icon size={18} color="#D4AF37" />
              </div>
              <h3 className="orda-cinzel text-sm font-semibold text-[#F6F4EC] mb-2">{item.title}</h3>
              <p className="orda-inter text-xs text-[#B7BAC3] leading-relaxed">{item.text}</p>
            </div>
          ))}
        </ScrollReveal>
      </div>
    </section>
  );
}

function StatisticsSection() {
  const { t } = useTranslation();
  const { data: citiesData } = useCities();
  const { data: artifactsData } = useArtifacts();
  const { data: questsData } = useQuests();
  const citiesTotal = citiesData?.meta.total ?? 0;
  const artifactsTotal = artifactsData?.meta.total ?? 0;
  const questsTotal = questsData?.meta.total ?? 0;

  return (
    <section className="relative py-24 md:py-32"
      style={{ background: "#0D0F15", borderTop: "1px solid rgba(255,255,255,0.04)", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
      <div className="max-w-5xl mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <StatCounter value={citiesTotal} label={t("stats.cities")} />
          <StatCounter value={artifactsTotal} label={t("stats.artifacts")} />
          <StatCounter value={questsTotal} label={t("stats.quests")} />
          <StatCounter value={820} label={t("stats.years")} />
        </div>
      </div>
    </section>
  );
}

function FinalCTASection({ onStart }: { onStart: () => void }) {
  const { t } = useTranslation();
  return (
    <section className="relative py-32 md:py-40 overflow-hidden text-center" style={{ background: "radial-gradient(ellipse at 50% 40%, rgba(212,175,55,0.08) 0%, #0F1115 65%)" }}>
      <DustParticles />
      <div className="relative z-10 max-w-2xl mx-auto px-6">
        <ScrollReveal>
          <span className="orda-cinzel text-2xl text-[#D4AF37] block mb-4">⬦</span>
          <h2 className="orda-cinzel text-3xl md:text-5xl font-bold text-[#F6F4EC] mb-6">{t("finalCta.title")}</h2>
          <p className="orda-inter text-[#B7BAC3] text-base md:text-lg mb-10 leading-relaxed">
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

function LandingFooter() {
  const { t } = useTranslation();
  const links = [t("footer.links.journey"), t("footer.links.cities"), t("footer.links.aiHistorian"), t("footer.links.artifacts")];
  return (
    <footer id="about-section" className="relative py-12 border-t scroll-mt-24" style={{ background: "#0A0C10", borderColor: "rgba(255,255,255,0.05)" }}>
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-8">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg,#D4AF37,#C9962C)" }}>
              <span className="text-[#0F1115] font-bold text-sm orda-cinzel">O</span>
            </div>
            <span className="text-base font-bold orda-cinzel tracking-[0.2em] text-[#D4AF37]">ORDA</span>
          </div>
          <div className="flex items-center gap-8">
            {links.map((label) => (
              <span key={label} className="text-xs orda-inter text-[#B7BAC3] hover:text-[#F6F4EC] transition-colors cursor-default">{label}</span>
            ))}
          </div>
        </div>
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-6 border-t" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
          <p className="text-[11px] orda-inter text-[#B7BAC3]">{t("footer.copyright", { year: new Date().getFullYear() })}</p>
          <p className="text-[11px] orda-inter text-[#B7BAC3]">{t("footer.subtitle")}</p>
        </div>
      </div>
    </footer>
  );
}

function LandingStory({ onStart }: { onStart: () => void }) {
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
      <LandingFooter />
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
      <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at center top, rgba(212,175,55,0.04) 0%, transparent 60%)" }} />

      <div className="animate-fade-in text-center mb-16">
        <div className="badge-gold mb-6 inline-block">{t("chars.badge")}</div>
        <h1 className="orda-cinzel text-4xl md:text-5xl font-bold text-[#F6F4EC] mb-4">{t("chars.title")}</h1>
        <p className="orda-inter text-[#B7BAC3] text-base max-w-md mx-auto leading-relaxed">
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
                background: isHovered ? `rgba(34,38,47,0.9)` : "rgba(34,38,47,0.6)",
                border: isHovered ? `1px solid ${char.color}50` : "1px solid rgba(255,255,255,0.06)",
                boxShadow: isHovered ? `0 0 40px ${char.color}20, 0 20px 60px rgba(0,0,0,0.5)` : "0 8px 40px rgba(0,0,0,0.3)",
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
                  boxShadow: isHovered ? `0 0 30px ${char.color}30` : "none",
                }}>
                <Icon size={32} color={char.color} />
              </div>

              <span className="badge-gold mb-3 text-[10px]">{char.title}</span>
              <h3 className="orda-cinzel text-xl font-bold text-[#F6F4EC] mb-3">{char.name}</h3>
              <p className="orda-inter text-sm text-[#B7BAC3] leading-relaxed mb-6">{char.description}</p>

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
                  background: isHovered ? `linear-gradient(135deg, ${char.color}, ${char.color}cc)` : "rgba(255,255,255,0.04)",
                  color: isHovered ? "#0F1115" : char.color,
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
      style={{ background: "radial-gradient(ellipse at center, #171A20 0%, #0F1115 100%)" }}>

      {/* Parchment texture overlay */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03] animate-grain"
        style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")" }} />

      {/* Glowing orb */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full pointer-events-none"
        style={{ background: "radial-gradient(ellipse, rgba(212,175,55,0.06) 0%, transparent 70%)", filter: "blur(40px)" }} />

      <div className="relative z-10 max-w-2xl w-full px-8 text-center">
        {/* AI Emblem */}
        <div className={`transition-all duration-1000 ${phase >= 1 ? "opacity-100 scale-100" : "opacity-0 scale-90"}`}>
          <div className="w-24 h-24 mx-auto mb-8 rounded-full flex items-center justify-center animate-float"
            style={{ background: "linear-gradient(135deg,rgba(212,175,55,0.15),rgba(212,175,55,0.05))", border: "1px solid rgba(212,175,55,0.3)", boxShadow: "0 0 60px rgba(212,175,55,0.15)" }}>
            <span className="text-3xl">⚜</span>
          </div>
        </div>

        {/* Parchment card */}
        <div className={`transition-all duration-1000 delay-300 ${phase >= 2 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
          <div className="rounded-[20px] p-10 mb-8 relative"
            style={{ background: "rgba(23,26,32,0.8)", border: "1px solid rgba(212,175,55,0.15)", boxShadow: "0 0 80px rgba(212,175,55,0.08), inset 0 0 40px rgba(212,175,55,0.02)" }}>

            <div className="text-[#D4AF37] text-xs tracking-[0.3em] orda-cinzel mb-6">{t("intro.oracleSpeaks")}</div>

            <blockquote className="orda-cormorant text-2xl md:text-3xl text-[#F6F4EC] leading-relaxed italic font-light mb-6">
              "{t("intro.quote")}"
            </blockquote>

            <div className="flex items-center justify-center gap-3 text-sm text-[#B7BAC3] orda-inter">
              <span className="w-8 h-px bg-[#D4AF37]/30" />
              <span>{t("intro.youArePrefix")} <span className="text-[#D4AF37]">{char.name}</span>{t("intro.youAreSuffix")}</span>
              <span className="w-8 h-px bg-[#D4AF37]/30" />
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className={`transition-all duration-1000 delay-700 ${phase >= 3 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
          <button onClick={onBegin} className="btn-primary text-base px-14 py-4 flex items-center gap-3 mx-auto">
            <span>{t("intro.begin")}</span>
            <ChevronRight size={18} />
          </button>
          <p className="text-[#B7BAC3] text-xs mt-4 orda-inter tracking-wide">
            {t("intro.footer")}
          </p>
        </div>
      </div>

      <DustParticles />
    </div>
  );
}

// ─── INTERACTIVE MAP ──────────────────────────────────────────────────────────
function InteractiveMap({ cities, onSelectCity }: { cities: City[]; onSelectCity: (city: City) => void }) {
  const { t } = useTranslation();
  const [hovered, setHovered] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);

  return (
    <div className="relative w-full h-full rounded-[16px] overflow-hidden"
      style={{ background: "#0E1018", border: "1px solid rgba(255,255,255,0.06)" }}>

      {/* Parchment noise */}
      <div className="absolute inset-0 opacity-[0.04] pointer-events-none animate-grain"
        style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.7'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")" }} />

      {/* Ambient glow */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse at 45% 50%, rgba(212,175,55,0.04) 0%, transparent 65%)" }} />

      <svg className="w-full h-full animate-map-reveal" viewBox="0 0 900 480" preserveAspectRatio="xMidYMid meet">
        <defs>
          <filter id="city-glow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="territory-glow">
            <feGaussianBlur stdDeviation="8" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <radialGradient id="territory-fill" cx="45%" cy="50%" r="55%">
            <stop offset="0%" stopColor="#D4AF37" stopOpacity="0.06" />
            <stop offset="100%" stopColor="#D4AF37" stopOpacity="0.01" />
          </radialGradient>
          <linearGradient id="route-grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#D4AF37" stopOpacity="0.2" />
            <stop offset="50%" stopColor="#D4AF37" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#D4AF37" stopOpacity="0.2" />
          </linearGradient>
        </defs>

        {/* Territory outline */}
        <path
          d="M 75,328 C 65,268 75,218 132,188 L 202,152 L 304,112 L 422,82 C 490,75 542,88 582,108 L 672,148 L 772,238 L 820,332 L 800,422 L 742,458 L 648,468 L 555,462 L 458,452 L 358,440 L 258,418 L 172,388 L 92,350 Z"
          fill="url(#territory-fill)"
          stroke="rgba(212,175,55,0.18)"
          strokeWidth="1.5"
          filter="url(#territory-glow)"
        />

        {/* Grid lines (latitude/longitude feel) */}
        {[150, 250, 350, 450].map(y => (
          <line key={y} x1="60" y1={y} x2="840" y2={y}
            stroke="rgba(255,255,255,0.025)" strokeWidth="1" strokeDasharray="4 8" />
        ))}
        {[180, 300, 420, 540, 660, 780].map(x => (
          <line key={x} x1={x} y1="60" x2={x} y2="480"
            stroke="rgba(255,255,255,0.025)" strokeWidth="1" strokeDasharray="4 8" />
        ))}

        {/* Volga River */}
        <path d="M 408,40 C 400,100 388,180 372,295 C 362,370 358,430 355,480"
          stroke="rgba(87,214,209,0.2)" strokeWidth="2" fill="none" />

        {/* Ural River */}
        <path d="M 498,30 C 492,120 488,210 488,295 L 488,480"
          stroke="rgba(87,214,209,0.15)" strokeWidth="1.5" fill="none" />

        {/* Syr Darya */}
        <path d="M 820,420 C 780,428 730,432 680,432 C 640,432 580,438 540,460"
          stroke="rgba(87,214,209,0.15)" strokeWidth="1.5" fill="none" />

        {/* Trade Routes */}
        <path d="M 92,335 C 150,318 270,310 370,295"
          className="route-path" stroke="url(#route-grad)" strokeWidth="1.5" fill="none" />
        <path d="M 370,295 L 490,295"
          className="route-path-rev" stroke="url(#route-grad)" strokeWidth="1.5" fill="none" />
        <path d="M 490,295 C 530,348 572,398 630,420"
          className="route-path" stroke="url(#route-grad)" strokeWidth="1.5" fill="none" />
        <path d="M 630,420 L 730,420"
          className="route-path-rev" stroke="url(#route-grad)" strokeWidth="1.5" fill="none" />
        <path d="M 370,295 L 418,108"
          className="route-path" stroke="url(#route-grad)" strokeWidth="1.5" fill="none" />

        {/* City markers */}
        {cities.map((city) => {
          const isHov = hovered === city.id;
          return (
            <g key={city.id} className="city-marker"
              onClick={() => onSelectCity(city)}
              onMouseEnter={() => setHovered(city.id)}
              onMouseLeave={() => setHovered(null)}>

              {/* Pulse ring */}
              {isHov && (
                <circle cx={city.cx} cy={city.cy} r={city.size + 12}
                  fill="none" stroke={city.color} strokeWidth="1" opacity="0.4"
                  style={{ animation: "pulse-ring 1.5s ease-out infinite" }} />
              )}

              {/* Outer ring */}
              <circle cx={city.cx} cy={city.cy} r={city.size + 4}
                fill="none"
                stroke={city.color}
                strokeWidth={isHov ? 1.5 : 0.8}
                opacity={isHov ? 0.6 : 0.2}
                style={{ transition: "all 0.25s ease" }} />

              {/* Main dot */}
              <circle cx={city.cx} cy={city.cy} r={city.size}
                fill={city.color}
                opacity={isHov ? 1 : 0.7}
                filter={isHov ? "url(#city-glow)" : "none"}
                className="city-dot-pulse"
                style={{ transition: "all 0.25s ease", transform: isHov ? `scale(1.3)` : "scale(1)", transformOrigin: `${city.cx}px ${city.cy}px` }} />

              {/* Inner dot */}
              <circle cx={city.cx} cy={city.cy} r={city.size * 0.4}
                fill="rgba(15,17,21,0.8)" />

              {/* Label */}
              <text x={city.cx} y={city.cy + city.size + 18}
                textAnchor="middle" fill={isHov ? city.color : "#B7BAC3"}
                fontSize="10" fontFamily="Cinzel, serif" letterSpacing="1"
                style={{ transition: "fill 0.2s ease", fontWeight: city.id === "sarai-batu" ? "700" : "400" }}>
                {city.name.toUpperCase()}
              </text>
            </g>
          );
        })}

        {/* Compass rose */}
        <g transform="translate(820,60)">
          <circle cx="0" cy="0" r="22" fill="rgba(15,17,21,0.8)" stroke="rgba(212,175,55,0.2)" strokeWidth="1" />
          <text x="0" y="-8" textAnchor="middle" fill="#D4AF37" fontSize="8" fontFamily="Cinzel,serif">N</text>
          <text x="0" y="14" textAnchor="middle" fill="rgba(212,175,55,0.5)" fontSize="6" fontFamily="Cinzel,serif">S</text>
          <text x="12" y="3" textAnchor="middle" fill="rgba(212,175,55,0.5)" fontSize="6" fontFamily="Cinzel,serif">E</text>
          <text x="-12" y="3" textAnchor="middle" fill="rgba(212,175,55,0.5)" fontSize="6" fontFamily="Cinzel,serif">W</text>
          <path d="M 0,-18 L 3,-4 L 0,-8 L -3,-4 Z" fill="#D4AF37" />
          <path d="M 0,18 L 3,4 L 0,8 L -3,4 Z" fill="rgba(212,175,55,0.3)" />
        </g>

        {/* Scale bar */}
        <g transform="translate(60,448)">
          <line x1="0" y1="0" x2="80" y2="0" stroke="rgba(212,175,55,0.4)" strokeWidth="1" />
          <line x1="0" y1="-4" x2="0" y2="4" stroke="rgba(212,175,55,0.4)" strokeWidth="1" />
          <line x1="80" y1="-4" x2="80" y2="4" stroke="rgba(212,175,55,0.4)" strokeWidth="1" />
          <text x="40" y="14" textAnchor="middle" fill="rgba(212,175,55,0.5)" fontSize="8" fontFamily="Inter,sans-serif">{t("map.scale")}</text>
        </g>

        {/* Title overlay */}
        <text x="450" y="32" textAnchor="middle" fill="rgba(212,175,55,0.35)"
          fontSize="11" fontFamily="Cinzel,serif" letterSpacing="4">
          {t("map.titleOverlay")}
        </text>
      </svg>

      {/* Hover tooltip */}
      {hovered && (() => {
        const city = cities.find(c => c.id === hovered);
        if (!city) return null;
        return (
          <div className="absolute bottom-4 left-4 glass rounded-[14px] px-4 py-3 pointer-events-none animate-fade-in"
            style={{ maxWidth: 240 }}>
            <div className="text-[#D4AF37] text-xs orda-cinzel tracking-widest mb-1">{city.name}</div>
            <div className="text-[#B7BAC3] text-xs orda-inter">{city.subtitle}</div>
            <div className="text-[#B7BAC3] text-xs orda-inter mt-1">{t("map.clickToExplore")}</div>
          </div>
        );
      })()}
    </div>
  );
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
function Dashboard({ character, onSelectCity, onNav }: {
  character: CharType; onSelectCity: (c: City) => void; onNav: (v: View) => void;
}) {
  const { t } = useTranslation();
  const char = getCharacterData(t)[character];

  const { data: citiesData, isLoading: citiesLoading } = useCities();
  const { data: artifactsData, isLoading: artifactsLoading } = useArtifacts();
  const { data: questsData, isLoading: questsLoading } = useQuests();
  const { summaryQuery, statsQuery, achievementsQuery } = useProgress();
  const cities = (citiesData?.data || []).map((c) => mapApiCity(c, t));
  const cityNameById = (id: string) => cities.find(c => c.id === id)?.name || t("common.unknown");
  const artifacts = (artifactsData?.data || [])
    .slice(0, 3)
    .map(a => mapApiArtifact(a, cityNameById(a.city_id), t));

  const summary = summaryQuery.data;
  const stats = statsQuery.data;
  const records = summary?.records;
  const totalQuests = questsData?.meta.total ?? 0;
  const questsCompleted = countCompletedByType(records, "quest");
  const citiesVisited = countCompletedByType(records, "city");
  const artifactsCollected = countCompletedByType(records, "artifact");
  const journeyPercent = Math.round(summary?.completion_percent ?? 0);
  const questsPercent = totalQuests > 0 ? Math.round((questsCompleted / totalQuests) * 100) : 0;

  const activeQuest = (questsData?.data || [])
    .map(q => ({ ...mapApiQuest(q, cityNameById(q.city_id)), completionStatus: q.completion_status }))
    .find(q => q.completionStatus !== "completed") || null;

  const achievements = achievementsQuery.data || [];

  return (
    <div className="min-h-screen pt-16 flex flex-col" style={{ background: "#0F1115" }}>
      <div className="flex-1 grid grid-cols-[260px_1fr_280px] gap-0 max-h-[calc(100vh-64px)]">

        {/* Left Sidebar */}
        <aside className="overflow-y-auto border-r flex flex-col gap-4 p-5"
          style={{ borderColor: "rgba(255,255,255,0.06)", background: "#0D1017" }}>

          {/* Character badge */}
          <div className="rounded-[16px] p-4 flex items-center gap-3"
            style={{ background: "rgba(34,38,47,0.5)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ background: `linear-gradient(135deg, ${char.color}20, ${char.color}08)`, border: `1px solid ${char.color}25` }}>
              <char.icon size={22} color={char.color} />
            </div>
            <div>
              <div className="text-[#F6F4EC] text-sm font-semibold orda-cinzel">{char.name}</div>
              <div className="text-[10px] text-[#B7BAC3] orda-inter">{char.title}</div>
            </div>
          </div>

          {/* Journey Progress */}
          <div className="rounded-[16px] p-4" style={{ background: "rgba(34,38,47,0.4)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs orda-cinzel tracking-widest text-[#B7BAC3]">{t("dashboard.journey")}</span>
              <span className="text-[#D4AF37] text-sm font-semibold orda-cinzel">{journeyPercent}%</span>
            </div>
            <div className="w-full h-1.5 rounded-full mb-3" style={{ background: "rgba(255,255,255,0.06)" }}>
              <div className="h-full rounded-full progress-bar-fill"
                style={{ width: `${journeyPercent}%`, background: "linear-gradient(90deg,#D4AF37,#C9962C)" }} />
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[[`${citiesVisited}/${cities.length}`, t("dashboard.statCities")], [`${artifactsCollected}`, t("dashboard.statArtifacts")], [`${questsCompleted}`, t("dashboard.statQuests")]].map(([v, l]) => (
                <div key={l} className="text-center">
                  <div className="text-[#D4AF37] text-sm font-bold orda-cinzel">{v}</div>
                  <div className="text-[#B7BAC3] text-[10px] orda-inter">{l}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Current Quest */}
          <div>
            <div className="text-[10px] orda-cinzel tracking-[0.2em] text-[#B7BAC3] mb-3 px-1">{t("dashboard.activeQuest")}</div>
            {questsLoading ? (
              <div className="rounded-[14px] p-4" style={{ background: "rgba(15,17,21,0.5)", border: "1px solid rgba(255,255,255,0.04)" }}>
                <div className="h-3 w-32 rounded-full mb-2" style={{ background: "rgba(255,255,255,0.05)" }} />
                <div className="h-2 w-full rounded-full" style={{ background: "rgba(255,255,255,0.05)" }} />
              </div>
            ) : activeQuest ? (
              <div className="quest-card rounded-[14px] p-4 cursor-pointer"
                style={{ background: "rgba(212,175,55,0.05)", border: "1px solid rgba(212,175,55,0.12)" }}
                onClick={() => onNav("quests")}>
                <div className="flex items-start gap-2 mb-2">
                  <Zap size={14} color="#D4AF37" className="mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="text-[#F6F4EC] text-xs font-semibold orda-cinzel">{activeQuest.title}</div>
                    <div className="text-[#B7BAC3] text-[11px] orda-inter mt-1 leading-relaxed line-clamp-2">{activeQuest.description}</div>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-3">
                  <span className="badge-gold text-[9px]">+{activeQuest.xp} XP</span>
                  <span className="text-[#57D6D1] text-[10px] orda-inter">{activeQuest.city}</span>
                </div>
              </div>
            ) : (
              <div className="rounded-[14px] p-4 text-center" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
                <p className="text-[11px] orda-inter text-[#B7BAC3]">{t("dashboard.noQuests")}</p>
              </div>
            )}
          </div>

          {/* Recent Artifacts */}
          <div>
            <div className="flex items-center justify-between mb-3 px-1">
              <span className="text-[10px] orda-cinzel tracking-[0.2em] text-[#B7BAC3]">{t("dashboard.artifactsLabel")}</span>
              <button onClick={() => onNav("artifacts")} className="text-[10px] text-[#D4AF37] orda-inter hover:opacity-70">{t("common.seeAll")}</button>
            </div>
            <div className="space-y-2">
              {(artifactsLoading ? Array.from({ length: 3 }) : artifacts).map((a, index) => (
                artifactsLoading || !a ? (
                  <div key={`artifact-skeleton-${index}`} className="rounded-[14px] p-3" style={{ background: "rgba(15,17,21,0.5)", border: "1px solid rgba(255,255,255,0.04)" }}>
                    <div className="w-full h-16 rounded-[10px] mb-3" style={{ background: "rgba(255,255,255,0.04)" }} />
                    <div className="h-2 w-20 rounded-full mb-2" style={{ background: "rgba(255,255,255,0.05)" }} />
                    <div className="h-2 w-28 rounded-full" style={{ background: "rgba(255,255,255,0.05)" }} />
                  </div>
                ) : (
                  <div key={a.id} className="flex items-center gap-3 p-2.5 rounded-xl cursor-pointer hover:bg-white/[0.03] transition-colors">
                    <span className="text-lg">{a.icon}</span>
                    <div>
                      <div className="text-[#F6F4EC] text-xs orda-cinzel">{a.name}</div>
                      <div className="text-[#B7BAC3] text-[10px] orda-inter">{a.category}</div>
                    </div>
                  </div>
                )
              ))}
            </div>
          </div>

          {/* Achievements */}
          <div>
            <div className="text-[10px] orda-cinzel tracking-[0.2em] text-[#B7BAC3] mb-3 px-1">{t("dashboard.achievementsLabel")}</div>
            <div className="space-y-2">
              {achievementsQuery.isLoading ? (
                Array.from({ length: 2 }).map((_, i) => (
                  <div key={`achievement-skeleton-${i}`} className="h-9 rounded-xl" style={{ background: "rgba(255,255,255,0.03)" }} />
                ))
              ) : achievements.length > 0 ? (
                achievements.map((achievement) => (
                  <div key={achievement.id} className="flex items-center gap-3 p-2 rounded-xl"
                    style={{ background: "rgba(212,175,55,0.05)" }}>
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                      style={{ background: "rgba(212,175,55,0.15)" }}>
                      <Check size={13} color="#D4AF37" />
                    </div>
                    <div>
                      <div className="text-xs orda-cinzel text-[#F6F4EC]">{achievement.title}</div>
                      <div className="text-[10px] orda-inter text-[#B7BAC3]">{achievement.description}</div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-[11px] orda-inter text-[#B7BAC3] px-1">{t("dashboard.noAchievements")}</p>
              )}
            </div>
          </div>
        </aside>

        {/* Map Center */}
        <main className="p-4 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="orda-cinzel text-base font-bold text-[#F6F4EC] tracking-wider">{t("dashboard.interactiveMap")}</h2>
              <p className="text-xs text-[#B7BAC3] orda-inter">{t("dashboard.mapSubtitle")}</p>
            </div>
            <div className="flex gap-2">
              {[t("dashboard.routes"), t("dashboard.cities"), t("dashboard.rivers")].map((label, i) => (
                <button key={label} className="text-xs px-3 py-1.5 rounded-lg orda-inter transition-colors"
                  style={{
                    background: i === 0 ? "rgba(212,175,55,0.12)" : "rgba(255,255,255,0.04)",
                    color: i === 0 ? "#D4AF37" : "#B7BAC3",
                    border: `1px solid ${i === 0 ? "rgba(212,175,55,0.2)" : "rgba(255,255,255,0.06)"}`,
                  }}>
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1">
            <InteractiveMap cities={cities} onSelectCity={onSelectCity} />
          </div>
          {/* City quick-access row */}
          <div className="mt-4 flex gap-3 overflow-x-auto pb-1">
            {(citiesLoading ? Array.from({ length: 6 }) : cities).map((city, index) => (
              citiesLoading || !city ? (
                <div key={`city-skeleton-${index}`} className="rounded-[12px] px-3 py-2 h-9 w-24 flex-shrink-0" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }} />
              ) : (
                <button key={city.id} onClick={() => onSelectCity(city)}
                  className="flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl text-xs orda-cinzel tracking-wide transition-all hover:border-[#D4AF3750] hover:text-[#D4AF37]"
                  style={{ background: "rgba(34,38,47,0.6)", border: "1px solid rgba(255,255,255,0.06)", color: "#B7BAC3" }}>
                  <MapPin size={11} color="#D4AF37" />
                  {city.name}
                </button>
              )
            ))}
          </div>
        </main>

        {/* Right Panel */}
        <aside className="overflow-y-auto border-l flex flex-col gap-4 p-5"
          style={{ borderColor: "rgba(255,255,255,0.06)", background: "#0D1017" }}>

          {/* AI Assistant teaser */}
          <div className="rounded-[16px] p-5 cursor-pointer gold-hover"
            style={{ background: "rgba(87,214,209,0.05)", border: "1px solid rgba(87,214,209,0.15)" }}
            onClick={() => onNav("ai")}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center teal-glow"
                style={{ background: "rgba(87,214,209,0.12)", border: "1px solid rgba(87,214,209,0.2)" }}>
                <MessageSquare size={16} color="#57D6D1" />
              </div>
              <div>
                <div className="text-sm orda-cinzel text-[#57D6D1]">{t("dashboard.aiTeaserTitle")}</div>
                <div className="text-[10px] orda-inter text-[#B7BAC3]">{t("dashboard.aiTeaserSubtitle")}</div>
              </div>
            </div>
            <p className="text-xs text-[#B7BAC3] orda-inter leading-relaxed line-clamp-3">
              {t("dashboard.aiTeaserQuote")}
            </p>
            <button className="mt-3 w-full py-2 rounded-xl text-xs orda-cinzel tracking-widest transition-colors"
              style={{ background: "rgba(87,214,209,0.1)", color: "#57D6D1", border: "1px solid rgba(87,214,209,0.15)" }}>
              {t("dashboard.openAiHistorian")}
            </button>
          </div>

          {/* Progress rings */}
          <div className="rounded-[16px] p-4" style={{ background: "rgba(34,38,47,0.4)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="text-[10px] orda-cinzel tracking-[0.2em] text-[#B7BAC3] mb-4">{t("dashboard.explorerLevel")}</div>
            <div className="flex items-center justify-center gap-6">
              <div className="flex flex-col items-center gap-2">
                <div className="relative">
                  <ProgressRing value={journeyPercent} size={72} />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-sm font-bold orda-cinzel text-[#D4AF37]">{journeyPercent}%</span>
                  </div>
                </div>
                <span className="text-[10px] text-[#B7BAC3] orda-inter">{t("dashboard.journeyLabel")}</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <div className="relative">
                  <ProgressRing value={questsPercent} size={72} />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-sm font-bold orda-cinzel text-[#D4AF37]">{questsPercent}%</span>
                  </div>
                </div>
                <span className="text-[10px] text-[#B7BAC3] orda-inter">{t("dashboard.questsLabel")}</span>
              </div>
            </div>
            <div className="mt-4 p-3 rounded-xl text-center"
              style={{ background: "rgba(212,175,55,0.05)", border: "1px solid rgba(212,175,55,0.1)" }}>
              <div className="text-[#D4AF37] text-sm font-bold orda-cinzel">{t("dashboard.level", { level: stats?.level ?? 1 })}</div>
              <div className="text-[#B7BAC3] text-[10px] orda-inter">{t("dashboard.xpEarned", { xp: stats?.xp ?? 0 })}</div>
            </div>
          </div>

          {/* Notifications */}
          <div>
            <div className="text-[10px] orda-cinzel tracking-[0.2em] text-[#B7BAC3] mb-3 px-1">{t("dashboard.notifications")}</div>
            <div className="space-y-2">
              {[
                { icon: "⚜", text: t("dashboard.notification1"), time: t("dashboard.timeAgo2m"), color: "#D4AF37" },
                { icon: "🏺", text: t("dashboard.notification2"), time: t("dashboard.timeAgo1h"), color: "#6FCF97" },
                { icon: "📜", text: t("dashboard.notification3"), time: t("dashboard.timeAgo3h"), color: "#57D6D1" },
              ].map((n, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-xl hover:bg-white/[0.02] cursor-pointer transition-colors">
                  <span className="text-base mt-0.5">{n.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs orda-inter text-[#F6F4EC] leading-relaxed">{n.text}</p>
                    <span className="text-[10px] orda-inter text-[#B7BAC3]">{n.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Certificate teaser */}
          <div className="rounded-[16px] p-4 mt-auto cursor-pointer hover:opacity-80 transition-opacity"
            style={{ background: "rgba(212,175,55,0.04)", border: "1px solid rgba(212,175,55,0.1)" }}
            onClick={() => onNav("certificate")}>
            <div className="flex items-center gap-2 mb-2">
              <Award size={16} color="#D4AF37" />
              <span className="text-sm orda-cinzel text-[#D4AF37]">{t("dashboard.certificate")}</span>
            </div>
            <p className="text-xs text-[#B7BAC3] orda-inter">{t("dashboard.certificateTeaser")}</p>
          </div>
        </aside>
      </div>
    </div>
  );
}

// ─── CITY PAGE ────────────────────────────────────────────────────────────────
function CityPage({ city, onBack, onNav }: { city: City; onBack: () => void; onNav: (v: View) => void }) {
  const { t } = useTranslation();
  const { data: artifactsData, isLoading: artifactsLoading } = useArtifacts();
  const artifacts = (artifactsData?.data || []).filter((artifact) => artifact.city_id === city.id).slice(0, 3);
  const [activeTab, setActiveTab] = useState<"overview" | "timeline" | "gallery" | "stats">("overview");

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
    <div className="min-h-screen pt-16 animate-fade-in" style={{ background: "#0F1115" }}>
      {/* Hero Banner */}
      <div className="relative h-72 overflow-hidden">
        <div className="absolute inset-0"
          style={{ background: "linear-gradient(135deg, #1A1C14 0%, #0F1115 50%, #141018 100%)" }} />
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
          <button onClick={onBack} className="flex items-center gap-2 text-sm text-[#B7BAC3] hover:text-[#F6F4EC] transition-colors mb-4 orda-inter">
            <ChevronLeft size={16} /> {t("city.backToMap")}
          </button>
          <div className="flex items-end gap-6">
            <div>
              <div className="badge-gold mb-3">{t("city.goldenHordeCity")}</div>
              <h1 className="orda-cinzel text-4xl md:text-5xl font-bold text-[#F6F4EC] mb-2 gold-glow-text">{city.name}</h1>
              <p className="orda-cormorant text-xl text-[#D4AF37] italic">{city.subtitle}</p>
            </div>
            <div className="ml-auto flex gap-3 flex-shrink-0">
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
      <div className="border-b px-8 lg:px-16 flex gap-8"
        style={{ borderColor: "rgba(255,255,255,0.06)" }}>
        {(["overview", "timeline", "gallery", "stats"] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`py-4 text-sm orda-cinzel tracking-wider capitalize transition-all duration-200 ${activeTab === tab ? "tab-active" : "tab-inactive"}`}>
            {t(`city.tabs.${tab}`)}
          </button>
        ))}
      </div>

      <div className="max-w-[1200px] mx-auto px-8 lg:px-16 py-10">
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-slide-up">
            <div className="lg:col-span-2 space-y-6">
              {/* Description */}
              <div className="rounded-[20px] p-7" style={{ background: "rgba(34,38,47,0.5)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <h2 className="orda-cinzel text-lg font-semibold text-[#F6F4EC] mb-4">{t("city.historicalOverview")}</h2>
                <p className="orda-inter text-[#B7BAC3] leading-[1.85] text-base">{city.description}</p>
              </div>

              {/* Importance */}
              <div className="rounded-[20px] p-7" style={{ background: "rgba(212,175,55,0.04)", border: "1px solid rgba(212,175,55,0.1)" }}>
                <div className="flex items-center gap-3 mb-3">
                  <Crown size={18} color="#D4AF37" />
                  <h2 className="orda-cinzel text-base font-semibold text-[#D4AF37]">{t("city.strategicImportance")}</h2>
                </div>
                <p className="orda-cormorant text-xl italic text-[#F6F4EC] leading-relaxed">{city.importance}</p>
              </div>

              {/* Facts */}
              <div className="rounded-[20px] p-7" style={{ background: "rgba(34,38,47,0.5)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <h2 className="orda-cinzel text-base font-semibold text-[#F6F4EC] mb-4">{t("city.remarkableFacts")}</h2>
                <div className="space-y-3">
                  {city.facts.map((fact, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold orda-cinzel mt-0.5"
                        style={{ background: "rgba(212,175,55,0.12)", color: "#D4AF37", border: "1px solid rgba(212,175,55,0.2)" }}>
                        {i + 1}
                      </div>
                      <p className="orda-inter text-sm text-[#B7BAC3] leading-relaxed">{fact}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Sidebar stats */}
            <div className="space-y-4">
              {[[t("city.founded"), city.founded], [t("city.population"), city.population], [t("city.era"), t("city.eraValue")], [t("city.region"), t("city.regionValue")]].map(([k, v]) => (
                <div key={k} className="rounded-[16px] p-5" style={{ background: "rgba(34,38,47,0.4)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div className="text-[10px] orda-cinzel tracking-[0.2em] text-[#B7BAC3] mb-1">{k}</div>
                  <div className="text-[#F6F4EC] text-base orda-cinzel font-semibold">{v}</div>
                </div>
              ))}

              {/* Related Artifacts */}
              <div className="rounded-[16px] p-5" style={{ background: "rgba(34,38,47,0.4)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div className="text-[10px] orda-cinzel tracking-[0.2em] text-[#B7BAC3] mb-3">{t("city.cityArtifacts")}</div>
                {(artifactsLoading ? Array.from({ length: 3 }) : artifacts).map((a, index) => (
                  artifactsLoading || !a ? (
                    <div key={`city-artifact-skeleton-${index}`} className="rounded-[14px] p-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
                      <div className="h-2 w-24 rounded-full mb-2" style={{ background: "rgba(255,255,255,0.05)" }} />
                      <div className="h-2 w-16 rounded-full" style={{ background: "rgba(255,255,255,0.05)" }} />
                    </div>
                  ) : (
                    <div key={a.id} className="rounded-[14px] p-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
                      <div className="text-[10px] orda-cinzel tracking-[0.2em] text-[#D4AF37] mb-1">{a.era}</div>
                      <div className="text-sm orda-cinzel text-[#F6F4EC]">{a.name}</div>
                    </div>
                  )
                ))}
                <button onClick={() => onNav("artifacts")} className="mt-3 w-full py-2 rounded-xl text-xs orda-cinzel text-[#D4AF37] hover:bg-[#D4AF3710] transition-colors">
                  {t("city.viewAllArtifacts")}
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === "timeline" && (
          <div className="max-w-2xl animate-slide-up">
            <h2 className="orda-cinzel text-xl font-bold text-[#F6F4EC] mb-8">{t("city.historicalTimeline")}</h2>
            <div className="relative">
              <div className="absolute left-[72px] top-0 bottom-0 w-px" style={{ background: "linear-gradient(180deg, transparent, rgba(212,175,55,0.3) 10%, rgba(212,175,55,0.3) 90%, transparent)" }} />
              <div className="space-y-6">
                {timelineEvents.map((e, i) => (
                  <div key={i} className="flex items-start gap-6 animate-slide-right" style={{ animationDelay: `${i * 0.1}s` }}>
                    <div className="w-16 flex-shrink-0 text-right">
                      <span className="text-xs orda-cinzel text-[#D4AF37] font-semibold">{e.year}</span>
                    </div>
                    <div className="relative">
                      <div className="w-3 h-3 rounded-full mt-1 border-2 border-[#D4AF37]"
                        style={{ background: "#0F1115", boxShadow: "0 0 8px rgba(212,175,55,0.4)" }} />
                    </div>
                    <div className="flex-1 pb-2">
                      <p className="orda-inter text-sm text-[#B7BAC3] leading-relaxed">{e.event}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === "gallery" && (
          <div className="animate-slide-up">
            <h2 className="orda-cinzel text-xl font-bold text-[#F6F4EC] mb-8">{t("city.gallery")}</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {Array.from({ length: 6 }, (_, i) => (
                <div key={i} className="aspect-[4/3] rounded-[16px] overflow-hidden relative gold-hover cursor-pointer"
                  style={{ background: `linear-gradient(${135 + i * 30}deg, rgba(212,175,55,0.08), rgba(34,38,47,0.8))`, border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-4xl mb-2">{["🏛️", "🗺️", "⚔️", "🪙", "🏺", "📜"][i]}</div>
                      <div className="text-xs orda-cinzel text-[#B7BAC3]">{t("city.historicalView", { index: i + 1 })}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "stats" && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-slide-up">
            {statsGrid.map(([label, value, sub]) => (
              <div key={label} className="rounded-[20px] p-6 text-center"
                style={{ background: "rgba(34,38,47,0.5)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div className="text-3xl font-bold orda-cinzel text-[#D4AF37] mb-1">{value}</div>
                <div className="text-sm orda-cinzel text-[#F6F4EC] mb-1">{label}</div>
                <div className="text-[11px] orda-inter text-[#B7BAC3]">{sub}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── AI HISTORIAN ─────────────────────────────────────────────────────────────
function AIHistorian({ onBack }: { onBack: () => void }) {
  const { t } = useTranslation();
  const chatMutation = useChatMutation();
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
      const response = await chatMutation.mutateAsync({ message: userMsg });
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

  const suggestions = t("aiHistorian.suggestions", { returnObjects: true }) as string[];

  return (
    <div className="min-h-screen pt-16 flex flex-col" style={{ background: "#0F1115" }}>
      <div className="flex-1 max-w-3xl mx-auto w-full px-4 py-6 flex flex-col">

        {/* Header */}
        <div className="flex items-center gap-4 mb-8 animate-fade-in">
          <button onClick={onBack} className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-white/5 transition-colors"
            style={{ border: "1px solid rgba(255,255,255,0.06)" }}>
            <ChevronLeft size={16} color="#B7BAC3" />
          </button>
          <div className="flex items-center gap-4 flex-1">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center animate-float"
              style={{ background: "linear-gradient(135deg,rgba(87,214,209,0.15),rgba(87,214,209,0.05))", border: "1px solid rgba(87,214,209,0.25)", boxShadow: "0 0 30px rgba(87,214,209,0.15)" }}>
              <span className="text-xl">⚜</span>
            </div>
            <div>
              <h1 className="orda-cinzel text-lg font-bold text-[#F6F4EC]">{t("aiHistorian.title")}</h1>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#6FCF97]" style={{ boxShadow: "0 0 6px rgba(111,207,151,0.6)" }} />
                <span className="text-xs orda-inter text-[#B7BAC3]">{t("aiHistorian.status")}</span>
              </div>
            </div>
          </div>
          <div className="badge-teal">{t("aiHistorian.beta")}</div>
        </div>

        {/* Suggested questions (show initially) */}
        {messages.length === 1 && (
          <div className="mb-6 animate-slide-up">
            <p className="text-xs orda-cinzel tracking-widest text-[#B7BAC3] mb-3">{t("aiHistorian.suggestedQuestions")}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {suggestions.map((s) => (
                <button key={s} onClick={() => { setInput(s); }}
                  className="text-left p-3 rounded-[14px] text-xs orda-inter text-[#B7BAC3] hover:text-[#F6F4EC] transition-all gold-hover"
                  style={{ background: "rgba(34,38,47,0.5)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <ChevronRight size={12} className="inline mr-1 text-[#D4AF37]" />
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 space-y-4 overflow-y-auto mb-4 pr-1">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} ai-bubble`}
              style={{ animationDelay: "0s" }}>
              {msg.role === "ai" && (
                <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mr-3 mt-1"
                  style={{ background: "rgba(87,214,209,0.12)", border: "1px solid rgba(87,214,209,0.2)" }}>
                  <span className="text-sm">⚜</span>
                </div>
              )}
              <div className={`max-w-[80%] rounded-[18px] px-5 py-4 ${msg.role === "user" ? "rounded-tr-[6px]" : "rounded-tl-[6px]"}`}
                style={msg.role === "ai"
                  ? { background: "rgba(34,38,47,0.7)", border: "1px solid rgba(255,255,255,0.07)" }
                  : { background: "linear-gradient(135deg, rgba(212,175,55,0.15), rgba(212,175,55,0.08))", border: "1px solid rgba(212,175,55,0.2)" }}>
                <p className="orda-inter text-sm text-[#F6F4EC] leading-[1.75]">{msg.text}</p>
                {msg.role === "ai" && (
                  <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between">
                    <span className="text-[10px] orda-inter text-[#B7BAC3] flex items-center gap-1">
                      <BookOpen size={10} /> {t("aiHistorian.basedOnRecords")}
                    </span>
                    <span className="text-[10px] orda-cinzel text-[#D4AF37]">{t("aiHistorian.aiLabel")}</span>
                  </div>
                )}
              </div>
            </div>
          ))}

          {typing && (
            <div className="flex justify-start ai-bubble">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mr-3"
                style={{ background: "rgba(87,214,209,0.12)", border: "1px solid rgba(87,214,209,0.2)" }}>
                <span className="text-sm">⚜</span>
              </div>
              <div className="rounded-[18px] rounded-tl-[6px] px-5 py-4"
                style={{ background: "rgba(34,38,47,0.7)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <div className="flex gap-1.5 items-center h-5">
                  {[0, 0.2, 0.4].map((d, i) => (
                    <div key={i} className="w-1.5 h-1.5 rounded-full bg-[#57D6D1]"
                      style={{ animation: `scroll-bounce 1.2s ease-in-out ${d}s infinite` }} />
                  ))}
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="animate-slide-up" style={{ animationDelay: "0.2s" }}>
          <div className="flex items-end gap-3 p-4 rounded-[20px]"
            style={{ background: "rgba(34,38,47,0.6)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <button className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 hover:bg-white/5 transition-colors">
              <Paperclip size={16} color="#B7BAC3" />
            </button>
            <textarea
              className="flex-1 bg-transparent outline-none text-sm text-[#F6F4EC] orda-inter placeholder-[#B7BAC3] resize-none leading-relaxed"
              placeholder={t("aiHistorian.placeholder")}
              rows={2}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            />
            <div className="flex flex-col gap-2 flex-shrink-0">
              <button className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-white/5 transition-colors">
                <Mic size={16} color="#B7BAC3" />
              </button>
              <button onClick={send}
                className="w-9 h-9 rounded-xl flex items-center justify-center transition-all"
                style={{ background: input.trim() ? "linear-gradient(135deg,#57D6D1,#3ABAB5)" : "rgba(87,214,209,0.1)", boxShadow: input.trim() ? "0 4px 16px rgba(87,214,209,0.3)" : "none" }}>
                <Send size={15} color={input.trim() ? "#0F1115" : "#57D6D1"} />
              </button>
            </div>
          </div>
          <p className="text-center text-[10px] orda-inter text-[#B7BAC3] mt-3">
            {t("aiHistorian.disclaimer")}
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── ARTIFACT GALLERY ─────────────────────────────────────────────────────────
function ArtifactGallery({ onBack }: { onBack: () => void }) {
  const { t } = useTranslation();
  const { data: citiesData } = useCities();
  const { data: artifactsData, isLoading, error } = useArtifacts();
  const [selected, setSelected] = useState<Artifact | null>(null);
  const [filter, setFilter] = useState("All");
  const cities = (citiesData?.data || []).map((c) => mapApiCity(c, t));
  const artifactItems = (artifactsData?.data || []).map((artifact) => mapApiArtifact(artifact, cities.find((city) => city.id === artifact.city_id)?.name || t("common.unknown"), t));
  const categories = ["All", ...Array.from(new Set(artifactItems.map(a => a.category)))];
  const filtered = filter === "All" ? artifactItems : artifactItems.filter(a => a.category === filter);

  return (
    <div className="min-h-screen pt-16 animate-fade-in" style={{ background: "#0F1115" }}>
      <div className="max-w-[1200px] mx-auto px-6 lg:px-12 py-10">

        {/* Header */}
        <div className="flex items-center gap-4 mb-10">
          <button onClick={onBack} className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-white/5 transition-colors"
            style={{ border: "1px solid rgba(255,255,255,0.06)" }}>
            <ChevronLeft size={16} color="#B7BAC3" />
          </button>
          <div>
            <h1 className="orda-cinzel text-3xl font-bold text-[#F6F4EC]">{t("artifactGallery.title")}</h1>
            <p className="orda-inter text-sm text-[#B7BAC3] mt-1">{t("artifactGallery.subtitle", { count: artifactItems.length })}</p>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 flex-wrap mb-8">
          {categories.map(cat => (
            <button key={cat} onClick={() => setFilter(cat)}
              className="px-4 py-2 rounded-xl text-xs orda-cinzel tracking-wider transition-all"
              style={{
                background: filter === cat ? "rgba(212,175,55,0.15)" : "rgba(34,38,47,0.5)",
                color: filter === cat ? "#D4AF37" : "#B7BAC3",
                border: `1px solid ${filter === cat ? "rgba(212,175,55,0.3)" : "rgba(255,255,255,0.06)"}`,
              }}>
              {cat === "All" ? t("artifactGallery.all") : cat}
            </button>
          ))}
        </div>

        {/* Grid */}
        {error && <div className="mb-4 text-sm text-[#B7BAC3]">{t("artifactGallery.unableToLoad")}</div>}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {isLoading ? Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="rounded-[20px] p-5" style={{ background: "rgba(34,38,47,0.6)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="aspect-square rounded-[14px] mb-4" style={{ background: "rgba(15,17,21,0.5)" }} />
              <div className="h-2 w-20 rounded-full mb-2" style={{ background: "rgba(255,255,255,0.05)" }} />
              <div className="h-2 w-24 rounded-full" style={{ background: "rgba(255,255,255,0.05)" }} />
            </div>
          )) : filtered.map((artifact, i) => (
            <div key={artifact.id}
              className="rounded-[20px] p-5 cursor-pointer card-hover gold-hover animate-scale-in"
              style={{ animationDelay: `${i * 0.07}s`, background: "rgba(34,38,47,0.6)", border: "1px solid rgba(255,255,255,0.06)" }}
              onClick={() => setSelected(artifact)}>

              {/* Display area */}
              <div className="aspect-square rounded-[14px] flex items-center justify-center mb-4 relative overflow-hidden"
                style={{ background: "rgba(15,17,21,0.5)", border: "1px solid rgba(255,255,255,0.04)" }}>
                <div className="absolute inset-0"
                  style={{ background: `radial-gradient(ellipse at center, ${artifact.rarity === "legendary" ? "rgba(212,175,55,0.1)" : artifact.rarity === "rare" ? "rgba(87,214,209,0.06)" : "rgba(255,255,255,0.03)"} 0%, transparent 70%)` }} />
                <span className="text-5xl relative z-10">{artifact.icon}</span>
              </div>

              <RarityBadge rarity={artifact.rarity} />
              <h3 className="orda-cinzel text-sm font-semibold text-[#F6F4EC] mt-2 mb-1">{artifact.name}</h3>
              <p className="orda-inter text-[11px] text-[#B7BAC3] leading-relaxed line-clamp-2">{artifact.description}</p>
              <div className="flex items-center gap-2 mt-3">
                <MapPin size={10} color="#D4AF37" />
                <span className="text-[10px] orda-inter text-[#B7BAC3]">{artifact.city}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Artifact modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(16px)" }}
          onClick={() => setSelected(null)}>
          <div className="max-w-lg w-full rounded-[24px] p-8 animate-scale-in"
            style={{ background: "#171A20", border: "1px solid rgba(212,175,55,0.15)", boxShadow: "0 0 80px rgba(212,175,55,0.1)" }}
            onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-6">
              <div>
                <RarityBadge rarity={selected.rarity} />
                <h2 className="orda-cinzel text-xl font-bold text-[#F6F4EC] mt-2">{selected.name}</h2>
                <p className="orda-inter text-sm text-[#B7BAC3]">{selected.category}</p>
              </div>
              <button onClick={() => setSelected(null)} className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-white/5">
                <X size={16} color="#B7BAC3" />
              </button>
            </div>

            <div className="aspect-video rounded-[16px] flex items-center justify-center mb-6"
              style={{ background: "rgba(15,17,21,0.6)", border: "1px solid rgba(255,255,255,0.04)" }}>
              <span className="text-8xl">{selected.icon}</span>
            </div>

            <p className="orda-inter text-sm text-[#B7BAC3] leading-[1.8] mb-6">{selected.description}</p>

            <div className="grid grid-cols-2 gap-3">
              {[[t("artifactGallery.found"), selected.found], [t("artifactGallery.city"), selected.city]].map(([k, v]) => (
                <div key={k} className="p-3 rounded-[12px]" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
                  <div className="text-[10px] orda-cinzel tracking-widest text-[#B7BAC3] mb-1">{k}</div>
                  <div className="text-sm orda-cinzel text-[#F6F4EC]">{v}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── QUEST VIEW ───────────────────────────────────────────────────────────────
function QuestView({ onBack }: { onBack: () => void }) {
  const { t } = useTranslation();
  const { data: citiesData } = useCities();
  const { data: questsData, isLoading, error } = useQuests();
  const { completeQuestMutation } = useProgress();
  const [activeQuest, setActiveQuest] = useState<(ApiQuest & { cityName: string }) | null>(null);
  const [completedQuestId, setCompletedQuestId] = useState<string | null>(null);
  const cities = (citiesData?.data || []).map((c) => mapApiCity(c, t));
  const questItems = (questsData?.data || []).map((quest) => ({ ...quest, cityName: cities.find((city) => city.id === quest.city_id)?.name || t("common.unknown") }));
  const activeQuestUi = activeQuest ? mapApiQuest(activeQuest, activeQuest.cityName) : null;

  const isOnCooldown = Boolean(
    activeQuest?.completion_status === "completed" &&
    activeQuest.cooldown_until &&
    new Date(activeQuest.cooldown_until).getTime() > Date.now()
  );
  const justCompleted = Boolean(activeQuest) && activeQuest?.id === completedQuestId && completeQuestMutation.isSuccess;

  const handleComplete = () => {
    if (!activeQuest) return;
    completeQuestMutation.mutate(activeQuest.id, {
      onSuccess: () => setCompletedQuestId(activeQuest.id),
    });
  };

  return (
    <div className="min-h-screen pt-16 animate-fade-in" style={{ background: "#0F1115" }}>
      <div className="max-w-3xl mx-auto px-6 py-10">
        <div className="flex items-center gap-4 mb-10">
          <button onClick={onBack} className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-white/5 transition-colors"
            style={{ border: "1px solid rgba(255,255,255,0.06)" }}>
            <ChevronLeft size={16} color="#B7BAC3" />
          </button>
          <div>
            <h1 className="orda-cinzel text-3xl font-bold text-[#F6F4EC]">{t("quests.title")}</h1>
            <p className="orda-inter text-sm text-[#B7BAC3] mt-1">{t("quests.subtitle")}</p>
          </div>
        </div>

        {/* Quest list */}
        <div className="grid grid-cols-1 gap-3 mb-8">
          {(isLoading ? Array.from({ length: 4 }) : questItems).map((q, index) => (
            isLoading || !q ? (
              <div key={`quest-skeleton-${index}`} className="rounded-[16px] p-5" style={{ background: "rgba(34,38,47,0.4)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div className="h-4 w-32 rounded-full mb-2" style={{ background: "rgba(255,255,255,0.05)" }} />
                <div className="h-2 w-20 rounded-full" style={{ background: "rgba(255,255,255,0.05)" }} />
              </div>
            ) : (
              <div key={q.id} onClick={() => { setActiveQuest(q); setCompletedQuestId(null); }}
                className="rounded-[16px] p-5 cursor-pointer quest-card"
                style={{
                  background: activeQuest?.id === q.id ? "rgba(212,175,55,0.08)" : "rgba(34,38,47,0.4)",
                  border: `1px solid ${activeQuest?.id === q.id ? "rgba(212,175,55,0.25)" : "rgba(255,255,255,0.06)"}`,
                }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                      style={{ background: "rgba(212,175,55,0.1)", border: "1px solid rgba(212,175,55,0.2)" }}>
                      <Zap size={16} color="#D4AF37" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold orda-cinzel text-[#F6F4EC]">{q.title}</div>
                      <div className="text-[11px] orda-inter text-[#B7BAC3]">{q.cityName}</div>
                    </div>
                  </div>
                  <span className="badge-gold">+{q.xp_reward} XP</span>
                </div>
              </div>
            )
          ))}
        </div>

        {error && <div className="mb-4 text-sm text-[#B7BAC3]">{t("quests.unableToLoad")}</div>}
        {/* Active Quest */}
        <div className="rounded-[24px] p-8" style={{ background: "rgba(23,26,32,0.8)", border: "1px solid rgba(212,175,55,0.12)" }}>
          <div className="badge-gold mb-4">{t("quests.activeQuest")}</div>
          <h2 className="orda-cinzel text-2xl font-bold text-[#F6F4EC] mb-2">{activeQuestUi?.title || t("quests.selectQuest")}</h2>
          <div className="flex items-center gap-2 mb-6">
            <MapPin size={12} color="#D4AF37" />
            <span className="text-sm orda-inter text-[#B7BAC3]">{activeQuestUi?.city || ""}</span>
          </div>
          <p className="orda-cormorant text-xl italic text-[#F6F4EC] leading-relaxed mb-8">{activeQuestUi?.description || t("quests.chooseQuestPrompt")}</p>

          {!activeQuest ? null : justCompleted ? (
            <div className="animate-scale-in rounded-[16px] p-6 text-center"
              style={{ background: "rgba(111,207,151,0.06)", border: "1px solid rgba(111,207,151,0.2)" }}>
              <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{ background: "rgba(111,207,151,0.15)" }}>
                <Check size={22} color="#6FCF97" />
              </div>
              <div className="text-[#6FCF97] text-sm orda-cinzel tracking-widest mb-2">{t("quests.questComplete")}</div>
              <div className="flex items-center justify-center gap-4">
                <span className="badge-green">+{completeQuestMutation.data?.xp_gained ?? activeQuestUi?.xp ?? 0} XP</span>
                <span className="badge-gold">+{completeQuestMutation.data?.coins_gained ?? 0} {t("passport.coins")}</span>
              </div>
            </div>
          ) : isOnCooldown ? (
            <div className="rounded-[16px] p-6 text-center"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="text-[#B7BAC3] text-sm orda-cinzel tracking-widest mb-2">{t("quests.onCooldown")}</div>
              <p className="orda-inter text-xs text-[#B7BAC3]">
                {activeQuest.cooldown_until
                  ? t("quests.availableAgain", { date: new Date(activeQuest.cooldown_until).toLocaleString() })
                  : t("quests.checkBackLater")}
              </p>
            </div>
          ) : (
            <>
              <button onClick={handleComplete} disabled={completeQuestMutation.isPending}
                className="btn-primary w-full flex items-center justify-center gap-2"
                style={{ opacity: completeQuestMutation.isPending ? 0.7 : 1 }}>
                <Zap size={16} /> {completeQuestMutation.isPending ? t("quests.completing") : t("quests.completeQuest")}
              </button>
              {completeQuestMutation.isError && (
                <p className="mt-3 text-xs text-center orda-inter" style={{ color: "#E5484D" }}>
                  {(completeQuestMutation.error as Error).message}
                </p>
              )}
            </>
          )}
        </div>
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
  const citiesVisited = countCompletedByType(records, "city");
  const artifactsCollected = countCompletedByType(records, "artifact");
  const questsCompleted = countCompletedByType(records, "quest");
  const totalQuests = questsData?.meta.total ?? 0;

  const confettiPieces = Array.from({ length: 40 }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    color: ["#D4AF37", "#C9962C", "#57D6D1", "#6FCF97", "#F2C94C"][Math.floor(Math.random() * 5)],
    delay: Math.random() * 3,
    duration: Math.random() * 3 + 2,
    size: Math.random() * 8 + 4,
  }));

  return (
    <div className="min-h-screen pt-16 flex flex-col items-center justify-center px-4 py-10 relative overflow-hidden"
      style={{ background: "#0F1115" }}>

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
        <h1 className="orda-cinzel text-3xl font-bold text-[#F6F4EC] mb-2">{t("certificate.title")}</h1>
        <p className="orda-inter text-sm text-[#B7BAC3]">{t("certificate.subtitle")}</p>
      </div>

      {certificatesQuery.isLoading && (
        <p className="text-sm text-[#B7BAC3] orda-inter mb-4">{t("certificate.loading")}</p>
      )}
      {certificatesQuery.error && (
        <p className="text-sm text-[#B7BAC3] orda-inter mb-4">{t("certificate.unableToLoad")}</p>
      )}

      {/* Certificate */}
      <div className="certificate-frame rounded-[24px] max-w-2xl w-full animate-scale-in"
        style={{ background: "linear-gradient(135deg, #171A20 0%, #1A1C14 50%, #171A20 100%)", animationDelay: "0.2s" }}>

        {/* Inner border */}
        <div className="m-4 rounded-[18px] p-10 relative"
          style={{ border: "1px solid rgba(212,175,55,0.15)" }}>

          {/* Corner ornaments */}
          {["top-4 left-4", "top-4 right-4", "bottom-4 left-4", "bottom-4 right-4"].map((pos, i) => (
            <div key={i} className={`absolute ${pos} text-[#D4AF37] text-xl opacity-40`}>✦</div>
          ))}

          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg,rgba(212,175,55,0.15),rgba(212,175,55,0.05))", border: "1px solid rgba(212,175,55,0.25)" }}>
              <span className="text-2xl">⚜</span>
            </div>
            <div className="text-[#D4AF37] text-[10px] tracking-[0.4em] orda-cinzel mb-1">{t("certificate.academyName")}</div>
            <div className="w-32 h-px mx-auto" style={{ background: "linear-gradient(90deg,transparent,rgba(212,175,55,0.4),transparent)" }} />
          </div>

          {/* Certificate body */}
          <div className="text-center space-y-4">
            <p className="orda-cormorant text-lg italic text-[#B7BAC3]">{t("certificate.thisCertifies")}</p>
            <div className="py-4 border-b border-t" style={{ borderColor: "rgba(212,175,55,0.12)" }}>
              <h2 className="orda-cinzel text-4xl font-bold text-[#D4AF37]">{certificate?.title || t("certificate.defaultTitle")}</h2>
            </div>
            <p className="orda-cormorant text-lg italic text-[#B7BAC3]">{t("certificate.hasCompleted")}</p>
            <div className="flex items-center justify-center gap-3">
              <char.icon size={20} color={char.color} />
              <span className="orda-cinzel text-xl text-[#F6F4EC]">{t("certificate.characterOf", { name: char.name })}</span>
            </div>
            <p className="orda-cormorant text-base italic text-[#B7BAC3] max-w-sm mx-auto leading-relaxed">
              {t("certificate.traversed")}
            </p>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-4 mt-8 pt-8 border-t" style={{ borderColor: "rgba(212,175,55,0.08)" }}>
            {[[`${citiesVisited}/${citiesTotal}`, t("certificate.cities")], [`${artifactsCollected}`, t("certificate.artifacts")], [`${questsCompleted}/${totalQuests}`, t("certificate.quests")]].map(([v, l]) => (
              <div key={l} className="text-center">
                <div className="text-xl font-bold orda-cinzel text-[#D4AF37]">{v}</div>
                <div className="text-xs orda-inter text-[#B7BAC3]">{l}</div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="mt-8 flex items-center justify-between">
            <div>
              <div className="text-[10px] orda-cinzel tracking-widest text-[#B7BAC3]">{t("certificate.issuedBy")}</div>
              <div className="text-sm orda-cinzel text-[#D4AF37]">{t("certificate.academyName")}</div>
            </div>
            <div className="text-right">
              <div className="text-[10px] orda-cinzel tracking-widest text-[#B7BAC3]">{t("certificate.date")}</div>
              <div className="text-sm orda-cinzel text-[#D4AF37]">
                {certificate ? new Date(certificate.issued_at).toLocaleDateString() : t("certificate.notYetIssued")}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col items-center gap-3 mt-8 animate-slide-up" style={{ animationDelay: "0.5s" }}>
        <div className="flex gap-4">
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
          <p className="text-xs orda-inter" style={{ color: "#E5484D" }}>
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

  const citiesVisited = countCompletedByType(records, "city");
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
    <div className="min-h-screen pt-16 pb-16 animate-fade-in" style={{ background: "#0F1115" }}>
      <div className="max-w-[1200px] mx-auto px-6 lg:px-12 py-10">
        <div className="flex items-center gap-4 mb-10">
          <button onClick={onBack} className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-white/5 transition-colors"
            style={{ border: "1px solid rgba(255,255,255,0.06)" }}>
            <ChevronLeft size={16} color="#B7BAC3" />
          </button>
          <div>
            <div className="badge-gold mb-2 inline-block">{t("passport.officialDocument")}</div>
            <h1 className="orda-cinzel text-3xl font-bold text-[#F6F4EC]">{t("passport.title")}</h1>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left column — identity */}
          <div className="space-y-6">
            <div className="certificate-frame rounded-[24px] p-7 text-center"
              style={{ background: "linear-gradient(135deg, #171A20 0%, #1A1C14 50%, #171A20 100%)" }}>
              <div className="relative w-24 h-24 mx-auto mb-4">
                <div className="w-24 h-24 rounded-full overflow-hidden flex items-center justify-center text-3xl font-bold orda-cinzel"
                  style={{ background: "linear-gradient(135deg,#D4AF37,#C9962C)", color: "#0F1115" }}>
                  {user?.avatar_url ? (
                    <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    (user?.username?.[0] || "?").toUpperCase()
                  )}
                </div>
                <button onClick={() => avatarInputRef.current?.click()} disabled={uploadAvatarMutation.isPending}
                  className="absolute bottom-0 right-0 w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ background: "#22262F", border: "2px solid #0F1115" }}>
                  <Camera size={13} color="#D4AF37" />
                </button>
                <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
              </div>
              <h2 className="orda-cinzel text-xl font-bold text-[#F6F4EC]">{user?.username || "…"}</h2>
              <div className="badge-gold mt-2 inline-block">{stats?.title || t("passport.defaultTitle")}</div>
              <div className="mt-4 pt-4 border-t space-y-2" style={{ borderColor: "rgba(212,175,55,0.1)" }}>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#B7BAC3] orda-inter">{t("passport.registered")}</span>
                  <span className="text-[#F6F4EC] orda-inter">{user ? new Date(user.created_at).toLocaleDateString() : "—"}</span>
                </div>
                {uploadAvatarMutation.isError && (
                  <p className="text-[11px] orda-inter" style={{ color: "#E5484D" }}>
                    {(uploadAvatarMutation.error as Error).message}
                  </p>
                )}
              </div>
            </div>

            {/* Language */}
            <div className="rounded-[16px] p-5" style={{ background: "rgba(34,38,47,0.4)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="flex items-center gap-2 mb-3">
                <Globe size={14} color="#D4AF37" />
                <span className="text-[10px] orda-cinzel tracking-[0.2em] text-[#B7BAC3]">{t("passport.language")}</span>
              </div>
              <select
                value={user?.language || DEFAULT_LANGUAGE}
                onChange={(e) => updateProfileMutation.mutate({ language: e.target.value as ApiLanguage })}
                className="input-field"
                style={{ appearance: "auto" }}>
                {SUPPORTED_LANGUAGES.map((code) => (
                  <option key={code} value={code} style={{ background: "#171A20" }}>{t(`language.${code}`)}</option>
                ))}
              </select>
            </div>

            {/* Settings */}
            <div className="rounded-[16px] p-5" style={{ background: "rgba(34,38,47,0.4)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="flex items-center gap-2 mb-4">
                <Settings size={14} color="#D4AF37" />
                <span className="text-[10px] orda-cinzel tracking-[0.2em] text-[#B7BAC3]">{t("passport.settings")}</span>
              </div>
              <form onSubmit={saveSettings} className="space-y-3">
                <input className="input-field" type="text" placeholder={t("passport.fullNamePlaceholder")} value={fullName}
                  onChange={(e) => setFullName(e.target.value)} />
                <textarea className="input-field resize-none" rows={3} placeholder={t("passport.bioPlaceholder")} value={bio}
                  onChange={(e) => setBio(e.target.value)} />
                {updateProfileMutation.isError && (
                  <p className="text-[11px] orda-inter" style={{ color: "#E5484D" }}>
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
                <div key={label} className="rounded-[16px] p-4 text-center" style={{ background: "rgba(34,38,47,0.4)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div className="text-xl font-bold orda-cinzel text-[#D4AF37]">{value}</div>
                  <div className="text-[10px] orda-inter text-[#B7BAC3] mt-1">{label}</div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-4">
              {[
                [t("passport.visitedCities"), `${citiesVisited}/${cities.length}`, MapPin],
                [t("passport.completedQuests"), `${questsCompleted}/${questsList.length}`, Zap],
                [t("passport.collectedArtifacts"), `${artifactsCollected}/${artifactsList.length}`, Package],
              ].map(([label, value, Icon]) => (
                <div key={label as string} className="rounded-[16px] p-4 text-center" style={{ background: "rgba(212,175,55,0.04)", border: "1px solid rgba(212,175,55,0.1)" }}>
                  {typeof Icon !== "string" && <Icon size={16} color="#D4AF37" className="mx-auto mb-2" />}
                  <div className="text-lg font-bold orda-cinzel text-[#F6F4EC]">{value as string}</div>
                  <div className="text-[10px] orda-inter text-[#B7BAC3] mt-1">{label as string}</div>
                </div>
              ))}
            </div>

            {/* Achievements */}
            <div className="rounded-[20px] p-6" style={{ background: "rgba(34,38,47,0.4)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="flex items-center gap-2 mb-4">
                <Award size={16} color="#D4AF37" />
                <h2 className="orda-cinzel text-sm font-semibold text-[#F6F4EC] tracking-wider">{t("passport.achievements")}</h2>
              </div>
              {achievementsQuery.isLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {Array.from({ length: 2 }).map((_, i) => (
                    <div key={i} className="h-14 rounded-xl" style={{ background: "rgba(255,255,255,0.03)" }} />
                  ))}
                </div>
              ) : achievements.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {achievements.map((achievement) => (
                    <div key={achievement.id} className="flex items-center gap-3 p-3 rounded-xl"
                      style={{ background: "rgba(212,175,55,0.05)", border: "1px solid rgba(212,175,55,0.1)" }}>
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ background: "rgba(212,175,55,0.15)" }}>
                        <Check size={15} color="#D4AF37" />
                      </div>
                      <div>
                        <div className="text-xs orda-cinzel text-[#F6F4EC]">{achievement.title}</div>
                        <div className="text-[10px] orda-inter text-[#B7BAC3]">{achievement.description}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs orda-inter text-[#B7BAC3]">{t("passport.noAchievements")}</p>
              )}
            </div>

            {/* Certificates */}
            <div className="rounded-[20px] p-6" style={{ background: "rgba(34,38,47,0.4)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="flex items-center gap-2 mb-4">
                <BookOpen size={16} color="#D4AF37" />
                <h2 className="orda-cinzel text-sm font-semibold text-[#F6F4EC] tracking-wider">{t("passport.certificates")}</h2>
              </div>
              {certificatesQuery.isLoading ? (
                <div className="h-14 rounded-xl" style={{ background: "rgba(255,255,255,0.03)" }} />
              ) : certificates.length > 0 ? (
                <div className="space-y-2">
                  {certificates.map((certificate) => (
                    <div key={certificate.id} className="flex items-center justify-between p-3 rounded-xl"
                      style={{ background: "rgba(212,175,55,0.05)", border: "1px solid rgba(212,175,55,0.1)" }}>
                      <div>
                        <div className="text-xs orda-cinzel text-[#F6F4EC]">{certificate.title}</div>
                        <div className="text-[10px] orda-inter text-[#B7BAC3]">{new Date(certificate.issued_at).toLocaleDateString()}</div>
                      </div>
                      <span className="badge-gold">{certificate.completion_percent}%</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs orda-inter text-[#B7BAC3]">{t("passport.noCertificates")}</p>
              )}
            </div>

            {/* Journey Timeline */}
            <div className="rounded-[20px] p-6" style={{ background: "rgba(34,38,47,0.4)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="flex items-center gap-2 mb-4">
                <Clock size={16} color="#D4AF37" />
                <h2 className="orda-cinzel text-sm font-semibold text-[#F6F4EC] tracking-wider">{t("passport.journeyTimeline")}</h2>
              </div>
              {summaryQuery.isLoading ? (
                <div className="h-14 rounded-xl" style={{ background: "rgba(255,255,255,0.03)" }} />
              ) : timeline.length > 0 ? (
                <div className="relative">
                  <div className="absolute left-[5px] top-1 bottom-1 w-px" style={{ background: "rgba(212,175,55,0.2)" }} />
                  <div className="space-y-4">
                    {timeline.map((record) => (
                      <div key={record.id} className="flex items-start gap-4 pl-0">
                        <div className="w-[11px] h-[11px] rounded-full mt-1 flex-shrink-0" style={{ background: "#D4AF37" }} />
                        <div>
                          <p className="text-xs orda-inter text-[#F6F4EC]">{describeProgressRecord(t, record, cities, artifactsList, questsList)}</p>
                          <p className="text-[10px] orda-inter text-[#B7BAC3]">{new Date(record.completed_at as string).toLocaleString()}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-xs orda-inter text-[#B7BAC3]">{t("passport.noTimeline")}</p>
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
      style={{ background: "radial-gradient(ellipse at top, rgba(212,175,55,0.04) 0%, #0F1115 60%)" }}>
      <div className="max-w-md w-full glass-dark rounded-[24px] p-8 animate-scale-in">
        {success ? (
          <div className="animate-scale-in text-center py-6">
            <div className="w-14 h-14 mx-auto mb-4 rounded-full flex items-center justify-center"
              style={{ background: "rgba(111,207,151,0.15)" }}>
              <Check size={26} color="#6FCF97" />
            </div>
            <div className="text-[#6FCF97] text-sm orda-cinzel tracking-widest mb-2">
              {mode === "login" ? t("auth.welcomeBackShort") : t("auth.accountCreated")}
            </div>
            <p className="orda-inter text-sm text-[#B7BAC3]">{t("auth.enteringSteppe")}</p>
          </div>
        ) : (
          <>
            <div className="text-center mb-8">
              <div className="w-14 h-14 mx-auto mb-4 rounded-2xl flex items-center justify-center"
                style={{ background: "linear-gradient(135deg,#D4AF37,#C9962C)" }}>
                <span className="text-[#0F1115] font-bold text-xl orda-cinzel">O</span>
              </div>
              <h1 className="orda-cinzel text-2xl font-bold text-[#F6F4EC] mb-2">
                {mode === "login" ? t("auth.welcomeBack") : t("auth.joinJourney")}
              </h1>
              <p className="orda-inter text-sm text-[#B7BAC3]">
                {mode === "login" ? t("auth.signInSubtitle") : t("auth.registerSubtitle")}
              </p>
            </div>

            <div className="flex gap-2 mb-6 p-1 rounded-xl" style={{ background: "rgba(255,255,255,0.03)" }}>
              {(["login", "register"] as const).map((m) => (
                <button key={m} type="button" onClick={() => { setMode(m); setErrors({}); }}
                  className="flex-1 py-2 rounded-lg text-xs orda-cinzel tracking-widest transition-all"
                  style={{ background: mode === m ? "rgba(212,175,55,0.15)" : "transparent", color: mode === m ? "#D4AF37" : "#B7BAC3" }}>
                  {m === "login" ? t("auth.signIn") : t("auth.register")}
                </button>
              ))}
            </div>

            <form onSubmit={submit} className="space-y-4" noValidate>
              <div>
                <input className="input-field" type="email" placeholder={t("auth.email")} value={email}
                  onChange={(e) => setEmail(e.target.value)} />
                {errors.email && <p className="mt-1.5 text-xs orda-inter" style={{ color: "#E5484D" }}>{errors.email}</p>}
              </div>
              {mode === "register" && (
                <>
                  <div>
                    <input className="input-field" type="text" placeholder={t("auth.username")} value={username}
                      onChange={(e) => setUsername(e.target.value)} />
                    {errors.username && <p className="mt-1.5 text-xs orda-inter" style={{ color: "#E5484D" }}>{errors.username}</p>}
                  </div>
                  <input className="input-field" type="text" placeholder={t("auth.fullNameOptional")} value={fullName}
                    onChange={(e) => setFullName(e.target.value)} />
                </>
              )}
              <div>
                <input className="input-field" type="password" placeholder={t("auth.password")} value={password}
                  onChange={(e) => setPassword(e.target.value)} />
                {errors.password && <p className="mt-1.5 text-xs orda-inter" style={{ color: "#E5484D" }}>{errors.password}</p>}
              </div>

              {mode === "login" && (
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded" style={{ accentColor: "#D4AF37" }} />
                  <span className="text-xs orda-inter text-[#B7BAC3]">{t("auth.rememberMe")}</span>
                </label>
              )}

              {activeMutation.error && (
                <p className="text-xs text-center orda-inter" style={{ color: "#E5484D" }}>
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

// ─── APP ──────────────────────────────────────────────────────────────────────
export default function App() {
  const { i18n } = useTranslation();
  const { isAuthenticated, user } = useAuthSession();
  const [view, setView] = useState<View>("landing");
  const [character, setCharacter] = useState<CharType>("explorer");
  const [selectedCity, setSelectedCity] = useState<City | null>(null);
  const [prevView, setPrevView] = useState<View | null>(null);
  const [key, setKey] = useState(0);

  const navigate = (v: View) => {
    const resolved = resolveView(v, isAuthenticated, user?.role ?? null);
    setPrevView(view);
    setView(resolved);
    setKey(k => k + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // If a session expires (or refresh fails) while on a protected view, drop back to auth.
  useEffect(() => {
    if (PROTECTED_VIEWS.includes(view) && !isAuthenticated) {
      navigate("auth");
    }
  }, [isAuthenticated]);

  // Honor the account's saved language preference (e.g. after signing in on a new device).
  useEffect(() => {
    if (user?.language && user.language !== i18n.resolvedLanguage) {
      i18n.changeLanguage(user.language);
    }
  }, [user?.language]);

  const handleCharSelect = (c: CharType) => {
    setCharacter(c);
    navigate("intro");
  };

  const handleCitySelect = (city: City) => {
    setSelectedCity(city);
    navigate("city");
  };

  const handleBack = () => {
    navigate(prevView || "dashboard");
  };

  return (
    <div className="min-h-screen orda-inter" style={{ background: "#0F1115", color: "#F6F4EC" }}>
      <style>{GLOBAL_CSS}</style>

      <NavBar view={view} onNav={navigate} />

      <div key={key} className="view-enter">
        {view === "landing" && (
          <>
            <Landing onStart={() => navigate("chars")} />
            <LandingStory onStart={() => navigate("chars")} />
          </>
        )}
        {view === "chars" && (
          <div className="min-h-screen pt-16" style={{ background: "radial-gradient(ellipse at top, rgba(212,175,55,0.04) 0%, #0F1115 60%)" }}>
            <CharacterSelect onSelect={handleCharSelect} />
          </div>
        )}
        {view === "intro" && (
          <StoryIntro character={character} onBegin={() => navigate("dashboard")} />
        )}
        {view === "auth" && (
          <AuthGate onAuthenticated={() => navigate("dashboard")} />
        )}
        {view === "dashboard" && (
          <Dashboard character={character} onSelectCity={handleCitySelect} onNav={navigate} />
        )}
        {view === "city" && selectedCity && (
          <CityPage city={selectedCity} onBack={() => navigate("dashboard")} onNav={navigate} />
        )}
        {view === "ai" && (
          <AIHistorian onBack={handleBack} />
        )}
        {view === "artifacts" && (
          <ArtifactGallery onBack={handleBack} />
        )}
        {view === "quests" && (
          <QuestView onBack={handleBack} />
        )}
        {view === "certificate" && (
          <Certificate character={character} onBack={() => navigate("dashboard")} />
        )}
        {view === "passport" && (
          <Passport onBack={() => navigate("dashboard")} onLogout={() => navigate("landing")} />
        )}
      </div>
    </div>
  );
}