import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import {
  getCrmCompanies,
  createCrmCompany,
  updateCrmCompany,
  getCrmContacts,
  createCrmContact,
  updateCrmContact,
  getCrmStages,
  getCrmDeals,
  createCrmDeal,
  updateCrmDeal,
  getCrmActivities,
  createCrmActivity,
  updateCrmActivity,
  getCrmLeads,
  convertLeadToContact,
  getCrmVisitors,
  getCrmEmailTemplates,
  createCrmEmailTemplate,
  updateCrmEmailTemplate,
  deleteCrmEmailTemplate,
  getCrmEmails,
  sendCrmEmail,
  getCrmContracts,
  createCrmContract,
  updateCrmContract,
  deleteCrmContract,
  signContractProvider,
} from "../../lib/supabase-functions";

// ============ helpers de UI ============

const INITIAL_BG = [
  "#2093c4", "#8c52ff", "#10b981", "#f59e0b", "#ef4444",
  "#14b8a6", "#ec4899", "#6366f1", "#f97316", "#22c55e",
];

const hashStr = (s: string) =>
  [...s].reduce((acc, ch) => acc + ch.charCodeAt(0), 0);

function Avatar({
  url,
  name,
  className = "h-8 w-8 text-xs",
}: {
  url?: string | null;
  name?: string | null;
  className?: string;
}) {
  const [broken, setBroken] = useState(false);
  const initials = (name || "?").split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase();
  const bg = INITIAL_BG[hashStr(name || "?") % INITIAL_BG.length];
  if (url && !broken) {
    return (
      <img
        src={url}
        alt={name || ""}
        onError={() => setBroken(true)}
        className={`${className} shrink-0 rounded-full object-cover ring-1 ring-white/10 bg-white/5`}
      />
    );
  }
  return (
    <div
      className={`${className} shrink-0 rounded-full flex items-center justify-center font-bold ring-1 ring-white/10`}
      style={{ backgroundColor: bg, color: "#fff" }}
    >
      {initials}
    </div>
  );
}

const fmtMoney = (v?: number | null, cur?: string | null) => {
  const n = Number(v ?? 0);
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: cur || "COP",
    maximumFractionDigits: n < 100 ? 2 : 0,
  }).format(n);
};

const fmtDate = (d?: string | null) => {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" });
};

