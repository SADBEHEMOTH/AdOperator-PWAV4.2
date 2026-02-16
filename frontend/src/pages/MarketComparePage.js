import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useLanguage } from "@/context/LanguageContext";
import LanguageSelector from "@/components/LanguageSelector";
import api from "@/lib/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Loader2,
  BarChart3,
  TrendingUp,
  Shield,
  Target,
  Zap,
  AlertTriangle,
  ChevronRight,
  Clock,
  Eye,
} from "lucide-react";

const HOOK_LABELS = {
  pergunta: "Pergunta",
  historia: "História",
  lista: "Lista",
  prova_social: "Prova Social",
  mecanismo: "Mecanismo",
  choque: "Choque",
};

export default function MarketComparePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("");
  const [result, setResult] = useState(null);
  const [pageLoading, setPageLoading] = useState(true);

  useEffect(() => {
    api.get(`/analyses/${id}`)
      .then((res) => {
        setAnalysis(res.data);
        if (res.data.market_comparison) {
          setResult(res.data.market_comparison);
        }
      })
      .catch(() => {
        toast.error("Análise não encontrada");
        navigate("/");
      })
      .finally(() => setPageLoading(false));
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const stages = [
    "Escaneando mercado do nicho...",
    "Coletando padrões de anúncios...",
    "Classificando tipos de hook...",
    "Analisando persistência de anúncios...",
    "Comparando com sua estratégia...",
    "Identificando vantagem competitiva...",
  ];

  const handleCompare = async () => {
    setLoading(true);
    let idx = 0;
    setLoadingMsg(stages[0]);
    const interval = setInterval(() => {
      idx = (idx + 1) % stages.length;
      setLoadingMsg(stages[idx]);
    }, 3000);

    try {
      const { data } = await api.post(`/analyses/${id}/market-compare`);
      setResult(data);
      toast.success("Comparação concluída!");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Erro ao comparar com mercado");
    } finally {
      clearInterval(interval);
      setLoading(false);
      setLoadingMsg("");
    }
  };

  const riskColor = (level) => {
    if (!level) return "text-zinc-400";
    const l = level.toLowerCase();
    if (l.includes("alto")) return "text-red-400";
    if (l.includes("medio") || l.includes("médio")) return "text-amber-400";
    return "text-emerald-400";
  };

  if (pageLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-white h-6 w-6" />
      </div>
    );
  }

  const product = analysis?.product;
  const comp = result?.comparativo_usuario;
  const hooks = result?.hooks_por_tipo;

  return (
    <div className="min-h-screen">
      <header className="border-b border-zinc-800/50 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <button
            data-testid="market-back-button"
            onClick={() => navigate("/")}
            className="flex items-center gap-2 text-zinc-500 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
            <span className="text-sm">Voltar</span>
          </button>
          <span className="text-sm font-semibold text-white">AdOperator</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12">
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 className="h-4 w-4 text-zinc-500" strokeWidth={1.5} />
            <span className="text-xs font-mono uppercase tracking-widest text-zinc-500">Comparar com Mercado</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-semibold text-white tracking-tight">
            {product?.nome}
          </h2>
          <p className="text-zinc-500 text-sm mt-1">
            Veja como o mercado vende no nicho <span className="text-zinc-300">{product?.nicho}</span> e onde você tem vantagem.
          </p>
        </div>

        {!result && (
          <div className="space-y-6 animate-fade-in-up">
            <div className="bg-zinc-900/20 border border-zinc-800/30 rounded-md p-6 text-center">
              <BarChart3 className="h-8 w-8 text-zinc-700 mx-auto mb-4" strokeWidth={1} />
              <p className="text-zinc-400 text-sm mb-1">
                O motor vai analisar como o mercado vende no nicho <span className="text-white">{product?.nicho}</span>
              </p>
              <p className="text-zinc-600 text-xs">
                Vai identificar padrões dominantes, anúncios persistentes e comparar com sua estratégia.
              </p>
            </div>

            <Button
              data-testid="run-market-compare"
              onClick={handleCompare}
              disabled={loading}
              className="w-full bg-white text-black hover:bg-zinc-200 shadow-[0_0_15px_rgba(255,255,255,0.1)] transition-all duration-300 rounded-sm h-12 font-semibold"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin mr-2 h-4 w-4" />
                  {loadingMsg}
                </>
              ) : (
                <>
                  Escanear mercado
                  <ChevronRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        )}

        {result && (
          <div className="space-y-6 animate-fade-in-up">
            {/* Hook Distribution */}
            {hooks && (
              <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-md p-6">
                <div className="flex items-center gap-2 mb-4">
                  <BarChart3 className="h-4 w-4 text-white" strokeWidth={1.5} />
                  <span className="text-xs font-mono uppercase tracking-widest text-zinc-400">Distribuição de Hooks no Mercado</span>
                </div>
                <div className="space-y-3">
                  {Object.entries(hooks).sort(([, a], [, b]) => b - a).map(([type, pct]) => (
                    <div key={type} className="flex items-center gap-3">
                      <span className="text-zinc-400 text-xs w-24 shrink-0">{HOOK_LABELS[type] || type}</span>
                      <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-white/60 to-white/30 rounded-full transition-all duration-700"
                          style={{ width: `${Math.min(pct, 100)}%` }}
                        />
                      </div>
                      <span className="text-white text-xs font-mono w-10 text-right">{pct}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Dominant Patterns */}
            {result.padroes_dominantes && (
              <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-md p-6">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="h-4 w-4 text-white" strokeWidth={1.5} />
                  <span className="text-xs font-mono uppercase tracking-widest text-zinc-400">Padrões Dominantes</span>
                </div>
                <div className="space-y-4">
                  {result.padroes_dominantes.map((p, i) => (
                    <div key={i} className="border-l-2 border-zinc-700 pl-4 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-white text-sm font-medium">{p.padrao}</span>
                        <Badge variant="outline" className="text-zinc-500 border-zinc-800 text-xs">{p.frequencia}</Badge>
                      </div>
                      <p className="text-zinc-400 text-xs">{p.descricao}</p>
                      {p.exemplo && (
                        <p className="text-zinc-500 text-xs italic">&ldquo;{p.exemplo}&rdquo;</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Persistent Ads */}
            {result.anuncios_persistentes && (
              <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-md p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Clock className="h-4 w-4 text-emerald-400" strokeWidth={1.5} />
                  <span className="text-xs font-mono uppercase tracking-widest text-zinc-400">Anúncios Persistentes</span>
                </div>
                <div className="space-y-3">
                  {result.anuncios_persistentes.map((a, i) => (
                    <div key={i} className="bg-zinc-950/30 rounded-sm p-4 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-white text-sm">{a.descricao}</span>
                        <Badge variant="outline" className="text-emerald-400 border-emerald-400/30 text-xs shrink-0 ml-2">
                          {a.duracao_estimada}
                        </Badge>
                      </div>
                      <p className="text-zinc-500 text-xs">{a.motivo_persistencia}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Market Ads */}
            {result.anuncios_mercado && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Eye className="h-4 w-4 text-zinc-500" strokeWidth={1.5} />
                  <span className="text-xs font-mono uppercase tracking-widest text-zinc-500">Exemplos do Mercado</span>
                </div>
                {result.anuncios_mercado.map((ad, i) => (
                  <div key={i} className="bg-zinc-900/20 border border-zinc-800/30 rounded-md p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-white text-sm font-medium">{ad.titulo}</span>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-zinc-400 border-zinc-700 text-xs">{HOOK_LABELS[ad.tipo_hook] || ad.tipo_hook}</Badge>
                        <Badge variant="outline" className={`${riskColor(ad.risco_bloqueio)} ${ad.risco_bloqueio?.toLowerCase().includes("alto") ? "border-red-400/30" : ad.risco_bloqueio?.toLowerCase().includes("medio") ? "border-amber-400/30" : "border-emerald-400/30"} text-xs`}>
                          Risco: {ad.risco_bloqueio}
                        </Badge>
                      </div>
                    </div>
                    <p className="text-zinc-300 text-xs leading-relaxed italic">&ldquo;{ad.texto_exemplo}&rdquo;</p>
                    <div className="grid grid-cols-3 gap-3 text-xs">
                      <div><span className="text-zinc-600 block">Promessa</span><span className="text-zinc-400">{ad.promessa}</span></div>
                      <div><span className="text-zinc-600 block">CTA</span><span className="text-zinc-400">{ad.cta}</span></div>
                      <div><span className="text-zinc-600 block">Psicologia</span><span className="text-zinc-400">{ad.psicologia}</span></div>
                    </div>
                    {ad.persistencia_estimada && (
                      <div className="flex items-center gap-1 text-xs text-zinc-600">
                        <Clock className="h-3 w-3" strokeWidth={1.5} />
                        Persistência: {ad.persistencia_estimada}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            <Separator className="bg-zinc-800/30" />

            {/* Comparative: User vs Market */}
            {comp && (
              <div className="space-y-4">
                <span className="text-xs font-mono uppercase tracking-widest text-zinc-500 block">Sua Estratégia vs Mercado</span>

                <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-md p-5 space-y-1">
                  <span className="text-xs font-mono text-zinc-600 uppercase tracking-widest">Como o mercado vende</span>
                  <p className="text-zinc-300 text-sm leading-relaxed">{comp.como_mercado_vende}</p>
                </div>

                <div className="bg-blue-400/5 border border-blue-400/15 rounded-md p-5 space-y-1">
                  <span className="text-xs font-mono text-blue-400 uppercase tracking-widest">Onde você difere</span>
                  <p className="text-zinc-300 text-sm leading-relaxed">{comp.onde_usuario_difere}</p>
                </div>

                <div className="bg-emerald-400/5 border border-emerald-400/15 rounded-md p-5 space-y-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Zap className="h-3.5 w-3.5 text-emerald-400" strokeWidth={1.5} />
                    <span className="text-xs font-mono text-emerald-400 uppercase tracking-widest">Sua Vantagem Competitiva</span>
                  </div>
                  <p className="text-zinc-300 text-sm leading-relaxed">{comp.vantagem_competitiva}</p>
                </div>

                <div className="bg-amber-400/5 border border-amber-400/15 rounded-md p-5 space-y-1">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-400" strokeWidth={1.5} />
                    <span className="text-xs font-mono text-amber-400 uppercase tracking-widest">Risco de parecer genérico</span>
                  </div>
                  <p className="text-zinc-300 text-sm leading-relaxed">{comp.risco_generico}</p>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-md p-5 space-y-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Target className="h-3.5 w-3.5 text-white" strokeWidth={1.5} />
                    <span className="text-xs font-mono text-white uppercase tracking-widest">Recomendação Prática</span>
                  </div>
                  <p className="text-zinc-300 text-sm leading-relaxed">{comp.recomendacao_pratica}</p>
                </div>
              </div>
            )}

            <Separator className="bg-zinc-800/30" />

            {/* Action CTA */}
            <Button
              data-testid="generate-creative-from-advantage"
              onClick={() => navigate("/analysis/new")}
              className="w-full bg-white text-black hover:bg-zinc-200 shadow-[0_0_20px_rgba(255,255,255,0.12)] transition-all duration-300 rounded-sm h-14 font-bold text-sm tracking-wide"
            >
              GERAR CRIATIVO BASEADO NA VANTAGEM
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>

            <Button
              data-testid="rerun-market-compare"
              onClick={handleCompare}
              disabled={loading}
              variant="outline"
              className="w-full border-zinc-800 hover:border-zinc-600 text-zinc-300 hover:text-white transition-all duration-300 rounded-sm h-11"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin mr-2 h-4 w-4" />
                  {loadingMsg}
                </>
              ) : (
                "Escanear novamente"
              )}
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
