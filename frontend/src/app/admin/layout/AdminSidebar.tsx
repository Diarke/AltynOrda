import { NavLink } from "react-router";
import {
  LayoutDashboard,
  BarChart3,
  Users,
  MapPin,
  Package,
  Image as ImageIcon,
  BookOpen,
  Zap,
  Award,
  ScrollText,
  Home,
  Settings as SettingsIcon,
  ExternalLink,
} from "lucide-react";

const NAV_ITEMS = [
  { to: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/admin/users", label: "Users", icon: Users },
  { to: "/admin/cities", label: "Cities", icon: MapPin },
  { to: "/admin/artifacts", label: "Artifacts", icon: Package },
  { to: "/admin/gallery", label: "Gallery", icon: ImageIcon },
  { to: "/admin/historical-documents", label: "Historical Documents", icon: BookOpen },
  { to: "/admin/quests", label: "Quests", icon: Zap },
  { to: "/admin/achievements", label: "Achievements", icon: Award },
  { to: "/admin/certificates", label: "Certificates", icon: ScrollText },
  { to: "/admin/homepage", label: "Homepage", icon: Home },
  { to: "/admin/settings", label: "Settings", icon: SettingsIcon },
];

export function AdminSidebar() {
  return (
    <aside
      className="w-60 shrink-0 flex flex-col h-screen sticky top-0"
      style={{ background: "rgba(15,17,21,0.96)", borderRight: "1px solid rgba(255,255,255,0.06)" }}
    >
      <div className="h-16 flex items-center gap-3 px-5" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ background: "linear-gradient(135deg,#D4AF37,#C9962C)" }}
        >
          <span className="text-[#0F1115] font-bold text-sm orda-cinzel">O</span>
        </div>
        <div>
          <div className="orda-cinzel text-sm font-bold tracking-[0.15em]" style={{ color: "#D4AF37" }}>
            ORDA
          </div>
          <div className="text-[10px] text-muted-foreground tracking-wide">ADMIN</div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `admin-nav-link flex items-center gap-3 px-3 py-2.5 text-sm ${isActive ? "active" : ""}`
            }
          >
            <item.icon size={16} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="p-3" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <a
          href="/"
          className="admin-nav-link flex items-center gap-3 px-3 py-2.5 text-sm"
        >
          <ExternalLink size={16} />
          <span>Back to site</span>
        </a>
      </div>
    </aside>
  );
}
