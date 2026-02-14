import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
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

const STEP_TITLES = [
  "Descreva o Produto",
  "Interpretacao Estrategica",
  "Variacoes de Anuncios",
  "Simulacao de Publico",
  "Resultado Final",
];

const STEP_DESCRIPTIONS = [
  "Preencha os dados do produto para iniciar a analise.",
  "O sistema interpretou estrategicamente seu produto.",
  "3 variacoes de anuncios foram geradas automaticamente.",
  "4 perfis de publico simulados reagiram aos anuncios.",
  "O motor de decisao escolheu o melhor anuncio.",
];

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

export default function AnalysisFlow() {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
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

  const handleSubmitProduct = async (e) => {
    e.preventDefault();
    setLoading(true);
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
      toast.error(err.response?.data?.detail || "Erro ao criar analise");
    } finally {
      setLoading(false);
    }
  };

  const runGenerate = async () => {
    setLoading(true);
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
      toast.error(err.response?.data?.detail || "Erro ao gerar anuncios");
    } finally {
      setLoading(false);
    }
  };

  const runSimulate = async () => {
    setLoading(true);
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
      toast.error(err.response?.data?.detail || "Erro ao simular publico");
    } finally {
      setLoading(false);
    }
  };

  const runDecide = async () => {
    setLoading(true);
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
        err.response?.data?.detail || "Erro ao processar decisao"
      );
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field, value) => {
    setProduct((prev) => ({ ...prev, [field]: value }));
  };

  const fillExample = () => {
    setProduct(EXAMPLE_PRODUCT);
    toast.success("Exemplo preenchido!");
  };

  const copyText = (text, label) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    toast.success("Copiado!");
    setTimeout(() => setCopied(null), 2000);
  };

  const handleShare = async () => {
    try {
      const { data: shareData } = await api.post(`/analyses/${analysisId}/share`);
      const url = `${window.location.origin}/public/${shareData.public_token}`;
      await navigator.clipboard.writeText(url);
      toast.success("Link publico copiado!");
    } catch {
      toast.error("Erro ao gerar link");
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

  // ---- STEP RENDERERS ----

  // ---- Shared form field renderers ----
  const renderQuickFields = () => (
    <>
      <div className="space-y-2">
        <Label className="text-zinc-400 text-xs uppercase tracking-widest font-mono">
          Nome do Produto
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
          Nicho
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
          Promessa Principal
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
          Publico-Alvo <span className="text-zinc-700">(opcional)</span>
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
          Beneficios <span className="text-zinc-700">(opcional)</span>
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
          Ingredientes / Mecanismo <span className="text-zinc-700">(opcional)</span>
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
          Tom Desejado <span className="text-zinc-700">(opcional)</span>
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
          <p className="text-amber-400 text-xs font-medium">Risco de bloqueio detectado</p>
          <p className="text-zinc-400 text-xs mt-1">
            Termos como {complianceWarnings.map((t, i) => (
              <span key={t} className="text-amber-300 font-mono">{i > 0 && ", "}&#34;{t}&#34;</span>
            ))} podem causar reprovacao em plataformas de anuncio.
          </p>
        </div>
      </div>
    ) : (
      <div className="flex items-center gap-2 text-zinc-600 text-xs">
        <ShieldCheck className="h-3.5 w-3.5" strokeWidth={1.5} />
        Evite promessas medicas absolutas. O sistema vai sinalizar risco de bloqueio.
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
              Rapido
            </TabsTrigger>
            <TabsTrigger
              value="complete"
              data-testid="mode-complete"
              className="text-xs font-mono data-[state=active]:bg-zinc-800 data-[state=active]:text-white"
            >
              Completo
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
          Gerar exemplo
        </Button>
      </div>

      <form onSubmit={handleSubmitProduct} className="space-y-6">
        {renderQuickFields()}
        {mode === "complete" && renderExtraFields()}

        {renderComplianceBanner()}

        <div className="space-y-3">
          <div className="flex items-center justify-center gap-2 text-zinc-600 text-xs">
            <Clock className="h-3 w-3" strokeWidth={1.5} />
            <span>Leva ~45s para analise completa</span>
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
                Interpretando Estrategicamente...
              </>
            ) : (
              <>
                Encontrar o melhor anuncio
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
              Interpretacao Estrategica
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InfoBlock label="Nivel de Consciencia" value={s.nivel_consciencia} />
            <InfoBlock label="Angulo de Venda" value={s.angulo_venda} />
          </div>

          <Separator className="bg-zinc-800/50" />

          <InfoBlock label="Dor Central" value={s.dor_central} />
          <InfoBlock label="Big Idea" value={s.big_idea} />
          <InfoBlock label="Mecanismo Percebido" value={s.mecanismo_percebido} />

          <div className="space-y-2">
            <span className="text-xs font-mono text-zinc-600 uppercase tracking-widest">
              Objecoes Provaveis
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
                <p className="text-zinc-400 text-sm font-medium">Refinar dados do produto</p>
                <p className="text-zinc-600 text-xs mt-0.5">Adicione beneficios, mecanismo e tom para resultados mais precisos</p>
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
              Gerando Variacoes de Anuncios...
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
    if (!ads) return null;
    return (
      <div className="space-y-6 animate-fade-in-up">
        {ads.map((ad, i) => (
          <div
            key={i}
            className="bg-zinc-900/30 border border-zinc-800/50 rounded-md p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <Badge
                variant="outline"
                className="text-zinc-400 border-zinc-800 text-xs font-mono"
              >
                Anuncio #{ad.numero || i + 1}
              </Badge>
              <span className="text-zinc-600 text-xs">{ad.abordagem}</span>
            </div>
            <InfoBlock label="Hook" value={ad.hook} highlight />
            <InfoBlock label="Copy" value={ad.copy} />
            <div className="space-y-1">
              <span className="text-xs font-mono text-zinc-600 uppercase tracking-widest">
                Roteiro UGC
              </span>
              <p className="text-zinc-400 text-xs leading-relaxed whitespace-pre-line">
                {ad.roteiro_ugc}
              </p>
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
              Simulando Reacoes do Publico...
            </>
          ) : (
            <>
              Simular Publico
              <ChevronRight className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    );
  };

  const renderSimulation = () => {
    const sim = data?.audience_simulation?.simulacao;
    if (!sim) return null;
    const profileIcons = {
      "Cético": Eye,
      "Cetico": Eye,
      "Interessado": Target,
      "Impulsivo": Zap,
      "Desconfiado": AlertTriangle,
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
                const avg = Math.round(
                  (r.interesse +
                    r.clareza +
                    r.confianca +
                    r.probabilidade_clique) /
                    4
                );
                return (
                  <div
                    key={j}
                    className="bg-zinc-900/30 border border-zinc-800/50 rounded-md p-4 space-y-3"
                  >
                    <div className="flex items-center gap-2">
                      <Icon
                        className="h-3.5 w-3.5 text-zinc-400"
                        strokeWidth={1.5}
                      />
                      <span className="text-white text-xs font-medium">
                        {r.perfil}
                      </span>
                      <Badge
                        variant="outline"
                        className={`ml-auto text-xs ${
                          avg >= 70
                            ? "text-emerald-400 border-emerald-400/30"
                            : avg >= 40
                            ? "text-amber-400 border-amber-400/30"
                            : "text-red-400 border-red-400/30"
                        }`}
                      >
                        {avg}%
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <ScoreItem label="Interesse" value={r.interesse} />
                      <ScoreItem label="Clareza" value={r.clareza} />
                      <ScoreItem label="Confianca" value={r.confianca} />
                      <ScoreItem label="Clique" value={r.probabilidade_clique} />
                    </div>
                    <p className="text-zinc-500 text-xs italic">
                      &ldquo;{r.comentario}&rdquo;
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        <Button
          data-testid="decide-button"
          onClick={runDecide}
          disabled={loading}
          className="w-full bg-white text-black hover:bg-zinc-200 shadow-[0_0_15px_rgba(255,255,255,0.1)] transition-all duration-300 rounded-sm h-12 font-semibold"
        >
          {loading ? (
            <>
              <Loader2 className="animate-spin mr-2 h-4 w-4" />
              Executando Motor de Decisao...
            </>
          ) : (
            <>
              Decidir Vencedor
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
    return (
      <div className="space-y-8 animate-fade-in-up">
        <div className="text-center py-6">
          <p className="text-xs font-mono uppercase tracking-widest text-zinc-500 mb-4">
            Este e o anuncio com maior probabilidade de funcionar antes do
            trafego.
          </p>
          <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-sm px-4 py-2">
            <Trophy
              className="h-4 w-4 text-amber-400"
              strokeWidth={1.5}
            />
            <span className="text-white font-mono text-sm">
              Anuncio #{d.vencedor?.anuncio_numero} — Pontuacao:{" "}
              {d.vencedor?.pontuacao_final}
            </span>
          </div>
        </div>

        <div className="bg-black/40 backdrop-blur-xl border border-white/10 shadow-[0_0_30px_rgba(255,255,255,0.05)] rounded-md p-8 space-y-6">
          <InfoBlock label="Hook Vencedor" value={d.vencedor?.hook} highlight />
          <Separator className="bg-zinc-800/50" />
          <InfoBlock label="Copy Final" value={d.vencedor?.copy} />
          <Separator className="bg-zinc-800/50" />
          <div className="space-y-1">
            <span className="text-xs font-mono text-zinc-500 uppercase tracking-widest">
              Roteiro UGC
            </span>
            <p className="text-zinc-400 text-xs leading-relaxed whitespace-pre-line">
              {d.vencedor?.roteiro_ugc}
            </p>
          </div>
        </div>

        <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-md p-6 space-y-4">
          <InfoBlock label="Motivo da Escolha" value={d.motivo} />
          <div className="space-y-2">
            <span className="text-xs font-mono text-zinc-500 uppercase tracking-widest">
              Fraquezas Detectadas
            </span>
            <div className="flex flex-wrap gap-2">
              {(d.fraquezas || []).map((f, i) => (
                <Badge
                  key={i}
                  variant="outline"
                  className="text-amber-400 border-amber-400/30 text-xs"
                >
                  {f}
                </Badge>
              ))}
            </div>
          </div>
          <InfoBlock label="Sugestao de Melhoria" value={d.sugestao_melhoria} />
        </div>

        {d.estrutura_lp && (
          <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-md p-6 space-y-4">
            <span className="text-xs font-mono text-zinc-500 uppercase tracking-widest">
              Estrutura de LP Sugerida
            </span>
            <p className="text-white font-medium text-sm">
              {d.estrutura_lp.headline}
            </p>
            <p className="text-zinc-400 text-sm">
              {d.estrutura_lp.subheadline}
            </p>
            <div className="flex flex-wrap gap-2 mt-2">
              {(d.estrutura_lp.secoes || []).map((s, i) => (
                <Badge
                  key={i}
                  variant="outline"
                  className="text-zinc-400 border-zinc-800 text-xs"
                >
                  {s}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {d.publico_compativel && (
          <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-md p-6 space-y-2">
            <span className="text-xs font-mono text-zinc-500 uppercase tracking-widest">
              Publico Mais Compativel
            </span>
            <p className="text-zinc-300 text-sm leading-relaxed">
              {d.publico_compativel}
            </p>
          </div>
        )}

        {d.ranking && (
          <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-md p-6 space-y-3">
            <span className="text-xs font-mono text-zinc-500 uppercase tracking-widest">
              Ranking
            </span>
            {d.ranking.map((r, i) => (
              <div
                key={i}
                className="flex items-center justify-between py-2"
              >
                <span className="text-zinc-400 text-sm">
                  Anuncio #{r.anuncio_numero}
                </span>
                <div className="flex items-center gap-3">
                  <div className="w-32 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-white/80 rounded-full transition-all duration-700"
                      style={{ width: `${r.pontuacao}%` }}
                    />
                  </div>
                  <span className="text-white text-sm font-mono w-12 text-right">
                    {r.pontuacao}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        <Button
          data-testid="back-to-dashboard"
          onClick={() => navigate("/")}
          className="w-full bg-transparent border border-zinc-800 hover:border-zinc-600 text-zinc-300 hover:text-white transition-all duration-300 rounded-sm h-12"
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Voltar ao Painel
        </Button>
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
