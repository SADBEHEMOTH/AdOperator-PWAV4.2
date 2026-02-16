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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
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
  Video,
  Info,
  Clock,
} from "lucide-react";

const IMAGE_PROVIDERS = [
  { id: "nano_banana", label: "Nano Banana", desc: "Gemini", icon: Sparkles, color: "text-purple-400", borderColor: "border-purple-400/20 hover:border-purple-400/50" },
  { id: "gpt_image", label: "GPT Image", desc: "OpenAI", icon: ImageIcon, color: "text-emerald-400", borderColor: "border-emerald-400/20 hover:border-emerald-400/50" },
  { id: "claude_text", label: "Briefing Visual", desc: "Claude", icon: FileText, color: "text-blue-400", borderColor: "border-blue-400/20 hover:border-blue-400/50" },
];

const VIDEO_PROVIDERS = [
  { id: "sora_video", label: "Sora 2", desc: "OpenAI", icon: Video, color: "text-amber-400", borderColor: "border-amber-400/20 hover:border-amber-400/50" },
];

const VIDEO_SIZES = [
  { value: "1280x720", label: "Paisagem (1280x720)" },
  { value: "1024x1024", label: "Quadrado (1024x1024)" },
  { value: "1024x1792", label: "Retrato/Stories (1024x1792)" },
  { value: "1792x1024", label: "Widescreen (1792x1024)" },
];

const VIDEO_DURATIONS = [
  { value: "4", label: "4 segundos" },
  { value: "8", label: "8 segundos" },
  { value: "12", label: "12 segundos" },
];

const CREATIVE_TIPS = [
  { title: "VSL (Video Sales Letter)", tip: "Comece com um gancho forte nos primeiros 3s. Use texto sobreposto e urgência visual." },
  { title: "UGC (User Generated)", tip: "Simule depoimento real. Câmera frontal, iluminação natural, tom conversacional." },
  { title: "Produto em Ação", tip: "Mostre o produto sendo usado. Before/After funciona bem para conversão." },
  { title: "Anúncio Estático", tip: "Imagem clean com headline forte, cor contrastante no CTA, pouco texto." },
];

