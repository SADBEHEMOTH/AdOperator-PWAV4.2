import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/context/LanguageContext";
import LanguageSelector from "@/components/LanguageSelector";
import api from "@/lib/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Loader2,
  Search,
  Globe,
  Target,
  Shield,
  Zap,
  Eye,
  AlertTriangle,
  ChevronRight,
  Clock,
  ExternalLink,
} from "lucide-react";

export default function CompetitorAnalysisPage() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("");
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const navigate = useNavigate();
  const { t } = useLanguage();

  useEffect(() => {
    api.get("/competitor/analyses")
      .then((res) => setHistory(res.data))
      .catch(() => {});
  }, []);

  const stages = [
    "Acessando URL...",
    "Extraindo conteúdo da página...",
    "Classificando tipo de hook...",
    "Analisando risco de bloqueio...",
    "Identificando estratégia do concorrente...",
    "Gerando recomendações...",
  ];

  const handleAnalyze = async (e) => {
    e.preventDefault();
    if (!url.trim()) return;

    setLoading(true);
    setResult(null);
    let idx = 0;
    setLoadingMsg(stages[0]);
    const interval = setInterval(() => {
      idx = (idx + 1) % stages.length;
      setLoadingMsg(stages[idx]);
    }, 3000);

    try {
      const { data } = await api.post("/competitor/analyze", { url: url.trim() });
      setResult(data);
      setHistory((prev) => [{ id: data.id, url: url.trim(), result: data, created_at: new Date().toISOString() }, ...prev]);
      toast.success("Análise concluída!");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Erro ao analisar URL");
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

  const riskBg = (level) => {
    if (!level) return "border-zinc-800";
    const l = level.toLowerCase();
    if (l.includes("alto")) return "border-red-400/30";
    if (l.includes("medio") || l.includes("médio")) return "border-amber-400/30";
    return "border-emerald-400/30";
  };

  const handleCreateSuperior = () => {
    navigate("/analysis/new");
  };

  const a = result?.analise;
  const interp = result?.interpretacao;
  const dados = result?.dados_coletados;
  const scraping = result?.scraping_data;

  return (
    <div className="min-h-screen">
      <header className="border-b border-zinc-800/50 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <button
            data-testid="competitor-back-button"
            onClick={() => navigate("/")}
            className="flex items-center gap-2 text-zinc-500 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
            <span className="text-sm">{t("flow.back")}</span>
          </button>
          <div className="flex items-center gap-3">
            <LanguageSelector />
            <span className="text-sm font-semibold text-white">AdOperator</span>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12">
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-2">
            <Search className="h-4 w-4 text-zinc-500" strokeWidth={1.5} />
            <span className="text-xs font-mono uppercase tracking-widest text-zinc-500">{t("comp.title")}</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-semibold text-white tracking-tight">
            {t("comp.headline")}
          </h2>
          <p className="text-zinc-500 text-sm mt-1">
            {t("comp.desc")}
          </p>
        </div>

        <form onSubmit={handleAnalyze} className="space-y-4 mb-8">
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-600" strokeWidth={1.5} />
              <Input
                data-testid="competitor-url-input"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://exemplo.com/pagina-de-venda"
                className="bg-zinc-950/50 border-zinc-800 text-white placeholder:text-zinc-600 focus:border-white/50 focus:ring-0 rounded-sm h-12 pl-10"
                type="url"
                required
              />
            </div>
            <Button
              data-testid="competitor-analyze-button"
              type="submit"
              disabled={loading}
              className="bg-white text-black hover:bg-zinc-200 shadow-[0_0_15px_rgba(255,255,255,0.1)] rounded-sm h-12 px-6 font-semibold"
            >
              {loading ? (
                <Loader2 className="animate-spin h-4 w-4" />
              ) : (
                <>{t("comp.analyze")}</>
              )}
            </Button>
          </div>
          {loading && (
            <div className="flex items-center gap-3 text-zinc-500 text-xs animate-pulse">
              <Loader2 className="animate-spin h-3 w-3" />
              {loadingMsg}
            </div>
          )}
        </form>

        {/* Result */}
        {result && a && (
          <div className="space-y-6 animate-fade-in-up">
            {/* URL Info */}
            <div className="flex items-center gap-2 text-xs text-zinc-600">
              <Globe className="h-3 w-3" strokeWidth={1.5} />
              <span className="truncate">{scraping?.url || url}</span>
              {scraping?.hook_type_auto && (
                <Badge variant="outline" className="text-zinc-400 border-zinc-700 text-xs ml-auto shrink-0">
                  Hook: {scraping.hook_type_auto}
                </Badge>
              )}
            </div>

            {/* Extraction Grid */}
            <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-md p-6">
              <div className="flex items-center gap-2 mb-5">
                <Eye className="h-4 w-4 text-white" strokeWidth={1.5} />
                <span className="text-xs font-mono uppercase tracking-widest text-zinc-400">{t("comp.extraction")}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <ExtractBlock label={t("comp.opening_type")} value={a.tipo_abertura} />
                <ExtractBlock label={t("comp.promise")} value={a.promessa} />
                <ExtractBlock label={t("comp.mechanism")} value={a.mecanismo} />
                <ExtractBlock label={t("comp.proof")} value={a.prova} />
                <ExtractBlock label={t("comp.cta")} value={a.cta} />
                <ExtractBlock label={t("comp.psychology")} value={a.psicologia_utilizada} />
                <ExtractBlock label={t("comp.visual_format")} value={a.formato_visual} />
                <div className="space-y-1">
                  <span className="text-xs font-mono text-zinc-600 uppercase tracking-widest">{t("comp.block_risk")}</span>
                  <div className="flex items-center gap-2">
                    <Shield className={`h-3.5 w-3.5 ${riskColor(a.risco_bloqueio)}`} strokeWidth={1.5} />
                    <Badge variant="outline" className={`${riskColor(a.risco_bloqueio)} ${riskBg(a.risco_bloqueio)} text-xs`}>
                      {a.risco_bloqueio}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>

            {/* Interpretation */}
            {interp && (
              <div className="space-y-4">
                <InterpBlock icon={Target} label="O que o anúncio tenta fazer" value={interp.o_que_tenta_fazer} color="text-blue-400" bg="bg-blue-400/5 border-blue-400/15" />
                <InterpBlock icon={Zap} label="Por que pode funcionar" value={interp.por_que_pode_funcionar} color="text-emerald-400" bg="bg-emerald-400/5 border-emerald-400/15" />
                <InterpBlock icon={AlertTriangle} label="Onde perde força" value={interp.onde_perde_forca} color="text-amber-400" bg="bg-amber-400/5 border-amber-400/15" />
                <InterpBlock icon={Target} label="Como superar" value={interp.como_superar} color="text-white" bg="bg-white/5 border-white/10" />
              </div>
            )}

            {/* Keywords */}
            {dados?.palavras_chave && dados.palavras_chave.length > 0 && (
              <div className="bg-zinc-900/20 border border-zinc-800/30 rounded-md p-4">
                <span className="text-xs font-mono text-zinc-600 uppercase tracking-widest block mb-2">Palavras-chave</span>
                <div className="flex flex-wrap gap-2">
                  {dados.palavras_chave.map((kw, i) => (
                    <Badge key={i} variant="outline" className="text-zinc-400 border-zinc-800 text-xs">{kw}</Badge>
                  ))}
                </div>
              </div>
            )}

            {/* CTAs Found */}
            {dados?.ctas_encontrados && dados.ctas_encontrados.length > 0 && (
              <div className="bg-zinc-900/20 border border-zinc-800/30 rounded-md p-4">
                <span className="text-xs font-mono text-zinc-600 uppercase tracking-widest block mb-2">CTAs encontrados</span>
                <div className="flex flex-wrap gap-2">
                  {dados.ctas_encontrados.map((cta, i) => (
                    <Badge key={i} variant="outline" className="text-zinc-300 border-zinc-700 text-xs">{cta}</Badge>
                  ))}
                </div>
              </div>
            )}

            <Separator className="bg-zinc-800/30" />

            {/* Action CTA */}
            <Button
              data-testid="create-superior-version"
              onClick={handleCreateSuperior}
              className="w-full bg-white text-black hover:bg-zinc-200 shadow-[0_0_20px_rgba(255,255,255,0.12)] transition-all duration-300 rounded-sm h-14 font-bold text-sm tracking-wide"
            >
              CRIAR VERSÃO SUPERIOR
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        )}

        {/* History */}
        {!result && history.length > 0 && (
          <div className="space-y-4 animate-fade-in-up">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-zinc-600 uppercase tracking-widest">Análises anteriores</span>
              <button
                data-testid="toggle-competitor-history"
                onClick={() => setShowHistory(!showHistory)}
                className="text-zinc-600 hover:text-white text-xs transition-colors"
              >
                {showHistory ? "Ocultar" : "Mostrar"}
              </button>
            </div>
            {showHistory && history.map((item) => (
              <button
                key={item.id}
                data-testid={`competitor-history-${item.id}`}
                onClick={() => setResult(item.result)}
                className="w-full text-left bg-zinc-900/30 border border-zinc-800/50 rounded-md p-4 hover:border-zinc-700 transition-all duration-300 group"
              >
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-white text-sm truncate">{item.url}</p>
                    <span className="text-zinc-600 text-xs flex items-center gap-1 mt-1">
                      <Clock className="h-3 w-3" strokeWidth={1.5} />
                      {new Date(item.created_at).toLocaleDateString("pt-BR")}
                    </span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-zinc-700 group-hover:text-white transition-colors shrink-0 ml-3" strokeWidth={1.5} />
                </div>
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function ExtractBlock({ label, value }) {
  return (
    <div className="space-y-1">
      <span className="text-xs font-mono text-zinc-600 uppercase tracking-widest">{label}</span>
      <p className="text-zinc-300 text-sm leading-relaxed">{value || "—"}</p>
    </div>
  );
}

function InterpBlock({ icon: Icon, label, value, color, bg }) {
  return (
    <div className={`border rounded-md p-5 ${bg}`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`h-4 w-4 ${color}`} strokeWidth={1.5} />
        <span className={`text-xs font-mono uppercase tracking-widest ${color}`}>{label}</span>
      </div>
      <p className="text-zinc-300 text-sm leading-relaxed">{value || "—"}</p>
    </div>
  );
}
