import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import LanguageSelector from "@/components/LanguageSelector";
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
  const { t } = useLanguage();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) navigate("/");
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const endpoint = isRegister ? "/auth/register" : "/auth/login";
      const payload = isRegister ? form : { email: form.email, password: form.password };
      const { data } = await api.post(endpoint, payload);
      login(data.token, data.user);
      toast.success(isRegister ? t("login.success_register") : t("login.success_login"));
      navigate("/");
    } catch (err) {
      toast.error(err.response?.data?.detail || t("login.error"));
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
            {t("login.subtitle")}
          </p>
          <div className="flex justify-center mt-4">
            <LanguageSelector />
          </div>
        </div>

        <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-md p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {isRegister && (
              <div className="space-y-2">
                <Label className="text-zinc-400 text-xs uppercase tracking-widest font-mono">
                  {t("login.name")}
                </Label>
                <Input
                  data-testid="register-name-input"
                  placeholder={t("login.name_placeholder")}
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="bg-zinc-950/50 border-zinc-800 text-white placeholder:text-zinc-600 focus:border-white/50 focus:ring-0 rounded-sm h-12"
                  required
                />
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-zinc-400 text-xs uppercase tracking-widest font-mono">
                {t("login.email")}
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
                {t("login.password")}
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
                  {isRegister ? t("login.submit_register") : t("login.submit_login")}
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
              {isRegister ? t("login.toggle_login") : t("login.toggle_register")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
