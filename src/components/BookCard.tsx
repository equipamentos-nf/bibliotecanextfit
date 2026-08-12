import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, Heart, Bookmark, User, Loader2, Calendar } from "lucide-react";
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
    const [isLoadingFavorite, setIsLoadingFavorite] = useState(false);
    const [isRequestingLoan, setIsRequestingLoan] = useState(false);
    const [favoriteId, setFavoriteId] = useState<string | null>(null);
    const [hasExistingRequest, setHasExistingRequest] = useState(false);

    const status = statusConfig[book.status];

    useEffect(() => {
        if (user) {
            checkIfFavorite();
            checkExistingRequest();
        }
    }, [user, book.id]);

    const checkExistingRequest = async () => {
        if (!user) return;

        try {
            const { data } = await supabase
                .from("loan_requests")
                .select("id")
                .eq("book_id", book.id)
                .eq("user_id", user.id)
                .in("status", ["pending", "approved"])
                .maybeSingle();

            setHasExistingRequest(!!data);
        } catch (error) {
            console.error("Erro ao checar solicitação prévia:", error);
        }
    };

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

        setIsLoadingFavorite(true);

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
            setIsLoadingFavorite(false);
        }
    };

    const handleBorrowClick = async (e: React.MouseEvent) => {
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

        if (hasExistingRequest) {
            toast({
                title: "Solicitação em andamento",
                description: "Você já possui uma solicitação ativa para este livro.",
                variant: "default",
            });
            return;
        }

        if (book.status !== "available" || book.available_copies <= 0) {
            toast({
                title: "Livro indisponível",
                description: "Este livro não está disponível para empréstimo no momento",
                variant: "destructive",
            });
            return;
        }

        setIsRequestingLoan(true);

        try {
            const { data: existingRequest } = await supabase
                .from("loan_requests")
                .select("id")
                .eq("book_id", book.id)
                .eq("user_id", user.id)
                .in("status", ["pending", "approved"])
                .maybeSingle();

            if (existingRequest) {
                setHasExistingRequest(true);
                toast({
                    title: "Solicitação em andamento",
                    description: "Você já possui uma solicitação pendente ou empréstimo ativo deste livro.",
                    variant: "destructive",
                });
                setIsRequestingLoan(false);
                return;
            }

            const { data: currentBook, error: fetchError } = await supabase
                .from("books")
                .select("available_copies")
                .eq("id", book.id)
                .single();

            if (fetchError || !currentBook || currentBook.available_copies <= 0) {
                toast({
                    title: "Livro indisponível",
                    description: "Não há cópias disponíveis no momento.",
                    variant: "destructive",
                });
                setIsRequestingLoan(false);
                return;
            }

            const { error: insertError } = await supabase.from("loan_requests").insert({
                book_id: book.id,
                user_id: user.id,
            });

            if (insertError) throw insertError;

            // Atualiza na hora o estado para "Solicitação em andamento"
            setHasExistingRequest(true);

            toast({
                title: "Empréstimo solicitado!",
                description: "A solicitação foi enviada para aprovação com sucesso.",
                variant: "default",
                className: "bg-emerald-500 text-white border-none",
            });

        } catch (error: any) {
            console.error("Erro ao solicitar empréstimo:", error);
            toast({
                title: "Erro na solicitação",
                description: "Ocorreu um erro ao processar seu pedido. Tente novamente.",
                variant: "destructive",
            });
        } finally {
            setIsRequestingLoan(false);
        }
    };

    return (
        <Link to= {`/livro/${book.id}`
} className = "block h-full" >
    <Card className="group overflow-hidden hover:shadow-lg transition-all duration-300 h-full border border-gray-200 hover:border-primary/30 flex flex-col" >
        <div className="aspect-[3/4] relative overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100 flex-shrink-0" >
            {
                book.cover_url ? (
                    <img
              src= { book.cover_url }
              alt={ book.title }
              className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
              loading="lazy"
                />
          ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5 p-4" >
                <BookOpen className="h-16 w-16 text-primary/40 mb-2" />
                <span className="text-xs text-primary/60 text-center font-medium line-clamp-2" >
                { book.title }
                </span>
                </div>
                )}

{/* Badge de status */ }
<Badge className={ `absolute top-3 left-3 border ${status.className} font-medium text-xs` }>
    <span className="mr-1" > { status.icon } </span>
{ status.label }
</Badge>

{/* Botão de favorito */ }
{
    showFavoriteButton && (
        <Button
              variant="ghost"
    size = "icon"
    onClick = { toggleFavorite }
    disabled = { isLoadingFavorite }
    className = "absolute top-3 right-3 h-8 w-8 bg-white/90 hover:bg-white shadow-sm hover:shadow-md transition-all z-10"
        >
        <Heart 
                className={ `h-4 w-4 transition-all ${isFavorite ? 'fill-red-500 text-red-500' : 'text-gray-600'}` } 
              />
    {
        isLoadingFavorite && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/80 rounded-md" >
                <div className="h-3 w-3 border-2 border-red-500 border-t-transparent rounded-full animate-spin" > </div>
                    </div>
              )
    }
    </Button>
          )
}

