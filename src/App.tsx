import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/AppLayout";
import LoginPage from "@/pages/LoginPage";
import VentasPage from "@/pages/VentasPage";
import StockPage from "@/pages/StockPage";
import CajaPage from "@/pages/CajaPage";
import HistorialPage from "@/pages/HistorialPage";
import ReportesPage from "@/pages/ReportesPage";
import AjustesPage from "@/pages/AjustesPage";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

function AppRoutes() {
  const { user } = useAuth();

  if (!user) return <LoginPage />;

  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<VentasPage />} />
        <Route path="/stock" element={<StockPage />} />
        <Route path="/caja" element={<CajaPage />} />
        <Route path="/historial" element={<HistorialPage />} />
        <Route path="/reportes" element={<ReportesPage />} />
        <Route path="/ajustes" element={<AjustesPage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AppLayout>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
