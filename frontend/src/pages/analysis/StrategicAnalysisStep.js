import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { InfoBlock, TONE_CHIPS } from "./shared";
import {
  Loader2,
  ChevronRight,
  Brain,
  Users,
  ShieldAlert,
  Upload,
} from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";

export default function StrategicAnalysisStep({
  data, product, updateField, mode,
  strategyTable, strategyTableLoading, onLoadStrategyTable,
  uploadedMedia, uploadingMedia, onMediaUpload,
  loading, loadingMessage, onGenerate, onRefineAndGenerate,
  t,
}) {
  const [showRefinement, setShowRefinement] = useState(false);
  const s = data?.strategic_analysis;
  if (!s) return null;
  const compliance = s.compliance;

  return (
    <div className="space-y-6 animate-fade-in-up">
      {compliance && compliance.total_riscos > 0 && (
        <div className="bg-amber-500/5 border border-amber-500/20 rounded-md p-5 space-y-3">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-amber-400" strokeWidth={1.5} />
            <span className="text-amber-400 text-xs font-mono uppercase tracking-widest">Compliance Score: {compliance.score}/100</span>
          </div>
          <div className="space-y-2">
            {compliance.riscos.map((r, i) => (
              <div key={i} className="flex items-start gap-2 text-xs">
                <Badge variant="outline" className={`shrink-0 ${r.severidade === "alta" ? "text-red-400 border-red-400/30" : "text-amber-400 border-amber-400/30"}`}>{r.termo}</Badge>
                <span className="text-zinc-400">{r.sugestao}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-md p-6 space-y-5">
        <div className="flex items-center gap-2 mb-2">
          <Brain className="h-4 w-4 text-white" strokeWidth={1.5} />
          <span className="text-xs font-mono uppercase tracking-widest text-zinc-400">{t("strategy.title")}</span>
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
          <span className="text-xs font-mono text-zinc-600 uppercase tracking-widest">{t("strategy.objections")}</span>
          <div className="flex flex-wrap gap-2">
            {(s.objecoes || []).map((obj, i) => (
              <Badge key={i} variant="outline" className="text-zinc-400 border-zinc-800 text-xs">{obj}</Badge>
            ))}
          </div>
        </div>
      </div>

      {/* Refinement toggle */}
      {mode === "quick" && !showRefinement && (
        <button data-testid="show-refinement-button" onClick={() => setShowRefinement(true)} className="w-full text-left bg-zinc-900/20 border border-dashed border-zinc-800/50 rounded-md p-4 hover:border-zinc-700 transition-all duration-300 group">
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
            <span className="text-xs font-mono uppercase tracking-widest text-zinc-400">{t("flow.additional_data")}</span>
            <button onClick={() => setShowRefinement(false)} className="text-zinc-600 hover:text-white text-xs transition-colors">{t("flow.close")}</button>
          </div>
          <div className="space-y-2">
            <Label className="text-zinc-400 text-xs uppercase tracking-widest font-mono">{t("flow.audience")} <span className="text-zinc-700">{t("flow.optional")}</span></Label>
            <Input data-testid="product-audience" value={product.publico_alvo} onChange={(e) => updateField("publico_alvo", e.target.value)} placeholder="Ex: Homens 30-50 anos" className="bg-zinc-950/50 border-zinc-800 text-white placeholder:text-zinc-600 focus:border-white/50 focus:ring-0 rounded-sm h-12" />
          </div>
          <div className="space-y-2">
            <Label className="text-zinc-400 text-xs uppercase tracking-widest font-mono">{t("flow.benefits")} <span className="text-zinc-700">{t("flow.optional")}</span></Label>
            <Textarea data-testid="product-benefits" value={product.beneficios} onChange={(e) => updateField("beneficios", e.target.value)} placeholder="Liste os principais beneficios..." className="bg-zinc-950/50 border-zinc-800 text-white placeholder:text-zinc-600 focus:border-white/50 focus:ring-0 rounded-sm min-h-[80px] resize-none" />
          </div>
          <div className="space-y-2">
            <Label className="text-zinc-400 text-xs uppercase tracking-widest font-mono">{t("flow.mechanism")} <span className="text-zinc-700">{t("flow.optional")}</span></Label>
            <Textarea data-testid="product-mechanism" value={product.ingredientes_mecanismo} onChange={(e) => updateField("ingredientes_mecanismo", e.target.value)} placeholder="Como funciona ou o que contem..." className="bg-zinc-950/50 border-zinc-800 text-white placeholder:text-zinc-600 focus:border-white/50 focus:ring-0 rounded-sm min-h-[80px] resize-none" />
          </div>
          <div className="space-y-2">
            <Label className="text-zinc-400 text-xs uppercase tracking-widest font-mono">{t("flow.tone")} <span className="text-zinc-700">{t("flow.optional")}</span></Label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {TONE_CHIPS.map((chip) => (
                <button key={chip} type="button" data-testid={`tone-chip-${chip}`} onClick={() => updateField("tom", chip)} className={`text-xs px-2.5 py-1 rounded-sm border transition-all duration-200 cursor-pointer ${product.tom === chip ? "bg-white/10 border-white/30 text-white" : "bg-zinc-900/50 border-zinc-800/50 text-zinc-500 hover:text-white hover:border-zinc-600"}`}>
                  {chip}
                </button>
              ))}
            </div>
            <Select value={product.tom} onValueChange={(v) => updateField("tom", v)}>
              <SelectTrigger data-testid="product-tone" className="bg-zinc-950/50 border-zinc-800 text-white rounded-sm h-12"><SelectValue placeholder="Ou selecione aqui" /></SelectTrigger>
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
        </div>
      )}

      {/* Strategy Table */}
      {strategyTable && (
        <div className="bg-zinc-900/20 border border-zinc-800/30 rounded-md p-3 sm:p-6 space-y-4 sm:space-y-5 animate-fade-in-up overflow-x-auto" data-testid="strategy-table">
          <div className="flex items-center gap-2 mb-2">
            <Users className="h-4 w-4 text-white" strokeWidth={1.5} />
            <span className="text-xs font-mono uppercase tracking-widest text-zinc-400">Estratégia por Perfil de Público</span>
          </div>
          <div className="space-y-4">
            {(strategyTable.perfis || []).map((p, i) => (
              <div key={i} className="bg-zinc-950/30 rounded-sm p-3 sm:p-4 space-y-3 border border-zinc-800/30 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm">{p.emoji}</span>
                  <span className="text-white text-sm font-medium">{p.nome}</span>
                  <Badge variant="outline" className="text-zinc-500 border-zinc-800 text-xs sm:ml-auto">{p.hook_recomendado}</Badge>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="min-w-0"><span className="text-zinc-600 block mb-0.5">Abordagem</span><span className="text-zinc-300 break-words">{p.abordagem}</span></div>
                  <div className="min-w-0"><span className="text-zinc-600 block mb-0.5">Motivação</span><span className="text-zinc-300 break-words">{p.motivacao}</span></div>
                </div>
                <div className="text-xs min-w-0"><span className="text-zinc-600 block mb-0.5">Roteiro</span><span className="text-zinc-400 break-words">{p.roteiro}</span></div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="min-w-0"><span className="text-emerald-400/60 block mb-0.5">Pontos fortes</span>{(p.pontos_fortes || []).map((pf, j) => (<span key={j} className="text-zinc-400 block break-words">+ {pf}</span>))}</div>
                  <div className="min-w-0"><span className="text-amber-400/60 block mb-0.5">Pontos fracos</span>{(p.pontos_fracos || []).map((pf, j) => (<span key={j} className="text-zinc-500 block break-words">- {pf}</span>))}</div>
                </div>
              </div>
            ))}
          </div>
          {strategyTable.recomendacao_geral && (
            <div className="bg-white/5 border border-white/10 rounded-sm p-3"><span className="text-white text-xs font-medium break-words">{strategyTable.recomendacao_geral}</span></div>
          )}
        </div>
      )}

      {!strategyTable && !strategyTableLoading && (
        <Button data-testid="generate-strategy-table" onClick={onLoadStrategyTable} variant="outline" className="w-full border-dashed border-zinc-800 hover:border-zinc-600 text-zinc-400 hover:text-white transition-all duration-300 rounded-sm h-11 text-xs">
          <Users className="mr-1.5 h-3.5 w-3.5" strokeWidth={1.5} />
          Gerar tabela comparativa por perfil de público
        </Button>
      )}

      {strategyTableLoading && (
        <div className="flex items-center justify-center gap-2 text-zinc-500 text-xs py-3 animate-pulse">
          <Loader2 className="animate-spin h-3 w-3" /> Gerando estratégia por perfil...
        </div>
      )}

      {/* Media Upload */}
      <div className="bg-zinc-900/20 border border-dashed border-zinc-800/50 rounded-md p-5" data-testid="media-upload-section">
        <div className="flex items-center gap-2 mb-3">
          <Upload className="h-4 w-4 text-zinc-500" strokeWidth={1.5} />
          <span className="text-xs font-mono uppercase tracking-widest text-zinc-500">Mídia do Produto</span>
          <span className="text-zinc-700 text-xs">(opcional)</span>
        </div>
        {uploadedMedia.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {uploadedMedia.map((m) => (
              <div key={m.id} className="bg-zinc-950/50 border border-zinc-800 rounded-sm px-2 py-1 text-xs text-zinc-400 flex items-center gap-1">
                {m.type === "image" ? <span>IMG</span> : <span>VID</span>}
                <span className="truncate max-w-[120px]">{m.original_name}</span>
              </div>
            ))}
          </div>
        )}
        <label className="flex items-center justify-center gap-2 border border-zinc-800 rounded-sm py-3 cursor-pointer text-zinc-500 hover:text-white hover:border-zinc-600 transition-all text-xs">
          {uploadingMedia ? (<><Loader2 className="animate-spin h-3 w-3" /> Enviando...</>) : (<><Upload className="h-3.5 w-3.5" strokeWidth={1.5} /> Enviar imagem ou vídeo</>)}
          <input data-testid="media-file-input" type="file" accept="image/*,video/*" className="hidden" onChange={onMediaUpload} disabled={uploadingMedia} />
        </label>
        <p className="text-zinc-700 text-xs mt-2">Imagens até 20MB, vídeos até 100MB</p>
      </div>

      <Button data-testid="generate-ads-button" onClick={showRefinement ? onRefineAndGenerate : onGenerate} disabled={loading} className="w-full bg-white text-black hover:bg-zinc-200 shadow-[0_0_15px_rgba(255,255,255,0.1)] transition-all duration-300 rounded-sm h-12 font-semibold">
        {loading ? (<><Loader2 className="animate-spin mr-2 h-4 w-4" />{loadingMessage}</>) : (<>Escolher o anúncio vencedor<ChevronRight className="ml-2 h-4 w-4" /></>)}
      </Button>
    </div>
  );
}
