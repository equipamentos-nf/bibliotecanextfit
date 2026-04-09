import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Catalog from "./pages/Catalog";
import BookDetail from "./pages/BookDetail";
import MyLoans from "./pages/MyLoans";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminBooks from "./pages/admin/AdminBooks";
import AdminRequests from "./pages/admin/AdminRequests";
import NotFound from "./pages/NotFound";
import Favoritos from "./pages/Favoritos"; 

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/entrar" element={<Login />} />
            <Route path="/cadastrar" element={<Register />} />
            <Route path="/catalogo" element={<Catalog />} />
            <Route path="/livro/:id" element={<BookDetail />} />
            
            {/* Rota dos favoritos - CORRIGIDA */}
            <Route path="/favoritos" element={<Favoritos />} />
            
            <Route path="/meus-emprestimos" element={<MyLoans />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/livros" element={<AdminBooks />} />
            <Route path="/admin/solicitacoes" element={<AdminRequests />} />
            
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;