const fmtDateTime = (d?: string | null) => {
  if (!d) return "—";
  return new Date(d).toLocaleString("es-CO", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
};

// ============ modal ============

function Modal({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-white/10 bg-[#121212] p-5 shadow-2xl text-white"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold">{title}</h3>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 text-gray-300 hover:bg-white/5 hover:text-white cursor-pointer"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="block text-xs font-medium text-gray-400 mb-1">{label}</label>
      {children}
    </div>
  );
}

const inputCls =
  "w-full bg-[#1A1A1A] border border-white/10 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#8c52ff]";
const btnPrimary =
  "px-4 py-2 bg-[#2093c4]/20 hover:bg-[#2093c4]/40 border border-[#2093c4]/40 text-white rounded-lg font-semibold text-sm transition-colors cursor-pointer disabled:opacity-50";
const btnGhost =
  "px-3 py-2 text-xs rounded-lg border border-white/20 text-gray-300 hover:text-white hover:border-white/40 transition-colors cursor-pointer disabled:opacity-50";
const btnDanger =
  "px-3 py-1.5 text-xs font-medium rounded-md border border-red-900/50 bg-red-950/30 text-red-400 hover:bg-red-900/50 cursor-pointer";

const TYPE_LABEL: Record<string, string> = {
  email: "Email",
  call: "Llamada",
  note: "Nota",
  task: "Tarea",
  meeting: "Reunión",
};

// ============ panel principal ============

type SubTab = "contacts" | "companies" | "pipeline" | "activities" | "leads" | "emails" | "contracts";

export default function CrmPanel() {
  const [subtab, setSubtab] = useState<SubTab>("contacts");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [companies, setCompanies] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [stages, setStages] = useState<any[]>([]);
  const [deals, setDeals] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [leadsData, setLeadsData] = useState<any>({ total: 0, converted: 0, items: [] });
  const [visitorsData, setVisitorsData] = useState<any>({ total: 0, today: 0, recent: [] });
  const [convertingLeadId, setConvertingLeadId] = useState<string | null>(null);
  const [emailTemplates, setEmailTemplates] = useState<any[]>([]);
  const [emailLog, setEmailLog] = useState<any[]>([]);
  const [templateModal, setTemplateModal] = useState<any>(null);
  const [sendModal, setSendModal] = useState<any>(null);
  const [sending, setSending] = useState(false);
  const [contracts, setContracts] = useState<any[]>([]);
  const [contractModal, setContractModal] = useState<any>(null);
  const [contractPassword, setContractPassword] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [actFilterContact, setActFilterContact] = useState("");

  // modales
  const [contactModal, setContactModal] = useState<any>(null); // {edit?: any} | null
  const [companyModal, setCompanyModal] = useState<any>(null);
  const [dealModal, setDealModal] = useState<any>(null); // {edit?: any, stage_id?}
  const [activityModal, setActivityModal] = useState<any>(null);
  const [detailContact, setDetailContact] = useState<any>(null);

  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [comps, cons, stgs, dls, acts, lds, vst, tmps, emls, ctrs] = await Promise.all([
        getCrmCompanies(),
        getCrmContacts(),
        getCrmStages(),
        getCrmDeals(),
        getCrmActivities(),
        getCrmLeads(),
        getCrmVisitors(),
        getCrmEmailTemplates(),
        getCrmEmails(),
        getCrmContracts(),
      ]);
      setCompanies(comps || []);
      setContacts(cons || []);
      setStages(stgs || []);
      setDeals(dls || []);
      setActivities(acts || []);
      setLeadsData(lds || { total: 0, converted: 0, items: [] });
      setVisitorsData(vst || { total: 0, today: 0, recent: [] });
      setEmailTemplates(tmps?.items || []);
      setEmailLog(emls?.items || []);
      setContracts(ctrs || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar el CRM");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const companyMap = useMemo(
    () => new Map(companies.map((c) => [c.id, c])),
    [companies]
  );
  const contactMap = useMemo(
    () => new Map(contacts.map((c) => [c.id, c])),
    [contacts]
  );

  const filteredContacts = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return contacts;
    return contacts.filter((c) =>
      [c.first_name, c.last_name, c.email, c.phone, (c.tags || []).join(" ")]
        .join(" ")
        .toLowerCase()
        .includes(s)
    );
  }, [contacts, search]);

  const filteredActivities = useMemo(() => {
    if (!actFilterContact) return activities;
    return activities.filter((a) => a.contact_id === actFilterContact);
  }, [activities, actFilterContact]);

  const dealsByStage = useMemo(() => {
    const map: Record<string, any[]> = {};
    (stages || []).forEach((sg) => (map[sg.id] = []));
    (deals || []).forEach((d) => {
      const k = d.stage_id || "";
      if (map[k]) map[k].push(d);
      else map[k] = [d];
    });
    return map;
  }, [deals, stages]);

  // ============ acciones ============

  const handleSaveContact = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const form = new FormData(e.target as HTMLFormElement);
      const payload = {
        company_id: (form.get("company_id") as string) || null,
        first_name: form.get("first_name") as string,
        last_name: (form.get("last_name") as string) || null,
        email: (form.get("email") as string) || null,
        phone: (form.get("phone") as string) || null,
        source: (form.get("source") as string) || "manual",
      };
      if (contactModal?.edit) {
        await updateCrmContact(contactModal.edit.id, payload);
      } else {
        await createCrmContact(payload);
      }
      setContactModal(null);
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error al guardar contacto");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveCompany = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const form = new FormData(e.target as HTMLFormElement);
      const payload = {
        name: form.get("name") as string,
        domain: (form.get("domain") as string) || null,
        industry: (form.get("industry") as string) || null,
        notes: (form.get("notes") as string) || null,
      };
      if (companyModal?.edit) {
        await updateCrmCompany(companyModal.edit.id, payload);
      } else {
        await createCrmCompany(payload);
      }
      setCompanyModal(null);
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error al guardar empresa");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveDeal = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const form = new FormData(e.target as HTMLFormElement);
      const d = {
        title: form.get("title") as string,
        contact_id: (form.get("contact_id") as string) || null,
        company_id: (form.get("company_id") as string) || null,
        stage_id: (form.get("stage_id") as string) || dealModal?.stage_id || null,
        value: Number(form.get("value")) || 0,
        currency: (form.get("currency") as string) || "COP",
        probability: Number(form.get("probability")) || 0,
        expected_close_date: (form.get("expected_close_date") as string) || null,
      };
      if (dealModal?.edit) {
        await updateCrmDeal(dealModal.edit.id, d);
      } else {
        await createCrmDeal(d);
      }
      setDealModal(null);
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error al guardar deal");
    } finally {
      setSaving(false);
    }
  };

  const handleMoveStage = async (dealId: string, stageId: string) => {
    try {
      await updateCrmDeal(dealId, { stage_id: stageId });
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error al mover el deal");
    }
  };

  const handleSaveActivity = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const form = new FormData(e.target as HTMLFormElement);
      const a = {
        contact_id: (form.get("contact_id") as string) || null,
        deal_id: (form.get("deal_id") as string) || null,
        type: (form.get("type") as string) || "note",
        subject: form.get("subject") as string,
        body: (form.get("body") as string) || null,
        due_date: (form.get("due_date") as string) || null,
      };
      if (activityModal?.edit) {
        await updateCrmActivity(activityModal.edit.id, a);
      } else {
        await createCrmActivity(a);
      }
      setActivityModal(null);
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error al guardar actividad");
    } finally {
      setSaving(false);
    }
  };

  const toggleActivity = async (act: any) => {
    try {
      await updateCrmActivity(act.id, { done: !act.done });
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error al actualizar actividad");
    }
  };

  const handleConvertLead = async (leadId: string) => {
    setConvertingLeadId(leadId);
    try {
      await convertLeadToContact(leadId);
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error al convertir el lead");
    } finally {
      setConvertingLeadId(null);
    }
  };

  const handleSaveTemplate = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const fd = new FormData(e.currentTarget as HTMLFormElement);
      const payload = {
        name: String(fd.get("name") || "").trim(),
        subject: String(fd.get("subject") || "").trim(),
        body: String(fd.get("body") || ""),
        is_active: (fd.get("is_active") as string) !== "false",
      };
      if (templateModal?.edit) {
        await updateCrmEmailTemplate(templateModal.edit.id, payload);
      } else {
        await createCrmEmailTemplate(payload);
      }
      setTemplateModal(null);
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error al guardar plantilla");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!window.confirm("¿Eliminar plantilla? Los envíos previos se conservan.")) return;
    try {
      await deleteCrmEmailTemplate(id);
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error al eliminar");
    }
  };

  const doSendEmail = async (e: FormEvent) => {
    e.preventDefault();
    if (!sendModal) return;
    const fd = new FormData(e.currentTarget as HTMLFormElement);
    const contactId = String(fd.get("contact_id") || "");
    const templateId = String(fd.get("template_id") || "");
    const dealId = String(fd.get("deal_id") || "") || undefined;
    if (!contactId || !templateId) return;
    setSending(true);
    try {
      const res: any = await sendCrmEmail({ contact_id: contactId, template_id: templateId, deal_id: dealId });
      if (!res?.ok) throw new Error(res?.error || "Error al enviar");
      setSendModal(null);
      await load();
      alert("Email enviado correctamente");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error al enviar email");
    } finally {
      setSending(false);
    }
  };

  const renderBody = (tmpl: string | undefined, contact?: any, deal?: any) => {
    if (!tmpl) return "";
    const vars: Record<string, string> = {
      "contact.first_name": contact?.first_name || "",
      "contact.last_name": contact?.last_name || "",
      "contact.full_name": `${contact?.first_name || ""} ${contact?.last_name || ""}`.trim(),
      "contact.email": contact?.email || "",
      "company.name": contact?.company?.name || "",
      "deal.title": deal?.title || "",
      "deal.value": deal?.value != null ? fmtMoney(Number(deal.value), deal.currency) : "",
      "template.name": "",
    };
    return tmpl.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_m, k: string) =>
      vars[k] !== undefined ? vars[k] : `{{${k}}}`
    );
  };
  const sendStatus = (s: string) =>
    s === "sent"
      ? { label: "Enviado", cls: "bg-green-500/10 text-green-400 border-green-500/30" }
      : { label: s === "pending" ? "Pendiente" : "Error", cls: "bg-red-500/10 text-red-400 border-red-500/30" };

  const randomPassword = () => {
    const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
    const bytes = new Uint8Array(8);
    crypto.getRandomValues(bytes);
    let out = "";
    for (const b of bytes) out += chars[b % chars.length];
    return out;
  };

  const handleSaveContract = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const fd = new FormData(e.currentTarget as HTMLFormElement);
      const payload = {
        title: String(fd.get("title") || "").trim(),
        contact_id: String(fd.get("contact_id") || "") || undefined,
        company_id: String(fd.get("company_id") || "") || undefined,
        currency: String(fd.get("currency") || "EUR"),
        value: fd.get("value") ? Number(fd.get("value")) || null : null,
        terms: String(fd.get("terms") || ""),
      };
      if (contractModal?.edit) {
        const upd: Record<string, unknown> = { ...payload };
        await updateCrmContract(contractModal.edit.id, upd);
        setContractModal(null);
        await load();
      } else {
        const res: any = await createCrmContract(payload);
        if (!res?.contract) throw new Error(res?.error || "Error al crear contrato");
        setContractModal(null);
        await load();
        setContractPassword(res.password);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error al guardar contrato");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteContract = async (id: string) => {
    if (!window.confirm("¿Eliminar contrato? Esta acción es irreversible.")) return;
    try {
      await deleteCrmContract(id);
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error al eliminar");
    }
  };

  const handleSignProvider = async (c: any) => {
    const name = window.prompt("Nombre del firmante (proveedor):", "Carlos Vicioso");
    if (!name) return;
    try {
      await signContractProvider(c.id, name.trim());
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error al firmar");
    }
  };

  const handleRegenPassword = async (c: any) => {
    const pwd = randomPassword();
    if (!window.confirm("Regenerar contraseña del contrato. La anterior dejará de funcionar. ¿Continuar?")) return;
    try {
      await updateCrmContract(c.id, { password: pwd });
      setContractPassword(pwd);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error al regenerar");
    }
  };

  const subTabs: { id: SubTab; label: string }[] = [
    { id: "contacts", label: "Contactos" },
    { id: "companies", label: "Empresas" },
    { id: "pipeline", label: "Pipeline" },
    { id: "activities", label: "Actividades" },
    { id: "leads", label: "Leads y visitas" },
    { id: "emails", label: "Emails" },
    { id: "contracts", label: "Contratos" },
  ];

  return (
    <div className="bg-[#15171a] border border-white/10 rounded-xl p-4 md:p-5 text-white">
      {/* Encabezado */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-xl font-bold">CRM</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Contactos, empresas, pipeline de ventas y actividades
          </p>
        </div>
        <div className="flex gap-1.5 flex-wrap">
          <button className={btnPrimary} onClick={() => setCompanyModal({})}>+ Empresa</button>
          <button className={btnPrimary} onClick={() => setContactModal({})}>+ Contacto</button>
          <button className={btnPrimary} onClick={() => setDealModal({})}>+ Deal</button>
          <button className={btnPrimary} onClick={() => setContractModal({})}>+ Contrato</button>
        </div>
      </div>

      {/* Sub tabs */}
      <div className="flex gap-1 flex-wrap mb-4 border-b border-white/10 pb-0">
        {subTabs.map((tb) => (
          <button
            key={tb.id}
            onClick={() => setSubtab(tb.id)}
            className={`px-4 py-2 text-sm font-semibold rounded-t-lg border-b-2 cursor-pointer transition-colors ${
              subtab === tb.id
                ? "border-[#8c52ff] text-white bg-white/5"
                : "border-transparent text-gray-400 hover:text-white"
            }`}
          >
            {tb.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          <span className="font-semibold">Error:</span>
          <span className="break-words">{error}</span>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-10">
          <span className="text-[#2093c4] font-bold">Cargando CRM…</span>
        </div>
      ) : (
        <>
          {/* ============ CONTACTOS ============ */}
          {subtab === "contacts" && (
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar por nombre, email, teléfono o etiqueta…"
                  className={inputCls + " sm:max-w-sm"}
                />
                <span className="text-xs text-gray-400">{filteredContacts.length} contactos</span>
              </div>
              <div className="overflow-x-auto rounded-lg border border-white/10">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead className="bg-[#18181b] text-gray-400 border-b border-white/10">
                    <tr>
                      <th className="px-4 py-3 font-medium">Contacto</th>
                      <th className="px-4 py-3 font-medium">Empresa</th>
                      <th className="px-4 py-3 font-medium">Email / Teléfono</th>
                      <th className="px-4 py-3 font-medium">Etiquetas</th>
                      <th className="px-4 py-3 font-medium">Origen</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredContacts.map((c: any) => (
                      <tr
                        key={c.id}
                        onClick={() => setDetailContact(c)}
                        className="hover:bg-white/5 transition-colors cursor-pointer"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <Avatar url={c.photo_url} name={`${c.first_name} ${c.last_name || ""}`} />
                            <div className="min-w-0">
                              <p className="font-semibold truncate">{c.first_name} {c.last_name || ""}</p>
                              {c.source && (
                                <p className="text-[11px] text-gray-500">{c.source}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {c.company ? (
                            <div className="flex items-center gap-2 min-w-0">
                              <Avatar url={c.company.logo_url} name={c.company.name} className="h-6 w-6 text-[10px]" />
                              <span className="truncate text-gray-300">{c.company.name}</span>
                            </div>
                          ) : (
                            <span className="text-gray-500">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-300">
                          {c.email ? (
                            <a href={`mailto:${c.email}`} className="hover:text-[#2093c4]" onClick={(e) => e.stopPropagation()}>{c.email}</a>
                          ) : "—"}
                          {c.phone && <span className="block text-xs text-gray-400">{c.phone}</span>}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {(c.tags || []).map((tg: string, i: number) => (
                              <span key={i} className="px-1.5 py-0.5 text-[11px] rounded bg-[#8c52ff]/15 text-[#c4b5fd] border border-[#8c52ff]/25">
                                {tg}
                              </span>
                            ))}
                            {(c.tags || []).length === 0 && <span className="text-gray-500">—</span>}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            <button
                              onClick={(e) => { e.stopPropagation(); setContactModal({ edit: c }); }}
                              className="px-2 py-1 text-[11px] rounded border border-white/10 text-gray-300 hover:bg-white/5 cursor-pointer"
                            >
                              Editar
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredContacts.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                          No hay contactos. Crea uno con "+ Contacto".
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ============ EMPRESAS ============ */}
          {subtab === "companies" && (
            <div className="overflow-x-auto rounded-lg border border-white/10">
              <table className="w-full min-w-[680px] text-left text-sm">
                <thead className="bg-[#18181b] text-gray-400 border-b border-white/10">
                  <tr>
                    <th className="px-4 py-3 font-medium">Empresa</th>
                    <th className="px-4 py-3 font-medium">Industria</th>
                    <th className="px-4 py-3 font-medium">Contactos</th>
                    <th className="px-4 py-3 font-medium">Deals</th>
                    <th className="px-4 py-3 font-medium">Dominio</th>
                    <th className="px-4 py-3 font-medium"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {companies.map((c: any) => (
                    <tr key={c.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Avatar url={c.logo_url} name={c.name} />
                          <div className="min-w-0">
                            <p className="font-semibold truncate">{c.name}</p>
                            {c.notes && <p className="text-[11px] text-gray-500 truncate max-w-[240px]">{c.notes}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-300">{c.industry || "—"}</td>
                      <td className="px-4 py-3 tabular-nums">{c.contact_count ?? 0}</td>
                      <td className="px-4 py-3 tabular-nums">{c.deal_count ?? 0}</td>
                      <td className="px-4 py-3 text-gray-400">
                        {c.domain ? (
                          <a href={`https://${c.domain}`} target="_blank" rel="noreferrer" className="hover:text-[#2093c4]">
                            {c.domain}
                          </a>
                        ) : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setCompanyModal({ edit: c })}
                          className="px-2 py-1 text-[11px] rounded border border-white/10 text-gray-300 hover:bg-white/5 cursor-pointer"
                        >
                          Editar
                        </button>
                      </td>
                    </tr>
                  ))}
                  {companies.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                        No hay empresas. Crea una con "+ Empresa" (el logo se obtiene del dominio automáticamente).
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* ============ PIPELINE ============ */}
          {subtab === "pipeline" && (
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
              {stages.map((st: any) => (
                <div key={st.id} className="w-[260px] shrink-0 rounded-lg border border-white/10 bg-[#0f1113]">
                  <div className="flex items-center justify-between px-3 py-2.5 border-b border-white/10">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: st.color }} />
                      <span className="text-sm font-semibold truncate">{st.name}</span>
                      <span className="text-[11px] text-gray-400">({(dealsByStage[st.id] || []).length})</span>
                    </div>
                    <button
                      onClick={() => setDealModal({ stage_id: st.id })}
                      className="text-gray-400 hover:text-white px-1.5 py-0.5 rounded hover:bg-white/10 cursor-pointer text-sm"
                      title="Nuevo deal en esta etapa"
                    >
                      +
                    </button>
                  </div>
                  <div className="p-2 space-y-2">
                    {(dealsByStage[st.id] || []).map((d: any) => (
                      <div
                        key={d.id}
                        className="rounded-lg border border-white/10 bg-[#15171a] p-3 hover:border-white/25 transition-colors cursor-pointer"
                        onClick={() => setDealModal({ edit: d })}
                      >
                        <p className="text-sm font-semibold truncate">{d.title}</p>
                        <div className="mt-1.5 space-y-1 text-[11px] text-gray-400">
                          {d.contact && (
                            <p className="flex items-center gap-1.5 truncate">
                              <Avatar url={d.contact.photo_url} name={`${d.contact.first_name} ${d.contact.last_name || ""}`} className="h-5 w-5 text-[9px]" />
                              <span className="truncate">{d.contact.first_name} {d.contact.last_name || ""}</span>
                            </p>
                          )}
                          <p className="flex items-center gap-1.5 truncate">
                            {d.company?.logo_url ? (
                              <Avatar url={d.company.logo_url} name={d.company.name} className="h-5 w-5 text-[9px]" />
                            ) : (
                              <span className="text-gray-600">—</span>
                            )}
                            {d.company?.name && <span className="truncate">{d.company.name}</span>}
                          </p>
                          <div className="flex items-center justify-between pt-1">
                            <span className="text-sm text-white font-bold tabular-nums">{fmtMoney(d.value, d.currency)}</span>
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                              d.probability >= 80 ? "bg-green-500/15 text-green-400" : "bg-[#2093c4]/15 text-[#7cc7e0]"
                            }`}>
                              {d.probability}%
                            </span>
                          </div>
                          {d.expected_close_date && (
                            <p className="text-[10px] text-gray-500">Cierre: {fmtDate(d.expected_close_date)}</p>
                          )}
                        </div>
                        <div className="mt-2 flex gap-1">
                          {stages
                            .filter((s2: any) => s2.position === st.position - 1)
                            .map((s2: any) => (
                              <button key={s2.id} onClick={(e) => { e.stopPropagation(); handleMoveStage(d.id, s2.id); }} className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-gray-300 hover:bg-white/15 cursor-pointer" title={`Mover a ${s2.name}`}>←</button>
                            ))}
                          {stages
                            .filter((s2: any) => s2.position === st.position + 1)
                            .map((s2: any) => (
                              <button key={s2.id} onClick={(e) => { e.stopPropagation(); handleMoveStage(d.id, s2.id); }} className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-gray-300 hover:bg-white/15 cursor-pointer" title={`Mover a ${s2.name}`}>→</button>
                            ))}
                        </div>
                      </div>
                    ))}
                    {(dealsByStage[st.id] || []).length === 0 && (
                      <p className="text-center text-[11px] text-gray-600 py-3">Sin deals</p>
                    )}
                  </div>
                </div>
              ))}
              {stages.length === 0 && (
                <div className="w-full text-center py-8 text-gray-500">No hay etapas configuradas.</div>
              )}
            </div>
          )}

          {/* ============ ACTIVIDADES ============ */}
          {subtab === "activities" && (
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                <select
                  value={actFilterContact}
                  onChange={(e) => setActFilterContact(e.target.value)}
                  className={inputCls + " sm:max-w-xs"}
                >
                  <option value="">Todas las personas</option>
                  {contacts.map((c: any) => (
                    <option key={c.id} value={c.id}>{c.first_name} {c.last_name || ""}</option>
                  ))}
                </select>
                <button className={btnPrimary} onClick={() => setActivityModal({})}>+ Actividad</button>
              </div>
              <div className="overflow-x-auto rounded-lg border border-white/10">
                <table className="w-full min-w-[700px] text-left text-sm">
                  <thead className="bg-[#18181b] text-gray-400 border-b border-white/10">
                    <tr>
                      <th className="px-4 py-3 font-medium">Tipo</th>
                      <th className="px-4 py-3 font-medium">Asunto</th>
                      <th className="px-4 py-3 font-medium">Persona</th>
                      <th className="px-4 py-3 font-medium">Fecha límite</th>
                      <th className="px-4 py-3 font-medium text-center">Hecho</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredActivities.map((a: any) => (
                      <tr key={a.id} className="hover:bg-white/5 transition-colors">
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 text-[11px] rounded font-semibold ${
                            a.type === "email" ? "bg-[#2093c4]/15 text-[#7cc7e0]"
                            : a.type === "call" ? "bg-emerald-500/15 text-emerald-400"
                            : a.type === "task" ? "bg-amber-500/15 text-amber-400"
                            : a.type === "meeting" ? "bg-fuchsia-500/15 text-fuchsia-400"
                            : "bg-white/5 text-gray-300"
                          }`}>
                            {TYPE_LABEL[a.type] || a.type}
                          </span>
                        </td>
                        <td className="px-4 py-3 min-w-[220px]">
                          <p className={`font-medium ${a.done ? "line-through text-gray-500" : ""}`}>{a.subject}</p>
                          {a.body && <p className="text-xs text-gray-400 mt-0.5 line-clamp-2 whitespace-pre-line">{a.body}</p>}
                          {a.deal && <p className="text-[11px] text-gray-500 mt-0.5">Deal: {a.deal.title}</p>}
                        </td>
                        <td className="px-4 py-3">
                          {a.contact ? (
                            <div className="flex items-center gap-2">
                              <Avatar url={a.contact.photo_url} name={`${a.contact.first_name} ${a.contact.last_name || ""}`} className="h-6 w-6 text-[10px]" />
                              <span className="truncate">{a.contact.first_name} {a.contact.last_name || ""}</span>
                            </div>
                          ) : <span className="text-gray-500">—</span>}
                        </td>
                        <td className="px-4 py-3 text-gray-400">
                          {a.due_date ? fmtDate(a.due_date) : "—"}
                          <span className="block text-[10px]">{fmtDateTime(a.created_at)}</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <input
                            type="checkbox"
                            checked={!!a.done}
                            onChange={() => toggleActivity(a)}
                            className="w-4 h-4 accent-[#2093c4] cursor-pointer"
                          />
                        </td>
                      </tr>
                    ))}
                    {filteredActivities.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                          No hay actividades. Crea una con "+ Actividad".
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* ============ LEADS Y VISITANTES ============ */}
          {subtab === "leads" && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="rounded-lg border border-white/10 bg-[#0f1113]">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                    <h3 className="font-semibold text-sm">Leads</h3>
                    <span className="text-xs text-gray-400">
                      {leadsData.converted} convertidos · {leadsData.items?.length - (leadsData.converted || 0)} por tratar
                    </span>
                  </div>
                  <div className="divide-y divide-white/5 max-h-[420px] overflow-y-auto">
                    {(leadsData.items || []).map((l: any) => (
                      <div key={l.id} className="flex items-center justify-between gap-2 px-4 py-2.5 hover:bg-white/5">
                        <div className="min-w-0 mr-2">
                          <p className="text-sm text-gray-200 truncate">
                            <span className="px-1.5 py-0.5 text-[10px] rounded bg-white/10 mr-1.5 capitalize">{l.source}</span>
                            {l.name || l.email || l.topic || "Lead sin datos"}
                          </p>
                          {l.email && <p className="text-[11px] text-gray-500 truncate">{l.email}</p>}
                          {l.topic && !l.name && !l.email && <p className="text-[11px] text-gray-500 truncate">{l.topic}</p>}
                          <p className="text-[10px] text-gray-600">{fmtDate(l.created_at)}</p>
                        </div>
                        {l.converted_at ? (
                          <span className="px-2 py-1 text-[11px] rounded bg-green-500/10 text-green-400 border border-green-500/30 shrink-0">En CRM</span>
                        ) : (
                          <button
                            onClick={() => handleConvertLead(l.id)}
                            disabled={convertingLeadId === l.id}
                            className="px-3 py-1.5 text-[11px] rounded bg-[#8c52ff]/20 text-[#c4b5fd] border border-[#8c52ff]/40 hover:bg-[#8c52ff]/30 cursor-pointer disabled:opacity-50 shrink-0 font-semibold"
                          >
                            {convertingLeadId === l.id ? "Convirtiendo…" : "+ Contacto"}
                          </button>
                        )}
                      </div>
                    ))}
                    {(leadsData.items || []).length === 0 && (
                      <p className="px-4 py-8 text-center text-gray-500 text-sm">Sin leads todavía</p>
                    )}
                  </div>
                </div>

                <div className="rounded-lg border border-white/10 bg-[#0f1113]">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                    <h3 className="font-semibold text-sm">Visitantes del portfolio</h3>
                    <span className="text-xs text-gray-400">
                      <span className="text-white font-semibold">{visitorsData.today}</span> hoy · {visitorsData.total} total
                    </span>
                  </div>
                  <div className="divide-y divide-white/5 max-h-[420px] overflow-y-auto">
                    {(visitorsData.recent || []).map((v: any, i: number) => (
                      <div key={i} className="flex items-center justify-between gap-2 px-4 py-2.5">
                        <div className="min-w-0">
                          <p className="text-sm text-gray-200 font-mono truncate">{v.page || "—"}</p>
                          {v.referrer && <p className="text-[11px] text-gray-500 truncate">desde {v.referrer}</p>}
                        </div>
                        <span className="text-[11px] text-gray-500 shrink-0">{fmtDateTime(v.created_at)}</span>
                      </div>
                    ))}
                    {(visitorsData.recent || []).length === 0 && (
                      <p className="px-4 py-8 text-center text-gray-500 text-sm">Sin visitas registradas</p>
                    )}
                  </div>
                  <p className="px-4 py-2 text-[10px] text-gray-600 border-t border-white/10">
                    Una visita por sesión + página + día (dedupe automático).
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ============ EMAILS ============ */}
          {subtab === "emails" && (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-gray-400">
                  Plantillas con placeholders —{" "}
                  <code className="text-[#7cc7e0]">{"{{contact.first_name}}"}</code>,{" "}
                  <code className="text-[#7cc7e0]">{"{{company.name}}"}</code>,{" "}
                  <code className="text-[#7cc7e0]">{"{{deal.title}}"}</code>,{" "}
                  <code className="text-[#7cc7e0]">{"{{deal.value}}"}</code>…
                </p>
                <button className={btnPrimary} onClick={() => setTemplateModal({})}>+ Plantilla</button>
              </div>

              <div className="rounded-lg border border-white/10 bg-[#0f1113]">
                <div className="px-4 py-3 border-b border-white/10">
                  <h3 className="font-semibold text-sm">Plantillas</h3>
                </div>
                <div className="divide-y divide-white/5">
                  {(emailTemplates || []).map((t: any) => (
                    <div key={t.id} className="flex items-center justify-between gap-2 px-4 py-2.5 hover:bg-white/5">
                      <div className="min-w-0 mr-2">
                        <p className="text-sm text-gray-200 truncate">
                          <span className="px-1.5 py-0.5 text-[10px] rounded bg-white/10 mr-1.5">{t.is_active ? "activa" : "pausada"}</span>
                          {t.name}
                        </p>
                        <p className="text-[11px] text-gray-500 truncate">{t.subject}</p>
                      </div>
                      <div className="flex gap-1.5 shrink-0">
                        <button onClick={() => setTemplateModal({ edit: t })} className="text-[11px] px-2 py-1 rounded bg-white/10 hover:bg-white/20 cursor-pointer">
                          Editar
                        </button>
                        <button onClick={() => setSendModal({ contact_id: "" })} className="text-[11px] px-2 py-1 rounded bg-[#8c52ff]/20 border border-[#8c52ff]/40 text-[#c4b5fd] hover:bg-[#8c52ff]/30 cursor-pointer">
                          Enviar
                        </button>
                        <button onClick={() => handleDeleteTemplate(t.id)} className="text-[11px] px-2 py-1 rounded bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 cursor-pointer">
                          Eliminar
                        </button>
                      </div>
                    </div>
                  ))}
                  {(emailTemplates || []).length === 0 && (
                    <p className="px-4 py-8 text-center text-gray-500 text-sm">Sin plantillas. Crea una para poder enviar emails.</p>
                  )}
                </div>
              </div>

              <div className="rounded-lg border border-white/10 bg-[#0f1113]">
                <div className="px-4 py-3 border-b border-white/10">
                  <h3 className="font-semibold text-sm">Envíos recientes</h3>
                </div>
                <div className="divide-y divide-white/5">
                  {(emailLog || []).map((e: any) => {
                    const st = sendStatus(e.status);
                    return (
                      <div key={e.id} className="flex items-center justify-between gap-2 px-4 py-2.5">
                        <div className="min-w-0 mr-2">
                          <p className="text-sm text-gray-200 truncate">
                            {e.subject || "(sin asunto)"}
                          </p>
                          <p className="text-[11px] text-gray-500 truncate">
                            → {e.to_email}
                            {e.contact?.email && <span> · {e.contact.first_name || ""} {e.contact.last_name || ""}</span>}
                          </p>
                          {e.error && <p className="text-[11px] text-red-400 truncate" title={e.error}>{e.error}</p>}
                        </div>
                        <span className="text-[11px] text-gray-500 shrink-0">{fmtDateTime(e.created_at)}</span>
                        <span className={`px-2 py-0.5 text-[10px] rounded border shrink-0 ${st.cls}`}>{st.label}</span>
                      </div>
                    );
                  })}
                  {(emailLog || []).length === 0 && (
                    <p className="px-4 py-8 text-center text-gray-500 text-sm">Sin envíos todavía.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ============ CONTRATOS ============ */}
          {subtab === "contracts" && (
            <div className="space-y-4">
              <p className="text-xs text-gray-400">
                Contratos con link público protegido por contraseña. Al firmarlo ambas
                partes queda descargable en PDF.
              </p>
              {contractPassword && (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm">
                  <span className="text-gray-300">
                    Contraseña de acceso:{" "}
                    <span className="font-mono font-bold text-white select-all tracking-widest">{contractPassword}</span>
                  </span>
                  <button
                    onClick={() => {
                      navigator.clipboard?.writeText(contractPassword);
                      setContractPassword(null);
                    }}
                    className="px-3 py-1 text-[11px] rounded bg-white/10 hover:bg-white/20 cursor-pointer"
                  >
                    Copiada — cerrar
                  </button>
                </div>
              )}
              <div className="overflow-x-auto rounded-lg border border-white/10">
                <table className="w-full min-w-[900px] text-left text-sm">
                  <thead className="bg-[#18181b] text-gray-400 border-b border-white/10">
                    <tr>
                      <th className="px-4 py-2.5 font-semibold">Contrato</th>
                      <th className="px-4 py-2.5 font-semibold">Cliente</th>
                      <th className="px-4 py-2.5 font-semibold">Importe</th>
                      <th className="px-4 py-2.5 font-semibold">Estado</th>
                      <th className="px-4 py-2.5 font-semibold">Enlace</th>
                      <th className="px-4 py-2.5 font-semibold">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {(contracts || []).map((c) => (
                      <tr key={c.id} className="hover:bg-white/5">
                        <td className="px-4 py-2.5">
                          <span className="font-medium">{c.title}</span>
                          <span className="block text-[10px] text-gray-500">Creado {fmtDate(c.created_at)}</span>
                        </td>
                        <td className="px-4 py-2.5 text-gray-300">
                          {c.client_name || c.contact?.first_name || "—"}
                          {c.company?.name && (
                            <span className="block text-[11px] text-gray-500">{c.company.name}</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 tabular-nums">
                          {c.value != null ? fmtMoney(Number(c.value), c.currency) : "—"}
                        </td>
                        <td className="px-4 py-2.5">
                          {c.signed_at ? (
                            <span className="px-2 py-0.5 text-[11px] rounded bg-green-500/10 text-green-400 border border-green-500/30">Firmado ✓</span>
                          ) : c.client_signed_at || c.provider_signed_at ? (
                            <span className="px-2 py-0.5 text-[11px] rounded bg-amber-500/10 text-amber-400 border border-amber-500/30">
                              Firma parcial
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 text-[11px] rounded bg-white/10 text-gray-300 border border-white/10">Enviado</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5">
                          <button
                            onClick={() => {
                              navigator.clipboard?.writeText(`${window.location.origin}/contracts/${c.slug}`);
                              alert("Enlace copiado");
                            }}
                            className="text-[11px] px-2 py-1 rounded bg-[#8c52ff]/20 border border-[#8c52ff]/40 text-[#c4b5fd] hover:bg-[#8c52ff]/30 cursor-pointer"
                          >
                            Copiar link
                          </button>
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="flex gap-1.5 flex-wrap">
                            <button onClick={() => handleSignProvider(c)} disabled={!!c.provider_signed_at} className="text-[11px] px-2 py-1 rounded bg-white/10 hover:bg-white/20 cursor-pointer disabled:opacity-40">
                              {c.provider_signed_at ? "Firmado" : "Firmar"}
                            </button>
                            <button onClick={() => handleRegenPassword(c)} className="text-[11px] px-2 py-1 rounded bg-white/10 hover:bg-white/20 cursor-pointer">Clave</button>
                            <button onClick={() => setContractModal({ edit: c })} className="text-[11px] px-2 py-1 rounded bg-white/10 hover:bg-white/20 cursor-pointer">Editar</button>
                            <button onClick={() => handleDeleteContract(c.id)} disabled={!!c.signed_at} className="text-[11px] px-2 py-1 rounded bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 cursor-pointer disabled:opacity-40">
                              Eliminar
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {(contracts || []).length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                          Sin contratos.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ============ MODAL CONTACTO ============ */}
      <Modal
        open={!!contactModal}
        title={contactModal?.edit ? "Editar contacto" : "Nuevo contacto"}
        onClose={() => setContactModal(null)}
      >
        <form onSubmit={handleSaveContact} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Nombre *">
              <input name="first_name" required defaultValue={contactModal?.edit?.first_name || ""} className={inputCls} placeholder="Nombre" />
            </Field>
            <Field label="Apellido">
              <input name="last_name" defaultValue={contactModal?.edit?.last_name || ""} className={inputCls} placeholder="Apellido" />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Email">
              <input name="email" type="email" defaultValue={contactModal?.edit?.email || ""} className={inputCls} placeholder="correo@dominio.com" />
            </Field>
            <Field label="Teléfono">
              <input name="phone" defaultValue={contactModal?.edit?.phone || ""} className={inputCls} placeholder="+57 …" />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Empresa">
              <select name="company_id" defaultValue={contactModal?.edit?.company_id || ""} className={inputCls}>
                <option value="">Sin empresa</option>
                {companies.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </Field>
            <Field label="Origen">
              <select name="source" defaultValue={contactModal?.edit?.source || "manual"} className={inputCls}>
                <option value="manual">Manual</option>
                <option value="tally">Tally</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="portfolio">Portfolio</option>
              </select>
            </Field>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setContactModal(null)} className={btnGhost}>Cancelar</button>
            <button type="submit" disabled={saving} className={btnPrimary}>{saving ? "Guardando…" : "Guardar"}</button>
          </div>
        </form>
      </Modal>

      {/* ============ MODAL EMPRESA ============ */}
      <Modal
        open={!!companyModal}
        title={companyModal?.edit ? "Editar empresa" : "Nueva empresa"}
        onClose={() => setCompanyModal(null)}
      >
        <form onSubmit={handleSaveCompany} className="space-y-3">
          <Field label="Nombre *">
            <input name="name" required defaultValue={companyModal?.edit?.name || ""} className={inputCls} placeholder="Nombre de la empresa" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Dominio (obtiene el logo)">
              <input name="domain" defaultValue={companyModal?.edit?.domain || ""} className={inputCls} placeholder="dominio.com" />
            </Field>
            <Field label="Industria">
              <input name="industry" defaultValue={companyModal?.edit?.industry || ""} className={inputCls} placeholder="Ej: SaaS, Desarrollo…" />
            </Field>
          </div>
          <Field label="Notas">
            <textarea name="notes" rows={3} defaultValue={companyModal?.edit?.notes || ""} className={inputCls} placeholder="Detalles/contexto" />
          </Field>
          {companyModal?.edit?.logo_url && (
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <Avatar url={companyModal.edit.logo_url} name={companyModal.edit.name} className="h-6 w-6 text-[10px]" />
              Logo actual (se actualiza automáticamente al cambiar el dominio)
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setCompanyModal(null)} className={btnGhost}>Cancelar</button>
            <button type="submit" disabled={saving} className={btnPrimary}>{saving ? "Guardando…" : "Guardar"}</button>
          </div>
        </form>
      </Modal>

      {/* ============ MODAL DEAL ============ */}
      <Modal
        open={!!dealModal}
        title={dealModal?.edit ? "Editar deal" : "Nuevo deal"}
        onClose={() => setDealModal(null)}
      >
        <form onSubmit={handleSaveDeal} className="space-y-3">
          <Field label="Título *">
            <input name="title" required defaultValue={dealModal?.edit?.title || ""} className={inputCls} placeholder="Ej: Web corporativa" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Contacto">
              <select name="contact_id" defaultValue={dealModal?.edit?.contact_id || ""} className={inputCls}>
                <option value="">Sin contacto</option>
                {contacts.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.first_name} {c.last_name || ""}</option>
                ))}
              </select>
            </Field>
            <Field label="Empresa">
              <select name="company_id" defaultValue={dealModal?.edit?.company_id || ""} className={inputCls}>
                <option value="">Sin empresa</option>
                {companies.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="Etapa">
            <select name="stage_id" defaultValue={dealModal?.edit?.stage_id || dealModal?.stage_id || ""} className={inputCls}>
              {(stages || []).map((sg: any) => (
                <option key={sg.id} value={sg.id}>{sg.name}</option>
              ))}
            </select>
          </Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Valor">
              <input name="value" type="number" step="0.01" defaultValue={dealModal?.edit?.value ?? 0} className={inputCls} />
            </Field>
            <Field label="Moneda">
              <select name="currency" defaultValue={dealModal?.edit?.currency || "COP"} className={inputCls}>
                <option>COP</option>
                <option>USD</option>
                <option>EUR</option>
                <option>MXN</option>
              </select>
            </Field>
            <Field label="Prob. %">
              <input name="probability" type="number" min="0" max="100" defaultValue={dealModal?.edit?.probability ?? 10} className={inputCls} />
            </Field>
          </div>
          <Field label="Cierre esperado">
            <input name="expected_close_date" type="date" defaultValue={dealModal?.edit?.expected_close_date || ""} className={inputCls} />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setDealModal(null)} className={btnGhost}>Cancelar</button>
            <button type="submit" disabled={saving} className={btnPrimary}>{saving ? "Guardando…" : "Guardar"}</button>
          </div>
        </form>
      </Modal>

      {/* ============ MODAL ACTIVIDAD ============ */}
      <Modal
        open={!!activityModal}
        title={activityModal?.edit ? "Editar actividad" : "Nueva actividad"}
        onClose={() => setActivityModal(null)}
      >
        <form onSubmit={handleSaveActivity} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Tipo">
              <select name="type" defaultValue={activityModal?.edit?.type || "note"} className={inputCls}>
                <option value="note">Nota</option>
                <option value="email">Email</option>
                <option value="call">Llamada</option>
                <option value="task">Tarea</option>
                <option value="meeting">Reunión</option>
              </select>
            </Field>
            <Field label="Fecha límite">
              <input name="due_date" type="date" defaultValue={activityModal?.edit?.due_date || ""} className={inputCls} />
            </Field>
          </div>
          <Field label="Asunto *">
            <input name="subject" required defaultValue={activityModal?.edit?.subject || ""} className={inputCls} placeholder="Asunto" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Persona">
              <select name="contact_id" defaultValue={activityModal?.edit?.contact_id || ""} className={inputCls}>
                <option value="">Sin persona</option>
                {contacts.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.first_name} {c.last_name || ""}</option>
                ))}
              </select>
            </Field>
            <Field label="Deal">
              <select name="deal_id" defaultValue={activityModal?.edit?.deal_id || ""} className={inputCls}>
                <option value="">Sin deal</option>
                {deals.map((d: any) => (
                  <option key={d.id} value={d.id}>{d.title}</option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="Detalle">
            <textarea name="body" rows={3} defaultValue={activityModal?.edit?.body || ""} className={inputCls} placeholder="Notas / seguimiento" />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setActivityModal(null)} className={btnGhost}>Cancelar</button>
            <button type="submit" disabled={saving} className={btnPrimary}>{saving ? "Guardando…" : "Guardar"}</button>
          </div>
        </form>
      </Modal>

      {/* ============ DETALLE CONTACTO ============ */}
      <Modal open={!!detailContact} title={detailContact ? `${detailContact.first_name} ${detailContact.last_name || ""}` : ""} onClose={() => setDetailContact(null)}>
        {detailContact && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Avatar url={detailContact.photo_url} name={`${detailContact.first_name} ${detailContact.last_name || ""}`} className="h-14 w-14 text-xl" />
              <div className="min-w-0">
                <p className="text-sm text-gray-400 break-all">{detailContact.email || "Sin email"}</p>
                <p className="text-sm text-gray-400">{detailContact.phone || "Sin teléfono"}</p>
                {detailContact.company && (
                  <div className="flex items-center gap-1.5 mt-1">
                    <Avatar url={detailContact.company.logo_url} name={detailContact.company.name} className="h-5 w-5 text-[9px]" />
                    <span className="text-sm text-[#7cc7e0]">{detailContact.company.name}</span>
                  </div>
                )}
              </div>
            </div>
            {(detailContact.tags || []).length > 0 && (
              <div className="flex flex-wrap gap-1">
                {(detailContact.tags || []).map((tg: string, i: number) => (
                  <span key={i} className="px-2 py-0.5 text-[11px] rounded bg-[#8c52ff]/15 text-[#c4b5fd] border border-[#8c52ff]/25">{tg}</span>
                ))}
              </div>
            )}
            {detailContact.notes && (
              <p className="text-sm text-gray-300 whitespace-pre-line border-t border-white/10 pt-3">{detailContact.notes}</p>
            )}
            <div className="border-t border-white/10 pt-3">
              <h4 className="text-sm font-semibold mb-2">Deals</h4>
              {deals.filter((d: any) => d.contact_id === detailContact.id).map((d: any) => (
                <div key={d.id} className="flex items-center justify-between text-sm py-1.5">
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: d.stage?.color || "#888" }} />
                    {d.title}
                  </span>
                  <span className="text-gray-400 font-semibold tabular-nums">{fmtMoney(d.value, d.currency)}</span>
                </div>
              ))}
              {deals.filter((d: any) => d.contact_id === detailContact.id).length === 0 && (
                <p className="text-xs text-gray-500">Sin deals asociados.</p>
              )}
            </div>
            <div className="border-t border-white/10 pt-3">
              <h4 className="text-sm font-semibold mb-2">Actividades</h4>
              <div className="space-y-2 max-h-52 overflow-y-auto">
                {activities.filter((a: any) => a.contact_id === detailContact.id).map((a: any) => (
                  <div key={a.id} className="text-sm bg-white/5 rounded-md p-2">
                    <span className="px-1.5 py-0.5 text-[10px] rounded bg-white/10 text-gray-300 mr-1.5">{TYPE_LABEL[a.type] || a.type}</span>
                    <span className={a.done ? "line-through text-gray-500" : ""}>{a.subject}</span>
                    <p className="text-[11px] text-gray-500 mt-0.5">{fmtDateTime(a.created_at)}</p>
                  </div>
                ))}
                {activities.filter((a: any) => a.contact_id === detailContact.id).length === 0 && (
                  <p className="text-xs text-gray-500">Sin actividades.</p>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button onClick={() => setContactModal({ edit: detailContact })} className={btnPrimary}>Editar</button>
              <button onClick={() => setActivityModal({ contact_id: detailContact.id })} className={btnPrimary}>+ Actividad</button>
              <button onClick={() => setSendModal({ contact_id: detailContact.id })} className={btnPrimary}>Enviar email</button>
            </div>
          </div>
        )}
      </Modal>

      {/* ============ MODAL PLANTILLA ============ */}
      <Modal
        open={!!templateModal}
        title={templateModal?.edit ? "Editar plantilla" : "Nueva plantilla"}
        onClose={() => setTemplateModal(null)}
      >
        <form onSubmit={handleSaveTemplate} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Nombre *">
              <input name="name" required defaultValue={templateModal?.edit?.name || ""} className={inputCls} placeholder="Oferta inicial" />
            </Field>
            <Field label="Estado">
              <select name="is_active" defaultValue={templateModal?.edit ? (templateModal.edit.is_active ? "true" : "false") : "true"} className={inputCls}>
                <option value="true">Activa</option>
                <option value="false">Pausada</option>
              </select>
            </Field>
          </div>
          <Field label="Asunto *">
            <input name="subject" required defaultValue={templateModal?.edit?.subject || ""} className={inputCls} placeholder="Propuesta de alcance para {{contact.first_name}}" />
          </Field>
          <Field label="Cuerpo (texto plano, con placeholders)">
            <textarea name="body" rows={6} defaultValue={templateModal?.edit?.body || ""} className={inputCls + " font-mono text-xs"} placeholder={"Hola {{contact.first_name}},\n\n…" } />
          </Field>
          <p className="text-[10px] text-gray-500">
            Placeholders disponibles:{" "}
              {"{{contact.first_name}}, {{contact.full_name}}, {{company.name}}, {{deal.title}}, {{deal.value}}"}
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setTemplateModal(null)} className={btnGhost}>Cancelar</button>
            <button type="submit" disabled={saving} className={btnPrimary}>{saving ? "Guardando…" : "Guardar"}</button>
          </div>
        </form>
      </Modal>

      {/* ============ MODAL ENVÍO DE EMAIL ============ */}
      <Modal open={!!sendModal} title="Enviar email" onClose={() => setSendModal(null)}>
        {sendModal && (
          <SendEmailForm
            contacts={contacts}
            deals={deals}
            templates={emailTemplates}
            contactId={sendModal.contact_id}
            sending={sending}
            onSubmit={doSendEmail}
            onClose={() => setSendModal(null)}
            renderBody={renderBody}
          />
        )}
      </Modal>

      {/* ============ MODAL CONTRATO ============ */}
      <Modal
        open={!!contractModal}
        title={contractModal?.edit ? "Editar contrato" : "Nuevo contrato"}
        onClose={() => setContractModal(null)}
      >
        <form onSubmit={handleSaveContract} className="space-y-3">
          <Field label="Título *">
            <input name="title" required defaultValue={contractModal?.edit?.title || ""} className={inputCls} placeholder="Proyecto web — alcance inicial" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Contacto">
              <select name="contact_id" defaultValue={contractModal?.edit?.contact_id || contractModal?.edit?.contact?.id || ""} className={inputCls}>
                <option value="">Sin contacto</option>
                {contacts.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.first_name} {c.last_name || ""}</option>
                ))}
              </select>
            </Field>
            <Field label="Empresa">
              <select name="company_id" defaultValue={contractModal?.edit?.company_id || contractModal?.edit?.company?.id || ""} className={inputCls}>
                <option value="">Sin empresa</option>
                {companies.map((co: any) => (
                  <option key={co.id} value={co.id}>{co.name}</option>
                ))}
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Moneda">
              <select name="currency" defaultValue={contractModal?.edit?.currency || "EUR"} className={inputCls}>
                <option value="EUR">EUR — €</option>
                <option value="USD">USD — $</option>
                <option value="COP">COP — $</option>
              </select>
            </Field>
            <Field label="Importe">
              <input name="value" type="number" step="0.01" defaultValue={contractModal?.edit?.value ?? ""} className={inputCls} placeholder="0.00" />
            </Field>
          </div>
          <Field label="Condiciones *">
            <textarea name="terms" required rows={6} defaultValue={contractModal?.edit?.terms || ""} className={inputCls + " font-mono text-xs"} placeholder={"1. Alcance del proyecto\n2. Plazos\n3. Pagos\n…"} />
          </Field>
          {contractModal?.edit ? (
            <p className="text-[10px] text-gray-500">
              Editar no cambia la contraseña actual. La firma se gestiona desde la tabla.
            </p>
          ) : (
            <p className="text-[10px] text-gray-500">
              Al crear el contrato se genera la contraseña y el enlace público automáticamente.
            </p>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setContractModal(null)} className={btnGhost}>Cancelar</button>
            <button type="submit" disabled={saving} className={btnPrimary}>{saving ? "Guardando…" : "Guardar"}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function SendEmailForm({
  contacts,
  deals,
  templates,
  contactId,
  sending,
  onSubmit,
  onClose,
  renderBody,
}: {
  contacts: any[];
  deals: any[];
  templates: any[];
  contactId?: string;
  sending: boolean;
  onSubmit: (e: FormEvent) => void;
  onClose: () => void;
  renderBody: (t: string | undefined, c?: any, d?: any) => string;
}) {
  const [selContact, setSelContact] = useState(contactId || "");
  const [selTemplate, setSelTemplate] = useState("");
  const [selDeal, setSelDeal] = useState("");

  const contact = contacts.find((c) => c.id === selContact);
  const deal = deals.find((d) => d.id === selDeal);
  const template = templates.find((t) => t.id === selTemplate);

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <Field label="Contacto *">
        <select name="contact_id" required className={inputCls} value={selContact} onChange={(e) => setSelContact(e.target.value)}>
          <option value="">Selecciona…</option>
          {contacts.map((c: any) => (
            <option key={c.id} value={c.id}>
              {c.first_name} {c.last_name || ""} — {c.email || "sin email"}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Plantilla *">
        <select name="template_id" required className={inputCls} value={selTemplate} onChange={(e) => setSelTemplate(e.target.value)}>
          <option value="">Selecciona…</option>
          {templates.map((t: any) => (
            <option key={t.id} value={t.id}>{t.is_active ? "" : "[pausada] "}{t.name}</option>
          ))}
        </select>
      </Field>
      <Field label="Deal (opcional)">
        <select name="deal_id" className={inputCls} value={selDeal} onChange={(e) => setSelDeal(e.target.value)}>
          <option value="">Sin deal</option>
          {(deals || []).map((d: any) => (
            <option key={d.id} value={d.id}>{d.title}</option>
          ))}
        </select>
      </Field>
      {template && contact?.email && (
        <div className="rounded-lg border border-white/10 bg-white/5 p-3 space-y-2">
          <p className="text-xs text-gray-400">Vista previa (con datos del contacto):</p>
          <p className="text-sm font-semibold break-words">{renderBody(template.subject, contact, deal)}</p>
          <div className="text-[13px] text-gray-300 whitespace-pre-line break-words border-t border-white/10 pt-2">
            {renderBody(template.body, contact, deal)}
          </div>
        </div>
      )}
      {template && !contact?.email && (
        <p className="text-xs text-red-400">El contacto seleccionado no tiene email. Añádelo antes de enviar.</p>
      )}
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onClose} className={btnGhost}>Cancelar</button>
        <button type="submit" disabled={sending || !template || !contact?.email} className={btnPrimary}>
          {sending ? "Enviando…" : "Enviar"}
        </button>
      </div>
    </form>
  );
}