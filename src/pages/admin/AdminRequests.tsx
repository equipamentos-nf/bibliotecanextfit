import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "./AdminLayout";
import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, CheckCircle, XCircle, RotateCcw, Calendar as CalendarIcon } from "lucide-react";
import { format, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAuth } from "@/hooks/useAuth";

interface LoanRequest {
    id: string;
    status: "pending" | "approved" | "rejected" | "returned" | "overdue";
    requested_at: string;
    approved_at: string | null;
    due_date: string | null;
    returned_at: string | null;
    user_id: string;
    book_id: string;
    book: {
        id: string;
        title: string;
        author: string;
    };
    profile: {
        user_id: string;
        full_name: string;
        email: string;
    };
}

const statusConfig = {
    pending: { label: "Pendente", className: "bg-warning text-warning-foreground" },
    approved: { label: "Aprovado", className: "bg-success text-success-foreground" },
    rejected: { label: "Recusado", className: "bg-destructive text-destructive-foreground" },
    returned: { label: "Devolvido", className: "bg-muted text-muted-foreground" },
    overdue: { label: "Vencido", className: "bg-red-600 text-white font-bold animate-pulse" },
};

const AdminRequests = () => {
    const { user } = useAuth();
    const [requests, setRequests] = useState<LoanRequest[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState("all");

    // Estados para o Modal de Prorrogação
    const [extendingRequest, setExtendingRequest] = useState<LoanRequest | null>(null);
    const [selectedNewDate, setSelectedNewDate] = useState<string>("");

    useEffect(() => {
        fetchRequests();
    }, []);

    const fetchRequests = async () => {
        setIsLoading(true);

        try {
            const { data: requestsData, error: requestsError } = await supabase
                .from("loan_requests")
                .select(`
                    id,
                    status,
                    requested_at,
                    approved_at,
                    due_date,
                    returned_at,
                    user_id,
                    book_id
                `)
                .order("requested_at", { ascending: false });

            if (requestsError) throw requestsError;

            if (!requestsData || requestsData.length === 0) {
                setRequests([]);
                setIsLoading(false);
                return;
            }

            const bookIds = requestsData.map(req => req.book_id);
            const { data: booksData, error: booksError } = await supabase
                .from("books")
                .select("id, title, author")
                .in("id", bookIds);

            if (booksError) {
                console.error("Erro ao buscar livros:", booksError);
            }

            const userIds = requestsData.map(req => req.user_id).filter(Boolean);

            const { data: profilesData, error: profilesError } = await supabase
                .from("profiles")
                .select("user_id, full_name, email")
                .in("user_id", userIds);

            if (profilesError) {
                console.error("Erro ao buscar perfis:", profilesError);
            }

            const today = new Date();

            const combinedData = requestsData.map(request => {
                const book = booksData?.find(b => b.id === request.book_id);
                const profile = profilesData?.find(p => p.user_id === request.user_id);

                let currentStatus = request.status;
                if (
                    request.status === "approved" &&
                    request.due_date &&
                    new Date(request.due_date) < today &&
                    !request.returned_at
                ) {
                    currentStatus = "overdue";
                }

                return {
                    ...request,
                    status: currentStatus,
                    book: book || {
                        id: request.book_id,
                        title: "Livro não encontrado",
                        author: ""
                    },
                    profile: profile || {
                        user_id: request.user_id,
                        full_name: `Usuário ${request.user_id?.substring(0, 8) || "Desconhecido"}`,
                        email: `ID: ${request.user_id || "sem ID"}`
                    }
                };
            });

            setRequests(combinedData as unknown as LoanRequest[]);

        } catch (error) {
            console.error("Erro ao buscar solicitações:", error);
            toast.error("Erro ao carregar solicitações");
        } finally {
            setIsLoading(false);
        }
    };

    const handleApprove = async (requestId: string, bookId: string) => {
        if (!user) {
            toast.error("Usuário não autenticado");
            return;
        }

        try {
            const dueDate = addDays(new Date(), 30);

            const { error: requestError } = await supabase
                .from("loan_requests")
                .update({
                    status: "approved",
                    approved_at: new Date().toISOString(),
                    approved_by: user.id,
                    due_date: dueDate.toISOString(),
                })
                .eq("id", requestId);

            if (requestError) throw requestError;

            const { data: bookData, error: fetchBookError } = await supabase
                .from("books")
                .select("available_copies, total_copies")
                .eq("id", bookId)
                .single();

            if (fetchBookError) {
                console.error("Erro ao buscar livro:", fetchBookError);
            }

            const currentCopies = bookData?.available_copies || 1;
            const newAvailableCopies = Math.max(0, currentCopies - 1);
            const newStatus = newAvailableCopies > 0 ? "available" : "borrowed";

            const { error: bookError } = await supabase
                .from("books")
                .update({
                    status: newStatus,
                    available_copies: newAvailableCopies,
                    updated_at: new Date().toISOString(),
                })
                .eq("id", bookId);

            if (bookError) {
                console.error("Erro ao atualizar livro:", bookError);
                toast.error("Empréstimo aprovado, mas houve erro ao atualizar livro");
            } else {
                toast.success("Empréstimo aprovado com prazo de 30 dias!");

                window.dispatchEvent(new CustomEvent('bookUpdated', {
                    detail: { bookId, availableCopies: newAvailableCopies }
                }));
            }

            fetchRequests();

        } catch (error) {
            console.error("Erro ao aprovar solicitação:", error);
            toast.error("Erro ao aprovar solicitação");
        }
    };

    const handleReject = async (requestId: string) => {
        try {
            const { error } = await supabase
                .from("loan_requests")
                .update({
                    status: "rejected",
                    approved_at: null,
                    due_date: null
                })
                .eq("id", requestId);

            if (error) throw error;

            toast.success("Solicitação recusada");
            fetchRequests();

        } catch (error) {
            console.error("Erro ao recusar solicitação:", error);
            toast.error("Erro ao recusar solicitação");
        }
    };

    const handleReturn = async (requestId: string, bookId: string) => {
        try {
            const { error: requestError } = await supabase
                .from("loan_requests")
                .update({
                    status: "returned",
                    returned_at: new Date().toISOString(),
                })
                .eq("id", requestId);

            if (requestError) throw requestError;

            const { data: bookData, error: fetchBookError } = await supabase
                .from("books")
                .select("available_copies, total_copies")
                .eq("id", bookId)
                .single();

            if (fetchBookError) {
                console.error("Erro ao buscar livro:", fetchBookError);
            }

            const currentCopies = bookData?.available_copies || 0;
            const totalCopies = bookData?.total_copies || 1;
            const newAvailableCopies = Math.min(totalCopies, currentCopies + 1);
            const newStatus = newAvailableCopies > 0 ? "available" : "borrowed";

            const { error: bookError } = await supabase
                .from("books")
                .update({
                    status: newStatus,
                    available_copies: newAvailableCopies,
                })
                .eq("id", bookId);

            if (bookError) {
                console.error("Erro ao atualizar livro:", bookError);
                toast.error("Devolução registrada, mas houve erro ao atualizar livro");
            } else {
                toast.success("Devolução registrada!");
            }

            fetchRequests();

        } catch (error) {
            console.error("Erro ao registrar devolução:", error);
            toast.error("Erro ao registrar devolução");
        }
    };

    // Função para salvar a prorrogação da data
    const handleSaveNewDueDate = async () => {
        if (!extendingRequest || !selectedNewDate) {
            toast.error("Selecione uma data válida.");
            return;
        }

        try {
            const formattedIsoDate = new Date(`${selectedNewDate}T23:59:59`).toISOString();

            const { error } = await supabase
                .from("loan_requests")
                .update({
                    due_date: formattedIsoDate,
                    status: "approved" // Garante que o status no banco permaneça/volte como aprovado
                })
                .eq("id", extendingRequest.id);

            if (error) throw error;

            toast.success("Data de devolução prorrogada com sucesso!");
            setExtendingRequest(null);
            setSelectedNewDate("");
            fetchRequests();
        } catch (error) {
            console.error("Erro ao prorrogar empréstimo:", error);
            toast.error("Erro ao alterar a data de devolução.");
        }
    };

    const formatDate = (date: string | null) => {
        if (!date) return "-";
        try {
            return format(new Date(date), "dd/MM/yyyy", { locale: ptBR });
        } catch (error) {
            console.error("Erro ao formatar data:", date, error);
            return "Data inválida";
        }
    };

    const filteredRequests = statusFilter === "all"
        ? requests
        : requests.filter((r) => r.status === statusFilter);

    return (
        <AdminLayout>
        <div className= "space-y-8" >
        <div className="flex items-center justify-between" >
            <div>
            <h1 className="text-3xl font-bold mb-2" > Solicitações de Empréstimo </h1>
                < p className = "text-muted-foreground" >
                    Aprove ou recuse as solicitações de empréstimo
                        </p>
                        </div>
                        < Select value = { statusFilter } onValueChange = { setStatusFilter } >
                            <SelectTrigger className="w-48" >
                                <SelectValue placeholder="Filtrar por status" />
                                    </SelectTrigger>
                                    < SelectContent >
                                    <SelectItem value="all" > Todos </SelectItem>
                                        < SelectItem value = "pending" > Pendentes </SelectItem>
                                            < SelectItem value = "approved" > Aprovados </SelectItem>
                                                < SelectItem value = "overdue" >⚠️ Vencidos </SelectItem>
                                                    < SelectItem value = "rejected" > Recusados </SelectItem>
                                                        < SelectItem value = "returned" > Devolvidos </SelectItem>
                                                            </SelectContent>
                                                            </Select>
                                                            </div>

                                                            < div className = "bg-card rounded-xl shadow-soft overflow-hidden" >
                                                                {
                                                                    isLoading?(
                        <div className = "flex items-center justify-center py-20" >
                                                                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                                                <span className="ml-2" > Carregando solicitações...</span>
                                                                    </div>
                    ) : filteredRequests.length === 0 ? (
    <div className= "text-center py-20 text-muted-foreground" >
    <p className="text-lg mb-2" > Nenhuma solicitação encontrada </p>
        < p className = "text-sm" > Total de solicitações no sistema: { requests.length } </p>
            </div>
                    ) : (
    <>
    <div className= "p-4 border-b" >
    <p className="text-sm text-muted-foreground" >
        Mostrando { filteredRequests.length } de { requests.length } solicitações
            </p>
            </div>
            < Table >
            <TableHeader>
            <TableRow>
            <TableHead>Solicitante </TableHead>
            < TableHead > Livro </TableHead>
            < TableHead > Solicitado em </TableHead>
                < TableHead > Status </TableHead>
                < TableHead > Devolução </TableHead>
                < TableHead className = "text-right" > Ações </TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
{
    filteredRequests.map((request) => (
        <TableRow key= { request.id } >
        <TableCell>
        <div>
        <div className="font-medium" > { request.profile.full_name } </div>
    < div className = "text-sm text-muted-foreground" >
    { request.profile.email }
    </div>
    < div className = "text-xs text-muted-foreground mt-1" >
    ID: { request.user_id?.substring(0, 8) }...
    </div>
    </div>
    </TableCell>
    < TableCell >
    <div>
    <div className="font-medium" > { request.book.title } </div>
    < div className = "text-sm text-muted-foreground" >
    { request.book.author }
    </div>
    </div>
    </TableCell>
    < TableCell > { formatDate(request.requested_at)
} </TableCell>
    < TableCell >
    <Badge className={ statusConfig[request.status]?.className || "bg-muted" }>
    { statusConfig[request.status]?.label || request.status }
        </Badge>
        </TableCell>
        <TableCell>
{
    request.due_date ? (
        <div>
        <div>{ formatDate(request.due_date) } </div>
                                                        {
        request.approved_at && (
            <div className="text-xs text-muted-foreground" >
                Entregue no dia { formatDate(request.approved_at) }
        </div>
                                                        )
    }
    {
        request.returned_at && (
            <div className="text-xs text-muted-foreground" >
                Devolvido em { formatDate(request.returned_at) }
        </div>
                                                        )
    }
    </div>
                                                ) : (
        "-"
    )
}
</TableCell>
    < TableCell className = "text-right" >
        <div className="flex justify-end gap-2" >
        {
            request.status === "pending" && (
                <>
                <Button
                                                                size="sm"
                                                                variant = "default"
                                                                className="bg-success hover:bg-success/90"
                                                                onClick={() => handleApprove(request.id, request.book.id)
        }
            >
            <CheckCircle className="h-4 w-4 mr-1" />
                Aprovar
                </Button>
                < Button
size = "sm"
variant = "destructive"
onClick = {() => handleReject(request.id)}
                                                            >
    <XCircle className="h-4 w-4 mr-1" />
        Recusar
        </Button>
        </>
                                                    )}

{
    (request.status === "approved" || request.status === "overdue") && !request.returned_at && (
        <>
        <Button
                                                                size="sm"
    variant = "outline"
    className = "border-primary text-primary hover:bg-primary/10"
    onClick = {() => handleReturn(request.id, request.book.id)
}
                                                            >
    <RotateCcw className="h-4 w-4 mr-1" />
        Devolução
        </Button>
        < Button
size = "sm"
variant = "outline"
className = "border-amber-500 text-amber-600 hover:bg-amber-50"
onClick = {() => {
    setExtendingRequest(request);
    if (request.due_date) {
        setSelectedNewDate(new Date(request.due_date).toISOString().split('T')[0]);
    }
}}
                                                            >
    <CalendarIcon className="h-4 w-4 mr-1" />
        Prorrogar
        </Button>
        </>
                                                    )}

{
    (request.status === "rejected" || request.status === "returned") && (
        <span className="text-sm text-muted-foreground italic" >
            Nenhuma ação disponível
                </span>
                                                    )
}
</div>
    </TableCell>
    </TableRow>
                                    ))}
</TableBody>
    </Table>
    </>
                    )}
</div>

{/* MODAL PARA PRORROGAR DATA */ }
{
    extendingRequest && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" >
            <div className="bg-card border rounded-xl p-6 max-w-md w-full shadow-lg space-y-4" >
                <h3 className="text-lg font-bold" > Prorrogar Empréstimo </h3>
                    < p className = "text-sm text-muted-foreground" >
                        Escolha a nova data de devolução do livro{ " "}
                            < strong className = "text-foreground" > { extendingRequest.book.title } </strong> para o colaborador{" "}
                                < strong className = "text-foreground" > { extendingRequest.profile.full_name } </strong>.
                                    </p>

                                    < div className = "space-y-2" >
                                        <label className="text-sm font-medium" > Nova Data Limite: </label>
                                            < input
    type = "date"
    className = "w-full p-2.5 border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
    value = { selectedNewDate }
    onChange = {(e) => setSelectedNewDate(e.target.value)
}
                                />
    </div>

    < div className = "flex justify-end gap-2 pt-2" >
        <Button
                                    variant="outline"
onClick = {() => {
    setExtendingRequest(null);
    setSelectedNewDate("");
}}
                                >
    Cancelar
    </Button>
    < Button onClick = { handleSaveNewDueDate } >
        Salvar Nova Data
            </Button>
            </div>
            </div>
            </div>
                )}
</div>
    </AdminLayout>
    );
};

export default AdminRequests;