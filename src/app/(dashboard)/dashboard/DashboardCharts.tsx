'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Card, CardContent, CardHeader } from '@/components/ui';
import { cn } from '@/lib/cn';

export type ChartPeriod = '1m' | '6m' | '1y';

type LineChartPoint = {
  mes: string;
  faturamento: number;
  despesas: number;
};

type CategoryBarPoint = {
  id: string;
  categoria: string;
  valor: number;
  color: string;
};

export type DashboardChartsProps = {
  chartPeriod: ChartPeriod;
  onChartPeriodChange: (period: ChartPeriod) => void;
  chartData: LineChartPoint[];
  barDataDespesasCategoria: CategoryBarPoint[];
};

const CHART_PERIOD_OPTIONS: { id: ChartPeriod; label: string }[] = [
  { id: '1m', label: 'Mês' },
  { id: '6m', label: '6 meses' },
  { id: '1y', label: '1 ano' },
];

function formatCurrency(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function DashboardCharts({
  chartPeriod,
  onChartPeriodChange,
  chartData,
  barDataDespesasCategoria,
}: DashboardChartsProps) {
  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-zinc-600">Período dos gráficos</p>
        <div
          className="inline-flex rounded-lg border border-zinc-200 bg-zinc-50 p-0.5"
          role="group"
          aria-label="Período dos gráficos"
        >
          {CHART_PERIOD_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => onChartPeriodChange(opt.id)}
              className={cn(
                'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                chartPeriod === opt.id
                  ? 'bg-white text-zinc-900 shadow-sm'
                  : 'text-zinc-600 hover:text-zinc-900'
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="border-zinc-200">
          <CardHeader className="pb-2">
            <h3 className="text-zinc-800">Faturamento vs Despesas</h3>
            <p className="mt-1 text-xs font-normal text-zinc-500">
              {chartPeriod === '1m' && 'Mês atual (semanas no gráfico de linhas)'}
              {chartPeriod === '6m' && 'Últimos 6 meses'}
              {chartPeriod === '1y' && 'Últimos 12 meses'}
            </p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={chartPeriod === '1y' ? 248 : 220}>
              <LineChart
                data={chartData}
                margin={{
                  top: 5,
                  right: 12,
                  left: 4,
                  bottom: chartPeriod === '1y' ? 28 : 5,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  dataKey="mes"
                  tick={{ fontSize: chartPeriod === '1y' ? 10 : 12 }}
                  angle={chartPeriod === '1y' ? -22 : 0}
                  textAnchor={chartPeriod === '1y' ? 'end' : 'middle'}
                  height={chartPeriod === '1y' ? 48 : 24}
                />
                <YAxis width={108} tick={{ fontSize: 11 }} tickFormatter={(v) => formatCurrency(Number(v))} />
                <Tooltip formatter={(v) => formatCurrency(Number(v ?? 0))} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="faturamento"
                  name="Faturamento"
                  stroke="#2563eb"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="despesas"
                  name="Despesas"
                  stroke="#ef4444"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-zinc-200">
          <CardHeader className="pb-2">
            <h3 className="text-zinc-800">Despesas por Categoria</h3>
            <p className="mt-1 text-xs font-normal text-zinc-500">
              {chartPeriod === '1m' && 'Total no mês atual'}
              {chartPeriod === '6m' && 'Total nos últimos 6 meses'}
              {chartPeriod === '1y' && 'Total nos últimos 12 meses'}
            </p>
          </CardHeader>
          <CardContent>
            {barDataDespesasCategoria.length === 0 ? (
              <p className="py-12 text-center text-sm text-zinc-500">
                Nenhuma despesa no período selecionado.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={barDataDespesasCategoria} margin={{ top: 5, right: 12, left: 4, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="categoria" tick={{ fontSize: 12 }} />
                  <YAxis width={108} tick={{ fontSize: 11 }} tickFormatter={(v) => formatCurrency(Number(v))} />
                  <Tooltip formatter={(v) => formatCurrency(Number(v ?? 0))} />
                  <Bar dataKey="valor" name="Valor" radius={[8, 8, 0, 0]}>
                    {barDataDespesasCategoria.map((row) => (
                      <Cell key={row.id} fill={row.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
