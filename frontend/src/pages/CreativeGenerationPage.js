import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useLanguage } from "@/context/LanguageContext";
import LanguageSelector from "@/components/LanguageSelector";
import api from "@/lib/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft,
  Loader2,
  Image as ImageIcon,
  Sparkles,
  Palette,
  FileText,
  ChevronRight,
  Download,
  RefreshCw,
} from "lucide-react";

const PROVIDERS = [
  { id: "nano_banana", label: "Nano Banana", desc: "Gemini", icon: Sparkles, color: "text-purple-400", borderColor: "border-purple-400/20 hover:border-purple-400/50" },
  { id: "gpt_image", label: "GPT Image", desc: "OpenAI", icon: ImageIcon, color: "text-emerald-400", borderColor: "border-emerald-400/20 hover:border-emerald-400/50" },
  { id: "claude_text", label: "Briefing Visual", desc: "Claude", icon: FileText, color: "text-blue-400", borderColor: "border-blue-400/20 hover:border-blue-400/50" },
];

export default function CreativeGenerationPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [customPrompt, setCustomPrompt] = useState("");
  const [result, setResult] = useState(null);
  const [creatives, setCreatives] = useState([]);
  const [pageLoading, setPageLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get(`/analyses/${id}`).then((res) => setAnalysis(res.data)),
      api.get(`/creatives/list/${id}`).then((res) => setCreatives(res.data)).catch(() => {}),
    ]).catch(() => {
      toast.error("Análise não encontrada");
      navigate("/");
    }).finally(() => setPageLoading(false));
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleGenerate = async () => {
    if (!selectedProvider) return;
    setLoading(true);
    setResult(null);

    try {
      const { data } = await api.post("/creatives/generate", {
        analysis_id: id,
        provider: selectedProvider,
        prompt: customPrompt || "",
      });
      setResult(data);
      setCreatives((prev) => [data, ...prev]);
      toast.success("Criativo gerado!");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Erro ao gerar criativo");
    } finally {
      setLoading(false);
    }
  };

  const API_URL = process.env.REACT_APP_BACKEND_URL;

  if (pageLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-white h-6 w-6" />
      </div>
    );
  }

  const product = analysis?.product;
  const briefing = result?.briefing;

  return (
    <div className="min-h-screen">
      <header className="border-b border-zinc-800/50 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <button data-testid="creative-back-button" onClick={() => navigate(`/analysis/${id}`)} className="flex items-center gap-2 text-zinc-500 hover:text-white transition-colors">
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
            <Palette className="h-4 w-4 text-zinc-500" strokeWidth={1.5} />
            <span className="text-xs font-mono uppercase tracking-widest text-zinc-500">Gerar Criativo</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-semibold text-white tracking-tight">
            {product?.nome}
          </h2>
          <p className="text-zinc-500 text-sm mt-1">
            Escolha um gerador e crie visuais para seu anúncio.
          </p>
        </div>

        {/* Provider Selection */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          {PROVIDERS.map((p) => (
            <button
              key={p.id}
              data-testid={`provider-${p.id}`}
              onClick={() => setSelectedProvider(p.id)}
              className={`text-left p-4 rounded-md border transition-all duration-200 ${
                selectedProvider === p.id
                  ? `bg-zinc-900/50 ${p.borderColor.split(" ")[0].replace("/20", "/50")}`
                  : `bg-zinc-900/20 ${p.borderColor}`
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <p.icon className={`h-4 w-4 ${p.color}`} strokeWidth={1.5} />
                <span className="text-white text-sm font-medium">{p.label}</span>
              </div>
              <span className="text-zinc-600 text-xs">{p.desc}</span>
            </button>
          ))}
        </div>

        {/* Custom Prompt */}
        <div className="mb-6">
          <Textarea
            data-testid="creative-prompt"
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            placeholder="Prompt personalizado (opcional) — ex: 'imagem minimalista com fundo escuro, produto centralizado'"
            className="bg-zinc-950/50 border-zinc-800 text-white placeholder:text-zinc-600 focus:border-white/50 focus:ring-0 rounded-sm min-h-[80px] resize-none"
          />
        </div>

        {/* Generate Button */}
        <Button
          data-testid="generate-creative-button"
          onClick={handleGenerate}
          disabled={loading || !selectedProvider}
          className="w-full bg-white text-black hover:bg-zinc-200 shadow-[0_0_15px_rgba(255,255,255,0.1)] transition-all duration-300 rounded-sm h-12 font-semibold mb-8"
        >
          {loading ? (
            <>
              <Loader2 className="animate-spin mr-2 h-4 w-4" />
              Gerando criativo...
            </>
          ) : (
            <>
              Gerar Criativo
              <ChevronRight className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>

        {/* Result */}
        {result && (
          <div className="space-y-6 animate-fade-in-up">
            {/* Image result */}
            {result.image_url && (
              <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-md overflow-hidden">
                <img
                  data-testid="generated-image"
                  src={`${API_URL}${result.image_url}`}
                  alt="Criativo gerado"
                  className="w-full"
                />
                <div className="p-4 flex items-center justify-between">
                  <div>
                    <Badge variant="outline" className="text-zinc-400 border-zinc-700 text-xs">
                      {PROVIDERS.find((p) => p.id === result.provider)?.label}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <a
                      href={`${API_URL}${result.image_url}`}
                      download
                      target="_blank"
                      rel="noopener noreferrer"
                      data-testid="download-creative"
                      className="text-zinc-500 hover:text-white transition-colors"
                    >
                      <Download className="h-4 w-4" strokeWidth={1.5} />
                    </a>
                    <button
                      data-testid="regenerate-creative"
                      onClick={handleGenerate}
                      disabled={loading}
                      className="text-zinc-500 hover:text-white transition-colors"
                    >
                      <RefreshCw className="h-4 w-4" strokeWidth={1.5} />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Claude text briefing */}
            {briefing && (
              <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-md p-6 space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="h-4 w-4 text-blue-400" strokeWidth={1.5} />
                  <span className="text-xs font-mono uppercase tracking-widest text-zinc-400">Briefing Visual</span>
                </div>

                {briefing.conceito_visual && (
                  <div className="space-y-1">
                    <span className="text-xs font-mono text-zinc-600 uppercase tracking-widest">Conceito Visual</span>
                    <p className="text-zinc-300 text-sm leading-relaxed">{briefing.conceito_visual}</p>
                  </div>
                )}

                {briefing.composicao && (
                  <div className="space-y-1">
                    <span className="text-xs font-mono text-zinc-600 uppercase tracking-widest">Composição</span>
                    <p className="text-zinc-300 text-sm leading-relaxed">{briefing.composicao}</p>
                  </div>
                )}

                {briefing.paleta_cores && (
                  <div className="space-y-1">
                    <span className="text-xs font-mono text-zinc-600 uppercase tracking-widest">Paleta de Cores</span>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {briefing.paleta_cores.map((c, i) => (
                        <Badge key={i} variant="outline" className="text-zinc-300 border-zinc-700 text-xs">{c}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {briefing.elementos_visuais && (
                  <div className="space-y-1">
                    <span className="text-xs font-mono text-zinc-600 uppercase tracking-widest">Elementos Visuais</span>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {briefing.elementos_visuais.map((e, i) => (
                        <Badge key={i} variant="outline" className="text-zinc-400 border-zinc-800 text-xs">{e}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {briefing.headline_visual && (
                    <div className="space-y-1">
                      <span className="text-xs font-mono text-zinc-600 uppercase tracking-widest">Headline</span>
                      <p className="text-white text-sm font-medium">{briefing.headline_visual}</p>
                    </div>
                  )}
                  {briefing.cta_visual && (
                    <div className="space-y-1">
                      <span className="text-xs font-mono text-zinc-600 uppercase tracking-widest">CTA</span>
                      <p className="text-white text-sm font-medium">{briefing.cta_visual}</p>
                    </div>
                  )}
                </div>

                {briefing.variacao_feed && (
                  <div className="space-y-1">
                    <span className="text-xs font-mono text-zinc-600 uppercase tracking-widest">Variação Feed</span>
                    <p className="text-zinc-400 text-xs">{briefing.variacao_feed}</p>
                  </div>
                )}
                {briefing.variacao_stories && (
                  <div className="space-y-1">
                    <span className="text-xs font-mono text-zinc-600 uppercase tracking-widest">Variação Stories</span>
                    <p className="text-zinc-400 text-xs">{briefing.variacao_stories}</p>
                  </div>
                )}
              </div>
            )}

            <Separator className="bg-zinc-800/30" />

            <div className="grid grid-cols-2 gap-3">
              <Button
                data-testid="back-to-analysis"
                onClick={() => navigate(`/analysis/${id}`)}
                variant="outline"
                className="border-zinc-800 hover:border-zinc-600 text-zinc-300 hover:text-white rounded-sm h-11"
              >
                Ver análise
              </Button>
              <Button
                data-testid="compare-market-from-creative"
                onClick={() => navigate(`/analysis/${id}/market`)}
                variant="outline"
                className="border-zinc-800 hover:border-zinc-600 text-zinc-300 hover:text-white rounded-sm h-11"
              >
                {t("panel.compare_market")}
              </Button>
            </div>
          </div>
        )}

        {/* Past creatives */}
        {!result && creatives.length > 0 && (
          <div className="space-y-4">
            <span className="text-xs font-mono text-zinc-600 uppercase tracking-widest block">Criativos anteriores</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {creatives.map((c, i) => (
                <div key={i} className="bg-zinc-900/20 border border-zinc-800/30 rounded-md overflow-hidden">
                  {c.image_url && (
                    <img src={`${API_URL}${c.image_url}`} alt="Criativo" className="w-full h-40 object-cover" />
                  )}
                  {c.briefing && (
                    <div className="p-3">
                      <p className="text-zinc-300 text-xs line-clamp-2">{c.briefing.conceito_visual}</p>
                    </div>
                  )}
                  <div className="px-3 pb-3 pt-1">
                    <Badge variant="outline" className="text-zinc-500 border-zinc-800 text-xs">
                      {PROVIDERS.find((p) => p.id === c.provider)?.label || c.provider}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
