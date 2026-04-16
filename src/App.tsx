import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Layout } from "./components/Layout";
import { UserRoleProvider } from "./contexts/UserRoleContext";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import Index from "./pages/Index";
import Fleet from "./pages/Fleet";
import Trips from "./pages/Trips";
import Drivers from "./pages/Drivers";
import Vehicles from "./pages/Vehicles";
// import Maintenance from "./pages/Maintenance";
// import Reports from "./pages/Reports";
// import Finance from "./pages/Finance";
// import Settings from "./pages/Settings";
// import Profile from "./pages/Profile";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import { Loader2 } from "lucide-react";

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
};

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <UserRoleProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route
                path="/*"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <Routes>
                        <Route path="/" element={<Index />} />
                        <Route path="/fleet" element={<Fleet />} />
                        <Route path="/trips" element={<Trips />} />
                        <Route path="/drivers" element={<Drivers />} />
                        <Route path="/vehicles" element={<Vehicles />} />
                        {/* <Route path="/maintenance" element={<Maintenance />} />
                        <Route path="/reports" element={<Reports />} />
                        <Route path="/finance" element={<Finance />} />
                        <Route path="/settings" element={<Settings />} /> */}
                        {/* <Route path="/profile" element={<Profile />} /> */}
                        <Route path="*" element={<NotFound />} />
                      </Routes>
                    </Layout>
                  </ProtectedRoute>
                }
              />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </UserRoleProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
