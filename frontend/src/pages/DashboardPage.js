import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Plus, LogOut, ChevronRight, Clock, User, Crosshair, Trash2, MoreVertical } from "lucide-react";
import { toast } from "sonner";

const statusLabels = {
  created: "Criado",
  parsed: "Analisado",
  generated: "Anuncios Gerados",
  simulated: "Simulado",
  completed: "Concluido",
};

const statusColors = {
  created: "text-zinc-400 border-zinc-700",
  parsed: "text-blue-400 border-blue-400/30",
  generated: "text-purple-400 border-purple-400/30",
  simulated: "text-amber-400 border-amber-400/30",
  completed: "text-emerald-400 border-emerald-400/30",
};

export default function DashboardPage() {
  const [analyses, setAnalyses] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    api.get("/analyses")
      .then((res) => setAnalyses(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen">
      <header className="border-b border-zinc-800/50 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Crosshair className="h-5 w-5 text-white" strokeWidth={1.5} />
            <h1 className="text-lg font-bold text-white tracking-tight">
              AdOperator
            </h1>
            <span className="text-zinc-700 text-xs font-mono hidden sm:inline">
              v1.0
            </span>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                data-testid="user-menu-trigger"
                className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors"
              >
                <User className="h-4 w-4" strokeWidth={1.5} />
                <span className="text-sm hidden sm:inline">{user?.name}</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-800">
              <DropdownMenuItem
                data-testid="logout-button"
                onClick={() => {
                  logout();
                  navigate("/login");
                }}
                className="text-zinc-300 focus:text-white focus:bg-zinc-800 cursor-pointer"
              >
                <LogOut className="h-4 w-4 mr-2" strokeWidth={1.5} />
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12">
        <div className="flex items-center justify-between mb-10">
          <div>
            <h2 className="text-2xl md:text-3xl font-semibold text-white tracking-tight">
              Suas Analises
            </h2>
            <p className="text-zinc-500 text-sm mt-1">
              Motor de decisao para anuncios
            </p>
          </div>
          <Button
            data-testid="new-analysis-button"
            onClick={() => navigate("/analysis/new")}
            className="bg-white text-black hover:bg-zinc-200 shadow-[0_0_15px_rgba(255,255,255,0.1)] transition-all duration-300 rounded-sm font-semibold px-6"
          >
            <Plus className="h-4 w-4 mr-2" strokeWidth={1.5} />
            Nova Analise
          </Button>
        </div>

        <Separator className="bg-zinc-800/50 mb-8" />

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-20 bg-zinc-900/30 animate-pulse rounded-md"
              />
            ))}
          </div>
        ) : analyses.length === 0 ? (
          <div className="text-center py-20 animate-fade-in-up">
            <div className="w-16 h-16 rounded-full bg-zinc-900/50 border border-zinc-800 flex items-center justify-center mx-auto mb-6">
              <Crosshair className="h-6 w-6 text-zinc-600" strokeWidth={1.5} />
            </div>
            <p className="text-zinc-500 text-sm mb-6">
              Nenhuma analise ainda. Comece descrevendo seu produto.
            </p>
            <Button
              data-testid="first-analysis-button"
              onClick={() => navigate("/analysis/new")}
              className="bg-white text-black hover:bg-zinc-200 shadow-[0_0_15px_rgba(255,255,255,0.1)] rounded-sm font-semibold"
            >
              Criar Primeira Analise
            </Button>
          </div>
        ) : (
          <div className="space-y-3 animate-fade-in-up">
            {analyses.map((a) => (
              <button
                key={a.id}
                data-testid={`analysis-item-${a.id}`}
                onClick={() =>
                  a.status === "completed"
                    ? navigate(`/analysis/${a.id}`)
                    : navigate(`/analysis/new?resume=${a.id}`)
                }
                className="w-full text-left bg-zinc-900/30 border border-zinc-800/50 rounded-md p-5 hover:border-zinc-700 transition-all duration-300 group"
              >
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-white font-medium text-sm truncate">
                      {a.product?.nome}
                    </h3>
                    <div className="flex items-center gap-3 mt-2">
                      <Badge
                        variant="outline"
                        className="text-zinc-500 border-zinc-800 text-xs font-mono"
                      >
                        {a.product?.nicho}
                      </Badge>
                      <span className="text-zinc-600 text-xs flex items-center gap-1">
                        <Clock className="h-3 w-3" strokeWidth={1.5} />
                        {new Date(a.created_at).toLocaleDateString("pt-BR")}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 ml-4">
                    <Badge
                      variant="outline"
                      className={statusColors[a.status] || "text-zinc-400"}
                    >
                      {statusLabels[a.status] || a.status}
                    </Badge>
                    <ChevronRight
                      className="h-4 w-4 text-zinc-700 group-hover:text-white transition-colors"
                      strokeWidth={1.5}
                    />
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
