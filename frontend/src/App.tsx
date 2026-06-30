import { useState, useEffect, useRef } from "react";
import {
  Map, Package, Award, MessageSquare, ChevronRight, Compass, ScrollText,
  ShoppingBag, Globe, Search, Settings, User, Bell, ArrowRight, Play,
  Mic, Send, X, Menu, ChevronDown, Shield, Crown, BookOpen, Clock,
  MapPin, Download, Share2, Check, ChevronLeft, Star, Eye, Mountain,
  Volume2, Paperclip, TrendingUp, Lock, Wind, Zap, Feather
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
type View = "landing" | "chars" | "intro" | "dashboard" | "city" | "ai" | "artifacts" | "quests" | "certificate";
type CharType = "merchant" | "diplomat" | "explorer";

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

// ─── Global Styles ────────────────────────────────────────────────────────────
const GLOBAL_CSS = `
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
`;

// ─── Data ─────────────────────────────────────────────────────────────────────
const CITIES: City[] = [
  {
    id: "sarai-batu", name: "Sarai Batu", subtitle: "Capital of the Golden Horde",
    cx: 370, cy: 295, color: "#D4AF37", size: 10,
    description: "Founded by Batu Khan in 1254, Sarai Batu stood on the west bank of the Akhtuba arm of the Volga River. At its zenith it housed over 600,000 souls — merchants from Venice, scholars from Persia, artisans from China — all sheltered beneath the banners of the Khan.",
    founded: "1254 CE", population: "600,000+",
    facts: ["Largest city in 13th-century Europe", "Home to 13 mosques and a Christian diocese", "Visited by Franciscan friar William of Rubruck", "Produced the finest cobalt-blue ceramics of the era"],
    importance: "The beating heart of the Golden Horde — political, economic, and cultural nexus of the Great Steppe."
  },
  {
    id: "sarayshyk", name: "Sarayshyk", subtitle: "Gateway to Central Asia",
    cx: 490, cy: 295, color: "#C9962C", size: 7,
    description: "Positioned at the bend of the Ural (Yaik) River, Sarayshyk commanded the overland trade route between the Caspian and the steppes. Caravans laden with silk, spices, and furs paused here to rest and pay tribute before continuing east.",
    founded: "1220s CE", population: "80,000+",
    facts: ["Burial place of seven Golden Horde Khans", "Major waystation on the Silk Road", "Famous for its silk workshops and goldsmiths"],
    importance: "The eastern gateway — where Central Asian and Steppe cultures fused into the unique Golden Horde civilization."
  },
  {
    id: "otrar", name: "Otrar", subtitle: "City That Changed History",
    cx: 730, cy: 415, color: "#C9962C", size: 7,
    description: "Otrar's governor Inalchuq ignited the Mongol conquest by massacring Genghis Khan's 500-man trade mission in 1218. The city paid dearly — a six-month siege, then complete destruction. Rebuilt under the Golden Horde, it rose again as a major Silk Road waystation.",
    founded: "4th century CE", population: "120,000+",
    facts: ["Incident here sparked the Mongol invasion of the Islamic world", "Birthplace of philosopher Al-Farabi", "Site of Timur's death in 1405", "Extensive library rivalling those of Baghdad"],
    importance: "The crossroads of destiny — where a single act of greed redirected the course of world history."
  },
  {
    id: "sygnak", name: "Sygnak", subtitle: "Throne of the White Horde",
    cx: 630, cy: 415, color: "#B7BAC3", size: 6,
    description: "Sygnak served as the capital of the White Horde — the eastern wing of the Golden Horde empire. Perched above the Syr Darya, its blue-tiled minarets gleamed across the steppe and its bazaars hummed with the trade of two continents.",
    founded: "9th century CE", population: "50,000+",
    facts: ["Capital of the Ak Orda (White Horde)", "Major center of Sufi scholarship", "Crossroads of nomadic and sedentary cultures"],
    importance: "The eastern throne — center of the Jochid dynasty's dominion over the steppes of modern Kazakhstan."
  },
  {
    id: "bolgar", name: "Bolgar", subtitle: "Northern Jewel of the Horde",
    cx: 418, cy: 105, color: "#B7BAC3", size: 6,
    description: "The ancient Volga Bulgarian city of Bolgar became a major northern hub of the Golden Horde, famous for its fur trade, honey, and amber. Its massive caravanserai welcomed merchants from Scandinavia, Russia, and Persia alike.",
    founded: "7th century CE", population: "70,000+",
    facts: ["Where Islam first came to the Volga region in 922 CE", "Major source of northern furs for the Mediterranean", "UNESCO World Heritage Site"],
    importance: "The northern anchor — bridging the Horde's steppe world with the forests and kingdoms of medieval Russia and Scandinavia."
  },
  {
    id: "kaffa", name: "Kaffa", subtitle: "Pearl of the Black Sea",
    cx: 92, cy: 335, color: "#B7BAC3", size: 6,
    description: "The Crimean port city of Kaffa was the Golden Horde's window to the Mediterranean world. A Genoese colony under Mongol suzerainty, its harbour bristled with the masts of a thousand ships carrying silk east and furs west.",
    founded: "6th century BCE", population: "80,000+",
    facts: ["The Black Death likely entered Europe via Kaffa in 1347", "Genoese colony paying tribute to the Khan", "Largest slave market north of the Caucasus"],
    importance: "The gateway to Europe — where the wealth of the Golden Horde flowed into the veins of Mediterranean commerce."
  },
];

const ARTIFACTS: Artifact[] = [
  { id: "a1", name: "Khan's Golden Jug", category: "Vessels", description: "A ceremonial ewer of hammered gold adorned with turquoise inlay, used at the court of Özbeg Khan. The intertwining dragon motifs reflect the fusion of Chinese and Persian artistic traditions.", found: "Sarai Batu, 1961", city: "Sarai Batu", icon: "🏺", rarity: "legendary" },
  { id: "a2", name: "Silk Road Dirham", category: "Coins", description: "Silver dirham minted at Sarai under the reign of Berke Khan (1257–1267), the first Mongol ruler to convert to Islam. Arabic inscriptions praise Allah and name the mint city.", found: "Sarayshyk, 1973", city: "Sarayshyk", icon: "🪙", rarity: "common" },
  { id: "a3", name: "Warrior's Sabre", category: "Weapons", description: "A curved steel sabre of Mongolian manufacture, its crossguard decorated with silver knotwork. The blade bears a Persian inscription: 'In the name of God, the Victorious.'", found: "Bolgar, 1955", city: "Bolgar", icon: "⚔️", rarity: "rare" },
  { id: "a4", name: "Steppe Emerald Necklace", category: "Jewelry", description: "Forty-three Colombian emeralds set in granulated gold, traded across three continents before resting around the neck of a Golden Horde noblewoman. A testament to global trade in the 14th century.", found: "Crimea, 1947", city: "Kaffa", icon: "💎", rarity: "legendary" },
  { id: "a5", name: "Parchment Map of Sarai", category: "Maps", description: "A fragment of a city plan drawn by an unknown Genoese cartographer circa 1330 CE, showing streets, mosques, and the Khan's palace complex in Sarai Batu. One of only three such maps known to exist.", found: "Venice archives, 1882", city: "Sarai Batu", icon: "🗺️", rarity: "legendary" },
  { id: "a6", name: "Khan's Diplomatic Letter", category: "Documents", description: "A 1263 CE letter from Khan Berke to French King Louis IX, proposing a military alliance against the Ilkhanate. Written in Arabic on thick Egyptian papyrus, sealed with the Golden Horde tamga.", found: "Paris, Bibliothèque nationale", city: "Sarai Batu", icon: "📜", rarity: "rare" },
  { id: "a7", name: "Blue Ceramic Bowl", category: "Vessels", description: "Cobalt-glazed ceramic bowl from a Sarai workshop, circa 1320 CE. The swirling arabesque patterns in deep blue and white reflect the height of Golden Horde artistic achievement.", found: "Sarai Batu, 1958", city: "Sarai Batu", icon: "🫙", rarity: "common" },
  { id: "a8", name: "Bronze Inkwell", category: "Tools", description: "A scholar's inkwell cast in intricate bronze, found in the ruins of Otrar's famous library. The geometric patterns are typical of 13th-century Islamic metalwork from the Syr Darya region.", found: "Otrar, 1978", city: "Otrar", icon: "🖋️", rarity: "rare" },
];

const CHARACTER_DATA = {
  merchant: {
    name: "The Merchant",
    title: "Ibn Battuta's Companion",
    description: "Travel the legendary Silk Road. Negotiate in the bazaars of Sarai, forge trade alliances, and amass a fortune that spans three continents.",
    icon: ShoppingBag, traits: ["Resourceful", "Multilingual", "Cunning"],
    color: "#D4AF37",
  },
  diplomat: {
    name: "The Diplomat",
    title: "Voice of the Khan",
    description: "Navigate the treacherous courts of kings and khans. Craft alliances, decode politics, and shape the destiny of an empire through words, not swords.",
    icon: ScrollText, traits: ["Eloquent", "Strategic", "Patient"],
    color: "#57D6D1",
  },
  explorer: {
    name: "The Explorer",
    title: "Seeker of Lost Cities",
    description: "Venture into the unknown. Unearth forgotten ruins, decode ancient scripts, and piece together the true story of the world's greatest steppe empire.",
    icon: Compass, traits: ["Daring", "Perceptive", "Scholarly"],
    color: "#6FCF97",
  },
};

const AI_RESPONSES: Record<string, string[]> = {
  default: [
    "The Golden Horde — known as Altan Orda in Mongolian, Altyn Orda in Kazakh — was not merely a conquest state. At its peak under Özbeg Khan (1313–1341), it was a sophisticated multicultural empire where Muslim scholars, Christian missionaries, Buddhist monks, and Shamanist priests all coexisted beneath one banner.",
    "Consider this: when Marco Polo traveled east in the 1270s, Kublai Khan's realm was famous in Europe. Yet the Golden Horde — equally vast, arguably more cosmopolitan — remained poorly understood in Western historiography for centuries. We are only now beginning to appreciate its true complexity.",
    "The Silk Road under Golden Horde protection was arguably the most active it had ever been. The Pax Mongolica — Mongol Peace — allowed a merchant to travel from the Black Sea to China without fear of bandits. This is what enabled the Renaissance's influx of goods, ideas, and diseases.",
    "Sarai Batu's population at its height exceeded that of contemporary London, Paris, or Rome. Yet while European cities are remembered in every history book, Sarai — buried beneath the Volga floodplain — was forgotten for centuries. It is archaeology, not chronicle, that is restoring its memory.",
  ],
  greeting: [
    "As-salamu alaykum, traveler. I am ORDA, your guide through the ages of the Great Steppe. Ask me of khans and caravans, of golden cities and forgotten battles — I am here to illuminate the past with the light of knowledge.",
  ],
};

const QUESTS = [
  { id: "q1", title: "The Silk Route", city: "Sarai Batu", xp: 150, description: "A Byzantine merchant offers you a deal: half his silk for safe passage through Mongol territory. Do you accept and risk the Khan's displeasure, or decline and lose the profit?" },
  { id: "q2", title: "The Khan's Audience", city: "Sarai Batu", xp: 200, description: "Özbeg Khan grants you an audience. He asks your opinion on converting the Horde to Islam. Your answer will shape the empire's future." },
  { id: "q3", title: "The Lost Caravan", city: "Sarayshyk", xp: 120, description: "A caravan of 80 merchants has vanished between Sarayshyk and Otrar. The route crosses territory claimed by rival clans. You must find them." },
];

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
  const map = { legendary: ["#D4AF37", "LEGENDARY"], rare: ["#57D6D1", "RARE"], common: ["#B7BAC3", "COMMON"] };
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
function NavBar({ view, onNav }: { view: View; onNav: (v: View) => void }) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", h);
    return () => window.removeEventListener("scroll", h);
  }, []);

  const inApp = ["dashboard", "city", "ai", "artifacts", "quests", "certificate"].includes(view);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 transition-all duration-500"
      style={{ background: scrolled || inApp ? "rgba(15,17,21,0.92)" : "transparent", backdropFilter: scrolled || inApp ? "blur(20px)" : "none", borderBottom: scrolled || inApp ? "1px solid rgba(255,255,255,0.06)" : "none" }}>
      <div className="max-w-[1440px] mx-auto px-6 lg:px-12 h-16 flex items-center justify-between">
        <button onClick={() => onNav("landing")} className="flex items-center gap-3 group">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg,#D4AF37,#C9962C)" }}>
            <span className="text-[#0F1115] font-bold text-sm orda-cinzel">O</span>
          </div>
          <span className="text-lg font-bold orda-cinzel tracking-[0.2em] text-[#D4AF37]">ORDA</span>
        </button>

        <div className="hidden md:flex items-center gap-8">
          {inApp && [
            ["Journey", "dashboard"], ["Map", "dashboard"], ["Artifacts", "artifacts"], ["AI Historian", "ai"],
          ].map(([label, target]) => (
            <button key={label} onClick={() => onNav(target as View)}
              className="text-sm orda-cinzel tracking-widest transition-colors duration-200"
              style={{ color: view === target ? "#D4AF37" : "#B7BAC3" }}
              onMouseEnter={e => { if (view !== target) (e.target as HTMLElement).style.color = "#F6F4EC"; }}
              onMouseLeave={e => { if (view !== target) (e.target as HTMLElement).style.color = "#B7BAC3"; }}>
              {label}
            </button>
          ))}
          {!inApp && ["Journey", "Map", "Artifacts", "AI Historian", "About"].map((label) => (
            <button key={label}
              className="text-sm orda-cinzel tracking-widest text-[#B7BAC3] hover:text-[#F6F4EC] transition-colors">
              {label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
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
            <button className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold orda-cinzel"
              style={{ background: "linear-gradient(135deg,#D4AF37,#C9962C)", color: "#0F1115" }}>
              E
            </button>
          ) : (
            <button onClick={() => onNav("chars")} className="btn-primary text-sm py-2 px-5">
              Enter
            </button>
          )}
          <button className="md:hidden" onClick={() => setMenuOpen(!menuOpen)}>
            <Menu size={20} color="#F6F4EC" />
          </button>
        </div>
      </div>
      {menuOpen && (
        <div className="md:hidden glass-dark border-t border-white/5 px-6 py-4 flex flex-col gap-4">
          {["Journey", "Map", "Artifacts", "AI Historian"].map(label => (
            <button key={label} className="text-sm orda-cinzel tracking-widest text-[#B7BAC3] text-left">{label}</button>
          ))}
        </div>
      )}
    </nav>
  );
}

