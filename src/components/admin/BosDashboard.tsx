import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Bar,
  BarChart,
} from "recharts";
import {
  getBosDashboard,
  syncBosAnalytics,
  syncTallyLeads,
  syncBlogSources,
} from "../../lib/supabase-functions";
import { useTranslation } from "../../lib/i18n";

interface RecentSale {
  id: string;
  invoice_number?: string | null;
  amount?: number;
  currency?: string;
  user_name?: string | null;
  transaction_id?: string | null;
  gateway?: string | null;
  product_title?: string | null;
  paid_at?: string | null;
}

interface Connector {
  source: string;
  name: string;
  enabled: boolean;
  last_sync_at?: string | null;
  last_error?: string | null;
  configured?: boolean;
  has_data?: boolean;
}

interface BosPayload {
  generated_at?: string;
  revenue?: {
    lifetime?: { sum: number; orders: number };
    periods?: Record<string, { sum: number; orders: number; avg: number }>;
    pending?: { sum: number; orders: number };
    by_gateway?: { gateway: string; sum: number; orders: number }[];
    daily?: { date: string; amount: number }[];
    recent?: RecentSale[];
  };
  traffic?: {
    totals?: { visits: number; pageviews: number; uniques: number };
    daily?: {
      date: string;
      source: string;
      visits: number;
      pageviews: number;
      uniques: number;
      bounce_rate?: number | null;
    }[];
  };
  leads?: {
    total?: number;
    by_source?: { source: string; count: number }[];
    recent?: { id: string; source: string; name?: string | null; email?: string | null; topic?: string | null; created_at?: string }[];
  };
  connectors?: Connector[];
}

const fmtUSD = (n?: number | null, opts: Intl.NumberFormatOptions = {}) => {
  if (n === undefined || n === null) return "$0";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: n < 100 ? 2 : 0,
    ...opts,
  }).format(n);
};

const fmtNum = (n?: number | null) =>
  n === undefined || n === null ? "0" : new Intl.NumberFormat("en-US").format(n);

const fmtDate = (iso?: string | null) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-CO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const fmtDateTime = (iso?: string | null) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("es-CO", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const gatewayLabel = (g?: string | null) => {
  if (g === "nowpayments") return "Crypto (NP)";
  if (g === "dlocalgo") return "Tarjeta (dLocal Go)";
  if (g === "dlocal") return "Tarjeta (dLocal)";
  if (g === "paypal") return "PayPal";
  return g || "—";
};

function KpiCard({
  label,
  value,
  sub,
  accent = "#2093c4",
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: string;
}) {
  return (
    <div className="bg-[#15171a] border border-white/10 rounded-xl p-4 flex flex-col gap-1 min-w-[160px]">
      <span className="text-[11px] uppercase tracking-wider text-gray-400">
        {label}
      </span>
      <span className="text-2xl font-bold text-white tabular-nums">
        {value}
      </span>
      {sub ? (
        <span className="text-xs text-gray-500" style={{ color: accent }}>
          {sub}
        </span>
      ) : null}
    </div>
  );
}

function Section({
  title,
  children,
  className = "",
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`bg-[#15171a] border border-white/10 rounded-xl p-5 ${className}`}
    >
      <h3 className="text-sm font-semibold text-white mb-4">{title}</h3>
      {children}
    </div>
  );
}

