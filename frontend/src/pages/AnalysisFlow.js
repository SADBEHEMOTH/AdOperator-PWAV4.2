import { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useLanguage } from "@/context/LanguageContext";
import api from "@/lib/api";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import Stepper from "@/components/Stepper";
import LanguageSelector from "@/components/LanguageSelector";
import { LOADING_STAGES } from "./analysis/shared";
import ProductInputStep from "./analysis/ProductInputStep";
import StrategicAnalysisStep from "./analysis/StrategicAnalysisStep";
import AdVariationsStep from "./analysis/AdVariationsStep";
import SimulationStep from "./analysis/SimulationStep";
import DecisionStep from "./analysis/DecisionStep";

export default function AnalysisFlow() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [analysisId, setAnalysisId] = useState(null);
  const [data, setData] = useState(null);
  const [mode, setMode] = useState("quick");
  const [strategyTable, setStrategyTable] = useState(null);
  const [strategyTableLoading, setStrategyTableLoading] = useState(false);
  const [uploadedMedia, setUploadedMedia] = useState([]);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [product, setProduct] = useState({
    nome: "", nicho: "", publico_alvo: "", promessa_principal: "", beneficios: "", ingredientes_mecanismo: "", tom: "",
  });

  const getStepTitles = () => [t("flow.step1"), t("flow.step2"), t("flow.step3"), t("flow.step4"), t("flow.step5")];
  const getStepDescriptions = () => [t("flow.step1_desc"), t("flow.step2_desc"), t("flow.step3_desc"), t("flow.step4_desc"), t("flow.step5_desc")];

  const loadAnalysis = useCallback(async (id) => {
    try {
      const { data: analysis } = await api.get(`/analyses/${id}`);
      setAnalysisId(id);
      setData(analysis);
      setProduct(analysis.product);
      const statusStep = { created: 0, parsed: 1, generated: 2, simulated: 3, completed: 4 };
      setStep(statusStep[analysis.status] || 0);
      if (analysis.strategy_table) setStrategyTable(analysis.strategy_table);
    } catch {
      toast.error("Analise nao encontrada");
    }
  }, []);

  useEffect(() => {
    const resumeId = searchParams.get("resume");
    if (resumeId) loadAnalysis(resumeId);
  }, [searchParams, loadAnalysis]);

  const startStagedLoading = useCallback((stages) => {
    setLoading(true);
    setLoadingMessage(stages[0]);
    let idx = 0;
    const interval = setInterval(() => { idx = (idx + 1) % stages.length; setLoadingMessage(stages[idx]); }, 3000);
    return () => { clearInterval(interval); setLoadingMessage(""); };
  }, []);

  const updateField = (field, value) => setProduct((prev) => ({ ...prev, [field]: value }));

  // --- API Calls ---
  const handleSubmitProduct = async (e) => {
    e.preventDefault();
    const cleanup = startStagedLoading(LOADING_STAGES.parse);
    try {
      const { data: analysis } = await api.post("/analyses", product);
      setAnalysisId(analysis.id);
      setData(analysis);
      const { data: parseResult } = await api.post(`/analyses/${analysis.id}/parse`);
      setData((prev) => ({ ...prev, strategic_analysis: parseResult, status: "parsed" }));
      setStep(1);
    } catch (err) {
      toast.error(err.response?.data?.detail || t("flow.error_create"));
    } finally { cleanup(); setLoading(false); }
  };

  const runGenerate = async () => {
    const cleanup = startStagedLoading(LOADING_STAGES.generate);
    try {
      const { data: result } = await api.post(`/analyses/${analysisId}/generate`);
      setData((prev) => ({ ...prev, ad_variations: result, status: "generated" }));
      setStep(2);
    } catch (err) { toast.error(err.response?.data?.detail || t("flow.error_generate")); }
    finally { cleanup(); setLoading(false); }
  };

  const runSimulate = async () => {
    const cleanup = startStagedLoading(LOADING_STAGES.simulate);
    try {
      const { data: result } = await api.post(`/analyses/${analysisId}/simulate`);
      setData((prev) => ({ ...prev, audience_simulation: result, status: "simulated" }));
      setStep(3);
    } catch (err) { toast.error(err.response?.data?.detail || t("flow.error_simulate")); }
    finally { cleanup(); setLoading(false); }
  };

  const runDecide = async () => {
    const cleanup = startStagedLoading(LOADING_STAGES.decide);
    try {
      const { data: result } = await api.post(`/analyses/${analysisId}/decide`);
      setData((prev) => ({ ...prev, decision: result, status: "completed" }));
      setStep(4);
    } catch (err) { toast.error(err.response?.data?.detail || t("dec.error_decide")); }
    finally { cleanup(); setLoading(false); }
  };

  const handleRefineAndGenerate = async () => {
    if (analysisId) { try { await api.patch(`/analyses/${analysisId}/product`, product); } catch { /* continue */ } }
    runGenerate();
  };

  const loadStrategyTable = async () => {
    if (!analysisId) return;
    setStrategyTableLoading(true);
    try {
      const { data: result } = await api.post(`/analyses/${analysisId}/strategy-table`);
      setStrategyTable(result);
    } catch (err) { toast.error(err.response?.data?.detail || "Erro ao gerar tabela estratégica"); }
    finally { setStrategyTableLoading(false); }
  };

  const handleMediaUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingMedia(true);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const { data: result } = await api.post("/media/upload", formData, { headers: { "Content-Type": "multipart/form-data" } });
      setUploadedMedia((prev) => [...prev, { ...result, original_name: file.name }]);
      toast.success("Mídia enviada!");
    } catch (err) { toast.error(err.response?.data?.detail || "Erro ao enviar mídia"); }
    finally { setUploadingMedia(false); e.target.value = ""; }
  };

  const handleShare = async () => {
    try {
      const { data: shareData } = await api.post(`/analyses/${analysisId}/share`);
      const url = `${window.location.origin}/public/${shareData.public_token}`;
      await navigator.clipboard.writeText(url);
      toast.success(t("dec.share_copied"));
    } catch { toast.error(t("dec.share_error")); }
  };

  const handleImprove = async () => {
    try {
      const { data: newAnalysis } = await api.post(`/analyses/${analysisId}/improve`);
      navigate(`/analysis/new?resume=${newAnalysis.id}`);
      window.location.reload();
    } catch (err) { toast.error(err.response?.data?.detail || t("dec.improve_error")); }
  };

  // --- Render ---
  const STEP_TITLES = getStepTitles();
  const STEP_DESCRIPTIONS = getStepDescriptions();

  const renderStep = () => {
    switch (step) {
      case 0:
        return <ProductInputStep product={product} updateField={updateField} mode={mode} setMode={setMode} loading={loading} loadingMessage={loadingMessage} onSubmit={handleSubmitProduct} t={t} />;
      case 1:
        return <StrategicAnalysisStep data={data} product={product} updateField={updateField} mode={mode} strategyTable={strategyTable} strategyTableLoading={strategyTableLoading} onLoadStrategyTable={loadStrategyTable} uploadedMedia={uploadedMedia} uploadingMedia={uploadingMedia} onMediaUpload={handleMediaUpload} loading={loading} loadingMessage={loadingMessage} onGenerate={runGenerate} onRefineAndGenerate={handleRefineAndGenerate} t={t} />;
      case 2:
        return <AdVariationsStep data={data} loading={loading} loadingMessage={loadingMessage} onSimulate={runSimulate} />;
      case 3:
        return <SimulationStep data={data} loading={loading} loadingMessage={loadingMessage} onDecide={runDecide} />;
      case 4:
        return <DecisionStep data={data} analysisId={analysisId} onShare={handleShare} onImprove={handleImprove} t={t} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen">
      <header className="border-b border-zinc-800/50 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <button data-testid="back-button" onClick={() => navigate("/")} className="flex items-center gap-2 text-zinc-500 hover:text-white transition-colors">
            <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
            <span className="text-sm">{t("flow.back")}</span>
          </button>
          <div className="flex items-center gap-3">
            <LanguageSelector />
            <span className="text-sm font-semibold text-white">AdOperator</span>
          </div>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-6 py-8">
        <Stepper currentStep={step} />
        <div className="mb-8">
          <h2 className="text-2xl md:text-3xl font-semibold text-white tracking-tight">{STEP_TITLES[step]}</h2>
          <p className="text-zinc-500 text-sm mt-1">{STEP_DESCRIPTIONS[step]}</p>
        </div>
        {renderStep()}
      </main>
    </div>
  );
}
