import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Trophy, Loader2, Crosshair, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function PublicResultPage() {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(null);

  useEffect(() => {
    axios.get(`${API}/public/${token}`)
      .then((res) => { setData(res.data); setLoading(false); })
      .catch(() => { setLoading(false); });
  }, [token]);

  const copyText = (text, label) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    toast.success("Copiado!");
    setTimeout(() => setCopied(null), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#09090b]">
        <Loader2 className="animate-spin text-white h-6 w-6" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#09090b]">
        <div className="text-center">
          <p className="text-zinc-500 text-sm">Analise nao encontrada.</p>
        </div>
      </div>
    );
  }

  if (data.status !== "completed") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#09090b]">
        <div className="text-center">
          <Crosshair className="h-8 w-8 text-zinc-600 mx-auto mb-4" strokeWidth={1.5} />
          <p className="text-zinc-400 text-sm">Analise ainda em andamento.</p>
          <p className="text-zinc-600 text-xs mt-2">O resultado estara disponivel quando a analise for concluida.</p>
        </div>
      </div>
    );
  }

  const d = data.decision;
  const product = data.product;

  return (
    <div className="min-h-screen bg-[#09090b] text-white">
      <div className="noise-overlay" />
      <header className="border-b border-zinc-800/50 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <Crosshair className="h-5 w-5 text-white" strokeWidth={1.5} />
          <span className="text-lg font-bold text-white tracking-tight">AdOperator</span>
          <Badge variant="outline" className="text-zinc-500 border-zinc-800 text-xs font-mono ml-auto">
            Link publico
          </Badge>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12">
        <div className="text-center mb-10 animate-fade-in-up">
          <p className="text-xs font-mono uppercase tracking-widest text-zinc-500 mb-2">{product?.nome}</p>
          <h1 className="text-2xl md:text-3xl font-semibold text-white tracking-tight mb-4">
            Resultado da Analise
          </h1>
          <p className="text-zinc-500 text-sm">
            Anuncio com maior probabilidade de funcionar antes do trafego.
          </p>
        </div>

        {d && (
          <div className="space-y-8 animate-fade-in-up">
            <div className="text-center">
              <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-sm px-4 py-2">
                <Trophy className="h-4 w-4 text-amber-400" strokeWidth={1.5} />
                <span className="text-white font-mono text-sm">
                  Anuncio #{d.vencedor?.anuncio_numero} — Pontuacao: {d.vencedor?.pontuacao_final}
                </span>
              </div>
            </div>

            <div className="bg-black/40 backdrop-blur-xl border border-white/10 shadow-[0_0_30px_rgba(255,255,255,0.05)] rounded-md p-8 space-y-6">
              <div className="flex items-start justify-between">
                <div className="space-y-1 flex-1">
                  <span className="text-xs font-mono text-zinc-500 uppercase tracking-widest">Hook</span>
                  <p className="text-white text-lg font-medium">{d.vencedor?.hook}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  data-testid="copy-hook-public"
                  onClick={() => copyText(d.vencedor?.hook, "hook")}
                  className="text-zinc-500 hover:text-white ml-2"
                >
                  {copied === "hook" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <Separator className="bg-zinc-800/50" />
              <div className="flex items-start justify-between">
                <div className="space-y-1 flex-1">
                  <span className="text-xs font-mono text-zinc-500 uppercase tracking-widest">Copy Final</span>
                  <p className="text-zinc-300 text-sm leading-relaxed">{d.vencedor?.copy}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  data-testid="copy-copy-public"
                  onClick={() => copyText(d.vencedor?.copy, "copy")}
                  className="text-zinc-500 hover:text-white ml-2"
                >
                  {copied === "copy" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <Separator className="bg-zinc-800/50" />
              <div className="space-y-1">
                <span className="text-xs font-mono text-zinc-500 uppercase tracking-widest">Roteiro UGC</span>
                <p className="text-zinc-400 text-xs leading-relaxed whitespace-pre-line">{d.vencedor?.roteiro_ugc}</p>
              </div>
            </div>

            <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-md p-6 space-y-4">
              <div className="space-y-1">
                <span className="text-xs font-mono text-zinc-500 uppercase tracking-widest">Motivo da Escolha</span>
                <p className="text-zinc-300 text-sm leading-relaxed">{d.motivo}</p>
              </div>
            </div>

            {d.publico_compativel && (
              <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-md p-6 space-y-2">
                <span className="text-xs font-mono text-zinc-500 uppercase tracking-widest">Publico Mais Compativel</span>
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
                      <div className="w-32 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                        <div className="h-full bg-white/80 rounded-full" style={{ width: `${r.pontuacao}%` }} />
                      </div>
                      <span className="text-white text-sm font-mono w-12 text-right">{r.pontuacao}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="text-center pt-4">
              <p className="text-zinc-600 text-xs font-mono">
                Gerado por AdOperator — Motor de Decisao para Anuncios
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
