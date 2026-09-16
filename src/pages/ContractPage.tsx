import { useState } from "react";
import { useParams } from "react-router-dom";
import {
  contractStatus,
  contractUnlock,
  contractSign,
  contractDownloadPdf,
} from "../lib/supabase-functions";

const inputCls =
  "w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-[#8c52ff]";

export default function ContractPage() {
  const { slug } = useParams<{ slug: string }>();
  const [password, setPassword] = useState("");
  const [contract, setContract] = useState<any>(null);
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [signing, setSigning] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signer, setSigner] = useState({ name: "", email: "" });

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!slug) return;
    setLoading(true);
    setError(null);
    try {
      const res: any = await contractUnlock(slug, password);
      if (res.error) throw new Error(res.error.message);
      setContract(res.data);
      setSigner((prev) => ({ ...prev, name: res.data.client_name || "", email: res.data.client_email || "" }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al desbloquear");
    } finally {
      setLoading(false);
    }
  };

  const handleSign = async () => {
    if (!slug || !contract) return;
    if (!signer.name.trim()) {
      setError("Escribe tu nombre para firmar");
      return;
    }
    setSigning(true);
    setError(null);
    try {
      const res: any = await contractSign(slug, password, signer.name.trim(), signer.email.trim() || undefined);
      if (res.error) throw new Error(res.error.message);
      // Recargar el contrato con el estado de firmas actualizado
      const u: any = await contractUnlock(slug, password);
      if (u.error) throw new Error(u.error.message);
      setContract(u.data);
      if (u.data?.signed_at) {
        const s: any = await contractStatus(slug);
        if (!s.error) setStatus(s.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al firmar");
    } finally {
      setSigning(false);
    }
  };

  const handleDownload = async () => {
    if (!slug) return;
    setDownloading(true);
    setError(null);
    try {
      const resp = await contractDownloadPdf(slug, password);
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${slug}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al generar PDF");
    } finally {
      setDownloading(false);
    }
  };

  const money = (v: number | null, cur?: string) =>
    v == null
      ? null
      : new Intl.NumberFormat("es-ES", {
          style: "currency",
          currency: cur || "EUR",
        }).format(v);

  const renderTerms = (t: string) =>
    t.split(/\n{2,}/).map((p, i) => (
      <p key={i} className="mb-3 leading-relaxed text-gray-300">
        {p.trim()}
      </p>
    ));

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-2xl rounded-2xl border border-white/10 bg-[#15171a] p-6 md:p-8 text-white">
        <div className="mb-5 text-center">
          <h1 className="text-2xl font-bold mb-1">Contrato de servicios</h1>
          <p className="text-xs text-gray-500">Firma electrónica — vixis.dev</p>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {!contract ? (
          <form onSubmit={handleUnlock} className="space-y-3">
            <p className="text-sm text-gray-400">
              Este contrato está protegido. Introduce la contraseña que recibiste
              junto con el enlace para verlo y firmarlo.
            </p>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Contraseña del contrato"
              className={inputCls}
              autoFocus
            />
            <button
              type="submit"
              disabled={loading || !password}
              className="w-full rounded-lg bg-[#8c52ff] py-2.5 text-sm font-semibold text-white hover:bg-[#7a45e0] disabled:opacity-50 cursor-pointer"
            >
              {loading ? "Verificando…" : "Desbloquear contrato"}
            </button>
          </form>
        ) : (
          <div className="space-y-5">
            <div className="rounded-lg border border-white/10 bg-white/5 p-4">
              <h2 className="text-lg font-semibold">{contract.title}</h2>
              <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-1 text-sm text-gray-400">
                <span>
                  Cliente: <span className="text-gray-200">{contract.client_name || "—"}</span>
                </span>
                {contract.company && (
                  <span>
                    Empresa: <span className="text-gray-200">{contract.company}</span>
                  </span>
                )}
                {money(contract.value, contract.currency) && (
                  <span>
                    Importe:{" "}
                    <span className="text-gray-200 font-semibold">
                      {money(contract.value, contract.currency)}
                    </span>
                  </span>
                )}
                {!contract.signed_at && (
                  <span className="text-amber-400">Pendiente de firma completa</span>
                )}
                {contract.signed_at && (
                  <span className="text-green-400">Completado — firmado por ambas partes</span>
                )}
              </div>
            </div>

            <div className="rounded-lg border border-white/10 bg-white/5 p-4 text-sm">
              {renderTerms(contract.terms)}
            </div>

            <div className="rounded-lg border border-white/10 bg-white/5 p-4">
              <h3 className="text-sm font-semibold mb-3">Firmas</h3>

              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="text-gray-400">
                    Proveedor:{" "}
                    <span className="text-gray-200">
                      {contract.provider_signed_at
                        ? new Date(contract.provider_signed_at).toLocaleDateString("es-ES")
                        : "Pendiente"}
                    </span>
                  </span>
                  <span className={`px-2 py-0.5 text-[11px] rounded border ${
                    contract.provider_signed_at
                      ? "bg-green-500/10 text-green-400 border-green-500/30"
                      : "bg-amber-500/10 text-amber-400 border-amber-500/30"
                  }`}>
                    {contract.provider_signed_at ? "Firmado" : "Sin firmar"}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="text-gray-400">
                    Cliente:{" "}
                    <span className="text-gray-200">
                      {contract.client_signed_at
                        ? new Date(contract.client_signed_at).toLocaleDateString("es-ES")
                        : "Pendiente"}
                    </span>
                  </span>
                  <span className={`px-2 py-0.5 text-[11px] rounded border ${
                    contract.client_signed_at
                      ? "bg-green-500/10 text-green-400 border-green-500/30"
                      : "bg-amber-500/10 text-amber-400 border-amber-500/30"
                  }`}>
                    {contract.client_signed_at ? "Firmado" : "Sin firmar"}
                  </span>
                </div>
              </div>

              {!contract.client_signed_at && (
                <div className="mt-4 space-y-3">
                  <p className="text-xs text-gray-500">
                    Al firmar aceptas las condiciones descritas arriba. La firma es
                    electrónica (nombre + fecha/hora).
                  </p>
                  <input
                    value={signer.name}
                    onChange={(e) => setSigner({ ...signer, name: e.target.value })}
                    placeholder="Tu nombre completo"
                    className={inputCls}
                  />
                  <input
                    type="email"
                    value={signer.email}
                    onChange={(e) => setSigner({ ...signer, email: e.target.value })}
                    placeholder="Tu email (opcional si ya consta en el contrato)"
                    className={inputCls}
                  />
                  <button
                    onClick={handleSign}
                    disabled={signing}
                    className="w-full rounded-lg bg-green-600 py-2.5 text-sm font-semibold text-white hover:bg-green-500 disabled:opacity-50 cursor-pointer"
                  >
                    {signing ? "Firmando…" : "Firmar contrato"}
                  </button>
                </div>
              )}
            </div>

            {contract.signed_at && (
              <button
                onClick={handleDownload}
                disabled={downloading}
                className="w-full rounded-lg bg-[#8c52ff] py-2.5 text-sm font-semibold text-white hover:bg-[#7a45e0] disabled:opacity-50 cursor-pointer"
              >
                {downloading ? "Generando PDF…" : "Descargar PDF del contrato"}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}