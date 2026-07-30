import { ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight, Info, Minus } from "lucide-react";
import {
  Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";

/** Paleta única de toda a plataforma */
export const CHART_COLORS = {
  primary: "hsl(var(--primary))",
  positive: "hsl(var(--success))",
  negative: "hsl(var(--destructive))",
  neutral: "hsl(var(--info))",
  warning: "hsl(var(--warning))",
};

export const CHART_SERIES = [
  "hsl(var(--primary))",
  "hsl(var(--info))",
  "hsl(var(--warning))",
  "hsl(var(--destructive))",
  "hsl(var(--success))",
];

export function pctChange(current: number, previous: number): number | null {
  if (!previous) return null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

/** Frase simples de variação: "15% acima do mês passado" */
export function trendSentence(
  current: number,
  previous: number,
  opts: { unit?: string; noun?: string } = {}
): string {
  const noun = opts.noun ?? "o resultado";
  if (!previous && !current) return `Sem dados suficientes para comparar com o mês passado.`;
  if (!previous) return `Primeiro mês com registro de ${noun}. Vamos usar este mês como base de comparação.`;
  const diff = current - previous;
  const pct = Math.abs((diff / Math.abs(previous)) * 100);
  if (pct < 1) return `${cap(noun)} ficou praticamente igual ao mês passado.`;
  return `${cap(noun)} ficou ${pct.toFixed(0)}% ${diff > 0 ? "acima" : "abaixo"} do mês passado.`;
}

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

interface TrendBadgeProps {
  current: number;
  previous: number;
  /** true quando cair é bom (ex.: custos) */
  invert?: boolean;
  hidden?: boolean;
}

export function TrendBadge({ current, previous, invert, hidden }: TrendBadgeProps) {
  if (hidden) return null;
  const pct = pctChange(current, previous);
  if (pct === null) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
        <Minus className="h-3 w-3" /> novo
      </span>
    );
  }
  const up = pct >= 0;
  const good = invert ? !up : up;
  const flat = Math.abs(pct) < 1;
  const tone = flat
    ? "bg-muted text-muted-foreground"
    : good
    ? "bg-success/15 text-success"
    : "bg-destructive/15 text-destructive";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${tone}`}>
      {flat ? <Minus className="h-3 w-3" /> : up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
      {flat ? "estável" : `${Math.abs(pct).toFixed(0)}%`}
    </span>
  );
}

/** Texto de interpretação automática abaixo do gráfico */
export function ChartInsight({ children }: { children: ReactNode }) {
  if (!children) return null;
  return (
    <div className="mt-4 flex items-start gap-2 rounded-lg border border-border/60 bg-secondary/40 p-3 text-xs leading-relaxed text-muted-foreground">
      <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
      <span>{children}</span>
    </div>
  );
}

interface ChartCardProps {
  title: string;
  subtitle?: string;
  badge?: ReactNode;
  insight?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function ChartCard({ title, subtitle, badge, insight, children, className = "" }: ChartCardProps) {
  return (
    <div className={`rounded-xl border border-border bg-card p-4 sm:p-5 ${className}`}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-display text-base font-bold sm:text-lg">{title}</h3>
          {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        {badge && <div className="shrink-0">{badge}</div>}
      </div>
      {children}
      <ChartInsight>{insight}</ChartInsight>
    </div>
  );
}

const tooltipStyle = {
  background: "hsl(var(--popover))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "10px",
  color: "hsl(var(--foreground))",
  fontSize: "12px",
  padding: "8px 10px",
};

interface SimpleChartProps {
  data: any[];
  xKey: string;
  valueKey: string;
  label: string;
  format?: (v: number) => string;
  color?: string;
  height?: number;
}

/** Gráfico de barras com UMA única métrica */
export function SimpleBarChart({
  data, xKey, valueKey, label, format = (v) => String(v), color = CHART_COLORS.primary, height = 220,
}: SimpleChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 4, right: 4, left: -18, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
        <XAxis dataKey={xKey} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={52}
          tickFormatter={(v) => format(Number(v))} />
        <Tooltip
          contentStyle={tooltipStyle}
          cursor={{ fill: "hsl(var(--muted) / 0.25)" }}
          formatter={(v: any) => [format(Number(v)), label]}
        />
        <Bar dataKey={valueKey} fill={color} radius={[6, 6, 0, 0]} maxBarSize={44} />
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Gráfico de linha com UMA única métrica */
export function SimpleLineChart({
  data, xKey, valueKey, label, format = (v) => String(v), color = CHART_COLORS.primary, height = 220,
}: SimpleChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
        <XAxis dataKey={xKey} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={52}
          tickFormatter={(v) => format(Number(v))} allowDecimals={false} />
        <Tooltip
          contentStyle={tooltipStyle}
          cursor={{ stroke: "hsl(var(--border))" }}
          formatter={(v: any) => [format(Number(v)), label]}
        />
        <Line type="monotone" dataKey={valueKey} stroke={color} strokeWidth={2.5} dot={{ r: 3, fill: color }} activeDot={{ r: 5 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

interface RankedItem {
  name: string;
  value: number;
  hint?: string;
}

/** Substitui gráficos de pizza: ranking horizontal, muito mais fácil de ler */
export function RankedBars({
  items, format = (v) => String(v), emptyMessage = "Sem dados ainda.", max = 6,
}: {
  items: RankedItem[];
  format?: (v: number) => string;
  emptyMessage?: string;
  max?: number;
}) {
  if (!items.length) {
    return <p className="py-8 text-center text-sm text-muted-foreground">{emptyMessage}</p>;
  }
  const total = items.reduce((s, i) => s + i.value, 0);
  const top = items.slice(0, max);
  const biggest = Math.max(...top.map((i) => i.value), 1);
  return (
    <div className="space-y-3">
      {top.map((item, i) => (
        <div key={item.name}>
          <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
            <span className="truncate">
              <span className="mr-1.5 text-xs text-muted-foreground">{i + 1}.</span>
              {item.name}
            </span>
            <span className="shrink-0 font-semibold">
              {format(item.value)}
              {total > 0 && (
                <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                  {((item.value / total) * 100).toFixed(0)}%
                </span>
              )}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full"
              style={{ width: `${(item.value / biggest) * 100}%`, background: CHART_SERIES[i % CHART_SERIES.length] }}
            />
          </div>
          {item.hint && <p className="mt-1 text-[11px] text-muted-foreground">{item.hint}</p>}
        </div>
      ))}
    </div>
  );
}