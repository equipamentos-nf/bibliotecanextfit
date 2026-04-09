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
import { Loader2, CheckCircle, XCircle, RotateCcw } from "lucide-react";
import { format, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAuth } from "@/hooks/useAuth";

// CORREÇÃO: Interface atualizada para corresponder à estrutura do banco
interface LoanRequest {
  id: string;
  status: "pending" | "approved" | "rejected" | "returned";
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
    user_id: string; // ← CORREÇÃO: Mudar de 'id' para 'user_id'
    full_name: string;
    email: string;
  };
}

const statusConfig = {
  pending: { label: "Pendente", className: "bg-warning text-warning-foreground" },
  approved: { label: "Aprovado", className: "bg-success text-success-foreground" },
  rejected: { label: "Recusado", className: "bg-destructive text-destructive-foreground" },
  returned: { label: "Devolvido", className: "bg-muted text-muted-foreground" },
};

const AdminRequests = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState<LoanRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    fetchRequests();
    
    // Diagnóstico da estrutura do banco
    const diagnoseDatabase = async () => {
      console.log("=== DIAGNÓSTICO DO BANCO ===");
      
      // Ver um exemplo de loan_requests
      const { data: sampleRequest } = await supabase
        .from("loan_requests")
        .select("user_id, book_id, status")
        .limit(1)
        .single();
      
      if (sampleRequest) {
        console.log("Exemplo de loan_request:", sampleRequest);
        
        // Ver se existe perfil para este user_id
        const { data: profile } = await supabase
          .from("profiles")
          .select("user_id, full_name, email")
          .eq("user_id", sampleRequest.user_id)
          .maybeSingle();
        
        console.log("Perfil encontrado:", profile);
        
        // Ver todos os perfis disponíveis
        const { data: allProfiles } = await supabase
          .from("profiles")
          .select("user_id, full_name, email")
          .limit(5);
        
        console.log("Primeiros perfis:", allProfiles);
      }
    };
    
    diagnoseDatabase();
  }, []);

  // CORREÇÃO PRINCIPAL: Buscar perfis usando user_id em vez de id
  const fetchRequests = async () => {
    setIsLoading(true);
    
    console.log("Buscando solicitações...");
    
    try {
      // 1. Buscar solicitações
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

      console.log("Solicitações encontradas:", requestsData?.length || 0);
      console.log("Primeira solicitação:", requestsData?.[0]);

      if (!requestsData || requestsData.length === 0) {
        setRequests([]);
        setIsLoading(false);
        return;
      }

      // 2. Buscar livros
      const bookIds = requestsData.map(req => req.book_id);
      const { data: booksData, error: booksError } = await supabase
        .from("books")
        .select("id, title, author")
        .in("id", bookIds);

      if (booksError) {
        console.error("Erro ao buscar livros:", booksError);
      }

      console.log("Livros encontrados:", booksData?.length || 0);

      // 3. CORREÇÃO: Buscar perfis usando user_id
      const userIds = requestsData.map(req => req.user_id).filter(Boolean);
      console.log("User IDs para buscar:", userIds);
      
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("user_id, full_name, email") // ← CORREÇÃO: Selecionar user_id, não id
        .in("user_id", userIds); // ← CORREÇÃO: Filtrar por user_id

      if (profilesError) {
        console.error("Erro ao buscar perfis:", profilesError);
      }

      console.log("Perfis encontrados:", profilesData?.length || 0);
      console.log("Primeiros perfis:", profilesData);

      // 4. Combinar os dados
      const combinedData = requestsData.map(request => {
        const book = booksData?.find(b => b.id === request.book_id);
        
        // CORREÇÃO: Buscar perfil pelo user_id
        const profile = profilesData?.find(p => p.user_id === request.user_id);
        
        console.log(`Buscando perfil para user_id ${request.user_id}:`, profile);
        
        return {
          ...request,
          book: book || { 
            id: request.book_id, 
            title: "Livro não encontrado", 
            author: "" 
          },
          profile: profile || { 
            user_id: request.user_id, // ← CORREÇÃO: Incluir user_id
            full_name: `Usuário ${request.user_id?.substring(0, 8) || "Desconhecido"}`, 
            email: `ID: ${request.user_id || "sem ID"}` 
          }
        };
      });

      console.log("Dados combinados:", combinedData);
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

  console.log("Aprovando solicitação:", requestId, "Livro:", bookId);

  try {
    const dueDate = addDays(new Date(), 14);

    // 1. Atualizar a solicitação
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

    // 2. Buscar o livro para atualizar cópias disponíveis
    const { data: bookData, error: fetchBookError } = await supabase
      .from("books")
      .select("available_copies, total_copies")
      .eq("id", bookId)
      .single();

    if (fetchBookError) {
      console.error("Erro ao buscar livro:", fetchBookError);
      // Não interromper o fluxo se não conseguir buscar
    }

    const currentCopies = bookData?.available_copies || 1;
    const totalCopies = bookData?.total_copies || 1;
    const newAvailableCopies = Math.max(0, currentCopies - 1);
    const newStatus = newAvailableCopies > 0 ? "available" : "borrowed";

    // 3. Atualizar o livro - ESTA É A PARTE IMPORTANTE
    const { error: bookError } = await supabase
      .from("books")
      .update({
        status: newStatus,
        available_copies: newAvailableCopies,
        updated_at: new Date().toISOString(), // ← Adicione esta linha
      })
      .eq("id", bookId);

    if (bookError) {
      console.error("Erro ao atualizar livro:", bookError);
      toast.error("Empréstimo aprovado, mas houve erro ao atualizar livro");
    } else {
      toast.success("Empréstimo aprovado!");
      
      // Disparar evento personalizado para notificar outras páginas
      window.dispatchEvent(new CustomEvent('bookUpdated', {
        detail: { bookId, availableCopies: newAvailableCopies }
      }));
    }

    // 4. Recarregar dados
    fetchRequests();
    
  } catch (error) {
    console.error("Erro ao aprovar solicitação:", error);
    toast.error("Erro ao aprovar solicitação");
  }
};

  const handleReject = async (requestId: string) => {
    console.log("Recusando solicitação:", requestId);
    
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
    console.log("Registrando devolução:", requestId, "Livro:", bookId);
    
    try {
      // 1. Atualizar a solicitação
      const { error: requestError } = await supabase
        .from("loan_requests")
        .update({
          status: "returned",
          returned_at: new Date().toISOString(),
        })
        .eq("id", requestId);

      if (requestError) throw requestError;

      // 2. Buscar o livro para incrementar cópias
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

      // 3. Atualizar o livro
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

      // 4. Recarregar dados
      fetchRequests();
      
    } catch (error) {
      console.error("Erro ao registrar devolução:", error);
      toast.error("Erro ao registrar devolução");
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
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Solicitações de Empréstimo</h1>
            <p className="text-muted-foreground">
              Aprove ou recuse as solicitações de empréstimo
            </p>
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filtrar por status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="pending">Pendentes</SelectItem>
              <SelectItem value="approved">Aprovados</SelectItem>
              <SelectItem value="rejected">Recusados</SelectItem>
              <SelectItem value="returned">Devolvidos</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="bg-card rounded-xl shadow-soft overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2">Carregando solicitações...</span>
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">
              <p className="text-lg mb-2">Nenhuma solicitação encontrada</p>
              <p className="text-sm">Total de solicitações no sistema: {requests.length}</p>
            </div>
          ) : (
            <>
              <div className="p-4 border-b">
                <p className="text-sm text-muted-foreground">
                  Mostrando {filteredRequests.length} de {requests.length} solicitações
                </p>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Solicitante</TableHead>
                    <TableHead>Livro</TableHead>
                    <TableHead>Solicitado em</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Devolução</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRequests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{request.profile.full_name}</div>
                          <div className="text-sm text-muted-foreground">
                            {request.profile.email}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            ID: {request.user_id?.substring(0, 8)}...
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{request.book.title}</div>
                          <div className="text-sm text-muted-foreground">
                            {request.book.author}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{formatDate(request.requested_at)}</TableCell>
                      <TableCell>
                        <Badge className={statusConfig[request.status]?.className || "bg-muted"}>
                          {statusConfig[request.status]?.label || request.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {request.due_date ? (
                          <div>
                            <div>{formatDate(request.due_date)}</div>
                            {request.returned_at && (
                              <div className="text-xs text-muted-foreground">
                                Devolvido: {formatDate(request.returned_at)}
                              </div>
                            )}
                          </div>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {request.status === "pending" && (
                            <>
                              <Button
                                size="sm"
                                variant="default"
                                className="bg-success hover:bg-success/90"
                                onClick={() => handleApprove(request.id, request.book.id)}
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Aprovar
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleReject(request.id)}
                              >
                                <XCircle className="h-4 w-4 mr-1" />
                                Recusar
                              </Button>
                            </>
                          )}
                          {request.status === "approved" && !request.returned_at && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-primary text-primary hover:bg-primary/10"
                              onClick={() => handleReturn(request.id, request.book.id)}
                            >
                              <RotateCcw className="h-4 w-4 mr-1" />
                              Registrar Devolução
                            </Button>
                          )}
                          {(request.status === "rejected" || request.status === "returned") && (
                            <span className="text-sm text-muted-foreground italic">
                              Nenhuma ação disponível
                            </span>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminRequests;