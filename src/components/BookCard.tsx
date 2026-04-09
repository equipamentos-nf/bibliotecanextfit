import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, Heart, Bookmark, User } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

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

interface BookCardProps {
  book: Book;
  onFavoriteChange?: () => void;
  showFavoriteButton?: boolean;
}

const statusConfig = {
  available: {
    label: "Disponível",
    variant: "default" as const,
    className: "bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border-emerald-200",
    icon: "✅",
  },
  borrowed: {
    label: "Emprestado",
    variant: "secondary" as const,
    className: "bg-gray-100 text-gray-800 hover:bg-gray-200 border-gray-200",
    icon: "📖",
  },
  pending_approval: {
    label: "Aguardando",
    variant: "outline" as const,
    className: "bg-amber-100 text-amber-800 hover:bg-amber-200 border-amber-200",
    icon: "⏳",
  },
};

const BookCard = ({ 
  book, 
  onFavoriteChange,
  showFavoriteButton = true 
}: BookCardProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isFavorite, setIsFavorite] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [favoriteId, setFavoriteId] = useState<string | null>(null);

  const status = statusConfig[book.status];

  useEffect(() => {
    if (user) {
      checkIfFavorite();
    }
  }, [user, book.id]);

  const checkIfFavorite = async () => {
    if (!user) return;

    try {
      const { data } = await supabase
        .from("favorites")
        .select("id")
        .eq("user_id", user.id)
        .eq("book_id", book.id)
        .maybeSingle();
      
      setIsFavorite(!!data);
      if (data) setFavoriteId(data.id);
    } catch (error) {
      console.error("Erro ao verificar favorito:", error);
    }
  };

  const toggleFavorite = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      toast({
        title: "Login necessário",
        description: "Faça login para adicionar aos favoritos",
        variant: "default",
      });
      return;
    }

    setIsLoading(true);
    
    try {
      if (isFavorite) {
        await supabase
          .from("favorites")
          .delete()
          .eq("id", favoriteId);
        setIsFavorite(false);
        setFavoriteId(null);
        toast({
          title: "Removido dos favoritos",
          description: `${book.title} foi removido da sua lista`,
        });
        
        // Dispara evento global para atualizar o Header
        window.dispatchEvent(new CustomEvent('favoritesUpdated'));
      } else {
        const { data } = await supabase
          .from("favorites")
          .insert({
            user_id: user.id,
            book_id: book.id,
          })
          .select()
          .single();
        
        if (data) {
          setIsFavorite(true);
          setFavoriteId(data.id);
          toast({
            title: "Adicionado aos favoritos",
            description: `${book.title} foi adicionado à sua lista`,
          });
          
          // Dispara evento global para atualizar o Header
          window.dispatchEvent(new CustomEvent('favoritesUpdated'));
        }
      }

      if (onFavoriteChange) {
        onFavoriteChange();
      }
    } catch (error: any) {
      console.error("Erro ao alternar favorito:", error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível atualizar os favoritos",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleBorrowClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!user) {
      toast({
        title: "Login necessário",
        description: "Faça login para solicitar empréstimos",
        variant: "default",
      });
      return;
    }

    if (book.status !== "available") {
      toast({
        title: "Livro indisponível",
        description: "Este livro não está disponível para empréstimo no momento",
        variant: "destructive",
      });
      return;
    }

    // Aqui você pode adicionar a lógica para solicitar empréstimo
    toast({
      title: "Empréstimo solicitado",
      description: "Solicitação enviada para aprovação",
      variant: "default",
    });
  };

  return (
    <Link to={`/livro/${book.id}`} className="block">
      <Card className="group overflow-hidden hover:shadow-lg transition-all duration-300 h-full border border-gray-200 hover:border-primary/30">
        <div className="aspect-[3/4] relative overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100">
          {book.cover_url ? (
            <img
              src={book.cover_url}
              alt={book.title}
              className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5 p-4">
              <BookOpen className="h-16 w-16 text-primary/40 mb-2" />
              <span className="text-xs text-primary/60 text-center font-medium line-clamp-2">
                {book.title}
              </span>
            </div>
          )}
          
          {/* Badge de status */}
          <Badge className={`absolute top-3 left-3 border ${status.className} font-medium text-xs`}>
            <span className="mr-1">{status.icon}</span>
            {status.label}
          </Badge>
          
          {/* Botão de favorito */}
          {showFavoriteButton && (
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleFavorite}
              disabled={isLoading}
              className="absolute top-3 right-3 h-8 w-8 bg-white/90 hover:bg-white shadow-sm hover:shadow-md transition-all"
            >
              <Heart 
                className={`h-4 w-4 transition-all ${isFavorite ? 'fill-red-500 text-red-500' : 'text-gray-600'}`} 
              />
              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/80">
                  <div className="h-3 w-3 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}
            </Button>
          )}
          
          {/* Badge de cópias disponíveis */}
          {book.available_copies > 0 && book.status === "available" && (
            <div className="absolute bottom-3 left-3">
              <Badge variant="outline" className="bg-white/90 hover:bg-white border-gray-300">
                <Bookmark className="h-3 w-3 mr-1" />
                {book.available_copies} {book.available_copies === 1 ? 'cópia' : 'cópias'}
              </Badge>
            </div>
          )}
        </div>
        
        <CardContent className="p-5">
          {book.category && (
            <Badge variant="outline" className="mb-2 text-xs border-gray-300">
              {book.category}
            </Badge>
          )}
          
          <h3 className="font-bold text-lg mb-1 line-clamp-2 group-hover:text-primary transition-colors">
            {book.title}
          </h3>
          
          <div className="flex items-center text-muted-foreground text-sm mb-3">
            <User className="h-3 w-3 mr-1 flex-shrink-0" />
            <span className="truncate">{book.author}</span>
          </div>
          
          {book.description && (
            <p className="text-sm text-gray-600 line-clamp-3 mb-4">
              {book.description}
            </p>
          )}
          
          {/* Botão de ação */}
          <div className="flex gap-2 mt-auto">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 text-xs"
              onClick={handleBorrowClick}
              disabled={book.status !== "available" || !user}
            >
              {book.status === "available" ? "Solicitar Empréstimo" : "Indisponível"}
            </Button>
            
            {showFavoriteButton && (
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleFavorite}
                disabled={isLoading || !user}
                className="flex-shrink-0 relative"
              >
                <Heart 
                  className={`h-4 w-4 ${isFavorite ? 'fill-red-500 text-red-500' : ''}`} 
                />
                {isLoading && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="h-2 w-2 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
};

export default BookCard;