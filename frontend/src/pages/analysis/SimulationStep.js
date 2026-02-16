import { Loader2, ChevronRight, Eye, Target, Zap, AlertTriangle, Users, Brain } from "lucide-react";

export default function SimulationStep({ data, loading, loadingMessage, onDecide }) {
  const sim = data?.audience_simulation?.simulacao;
  const tendencia = data?.audience_simulation?.tendencia_geral;
  const conflitos = data?.audience_simulation?.conflitos_detectados;
  if (!sim) return null;

  const profileIcons = { "Cético": Eye, "Cetico": Eye, "Interessado": Target, "Impulsivo": Zap, "Desconfiado": AlertTriangle };
  const decisionColors = { "clicar": "text-emerald-400 bg-emerald-400/10", "salvar": "text-blue-400 bg-blue-400/10", "investigar": "text-amber-400 bg-amber-400/10", "ignorar": "text-red-400 bg-red-400/10", "hesitar": "text-amber-400 bg-amber-400/10" };
  const getDecisionStyle = (d) => {
    if (!d) return "text-zinc-400 bg-zinc-800/50";
    const key = Object.keys(decisionColors).find(k => d.toLowerCase().includes(k));
    return key ? decisionColors[key] : "text-zinc-400 bg-zinc-800/50";
  };

  return (
    <div className="space-y-8 animate-fade-in-up">
      {sim.map((adSim, i) => (
        <div key={i} className="space-y-3">
          <span className="text-xs font-mono text-zinc-500 uppercase tracking-widest">Anuncio #{adSim.anuncio_numero}</span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {(adSim.reacoes || []).map((r, j) => {
              const Icon = profileIcons[r.perfil] || Users;
              const avg = Math.round(((r.interesse || 0) + (r.clareza || 0) + (r.confianca || 0) + (r.probabilidade_clique || 0)) / 4);
              return (
                <div key={j} className="bg-zinc-900/30 border border-zinc-800/50 rounded-md p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Icon className="h-3.5 w-3.5 text-zinc-400" strokeWidth={1.5} />
                    <span className="text-white text-xs font-medium">{r.perfil}</span>
                    <span className={`ml-auto text-xs px-2 py-0.5 rounded-sm ${getDecisionStyle(r.decisao_provavel)}`}>{r.decisao_provavel || "—"}</span>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-zinc-700 text-xs font-mono">1a reacao</span>
                    <p className="text-zinc-300 text-sm italic">&ldquo;{r.reacao_emocional || r.comentario || "—"}&rdquo;</p>
                  </div>
                  {r.pensamento_2s && (
                    <div className="space-y-0.5">
                      <span className="text-zinc-700 text-xs font-mono">Apos 2s</span>
                      <p className="text-zinc-400 text-xs">&ldquo;{r.pensamento_2s}&rdquo;</p>
                    </div>
                  )}
                  {r.o_que_faria_clicar && (
                    <div className="bg-zinc-950/30 rounded-sm px-2.5 py-1.5">
                      <span className="text-zinc-600 text-xs">Clicaria se: </span>
                      <span className="text-zinc-300 text-xs">{r.o_que_faria_clicar}</span>
                    </div>
                  )}
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

      {(tendencia || conflitos) && (
        <div className="bg-zinc-900/20 border border-zinc-800/30 rounded-md p-5 space-y-2">
          {tendencia && (<div className="flex items-start gap-2"><Brain className="h-3.5 w-3.5 text-zinc-500 mt-0.5 shrink-0" strokeWidth={1.5} /><p className="text-zinc-300 text-xs"><span className="text-zinc-500">Tendencia geral: </span>{tendencia}</p></div>)}
          {conflitos && (<div className="flex items-start gap-2"><AlertTriangle className="h-3.5 w-3.5 text-amber-500/70 mt-0.5 shrink-0" strokeWidth={1.5} /><p className="text-zinc-400 text-xs"><span className="text-zinc-500">Conflito: </span>{conflitos}</p></div>)}
        </div>
      )}

      <button data-testid="decide-button" onClick={onDecide} disabled={loading} className="w-full bg-white text-black hover:bg-zinc-200 shadow-[0_0_15px_rgba(255,255,255,0.1)] transition-all duration-300 rounded-sm h-12 font-semibold flex items-center justify-center gap-2 disabled:opacity-50">
        {loading ? (<><Loader2 className="animate-spin h-4 w-4" />{loadingMessage}</>) : (<>Rodar motor de decisão<ChevronRight className="h-4 w-4" /></>)}
      </button>
    </div>
  );
}
