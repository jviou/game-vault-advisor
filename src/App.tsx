import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";

// Pages
import Index from "./pages/Index";            // liste + recherche/filters
import Sagas from "./pages/Sagas";            // vignettes des sagas (vue "Netflix")
import SagaDetails from "./pages/SagaDetails"; // jeux d'une saga
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Accueil */}
          <Route path="/" element={<Index />} />

          {/* Vignettes des sagas */}
          <Route path="/sagas" element={<Sagas />} />

          {/* Détails d'une saga (liste des jeux de la saga) */}
          <Route path="/sagas/:name" element={<SagaDetails />} />

          {/* 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
