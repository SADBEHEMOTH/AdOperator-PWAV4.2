import { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import api from "@/lib/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { exportToPdf } from "@/lib/pdfExport";
import {
  ArrowLeft,
  Trophy,
  Loader2,
  Copy,
  Check,
  Share2,
  Download,
  Brain,
  Zap,
  Users,
  Target,
  Eye,
  ChevronDown,
  ChevronUp,
  Palette,
  BarChart3,
} from "lucide-react";

const STEP_LABELS = ["Estratégia", "Anúncios", "Simulação", "Decisão"];

export default function ResultPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(null);
  const [sharing, setSharing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [expandedStep, setExpandedStep] = useState(null);

  const copyText = (text, label) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    toast.success("Copiado!");
    setTimeout(() => setCopied(null), 2000);
  };

  const handleShare = async () => {
    setSharing(true);
    try {
      const { data: shareData } = await api.post(`/analyses/${id}/share`);
      const url = `${window.location.origin}/public/${shareData.public_token}`;
      await navigator.clipboard.writeText(url);
      toast.success("Link público copiado!");
    } catch {
      toast.error("Erro ao gerar link");
    } finally {
      setSharing(false);
    }
  };

  const handleExportPdf = async () => {
    setExporting(true);
    try {
      await exportToPdf("result-content", `adoperator-${data?.product?.nome || "resultado"}`);
      toast.success("PDF exportado!");
    } catch {
      toast.error("Erro ao exportar PDF");
    } finally {
      setExporting(false);
    }
  };

  useEffect(() => {
    api.get(`/analyses/${id}`)
      .then((res) => {
        setData(res.data);
        setLoading(false);
      })
      .catch(() => {
        toast.error("Análise não encontrada");
        navigate("/");
      });
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-white h-6 w-6" />
      </div>
    );
  }

  if (!data) return null;

  if (data.status !== "completed") {
    navigate(`/analysis/new?resume=${id}`);
    return null;
  }

  const d = data.decision;
  const v = d?.veredito || d?.vencedor || {};
  const product = data.product;
  const strategy = data.strategic_analysis;
  const ads = data.ad_variations;
  const simulation = data.audience_simulation;

  const toggleStep = (step) => {
    setExpandedStep(expandedStep === step ? null : step);
  };

  return (
    <div className="min-h-screen">
      <header className="border-b border-zinc-800/50 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <button
            data-testid="result-back-button"
            onClick={() => navigate("/")}
            className="flex items-center gap-2 text-zinc-500 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
            <span className="text-sm">Voltar</span>
          </button>
          <span className="text-sm font-semibold text-white">AdOperator</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12" id="result-content">
        <div className="text-center mb-10 animate-fade-in-up">
          <p className="text-xs font-mono uppercase tracking-widest text-zinc-500 mb-2">
            {product?.nome}
          </p>
          <h1 className="text-2xl md:text-3xl font-semibold text-white tracking-tight mb-4">
            Resultado da Análise
          </h1>
          <p className="text-zinc-500 text-sm">
            Este é o anúncio com maior probabilidade de funcionar antes do tráfego.
          </p>
        </div>

        {/* Step Navigation */}
        <div className="mb-8 animate-fade-in-up">
          <div className="grid grid-cols-4 gap-2">
            {STEP_LABELS.map((label, i) => {
              const icons = [Brain, Zap, Users, Target];
              const Icon = icons[i];
              const isExpanded = expandedStep === i;
              return (
                <button
                  key={i}
                  data-testid={`step-nav-${i}`}
                  onClick={() => toggleStep(i)}
                  className={`text-center py-2 px-1 rounded-sm border transition-all duration-200 ${
                    isExpanded
                      ? "bg-zinc-900/50 border-white/20 text-white"
                      : "bg-zinc-900/20 border-zinc-800/50 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5 mx-auto mb-1" strokeWidth={1.5} />
                  <span className="text-xs font-mono block">{label}</span>
                </button>
              );
            })}
          </div>

          {/* Expanded Step Content */}
          {expandedStep === 0 && strategy && (
            <div className="mt-4 bg-zinc-900/30 border border-zinc-800/50 rounded-md p-5 space-y-3 animate-fade-in-up">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-zinc-400 uppercase tracking-widest">Interpretação Estratégica</span>
                <button onClick={() => setExpandedStep(null)} className="text-zinc-600 hover:text-white"><ChevronUp className="h-4 w-4" /></button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div><span className="text-zinc-600 block">Nível de consciência</span><span className="text-zinc-300">{strategy.nivel_consciencia}</span></div>
                <div><span className="text-zinc-600 block">Ângulo de venda</span><span className="text-zinc-300">{strategy.angulo_venda}</span></div>
                <div><span className="text-zinc-600 block">Dor central</span><span className="text-zinc-300">{strategy.dor_central}</span></div>
                <div><span className="text-zinc-600 block">Big Idea</span><span className="text-zinc-300">{strategy.big_idea}</span></div>
              </div>
              {strategy.objecoes && (
                <div className="flex flex-wrap gap-1.5">
                  {strategy.objecoes.map((o, j) => (
                    <Badge key={j} variant="outline" className="text-zinc-400 border-zinc-800 text-xs">{o}</Badge>
                  ))}
                </div>
              )}
            </div>
          )}

          {expandedStep === 1 && ads?.anuncios && (
            <div className="mt-4 space-y-3 animate-fade-in-up">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-zinc-400 uppercase tracking-widest">Variações de Anúncio</span>
                <button onClick={() => setExpandedStep(null)} className="text-zinc-600 hover:text-white"><ChevronUp className="h-4 w-4" /></button>
              </div>
              {ads.anuncios.map((ad, i) => (
                <div key={i} className="bg-zinc-900/30 border border-zinc-800/50 rounded-md p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-white border-zinc-600 text-xs font-mono">
                      Hipótese {ad.numero || i + 1}
                    </Badge>
                    <span className="text-zinc-500 text-xs">{ad.abordagem_estrutural}</span>
                  </div>
                  <p className="text-white text-sm font-medium">{ad.hook}</p>
                  <p className="text-zinc-400 text-xs">{ad.copy}</p>
                </div>
              ))}
            </div>
          )}

          {expandedStep === 2 && simulation?.simulacao && (
            <div className="mt-4 space-y-3 animate-fade-in-up">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-zinc-400 uppercase tracking-widest">Simulação de Público</span>
                <button onClick={() => setExpandedStep(null)} className="text-zinc-600 hover:text-white"><ChevronUp className="h-4 w-4" /></button>
              </div>
              {simulation.simulacao.map((adSim, i) => (
                <div key={i} className="space-y-2">
                  <span className="text-zinc-600 text-xs font-mono">Anúncio #{adSim.anuncio_numero}</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {(adSim.reacoes || []).map((r, j) => (
                      <div key={j} className="bg-zinc-900/30 border border-zinc-800/50 rounded-sm p-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-white text-xs font-medium">{r.perfil}</span>
                          <span className="text-zinc-500 text-xs">{r.decisao_provavel}</span>
                        </div>
                        <p className="text-zinc-400 text-xs italic">{r.reacao_emocional}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {expandedStep === 3 && d && (
            <div className="mt-4 bg-zinc-900/30 border border-zinc-800/50 rounded-md p-5 space-y-3 animate-fade-in-up">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-zinc-400 uppercase tracking-widest">Motor de Decisão</span>
                <button onClick={() => setExpandedStep(null)} className="text-zinc-600 hover:text-white"><ChevronUp className="h-4 w-4" /></button>
              </div>
              <p className="text-white text-sm font-medium">{v.frase_principal || d.motivo}</p>
              <p className="text-zinc-400 text-xs">{v.explicacao_causal || d.motivo}</p>
              {d.investimento_recomendacao && <p className="text-emerald-400/80 text-xs">{d.investimento_recomendacao}</p>}
            </div>
          )}
        </div>

        {d && (
          <div className="space-y-8 animate-fade-in-up">
            <div className="text-center">
              <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-sm px-4 py-2">
                <Trophy className="h-4 w-4 text-amber-400" strokeWidth={1.5} />
                <span className="text-white font-mono text-sm">
                  Anúncio #{v.anuncio_numero} — Pontuação: {v.pontuacao_final || d.vencedor?.pontuacao_final}
                </span>
              </div>
              <div className="flex items-center justify-center gap-3 mt-4">
                <Button
                  data-testid="share-result-button"
                  variant="ghost"
                  size="sm"
                  onClick={handleShare}
                  disabled={sharing}
                  className="text-zinc-500 hover:text-white text-xs"
                >
                  <Share2 className="h-3.5 w-3.5 mr-1.5" strokeWidth={1.5} />
                  {sharing ? "Gerando..." : "Compartilhar"}
                </Button>
                <Button
                  data-testid="export-pdf-button"
                  variant="ghost"
                  size="sm"
                  onClick={handleExportPdf}
                  disabled={exporting}
                  className="text-zinc-500 hover:text-white text-xs"
                >
                  <Download className="h-3.5 w-3.5 mr-1.5" strokeWidth={1.5} />
                  {exporting ? "Exportando..." : "Salvar em PDF"}
                </Button>
              </div>
            </div>

            <div className="bg-black/40 backdrop-blur-xl border border-white/10 shadow-[0_0_30px_rgba(255,255,255,0.05)] rounded-md p-8 space-y-6">
              <div className="flex items-start justify-between">
                <div className="space-y-1 flex-1">
                  <span className="text-xs font-mono text-zinc-500 uppercase tracking-widest">Hook</span>
                  <p className="text-white text-lg font-medium">{v.hook || d.vencedor?.hook}</p>
                </div>
                <Button variant="ghost" size="icon" data-testid="copy-hook" onClick={() => copyText(v.hook || d.vencedor?.hook || "", "hook")} className="text-zinc-500 hover:text-white ml-2 shrink-0">
                  {copied === "hook" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <Separator className="bg-zinc-800/50" />
              <div className="flex items-start justify-between">
                <div className="space-y-1 flex-1">
                  <span className="text-xs font-mono text-zinc-500 uppercase tracking-widest">Copy Final</span>
                  <p className="text-zinc-300 text-sm leading-relaxed">{v.copy || d.vencedor?.copy}</p>
                </div>
                <Button variant="ghost" size="icon" data-testid="copy-text" onClick={() => copyText(v.copy || d.vencedor?.copy || "", "copy")} className="text-zinc-500 hover:text-white ml-2 shrink-0">
                  {copied === "copy" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <Separator className="bg-zinc-800/50" />
              <div className="space-y-1">
                <span className="text-xs font-mono text-zinc-500 uppercase tracking-widest">Roteiro UGC</span>
                <p className="text-zinc-400 text-xs leading-relaxed whitespace-pre-line">{v.roteiro_ugc || d.vencedor?.roteiro_ugc}</p>
              </div>
            </div>

            <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-md p-6 space-y-4">
              <div className="space-y-1">
                <span className="text-xs font-mono text-zinc-500 uppercase tracking-widest">Motivo da Escolha</span>
                <p className="text-zinc-300 text-sm leading-relaxed">{v.explicacao_causal || d.motivo}</p>
              </div>
              <div className="space-y-2">
                <span className="text-xs font-mono text-zinc-500 uppercase tracking-widest">Fraquezas Detectadas</span>
                <div className="flex flex-wrap gap-2">
                  {(d.fraquezas || []).map((f, i) => (
                    <Badge key={i} variant="outline" className="text-amber-400 border-amber-400/30 text-xs">{f}</Badge>
                  ))}
                </div>
              </div>
              <div className="space-y-1">
                <span className="text-xs font-mono text-zinc-500 uppercase tracking-widest">Sugestão de Melhoria</span>
                <p className="text-zinc-300 text-sm leading-relaxed">{d.sugestao_melhoria}</p>
              </div>
            </div>

            {d.estrutura_lp && (
              <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-md p-6 space-y-4">
                <span className="text-xs font-mono text-zinc-500 uppercase tracking-widest">Estrutura de LP Sugerida</span>
                <p className="text-white font-medium text-sm">{d.estrutura_lp.headline}</p>
                <p className="text-zinc-400 text-sm">{d.estrutura_lp.subheadline}</p>
                <div className="flex flex-wrap gap-2">
                  {(d.estrutura_lp.secoes || []).map((s, i) => (
                    <Badge key={i} variant="outline" className="text-zinc-400 border-zinc-800 text-xs">{s}</Badge>
                  ))}
                </div>
              </div>
            )}

            {d.publico_compativel && (
              <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-md p-6 space-y-2">
                <span className="text-xs font-mono text-zinc-500 uppercase tracking-widest">Público Mais Compatível</span>
                <p className="text-zinc-300 text-sm leading-relaxed">{d.publico_compativel}</p>
              </div>
            )}

            {d.ranking && (
              <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-md p-6 space-y-3">
                <span className="text-xs font-mono text-zinc-500 uppercase tracking-widest">Ranking</span>
                {d.ranking.map((r, i) => (
                  <div key={i} className="flex items-center justify-between py-2">
                    <span className="text-zinc-400 text-sm">Anúncio #{r.anuncio_numero}</span>
                    <div className="flex items-center gap-3">
                      <div className="w-32 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                        <div className="h-full bg-white/80 rounded-full" style={{ width: `${r.pontuacao}%` }} />
                      </div>
                      <span className="text-white text-sm font-mono w-12 text-right">{r.pontuacao}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Button
                  data-testid="generate-creative-from-result"
                  onClick={() => navigate(`/analysis/${id}/creative`)}
                  variant="outline"
                  className="border-zinc-800 hover:border-zinc-600 text-zinc-300 hover:text-white rounded-sm h-11"
                >
                  <Palette className="mr-1.5 h-3.5 w-3.5" strokeWidth={1.5} />
                  Gerar Criativo
                </Button>
                <Button
                  data-testid="compare-market-from-result"
                  onClick={() => navigate(`/analysis/${id}/market`)}
                  variant="outline"
                  className="border-zinc-800 hover:border-zinc-600 text-zinc-300 hover:text-white rounded-sm h-11"
                >
                  <BarChart3 className="mr-1.5 h-3.5 w-3.5" strokeWidth={1.5} />
                  Comparar Mercado
                </Button>
              </div>

              <Button
                data-testid="back-to-dashboard-result"
                onClick={() => navigate("/")}
                className="w-full bg-transparent border border-zinc-800 hover:border-zinc-600 text-zinc-300 hover:text-white transition-all duration-300 rounded-sm h-12"
              >
                <ArrowLeft className="mr-2 h-4 w-4" /> Voltar ao Painel
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
