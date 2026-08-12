import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, BookOpen, Calendar, XCircle, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface LoanRequest {
    id: string;
    status: "pending" | "approved" | "rejected" | "returned" | "overdue";
    requested_at: string;
    approved_at: string | null;
    due_date: string | null;
    returned_at: string | null;
    book: {
        id: string;
        title: string;
        author: string;
    };
}

const statusConfig = {
    pending: {
        label: "Pendente",
        className: "bg-warning text-warning-foreground",
    },
    approved: {
        label: "Aprovado",
        className: "bg-success text-success-foreground",
    },
    rejected: {
        label: "Recusado",
        className: "bg-destructive text-destructive-foreground",
    },
    returned: {
        label: "Devolvido",
        className: "bg-muted text-muted-foreground",
    },
    overdue: {
        label: "Vencido",
        className: "bg-red-600 text-white font-bold animate-pulse",
    },
};

const MyLoans = () => {
    const { user, isLoading: authLoading } = useAuth();
    const navigate = useNavigate();
    const [loans, setLoans] = useState<LoanRequest[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!authLoading && !user) {
            navigate("/entrar");
            return;
        }

        if (user) {
            fetchLoans();
        }
    }, [user, authLoading]);

    const fetchLoans = async () => {
        setIsLoading(true);
        const { data, error } = await supabase
            .from("loan_requests")
            .select(`
        id,
        status,
        requested_at,
        approved_at,
        due_date,
        returned_at,
        book:books(id, title, author)
      `)
            .eq("user_id", user!.id)
            .order("requested_at", { ascending: false });

        if (error) {
            console.error("Error fetching loans:", error);
            toast.error("Erro ao carregar empréstimos");
        } else if (data) {
            const today = new Date();

            // Mapeia os dados verificando a regra de vencimento
            const processedData = data.map((loan: any) => {
                let currentStatus = loan.status;

                if (
                    loan.status === "approved" &&
                    loan.due_date &&
                    new Date(loan.due_date) < today &&
                    !loan.returned_at
                ) {
                    currentStatus = "overdue";
                }

                return {
                    ...loan,
                    status: currentStatus,
                    book: loan.book || {
                        id: "",
                        title: "Livro Indisponível",
                        author: "Desconhecido",
                    },
                };
            });

            setLoans(processedData as LoanRequest[]);
        }
        setIsLoading(false);
    };

    const handleCancelRequest = async (loanId: string) => {
        const { error } = await supabase
            .from("loan_requests")
            .delete()
            .eq("id", loanId)
            .eq("status", "pending");

        if (error) {
            toast.error("Erro ao cancelar solicitação");
        } else {
            toast.success("Solicitação cancelada");
            fetchLoans();
        }
    };

    const formatDate = (date: string | null) => {
        if (!date) return "-";
        try {
            return format(new Date(date), "dd/MM/yyyy", { locale: ptBR });
        } catch {
            return "Data inválida";
        }
    };

    if (authLoading || isLoading) {
        return (
            <div className= "min-h-screen flex flex-col bg-background" >
            <Header />
            < div className = "flex-1 flex items-center justify-center" >
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                    </div>
    );
  }

return (
    <div className= "min-h-screen flex flex-col bg-background" >
    <Header />

    < main className = "flex-1 container py-8" >
        <div className="mb-8" >
            <h1 className="text-3xl font-bold mb-2" > Meus Empréstimos </h1>
                < p className = "text-muted-foreground" >
                    Acompanhe o status das suas solicitações de empréstimo
                        </p>
                        </div>

{
    loans.length === 0 ? (
        <div className= "text-center py-20 bg-card rounded-xl shadow-soft" >
        <BookOpen className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-xl font-semibold mb-2" > Nenhum empréstimo </h3>
                < p className = "text-muted-foreground mb-6" >
                    Você ainda não solicitou nenhum livro
                        </p>
                        < Button onClick = {() => navigate("/catalogo")
}>
    Explorar Catálogo
        </Button>
        </div>
        ) : (
    <div className= "bg-card rounded-xl shadow-soft overflow-hidden" >
    <Table>
    <TableHeader>
    <TableRow>
    <TableHead>Livro </TableHead>
    < TableHead > Autor </TableHead>
    < TableHead > Solicitado em </TableHead>
        < TableHead > Status </TableHead>
        < TableHead > Devolução </TableHead>
        < TableHead className = "text-right" > Ações </TableHead>
            </TableRow>
            </TableHeader>
            <TableBody>
{
    loans.map((loan) => {
        const currentStatusConfig =
            statusConfig[loan.status] || statusConfig.pending;

        return (
            <TableRow key= { loan.id } >
            <TableCell className="font-medium" >
                {
                    loan.book?.id ? (
                        <button
                            onClick= {() => navigate(`/livro/${loan.book.id
                }`)}
                            className="hover:text-primary transition-colors text-left"
                          >
                            {loan.book.title}
                          </button>
                        ) : (
                          <span>{loan.book?.title}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {loan.book?.author}
                      </TableCell>
                      <TableCell>{formatDate(loan.requested_at)}</TableCell>
                      <TableCell>
                        <Badge className={currentStatusConfig.className}>
                          {currentStatusConfig.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {loan.due_date ? (
                          <span
                            className={`flex items - center gap - 1 ${
            loan.status === "overdue"
                ? "text-destructive font-semibold"
                : ""
        }`}
                          >
                            {loan.status === "overdue" ? (
                              <AlertTriangle className="h-4 w-4 text-destructive" />
                            ) : (
                              <Calendar className="h-4 w-4" />
                            )}
                            {formatDate(loan.due_date)}
                          </span>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {loan.status === "pending" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleCancelRequest(loan.id)}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Cancelar
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </main>
    </div>
  );
};

export default MyLoans;