// ─── LANDING PAGE ─────────────────────────────────────────────────────────────
function Landing({ onStart }: { onStart: () => void }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { const t = setTimeout(() => setMounted(true), 100); return () => clearTimeout(t); }, []);

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
            AI Historical Journey
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
          Discover ancient cities, talk to an AI historian, complete interactive quests and become a true explorer of the Great Steppe.
        </p>

        {/* CTA Buttons */}
        <div className={`flex flex-col sm:flex-row gap-4 transition-all duration-1000 delay-500 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
          <button onClick={onStart} className="btn-primary text-base px-10 py-4 flex items-center gap-3">
            <span>Start Journey</span>
            <ArrowRight size={18} />
          </button>
          <button className="btn-ghost text-base px-10 py-4 flex items-center gap-3">
            <Play size={16} />
            <span>Watch Demo</span>
          </button>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-scroll">
        <span className="text-[#B7BAC3] text-xs tracking-[0.2em] orda-cinzel">SCROLL</span>
        <ChevronDown size={16} color="#D4AF37" />
      </div>

      {/* Features strip */}
      <div className="absolute bottom-0 left-0 right-0 h-16 flex items-center justify-center gap-12 border-t"
        style={{ borderColor: "rgba(255,255,255,0.04)", background: "rgba(15,17,21,0.7)", backdropFilter: "blur(20px)" }}>
        {[["6 Cities", MapPin], ["200+ Quests", Zap], ["AI Historian", MessageSquare], ["3D Artifacts", Package]].map(([label, Icon]) => (
          <div key={label as string} className="flex items-center gap-2 text-[#B7BAC3] text-sm orda-inter">
            <Icon size={14} color="#D4AF37" />
            <span>{label as string}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── CHARACTER SELECTION ──────────────────────────────────────────────────────
function CharacterSelect({ onSelect }: { onSelect: (c: CharType) => void }) {
  const [hovered, setHovered] = useState<CharType | null>(null);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-24 relative">
      <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at center top, rgba(212,175,55,0.04) 0%, transparent 60%)" }} />

      <div className="animate-fade-in text-center mb-16">
        <div className="badge-gold mb-6 inline-block">CHAPTER I</div>
        <h1 className="orda-cinzel text-4xl md:text-5xl font-bold text-[#F6F4EC] mb-4">Choose Your Path</h1>
        <p className="orda-inter text-[#B7BAC3] text-base max-w-md mx-auto leading-relaxed">
          Your role shapes the journey. Each path reveals a different face of the Golden Horde's magnificent story.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl w-full">
        {(Object.entries(CHARACTER_DATA) as [CharType, typeof CHARACTER_DATA[CharType]][]).map(([key, char], i) => {
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
                Choose {char.name.split(" ")[1]}
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
  const [phase, setPhase] = useState(0);
  const char = CHARACTER_DATA[character];

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

            <div className="text-[#D4AF37] text-xs tracking-[0.3em] orda-cinzel mb-6">— THE ORACLE SPEAKS —</div>

            <blockquote className="orda-cormorant text-2xl md:text-3xl text-[#F6F4EC] leading-relaxed italic font-light mb-6">
              "The year is XIII century. The Great Steppe awaits. Your journey begins in the capital of the Golden Horde — Sarai Batu, city of ten thousand souls."
            </blockquote>

            <div className="flex items-center justify-center gap-3 text-sm text-[#B7BAC3] orda-inter">
              <span className="w-8 h-px bg-[#D4AF37]/30" />
              <span>You are <span className="text-[#D4AF37]">{char.name}</span></span>
              <span className="w-8 h-px bg-[#D4AF37]/30" />
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className={`transition-all duration-1000 delay-700 ${phase >= 3 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
          <button onClick={onBegin} className="btn-primary text-base px-14 py-4 flex items-center gap-3 mx-auto">
            <span>Begin Adventure</span>
            <ChevronRight size={18} />
          </button>
          <p className="text-[#B7BAC3] text-xs mt-4 orda-inter tracking-wide">
            The Great Steppe remembers those who dare to explore it.
          </p>
        </div>
      </div>

      <DustParticles />
    </div>
  );
}

