import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import Logo from "@/components/Logo";
import { Loader2, MailWarning } from "lucide-react";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showResendButton, setShowResendButton] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const { signIn, resendConfirmation, isEmailNotConfirmedError } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setShowResendButton(false);

    const { error } = await signIn(email, password);

    if (error) {
      // Verificar se o erro é de e-mail não confirmado usando a função do hook
      if (isEmailNotConfirmedError(error)) {
        toast.error("E-mail não confirmado. Por favor, verifique sua caixa de entrada.");
        setShowResendButton(true);
      } else {
        toast.error("Erro ao entrar. Verifique suas credenciais.");
      }
      setIsLoading(false);
      return;
    }

    toast.success("Bem-vindo de volta!");
    navigate("/catalogo");
  };

  const handleResendConfirmation = async () => {
    if (!email) {
      toast.error("Digite seu e-mail para reenviar a confirmação");
      return;
    }

    setResendLoading(true);
    const { error } = await resendConfirmation(email);

    if (error) {
      toast.error("Erro ao reenviar confirmação. Tente novamente.");
    } else {
      toast.success("E-mail de confirmação reenviado! Verifique sua caixa de entrada.");
      setShowResendButton(false);
    }
    setResendLoading(false);
  };

  return (
    <div className="min-h-screen hero-gradient flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex justify-center">
            <Logo size="lg" />
          </Link>
          <h1 className="text-2xl font-bold mt-6 mb-2">Bem-vindo de volta</h1>
          <p className="text-muted-foreground">Entre com sua conta para acessar a biblioteca</p>
        </div>

        <div className="bg-card rounded-xl p-8 shadow-medium">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Entrando...
                </>
              ) : (
                "Entrar"
              )}
            </Button>
          </form>

          {/* Botão de reenviar confirmação */}
          {showResendButton && (
            <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-start gap-3">
                <MailWarning className="h-5 w-5 text-amber-600 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-amber-800 font-medium mb-2">
                    Seu e-mail ainda não foi confirmado
                  </p>
                  <p className="text-xs text-amber-700 mb-3">
                    Verifique sua caixa de entrada e spam. Não recebeu o e-mail?
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleResendConfirmation}
                    disabled={resendLoading}
                    className="w-full border-amber-300 text-amber-700 hover:bg-amber-50"
                  >
                    {resendLoading ? (
                      <>
                        <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      "Reenviar e-mail de confirmação"
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}

          <div className="mt-6 text-center text-sm">
            <span className="text-muted-foreground">Não tem uma conta? </span>
            <Link to="/cadastrar" className="text-primary font-medium hover:underline">
              Cadastre-se
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;