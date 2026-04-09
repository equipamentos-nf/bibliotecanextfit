// src/pages/Favoritos/index.tsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import BookCard from "@/components/BookCard";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Heart, BookOpen, ArrowLeft, Filter, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Book {
  id: string;
  title: string;
  author: string;
  description: string | null;
  cover_url: string | null;
  category: string | null;
  status: "available" | "borrowed" | "pending_approval";
  available_copies: number;
}

interface Favorite {
  id: string;
  book_id: string;
  created_at: string;
  books: Book;
}

const Favoritos = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [filteredFavorites, setFilteredFavorites] = useState<Favorite[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    if (!user) {
      navigate("/entrar");
      return;
    }
    fetchFavorites();
  }, [user, navigate]);

  useEffect(() => {
    filterFavorites();
  }, [favorites, searchTerm, categoryFilter, statusFilter]);

  const fetchFavorites = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("favorites")
        .select(`
          id,
          book_id,
          created_at,
          books (*)
        `)
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setFavorites(data || []);
      setFilteredFavorites(data || []);
    } catch (error) {
      console.error("Erro ao buscar favoritos:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const filterFavorites = () => {
    let result = [...favorites];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (fav) =>
          fav.books.title.toLowerCase().includes(term) ||
          fav.books.author.toLowerCase().includes(term) ||
          (fav.books.category && fav.books.category.toLowerCase().includes(term))
      );
    }

    if (categoryFilter !== "all") {
      result = result.filter((fav) => fav.books.category === categoryFilter);
    }

    if (statusFilter !== "all") {
      result = result.filter((fav) => fav.books.status === statusFilter);
    }

    setFilteredFavorites(result);
  };

  const handleRemoveFavorite = async (favoriteId: string) => {
    try {
      const { error } = await supabase
        .from("favorites")
        .delete()
        .eq("id", favoriteId);

      if (error) throw error;
      
      setFavorites(favorites.filter(fav => fav.id !== favoriteId));
      // Atualiza o Header automaticamente via evento
      window.dispatchEvent(new CustomEvent('favoritesUpdated'));
    } catch (error) {
      console.error("Erro ao remover favorito:", error);
    }
  };

  const categories = [...new Set(favorites.map(f => f.books.category).filter(Boolean))];

  if (!user) {
    return null; // Já está redirecionando no useEffect
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <main className="flex-1 container py-8 px-4">
        {/* Cabeçalho */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/catalogo")}
                className="h-9 w-9"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold flex items-center gap-3">
                  <Heart className="h-8 w-8 text-primary fill-current" />
                  Meus Favoritos
                </h1>
                <p className="text-muted-foreground mt-1">
                  Sua coleção pessoal de livros para ler depois
                </p>
              </div>
            </div>
            
            <Badge variant="outline" className="text-sm py-1.5 px-3">
              <Heart className="h-3 w-3 mr-1.5 fill-current text-primary" />
              {favorites.length} {favorites.length === 1 ? 'favorito' : 'favoritos'}
            </Badge>
          </div>

          {/* Estatísticas */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg p-4 border">
              <div className="text-2xl font-bold text-primary">{favorites.length}</div>
              <p className="text-sm text-muted-foreground">Total de favoritos</p>
            </div>
            <div className="bg-gradient-to-r from-emerald-100 to-emerald-50 rounded-lg p-4 border">
              <div className="text-2xl font-bold text-emerald-700">
                {favorites.filter(f => f.books.status === 'available').length}
              </div>
              <p className="text-sm text-muted-foreground">Disponíveis para empréstimo</p>
            </div>
            <div className="bg-gradient-to-r from-amber-100 to-amber-50 rounded-lg p-4 border">
              <div className="text-2xl font-bold text-amber-700">
                {categories.length}
              </div>
              <p className="text-sm text-muted-foreground">Categorias diferentes</p>
            </div>
            <div className="bg-gradient-to-r from-blue-100 to-blue-50 rounded-lg p-4 border">
              <div className="text-2xl font-bold text-blue-700">
                {favorites.length > 0 
                  ? new Date(favorites[0].created_at).toLocaleDateString('pt-BR')
                  : '--/--/----'
                }
              </div>
              <p className="text-sm text-muted-foreground">Última adição</p>
            </div>
          </div>

          {/* Filtros */}
          <div className="flex flex-col md:flex-row gap-4 mb-8">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar nos favoritos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:w-auto">
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Todas categorias" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas categorias</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat!}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Todos status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos status</SelectItem>
                  <SelectItem value="available">Disponível</SelectItem>
                  <SelectItem value="borrowed">Emprestado</SelectItem>
                  <SelectItem value="pending_approval">Aguardando</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Conteúdo */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
            <p className="text-muted-foreground">Carregando seus favoritos...</p>
          </div>
        ) : favorites.length === 0 ? (
          <div className="text-center py-20 bg-gradient-to-b from-accent/10 to-transparent rounded-2xl">
            <div className="inline-flex items-center justify-center w-24 h-24 bg-primary/10 rounded-full mb-6">
              <Heart className="h-12 w-12 text-primary/60" />
            </div>
            <h3 className="text-2xl font-bold mb-3">Nenhum livro favoritado</h3>
            <p className="text-muted-foreground mb-8 max-w-md mx-auto">
              Você ainda não adicionou nenhum livro aos favoritos. Explore o catálogo e salve os livros que deseja ler depois.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg" 
                className="gap-2"
                onClick={() => navigate('/catalogo')}
              >
                <BookOpen className="h-5 w-5" />
                Explorar Catálogo
              </Button>
              <Button 
                variant="outline" 
                size="lg"
                onClick={() => navigate('/meus-emprestimos')}
              >
                Ver Meus Empréstimos
              </Button>
            </div>
          </div>
        ) : filteredFavorites.length === 0 ? (
          <div className="text-center py-20">
            <Filter className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Nenhum favorito encontrado</h3>
            <p className="text-muted-foreground mb-6">
              Tente ajustar os filtros de busca
            </p>
            <Button 
              variant="outline" 
              onClick={() => {
                setSearchTerm("");
                setCategoryFilter("all");
                setStatusFilter("all");
              }}
            >
              Limpar filtros
            </Button>
          </div>
        ) : (
          <>
            <div className="mb-6 flex items-center justify-between">
              <p className="text-muted-foreground">
                Mostrando {filteredFavorites.length} de {favorites.length} favoritos
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchTerm("");
                  setCategoryFilter("all");
                  setStatusFilter("all");
                }}
                className="text-xs"
              >
                Limpar filtros
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {filteredFavorites.map((favorite) => (
                <div key={favorite.id} className="relative group">
                  <BookCard 
                    book={favorite.books}
                    onFavoriteChange={fetchFavorites}
                  />
                  
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleRemoveFavorite(favorite.id)}
                    className="absolute -top-2 -right-2 z-20 h-6 w-6 p-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                  >
                    <Heart className="h-3 w-3 fill-white" />
                  </Button>
                  
                  <div className="absolute -top-1 -left-1 z-10">
                    <Badge className="bg-primary text-xs py-0.5 px-2">
                      Favorito
                    </Badge>
                  </div>
                </div>
              ))}
            </div>

            {/* Ações em lote */}
            <div className="mt-12 p-6 bg-gradient-to-r from-primary/5 to-primary/10 rounded-xl border border-primary/20">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div>
                  <h3 className="font-semibold mb-1">Quer solicitar vários livros?</h3>
                  <p className="text-sm text-muted-foreground">
                    Selecione seus favoritos e solicite empréstimos em lote
                  </p>
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => navigate('/catalogo')}>
                    Adicionar mais livros
                  </Button>
                  <Button 
                    onClick={() => {
                      const availableBooks = filteredFavorites.filter(f => f.books.status === 'available');
                      if (availableBooks.length > 0) {
                        alert(`Solicitar ${availableBooks.length} empréstimos`);
                      }
                    }}
                    disabled={filteredFavorites.filter(f => f.books.status === 'available').length === 0}
                  >
                    Solicitar disponíveis ({filteredFavorites.filter(f => f.books.status === 'available').length})
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default Favoritos;