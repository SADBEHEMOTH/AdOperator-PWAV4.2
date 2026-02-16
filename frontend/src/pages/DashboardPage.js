import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import LanguageSelector from "@/components/LanguageSelector";
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
import { Plus, LogOut, ChevronRight, Clock, User, Crosshair, Trash2, MoreVertical, Zap, TrendingUp, ArrowRight, BarChart3, Search, Loader2, AlertTriangle, Radio, Brain, Target, Users as UsersIcon, Eye } from "lucide-react";
import { toast } from "sonner";
import PushNotificationPrompt from "@/components/PushNotificationPrompt";

export default function DashboardPage() {
  const [analyses, setAnalyses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [radar, setRadar] = useState(null);
  const [radarLoading, setRadarLoading] = useState(false);
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([
      api.get("/analyses").then((res) => setAnalyses(res.data)).catch(() => {}),
      api.get("/radar/latest").then((res) => { if (res.data) setRadar(res.data); }).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, []);

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    try {
      await api.delete(`/analyses/${id}`);
      setAnalyses((prev) => prev.filter((a) => a.id !== id));
      toast.success(t("dash.deleted"));
    } catch {
      toast.error(t("dash.delete_error"));
    }
  };

  const handleGenerateRadar = async () => {
    setRadarLoading(true);
    try {
      const { data } = await api.post("/radar/generate");
      setRadar(data);
      toast.success("Radar gerado!");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Erro ao gerar radar");
    } finally {
      setRadarLoading(false);
    }
  };

  const statusLabels = {
    created: t("status.created"),
    parsed: t("status.parsed"),
    generated: t("status.generated"),
    simulated: t("status.simulated"),
    completed: t("status.completed"),
  };

  const statusColors = {
    created: "text-zinc-400 border-zinc-700",
    parsed: "text-blue-400 border-blue-400/30",
    generated: "text-purple-400 border-purple-400/30",
    simulated: "text-amber-400 border-amber-400/30",
    completed: "text-emerald-400 border-emerald-400/30",
  };

  const priorityColor = (p) => {
    if (!p) return "text-zinc-400";
    if (p === "urgente") return "text-red-400";
    if (p === "importante") return "text-amber-400";
    return "text-zinc-400";
  };

  return (
    <div className="min-h-screen">
      <header className="border-b border-zinc-800/50 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Crosshair className="h-5 w-5 text-white" strokeWidth={1.5} />
            <h1 className="text-lg font-bold text-white tracking-tight">AdOperator</h1>
            <span className="text-zinc-700 text-xs font-mono hidden sm:inline">v2.0</span>
          </div>
          <div className="flex items-center gap-3">
            <LanguageSelector />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button data-testid="user-menu-trigger" className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors">
                  <User className="h-4 w-4" strokeWidth={1.5} />
                  <span className="text-sm hidden sm:inline">{user?.name}</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-800">
                <DropdownMenuItem
                  data-testid="logout-button"
                  onClick={() => { logout(); navigate("/login"); }}
                  className="text-zinc-300 focus:text-white focus:bg-zinc-800 cursor-pointer"
                >
                  <LogOut className="h-4 w-4 mr-2" strokeWidth={1.5} />
                  {t("dash.logout")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12">
        <div className="flex items-center justify-between mb-10">
          <div>
            <h2 className="text-2xl md:text-3xl font-semibold text-white tracking-tight">{t("dash.title")}</h2>
            <p className="text-zinc-500 text-sm mt-1">{t("dash.subtitle")}</p>
          </div>
          <Button
            data-testid="new-analysis-button"
            onClick={() => navigate("/analysis/new")}
            className="bg-white text-black hover:bg-zinc-200 shadow-[0_0_15px_rgba(255,255,255,0.1)] transition-all duration-300 rounded-sm font-semibold px-6"
          >
            <Plus className="h-4 w-4 mr-2" strokeWidth={1.5} />
            {t("dash.new_analysis")}
          </Button>
        </div>

        <Separator className="bg-zinc-800/50 mb-8" />

        {/* Push Notification Prompt */}
        <PushNotificationPrompt />

        {/* Quick Actions - when analyses exist but none completed */}
        {!loading && analyses.length > 0 && !analyses.find(a => a.status === "completed") && (
          <div className="mb-6 flex gap-3 animate-fade-in-up">
            <Button data-testid="competitor-analysis-quick" onClick={() => navigate("/competitor")} variant="outline" className="border-zinc-800 hover:border-zinc-600 text-zinc-300 hover:text-white rounded-sm font-semibold text-xs h-10">
              <Search className="h-3.5 w-3.5 mr-1.5" strokeWidth={1.5} />
              {t("panel.analyze_competitor")}
            </Button>
          </div>
        )}

        {/* LIVE PANEL */}
        {!loading && analyses.length > 0 && (() => {
          const latest = analyses.find(a => a.status === "completed");
          if (!latest) return null;
          const d = latest.decision;
          const v = d?.veredito || d?.vencedor || {};
          const product = latest.product;
          const strategy = latest.strategic_analysis;
          const completedCount = analyses.filter(a => a.status === "completed").length;
          const weaknesses = d?.fraquezas || [];
          const nextStep = d?.proximo_passo;
          return (
            <div className="mb-8 space-y-4 animate-fade-in-up" data-testid="live-panel">
              <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-md p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs font-mono text-zinc-500 uppercase tracking-widest">{t("panel.active_product")}</span>
                </div>
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <p className="text-zinc-500 text-xs">{t("panel.product")}</p>
                      <p className="text-white text-sm font-medium">{product?.nome}</p>
                    </div>
                    <div>
                      <p className="text-zinc-500 text-xs">{t("panel.current_strategy")}</p>
                      <p className="text-white text-sm font-medium">{strategy?.angulo_venda || v.hipotese || `Variacao ${v.anuncio_numero}`}</p>
                    </div>
                  </div>
                  {weaknesses.length > 0 && (
                    <div className="bg-amber-500/5 border border-amber-500/15 rounded-sm p-3">
                      <p className="text-amber-400/80 text-xs font-mono uppercase tracking-widest mb-1">{t("panel.biggest_weakness")}</p>
                      <p className="text-zinc-300 text-xs">{weaknesses[0]}</p>
                    </div>
                  )}
                  {nextStep && (
                    <div className="bg-zinc-950/30 rounded-sm p-3">
                      <p className="text-zinc-600 text-xs font-mono uppercase tracking-widest mb-1">{t("panel.next_action")}</p>
                      <p className="text-zinc-300 text-xs">{nextStep.acao}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Button data-testid="improve-from-dashboard" onClick={() => navigate(`/analysis/${latest.id}`)} className="bg-white text-black hover:bg-zinc-200 shadow-[0_0_10px_rgba(255,255,255,0.08)] rounded-sm font-semibold text-xs h-11">
                  <Zap className="h-3.5 w-3.5 mr-1.5" strokeWidth={1.5} />
                  {t("panel.improve_ad")}
                </Button>
                <Button data-testid="market-compare-dashboard" onClick={() => navigate(`/analysis/${latest.id}/market`)} variant="outline" className="border-zinc-800 hover:border-zinc-600 text-zinc-300 hover:text-white rounded-sm font-semibold text-xs h-11">
                  <BarChart3 className="h-3.5 w-3.5 mr-1.5" strokeWidth={1.5} />
                  {t("panel.compare_market")}
                </Button>
                <Button data-testid="competitor-analysis-dashboard" onClick={() => navigate("/competitor")} variant="outline" className="border-zinc-800 hover:border-zinc-600 text-zinc-300 hover:text-white rounded-sm font-semibold text-xs h-11">
                  <Search className="h-3.5 w-3.5 mr-1.5" strokeWidth={1.5} />
                  {t("panel.analyze_competitor")}
                </Button>
              </div>

              {completedCount > 1 && (
                <div className="flex items-center gap-1 text-emerald-400/60 text-xs">
                  <TrendingUp className="h-3 w-3" /> {completedCount} {t("dash.versions_generated")}
                </div>
              )}

              <Separator className="bg-zinc-800/30" />
            </div>
          );
        })()}

        {/* RADAR DE TENDÊNCIAS */}
        {!loading && analyses.some(a => a.status === "completed") && (
          <div className="mb-8 animate-fade-in-up" data-testid="radar-section">
            <div className="bg-zinc-900/20 border border-zinc-800/30 rounded-md p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Radio className="h-4 w-4 text-emerald-400" strokeWidth={1.5} />
                  <span className="text-xs font-mono text-zinc-400 uppercase tracking-widest">{t("radar.title")}</span>
                </div>
                <Button
                  data-testid="generate-radar-button"
                  onClick={handleGenerateRadar}
                  disabled={radarLoading}
                  variant="ghost"
                  size="sm"
                  className="text-zinc-500 hover:text-white text-xs"
                >
                  {radarLoading ? <><Loader2 className="animate-spin h-3 w-3 mr-1.5" />{t("radar.generating")}</> : t("radar.generate")}
                </Button>
              </div>

              {!radar ? (
                <p className="text-zinc-600 text-xs">{t("radar.empty")}</p>
              ) : (
                <div className="space-y-4">
                  {/* Health Score */}
                  {radar.pontuacao_saude && (
                    <div className="flex items-center justify-between bg-zinc-950/30 rounded-sm p-3">
                      <div>
                        <span className="text-white text-sm font-medium">{radar.pontuacao_saude.label}</span>
                        <p className="text-zinc-500 text-xs mt-0.5">{radar.pontuacao_saude.detalhe}</p>
                      </div>
                      <div className="text-2xl font-mono text-white font-bold">{radar.pontuacao_saude.score}</div>
                    </div>
                  )}

                  {/* Summary */}
                  {radar.resumo && (
                    <p className="text-zinc-300 text-xs leading-relaxed border-l-2 border-zinc-800 pl-3">{radar.resumo}</p>
                  )}

                  {/* Market Changes */}
                  {radar.mudancas_mercado && radar.mudancas_mercado.length > 0 && (
                    <div>
                      <span className="text-xs font-mono text-zinc-600 uppercase tracking-widest">{t("radar.changes")}</span>
                      <div className="space-y-2 mt-2">
                        {radar.mudancas_mercado.slice(0, 3).map((m, i) => (
                          <div key={i} className="flex items-start gap-2 text-xs">
                            <span className={`shrink-0 mt-0.5 ${m.impacto === "positivo" ? "text-emerald-400" : m.impacto === "negativo" ? "text-red-400" : "text-zinc-400"}`}>
                              {m.impacto === "positivo" ? "+" : m.impacto === "negativo" ? "-" : "~"}
                            </span>
                            <div>
                              <span className="text-zinc-300">{m.mudanca}</span>
                              <p className="text-zinc-600 mt-0.5">{m.recomendacao}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Recommendations */}
                  {radar.recomendacoes && radar.recomendacoes.length > 0 && (
                    <div>
                      <span className="text-xs font-mono text-zinc-600 uppercase tracking-widest">{t("radar.recommendations")}</span>
                      <div className="space-y-2 mt-2">
                        {radar.recomendacoes.slice(0, 3).map((r, i) => (
                          <div key={i} className="flex items-start gap-2 text-xs">
                            <Badge variant="outline" className={`shrink-0 text-xs ${priorityColor(r.prioridade)} border-current/30`}>
                              {r.prioridade}
                            </Badge>
                            <span className="text-zinc-300">{r.acao}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {radar.created_at && (
                    <div className="flex items-center gap-1 text-zinc-700 text-xs">
                      <Clock className="h-3 w-3" strokeWidth={1.5} />
                      {t("radar.last_update")}: {new Date(radar.created_at).toLocaleDateString("pt-BR")}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* History label */}
        {!loading && analyses.length > 0 && (
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-mono text-zinc-600 uppercase tracking-widest">{t("dash.history")}</span>
            <button data-testid="new-product-secondary" onClick={() => navigate("/analysis/new")} className="text-zinc-600 hover:text-white text-xs transition-colors">
              {t("dash.new_product")}
            </button>
          </div>
        )}

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-zinc-900/30 animate-pulse rounded-md" />
            ))}
          </div>
        ) : analyses.length === 0 ? (
          <div className="text-center py-20 animate-fade-in-up">
            <div className="w-16 h-16 rounded-full bg-zinc-900/50 border border-zinc-800 flex items-center justify-center mx-auto mb-6">
              <Crosshair className="h-6 w-6 text-zinc-600" strokeWidth={1.5} />
            </div>
            <p className="text-zinc-500 text-sm mb-2">{t("dash.empty_question")}</p>
            <p className="text-zinc-600 text-xs mb-6">{t("dash.empty_desc")}</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button data-testid="first-analysis-button" onClick={() => navigate("/analysis/new")} className="bg-white text-black hover:bg-zinc-200 shadow-[0_0_15px_rgba(255,255,255,0.1)] rounded-sm font-semibold">
                {t("dash.first_analysis")}
              </Button>
              <Button data-testid="competitor-analysis-empty" onClick={() => navigate("/competitor")} variant="outline" className="border-zinc-800 hover:border-zinc-600 text-zinc-300 hover:text-white rounded-sm">
                <Search className="h-4 w-4 mr-2" strokeWidth={1.5} />
                {t("panel.analyze_competitor")}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3 animate-fade-in-up">
            {analyses.map((a) => (
              <div
                key={a.id}
                data-testid={`analysis-item-${a.id}`}
                onClick={() => a.status === "completed" ? navigate(`/analysis/${a.id}`) : navigate(`/analysis/new?resume=${a.id}`)}
                className="w-full text-left bg-zinc-900/30 border border-zinc-800/50 rounded-md p-5 hover:border-zinc-700 transition-all duration-300 group cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-white font-medium text-sm truncate">{a.product?.nome}</h3>
                    <div className="flex items-center gap-3 mt-2">
                      <Badge variant="outline" className="text-zinc-500 border-zinc-800 text-xs font-mono">{a.product?.nicho}</Badge>
                      <span className="text-zinc-600 text-xs flex items-center gap-1">
                        <Clock className="h-3 w-3" strokeWidth={1.5} />
                        {new Date(a.created_at).toLocaleDateString("pt-BR")}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <Badge variant="outline" className={statusColors[a.status] || "text-zinc-400"}>
                      {statusLabels[a.status] || a.status}
                    </Badge>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button data-testid={`analysis-menu-${a.id}`} onClick={(e) => e.stopPropagation()} className="text-zinc-700 hover:text-white transition-colors p-1">
                          <MoreVertical className="h-4 w-4" strokeWidth={1.5} />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-800">
                        <DropdownMenuItem
                          onClick={(e) => { e.stopPropagation(); a.status === "completed" ? navigate(`/analysis/${a.id}`) : navigate(`/analysis/new?resume=${a.id}`); }}
                          className="text-zinc-300 focus:text-white focus:bg-zinc-800 cursor-pointer"
                        >
                          <ChevronRight className="h-4 w-4 mr-2" strokeWidth={1.5} />
                          {t("dash.open")}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-zinc-800" />
                        <DropdownMenuItem
                          data-testid={`delete-analysis-${a.id}`}
                          onClick={(e) => handleDelete(e, a.id)}
                          className="text-red-400 focus:text-red-300 focus:bg-zinc-800 cursor-pointer"
                        >
                          <Trash2 className="h-4 w-4 mr-2" strokeWidth={1.5} />
                          {t("dash.delete")}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <ChevronRight className="h-4 w-4 text-zinc-700 group-hover:text-white transition-colors" strokeWidth={1.5} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
