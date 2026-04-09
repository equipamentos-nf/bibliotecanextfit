import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Header from "@/components/Header";
import BookCard from "@/components/BookCard";
import { supabase } from "@/integrations/supabase/client";
import { Search, BookOpen, Loader2, Lock } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "react-router-dom";

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

const Catalog = () => {
  const [books, setBooks] = useState<Book[]>([]);
  const [filteredBooks, setFilteredBooks] = useState<Book[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchBooks();
    }
  }, [user]);

  useEffect(() => {
    filterBooks();
  }, [books, searchTerm, categoryFilter, statusFilter]);

  const fetchBooks = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("books")
        .select("*")
        .order("title");

      if (error) {
        console.error("Error fetching books:", error);
      } else {
        setBooks(data || []);
      }
    } catch (error) {
      console.error("Erro ao buscar livros:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const filterBooks = () => {
    let result = [...books];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (book) =>
          book.title.toLowerCase().includes(term) ||
          book.author.toLowerCase().includes(term) ||
          (book.category && book.category.toLowerCase().includes(term))
      );
    }

    if (categoryFilter !== "all") {
      result = result.filter((book) => book.category === categoryFilter);
    }

    if (statusFilter !== "all") {
      result = result.filter((book) => book.status === statusFilter);
    }

    setFilteredBooks(result);
  };

  const categories = [...new Set(books.map((b) => b.category).filter(Boolean))];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1 container py-8 px-4">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-2 text-foreground">
            Catálogo de Livros
          </h1>
          <p className="text-muted-foreground text-lg">
            Explore nossa coleção e encontre o próximo livro para seu desenvolvimento
          </p>
        </div>

        {/* Seção para usuários não logados */}
        {!user ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="mb-8 p-6 bg-primary/10 rounded-full">
              <Lock className="h-16 w-16 text-primary" />
            </div>
            
            <h2 className="text-2xl md:text-3xl font-bold mb-4 text-foreground">
              Acesso ao Catálogo
            </h2>
            
            <p className="text-muted-foreground text-lg mb-8 max-w-2xl">
              O catálogo completo de livros está disponível apenas para usuários cadastrados da Biblioteca NextFit.
              Faça login para visualizar e solicitar empréstimos dos livros.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg" className="gap-2">
                <Link to="/entrar">
                  <Lock className="h-5 w-5" />
                  Fazer Login
                </Link>
              </Button>
              
              <Button asChild variant="outline" size="lg">
                <Link to="/cadastrar">
                  Criar Conta
                </Link>
              </Button>
            </div>
            
            <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl">
              <div className="bg-white p-6 rounded-xl shadow-sm border">
                <div className="text-primary font-bold text-2xl mb-2">+100</div>
                <h3 className="font-semibold mb-2">Livros Disponíveis</h3>
                <p className="text-sm text-muted-foreground">
                  Coleção diversificada para desenvolvimento profissional
                </p>
              </div>
              
              <div className="bg-white p-6 rounded-xl shadow-sm border">
                <div className="text-primary font-bold text-2xl mb-2">10+</div>
                <h3 className="font-semibold mb-2">Categorias</h3>
                <p className="text-sm text-muted-foreground">
                  Gestão, Desenvolvimento Pessoal, Liderança e mais
                </p>
              </div>
              
              <div className="bg-white p-6 rounded-xl shadow-sm border">
                <div className="text-primary font-bold text-2xl mb-2">PDI</div>
                <h3 className="font-semibold mb-2">Desenvolvimento Individual</h3>
                <p className="text-sm text-muted-foreground">
                  Livros selecionados para seu plano de desenvolvimento
                </p>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Filters - Apenas para usuários logados */}
            <div className="flex flex-col md:flex-row gap-4 mb-8">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por título, autor ou categoria..."
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
                    <SelectValue placeholder="Status" />
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

            {/* Contador de resultados */}
            {!isLoading && filteredBooks.length > 0 && (
              <div className="mb-4">
                <p className="text-muted-foreground">
                  {filteredBooks.length} {filteredBooks.length === 1 ? 'livro encontrado' : 'livros encontrados'}
                </p>
              </div>
            )}

            {/* Books Grid - Apenas para usuários logados */}
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-20">
                <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                <p className="text-muted-foreground">Carregando catálogo...</p>
              </div>
            ) : filteredBooks.length === 0 ? (
              <div className="text-center py-20">
                <BookOpen className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="text-xl font-semibold mb-2 text-foreground">Nenhum livro encontrado</h3>
                <p className="text-muted-foreground mb-6">
                  Tente ajustar os filtros ou buscar por outro termo
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
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {filteredBooks.map((book) => (
                  <BookCard 
                    key={book.id} 
                    book={book}
                    // Removido: onBorrowSuccess={fetchBooks}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default Catalog;