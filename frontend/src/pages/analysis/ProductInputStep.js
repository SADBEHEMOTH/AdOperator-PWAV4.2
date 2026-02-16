import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  ChevronRight,
  ShieldCheck,
  ShieldAlert,
  Sparkles,
  Clock,
} from "lucide-react";
import { getRandomExample, PROMISE_CHIPS, TONE_CHIPS, RISKY_TERMS_LOCAL } from "./shared";

export default function ProductInputStep({ product, updateField, mode, setMode, loading, loadingMessage, onSubmit, t }) {
  const fillExample = () => {
    const ex = getRandomExample();
    Object.entries(ex).forEach(([k, v]) => updateField(k, v));
  };

  const complianceWarnings = useMemo(() => {
    const allText = `${product.nome} ${product.promessa_principal} ${product.beneficios} ${product.ingredientes_mecanismo}`.toLowerCase();
    return RISKY_TERMS_LOCAL.filter((term) => allText.includes(term));
  }, [product.nome, product.promessa_principal, product.beneficios, product.ingredientes_mecanismo]);

  return (
    <div className="animate-fade-in-up">
      <div className="flex items-center justify-between mb-6">
        <Tabs value={mode} onValueChange={setMode} className="w-auto">
          <TabsList className="bg-zinc-900/50 border border-zinc-800/50">
            <TabsTrigger value="quick" data-testid="mode-quick" className="text-xs font-mono data-[state=active]:bg-zinc-800 data-[state=active]:text-white">
              {t("flow.quick")}
            </TabsTrigger>
            <TabsTrigger value="complete" data-testid="mode-complete" className="text-xs font-mono data-[state=active]:bg-zinc-800 data-[state=active]:text-white">
              {t("flow.complete")}
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <Button type="button" variant="ghost" size="sm" data-testid="fill-example-button" onClick={fillExample} className="text-zinc-500 hover:text-white text-xs">
          <Sparkles className="h-3.5 w-3.5 mr-1.5" strokeWidth={1.5} />
          {t("flow.fill_example")}
        </Button>
      </div>

      <form onSubmit={onSubmit} className="space-y-6">
        {/* Quick fields */}
        <div className="space-y-2">
          <Label className="text-zinc-400 text-xs uppercase tracking-widest font-mono">{t("flow.product_name")}</Label>
          <Input data-testid="product-name" value={product.nome} onChange={(e) => updateField("nome", e.target.value)} placeholder="Ex: CapilarMax Pro" className="bg-zinc-950/50 border-zinc-800 text-white placeholder:text-zinc-600 focus:border-white/50 focus:ring-0 rounded-sm h-12" required />
        </div>
        <div className="space-y-2">
          <Label className="text-zinc-400 text-xs uppercase tracking-widest font-mono">{t("flow.niche")}</Label>
          <Input data-testid="product-niche" value={product.nicho} onChange={(e) => updateField("nicho", e.target.value)} placeholder="Ex: Saude Capilar" className="bg-zinc-950/50 border-zinc-800 text-white placeholder:text-zinc-600 focus:border-white/50 focus:ring-0 rounded-sm h-12" required />
        </div>
        <div className="space-y-2">
          <Label className="text-zinc-400 text-xs uppercase tracking-widest font-mono">{t("flow.main_promise")}</Label>
          <Textarea data-testid="product-promise" value={product.promessa_principal} onChange={(e) => updateField("promessa_principal", e.target.value)} placeholder="O que o produto promete entregar..." className="bg-zinc-950/50 border-zinc-800 text-white placeholder:text-zinc-600 focus:border-white/50 focus:ring-0 rounded-sm min-h-[80px] resize-none" required />
          <div className="flex flex-wrap gap-1.5 mt-1">
            {PROMISE_CHIPS.map((chip) => (
              <button key={chip} type="button" data-testid={`chip-${chip.replace(/\s/g, "-")}`} onClick={() => updateField("promessa_principal", product.promessa_principal ? `${product.promessa_principal}, ${chip}` : chip)} className="text-xs px-2.5 py-1 rounded-sm bg-zinc-900/50 border border-zinc-800/50 text-zinc-500 hover:text-white hover:border-zinc-600 transition-all duration-200 cursor-pointer">
                {chip}
              </button>
            ))}
          </div>
        </div>

        {/* Extra fields (complete mode) */}
        {mode === "complete" && (
          <>
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
          </>
        )}

        {/* Compliance banner */}
        {complianceWarnings.length > 0 ? (
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
        )}

        <div className="space-y-3">
          <div className="flex items-center justify-center gap-2 text-zinc-600 text-xs">
            <Clock className="h-3 w-3" strokeWidth={1.5} />
            <span>{t("flow.time_estimate")}</span>
          </div>
          <Button data-testid="submit-product" type="submit" disabled={loading} className="w-full bg-white text-black hover:bg-zinc-200 shadow-[0_0_15px_rgba(255,255,255,0.1)] transition-all duration-300 rounded-sm h-12 font-semibold">
            {loading ? (
              <><Loader2 className="animate-spin mr-2 h-4 w-4" />{loadingMessage}</>
            ) : (
              <>Encontrar o melhor anúncio<ChevronRight className="ml-2 h-4 w-4" /></>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
