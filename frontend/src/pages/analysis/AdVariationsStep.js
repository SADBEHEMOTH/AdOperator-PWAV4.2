import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { InfoBlock, MetricColor } from "./shared";
import { Loader2, ChevronRight, Target } from "lucide-react";

export default function AdVariationsStep({ data, loading, loadingMessage, onSimulate }) {
  const ads = data?.ad_variations?.anuncios;
  const nota = data?.ad_variations?.nota_experimental;
  if (!ads) return null;

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
              <Badge variant="outline" className="text-white border-zinc-600 text-xs font-mono font-semibold">
                Hipotese {ad.numero || i + 1} — {ad.hipotese || ad.abordagem || ""}
              </Badge>
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
                  {ad.pontos_fortes.map((p, j) => (<p key={j} className="text-zinc-300 text-xs flex items-start gap-1.5"><span className="text-emerald-500 mt-0.5">+</span>{p}</p>))}
                </div>
              )}
              {ad.pontos_fracos && (
                <div className="space-y-1.5">
                  <span className="text-xs font-mono text-amber-500/70 uppercase tracking-widest">Pontos fracos</span>
                  {ad.pontos_fracos.map((p, j) => (<p key={j} className="text-zinc-400 text-xs flex items-start gap-1.5"><span className="text-amber-500 mt-0.5">-</span>{p}</p>))}
                </div>
              )}
            </div>
            {ad.metricas_preditivas && (
              <div className="bg-zinc-950/30 rounded-sm p-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div><span className="text-zinc-600 text-xs block">CTR Est.</span><span className="text-white text-sm font-mono">{ad.metricas_preditivas.ctr_estimado || "—"}</span></div>
                <div><span className="text-zinc-600 text-xs block">Curiosidade</span><span className={`text-sm font-mono ${MetricColor(ad.metricas_preditivas.nivel_curiosidade)}`}>{ad.metricas_preditivas.nivel_curiosidade || "—"}</span></div>
                <div><span className="text-zinc-600 text-xs block">Risco Bloqueio</span><span className={`text-sm font-mono ${ad.metricas_preditivas.risco_bloqueio?.toLowerCase().includes("alto") ? "text-red-400" : ad.metricas_preditivas.risco_bloqueio?.toLowerCase().includes("medio") || ad.metricas_preditivas.risco_bloqueio?.toLowerCase().includes("médio") ? "text-amber-400" : "text-emerald-400"}`}>{ad.metricas_preditivas.risco_bloqueio || "—"}</span></div>
                <div><span className="text-zinc-600 text-xs block">Conversao</span><span className={`text-sm font-mono ${MetricColor(ad.metricas_preditivas.probabilidade_conversao)}`}>{ad.metricas_preditivas.probabilidade_conversao || "—"}</span></div>
              </div>
            )}
          </div>
        </div>
      ))}

      <button data-testid="simulate-button" onClick={onSimulate} disabled={loading} className="w-full bg-white text-black hover:bg-zinc-200 shadow-[0_0_15px_rgba(255,255,255,0.1)] transition-all duration-300 rounded-sm h-12 font-semibold flex items-center justify-center gap-2 disabled:opacity-50">
        {loading ? (<><Loader2 className="animate-spin h-4 w-4" />{loadingMessage}</>) : (<>Rodar simulação<ChevronRight className="h-4 w-4" /></>)}
      </button>
    </div>
  );
}