// ─── INTERACTIVE MAP ──────────────────────────────────────────────────────────
function InteractiveMap({ onSelectCity }: { onSelectCity: (city: City) => void }) {
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
        {CITIES.map((city) => {
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
          <text x="40" y="14" textAnchor="middle" fill="rgba(212,175,55,0.5)" fontSize="8" fontFamily="Inter,sans-serif">500 km</text>
        </g>

        {/* Title overlay */}
        <text x="450" y="32" textAnchor="middle" fill="rgba(212,175,55,0.35)"
          fontSize="11" fontFamily="Cinzel,serif" letterSpacing="4">
          GOLDEN HORDE TERRITORY · XIII–XV CENTURY
        </text>
      </svg>

      {/* Hover tooltip */}
      {hovered && (() => {
        const city = CITIES.find(c => c.id === hovered);
        if (!city) return null;
        return (
          <div className="absolute bottom-4 left-4 glass rounded-[14px] px-4 py-3 pointer-events-none animate-fade-in"
            style={{ maxWidth: 240 }}>
            <div className="text-[#D4AF37] text-xs orda-cinzel tracking-widest mb-1">{city.name}</div>
            <div className="text-[#B7BAC3] text-xs orda-inter">{city.subtitle}</div>
            <div className="text-[#B7BAC3] text-xs orda-inter mt-1">Click to explore →</div>
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
  const char = CHARACTER_DATA[character];
  const [activeQuest] = useState(QUESTS[0]);
  const progress = 34;

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
              <span className="text-xs orda-cinzel tracking-widest text-[#B7BAC3]">JOURNEY</span>
              <span className="text-[#D4AF37] text-sm font-semibold orda-cinzel">{progress}%</span>
            </div>
            <div className="w-full h-1.5 rounded-full mb-3" style={{ background: "rgba(255,255,255,0.06)" }}>
              <div className="h-full rounded-full progress-bar-fill"
                style={{ width: `${progress}%`, background: "linear-gradient(90deg,#D4AF37,#C9962C)" }} />
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[["2/6", "Cities"], ["8", "Artifacts"], ["3", "Quests"]].map(([v, l]) => (
                <div key={l} className="text-center">
                  <div className="text-[#D4AF37] text-sm font-bold orda-cinzel">{v}</div>
                  <div className="text-[#B7BAC3] text-[10px] orda-inter">{l}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Current Quest */}
          <div>
            <div className="text-[10px] orda-cinzel tracking-[0.2em] text-[#B7BAC3] mb-3 px-1">ACTIVE QUEST</div>
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
          </div>

          {/* Recent Artifacts */}
          <div>
            <div className="flex items-center justify-between mb-3 px-1">
              <span className="text-[10px] orda-cinzel tracking-[0.2em] text-[#B7BAC3]">ARTIFACTS</span>
              <button onClick={() => onNav("artifacts")} className="text-[10px] text-[#D4AF37] orda-inter hover:opacity-70">See all</button>
            </div>
            <div className="space-y-2">
              {ARTIFACTS.slice(0, 3).map(a => (
                <div key={a.id} className="flex items-center gap-3 p-2.5 rounded-xl cursor-pointer hover:bg-white/[0.03] transition-colors">
                  <span className="text-lg">{a.icon}</span>
                  <div>
                    <div className="text-[#F6F4EC] text-xs orda-cinzel">{a.name}</div>
                    <div className="text-[#B7BAC3] text-[10px] orda-inter">{a.category}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Achievements */}
          <div>
            <div className="text-[10px] orda-cinzel tracking-[0.2em] text-[#B7BAC3] mb-3 px-1">ACHIEVEMENTS</div>
            <div className="space-y-2">
              {[["First Step", "Began the journey", true], ["Merchant's Eye", "Visit first city", true], ["Map Reader", "Open the full map", false]].map(([name, desc, unlocked]) => (
                <div key={name as string} className="flex items-center gap-3 p-2 rounded-xl"
                  style={{ background: unlocked ? "rgba(212,175,55,0.05)" : "transparent", opacity: unlocked ? 1 : 0.4 }}>
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                    style={{ background: unlocked ? "rgba(212,175,55,0.15)" : "rgba(255,255,255,0.04)" }}>
                    {unlocked ? <Check size={13} color="#D4AF37" /> : <Lock size={12} color="#B7BAC3" />}
                  </div>
                  <div>
                    <div className="text-xs orda-cinzel text-[#F6F4EC]">{name as string}</div>
                    <div className="text-[10px] orda-inter text-[#B7BAC3]">{desc as string}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* Map Center */}
        <main className="p-4 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="orda-cinzel text-base font-bold text-[#F6F4EC] tracking-wider">Interactive Map</h2>
              <p className="text-xs text-[#B7BAC3] orda-inter">Golden Horde Territory · Select a city to explore</p>
            </div>
            <div className="flex gap-2">
              {["Routes", "Cities", "Rivers"].map((label, i) => (
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
            <InteractiveMap onSelectCity={onSelectCity} />
          </div>
          {/* City quick-access row */}
          <div className="mt-4 flex gap-3 overflow-x-auto pb-1">
            {CITIES.map(city => (
              <button key={city.id} onClick={() => onSelectCity(city)}
                className="flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl text-xs orda-cinzel tracking-wide transition-all hover:border-[#D4AF3750] hover:text-[#D4AF37]"
                style={{ background: "rgba(34,38,47,0.6)", border: "1px solid rgba(255,255,255,0.06)", color: "#B7BAC3" }}>
                <MapPin size={11} color="#D4AF37" />
                {city.name}
              </button>
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
                <div className="text-sm orda-cinzel text-[#57D6D1]">AI Historian</div>
                <div className="text-[10px] orda-inter text-[#B7BAC3]">Ask anything</div>
              </div>
            </div>
            <p className="text-xs text-[#B7BAC3] orda-inter leading-relaxed line-clamp-3">
              "The Golden Horde was arguably the most cosmopolitan empire of the 13th century. Ask me about its trade, politics, or art..."
            </p>
            <button className="mt-3 w-full py-2 rounded-xl text-xs orda-cinzel tracking-widest transition-colors"
              style={{ background: "rgba(87,214,209,0.1)", color: "#57D6D1", border: "1px solid rgba(87,214,209,0.15)" }}>
              Open AI Historian →
            </button>
          </div>

          {/* Progress rings */}
          <div className="rounded-[16px] p-4" style={{ background: "rgba(34,38,47,0.4)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="text-[10px] orda-cinzel tracking-[0.2em] text-[#B7BAC3] mb-4">EXPLORER LEVEL</div>
            <div className="flex items-center justify-center gap-6">
              <div className="flex flex-col items-center gap-2">
                <div className="relative">
                  <ProgressRing value={34} size={72} />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-sm font-bold orda-cinzel text-[#D4AF37]">34%</span>
                  </div>
                </div>
                <span className="text-[10px] text-[#B7BAC3] orda-inter">Journey</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <div className="relative">
                  <ProgressRing value={60} size={72} />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-sm font-bold orda-cinzel text-[#D4AF37]">60%</span>
                  </div>
                </div>
                <span className="text-[10px] text-[#B7BAC3] orda-inter">Quests</span>
              </div>
            </div>
            <div className="mt-4 p-3 rounded-xl text-center"
              style={{ background: "rgba(212,175,55,0.05)", border: "1px solid rgba(212,175,55,0.1)" }}>
              <div className="text-[#D4AF37] text-sm font-bold orda-cinzel">Level 3</div>
              <div className="text-[#B7BAC3] text-[10px] orda-inter">Steppe Wanderer</div>
            </div>
          </div>

          {/* Notifications */}
          <div>
            <div className="text-[10px] orda-cinzel tracking-[0.2em] text-[#B7BAC3] mb-3 px-1">NOTIFICATIONS</div>
            <div className="space-y-2">
              {[
                { icon: "⚜", text: "New quest unlocked in Sarai Batu", time: "2m ago", color: "#D4AF37" },
                { icon: "🏺", text: "Artifact discovered: Golden Jug", time: "1h ago", color: "#6FCF97" },
                { icon: "📜", text: "AI has new insights about Bolgar", time: "3h ago", color: "#57D6D1" },
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
              <span className="text-sm orda-cinzel text-[#D4AF37]">Certificate</span>
            </div>
            <p className="text-xs text-[#B7BAC3] orda-inter">Complete your journey to earn your Explorer certificate</p>
          </div>
        </aside>
      </div>
    </div>
  );
}

// ─── CITY PAGE ────────────────────────────────────────────────────────────────
function CityPage({ city, onBack, onNav }: { city: City; onBack: () => void; onNav: (v: View) => void }) {
  const [activeTab, setActiveTab] = useState<"overview" | "timeline" | "gallery" | "stats">("overview");

  const timelineEvents = [
    { year: "1220s", event: "Mongol forces first arrive in the region under Jochi Khan" },
    { year: city.founded, event: `${city.name} established as a major Golden Horde settlement` },
    { year: "1280s", event: "City reaches peak prosperity under Tuda-Mengu Khan" },
    { year: "1313", event: "Özbeg Khan converts to Islam — city mosques multiply" },
    { year: "1395", event: "Timur's invasion devastates the Golden Horde" },
    { year: "1438", event: "Dissolution of the unified Golden Horde begins" },
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
            <ChevronLeft size={16} /> Back to Map
          </button>
          <div className="flex items-end gap-6">
            <div>
              <div className="badge-gold mb-3">GOLDEN HORDE CITY</div>
              <h1 className="orda-cinzel text-4xl md:text-5xl font-bold text-[#F6F4EC] mb-2 gold-glow-text">{city.name}</h1>
              <p className="orda-cormorant text-xl text-[#D4AF37] italic">{city.subtitle}</p>
            </div>
            <div className="ml-auto flex gap-3 flex-shrink-0">
              <button onClick={() => onNav("quests")} className="btn-primary text-sm py-3 px-6 flex items-center gap-2">
                <Zap size={14} /> Quest
              </button>
              <button onClick={() => onNav("ai")} className="btn-teal text-sm py-3 px-6 flex items-center gap-2">
                <MessageSquare size={14} /> Talk to AI
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
            {tab}
          </button>
        ))}
      </div>

      <div className="max-w-[1200px] mx-auto px-8 lg:px-16 py-10">
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-slide-up">
            <div className="lg:col-span-2 space-y-6">
              {/* Description */}
              <div className="rounded-[20px] p-7" style={{ background: "rgba(34,38,47,0.5)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <h2 className="orda-cinzel text-lg font-semibold text-[#F6F4EC] mb-4">Historical Overview</h2>
                <p className="orda-inter text-[#B7BAC3] leading-[1.85] text-base">{city.description}</p>
              </div>

              {/* Importance */}
              <div className="rounded-[20px] p-7" style={{ background: "rgba(212,175,55,0.04)", border: "1px solid rgba(212,175,55,0.1)" }}>
                <div className="flex items-center gap-3 mb-3">
                  <Crown size={18} color="#D4AF37" />
                  <h2 className="orda-cinzel text-base font-semibold text-[#D4AF37]">Strategic Importance</h2>
                </div>
                <p className="orda-cormorant text-xl italic text-[#F6F4EC] leading-relaxed">{city.importance}</p>
              </div>

              {/* Facts */}
              <div className="rounded-[20px] p-7" style={{ background: "rgba(34,38,47,0.5)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <h2 className="orda-cinzel text-base font-semibold text-[#F6F4EC] mb-4">Remarkable Facts</h2>
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
              {[["Founded", city.founded], ["Population", city.population], ["Era", "XIII–XV Century"], ["Region", "Golden Horde Ulus"]].map(([k, v]) => (
                <div key={k} className="rounded-[16px] p-5" style={{ background: "rgba(34,38,47,0.4)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div className="text-[10px] orda-cinzel tracking-[0.2em] text-[#B7BAC3] mb-1">{k}</div>
                  <div className="text-[#F6F4EC] text-base orda-cinzel font-semibold">{v}</div>
                </div>
              ))}

              {/* Related Artifacts */}
              <div className="rounded-[16px] p-5" style={{ background: "rgba(34,38,47,0.4)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div className="text-[10px] orda-cinzel tracking-[0.2em] text-[#B7BAC3] mb-3">CITY ARTIFACTS</div>
                {ARTIFACTS.filter(a => a.city === city.name).slice(0, 3).map(a => (
                  <div key={a.id} className="flex items-center gap-2 py-2 border-b border-white/5 last:border-0">
                    <span>{a.icon}</span>
                    <div>
                      <div className="text-xs orda-cinzel text-[#F6F4EC]">{a.name}</div>
                      <RarityBadge rarity={a.rarity} />
                    </div>
                  </div>
                ))}
                <button onClick={() => onNav("artifacts")} className="mt-3 w-full py-2 rounded-xl text-xs orda-cinzel text-[#D4AF37] hover:bg-[#D4AF3710] transition-colors">
                  View All Artifacts →
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === "timeline" && (
          <div className="max-w-2xl animate-slide-up">
            <h2 className="orda-cinzel text-xl font-bold text-[#F6F4EC] mb-8">Historical Timeline</h2>
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
            <h2 className="orda-cinzel text-xl font-bold text-[#F6F4EC] mb-8">Gallery</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {Array.from({ length: 6 }, (_, i) => (
                <div key={i} className="aspect-[4/3] rounded-[16px] overflow-hidden relative gold-hover cursor-pointer"
                  style={{ background: `linear-gradient(${135 + i * 30}deg, rgba(212,175,55,0.08), rgba(34,38,47,0.8))`, border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-4xl mb-2">{["🏛️", "🗺️", "⚔️", "🪙", "🏺", "📜"][i]}</div>
                      <div className="text-xs orda-cinzel text-[#B7BAC3]">Historical View {i + 1}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "stats" && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-slide-up">
            {[
              ["Trade Routes", "12", "Connected cities"],
              ["Mosques", "13", "At city's peak"],
              ["Population", city.population, "13th century"],
              ["Languages", "7+", "Spoken in markets"],
              ["Crafts", "40+", "Documented trades"],
              ["Caravanserais", "8", "Waystation inns"],
              ["Palaces", "3", "Royal residences"],
              ["Centuries", "3", "Of Golden Horde rule"],
            ].map(([label, value, sub]) => (
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
  const [messages, setMessages] = useState<{ role: "ai" | "user"; text: string }[]>([
    { role: "ai", text: AI_RESPONSES.greeting[0] },
  ]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [responseIdx, setResponseIdx] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);

  const send = () => {
    if (!input.trim()) return;
    const userMsg = input.trim();
    setInput("");
    setMessages(m => [...m, { role: "user", text: userMsg }]);
    setTyping(true);

    setTimeout(() => {
      const resp = AI_RESPONSES.default[responseIdx % AI_RESPONSES.default.length];
      setMessages(m => [...m, { role: "ai", text: resp }]);
      setResponseIdx(i => i + 1);
      setTyping(false);
    }, 1800 + Math.random() * 800);
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  const suggestions = [
    "What was daily life like in Sarai Batu?",
    "Tell me about Khan Özbeg's conversion to Islam",
    "How did the Silk Road work under the Golden Horde?",
    "What happened to the empire after Timur's invasion?",
  ];

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
              <h1 className="orda-cinzel text-lg font-bold text-[#F6F4EC]">ORDA Oracle</h1>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#6FCF97]" style={{ boxShadow: "0 0 6px rgba(111,207,151,0.6)" }} />
                <span className="text-xs orda-inter text-[#B7BAC3]">AI Historian · Active</span>
              </div>
            </div>
          </div>
          <div className="badge-teal">BETA</div>
        </div>

        {/* Suggested questions (show initially) */}
        {messages.length === 1 && (
          <div className="mb-6 animate-slide-up">
            <p className="text-xs orda-cinzel tracking-widest text-[#B7BAC3] mb-3">SUGGESTED QUESTIONS</p>
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
                      <BookOpen size={10} /> Based on historical records
                    </span>
                    <span className="text-[10px] orda-cinzel text-[#D4AF37]">ORDA AI</span>
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
              placeholder="Ask the Oracle about the Golden Horde..."
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
            AI responses are based on verified historical scholarship · 13th–15th century CE
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── ARTIFACT GALLERY ─────────────────────────────────────────────────────────
function ArtifactGallery({ onBack }: { onBack: () => void }) {
  const [selected, setSelected] = useState<Artifact | null>(null);
  const [filter, setFilter] = useState("All");
  const categories = ["All", ...Array.from(new Set(ARTIFACTS.map(a => a.category)))];
  const filtered = filter === "All" ? ARTIFACTS : ARTIFACTS.filter(a => a.category === filter);

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
            <h1 className="orda-cinzel text-3xl font-bold text-[#F6F4EC]">Artifact Collection</h1>
            <p className="orda-inter text-sm text-[#B7BAC3] mt-1">{ARTIFACTS.length} objects recovered from the Great Steppe</p>
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
              {cat}
            </button>
          ))}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {filtered.map((artifact, i) => (
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
              {[["Found", selected.found], ["City", selected.city]].map(([k, v]) => (
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
  const [activeQuest, setActiveQuest] = useState(QUESTS[0]);
  const [chosen, setChosen] = useState<null | "A" | "B">(null);

  const choices = {
    q1: { A: "Accept the deal — profit first, politics second.", B: "Decline — loyalty to the Khan is worth more than silk." },
    q2: { A: "Support the conversion — unity under Islam will strengthen the Horde.", B: "Counsel caution — religious change risks alienating the Shamanist clans." },
    q3: { A: "Take the northern route through friendly clan territory.", B: "Ride south through the desert — shorter but dangerous." },
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
            <h1 className="orda-cinzel text-3xl font-bold text-[#F6F4EC]">Quest Log</h1>
            <p className="orda-inter text-sm text-[#B7BAC3] mt-1">Choose your path wisely — history remembers every decision</p>
          </div>
        </div>

        {/* Quest list */}
        <div className="grid grid-cols-1 gap-3 mb-8">
          {QUESTS.map((q) => (
            <div key={q.id} onClick={() => { setActiveQuest(q); setChosen(null); }}
              className="rounded-[16px] p-5 cursor-pointer quest-card"
              style={{
                background: activeQuest.id === q.id ? "rgba(212,175,55,0.08)" : "rgba(34,38,47,0.4)",
                border: `1px solid ${activeQuest.id === q.id ? "rgba(212,175,55,0.25)" : "rgba(255,255,255,0.06)"}`,
              }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                    style={{ background: "rgba(212,175,55,0.1)", border: "1px solid rgba(212,175,55,0.2)" }}>
                    <Zap size={16} color="#D4AF37" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold orda-cinzel text-[#F6F4EC]">{q.title}</div>
                    <div className="text-[11px] orda-inter text-[#B7BAC3]">{q.city}</div>
                  </div>
                </div>
                <span className="badge-gold">+{q.xp} XP</span>
              </div>
            </div>
          ))}
        </div>

        {/* Active Quest */}
        <div className="rounded-[24px] p-8" style={{ background: "rgba(23,26,32,0.8)", border: "1px solid rgba(212,175,55,0.12)" }}>
          <div className="badge-gold mb-4">ACTIVE QUEST</div>
          <h2 className="orda-cinzel text-2xl font-bold text-[#F6F4EC] mb-2">{activeQuest.title}</h2>
          <div className="flex items-center gap-2 mb-6">
            <MapPin size={12} color="#D4AF37" />
            <span className="text-sm orda-inter text-[#B7BAC3]">{activeQuest.city}</span>
          </div>
          <p className="orda-cormorant text-xl italic text-[#F6F4EC] leading-relaxed mb-8">{activeQuest.description}</p>

          {!chosen ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {(["A", "B"] as const).map((opt) => (
                <button key={opt} onClick={() => setChosen(opt)}
                  className="p-5 rounded-[16px] text-left transition-all card-hover gold-hover"
                  style={{ background: "rgba(34,38,47,0.6)", border: "1px solid rgba(255,255,255,0.08)" }}>
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center mb-3"
                    style={{ background: "rgba(212,175,55,0.12)", border: "1px solid rgba(212,175,55,0.2)" }}>
                    <span className="text-xs font-bold orda-cinzel text-[#D4AF37]">{opt}</span>
                  </div>
                  <p className="orda-inter text-sm text-[#B7BAC3] leading-relaxed">
                    {choices[activeQuest.id as keyof typeof choices]?.[opt]}
                  </p>
                </button>
              ))}
            </div>
          ) : (
            <div className="animate-scale-in rounded-[16px] p-6 text-center"
              style={{ background: "rgba(111,207,151,0.06)", border: "1px solid rgba(111,207,151,0.2)" }}>
              <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{ background: "rgba(111,207,151,0.15)" }}>
                <Check size={22} color="#6FCF97" />
              </div>
              <div className="text-[#6FCF97] text-sm orda-cinzel tracking-widest mb-2">CHOICE RECORDED</div>
              <p className="orda-inter text-sm text-[#B7BAC3] mb-4">
                Option {chosen}: {choices[activeQuest.id as keyof typeof choices]?.[chosen]}
              </p>
              <div className="flex items-center justify-center gap-4">
                <span className="badge-green">+{activeQuest.xp} XP</span>
                <span className="badge-gold">+1 Quest Complete</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── CERTIFICATE ──────────────────────────────────────────────────────────────
function Certificate({ character, onBack }: { character: CharType; onBack: () => void }) {
  const char = CHARACTER_DATA[character];
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
        <div className="badge-gold mb-4 inline-block">JOURNEY COMPLETE</div>
        <h1 className="orda-cinzel text-3xl font-bold text-[#F6F4EC] mb-2">Certificate of Excellence</h1>
        <p className="orda-inter text-sm text-[#B7BAC3]">Your mastery of Golden Horde history has been verified</p>
      </div>

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
            <div className="text-[#D4AF37] text-[10px] tracking-[0.4em] orda-cinzel mb-1">ORDA ACADEMY</div>
            <div className="w-32 h-px mx-auto" style={{ background: "linear-gradient(90deg,transparent,rgba(212,175,55,0.4),transparent)" }} />
          </div>

          {/* Certificate body */}
          <div className="text-center space-y-4">
            <p className="orda-cormorant text-lg italic text-[#B7BAC3]">This certifies that</p>
            <div className="py-4 border-b border-t" style={{ borderColor: "rgba(212,175,55,0.12)" }}>
              <h2 className="orda-cinzel text-4xl font-bold text-[#D4AF37]">Brave Explorer</h2>
            </div>
            <p className="orda-cormorant text-lg italic text-[#B7BAC3]">has completed the journey as</p>
            <div className="flex items-center justify-center gap-3">
              <char.icon size={20} color={char.color} />
              <span className="orda-cinzel text-xl text-[#F6F4EC]">{char.name} of the Golden Horde</span>
            </div>
            <p className="orda-cormorant text-base italic text-[#B7BAC3] max-w-sm mx-auto leading-relaxed">
              Having traversed the Great Steppe, explored the cities of the Altan Orda, and conversed with the Oracle of Ages.
            </p>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-4 mt-8 pt-8 border-t" style={{ borderColor: "rgba(212,175,55,0.08)" }}>
            {[["6/6", "Cities"], ["8", "Artifacts"], ["12", "Quests"]].map(([v, l]) => (
              <div key={l} className="text-center">
                <div className="text-xl font-bold orda-cinzel text-[#D4AF37]">{v}</div>
                <div className="text-xs orda-inter text-[#B7BAC3]">{l}</div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="mt-8 flex items-center justify-between">
            <div>
              <div className="text-[10px] orda-cinzel tracking-widest text-[#B7BAC3]">ISSUED BY</div>
              <div className="text-sm orda-cinzel text-[#D4AF37]">ORDA AI Academy</div>
            </div>
            <div className="text-right">
              <div className="text-[10px] orda-cinzel tracking-widest text-[#B7BAC3]">DATE</div>
              <div className="text-sm orda-cinzel text-[#D4AF37]">2025 CE</div>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-4 mt-8 animate-slide-up" style={{ animationDelay: "0.5s" }}>
        <button className="btn-primary flex items-center gap-2">
          <Download size={16} /> Download PDF
        </button>
        <button className="btn-ghost flex items-center gap-2">
          <Share2 size={16} /> Share Achievement
        </button>
        <button onClick={onBack} className="btn-ghost">
          Back to Journey
        </button>
      </div>
    </div>
  );
}

// ─── APP ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [view, setView] = useState<View>("landing");
  const [character, setCharacter] = useState<CharType>("explorer");
  const [selectedCity, setSelectedCity] = useState<City | null>(null);
  const [prevView, setPrevView] = useState<View | null>(null);
  const [key, setKey] = useState(0);

  const navigate = (v: View) => {
    setPrevView(view);
    setView(v);
    setKey(k => k + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

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
          <Landing onStart={() => navigate("chars")} />
        )}
        {view === "chars" && (
          <div className="min-h-screen pt-16" style={{ background: "radial-gradient(ellipse at top, rgba(212,175,55,0.04) 0%, #0F1115 60%)" }}>
            <CharacterSelect onSelect={handleCharSelect} />
          </div>
        )}
        {view === "intro" && (
          <StoryIntro character={character} onBegin={() => navigate("dashboard")} />
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
      </div>
    </div>
  );
}