{/* Badge de cópias disponíveis */ }
{
    book.available_copies > 0 && book.status === "available" && (
        <div className="absolute bottom-3 left-3" >
            <Badge variant="ghost" className = "bg-white/90 hover:bg-white border-gray-300 text-xs" >
                <Bookmark className="h-3 w-3 mr-1" />
                { book.available_copies } { book.available_copies === 1 ? 'cópia' : 'cópias' }
    </Badge>
        </div>
          )
}
</div>

    < CardContent className = "p-5 flex flex-col flex-grow" >
    {
        book.category && (
            <Badge variant="outline" className = "mb-2 text-xs border-gray-300 w-fit" >
            { book.category }
                </Badge>
          )
    }

        < h3 className = "font-bold text-lg mb-1 line-clamp-2 group-hover:text-primary transition-colors" >
        { book.title }
            </h3>

            < div className = "flex items-center text-muted-foreground text-sm mb-3" >
                <User className="h-3 w-3 mr-1 flex-shrink-0" />
                    <span className="truncate" > { book.author } </span>
                        </div>

{
    book.description && (
        <p className="text-sm text-gray-600 line-clamp-3 mb-4 flex-grow" >
        { book.description }
            </p>
          )
}

{/* Botão de ação */ }
<div className="flex gap-2 mt-auto pt-4 border-t border-gray-100" >
    {
        hasExistingRequest?(
              <Button size = "sm" disabled variant = "secondary" className = "flex-1 text-xs z-10 cursor-not-allowed" >
                <Calendar className="mr-1.5 h-3.5 w-3.5" />
    Solicitação em andamento
        </Button>
            ) : (
    <Button
                variant= "outline"
size = "sm"
className = "flex-1 text-xs z-10"
onClick = { handleBorrowClick }
disabled = { book.status !== "available" || book.available_copies <= 0 || isRequestingLoan }
    >
    {
        isRequestingLoan?(
                  <span className = "flex items-center" >
                <Loader2 className="mr-2 h-3 w-3 animate-spin" />
    Solicitando...
</span>
                ) : book.status === "available" && book.available_copies > 0 ? (
    "Solicitar Empréstimo"
) : (
    "Indisponível"
)}
</Button>
            )}

{
    showFavoriteButton && (
        <Button
                variant="ghost"
    size = "icon"
    onClick = { toggleFavorite }
    disabled = { isLoadingFavorite }
    className = "flex-shrink-0 relative border border-gray-200 z-10"
        >
        <Heart 
                  className={ `h-4 w-4 ${isFavorite ? 'fill-red-500 text-red-500' : 'text-gray-600'}` } 
                />
    {
        isLoadingFavorite && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/80 rounded-md" >
                <div className="h-3 w-3 border-2 border-red-500 border-t-transparent rounded-full animate-spin" > </div>
                    </div>
                )
    }
    </Button>
            )
}
</div>
    </CardContent>
    </Card>
    </Link>
  );
};

export default BookCard;