export default function CreativeGenerationPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [mediaType, setMediaType] = useState("image");
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [customPrompt, setCustomPrompt] = useState("");
  const [videoSize, setVideoSize] = useState("1280x720");
  const [videoDuration, setVideoDuration] = useState("4");
  const [result, setResult] = useState(null);
  const [creatives, setCreatives] = useState([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [showTips, setShowTips] = useState(false);

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
      const payload = {
        analysis_id: id,
        provider: selectedProvider,
        prompt: customPrompt || "",
      };
      if (selectedProvider === "sora_video") {
        payload.video_size = videoSize;
        payload.video_duration = parseInt(videoDuration);
      }

      const { data } = await api.post("/creatives/generate", payload, {
        timeout: selectedProvider === "sora_video" ? 660000 : 120000,
      });
      setResult(data);
      setCreatives((prev) => [data, ...prev]);
      toast.success(selectedProvider === "sora_video" ? "Vídeo gerado!" : "Criativo gerado!");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Erro ao gerar criativo");
    } finally {
      setLoading(false);
    }
  };

  const API_URL = process.env.REACT_APP_BACKEND_URL;

  const activeProviders = mediaType === "image" ? IMAGE_PROVIDERS : VIDEO_PROVIDERS;

  const handleMediaTypeChange = (type) => {
    setMediaType(type);
    setSelectedProvider(null);
    setResult(null);
  };

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
            Escolha o tipo de mídia e crie visuais para seu anúncio.
          </p>
        </div>

        {/* Media Type Toggle */}
        <div className="mb-6">
          <Tabs value={mediaType} onValueChange={handleMediaTypeChange} className="w-auto">
            <TabsList className="bg-zinc-900/50 border border-zinc-800/50">
              <TabsTrigger
                value="image"
                data-testid="media-type-image"
                className="text-xs font-mono data-[state=active]:bg-zinc-800 data-[state=active]:text-white flex items-center gap-1.5"
              >
                <ImageIcon className="h-3.5 w-3.5" strokeWidth={1.5} />
                Imagem
              </TabsTrigger>
              <TabsTrigger
                value="video"
                data-testid="media-type-video"
                className="text-xs font-mono data-[state=active]:bg-zinc-800 data-[state=active]:text-white flex items-center gap-1.5"
              >
                <Video className="h-3.5 w-3.5" strokeWidth={1.5} />
                Vídeo
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Provider Selection */}
        <div className={`grid grid-cols-1 ${mediaType === "image" ? "sm:grid-cols-3" : "sm:grid-cols-1"} gap-3 mb-6`}>
          {activeProviders.map((p) => (
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
              {p.id === "sora_video" && (
                <span className="text-zinc-700 text-xs block mt-0.5">Gere vídeos curtos com IA (até 12s)</span>
              )}
            </button>
          ))}
        </div>

        {/* Video Options */}
        {mediaType === "video" && selectedProvider === "sora_video" && (
          <div className="grid grid-cols-2 gap-3 mb-6 animate-fade-in-up" data-testid="video-options">
            <div className="space-y-2">
              <span className="text-xs font-mono text-zinc-500 uppercase tracking-widest">Formato</span>
              <Select value={videoSize} onValueChange={setVideoSize}>
                <SelectTrigger data-testid="video-size-select" className="bg-zinc-950/50 border-zinc-800 text-white rounded-sm h-10 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800">
                  {VIDEO_SIZES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <span className="text-xs font-mono text-zinc-500 uppercase tracking-widest">Duração</span>
              <Select value={videoDuration} onValueChange={setVideoDuration}>
                <SelectTrigger data-testid="video-duration-select" className="bg-zinc-950/50 border-zinc-800 text-white rounded-sm h-10 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800">
                  {VIDEO_DURATIONS.map((d) => (
                    <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* Custom Prompt */}
        <div className="mb-4">
          <Textarea
            data-testid="creative-prompt"
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            placeholder={mediaType === "video"
              ? "Descreva a cena do vídeo — ex: 'pessoa usando o produto em casa, câmera frontal, iluminação natural'"
              : "Prompt personalizado (opcional) — ex: 'imagem minimalista com fundo escuro, produto centralizado'"
            }
            className="bg-zinc-950/50 border-zinc-800 text-white placeholder:text-zinc-600 focus:border-white/50 focus:ring-0 rounded-sm min-h-[80px] resize-none"
          />
        </div>

        {/* Creative Tips Toggle */}
        <button
          data-testid="toggle-creative-tips"
          onClick={() => setShowTips(!showTips)}
          className="flex items-center gap-1.5 text-zinc-600 hover:text-zinc-400 text-xs mb-6 transition-colors"
        >
          <Info className="h-3.5 w-3.5" strokeWidth={1.5} />
          {showTips ? "Ocultar dicas" : "Dicas para bons criativos"}
        </button>

        {showTips && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6 animate-fade-in-up">
            {CREATIVE_TIPS.map((tip, i) => (
              <div key={i} className="bg-zinc-900/20 border border-zinc-800/30 rounded-sm p-3">
                <span className="text-white text-xs font-medium block mb-1">{tip.title}</span>
                <span className="text-zinc-500 text-xs">{tip.tip}</span>
              </div>
            ))}
          </div>
        )}

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
              {mediaType === "video" ? "Gerando vídeo (pode levar alguns minutos)..." : "Gerando criativo..."}
            </>
          ) : (
            <>
              {mediaType === "video" ? "Gerar Vídeo" : "Gerar Criativo"}
              <ChevronRight className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>

        {/* Video time warning */}
        {mediaType === "video" && selectedProvider === "sora_video" && !loading && (
          <div className="flex items-center gap-2 text-zinc-600 text-xs mb-6 -mt-4 justify-center">
            <Clock className="h-3 w-3" strokeWidth={1.5} />
            <span>A geração de vídeo pode levar 2-5 minutos</span>
          </div>
        )}

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
                  <Badge variant="outline" className="text-zinc-400 border-zinc-700 text-xs">
                    {[...IMAGE_PROVIDERS, ...VIDEO_PROVIDERS].find((p) => p.id === result.provider)?.label}
                  </Badge>
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

            {/* Video result */}
            {result.video_url && (
              <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-md overflow-hidden">
                <video
                  data-testid="generated-video"
                  src={`${API_URL}${result.video_url}`}
                  controls
                  className="w-full"
                  autoPlay
                  muted
                />
                <div className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-amber-400 border-amber-400/30 text-xs">
                      Sora 2
                    </Badge>
                    <Badge variant="outline" className="text-zinc-500 border-zinc-800 text-xs">
                      {result.video_size} | {result.video_duration}s
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <a
                      href={`${API_URL}${result.video_url}`}
                      download
                      target="_blank"
                      rel="noopener noreferrer"
                      data-testid="download-video"
                      className="text-zinc-500 hover:text-white transition-colors"
                    >
                      <Download className="h-4 w-4" strokeWidth={1.5} />
                    </a>
                    <button
                      data-testid="regenerate-video"
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
                      {briefing.elementos_visuais.map((el, i) => (
                        <Badge key={i} variant="outline" className="text-zinc-400 border-zinc-800 text-xs">{el}</Badge>
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
                  {c.video_url && (
                    <video src={`${API_URL}${c.video_url}`} className="w-full h-40 object-cover" muted />
                  )}
                  {c.briefing && (
                    <div className="p-3">
                      <p className="text-zinc-300 text-xs line-clamp-2">{c.briefing.conceito_visual}</p>
                    </div>
                  )}
                  <div className="px-3 pb-3 pt-1">
                    <Badge variant="outline" className="text-zinc-500 border-zinc-800 text-xs">
                      {[...IMAGE_PROVIDERS, ...VIDEO_PROVIDERS].find((p) => p.id === c.provider)?.label || c.provider}
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
