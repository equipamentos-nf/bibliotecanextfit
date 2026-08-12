import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Lock, Loader2 } from "lucide-react";

const AtualizarSenha = () => {
    const [password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();
    const { toast } = useToast();

    useEffect(() => {
        // Escuta se o Supabase detectou que é uma recuperação de senha
        supabase.auth.onAuthStateChange(async (event, session) => {
            if (event == "PASSWORD_RECOVERY") {
                console.log("Modo de recuperação de senha ativado");
            }
        });
    }, []);

    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password.length < 6) {
            toast({
                title: "Senha muito curta",
                description: "Sua nova senha deve ter pelo menos 6 caracteres.",
                variant: "destructive",
            });
            return;
        }

        setIsLoading(true);

        try {
            // O Supabase já sabe de quem é a senha por causa do link mágico!
            const { error } = await supabase.auth.updateUser({ password: password });

            if (error) throw error;

            toast({
                title: "Senha atualizada!",
                description: "Sua senha foi redefinida com sucesso. Faça login para continuar.",
            });

            // Manda o usuário para a tela de login
            navigate("/entrar");

        } catch (error: any) {
            toast({
                title: "Erro ao atualizar senha",
                description: error.message,
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className= "min-h-screen flex items-center justify-center bg-gray-50 p-4" >
        <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-8 border border-gray-100" >
            <div className="flex flex-col items-center mb-8" >
                <div className="bg-purple-100 p-3 rounded-full mb-4" >
                    <Lock className="h-8 w-8 text-purple-600" />
                        </div>
                        < h1 className = "text-2xl font-bold text-gray-900" > Crie uma nova senha </h1>
                            < p className = "text-muted-foreground text-center mt-2 text-sm" >
                                Digite abaixo a sua nova senha para acessar a Biblioteca NextFit.
          </p>
                                    </div>

                                    < form onSubmit = { handleUpdatePassword } className = "space-y-6" >
                                        <div className="space-y-2" >
                                            <label className="text-sm font-medium" > Nova Senha </label>
                                                < Input
    type = "password"
    placeholder = "••••••••"
    value = { password }
    onChange = {(e) => setPassword(e.target.value)}
required
    />
    </div>

    < Button
type = "submit"
className = "w-full bg-purple-600 hover:bg-purple-700"
disabled = { isLoading }
    >
{
    isLoading?(
              <>
    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        Salvando...
</>
            ) : (
    "Salvar Nova Senha"
)}
</Button>
    </form>
    </div>
    </div>
  );
};

export default AtualizarSenha;