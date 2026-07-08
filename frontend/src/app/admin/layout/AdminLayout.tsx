import type { ReactNode } from "react";
import { Toaster } from "../../components/ui/sonner";
import { useAuthSession } from "../../lib/api";
import { GLOBAL_CSS } from "../../styles/globalCss";
import { AdminSidebar } from "./AdminSidebar";

export function AdminLayout({ children }: { children: ReactNode }) {
  const { user, logoutMutation } = useAuthSession();

  return (
    <div className="flex min-h-screen orda-inter" style={{ background: "#EDE1C4", color: "#2E2013" }}>
      <style>{GLOBAL_CSS}</style>
      <Toaster position="top-right" />
      <AdminSidebar />
      <div className="flex-1 min-w-0">
        <header
          className="h-16 flex items-center justify-end gap-4 px-6"
          style={{ borderBottom: "1px solid rgba(59,42,19,0.16)" }}
        >
          <div className="text-right">
            <div className="text-sm font-medium">{user?.username ?? "Admin"}</div>
            <div className="text-xs text-muted-foreground">{user?.email}</div>
          </div>
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold orda-cinzel overflow-hidden"
            style={{ background: "linear-gradient(135deg,#B8892B,#8C6239)", color: "#EDE1C4" }}
          >
            {(user?.username?.[0] || "A").toUpperCase()}
          </div>
          <button
            onClick={() => logoutMutation.mutate(undefined)}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Sign out
          </button>
        </header>
        <main className="p-6 max-w-[1600px] mx-auto">{children}</main>
      </div>
    </div>
  );
}
