import { createFileRoute, Outlet, redirect, Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { logout as doLogout } from "@/lib/auth";
import { isAdmin as isAdminFn } from "@/lib/admin.functions";
import { ChefHat, Home, Sparkles, GraduationCap, Crown, Settings, LogOut, Menu, X, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw redirect({ to: "/login" });
  },
  component: AuthLayout,
});

const NAV = [
  { to: "/dashboard", label: "Accueil", icon: Home },
  { to: "/chef", label: "Chef IA", icon: Sparkles },
  { to: "/cours", label: "Cours", icon: GraduationCap },
  { to: "/premium", label: "Premium", icon: Crown },
  { to: "/settings", label: "Réglages", icon: Settings },
] as const;

function AuthLayout() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const checkAdmin = useServerFn(isAdminFn);
  const adminQ = useQuery({ queryKey: ["is-admin"], queryFn: () => checkAdmin(), staleTime: 60_000 });
  const showAdmin = adminQ.data?.isAdmin;

  useEffect(() => setOpen(false), [path]);

  const logout = () => doLogout(navigate);

  return (
    <div className="flex min-h-screen w-full bg-background text-foreground">
      {/* Sidebar desktop */}
      <aside className="hidden w-64 shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground md:flex">
        <div className="flex h-16 items-center gap-2 border-b px-6 font-display text-lg font-bold">
          <ChefHat className="h-5 w-5 text-primary" /> Chef IA
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {NAV.map((item) => {
            const active = path === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition",
                  active
                    ? "bg-primary text-primary-foreground shadow-glow"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground",
                )}
              >
                <item.icon className="h-4 w-4" /> {item.label}
              </Link>
            );
          })}
          {showAdmin && (
            <Link
              to="/admin"
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition",
                path === "/admin"
                  ? "bg-primary text-primary-foreground shadow-glow"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground",
              )}
            >
              <Shield className="h-4 w-4" /> Admin
            </Link>
          )}
        </nav>
        <div className="border-t p-3">
          <Button variant="ghost" className="w-full justify-start" onClick={logout}>
            <LogOut className="mr-2 h-4 w-4" /> Déconnexion
          </Button>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="flex flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b px-4 md:hidden">
          <div className="flex items-center gap-2 font-display font-bold">
            <ChefHat className="h-5 w-5 text-primary" /> Chef IA
          </div>
          <button onClick={() => setOpen(true)} aria-label="Menu">
            <Menu className="h-6 w-6" />
          </button>
        </header>

        {/* Mobile drawer */}
        {open && (
          <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur md:hidden">
            <div className="flex items-center justify-between border-b p-4">
              <span className="font-display text-lg font-bold flex items-center gap-2">
                <ChefHat className="h-5 w-5 text-primary" /> Chef IA
              </span>
              <button onClick={() => setOpen(false)} aria-label="Fermer">
                <X className="h-6 w-6" />
              </button>
            </div>
            <nav className="space-y-1 p-3">
              {NAV.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className="flex items-center gap-3 rounded-lg px-3 py-3 text-base hover:bg-sidebar-accent"
                >
                  <item.icon className="h-5 w-5" /> {item.label}
                </Link>
              ))}
              <Button variant="ghost" className="w-full justify-start mt-4" onClick={logout}>
                <LogOut className="mr-2 h-4 w-4" /> Déconnexion
              </Button>
            </nav>
          </div>
        )}

        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
