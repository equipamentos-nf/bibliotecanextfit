import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "./AdminLayout";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Edit, Lock, Unlock, Shield, Mail } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";

interface Profile {
    id: string;
    user_id: string;
    full_name: string;
    email: string;
    is_active: boolean;
    user_roles?: { role: string }[];
}

const AdminUsers = () => {
    const { toast } = useToast();
    const [users, setUsers] = useState<Profile[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Estados para o Modal de Edição
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<Profile | null>(null);
    const [newName, setNewName] = useState("");
    const [isUserAdmin, setIsUserAdmin] = useState(false); // NOVO: Controle do nível de acesso

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        setIsLoading(true);
        try {
            const { data: profilesData, error: profilesError } = await supabase
                .from("profiles")
                .select("*")
                .order("full_name");

            if (profilesError) throw profilesError;

            const { data: rolesData, error: rolesError } = await supabase
                .from("user_roles")
                .select("*");

            if (rolesError) throw rolesError;

            const combinedUsers = profilesData.map((profile) => {
                const userRoles = rolesData.filter((role) => role.user_id === profile.user_id);
                return {
                    ...profile,
                    user_roles: userRoles
                };
            });

            setUsers(combinedUsers || []);
        } catch (error: any) {
            console.error("Erro ao buscar usuários:", error);
            toast({
                title: "Erro",
                description: "Não foi possível carregar a lista de usuários.",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleToggleStatus = async (userId: string, currentStatus: boolean) => {
        try {
            const newStatus = !currentStatus;

            const { data, error } = await supabase
                .from("profiles")
                .update({ is_active: newStatus })
                .eq("id", userId)
                .select();

            if (error) throw error;

            if (!data || data.length === 0) {
                throw new Error("Ação bloqueada pelo banco de dados (Sem permissão).");
            }

            setUsers(users.map(user =>
                user.id === userId ? { ...user, is_active: newStatus } : user
            ));

            toast({
                title: "Status atualizado",
                description: `O usuário foi ${newStatus ? 'ativado' : 'desativado'} com sucesso.`,
            });
        } catch (error: any) {
            toast({
                title: "Erro ao atualizar",
                description: error.message,
                variant: "destructive",
            });
        }
    };

    const openEditDialog = (user: Profile) => {
        setEditingUser(user);
        setNewName(user.full_name || "");

        // Verifica se o usuário tem a role 'admin' e marca o checkbox
        const isAdmin = user.user_roles?.some(r => r.role === 'admin') || false;
        setIsUserAdmin(isAdmin);

        setIsEditDialogOpen(true);
    };

    const handleSaveEdit = async () => {
        if (!editingUser) return;

        try {
            // 1. Atualiza o nome na tabela profiles
            const { error: profileError } = await supabase
                .from("profiles")
                .update({ full_name: newName })
                .eq("id", editingUser.id);

            if (profileError) throw profileError;

            // 2. Atualiza a permissão de Administrador
            const wasAdmin = editingUser.user_roles?.some(r => r.role === 'admin');

            if (isUserAdmin && !wasAdmin) {
                // Concede o acesso de admin inserindo a role
                const { error: roleError } = await supabase
                    .from("user_roles")
                    .insert({ user_id: editingUser.user_id, role: 'admin' });
                if (roleError) throw roleError;
            } else if (!isUserAdmin && wasAdmin) {
                // Remove o acesso de admin deletando a role
                const { error: roleError } = await supabase
                    .from("user_roles")
                    .delete()
                    .eq("user_id", editingUser.user_id)
                    .eq("role", "admin");
                if (roleError) throw roleError;
            }

            // Atualiza a tabela na tela puxando os dados novos do banco
            await fetchUsers();
            setIsEditDialogOpen(false);

            toast({
                title: "Usuário atualizado",
                description: "As informações e permissões foram salvas com sucesso.",
            });
        } catch (error: any) {
            toast({
                title: "Erro ao salvar",
                description: error.message,
                variant: "destructive",
            });
        }
    };

    const handleSendPasswordReset = async () => {
        if (!editingUser) return;
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(editingUser.email, {
                redirectTo: `${window.location.origin}/atualizarSenha`,
            });
            if (error) throw error;
            toast({
                title: "E-mail enviado!",
                description: `Um link de redefinição de senha foi enviado para ${editingUser.email}.`,
            });
        } catch (error: any) {
            toast({
                title: "Erro ao enviar e-mail",
                description: error.message,
                variant: "destructive",
            });
        }
    };

    return (
        <AdminLayout>
        <div className= "space-y-6" >
        <div className="flex flex-col gap-2" >
            <h1 className="text-3xl font-bold tracking-tight" > Gerenciar Usuários </h1>
                < p className = "text-muted-foreground" >
                    Visualize, edite informações e desative o acesso de colaboradores.
          </p>
                        </div>

                        < div className = "bg-white rounded-md border" >
                            <Table>
                            <TableHeader>
                            <TableRow>
                            <TableHead>Nome </TableHead>
                            < TableHead > Email </TableHead>
                            < TableHead > Permissão </TableHead>
                            < TableHead > Status </TableHead>
                            < TableHead className = "text-right" > Ações </TableHead>
                                </TableRow>
                                </TableHeader>
                                <TableBody>
    {
        isLoading ? (
            <TableRow>
            <TableCell colSpan= { 5} className = "text-center py-10" >
                Carregando usuários...
        </TableCell>
            </TableRow>
              ) : users.length === 0 ? (
    <TableRow>
    <TableCell colSpan= { 5} className = "text-center py-10 text-muted-foreground" >
        Nenhum usuário encontrado.
                  </TableCell>
            </TableRow>
              ) : (
    users.map((user) => {
        const isAdmin = user.user_roles?.some(r => r.role === 'admin');

        return (
            <TableRow key= { user.id } >
            <TableCell className="font-medium" > { user.full_name || 'Sem nome' } </TableCell>
                < TableCell > { user.email } </TableCell>
                <TableCell>
        {
            isAdmin ? (
                <Badge className= "bg-purple-600 hover:bg-purple-700" >
                <Shield className="h-3 w-3 mr-1" /> Admin
                    </Badge>
                        ) : (
    <Badge variant= "outline" > Colaborador </Badge>
                        )}
</TableCell>
    < TableCell >
    <Badge 
                          variant={ user.is_active ? "default" : "destructive" }
className = { user.is_active ? "bg-emerald-500 hover:bg-emerald-600" : "" }
    >
{ user.is_active ? "Ativo" : "Inativo" }
    </Badge>
    </TableCell>
    < TableCell className = "text-right" >
        <div className="flex justify-end gap-2" >
            <Button 
                            variant="ghost"
size = "icon"
onClick = {() => openEditDialog(user)}
title = "Editar Usuário"
    >
    <Edit className="h-4 w-4 text-gray-600" />
        </Button>

        < Button
variant = "ghost"
size = "icon"
onClick = {() => handleToggleStatus(user.id, user.is_active)}
title = { user.is_active ? "Desativar Acesso" : "Reativar Acesso" }
className = { user.is_active ? "hover:text-red-600 hover:bg-red-50" : "hover:text-emerald-600 hover:bg-emerald-50" }
    >
    {
        user.is_active ? (
            <Lock className= "h-4 w-4" />
                            ) : (
                <Unlock className="h-4 w-4" />
                            )}
</Button>
    </div>
    </TableCell>
    </TableRow>
                  );
                })
              )}
</TableBody>
    </Table>
    </div>

{/* Modal de Edição */ }
<Dialog open={ isEditDialogOpen } onOpenChange = { setIsEditDialogOpen } >
    <DialogContent>
    <DialogHeader>
    <DialogTitle>Editar Colaborador </DialogTitle>
        </DialogHeader>

        < div className = "py-4 space-y-4" >
            <div className="space-y-2" >
                <label className="text-sm font-medium block" > Nome Completo </label>
                    < Input
value = { newName }
onChange = {(e) => setNewName(e.target.value)}
placeholder = "Digite o nome do usuário"
    />
    </div>

    < div className = "space-y-2" >
        <label className="text-sm font-medium block" > E-mail(Login) </label>
            < Input
value = { editingUser?.email || ""}
disabled
className = "bg-gray-100 text-gray-500 cursor-not-allowed"
    />
    <p className="text-xs text-muted-foreground" >
        Por motivos de segurança, o E-mail de login não pode ser alterado por aqui.
                </p>
            </div>


{/* Módulo de Permissão de Acesso */ }
<div className="pt-4 border-t border-gray-100" >
    <div className="flex items-center justify-between" >
        <div className="space-y-0.5 pr-4" >
            <label 
                      className="text-sm font-medium text-gray-900 cursor-pointer"
onClick = {() => setIsUserAdmin(!isUserAdmin)}
                    >
    Acesso de Administrador
        </label>
        < p className = "text-xs text-muted-foreground" >
            Administradores podem gerenciar usuários, livros e aprovar empréstimos.
                    </p>
                </div>

                < Switch
checked = { isUserAdmin }
onCheckedChange = { setIsUserAdmin }
    />
    </div>
    </div>

    < div className = "space-y-2 pt-4 border-t border-gray-100" >
        <label className="text-sm font-medium block" > Segurança </label>
            < Button
variant = "outline"
className = "w-full justify-start text-purple-700 hover:text-purple-800 hover:bg-purple-50 border-purple-200"
onClick = { handleSendPasswordReset }
    >
    <Mail className="h-4 w-4 mr-2" />
        Enviar link de redefinição de senha
            </Button>
            </div>
            </div>

            < DialogFooter >
            <Button variant="outline" onClick = {() => setIsEditDialogOpen(false)}>
                Cancelar
                </Button>
                < Button onClick = { handleSaveEdit } className = "bg-purple-600 hover:bg-purple-700" >
                    Salvar Alterações
                        </Button>
                        </DialogFooter>
                        </DialogContent>
                        </Dialog>
                        </div>
                        </AdminLayout>
  );
};

export default AdminUsers;