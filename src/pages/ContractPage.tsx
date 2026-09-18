import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  contractUnlock,
  contractStatus,
  contractSign,
  contractSendCode,
  contractVerifyCode,
  contractDownloadPdf,
} from "../lib/supabase-functions";
import { loadAppearanceSettings } from "../lib/appearance";
import { useTranslation } from "../lib/i18n";
import { useSEO } from "../hooks/useSEO";
import { useThemeStore } from "../stores/useThemeStore";
import CanvasBackground from "../components/features/CanvasBackground";
import Loading from "../components/ui/Loading";
import NotFound from "./NotFound";

const inputCls =
  "w-full rounded-lg border border-gray-300 dark:border-white/15 bg-white dark:bg-white/5 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-500 outline-none focus:border-[#8c52ff]";

const cardCls =
  "rounded-lg border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 p-4";

export default function ContractPage() {
  const { slug } = useParams<{ slug: string }>();
  const { t, language } = useTranslation();
  const { theme } = useThemeStore();
  const lang = language === "en" ? "en" : "es";

  const [password, setPassword] = useState("");
  const [contract, setContract] = useState<any>(null);
  const [contractBg, setContractBg] = useState("default");
  const [loading, setLoading] = useState(false);
  const [signing, setSigning] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signer, setSigner] = useState({ name: "", email: "" });

  // Paso OTP anti-bots
  const [codeSent, setCodeSent] = useState(false);
  const [code, setCode] = useState("");
  const [sendingCode, setSendingCode] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);
  const [signToken, setSignToken] = useState<string | null>(null);
  const [gone, setGone] = useState(false);
  const [checking, setChecking] = useState(true);
  useSEO({ title: contract?.title || undefined });

  // Fondo + existencia en paralelo: sin carrera (el loader y el contenido
  // comparten el mismo fondo) y sin pintar nada hasta saber si existe.
  useEffect(() => {
    let alive = true;
    Promise.all([
      loadAppearanceSettings()
        .then((s) => (s?.contracts_background || "default"))
        .catch(() => "default"),
      !slug
        ? Promise.resolve("missing")
        : contractStatus(slug)
            .then((res: any) => (res.data && res.data.exists === false ? "missing" : "exists"))
            .catch(() => "unknown"),
    ]).then(([bg, st]) => {
      if (!alive) return;
      setContractBg(bg);
      if (st === "missing") setGone(true);
      setChecking(false);
    });
    return () => {
      alive = false;
    };
  }, [slug]);

  const title = contract
    ? lang === "en" && contract.title_en
      ? contract.title_en
      : contract.title
    : "";
  const terms = contract
    ? lang === "en" && contract.terms_en
      ? contract.terms_en
      : contract.terms
    : "";

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!slug) return;
    setLoading(true);
    setError(null);
    try {
      const res: any = await contractUnlock(slug, password);
      if (res.error) {
        const msg = res.error.message || "";
        if (/no encontrado|not found|deleted/i.test(msg)) {
          setGone(true);
          return;
        }
        throw new Error(msg);
      }
      setContract(res.data);
      setVerified(false);
      setSignToken(null);
      setCodeSent(false);
      setCode("");
      setSigner((prev) => ({ ...prev, name: res.data.client_name || "", email: res.data.client_email || "" }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al desbloquear");
    } finally {
      setLoading(false);
    }
  };

  const handleSendCode = async () => {
    if (!slug) return;
    setSendingCode(true);
    setError(null);
    try {
      const res: any = await contractSendCode(slug, password);
      if (res.error) throw new Error(res.error.message);
      setCodeSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al enviar el código");
    } finally {
      setSendingCode(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!slug || code.replace(/\D/g, "").length !== 6) return;
    setVerifying(true);
    setError(null);
    try {
      const res: any = await contractVerifyCode(slug, password, code);
      if (res.error) throw new Error(res.error.message);
      setSignToken(res.data.sign_token);
      setVerified(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al verificar");
    } finally {
      setVerifying(false);
    }
  };

  const handleSign = async () => {
    if (!slug || !contract) return;
    if (!signer.name.trim() || signer.name.trim().length < 3) {
      setError(t("contracts.needName"));
      return;
    }
    if (contract.otp && !signToken) {
      setError(t("contracts.otpTitle"));
      return;
    }
    setSigning(true);
    setError(null);
    try {
      const res: any = await contractSign(
        slug,
        password,
        signer.name.trim(),
        signer.email.trim() || undefined,
        signToken || undefined
      );
      if (res.error) throw new Error(res.error.message);
      const u: any = await contractUnlock(slug, password);
      if (u.error) throw new Error(u.error.message);
      setContract(u.data);
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
      const resp = await contractDownloadPdf(slug, password, lang);
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
      : new Intl.NumberFormat(lang === "en" ? "en-US" : "es-ES", {
          style: "currency",
          currency: cur || "EUR",
        }).format(v);

  const renderTerms = (txt: string) =>
    txt.split(/\n{2,}/).map((p, i) => (
      <p key={i} className="mb-3 leading-relaxed text-gray-700 dark:text-gray-300">
        {p.trim()}
      </p>
    ));

  const badge = (ok: boolean, okLabel: string, koLabel: string) => (
    <span className={`px-2 py-0.5 text-[11px] rounded border ${
      ok
        ? "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30"
        : "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30"
    }`}>
      {ok ? okLabel : koLabel}
    </span>
  );

  // Link eliminado: 404 estándar de siempre.
  if (gone) return <NotFound />;

  const bgLayer = (
    <AnimatePresence>
      {contractBg === "starry_night" && (
        <motion.div
          initial={false}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1 }}
          className="absolute inset-0 z-0 pointer-events-none"
        >
          <CanvasBackground mode={theme as "light" | "dark"} />
        </motion.div>
      )}
    </AnimatePresence>
  );

  // Verificando el slug: fondo + nav normales, draw-loop y texto localizado.
  // Verificando el slug: skater a pantalla completa hasta saber si existe.
  if (checking) {
    return <Loading />;
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4 py-12 relative overflow-hidden">
      {bgLayer}
      <div className="w-full max-w-2xl rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#15171a] p-6 md:p-8 text-gray-900 dark:text-white relative z-10 shadow-xl">
        <div className="mb-5 text-center">
          <h1 className="text-2xl font-bold mb-1">{t("contracts.title")}</h1>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-300">
            {error}
          </div>
        )}

        {!contract ? (
          <form onSubmit={handleUnlock} className="space-y-3">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {t("contracts.lockedDesc")}
            </p>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t("contracts.passwordPh")}
              className={inputCls}
              autoFocus
            />
            <button
              type="submit"
              disabled={loading || !password}
              className="w-full rounded-lg bg-[#8c52ff] py-2.5 text-sm font-semibold text-white hover:bg-[#7a45e0] disabled:opacity-50 cursor-pointer"
            >
              {loading ? t("contracts.unlocking") : t("contracts.unlock")}
            </button>
          </form>
        ) : (
          <div className="space-y-5">
            <div className={cardCls}>
              <div className="flex items-start justify-between gap-2">
                <h2 className="text-lg font-semibold">{title}</h2>
                <span className="shrink-0 px-2 py-0.5 text-[11px] rounded bg-[#8c52ff]/15 text-[#8c52ff] dark:text-[#c4b5fd] border border-[#8c52ff]/30">
                  {t(`admin.crm.contractTypes.${contract.contract_type || "servicios"}`)}
                </span>
              </div>
              <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-1 text-sm text-gray-500 dark:text-gray-400">
                <span>
                  {t("contracts.client")}: <span className="text-gray-900 dark:text-gray-200">{contract.client_name || "—"}</span>
                </span>
                {contract.company && (
                  <span>
                    {t("contracts.company")}: <span className="text-gray-900 dark:text-gray-200">{contract.company}</span>
                  </span>
                )}
                {money(contract.value, contract.currency) && (
                  <span>
                    {t("contracts.amount")}:{" "}
                    <span className="text-gray-900 dark:text-gray-200 font-semibold">
                      {money(contract.value, contract.currency)}
                    </span>
                  </span>
                )}
                {!contract.signed_at && (
                  <span className="text-amber-600 dark:text-amber-400">{t("contracts.pendingSig")}</span>
                )}
                {contract.signed_at && (
                  <span className="text-green-700 dark:text-green-400">{t("contracts.signedBoth")}</span>
                )}
              </div>
            </div>

            <div className={`${cardCls} text-sm`}>
              {renderTerms(terms)}
            </div>

            <div className={cardCls}>
              <h3 className="text-sm font-semibold mb-3">{t("contracts.signatures")}</h3>

              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="text-gray-500 dark:text-gray-400">
                    {t("contracts.provider")}:{" "}
                    <span className="text-gray-900 dark:text-gray-200">
                      {contract.provider_signed_at
                        ? new Date(contract.provider_signed_at).toLocaleDateString(lang === "en" ? "en-US" : "es-ES")
                        : "—"}
                    </span>
                  </span>
                  {badge(!!contract.provider_signed_at, t("contracts.signed"), t("contracts.notSigned"))}
                </div>

                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="text-gray-500 dark:text-gray-400">
                    {t("contracts.client")}:{" "}
                    <span className="text-gray-900 dark:text-gray-200">
                      {contract.client_signed_at
                        ? new Date(contract.client_signed_at).toLocaleDateString(lang === "en" ? "en-US" : "es-ES")
                        : "—"}
                    </span>
                  </span>
                  {badge(!!contract.client_signed_at, t("contracts.signed"), t("contracts.notSigned"))}
                </div>
              </div>

              {!contract.client_signed_at && (
                <div className="mt-4 space-y-3">
                  <p className="text-xs text-gray-500 dark:text-gray-500">
                    {t("contracts.signNote")}
                  </p>

                  {contract.otp && !verified && (
                    <div className="rounded-lg border border-[#8c52ff]/40 bg-[#8c52ff]/5 dark:bg-[#8c52ff]/10 p-3 space-y-3">
                      <p className="text-sm font-semibold">{t("contracts.otpTitle")}</p>
                      {!codeSent ? (
                        <div className="space-y-2">
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {t("contracts.otpDesc")} <span className="font-mono">{contract.email_masked || contract.client_email}</span>
                          </p>
                          <button
                            onClick={handleSendCode}
                            disabled={sendingCode}
                            className="w-full rounded-lg bg-[#8c52ff] py-2 text-sm font-semibold text-white hover:bg-[#7a45e0] disabled:opacity-50 cursor-pointer"
                          >
                            {sendingCode ? t("contracts.sendingCode") : t("contracts.sendCode")}
                          </button>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <input
                            value={code}
                            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                            placeholder={t("contracts.codePh")}
                            inputMode="numeric"
                            className={`${inputCls} font-mono tracking-[0.3em] text-center`}
                          />
                          <button
                            onClick={handleVerifyCode}
                            disabled={verifying || code.length !== 6}
                            className="shrink-0 rounded-lg bg-[#8c52ff] px-4 py-2 text-sm font-semibold text-white hover:bg-[#7a45e0] disabled:opacity-50 cursor-pointer"
                          >
                            {verifying ? t("contracts.verifying") : t("contracts.verify")}
                          </button>
                        </div>
                      )}
                      {codeSent && !verified && (
                        <button onClick={handleSendCode} disabled={sendingCode} className="text-xs text-[#8c52ff] hover:underline cursor-pointer">
                          {t("contracts.newCode")}
                        </button>
                      )}
                    </div>
                  )}

                  {(!contract.otp || verified) && (
                    <>
                      {verified && (
                        <p className="text-xs font-semibold text-green-700 dark:text-green-400">{t("contracts.verified")}</p>
                      )}
                      <input
                        value={signer.name}
                        onChange={(e) => setSigner({ ...signer, name: e.target.value })}
                        placeholder={t("contracts.namePh")}
                        className={inputCls}
                      />
                      <input
                        type="email"
                        value={signer.email}
                        onChange={(e) => setSigner({ ...signer, email: e.target.value })}
                        placeholder={t("contracts.emailPh")}
                        className={inputCls}
                      />
                      <button
                        onClick={handleSign}
                        disabled={signing || (contract.otp && !verified)}
                        className="w-full rounded-lg bg-green-600 py-2.5 text-sm font-semibold text-white hover:bg-green-500 disabled:opacity-50 cursor-pointer"
                      >
                        {signing ? t("contracts.signing") : t("contracts.signBtn")}
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>

            {contract.signed_at && (
              <button
                onClick={handleDownload}
                disabled={downloading}
                className="w-full rounded-lg bg-[#8c52ff] py-2.5 text-sm font-semibold text-white hover:bg-[#7a45e0] disabled:opacity-50 cursor-pointer"
              >
                {downloading ? t("contracts.generating") : t("contracts.download")}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}