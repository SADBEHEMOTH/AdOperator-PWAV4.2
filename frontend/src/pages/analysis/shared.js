import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

export function InfoBlock({ label, value, highlight = false }) {
  return (
    <div className="space-y-1">
      <span className="text-xs font-mono text-zinc-600 uppercase tracking-widest">{label}</span>
      <p className={`text-sm leading-relaxed ${highlight ? "text-white font-medium" : "text-zinc-300"}`}>
        {value}
      </p>
    </div>
  );
}

export function MetricColor(val) {
  if (!val) return "text-zinc-400";
  const v = val.toLowerCase();
  if (v.includes("alto") || v.includes("alta")) return "text-emerald-400";
  if (v.includes("médio") || v.includes("média") || v.includes("medio") || v.includes("media")) return "text-amber-400";
  return "text-zinc-400";
}

export function LoadingButton({ loading, loadingMessage, label, onClick, disabled, testId }) {
  return (
    <button
      data-testid={testId}
      onClick={onClick}
      disabled={disabled || loading}
      className="w-full bg-white text-black hover:bg-zinc-200 shadow-[0_0_15px_rgba(255,255,255,0.1)] transition-all duration-300 rounded-sm h-12 font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
    >
      {loading ? (
        <>
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
          {loadingMessage}
        </>
      ) : (
        <>
          {label}
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
        </>
      )}
    </button>
  );
}

export const NICHE_EXAMPLES = [
  { nome: "CapilarMax Pro", nicho: "Saude Capilar", promessa_principal: "Reduzir a queda de cabelo em ate 60% nos primeiros 90 dias", publico_alvo: "Homens de 25-55 anos que sofrem com queda de cabelo", beneficios: "Fortalece os fios, estimula o crescimento, reduz a oleosidade do couro cabeludo, resultados visiveis em 30 dias", ingredientes_mecanismo: "Complexo de biotina + zinco + saw palmetto que atua bloqueando o DHT no foliculo capilar", tom: "cientifico" },
  { nome: "VitaForce Homem", nicho: "Masculino", promessa_principal: "Recuperar a disposição e performance que você tinha aos 25 anos", publico_alvo: "Homens 35-60 anos com queda de energia e libido", beneficios: "Mais energia no dia a dia, melhora da performance física, aumento da disposição, recuperação muscular acelerada", ingredientes_mecanismo: "Blend de tribulus terrestris + maca peruana + boro quelado que otimiza a produção natural de testosterona", tom: "direto" },
  { nome: "SlimBurn 360", nicho: "Emagrecimento", promessa_principal: "Acelerar o metabolismo para queimar gordura localizada sem dietas restritivas", publico_alvo: "Mulheres e homens 25-50 que querem perder peso sem academia", beneficios: "Reduz medidas abdominais, controla a fome, aumenta a termogênese, reduz inchaço", ingredientes_mecanismo: "Morosil + cromo picolinato + spirulina que ativa a lipólise e reduz absorção de gordura", tom: "urgente" },
  { nome: "ArticuFlex Plus", nicho: "Dores", promessa_principal: "Aliviar dores articulares crônicas e devolver a mobilidade em 15 dias", publico_alvo: "Pessoas 45+ com dores nos joelhos, costas ou articulações", beneficios: "Alívio de dor progressivo, regenera cartilagem, reduz inflamação, melhora mobilidade", ingredientes_mecanismo: "UC-II (colágeno tipo 2 não desnaturado) + cúrcuma longa + MSM que regenera a cartilagem e reduz inflamação", tom: "humano" },
  { nome: "CinturaShape Modeladora", nicho: "Feminino", promessa_principal: "Afinar a cintura e modelar a silhueta com conforto durante todo o dia", publico_alvo: "Mulheres 20-45 que querem efeito visual imediato no corpo", beneficios: "Redução visual de 2 medidas na cintura, corrige postura, comprime sem desconforto, invisível sob a roupa", ingredientes_mecanismo: "Tecido de compressão graduada com infravermelho longo que estimula a microcirculação e reduz retenção de líquidos", tom: "premium" },
  { nome: "VisionClear HD", nicho: "Visao", promessa_principal: "Proteger e melhorar a saúde dos olhos contra telas e envelhecimento", publico_alvo: "Pessoas 30-65 que usam telas por muitas horas ou sentem a visão cansada", beneficios: "Reduz fadiga ocular, protege contra luz azul, melhora visão noturna, previne degeneração macular", ingredientes_mecanismo: "Luteína + zeaxantina + astaxantina que filtra luz azul e regenera as células da retina", tom: "cientifico" },
  { nome: "DeepSleep Restore", nicho: "Sono", promessa_principal: "Dormir profundamente em 20 minutos e acordar com energia total", publico_alvo: "Adultos 25-60 com insônia ou sono de má qualidade", beneficios: "Induz sono natural, aumenta fase REM, elimina despertar noturno, sem dependência", ingredientes_mecanismo: "Melatonina de liberação prolongada + L-teanina + magnésio bisglicinato que sincroniza o ciclo circadiano", tom: "humano" },
  { nome: "ImunoPower Multi", nicho: "Suplemento Vitaminico", promessa_principal: "Blindar a imunidade e acabar com gripes frequentes de uma vez", publico_alvo: "Pessoas de todas as idades que ficam doentes com frequência ou querem prevenir", beneficios: "Fortalece defesas naturais, reduz frequência de gripes, mais energia, pele e cabelo saudáveis", ingredientes_mecanismo: "Complexo de vitamina C + D3 + zinco quelado + selênio que ativa as células NK e fortalece a barreira imunológica", tom: "direto" },
];

export const getRandomExample = () => NICHE_EXAMPLES[Math.floor(Math.random() * NICHE_EXAMPLES.length)];

export const PROMISE_CHIPS = ["reduzir queda", "aumentar densidade", "engrossar fios", "acelerar crescimento", "eliminar dor", "mais energia", "emagrecer rapido"];
export const TONE_CHIPS = ["agressivo", "cientifico", "humano", "premium", "urgente", "provocativo"];
export const RISKY_TERMS_LOCAL = ["cura", "curar", "100%", "garantido", "milagroso", "elimina", "remove", "definitivo", "nunca mais", "para sempre", "sem efeitos colaterais"];

export const LOADING_STAGES = {
  parse: ["Interpretando produto...", "Analisando nivel de consciencia...", "Mapeando objecoes..."],
  generate: ["Construindo hipotese A...", "Diversificando estrutura...", "Calibrando metricas preditivas..."],
  simulate: ["Simulando reacao de publico...", "Avaliando resistencia a mensagem...", "Calculando probabilidade de clique...", "Detectando conflitos entre perfis..."],
  decide: ["Processando dados de simulacao...", "Comparando performance relativa...", "Calculando consequencias de cada escolha...", "Assumindo responsabilidade pela decisao..."],
};
