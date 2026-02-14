import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Trophy, Loader2 } from "lucide-react";

export default function ResultPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/analyses/${id}`)
      .then((res) => {
        setData(res.data);
        setLoading(false);
      })
      .catch(() => {
        toast.error("Analise nao encontrada");
        navigate("/");
      });
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-white h-6 w-6" />
      </div>
    );
  }

  if (!data) return null;

  if (data.status !== "completed") {
    navigate(`/analysis/new?resume=${id}`);
    return null;
  }

  const d = data.decision;
  const product = data.product;

  return (
    <div className="min-h-screen">
      <header className="border-b border-zinc-800/50 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <button
            data-testid="result-back-button"
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

      <main className="max-w-3xl mx-auto px-6 py-12">
        <div className="text-center mb-10 animate-fade-in-up">
          <p className="text-xs font-mono uppercase tracking-widest text-zinc-500 mb-2">
            {product?.nome}
          </p>
          <h1 className="text-2xl md:text-3xl font-semibold text-white tracking-tight mb-4">
            Resultado da Analise
          </h1>
          <p className="text-zinc-500 text-sm">
            Este e o anuncio com maior probabilidade de funcionar antes do
            trafego.
          </p>
        </div>

        {d && (
          <div className="space-y-8 animate-fade-in-up">
            <div className="text-center">
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
              <div className="space-y-1">
                <span className="text-xs font-mono text-zinc-500 uppercase tracking-widest">
                  Hook
                </span>
                <p className="text-white text-lg font-medium">
                  {d.vencedor?.hook}
                </p>
              </div>
              <Separator className="bg-zinc-800/50" />
              <div className="space-y-1">
                <span className="text-xs font-mono text-zinc-500 uppercase tracking-widest">
                  Copy Final
                </span>
                <p className="text-zinc-300 text-sm leading-relaxed">
                  {d.vencedor?.copy}
                </p>
              </div>
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
              <div className="space-y-1">
                <span className="text-xs font-mono text-zinc-500 uppercase tracking-widest">
                  Motivo da Escolha
                </span>
                <p className="text-zinc-300 text-sm leading-relaxed">
                  {d.motivo}
                </p>
              </div>
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
              <div className="space-y-1">
                <span className="text-xs font-mono text-zinc-500 uppercase tracking-widest">
                  Sugestao de Melhoria
                </span>
                <p className="text-zinc-300 text-sm leading-relaxed">
                  {d.sugestao_melhoria}
                </p>
              </div>
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
                <div className="flex flex-wrap gap-2">
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
                          className="h-full bg-white/80 rounded-full"
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
              data-testid="back-to-dashboard-result"
              onClick={() => navigate("/")}
              className="w-full bg-transparent border border-zinc-800 hover:border-zinc-600 text-zinc-300 hover:text-white transition-all duration-300 rounded-sm h-12"
            >
              <ArrowLeft className="mr-2 h-4 w-4" /> Voltar ao Painel
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
