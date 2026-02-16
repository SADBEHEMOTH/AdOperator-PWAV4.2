import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { InfoBlock } from "./shared";
import {
  Trophy,
  Copy,
  Check,
  Share2,
  Palette,
  BarChart3,
  Search as SearchIcon,
} from "lucide-react";

export default function DecisionStep({ data, analysisId, onShare, onImprove, t }) {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(null);
  const d = data?.decision;
  if (!d) return null;

  const v = d.veredito || d.vencedor || {};
  const hook = v.hook || "";
  const copy = v.copy || "";
  const ugc = v.roteiro_ugc || "";
  const num = v.anuncio_numero;
  const score = v.pontuacao_final;
  const frasePrincipal = v.frase_principal || d.motivo || "";
  const explicacao = v.explicacao_causal || d.motivo || "";

  const copyText = (text, label) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    toast.success(t("dec.copied"));
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="space-y-8 animate-fade-in-up">
      <div className="text-center py-8">
        <p className="text-xs font-mono uppercase tracking-widest text-zinc-600 mb-6">Veredito do Motor de Decisao</p>
        <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight mb-4">Anuncio Escolhido: Variacao {num}</h2>
        <p className="text-zinc-300 text-sm max-w-lg mx-auto">{frasePrincipal}</p>
        {score && (
          <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-sm px-4 py-2 mt-4">
            <Trophy className="h-4 w-4 text-amber-400" strokeWidth={1.5} />
            <span className="text-white font-mono text-sm">Pontuacao: {score}</span>
          </div>
        )}
      </div>

      <div className="bg-zinc-900/20 border-l-2 border-white/20 pl-5 py-3">
        <p className="text-zinc-300 text-sm leading-relaxed">{explicacao}</p>
      </div>

      {d.consequencias_outras && d.consequencias_outras.length > 0 && (
        <div className="bg-red-500/5 border border-red-500/10 rounded-md p-5 space-y-2">
          <span className="text-xs font-mono text-red-400/70 uppercase tracking-widest">Consequencia de escolher errado</span>
          {d.consequencias_outras.map((c, i) => (
            <p key={i} className="text-zinc-400 text-xs"><span className="text-red-400">Variacao {c.anuncio_numero}:</span> {c.consequencia}</p>
          ))}
        </div>
      )}

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

      {d.investimento_recomendacao && (
        <div className="bg-emerald-500/5 border border-emerald-500/15 rounded-md p-5">
          <span className="text-xs font-mono text-emerald-400/70 uppercase tracking-widest block mb-2">Se estivesse investindo R$2.000</span>
          <p className="text-zinc-300 text-sm">{d.investimento_recomendacao}</p>
        </div>
      )}

      {d.proximo_passo && (
        <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-md p-5">
          <span className="text-xs font-mono text-zinc-500 uppercase tracking-widest block mb-2">Proximo passo recomendado</span>
          <p className="text-white text-sm font-medium">{d.proximo_passo.acao}</p>
          <p className="text-zinc-500 text-xs mt-1">Motivo: {d.proximo_passo.motivo}</p>
        </div>
      )}

      <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-md p-6 space-y-4">
        <div className="space-y-2">
          <span className="text-xs font-mono text-zinc-500 uppercase tracking-widest">Fraquezas detectadas</span>
          <div className="flex flex-wrap gap-2">
            {(d.fraquezas || []).map((f, i) => (<Badge key={i} variant="outline" className="text-amber-400 border-amber-400/30 text-xs">{f}</Badge>))}
          </div>
        </div>
        <InfoBlock label="Sugestao de melhoria" value={d.sugestao_melhoria} />
      </div>

      {d.estrutura_lp && (
        <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-md p-6 space-y-3">
          <span className="text-xs font-mono text-zinc-500 uppercase tracking-widest">Estrutura de LP sugerida</span>
          <p className="text-white font-medium text-sm">{d.estrutura_lp.headline}</p>
          <p className="text-zinc-400 text-sm">{d.estrutura_lp.subheadline}</p>
          <div className="flex flex-wrap gap-2 mt-2">
            {(d.estrutura_lp.secoes || []).map((s, i) => (<Badge key={i} variant="outline" className="text-zinc-400 border-zinc-800 text-xs">{s}</Badge>))}
          </div>
        </div>
      )}

      {d.publico_compativel && (
        <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-md p-6 space-y-2">
          <span className="text-xs font-mono text-zinc-500 uppercase tracking-widest">Publico mais compativel</span>
          <p className="text-zinc-300 text-sm leading-relaxed">{d.publico_compativel}</p>
        </div>
      )}

      {d.ranking && (
        <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-md p-6 space-y-3">
          <span className="text-xs font-mono text-zinc-500 uppercase tracking-widest">Ranking</span>
          {d.ranking.map((r, i) => (
            <div key={i} className="flex items-center justify-between py-2">
              <span className="text-zinc-400 text-sm">Anuncio #{r.anuncio_numero}</span>
              <div className="flex items-center gap-3">
                <div className="w-32 h-1.5 bg-zinc-800 rounded-full overflow-hidden"><div className="h-full bg-white/80 rounded-full transition-all duration-700" style={{ width: `${r.pontuacao}%` }} /></div>
                <span className="text-white text-sm font-mono w-12 text-right">{r.pontuacao}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="text-center py-2"><p className="text-zinc-600 text-xs italic">{t("dec.loop_msg")}</p></div>

      <div className="space-y-3">
        <Button data-testid="use-this-ad" onClick={onShare} className="w-full bg-white text-black hover:bg-zinc-200 shadow-[0_0_15px_rgba(255,255,255,0.1)] transition-all duration-300 rounded-sm h-12 font-semibold">
          <Share2 className="mr-2 h-4 w-4" /> {t("dec.use_ad")}
        </Button>
        <div className="grid grid-cols-2 gap-3">
          <Button data-testid="improve-ad" onClick={onImprove} variant="outline" className="border-zinc-800 hover:border-zinc-600 text-zinc-300 hover:text-white transition-all duration-300 rounded-sm h-11">{t("dec.improve")}</Button>
          <Button data-testid="generate-creative-from-decision" onClick={() => navigate(`/analysis/${analysisId}/creative`)} variant="outline" className="border-zinc-800 hover:border-zinc-600 text-zinc-300 hover:text-white transition-all duration-300 rounded-sm h-11">
            <Palette className="mr-1.5 h-3.5 w-3.5" strokeWidth={1.5} /> Gerar Criativo
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Button data-testid="compare-market-from-decision" onClick={() => navigate(`/analysis/${analysisId}/market`)} variant="outline" className="border-zinc-800 hover:border-zinc-600 text-zinc-300 hover:text-white transition-all duration-300 rounded-sm h-11 text-xs">
            <BarChart3 className="mr-1.5 h-3.5 w-3.5" strokeWidth={1.5} /> {t("panel.compare_market")}
          </Button>
          <Button data-testid="analyze-competitor-from-decision" onClick={() => navigate("/competitor")} variant="outline" className="border-zinc-800 hover:border-zinc-600 text-zinc-300 hover:text-white transition-all duration-300 rounded-sm h-11 text-xs">
            <SearchIcon className="mr-1.5 h-3.5 w-3.5" strokeWidth={1.5} /> {t("panel.analyze_competitor")}
          </Button>
        </div>
        {(d.melhorias_possiveis || []).length > 0 && (
          <div className="space-y-2 pt-2">
            <span className="text-xs font-mono text-zinc-600 uppercase tracking-widest block">{t("dec.next_tests")}</span>
            <div className="flex flex-wrap gap-2">
              {d.melhorias_possiveis.map((m, i) => (
                <button key={i} data-testid={`improvement-${i}`} onClick={onImprove} className="text-xs px-3 py-1.5 rounded-sm bg-zinc-900/50 border border-zinc-800/50 text-zinc-400 hover:text-white hover:border-zinc-600 transition-all duration-200 cursor-pointer">{m}</button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
