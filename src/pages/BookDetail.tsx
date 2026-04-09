import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Header from "@/components/Header";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { BookOpen, ArrowLeft, Loader2, User, Calendar } from "lucide-react";

interface Book {
  id: string;
  title: string;
  author: string;
  description: string | null;
  cover_url: string | null;
  category: string | null;
  isbn: string | null;
  status: "available" | "borrowed" | "pending_approval";
  total_copies: number;
  available_copies: number;
}

const statusConfig = {
  available: {
    label: "Disponível",
    className: "bg-success text-success-foreground",
  },
  borrowed: {
    label: "Emprestado",
    className: "bg-muted text-muted-foreground",
  },
  pending_approval: {
    label: "Aguardando aprovação",
    className: "bg-warning text-warning-foreground",
  },
};

const BookDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [book, setBook] = useState<Book | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRequesting, setIsRequesting] = useState(false);
  const [hasExistingRequest, setHasExistingRequest] = useState(false);

  useEffect(() => {
    if (id) {
      fetchBook();
      setupRealtimeSubscription(); // ← ADICIONE ESTA LINHA
      
      if (user) {
        checkExistingRequest();
      }
    }
    
    // Cleanup function
    return () => {
      if (id) {
        // Desinscrever do canal realtime quando o componente desmontar
        const channel = supabase.channel(`book-${id}`);
        channel.unsubscribe();
      }
    };
  }, [id, user]);

  // ADICIONE ESTA FUNÇÃO PARA ESCUTAR MUDANÇAS EM TEMPO REAL
  const setupRealtimeSubscription = () => {
    if (!id) return;
    
    // Canal para escutar mudanças neste livro específico
    const channel = supabase
      .channel(`book-${id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE', // Escutar apenas updates
          schema: 'public',
          table: 'books',
          filter: `id=eq.${id}`
        },
        (payload) => {
          console.log('Mudança realtime recebida:', payload);
          // Atualizar os dados do livro quando houver mudança
          setBook(payload.new as Book);
          
          // Mostrar notificação se as cópias mudaram
          if (payload.old?.available_copies !== payload.new?.available_copies) {
            toast.info(`Cópias disponíveis atualizadas: ${payload.new?.available_copies}`);
          }
        }
      )
      .subscribe();

    return channel;
  };

  const fetchBook = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("books")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      console.error("Error fetching book:", error);
      toast.error("Erro ao carregar livro");
    } else if (!data) {
      toast.error("Livro não encontrado");
      navigate("/catalogo");
    } else {
      setBook(data);
    }
    setIsLoading(false);
  };

  const checkExistingRequest = async () => {
    const { data } = await supabase
      .from("loan_requests")
      .select("id")
      .eq("book_id", id)
      .eq("user_id", user!.id)
      .in("status", ["pending", "approved"])
      .maybeSingle();

    setHasExistingRequest(!!data);
  };

  const handleRequestLoan = async () => {
    if (!user) {
      toast.error("Você precisa estar logado para solicitar um empréstimo");
      navigate("/entrar");
      return;
    }

    setIsRequesting(true);

    // Primeiro, verificar se ainda há cópias disponíveis
    const { data: currentBook } = await supabase
      .from("books")
      .select("available_copies, status")
      .eq("id", id)
      .single();

    if (!currentBook || currentBook.available_copies <= 0) {
      toast.error("Não há cópias disponíveis no momento");
      setIsRequesting(false);
      return;
    }

    // Criar a solicitação
    const { error } = await supabase.from("loan_requests").insert({
      book_id: id,
      user_id: user.id,
    });

    if (error) {
      console.error("Error requesting loan:", error);
      toast.error("Erro ao solicitar empréstimo");
    } else {
      toast.success("Solicitação enviada! Aguarde aprovação.");
      setHasExistingRequest(true);
      
      // Atualizar localmente o número de cópias
      if (book) {
        setBook({
          ...book,
          available_copies: Math.max(0, book.available_copies - 1),
          status: book.available_copies - 1 > 0 ? "available" : "borrowed"
        });
      }
    }

    setIsRequesting(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!book) return null;

  const status = statusConfig[book.status];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1 container py-8">
        <Button
          variant="ghost"
          onClick={() => navigate("/catalogo")}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar ao catálogo
        </Button>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Book Cover */}
          <div className="md:col-span-1">
            <div className="aspect-[3/4] rounded-xl overflow-hidden bg-muted shadow-medium">
              {book.cover_url ? (
                <img
                  src={book.cover_url}
                  alt={book.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-accent">
                  <BookOpen className="h-24 w-24 text-primary/50" />
                </div>
              )}
            </div>
          </div>

          {/* Book Details */}
          <div className="md:col-span-2 space-y-6">
            <div>
              {book.category && (
                <span className="text-sm font-medium text-primary uppercase tracking-wider">
                  {book.category}
                </span>
              )}
              <h1 className="text-3xl md:text-4xl font-bold mt-2">{book.title}</h1>
              <div className="flex items-center gap-2 mt-2 text-muted-foreground">
                <User className="h-4 w-4" />
                <span>{book.author}</span>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <Badge className={status.className}>{status.label}</Badge>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">
                  {book.available_copies} de {book.total_copies} cópias disponíveis
                </span>
                {/* Indicador de atualização em tempo real */}
                <div className="relative">
                  {book.available_copies === 0 && (
                    <span className="text-xs text-destructive animate-pulse">
                      • Última cópia!
                    </span>
                  )}
                </div>
              </div>
            </div>

            {book.description && (
              <div>
                <h2 className="text-lg font-semibold mb-2">Sobre o livro</h2>
                <p className="text-muted-foreground leading-relaxed">
                  {book.description}
                </p>
              </div>
            )}

            {book.isbn && (
              <div className="text-sm text-muted-foreground">
                <span className="font-medium">ISBN:</span> {book.isbn}
              </div>
            )}

            <div className="pt-4 border-t">
              {!user ? (
                <Button size="lg" onClick={() => navigate("/entrar")}>
                  Faça login para solicitar
                </Button>
              ) : hasExistingRequest ? (
                <Button size="lg" disabled variant="secondary">
                  <Calendar className="mr-2 h-4 w-4" />
                  Solicitação em andamento
                </Button>
              ) : book.status === "available" && book.available_copies > 0 ? (
                <Button
                  size="lg"
                  onClick={handleRequestLoan}
                  disabled={isRequesting}
                >
                  {isRequesting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Solicitando...
                    </>
                  ) : (
                    "Solicitar Empréstimo"
                  )}
                </Button>
              ) : (
                <Button size="lg" disabled variant="secondary">
                  Indisponível no momento
                </Button>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default BookDetail;