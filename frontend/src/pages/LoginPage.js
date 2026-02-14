import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, ChevronRight } from "lucide-react";

export default function LoginPage() {
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const { login, user } = useAuth();
  const navigate = useNavigate();

  if (user) {
    navigate("/");
    return null;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const endpoint = isRegister ? "/auth/register" : "/auth/login";
      const payload = isRegister ? form : { email: form.email, password: form.password };
      const { data } = await api.post(endpoint, payload);
      login(data.token, data.user);
      toast.success(isRegister ? "Conta criada!" : "Bem-vindo de volta!");
      navigate("/");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Erro ao autenticar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md animate-fade-in-up">
        <div className="mb-12 text-center">
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white mb-3">
            AdOperator
          </h1>
          <p className="text-zinc-500 text-xs font-mono uppercase tracking-widest">
            Motor de Decisao
          </p>
        </div>

        <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-md p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {isRegister && (
              <div className="space-y-2">
                <Label className="text-zinc-400 text-xs uppercase tracking-widest font-mono">
                  Nome
                </Label>
                <Input
                  data-testid="register-name-input"
                  placeholder="Seu nome"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="bg-zinc-950/50 border-zinc-800 text-white placeholder:text-zinc-600 focus:border-white/50 focus:ring-0 rounded-sm h-12"
                  required
                />
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-zinc-400 text-xs uppercase tracking-widest font-mono">
                Email
              </Label>
              <Input
                data-testid="login-email-input"
                type="email"
                placeholder="seu@email.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="bg-zinc-950/50 border-zinc-800 text-white placeholder:text-zinc-600 focus:border-white/50 focus:ring-0 rounded-sm h-12"
                required
              />
            </div>

            <div className="space-y-2">
              <Label className="text-zinc-400 text-xs uppercase tracking-widest font-mono">
                Senha
              </Label>
              <Input
                data-testid="login-password-input"
                type="password"
                placeholder="--------"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="bg-zinc-950/50 border-zinc-800 text-white placeholder:text-zinc-600 focus:border-white/50 focus:ring-0 rounded-sm h-12"
                required
              />
            </div>

            <Button
              data-testid="auth-submit-button"
              type="submit"
              disabled={loading}
              className="w-full bg-white text-black hover:bg-zinc-200 shadow-[0_0_15px_rgba(255,255,255,0.1)] transition-all duration-300 rounded-sm h-12 font-semibold"
            >
              {loading ? (
                <Loader2 className="animate-spin h-4 w-4" />
              ) : (
                <>
                  {isRegister ? "Criar Conta" : "Entrar"}
                  <ChevronRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <button
              data-testid="toggle-auth-mode"
              onClick={() => setIsRegister(!isRegister)}
              className="text-zinc-500 hover:text-white text-sm transition-colors duration-300"
            >
              {isRegister ? "Ja tem conta? Entrar" : "Nao tem conta? Criar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
