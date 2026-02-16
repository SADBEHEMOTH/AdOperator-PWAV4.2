import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useLanguage } from "@/context/LanguageContext";
import api from "@/lib/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import Stepper from "@/components/Stepper";
import LanguageSelector from "@/components/LanguageSelector";
import {
  Loader2,
  ChevronRight,
  ArrowLeft,
  Trophy,
  Target,
  Eye,
  Brain,
  AlertTriangle,
  Zap,
  Users,
  Copy,
  Check,
  Share2,
  ShieldCheck,
  ShieldAlert,
  Sparkles,
  Clock,
} from "lucide-react";

const getStepTitles = (t) => [t("flow.step1"), t("flow.step2"), t("flow.step3"), t("flow.step4"), t("flow.step5")];
const getStepDescriptions = (t) => [t("flow.step1_desc"), t("flow.step2_desc"), t("flow.step3_desc"), t("flow.step4_desc"), t("flow.step5_desc")];

const EXAMPLE_PRODUCT = {
  nome: "CapilarMax Pro",
  nicho: "Saude Capilar",
  promessa_principal: "Reduzir a queda de cabelo em ate 60% nos primeiros 90 dias",
  publico_alvo: "Homens de 25-55 anos que sofrem com queda de cabelo",
  beneficios: "Fortalece os fios, estimula o crescimento, reduz a oleosidade do couro cabeludo, resultados visiveis em 30 dias",
  ingredientes_mecanismo: "Complexo de biotina + zinco + saw palmetto que atua bloqueando o DHT no foliculo capilar",
  tom: "direto",
};

const PROMISE_CHIPS = ["reduzir queda", "aumentar densidade", "engrossar fios", "acelerar crescimento", "eliminar dor", "mais energia", "emagrecer rapido"];
const TONE_CHIPS = ["agressivo", "cientifico", "humano", "premium", "urgente", "provocativo"];

const RISKY_TERMS_LOCAL = ["cura", "curar", "100%", "garantido", "milagroso", "elimina", "remove", "definitivo", "nunca mais", "para sempre", "sem efeitos colaterais"];

const LOADING_STAGES = {
  parse: ["Interpretando produto...", "Analisando nivel de consciencia...", "Mapeando objecoes..."],
  generate: ["Construindo hipotese A...", "Diversificando estrutura...", "Calibrando metricas preditivas..."],
  simulate: ["Simulando reacao de publico...", "Avaliando resistencia a mensagem...", "Calculando probabilidade de clique...", "Detectando conflitos entre perfis..."],
  decide: ["Processando dados de simulacao...", "Comparando performance relativa...", "Calculando consequencias de cada escolha...", "Assumindo responsabilidade pela decisao..."],
};

