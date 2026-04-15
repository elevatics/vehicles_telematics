import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import NotificationBell from "@/components/NotificationBell";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";

export function Layout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <SidebarInset className="flex flex-col h-screen">
          <header className="sticky top-0 z-10 flex h-14 items-center gap-3 border-b bg-background/95 backdrop-blur-sm px-4 shrink-0 shadow-sm">
            <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
            <div className="h-5 w-px bg-border" />
            <div className="flex items-center gap-2 flex-1">
              <span className="text-sm font-semibold text-foreground tracking-tight">Fleet Management Portal</span>
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 font-normal hidden sm:flex">Live</Badge>
            </div>
            <div className="flex items-center gap-3">
              {user && (
                <span className="text-xs text-muted-foreground hidden md:block">
                  {user.full_name ?? user.email}
                </span>
              )}
              <NotificationBell />
            </div>
          </header>
          <div className="h-0.5 bg-gradient-to-r from-primary/80 via-primary to-primary/20 shrink-0" />
          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