export default function BosDashboard() {
  const { t } = useTranslation();
  const [data, setData] = useState<BosPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getBosDashboard();
      setData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error cargando el BOS");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSync = async () => {
    setSyncing(true);
    try {
      const errors: string[] = [];

      const res = await syncBosAnalytics();
      if (res?.reason) {
        errors.push(
          `Analítica (GA4): ${res.reason}. Verifica GA4_SERVICE_ACCOUNT_JSON y GA4_PROPERTY_ID en los secrets.`
        );
      }

      const tally = await syncTallyLeads();
      if (tally?.reason) errors.push(`Tally (Leads): ${tally.reason}`);

      const blog = await syncBlogSources();
      if (blog?.devto?.error) errors.push(`Dev.to: ${blog.devto.error}`);
      if (blog?.medium?.error) errors.push(`Medium: ${blog.medium.error}`);

      setError(errors.length ? errors.join(" ") : null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al sincronizar");
    } finally {
      setSyncing(false);
    }
  };

  const rev = data?.revenue;
  const traf = data?.traffic;
  const leads = data?.leads;
  const conn = data?.connectors;

  const trafficSeries = useMemo(() => {
    const map = new Map<string, { date: string; visits: number; pageviews: number }>();
    for (const row of traf?.daily || []) {
      const cur = map.get(row.date) || { date: row.date, visits: 0, pageviews: 0 };
      cur.visits += row.visits || 0;
      cur.pageviews += row.pageviews || 0;
      map.set(row.date, cur);
    }
    return Array.from(map.values());
  }, [traf]);

  const r30 = rev?.periods?.["30d"];
  const r90 = rev?.periods?.["90d"];
  const r7 = rev?.periods?.["7d"];

  return (
    <div className="space-y-4">
      {/* Header ejecutivo */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-white">
            BOS — Business Operating System
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            {t("admin.bos.subtitle") || "Rendimiento integral del negocio"}
            {data?.generated_at
              ? ` · ${fmtDateTime(data.generated_at)}`
              : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onSync}
            disabled={syncing}
            className="px-3 py-2 text-xs rounded-lg border border-white/20 text-gray-300 hover:text-white hover:border-white/40 transition-colors cursor-pointer disabled:opacity-50"
          >
            {syncing ? "Sincronizando..." : "Sincronizar analítica"}
          </button>
          <button
            onClick={load}
            disabled={loading}
            className="px-3 py-2 text-xs rounded-lg bg-[#2093c4]/20 hover:bg-[#2093c4]/30 border border-[#2093c4]/40 text-white transition-colors cursor-pointer disabled:opacity-50"
          >
            {loading ? "Cargando..." : "Actualizar"}
          </button>
        </div>
      </div>

      {error ? (
        <div className="bg-red-500/10 border border-red-500/30 text-red-200 text-sm rounded-lg px-4 py-3">
          {error}
        </div>
      ) : null}

      {loading && !data ? (
        <div className="text-center py-16 text-gray-400">
          {t("common.loading") || "Cargando..."}
        </div>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KpiCard
              label={t("admin.bos.revenue30") || "Ingresos 30 días"}
              value={fmtUSD(r30?.sum)}
              sub={`${fmtNum(r30?.orders)} ${t("admin.bos.orders") || "pedidos"} · ${fmtUSD(r7?.sum)} 7d`}
            />
            <KpiCard
              label={t("admin.bos.revenue90") || "Ingresos 90 días"}
              value={fmtUSD(r90?.sum)}
              sub={`${fmtNum(r90?.orders)} ${t("admin.bos.orders") || "pedidos"}`}
              accent="#8c52ff"
            />
            <KpiCard
              label={t("admin.bos.lifetime") || "De por vida"}
              value={fmtUSD(rev?.lifetime?.sum)}
              sub={`${fmtNum(rev?.lifetime?.orders)} ${t("admin.bos.orders") || "pedidos"}· ${fmtUSD(rev?.pending?.sum)} pendiente`}
              accent="#f0b429"
            />
            <KpiCard
              label={t("admin.bos.ticket") || "Ticket promedio 30d"}
              value={fmtUSD(r30?.avg)}
              sub={`${fmtNum(traf?.totals?.visits)} visitas 30d`}
              accent="#34d399"
            />
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <Section title={t("admin.bos.revenueChart") || "Ingresos — últimos 30 días"}>
              <div className="h-60">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={rev?.daily || []}>
                    <defs>
                      <linearGradient id="gradRev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#2093c4" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="#2093c4" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                    <XAxis
                      dataKey="date"
                      tick={{ fill: "#9ca3af", fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(d: string) =>
                        new Date(d).toLocaleDateString("es-CO", { day: "2-digit", month: "short" })
                      }
                      minTickGap={24}
                    />
                    <YAxis
                      tick={{ fill: "#9ca3af", fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      width={52}
                      tickFormatter={(v: number) => `$${v}`}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "#0d0f11",
                        border: "1px solid rgba(255,255,255,0.15)",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                      labelFormatter={(d: any) => fmtDate(d)}
                      formatter={(value: any, _name: any) => [
                        fmtUSD(value),
                        "Ingresos",
                      ]}
                    />
                    <Area
                      type="monotone"
                      dataKey="amount"
                      stroke="#2093c4"
                      strokeWidth={2}
                      fill="url(#gradRev)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Section>

            <Section title={t("admin.bos.trafficChart") || "Trafico web — 30 días"}>
              <div className="h-60">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={trafficSeries}>
                    <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                    <XAxis
                      dataKey="date"
                      tick={{ fill: "#9ca3af", fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(d: string) =>
                        new Date(d).toLocaleDateString("es-CO", { day: "2-digit", month: "short" })
                      }
                      minTickGap={24}
                    />
                    <YAxis
                      tick={{ fill: "#9ca3af", fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      width={38}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "#0d0f11",
                        border: "1px solid rgba(255,255,255,0.15)",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                      labelFormatter={(d: any) => fmtDate(d)}
                      formatter={(value: any, name: any) => [
                        fmtNum(value),
                        name === "visits" ? "Visitas" : "Pageviews",
                      ]}
                    />
                    <Bar dataKey="visits" fill="#8c52ff" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="pageviews" fill="#2093c4" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Section>
          </div>

          {/* Últimas ventas + Pasarelas + Leads */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            <Section
              title={t("admin.bos.recentSales") || "Últimas ventas"}
              className="lg:col-span-2"
            >
              {!rev?.recent?.length ? (
                <p className="text-sm text-gray-500 py-6 text-center">
                  {t("admin.bos.noSales") || "Aún no hay ventas pagadas"}
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-[11px] uppercase tracking-wider text-gray-400">
                        <th className="pb-2 pr-2">Factura</th>
                        <th className="pb-2 pr-2">Cliente</th>
                        <th className="pb-2 pr-2 hidden md:table-cell">Producto</th>
                        <th className="pb-2 pr-2">Pasarela</th>
                        <th className="pb-2 pr-2 text-right">Monto</th>
                        <th className="pb-2 text-right">Fecha</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rev.recent.map((s) => (
                        <tr
                          key={s.id}
                          className="border-t border-white/5 hover:bg-white/5"
                        >
                          <td className="py-2 pr-2 text-gray-300 tabular-nums">
                            {s.invoice_number || "—"}
                          </td>
                          <td className="py-2 pr-2 text-gray-300">{s.user_name || "—"}</td>
                          <td className="py-2 pr-2 text-gray-400 hidden md:table-cell truncate max-w-[180px]">
                            {s.product_title || "—"}
                          </td>
                          <td className="py-2 pr-2 text-gray-300">
                            {gatewayLabel(s.gateway)}
                          </td>
                          <td className="py-2 pr-2 text-white font-semibold text-right tabular-nums">
                            {fmtUSD(s.amount)}
                          </td>
                          <td className="py-2 text-gray-400 text-right tabular-nums">
                            {fmtDate(s.paid_at)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Section>

            <div className="space-y-3">
              <Section title={t("admin.bos.byGateway") || "Ingresos por pasarela (90d)"}>
                {(rev?.by_gateway || [])?.length === 0 ? (
                  <p className="text-sm text-gray-500 py-4 text-center">
                    {t("admin.bos.noData") || "Sin datos"}
                  </p>
                ) : (
                  <div className="space-y-2">
                    {rev?.by_gateway?.map((g) => (
                      <div
                        key={g.gateway}
                        className="flex items-center justify-between text-sm"
                      >
                        <span className="text-gray-300">{gatewayLabel(g.gateway)}</span>
                        <span className="text-white font-semibold tabular-nums">
                          {fmtUSD(g.sum)}
                          <span className="text-gray-500 text-xs ml-1">
                            ×{g.orders}
                          </span>
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </Section>

              <Section title={t("admin.bos.leads") || "Leads"}>
                <div className="flex items-baseline justify-between mb-2">
                  <span className="text-3xl font-bold text-white tabular-nums">
                    {fmtNum(leads?.total)}
                  </span>
                  <span className="text-xs text-gray-500">
                    {t("admin.bos.total") || "en total"}
                  </span>
                </div>
                {(leads?.by_source || [])?.length === 0 ? (
                  <p className="text-sm text-gray-500 py-2">
                    {t("admin.bos.noLeads") || "Sin leads todavía"}
                  </p>
                ) : (
                  <div className="space-y-1 text-sm">
                    {leads?.by_source?.map((l) => (
                      <div
                        key={l.source}
                        className="flex items-center justify-between"
                      >
                        <span className="text-gray-300 capitalize">{l.source}</span>
                        <span className="text-white tabular-nums">{l.count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </Section>
            </div>
          </div>

          {/* Conectores */}
          <Section
            title={t("admin.bos.connectors") || "Conectores"}
          >
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {conn
                ?.filter((c) => c.enabled)
                ?.map((c) => {
                const ok = c.enabled && c.configured && c.has_data;
                const partial = c.enabled && c.configured && !c.has_data;
                return (
                  <div
                    key={c.source}
                    className="bg-[#0f1113] border border-white/10 rounded-lg px-3 py-2 flex items-center gap-2"
                  >
                    <span
                      className="inline-block w-2 h-2 rounded-full shrink-0"
                      style={{
                        backgroundColor: !c.enabled
                          ? "#4b5563"
                          : ok
                            ? "#34d399"
                            : partial
                              ? "#f0b429"
                              : "#6b7280",
                      }}
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-white truncate">
                        {c.name}
                      </p>
                      <p className="text-[10px] text-gray-500">
                        {!c.enabled
                          ? "Desactivado"
                          : c.last_sync_at
                            ? fmtDateTime(c.last_sync_at)
                            : ok
                              ? "Activo"
                              : partial
                                ? "Configurado"
                                : "Sin conectar"}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </Section>
        </>
      )}
    </div>
  );
}