export default function AnalysisFlow() {
  const { t } = useLanguage();
  const STEP_TITLES = getStepTitles(t);
  const STEP_DESCRIPTIONS = getStepDescriptions(t);
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [analysisId, setAnalysisId] = useState(null);
  const [data, setData] = useState(null);
  const [mode, setMode] = useState("quick");
  const [showRefinement, setShowRefinement] = useState(false);
  const [copied, setCopied] = useState(null);
  const [product, setProduct] = useState({
    nome: "",
    nicho: "",
    publico_alvo: "",
    promessa_principal: "",
    beneficios: "",
    ingredientes_mecanismo: "",
    tom: "",
  });
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const loadAnalysis = useCallback(async (id) => {
    try {
      const { data: analysis } = await api.get(`/analyses/${id}`);
      setAnalysisId(id);
      setData(analysis);
      setProduct(analysis.product);
      const statusStep = {
        created: 0,
        parsed: 1,
        generated: 2,
        simulated: 3,
        completed: 4,
      };
      setStep(statusStep[analysis.status] || 0);
    } catch {
      toast.error("Analise nao encontrada");
    }
  }, []);

  useEffect(() => {
    const resumeId = searchParams.get("resume");
    if (resumeId) {
      loadAnalysis(resumeId);
    }
  }, [searchParams, loadAnalysis]);

  const startStagedLoading = useCallback((stages) => {
    setLoading(true);
    setLoadingMessage(stages[0]);
    let idx = 0;
    const interval = setInterval(() => {
      idx = (idx + 1) % stages.length;
      setLoadingMessage(stages[idx]);
    }, 3000);
    return () => { clearInterval(interval); setLoadingMessage(""); };
  }, []);

  const handleSubmitProduct = async (e) => {
    e.preventDefault();
    const cleanup = startStagedLoading(LOADING_STAGES.parse);
    try {
      const { data: analysis } = await api.post("/analyses", product);
      setAnalysisId(analysis.id);
      setData(analysis);
      const { data: parseResult } = await api.post(
        `/analyses/${analysis.id}/parse`
      );
      setData((prev) => ({
        ...prev,
        strategic_analysis: parseResult,
        status: "parsed",
      }));
      setStep(1);
    } catch (err) {
      toast.error(err.response?.data?.detail || t("flow.error_create"));
    } finally {
      cleanup();
      setLoading(false);
    }
  };

  const runGenerate = async () => {
    const cleanup = startStagedLoading(LOADING_STAGES.generate);
    try {
      const { data: result } = await api.post(
        `/analyses/${analysisId}/generate`
      );
      setData((prev) => ({
        ...prev,
        ad_variations: result,
        status: "generated",
      }));
      setStep(2);
    } catch (err) {
      toast.error(err.response?.data?.detail || t("flow.error_generate"));
    } finally {
      cleanup();
      setLoading(false);
    }
  };

  const runSimulate = async () => {
    const cleanup = startStagedLoading(LOADING_STAGES.simulate);
    try {
      const { data: result } = await api.post(
        `/analyses/${analysisId}/simulate`
      );
      setData((prev) => ({
        ...prev,
        audience_simulation: result,
        status: "simulated",
      }));
      setStep(3);
    } catch (err) {
      toast.error(err.response?.data?.detail || t("flow.error_simulate"));
    } finally {
      cleanup();
      setLoading(false);
    }
  };

  const runDecide = async () => {
    const cleanup = startStagedLoading(LOADING_STAGES.decide);
    try {
      const { data: result } = await api.post(
        `/analyses/${analysisId}/decide`
      );
      setData((prev) => ({
        ...prev,
        decision: result,
        status: "completed",
      }));
      setStep(4);
    } catch (err) {
      toast.error(
        err.response?.data?.detail || t("flow.error_decide")
      );
    } finally {
      cleanup();
      setLoading(false);
    }
  };

  const updateField = (field, value) => {
    setProduct((prev) => ({ ...prev, [field]: value }));
  };

  const fillExample = () => {
    setProduct(EXAMPLE_PRODUCT);
    toast.success(t("flow.example_filled"));
  };

  const copyText = (text, label) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    toast.success(t("dec.copied"));
    setTimeout(() => setCopied(null), 2000);
  };

  const handleShare = async () => {
    try {
      const { data: shareData } = await api.post(`/analyses/${analysisId}/share`);
      const url = `${window.location.origin}/public/${shareData.public_token}`;
      await navigator.clipboard.writeText(url);
      toast.success(t("dec.share_copied"));
    } catch {
      toast.error(t("dec.share_error"));
    }
  };

  const complianceWarnings = useMemo(() => {
    const allText = `${product.nome} ${product.promessa_principal} ${product.beneficios} ${product.ingredientes_mecanismo}`.toLowerCase();
    return RISKY_TERMS_LOCAL.filter((term) => allText.includes(term));
  }, [product.nome, product.promessa_principal, product.beneficios, product.ingredientes_mecanismo]);

  const handleRefineAndGenerate = async () => {
    if (analysisId) {
      try {
        await api.patch(`/analyses/${analysisId}/product`, product);
      } catch { /* continue anyway */ }
    }
    runGenerate();
  };

  const handleImprove = async () => {
    try {
      const { data: newAnalysis } = await api.post(`/analyses/${analysisId}/improve`);
      navigate(`/analysis/new?resume=${newAnalysis.id}`);
      window.location.reload();
    } catch (err) {
      toast.error(err.response?.data?.detail || t("dec.improve_error"));
    }
  };

  // ---- STEP RENDERERS ----

  // ---- Shared form field renderers ----
  const renderQuickFields = () => (
    <>
      <div className="space-y-2">
        <Label className="text-zinc-400 text-xs uppercase tracking-widest font-mono">
          {t("flow.product_name")}
        </Label>
        <Input
          data-testid="product-name"
          value={product.nome}
          onChange={(e) => updateField("nome", e.target.value)}
          placeholder="Ex: CapilarMax Pro"
          className="bg-zinc-950/50 border-zinc-800 text-white placeholder:text-zinc-600 focus:border-white/50 focus:ring-0 rounded-sm h-12"
          required
        />
      </div>

      <div className="space-y-2">
        <Label className="text-zinc-400 text-xs uppercase tracking-widest font-mono">
          {t("flow.niche")}
        </Label>
        <Input
          data-testid="product-niche"
          value={product.nicho}
          onChange={(e) => updateField("nicho", e.target.value)}
          placeholder="Ex: Saude Capilar"
          className="bg-zinc-950/50 border-zinc-800 text-white placeholder:text-zinc-600 focus:border-white/50 focus:ring-0 rounded-sm h-12"
          required
        />
      </div>

      <div className="space-y-2">
        <Label className="text-zinc-400 text-xs uppercase tracking-widest font-mono">
          {t("flow.main_promise")}
        </Label>
        <Textarea
          data-testid="product-promise"
          value={product.promessa_principal}
          onChange={(e) => updateField("promessa_principal", e.target.value)}
          placeholder="O que o produto promete entregar..."
          className="bg-zinc-950/50 border-zinc-800 text-white placeholder:text-zinc-600 focus:border-white/50 focus:ring-0 rounded-sm min-h-[80px] resize-none"
          required
        />
        <div className="flex flex-wrap gap-1.5 mt-1">
          {PROMISE_CHIPS.map((chip) => (
            <button
              key={chip}
              type="button"
              data-testid={`chip-${chip.replace(/\s/g, "-")}`}
              onClick={() => updateField("promessa_principal", product.promessa_principal ? `${product.promessa_principal}, ${chip}` : chip)}
              className="text-xs px-2.5 py-1 rounded-sm bg-zinc-900/50 border border-zinc-800/50 text-zinc-500 hover:text-white hover:border-zinc-600 transition-all duration-200 cursor-pointer"
            >
              {chip}
            </button>
          ))}
        </div>
      </div>
    </>
  );

  const renderExtraFields = () => (
    <>
      <div className="space-y-2">
        <Label className="text-zinc-400 text-xs uppercase tracking-widest font-mono">
          {t("flow.audience")} <span className="text-zinc-700">{t("flow.optional")}</span>
        </Label>
        <Input
          data-testid="product-audience"
          value={product.publico_alvo}
          onChange={(e) => updateField("publico_alvo", e.target.value)}
          placeholder="Ex: Homens 30-50 anos"
          className="bg-zinc-950/50 border-zinc-800 text-white placeholder:text-zinc-600 focus:border-white/50 focus:ring-0 rounded-sm h-12"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-zinc-400 text-xs uppercase tracking-widest font-mono">
          {t("flow.benefits")} <span className="text-zinc-700">{t("flow.optional")}</span>
        </Label>
        <Textarea
          data-testid="product-benefits"
          value={product.beneficios}
          onChange={(e) => updateField("beneficios", e.target.value)}
          placeholder="Liste os principais beneficios..."
          className="bg-zinc-950/50 border-zinc-800 text-white placeholder:text-zinc-600 focus:border-white/50 focus:ring-0 rounded-sm min-h-[80px] resize-none"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-zinc-400 text-xs uppercase tracking-widest font-mono">
          {t("flow.mechanism")} <span className="text-zinc-700">{t("flow.optional")}</span>
        </Label>
        <Textarea
          data-testid="product-mechanism"
          value={product.ingredientes_mecanismo}
          onChange={(e) => updateField("ingredientes_mecanismo", e.target.value)}
          placeholder="Como funciona ou o que contem..."
          className="bg-zinc-950/50 border-zinc-800 text-white placeholder:text-zinc-600 focus:border-white/50 focus:ring-0 rounded-sm min-h-[80px] resize-none"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-zinc-400 text-xs uppercase tracking-widest font-mono">
          {t("flow.tone")} <span className="text-zinc-700">{t("flow.optional")}</span>
        </Label>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {TONE_CHIPS.map((chip) => (
            <button
              key={chip}
              type="button"
              data-testid={`tone-chip-${chip}`}
              onClick={() => updateField("tom", chip)}
              className={`text-xs px-2.5 py-1 rounded-sm border transition-all duration-200 cursor-pointer ${
                product.tom === chip
                  ? "bg-white/10 border-white/30 text-white"
                  : "bg-zinc-900/50 border-zinc-800/50 text-zinc-500 hover:text-white hover:border-zinc-600"
              }`}
            >
              {chip}
            </button>
          ))}
        </div>
        <Select value={product.tom} onValueChange={(v) => updateField("tom", v)}>
          <SelectTrigger data-testid="product-tone" className="bg-zinc-950/50 border-zinc-800 text-white rounded-sm h-12">
            <SelectValue placeholder="Ou selecione aqui" />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-zinc-800">
            <SelectItem value="persuasivo">Persuasivo</SelectItem>
            <SelectItem value="urgente">Urgente</SelectItem>
            <SelectItem value="emocional">Emocional</SelectItem>
            <SelectItem value="educativo">Educativo</SelectItem>
            <SelectItem value="direto">Direto</SelectItem>
            <SelectItem value="provocativo">Provocativo</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </>
  );

  const renderComplianceBanner = () => (
    complianceWarnings.length > 0 ? (
      <div className="flex items-start gap-3 bg-amber-500/5 border border-amber-500/20 rounded-sm p-3">
        <ShieldAlert className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" strokeWidth={1.5} />
        <div>
          <p className="text-amber-400 text-xs font-medium">{t("flow.compliance_risk")}</p>
          <p className="text-zinc-400 text-xs mt-1">
            Termos como {complianceWarnings.map((tw, i) => (
              <span key={tw} className="text-amber-300 font-mono">{i > 0 && ", "}&#34;{tw}&#34;</span>
            ))} podem causar reprovacao em plataformas de anuncio.
          </p>
        </div>
      </div>
    ) : (
      <div className="flex items-center gap-2 text-zinc-600 text-xs">
        <ShieldCheck className="h-3.5 w-3.5" strokeWidth={1.5} />
        {t("flow.compliance_safe")}
      </div>
    )
  );

  const renderProductInput = () => (
    <div className="animate-fade-in-up">
      <div className="flex items-center justify-between mb-6">
        <Tabs value={mode} onValueChange={setMode} className="w-auto">
          <TabsList className="bg-zinc-900/50 border border-zinc-800/50">
            <TabsTrigger
              value="quick"
              data-testid="mode-quick"
              className="text-xs font-mono data-[state=active]:bg-zinc-800 data-[state=active]:text-white"
            >
              {t("flow.quick")}
            </TabsTrigger>
            <TabsTrigger
              value="complete"
              data-testid="mode-complete"
              className="text-xs font-mono data-[state=active]:bg-zinc-800 data-[state=active]:text-white"
            >
              {t("flow.complete")}
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          data-testid="fill-example-button"
          onClick={fillExample}
          className="text-zinc-500 hover:text-white text-xs"
        >
          <Sparkles className="h-3.5 w-3.5 mr-1.5" strokeWidth={1.5} />
          {t("flow.fill_example")}
        </Button>
      </div>

      <form onSubmit={handleSubmitProduct} className="space-y-6">
        {renderQuickFields()}
        {mode === "complete" && renderExtraFields()}

        {renderComplianceBanner()}

        <div className="space-y-3">
          <div className="flex items-center justify-center gap-2 text-zinc-600 text-xs">
            <Clock className="h-3 w-3" strokeWidth={1.5} />
            <span>{t("flow.time_estimate")}</span>
          </div>

          <Button
            data-testid="submit-product"
            type="submit"
            disabled={loading}
            className="w-full bg-white text-black hover:bg-zinc-200 shadow-[0_0_15px_rgba(255,255,255,0.1)] transition-all duration-300 rounded-sm h-12 font-semibold"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin mr-2 h-4 w-4" />
                {loadingMessage}
              </>
            ) : (
              <>
                Encontrar o melhor anúncio
                <ChevronRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );

  const renderStrategicAnalysis = () => {
    const s = data?.strategic_analysis;
    if (!s) return null;
    const compliance = s.compliance;
    return (
      <div className="space-y-6 animate-fade-in-up">
        {compliance && compliance.total_riscos > 0 && (
          <div className="bg-amber-500/5 border border-amber-500/20 rounded-md p-5 space-y-3">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-amber-400" strokeWidth={1.5} />
              <span className="text-amber-400 text-xs font-mono uppercase tracking-widest">
                Compliance Score: {compliance.score}/100
              </span>
            </div>
            <div className="space-y-2">
              {compliance.riscos.map((r, i) => (
                <div key={i} className="flex items-start gap-2 text-xs">
                  <Badge variant="outline" className={`shrink-0 ${r.severidade === "alta" ? "text-red-400 border-red-400/30" : "text-amber-400 border-amber-400/30"}`}>
                    {r.termo}
                  </Badge>
                  <span className="text-zinc-400">{r.sugestao}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-md p-6 space-y-5">
          <div className="flex items-center gap-2 mb-2">
            <Brain className="h-4 w-4 text-white" strokeWidth={1.5} />
            <span className="text-xs font-mono uppercase tracking-widest text-zinc-400">
              {t("strategy.title")}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InfoBlock label={t("strategy.consciousness")} value={s.nivel_consciencia} />
            <InfoBlock label={t("strategy.angle")} value={s.angulo_venda} />
          </div>

          <Separator className="bg-zinc-800/50" />

          <InfoBlock label={t("strategy.pain")} value={s.dor_central} />
          <InfoBlock label={t("strategy.big_idea")} value={s.big_idea} />
          <InfoBlock label={t("strategy.mechanism")} value={s.mecanismo_percebido} />

          <div className="space-y-2">
            <span className="text-xs font-mono text-zinc-600 uppercase tracking-widest">
              {t("strategy.objections")}
            </span>
            <div className="flex flex-wrap gap-2">
              {(s.objecoes || []).map((obj, i) => (
                <Badge key={i} variant="outline" className="text-zinc-400 border-zinc-800 text-xs">
                  {obj}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        {mode === "quick" && !showRefinement && (
          <button
            data-testid="show-refinement-button"
            onClick={() => setShowRefinement(true)}
            className="w-full text-left bg-zinc-900/20 border border-dashed border-zinc-800/50 rounded-md p-4 hover:border-zinc-700 transition-all duration-300 group"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-zinc-400 text-sm font-medium">{t("flow.refine")}</p>
                <p className="text-zinc-600 text-xs mt-0.5">{t("flow.refine_desc")}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-zinc-700 group-hover:text-white transition-colors" strokeWidth={1.5} />
            </div>
          </button>
        )}

        {showRefinement && (
          <div className="bg-zinc-900/20 border border-zinc-800/50 rounded-md p-6 space-y-5 animate-fade-in-up">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono uppercase tracking-widest text-zinc-400">Dados Adicionais</span>
              <button onClick={() => setShowRefinement(false)} className="text-zinc-600 hover:text-white text-xs transition-colors">Fechar</button>
            </div>
            {renderExtraFields()}
          </div>
        )}

        <Button
          data-testid="generate-ads-button"
          onClick={showRefinement ? handleRefineAndGenerate : runGenerate}
          disabled={loading}
          className="w-full bg-white text-black hover:bg-zinc-200 shadow-[0_0_15px_rgba(255,255,255,0.1)] transition-all duration-300 rounded-sm h-12 font-semibold"
        >
          {loading ? (
            <>
              <Loader2 className="animate-spin mr-2 h-4 w-4" />
              {loadingMessage}
            </>
          ) : (
            <>
              Escolher o anuncio vencedor
              <ChevronRight className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    );
  };

  const renderAdVariations = () => {
    const ads = data?.ad_variations?.anuncios;
    const nota = data?.ad_variations?.nota_experimental;
    if (!ads) return null;
    const metricColor = (val) => {
      if (!val) return "text-zinc-400";
      const v = val.toLowerCase();
      if (v.includes("alto") || v.includes("alta")) return "text-emerald-400";
      if (v.includes("médio") || v.includes("média") || v.includes("medio") || v.includes("media")) return "text-amber-400";
      return "text-zinc-400";
    };
    return (
      <div className="space-y-6 animate-fade-in-up">
        {nota && (
          <div className="text-center py-3 border-b border-zinc-800/30">
            <p className="text-zinc-500 text-xs italic">{nota}</p>
          </div>
        )}

        <div className="text-center mb-2">
          <span className="text-xs font-mono uppercase tracking-widest text-zinc-500">Experimento de Clique</span>
        </div>

        {ads.map((ad, i) => (
          <div key={i} className="bg-zinc-900/30 border border-zinc-800/50 rounded-md overflow-hidden">
            <div className="bg-zinc-900/50 border-b border-zinc-800/50 px-6 py-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="text-white border-zinc-600 text-xs font-mono font-semibold">
                    Hipotese {ad.numero || i + 1} — {ad.hipotese || ad.abordagem || ""}
                  </Badge>
                </div>
                <Badge variant="outline" className="text-zinc-500 border-zinc-800 text-xs">
                  {ad.abordagem_estrutural || ad.abordagem || ""}
                </Badge>
              </div>
              <p className="text-zinc-400 text-sm">{ad.objetivo || ""}</p>
              {ad.estrategia && <p className="text-zinc-600 text-xs mt-1">Estrategia: {ad.estrategia}</p>}
            </div>

            <div className="px-6 py-5 space-y-4">
              {ad.publico_indicado && (
                <div className="flex items-center gap-2 bg-zinc-950/30 rounded-sm px-3 py-2">
                  <Target className="h-3.5 w-3.5 text-zinc-500 shrink-0" strokeWidth={1.5} />
                  <span className="text-zinc-400 text-xs">Funciona melhor para: <span className="text-white">{ad.publico_indicado}</span></span>
                </div>
              )}

              <InfoBlock label="Hook" value={ad.hook} highlight />
              <InfoBlock label="Copy" value={ad.copy} />

              <details className="group">
                <summary className="text-xs font-mono text-zinc-600 uppercase tracking-widest cursor-pointer hover:text-zinc-400 transition-colors">Roteiro UGC</summary>
                <p className="text-zinc-400 text-xs leading-relaxed whitespace-pre-line mt-2">{ad.roteiro_ugc}</p>
              </details>

              <Separator className="bg-zinc-800/30" />

              <div className="grid grid-cols-2 gap-3">
                {ad.pontos_fortes && (
                  <div className="space-y-1.5">
                    <span className="text-xs font-mono text-emerald-500/70 uppercase tracking-widest">Pontos fortes</span>
                    {ad.pontos_fortes.map((p, j) => (
                      <p key={j} className="text-zinc-300 text-xs flex items-start gap-1.5"><span className="text-emerald-500 mt-0.5">+</span>{p}</p>
                    ))}
                  </div>
                )}
                {ad.pontos_fracos && (
                  <div className="space-y-1.5">
                    <span className="text-xs font-mono text-amber-500/70 uppercase tracking-widest">Pontos fracos</span>
                    {ad.pontos_fracos.map((p, j) => (
                      <p key={j} className="text-zinc-400 text-xs flex items-start gap-1.5"><span className="text-amber-500 mt-0.5">-</span>{p}</p>
                    ))}
                  </div>
                )}
              </div>

              {ad.metricas_preditivas && (
                <div className="bg-zinc-950/30 rounded-sm p-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <span className="text-zinc-600 text-xs block">CTR Est.</span>
                    <span className="text-white text-sm font-mono">{ad.metricas_preditivas.ctr_estimado || "—"}</span>
                  </div>
                  <div>
                    <span className="text-zinc-600 text-xs block">Curiosidade</span>
                    <span className={`text-sm font-mono ${metricColor(ad.metricas_preditivas.nivel_curiosidade)}`}>{ad.metricas_preditivas.nivel_curiosidade || "—"}</span>
                  </div>
                  <div>
                    <span className="text-zinc-600 text-xs block">Risco Bloqueio</span>
                    <span className={`text-sm font-mono ${ad.metricas_preditivas.risco_bloqueio?.toLowerCase().includes("alto") ? "text-red-400" : ad.metricas_preditivas.risco_bloqueio?.toLowerCase().includes("medio") || ad.metricas_preditivas.risco_bloqueio?.toLowerCase().includes("médio") ? "text-amber-400" : "text-emerald-400"}`}>{ad.metricas_preditivas.risco_bloqueio || "—"}</span>
                  </div>
                  <div>
                    <span className="text-zinc-600 text-xs block">Conversao</span>
                    <span className={`text-sm font-mono ${metricColor(ad.metricas_preditivas.probabilidade_conversao)}`}>{ad.metricas_preditivas.probabilidade_conversao || "—"}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}

        <Button
          data-testid="simulate-button"
          onClick={runSimulate}
          disabled={loading}
          className="w-full bg-white text-black hover:bg-zinc-200 shadow-[0_0_15px_rgba(255,255,255,0.1)] transition-all duration-300 rounded-sm h-12 font-semibold"
        >
          {loading ? (
            <>
              <Loader2 className="animate-spin mr-2 h-4 w-4" />
              {loadingMessage}
            </>
          ) : (
            <>
              Rodar simulacao
              <ChevronRight className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    );
  };

  const renderSimulation = () => {
    const sim = data?.audience_simulation?.simulacao;
    const tendencia = data?.audience_simulation?.tendencia_geral;
    const conflitos = data?.audience_simulation?.conflitos_detectados;
    if (!sim) return null;
    const profileIcons = {
      "Cético": Eye, "Cetico": Eye,
      "Interessado": Target,
      "Impulsivo": Zap,
      "Desconfiado": AlertTriangle,
    };
    const decisionColors = {
      "clicar": "text-emerald-400 bg-emerald-400/10",
      "salvar": "text-blue-400 bg-blue-400/10",
      "investigar": "text-amber-400 bg-amber-400/10",
      "ignorar": "text-red-400 bg-red-400/10",
      "hesitar": "text-amber-400 bg-amber-400/10",
    };
    const getDecisionStyle = (d) => {
      if (!d) return "text-zinc-400 bg-zinc-800/50";
      const key = Object.keys(decisionColors).find(k => d.toLowerCase().includes(k));
      return key ? decisionColors[key] : "text-zinc-400 bg-zinc-800/50";
    };

    return (
      <div className="space-y-8 animate-fade-in-up">
        {sim.map((adSim, i) => (
          <div key={i} className="space-y-3">
            <span className="text-xs font-mono text-zinc-500 uppercase tracking-widest">
              Anuncio #{adSim.anuncio_numero}
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(adSim.reacoes || []).map((r, j) => {
                const Icon = profileIcons[r.perfil] || Users;
                const avg = Math.round((
                  (r.interesse || 0) + (r.clareza || 0) + (r.confianca || 0) + (r.probabilidade_clique || 0)
                ) / 4);
                return (
                  <div key={j} className="bg-zinc-900/30 border border-zinc-800/50 rounded-md p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <Icon className="h-3.5 w-3.5 text-zinc-400" strokeWidth={1.5} />
                      <span className="text-white text-xs font-medium">{r.perfil}</span>
                      <span className={`ml-auto text-xs px-2 py-0.5 rounded-sm ${getDecisionStyle(r.decisao_provavel)}`}>
                        {r.decisao_provavel || "—"}
                      </span>
                    </div>

                    {/* Layer 1: Emotional Reaction */}
                    <div className="space-y-0.5">
                      <span className="text-zinc-700 text-xs font-mono">1a reacao</span>
                      <p className="text-zinc-300 text-sm italic">&ldquo;{r.reacao_emocional || r.comentario || "—"}&rdquo;</p>
                    </div>

                    {/* Layer 2: 2-second thought */}
                    {r.pensamento_2s && (
                      <div className="space-y-0.5">
                        <span className="text-zinc-700 text-xs font-mono">Apos 2s</span>
                        <p className="text-zinc-400 text-xs">&ldquo;{r.pensamento_2s}&rdquo;</p>
                      </div>
                    )}

                    {/* Layer 3: What would make them click */}
                    {r.o_que_faria_clicar && (
                      <div className="bg-zinc-950/30 rounded-sm px-2.5 py-1.5">
                        <span className="text-zinc-600 text-xs">Clicaria se: </span>
                        <span className="text-zinc-300 text-xs">{r.o_que_faria_clicar}</span>
                      </div>
                    )}

                    {/* Layer 4: Metrics (consequence, not center) */}
                    <div className="grid grid-cols-4 gap-1 text-xs pt-1 border-t border-zinc-800/30">
                      <div className="text-center"><span className="text-zinc-600 block text-[10px]">Int.</span><span className="text-zinc-300">{r.interesse || "—"}</span></div>
                      <div className="text-center"><span className="text-zinc-600 block text-[10px]">Clar.</span><span className="text-zinc-300">{r.clareza || "—"}</span></div>
                      <div className="text-center"><span className="text-zinc-600 block text-[10px]">Conf.</span><span className="text-zinc-300">{r.confianca || "—"}</span></div>
                      <div className="text-center"><span className="text-zinc-600 block text-[10px]">Cliq.</span><span className={avg >= 60 ? "text-emerald-400" : avg >= 35 ? "text-amber-400" : "text-red-400"}>{r.probabilidade_clique || "—"}</span></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {/* Trend footer */}
        {(tendencia || conflitos) && (
          <div className="bg-zinc-900/20 border border-zinc-800/30 rounded-md p-5 space-y-2">
            {tendencia && (
              <div className="flex items-start gap-2">
                <Brain className="h-3.5 w-3.5 text-zinc-500 mt-0.5 shrink-0" strokeWidth={1.5} />
                <p className="text-zinc-300 text-xs"><span className="text-zinc-500">Tendencia geral: </span>{tendencia}</p>
              </div>
            )}
            {conflitos && (
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-500/70 mt-0.5 shrink-0" strokeWidth={1.5} />
                <p className="text-zinc-400 text-xs"><span className="text-zinc-500">Conflito: </span>{conflitos}</p>
              </div>
            )}
          </div>
        )}

        <Button
          data-testid="decide-button"
          onClick={runDecide}
          disabled={loading}
          className="w-full bg-white text-black hover:bg-zinc-200 shadow-[0_0_15px_rgba(255,255,255,0.1)] transition-all duration-300 rounded-sm h-12 font-semibold"
        >
          {loading ? (
            <>
              <Loader2 className="animate-spin mr-2 h-4 w-4" />
              {loadingMessage}
            </>
          ) : (
            <>
              Rodar motor de decisao
              <ChevronRight className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    );
  };

  const renderDecision = () => {
    const d = data?.decision;
    if (!d) return null;
    // Support both old (d.vencedor) and new (d.veredito) formats
    const v = d.veredito || d.vencedor || {};
    const hook = v.hook || "";
    const copy = v.copy || "";
    const ugc = v.roteiro_ugc || "";
    const num = v.anuncio_numero;
    const score = v.pontuacao_final;
    const frasePrincipal = v.frase_principal || d.motivo || "";
    const explicacao = v.explicacao_causal || d.motivo || "";

    return (
      <div className="space-y-8 animate-fade-in-up">
        {/* VERDICT FIRST - brutally clear */}
        <div className="text-center py-8">
          <p className="text-xs font-mono uppercase tracking-widest text-zinc-600 mb-6">Veredito do Motor de Decisao</p>
          <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight mb-4">
            Anuncio Escolhido: Variacao {num}
          </h2>
          <p className="text-zinc-300 text-sm max-w-lg mx-auto">{frasePrincipal}</p>
          {score && (
            <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-sm px-4 py-2 mt-4">
              <Trophy className="h-4 w-4 text-amber-400" strokeWidth={1.5} />
              <span className="text-white font-mono text-sm">Pontuacao: {score}</span>
            </div>
          )}
        </div>

        {/* Causal explanation */}
        <div className="bg-zinc-900/20 border-l-2 border-white/20 pl-5 py-3">
          <p className="text-zinc-300 text-sm leading-relaxed">{explicacao}</p>
        </div>

        {/* Consequences of other choices */}
        {d.consequencias_outras && d.consequencias_outras.length > 0 && (
          <div className="bg-red-500/5 border border-red-500/10 rounded-md p-5 space-y-2">
            <span className="text-xs font-mono text-red-400/70 uppercase tracking-widest">Consequencia de escolher errado</span>
            {d.consequencias_outras.map((c, i) => (
              <p key={i} className="text-zinc-400 text-xs">
                <span className="text-red-400">Variacao {c.anuncio_numero}:</span> {c.consequencia}
              </p>
            ))}
          </div>
        )}

        {/* Winning ad with copy buttons */}
        <div className="bg-black/40 backdrop-blur-xl border border-white/10 shadow-[0_0_30px_rgba(255,255,255,0.05)] rounded-md overflow-hidden">
          <div className="bg-white/5 px-6 py-3 border-b border-white/5">
            <span className="text-xs font-mono text-zinc-500 uppercase tracking-widest">Este e o anuncio que voce deve usar agora</span>
          </div>
          <div className="p-8 space-y-6">
            <div className="flex items-start justify-between">
              <div className="flex-1"><InfoBlock label="Hook" value={hook} highlight /></div>
              <Button variant="ghost" size="icon" data-testid="copy-hook-decision" onClick={() => copyText(hook, "hook")} className="text-zinc-500 hover:text-white ml-2 shrink-0">
                {copied === "hook" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <Separator className="bg-zinc-800/50" />
            <div className="flex items-start justify-between">
              <div className="flex-1"><InfoBlock label="Copy" value={copy} /></div>
              <Button variant="ghost" size="icon" data-testid="copy-text-decision" onClick={() => copyText(copy, "copy")} className="text-zinc-500 hover:text-white ml-2 shrink-0">
                {copied === "copy" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <Separator className="bg-zinc-800/50" />
            <details className="group">
              <summary className="text-xs font-mono text-zinc-600 uppercase tracking-widest cursor-pointer hover:text-zinc-400">Roteiro UGC</summary>
              <p className="text-zinc-400 text-xs leading-relaxed whitespace-pre-line mt-2">{ugc}</p>
            </details>
          </div>
        </div>

        {/* Investment recommendation */}
        {d.investimento_recomendacao && (
          <div className="bg-emerald-500/5 border border-emerald-500/15 rounded-md p-5">
            <span className="text-xs font-mono text-emerald-400/70 uppercase tracking-widest block mb-2">Se estivesse investindo R$2.000</span>
            <p className="text-zinc-300 text-sm">{d.investimento_recomendacao}</p>
          </div>
        )}

        {/* Next step */}
        {d.proximo_passo && (
          <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-md p-5">
            <span className="text-xs font-mono text-zinc-500 uppercase tracking-widest block mb-2">Proximo passo recomendado</span>
            <p className="text-white text-sm font-medium">{d.proximo_passo.acao}</p>
            <p className="text-zinc-500 text-xs mt-1">Motivo: {d.proximo_passo.motivo}</p>
          </div>
        )}

        {/* Weaknesses + improvement */}
        <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-md p-6 space-y-4">
          <div className="space-y-2">
            <span className="text-xs font-mono text-zinc-500 uppercase tracking-widest">Fraquezas detectadas</span>
            <div className="flex flex-wrap gap-2">
              {(d.fraquezas || []).map((f, i) => (
                <Badge key={i} variant="outline" className="text-amber-400 border-amber-400/30 text-xs">{f}</Badge>
              ))}
            </div>
          </div>
          <InfoBlock label="Sugestao de melhoria" value={d.sugestao_melhoria} />
        </div>

        {/* LP Structure */}
        {d.estrutura_lp && (
          <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-md p-6 space-y-3">
            <span className="text-xs font-mono text-zinc-500 uppercase tracking-widest">Estrutura de LP sugerida</span>
            <p className="text-white font-medium text-sm">{d.estrutura_lp.headline}</p>
            <p className="text-zinc-400 text-sm">{d.estrutura_lp.subheadline}</p>
            <div className="flex flex-wrap gap-2 mt-2">
              {(d.estrutura_lp.secoes || []).map((s, i) => (
                <Badge key={i} variant="outline" className="text-zinc-400 border-zinc-800 text-xs">{s}</Badge>
              ))}
            </div>
          </div>
        )}

        {d.publico_compativel && (
          <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-md p-6 space-y-2">
            <span className="text-xs font-mono text-zinc-500 uppercase tracking-widest">Publico mais compativel</span>
            <p className="text-zinc-300 text-sm leading-relaxed">{d.publico_compativel}</p>
          </div>
        )}

        {/* Ranking */}
        {d.ranking && (
          <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-md p-6 space-y-3">
            <span className="text-xs font-mono text-zinc-500 uppercase tracking-widest">Ranking</span>
            {d.ranking.map((r, i) => (
              <div key={i} className="flex items-center justify-between py-2">
                <span className="text-zinc-400 text-sm">Anuncio #{r.anuncio_numero}</span>
                <div className="flex items-center gap-3">
                  <div className="w-32 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                    <div className="h-full bg-white/80 rounded-full transition-all duration-700" style={{ width: `${r.pontuacao}%` }} />
                  </div>
                  <span className="text-white text-sm font-mono w-12 text-right">{r.pontuacao}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Loop system message */}
        <div className="text-center py-2">
          <p className="text-zinc-600 text-xs italic">O sistema continuara aprendendo se voce gerar novas versoes.</p>
        </div>

        {/* Action buttons - NEVER "voltar" */}
        <div className="space-y-3">
          <Button
            data-testid="use-this-ad"
            onClick={handleShare}
            className="w-full bg-white text-black hover:bg-zinc-200 shadow-[0_0_15px_rgba(255,255,255,0.1)] transition-all duration-300 rounded-sm h-12 font-semibold"
          >
            <Share2 className="mr-2 h-4 w-4" /> Usar este anuncio
          </Button>

          <div className="grid grid-cols-2 gap-3">
            <Button
              data-testid="improve-ad"
              onClick={handleImprove}
              variant="outline"
              className="border-zinc-800 hover:border-zinc-600 text-zinc-300 hover:text-white transition-all duration-300 rounded-sm h-11"
            >
              Melhorar anuncio
            </Button>
            <Button
              data-testid="new-variation"
              onClick={handleImprove}
              variant="outline"
              className="border-zinc-800 hover:border-zinc-600 text-zinc-300 hover:text-white transition-all duration-300 rounded-sm h-11"
            >
              Testar nova variacao
            </Button>
          </div>

          {(d.melhorias_possiveis || []).length > 0 && (
            <div className="space-y-2 pt-2">
              <span className="text-xs font-mono text-zinc-600 uppercase tracking-widest block">Proximos testes recomendados</span>
              <div className="flex flex-wrap gap-2">
                {d.melhorias_possiveis.map((m, i) => (
                  <button
                    key={i}
                    data-testid={`improvement-${i}`}
                    onClick={handleImprove}
                    className="text-xs px-3 py-1.5 rounded-sm bg-zinc-900/50 border border-zinc-800/50 text-zinc-400 hover:text-white hover:border-zinc-600 transition-all duration-200 cursor-pointer"
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const stepRenderers = [
    renderProductInput,
    renderStrategicAnalysis,
    renderAdVariations,
    renderSimulation,
    renderDecision,
  ];

  return (
    <div className="min-h-screen">
      <header className="border-b border-zinc-800/50 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <button
            data-testid="back-button"
            onClick={() => navigate("/")}
            className="flex items-center gap-2 text-zinc-500 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
            <span className="text-sm">Voltar</span>
          </button>
          <span className="text-sm font-semibold text-white">
            AdOperator
          </span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8">
        <Stepper currentStep={step} />

        <div className="mb-8">
          <h2 className="text-2xl md:text-3xl font-semibold text-white tracking-tight">
            {STEP_TITLES[step]}
          </h2>
          <p className="text-zinc-500 text-sm mt-1">
            {STEP_DESCRIPTIONS[step]}
          </p>
        </div>

        {stepRenderers[step]()}
      </main>
    </div>
  );
}

// --- Small Helper Components ---

function InfoBlock({ label, value, highlight = false }) {
  return (
    <div className="space-y-1">
      <span className="text-xs font-mono text-zinc-600 uppercase tracking-widest">
        {label}
      </span>
      <p
        className={`text-sm leading-relaxed ${
          highlight ? "text-white font-medium" : "text-zinc-300"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function ScoreItem({ label, value }) {
  return (
    <div>
      <span className="text-zinc-600">{label}</span>{" "}
      <span className="text-white ml-1">{value}</span>
    </div>
  );
}
