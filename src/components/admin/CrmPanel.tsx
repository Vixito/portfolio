import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { useTranslation } from "../../lib/i18n";
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
  importCrmContacts,
  importCrmCompanies,
  getCrmGoogleStatus,
  startCrmGoogleOAuth,
  syncCrmGoogleContacts,
  disconnectCrmGoogle,
  deleteCrmContact,
  deleteCrmCompany,
  deleteCrmDeal,
  deleteCrmActivity,
  getCrmFields,
  createCrmField,
  updateCrmField,
  deleteCrmField,
  createCrmContactByFields,
  updateCrmContactByFields,
  createCrmCompanyByFields,
  updateCrmCompanyByFields,
} from "../../lib/supabase-functions";
import {
  autoMapHeaders,
  dedupeRecords,
  isVCard,
  nameFromEmail,
  parseVCards,
  splitFullName,
  type ImportKind,
} from "../../lib/contactImport";
import RecordGrid from "./crm/RecordGrid";
import { AvatarView } from "./crm/RecordGrid";
import FieldManager from "./crm/FieldManager";
import RecordDrawer from "./crm/RecordDrawer";
import type { CrmEntity, CrmField, RecordRow } from "./crm/types";
import { setRecordField, tp } from "./crm/types";

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

// ============ panel principal ============

type SubTab = "contacts" | "companies" | "pipeline" | "activities" | "leads" | "emails" | "contracts" | "integrations";

export default function CrmPanel() {
  const { t } = useTranslation();
  const typeLabel = (ty: string) =>
    ({
      email: t("admin.crm.activityModal.typeEmail"),
      call: t("admin.crm.activityModal.typeCall"),
      note: t("admin.crm.activityModal.typeNote"),
      task: t("admin.crm.activityModal.typeTask"),
      meeting: t("admin.crm.activityModal.typeMeeting"),
    } as Record<string, string>)[ty] || ty;
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
  const [importing, setImporting] = useState(false);
  const [importPreview, setImportPreview] = useState<{
    kind: ImportKind;
    headers: string[];
    grid: string[][];
    mapping: Record<string, number>;
    unmatched: string[];
  } | null>(null);
  const contactsFileRef = useRef<HTMLInputElement>(null);
  const companiesFileRef = useRef<HTMLInputElement>(null);
  const [googleStatus, setGoogleStatus] = useState<any>(null);
  const [googleBusy, setGoogleBusy] = useState(false);

  const [actFilterContact, setActFilterContact] = useState("");

  // modales
  const [contactModal, setContactModal] = useState<any>(null); // {edit?: any} | null
  const [companyModal, setCompanyModal] = useState<any>(null);
  const [dealModal, setDealModal] = useState<any>(null); // {edit?: any, stage_id?}
  const [activityModal, setActivityModal] = useState<any>(null);
  const [detailContact, setDetailContact] = useState<any>(null);

  const [saving, setSaving] = useState(false);

  // ---- grid editable (estilo Notion) ----
  const [fieldsPerson, setFieldsPerson] = useState<CrmField[]>([]);
  const [fieldsCompany, setFieldsCompany] = useState<CrmField[]>([]);
  const [fieldsPanel, setFieldsPanel] = useState<CrmEntity | null>(null);
  const [newRowContact, setNewRowContact] = useState(false);
  const [newRowCompany, setNewRowCompany] = useState(false);
  const [creatingContact, setCreatingContact] = useState(false);
  const [creatingCompany, setCreatingCompany] = useState(false);
  const [drawerContact, setDrawerContact] = useState<RecordRow | null>(null);
  const [drawerCompany, setDrawerCompany] = useState<RecordRow | null>(null);
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set());
  const [selectedCompanies, setSelectedCompanies] = useState<Set<string>>(new Set());
  const [savingCells, setSavingCells] = useState<Record<string, boolean>>({});
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [comps, cons, stgs, dls, acts, lds, vst, tmps, emls, ctrs, fp, fc] = await Promise.all([
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
        getCrmFields("person"),
        getCrmFields("company"),
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
      setFieldsPerson(fp?.fields || []);
      setFieldsCompany(fc?.fields || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar el CRM");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const loadGoogleStatus = useCallback(async () => {
    try {
      const res = await getCrmGoogleStatus();
      setGoogleStatus(res);
    } catch {
      setGoogleStatus(null);
    }
  }, []);

  useEffect(() => {
    if (subtab === "integrations") loadGoogleStatus();
  }, [subtab, loadGoogleStatus]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("google")) {
      setSubtab("integrations");
      loadGoogleStatus();
      params.delete("google");
      const qs = params.toString();
      window.history.replaceState(
        {},
        "",
        window.location.pathname + (qs ? `?${qs}` : "")
      );
    }
  }, [loadGoogleStatus]);

  const handleGoogleConnect = async () => {
    setGoogleBusy(true);
    try {
      const res: any = await startCrmGoogleOAuth();
      if (res?.url) window.location.href = res.url;
    } catch (e) {
      alert(e instanceof Error ? e.message : t("admin.crm.integrationsTab.err"));
    } finally {
      setGoogleBusy(false);
    }
  };

  const handleGoogleSync = async () => {
    setGoogleBusy(true);
    try {
      const res: any = await syncCrmGoogleContacts();
      const r = res?.result || {};
      alert(
        `${t("admin.crm.integrationsTab.syncDone")}: +${r.inserted ?? 0} · ${
          r.linked ?? 0
        } ${t("admin.crm.integrationsTab.linked")} · ${r.skipped ?? 0} ${t(
          "admin.crm.integrationsTab.skipped"
        )}`
      );
      await Promise.all([loadGoogleStatus(), load()]);
    } catch (e) {
      alert(e instanceof Error ? e.message : t("admin.crm.integrationsTab.err"));
    } finally {
      setGoogleBusy(false);
    }
  };

  const handleGoogleDisconnect = async () => {
    if (!confirm(t("admin.crm.integrationsTab.confirmDisconnect"))) return;
    setGoogleBusy(true);
    try {
      await disconnectCrmGoogle();
      await loadGoogleStatus();
    } catch (e) {
      alert(e instanceof Error ? e.message : t("admin.crm.integrationsTab.err"));
    } finally {
      setGoogleBusy(false);
    }
  };

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

  // ============ grid editable (estilo Notion) ============

  const showNotice = (msg: string) => {
    setNotice(msg);
    window.setTimeout(() => setNotice(null), 4000);
  };

  const allTags = useMemo(() => {
    const set = new Set<string>();
    contacts.forEach((c) => (c.tags || []).forEach((tg: string) => set.add(tg)));
    companies.forEach((c) => (c.tags || []).forEach((tg: string) => set.add(tg)));
    return [...set].sort();
  }, [contacts, companies]);

  // El drawer debe renderizar el registro VIVO (no la foto tomada al abrirlo);
  // si no, ningún campo editado se vería "en vivo y en directo".
  const liveContact = drawerContact
    ? contacts.find((c) => c.id === drawerContact.id) ?? drawerContact
    : null;
  const liveCompany = drawerCompany
    ? companies.find((c) => c.id === drawerCompany.id) ?? drawerCompany
    : null;

  const markCellBusy = (recId: string, fieldName: string, on: boolean) =>
    setSavingCells((s) => ({ ...s, [`${recId}|${fieldName}`]: on }));

  const toggleSelect = (cur: Set<string>, setter: (n: Set<string>) => void, id: string) => {
    const n = new Set(cur);
    if (n.has(id)) n.delete(id);
    else n.add(id);
    setter(n);
  };

  // Guardado optimista de una celda: actualiza el estado al instante y revierte si falla.
  // Al conciliar con la respuesta se re-aplica el valor guardado para que la
  // celda nunca muestre un dato viejo aunque la respuesta venga incompleta.
  const commitCell = async (entity: CrmEntity, rec: RecordRow, field: CrmField, value: any) => {
    const setter = entity === "person" ? setContacts : setCompanies;
    const before = entity === "person" ? contacts : companies;
    setter((cur) => cur.map((r) => (r.id === rec.id ? setRecordField(r, field, value) : r)));
    markCellBusy(rec.id, field.name, true);
    try {
      const res =
        entity === "person"
          ? await updateCrmContactByFields(rec.id, { [field.name]: value })
          : await updateCrmCompanyByFields(rec.id, { [field.name]: value });
      if (res?.id) {
        setter((cur) =>
          cur.map((r) =>
            r.id === res.id
              ? setRecordField(
                  {
                    ...res,
                    contact_count: r.contact_count ?? res.contact_count,
                    deal_count: r.deal_count ?? res.deal_count,
                  },
                  field,
                  value
                )
              : r
          )
        );
      }
    } catch (e) {
      setter(before);
      showNotice(e instanceof Error ? e.message : t("admin.crm.grid.saveError"));
    } finally {
      markCellBusy(rec.id, field.name, false);
    }
  };

  // Creación de fila nueva en el grid (no optimista: necesita el id del servidor).
  const handleCreateRow = async (entity: CrmEntity, values: Record<string, any>) => {
    const fn = entity === "person" ? createCrmContactByFields : createCrmCompanyByFields;
    const setter = entity === "person" ? setContacts : setCompanies;
    const setBusy = entity === "person" ? setCreatingContact : setCreatingCompany;
    const setNewRow = entity === "person" ? setNewRowContact : setNewRowCompany;
    setBusy(true);
    try {
      const created = await fn(values);
      if (created?.id) {
        setter((cur) => [created, ...cur]);
        if (entity === "person") setDrawerContact(created);
        else setDrawerCompany(created);
      }
      setNewRow(false);
    } catch (e) {
      showNotice(e instanceof Error ? e.message : t("admin.crm.grid.createError"));
    } finally {
      setBusy(false);
    }
  };

  // Eliminación optimista de una fila desde el grid o el drawer.
  const handleRowDelete = async (entity: CrmEntity, rec: RecordRow) => {
    const msg =
      entity === "person" ? t("admin.crm.confirmDeleteContact") : t("admin.crm.confirmDeleteCompany");
    if (!window.confirm(msg)) return;
    const setter = entity === "person" ? setContacts : setCompanies;
    const before = entity === "person" ? contacts : companies;
    setter(before.filter((r) => r.id !== rec.id));
    if (entity === "person") setDrawerContact((d) => (d?.id === rec.id ? null : d));
    else setDrawerCompany((d) => (d?.id === rec.id ? null : d));
    try {
      await (entity === "person" ? deleteCrmContact(rec.id) : deleteCrmCompany(rec.id));
    } catch (e) {
      setter(before);
      showNotice(e instanceof Error ? e.message : t("admin.crm.errDelete"));
    }
  };

  // Eliminación masiva (checkboxes).
  const handleBulkDelete = async (entity: CrmEntity, ids: string[]) => {
    const label =
      entity === "person" ? t("admin.crm.contacts") : t("admin.crm.companiesTab.count");
    if (!window.confirm(`${tp(t("admin.crm.grid.deleteSelectedConfirm"), { n: ids.length })} ${label}?`)) return;
    const setter = entity === "person" ? setContacts : setCompanies;
    const before = entity === "person" ? contacts : companies;
    setter(before.filter((r) => !ids.includes(r.id)));
    if (entity === "person") {
      setSelectedContacts(new Set());
      setDrawerContact((d) => (d && ids.includes(d.id) ? null : d));
    } else {
      setSelectedCompanies(new Set());
      setDrawerCompany((d) => (d && ids.includes(d.id) ? null : d));
    }
    try {
      await Promise.all(ids.map((id) => (entity === "person" ? deleteCrmContact(id) : deleteCrmCompany(id))));
    } catch (e) {
      setter(before);
      showNotice(e instanceof Error ? e.message : t("admin.crm.errDelete"));
    }
  };

  // Edición masiva: aplica el mismo campo/valor a los seleccionados.
  // Reutiliza commitCell por fila (optimista + busy + revert individual).
  const handleBulkEdit = async (entity: CrmEntity, ids: string[], field: CrmField, value: any) => {
    const list = entity === "person" ? contacts : companies;
    const targets = ids
      .map((id) => list.find((r) => r.id === id))
      .filter((r) => r !== undefined);
    await Promise.all(targets.map((rec) => commitCell(entity, rec, field, value)));
    if (entity === "person") setSelectedContacts(new Set());
    else setSelectedCompanies(new Set());
  };

  // Campo nuevo en el panel de campos (propaga el error al formulario).
  const handleFieldCreate = async (entity: CrmEntity, values: Record<string, unknown>) => {
    const created = await createCrmField({ entity_type: entity, ...values });
    const setter = entity === "person" ? setFieldsPerson : setFieldsCompany;
    setter((cur) => [...cur, created]);
  };

  const handleFieldUpdate = async (id: string, patch: Partial<CrmField>) => {
    const applyTo = (setter: (updater: (cur: CrmField[]) => CrmField[]) => void) =>
      setter((cur: CrmField[]) => cur.map((f) => (f.id === id ? { ...f, ...patch } : f)));
    const prevP = fieldsPerson;
    const prevC = fieldsCompany;
    applyTo(setFieldsPerson);
    applyTo(setFieldsCompany);
    try {
      const res = await updateCrmField(id, patch);
      if (res?.id) {
        const setter = res.entity_type === "company" ? setFieldsCompany : setFieldsPerson;
        setter((cur: CrmField[]) =>
          cur.map((f) => (f.id === id ? { ...f, ...res } : f))
        );
      }
    } catch (e) {
      setFieldsPerson(prevP);
      setFieldsCompany(prevC);
      showNotice(e instanceof Error ? e.message : t("admin.crm.grid.saveError"));
    }
  };

  const handleFieldDelete = async (id: string) => {
    try {
      await deleteCrmField(id);
      setFieldsPerson((cur) => cur.filter((f) => f.id !== id));
      setFieldsCompany((cur) => cur.filter((f) => f.id !== id));
    } catch (e) {
      showNotice(e instanceof Error ? e.message : t("admin.crm.fields.error"));
    }
  };

  // Relación persona ↔ empresa desde el drawer.
  const handleSetContactCompany = async (rec: RecordRow, value: any) => {
    const before = contacts;
    setContacts(
      before.map((r) =>
        r.id === rec.id
          ? {
              ...r,
              company_id: value || null,
              company: value ? companies.find((c) => c.id === value) || r.company : null,
            }
          : r
      )
    );
    try {
      const res = await updateCrmContact(rec.id, { company_id: value || null });
      if (res?.id) setContacts((cur) => cur.map((r) => (r.id === res.id ? { ...r, ...res } : r)));
    } catch (e) {
      setContacts(before);
      showNotice(e instanceof Error ? e.message : t("admin.crm.grid.saveError"));
    }
  };

  // Origen de un contacto desde el drawer.
  const handleSetContactSource = async (rec: RecordRow, value: any) => {
    const before = contacts;
    setContacts(before.map((r) => (r.id === rec.id ? { ...r, source: value || "manual" } : r)));
    try {
      const res = await updateCrmContact(rec.id, { source: value || "manual" });
      if (res?.id) setContacts((cur) => cur.map((r) => (r.id === res.id ? { ...r, ...res } : r)));
    } catch (e) {
      setContacts(before);
      showNotice(e instanceof Error ? e.message : t("admin.crm.grid.saveError"));
    }
  };

  // ============ acciones ============

  const str = (fd: FormData, k: string) => {
    const v = String(fd.get(k) || "").trim();
    return v || null;
  };
  const strArr = (fd: FormData, k: string) =>
    String(fd.get(k) || "")
      .split(/[;,|]/)
      .map((s) => s.trim())
      .filter(Boolean);

  const handleSaveContact = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const form = new FormData(e.target as HTMLFormElement);
      const expRaw = String(form.get("experience_years") || "").trim();
      const payload = {
        company_id: (form.get("company_id") as string) || null,
        first_name: form.get("first_name") as string,
        last_name: (form.get("last_name") as string) || null,
        email: (form.get("email") as string) || null,
        phone: (form.get("phone") as string) || null,
        phone2: str(form, "phone2"),
        source: (form.get("source") as string) || "manual",
        job_title: str(form, "job_title"),
        birthdate: str(form, "birthdate"),
        gender: str(form, "gender"),
        linkedin: str(form, "linkedin"),
        github: str(form, "github"),
        x_handle: str(form, "x_handle"),
        website: str(form, "website"),
        address: str(form, "address"),
        experience_years: expRaw === "" ? null : Number(expRaw) || null,
        owner: str(form, "owner"),
        tags: strArr(form, "tags"),
        notes: str(form, "notes"),
      };
      if (contactModal?.edit) {
        await updateCrmContact(contactModal.edit.id, payload);
      } else {
        await createCrmContact(payload);
      }
      setContactModal(null);
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : t("admin.crm.errSaveContact"));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteContact = async (id: string) => {
    if (!window.confirm(t("admin.crm.confirmDeleteContact"))) return;
    try {
      await deleteCrmContact(id);
      setDetailContact(null);
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : t("admin.crm.errDelete"));
    }
  };

  const handleSaveCompany = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const form = new FormData(e.target as HTMLFormElement);
      const foundedRaw = String(form.get("founded_year") || "").trim();
      const payload = {
        name: form.get("name") as string,
        domain: (form.get("domain") as string) || null,
        industry: (form.get("industry") as string) || null,
        notes: str(form, "notes"),
        tags: strArr(form, "tags"),
        founded_year: foundedRaw === "" ? null : Number(foundedRaw) || null,
        employee_range: str(form, "employee_range"),
        nit: str(form, "nit"),
        address: str(form, "address"),
        phone: str(form, "phone"),
        linkedin: str(form, "linkedin"),
        github: str(form, "github"),
        x_handle: str(form, "x_handle"),
        website: str(form, "website"),
        owner: str(form, "owner"),
      };
      if (companyModal?.edit) {
        await updateCrmCompany(companyModal.edit.id, payload);
      } else {
        await createCrmCompany(payload);
      }
      setCompanyModal(null);
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : t("admin.crm.errSaveCompany"));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteDeal = async (id: string) => {
    if (!window.confirm(t("admin.crm.confirmDeleteDeal"))) return;
    try {
      await deleteCrmDeal(id);
      setDealModal(null);
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : t("admin.crm.errDelete"));
    }
  };

  const handleDeleteActivity = async (id: string) => {
    if (!window.confirm(t("admin.crm.confirmDeleteActivity"))) return;
    try {
      await deleteCrmActivity(id);
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : t("admin.crm.errDelete"));
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
      alert(err instanceof Error ? err.message : t("admin.crm.errSaveDeal"));
    } finally {
      setSaving(false);
    }
  };

  const handleMoveStage = async (dealId: string, stageId: string) => {
    try {
      await updateCrmDeal(dealId, { stage_id: stageId });
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : t("admin.crm.errMoveDeal"));
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
      alert(err instanceof Error ? err.message : t("admin.crm.errSaveActivity"));
    } finally {
      setSaving(false);
    }
  };

  const toggleActivity = async (act: any) => {
    try {
      await updateCrmActivity(act.id, { done: !act.done });
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : t("admin.crm.errUpdateActivity"));
    }
  };

  const handleConvertLead = async (leadId: string) => {
    setConvertingLeadId(leadId);
    try {
      await convertLeadToContact(leadId);
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : t("admin.crm.errConvertLead"));
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
        subject_en: String(fd.get("subject_en") || "").trim() || undefined,
        body: String(fd.get("body") || ""),
        body_en: String(fd.get("body_en") || "") || undefined,
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
      alert(err instanceof Error ? err.message : t("admin.crm.errSaveTemplate"));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!window.confirm(t("admin.crm.confirmDeleteTemplate"))) return;
    try {
      await deleteCrmEmailTemplate(id);
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : t("admin.crm.errDelete"));
    }
  };

  const doSendEmail = async (e: FormEvent) => {
    e.preventDefault();
    if (!sendModal) return;
    const fd = new FormData(e.currentTarget as HTMLFormElement);
    const contactId = String(fd.get("contact_id") || "");
    const templateId = String(fd.get("template_id") || "");
    const dealId = String(fd.get("deal_id") || "") || undefined;
    const lang = String(fd.get("lang") || "es") === "en" ? "en" : "es";
    if (!contactId || !templateId) return;
    setSending(true);
    try {
      const res: any = await sendCrmEmail({ contact_id: contactId, template_id: templateId, deal_id: dealId, lang });
      if (!res?.ok) throw new Error(res?.error || "Error al enviar");
      setSendModal(null);
      await load();
      alert(t("admin.crm.sentOk"));
    } catch (err) {
      alert(err instanceof Error ? err.message : t("admin.crm.errSendEmail"));
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
      ? { label: t("admin.crm.emailsTab.sent"), cls: "bg-green-500/10 text-green-400 border-green-500/30" }
      : { label: s === "pending" ? t("admin.crm.emailsTab.pending") : t("admin.crm.emailsTab.failed"), cls: "bg-red-500/10 text-red-400 border-red-500/30" };

  const randomPassword = () => {
    const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
    const bytes = new Uint8Array(12);
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
        title_en: String(fd.get("title_en") || "").trim() || undefined,
        contract_type: String(fd.get("contract_type") || "servicios"),
        contact_id: String(fd.get("contact_id") || "") || undefined,
        company_id: String(fd.get("company_id") || "") || undefined,
        currency: String(fd.get("currency") || "EUR"),
        value: fd.get("value") ? Number(fd.get("value")) || null : null,
        terms: String(fd.get("terms") || ""),
        terms_en: String(fd.get("terms_en") || "") || undefined,
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
      alert(err instanceof Error ? err.message : t("admin.crm.errSaveContract"));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteContract = async (id: string) => {
    if (!window.confirm(t("admin.crm.confirmDeleteContract"))) return;
    try {
      await deleteCrmContract(id);
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : t("admin.crm.errDelete"));
    }
  };

  const handleSignProvider = async (c: any) => {
    const name = window.prompt(t("admin.crm.signPrompt"), "Carlos Vicioso");
    if (!name) return;
    try {
      await signContractProvider(c.id, name.trim());
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : t("admin.crm.errSign"));
    }
  };

  const handleRegenPassword = async (c: any) => {
    const pwd = randomPassword();
    if (!window.confirm(t("admin.crm.confirmRegenPwd"))) return;
    try {
      await updateCrmContract(c.id, { password: pwd });
      setContractPassword(pwd);
    } catch (err) {
      alert(err instanceof Error ? err.message : t("admin.crm.errRegen"));
    }
  };

  // ============ CSV: exportar / importar ============
  const csvCell = (v: any) => {
    const s = v == null ? "" : String(v);
    return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };

  const downloadCsv = (filename: string, rows: Record<string, any>[]) => {
    if (rows.length === 0) {
      alert(t("admin.crm.noDataExport"));
      return;
    }
    const headers = Object.keys(rows[0]);
    const lines = [
      headers.map(csvCell).join(","),
      ...rows.map((r) => headers.map((h) => csvCell(r[h])).join(",")),
    ];
    const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const parseCsv = (text: string): string[][] => {
    const t = text.replace(/^\uFEFF/, "");
    const firstLine = t.split(/\r?\n/)[0] || "";
    const delim = [",", ";", "\t"].sort(
      (a, b) => firstLine.split(b).length - firstLine.split(a).length
    )[0];
    const rows: string[][] = [];
    let row: string[] = [];
    let cur = "";
    let inQ = false;
    for (let i = 0; i < t.length; i++) {
      const ch = t[i];
      if (inQ) {
        if (ch === '"') {
          if (t[i + 1] === '"') {
            cur += '"';
            i++;
          } else {
            inQ = false;
          }
        } else {
          cur += ch;
        }
      } else if (ch === '"') {
        inQ = true;
      } else if (ch === delim) {
        row.push(cur);
        cur = "";
      } else if (ch === "\n") {
        row.push(cur);
        rows.push(row);
        row = [];
        cur = "";
      } else if (ch === "\r") {
        /* ignorar */
      } else {
        cur += ch;
      }
    }
    if (cur !== "" || row.length > 0) {
      row.push(cur);
      rows.push(row);
    }
    return rows.filter((r) => r.some((c) => c.trim() !== ""));
  };

  const handleExportContacts = () => {
    downloadCsv(
      "crm-contactos.csv",
      contacts.map((c: any) => ({
        first_name: c.first_name || "",
        last_name: c.last_name || "",
        email: c.email || "",
        phone: c.phone || "",
        company: c.company?.name || "",
        source: c.source || "",
        tags: (c.tags || []).join(";"),
        notes: c.notes || "",
      }))
    );
  };

  const handleExportCompanies = () => {
    downloadCsv(
      "crm-empresas.csv",
      companies.map((c: any) => ({
        name: c.name || "",
        domain: c.domain || "",
        industry: c.industry || "",
        notes: c.notes || "",
      }))
    );
  };

  const sanitizeDate = (v: string): string => {
    if (!v) return "";
    const parsed = new Date(v);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
    const m = v.match(/^(\d{4})-(\d{2})-(\d{2})/);
    return m ? `${m[1]}-${m[2]}-${m[3]}` : "";
  };

  const cellAt = (row: string[], i: number) =>
    i >= 0 && i !== undefined ? (row[i] || "").trim() : "";

  const hasField = (mapping: Record<string, number>, f: string) =>
    mapping[f] !== undefined && mapping[f] >= 0;

  const buildContactRecords = (
    grid: string[][],
    mapping: Record<string, number>
  ) => {
    const has = (f: string) => hasField(mapping, f);
    return grid.slice(1).map((row) => {
      let first_name = has("first_name")
        ? cellAt(row, mapping.first_name)
        : "";
      let last_name = has("last_name") ? cellAt(row, mapping.last_name) : "";
      if (!first_name && has("full_name")) {
        const split = splitFullName(cellAt(row, mapping.full_name));
        first_name = split.first_name;
        last_name = last_name || split.last_name;
      }
      const email = has("email") ? cellAt(row, mapping.email) : "";
      if (!first_name && email) first_name = nameFromEmail(email);
      const rawTags = has("tags") ? cellAt(row, mapping.tags) : "";
      const rawExp = has("experience_years")
        ? cellAt(row, mapping.experience_years)
        : "";
      const expNum = rawExp ? Number(rawExp.replace(/[^\d.]/g, "")) : NaN;
      return {
        first_name,
        last_name,
        email,
        phone: has("phone") ? cellAt(row, mapping.phone) : "",
        phone2: has("phone2") ? cellAt(row, mapping.phone2) : "",
        company: has("company") ? cellAt(row, mapping.company) : "",
        job_title: has("job_title") ? cellAt(row, mapping.job_title) : "",
        source: (has("source") ? cellAt(row, mapping.source) : "") || "import",
        tags: rawTags
          .split(/[;|,]/)
          .map((s) => s.trim())
          .filter(Boolean),
        notes: has("notes") ? cellAt(row, mapping.notes) : "",
        linkedin: has("linkedin") ? cellAt(row, mapping.linkedin) : "",
        github: has("github") ? cellAt(row, mapping.github) : "",
        x_handle: has("x_handle") ? cellAt(row, mapping.x_handle) : "",
        website: has("website") ? cellAt(row, mapping.website) : "",
        address: has("address") ? cellAt(row, mapping.address) : "",
        birthdate: has("birthdate")
          ? sanitizeDate(cellAt(row, mapping.birthdate))
          : "",
        gender: has("gender") ? cellAt(row, mapping.gender) : "",
        experience_years: Number.isFinite(expNum) ? expNum : null,
        owner: has("owner") ? cellAt(row, mapping.owner) : "",
      };
    });
  };

  const buildCompanyRecords = (
    grid: string[][],
    mapping: Record<string, number>
  ) =>
    grid.slice(1).map((row) => ({
      name: hasField(mapping, "name") ? cellAt(row, mapping.name) : "",
      domain: hasField(mapping, "domain") ? cellAt(row, mapping.domain) : "",
      industry: hasField(mapping, "industry")
        ? cellAt(row, mapping.industry)
        : "",
      notes: hasField(mapping, "notes") ? cellAt(row, mapping.notes) : "",
    }));

  const runImport = async (
    records: any[],
    kind: ImportKind,
    localDuplicates = 0
  ) => {
    const { unique, duplicates } = dedupeRecords(records, kind);
    const totalDuplicates = localDuplicates + duplicates;

    if (kind === "contacts") {
      const valid = unique.filter(
        (r: any) => r.first_name || r.email || r.phone
      );
      const empty = unique.length - valid.length;

      const byName = new Map(
        (companies || []).map((c: any) => [
          String(c.name || "").toLowerCase(),
          c.id,
        ])
      );
      let createdCompanies = 0;
      for (const m of valid) {
        const nm = (m.company || "").trim();
        if (nm && !byName.has(nm.toLowerCase())) {
          try {
            const nc: any = await createCrmCompany({ name: nm });
            const id = nc?.id ?? nc?.company?.id;
            if (id) {
              byName.set(nm.toLowerCase(), id);
              createdCompanies++;
            }
          } catch {
            /* el contacto queda sin empresa */
          }
        }
      }
      const payload = valid.map((m: any) => ({
        ...m,
        company_id:
          byName.get((m.company || "").trim().toLowerCase()) || undefined,
      }));
      const res: any = await importCrmContacts(payload);
      await load();
      alert(
        `${t("admin.crm.imported")} ${res?.inserted ?? 0} ${t("admin.crm.contacts")}` +
          (createdCompanies
            ? ` (+${createdCompanies} ${t("admin.crm.createdCompanies")})`
            : "") +
          (totalDuplicates + (res?.skipped || 0) + empty
            ? ` (${totalDuplicates} ${t("admin.crm.duplicatesSkipped")}, ${
                (res?.skipped || 0) + empty
              } ${t("admin.crm.rowsSkipped")})`
            : "")
      );
      return;
    }

    const valid = unique.filter((r: any) => r.name && r.name.trim());
    const empty = unique.length - valid.length;
    const res: any = await importCrmCompanies(valid);
    await load();
    alert(
      `${t("admin.crm.importedF")} ${res?.inserted ?? 0} ${t("admin.crm.companies")}` +
        (totalDuplicates + (res?.skipped || 0) + empty
          ? ` (${totalDuplicates} ${t("admin.crm.duplicatesSkipped")}, ${
              (res?.skipped || 0) + empty
            } ${t("admin.crm.rowsSkipped")})`
          : "")
    );
  };

  const handleImportFile = async (
    e: ChangeEvent<HTMLInputElement>,
    kind: ImportKind
  ) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const text = await file.text();
      if (isVCard(text)) {
        const records = parseVCards(text);
        if (records.length === 0) throw new Error(t("admin.crm.emptyCsv"));
        setImporting(true);
        await runImport(records, "contacts");
        return;
      }
      const grid = parseCsv(text);
      if (grid.length < 2) throw new Error(t("admin.crm.emptyCsv"));
      const headers = grid[0].map((h) => h.trim());
      const { mapping, unmatched } = autoMapHeaders(headers, kind);
      setImportPreview({ kind, headers, grid, mapping, unmatched });
    } catch (err) {
      alert(err instanceof Error ? err.message : t("admin.crm.errImport"));
    } finally {
      setImporting(false);
    }
  };

  const confirmImport = async () => {
    if (!importPreview) return;
    const { kind, grid, mapping } = importPreview;
    setImporting(true);
    try {
      const records =
        kind === "contacts"
          ? buildContactRecords(grid, mapping)
          : buildCompanyRecords(grid, mapping);
      await runImport(records, kind);
      setImportPreview(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : t("admin.crm.errImport"));
    } finally {
      setImporting(false);
    }
  };

  const importFields: {
    key: string;
    label: string;
    kind: ImportKind;
  }[] = [
    { key: "first_name", label: t("admin.crm.fieldFirstName"), kind: "contacts" },
    { key: "last_name", label: t("admin.crm.fieldLastName"), kind: "contacts" },
    { key: "full_name", label: t("admin.crm.fieldFullName"), kind: "contacts" },
    { key: "email", label: t("admin.crm.fieldEmail"), kind: "contacts" },
    { key: "phone", label: t("admin.crm.fieldPhone"), kind: "contacts" },
    { key: "phone2", label: t("admin.crm.fieldPhone2"), kind: "contacts" },
    { key: "company", label: t("admin.crm.fieldCompany"), kind: "contacts" },
    { key: "job_title", label: t("admin.crm.fieldJobTitle"), kind: "contacts" },
    { key: "linkedin", label: t("admin.crm.fieldLinkedin"), kind: "contacts" },
    { key: "github", label: t("admin.crm.fieldGithub"), kind: "contacts" },
    { key: "x_handle", label: t("admin.crm.fieldXHandle"), kind: "contacts" },
    { key: "website", label: t("admin.crm.fieldWebsite"), kind: "contacts" },
    { key: "address", label: t("admin.crm.fieldAddress"), kind: "contacts" },
    { key: "birthdate", label: t("admin.crm.fieldBirthdate"), kind: "contacts" },
    { key: "gender", label: t("admin.crm.fieldGender"), kind: "contacts" },
    {
      key: "experience_years",
      label: t("admin.crm.fieldExperience"),
      kind: "contacts",
    },
    { key: "owner", label: t("admin.crm.fieldOwner"), kind: "contacts" },
    { key: "tags", label: t("admin.crm.fieldTags"), kind: "contacts" },
    { key: "source", label: t("admin.crm.fieldSource"), kind: "contacts" },
    { key: "notes", label: t("admin.crm.fieldNotes"), kind: "contacts" },
    { key: "name", label: t("admin.crm.fieldName"), kind: "companies" },
    { key: "domain", label: t("admin.crm.fieldDomain"), kind: "companies" },
    { key: "industry", label: t("admin.crm.fieldIndustry"), kind: "companies" },
    { key: "notes", label: t("admin.crm.fieldNotes"), kind: "companies" },
  ];

  const subTabs: { id: SubTab; label: string }[] = [
    { id: "contacts", label: t("admin.crm.tabs.contacts") },
    { id: "companies", label: t("admin.crm.tabs.companies") },
    { id: "pipeline", label: t("admin.crm.tabs.pipeline") },
    { id: "activities", label: t("admin.crm.tabs.activities") },
    { id: "leads", label: t("admin.crm.tabs.leads") },
    { id: "emails", label: t("admin.crm.tabs.emails") },
    { id: "contracts", label: t("admin.crm.tabs.contracts") },
    { id: "integrations", label: t("admin.crm.tabs.integrations") },
  ];

  return (
    <div className="text-white">
      {/* Encabezado */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-xl font-bold">{t("admin.crm.label")}</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            {t("admin.crm.subtitle")}
          </p>
        </div>
        <div className="flex gap-1.5 flex-wrap">
          <button className={btnPrimary} onClick={() => { setSubtab("companies"); setNewRowCompany(true); }}>{t("admin.crm.newCompany")}</button>
          <button className={btnPrimary} onClick={() => { setSubtab("contacts"); setNewRowContact(true); }}>{t("admin.crm.newContact")}</button>
          <button className={btnPrimary} onClick={() => setDealModal({})}>{t("admin.crm.newDeal")}</button>
          <button className={btnPrimary} onClick={() => setContractModal({})}>{t("admin.crm.newContract")}</button>
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
          <span className="font-semibold">{t("admin.crm.error")}</span>
          <span className="break-words">{error}</span>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-10">
          <span className="text-[#2093c4] font-bold">{t("admin.crm.loading")}</span>
        </div>
      ) : (
        <>
          {/* ============ CONTACTOS ============ */}
          {subtab === "contacts" && (
            <div className="h-[640px] min-h-[400px]">
              <RecordGrid
                entity="person"
                fields={fieldsPerson}
                records={contacts}
                onOpen={(c) => setDrawerContact(c)}
                onCellCommit={(rec, f, v) => commitCell("person", rec, f, v)}
                onHide={(f) => handleFieldUpdate(f.id, { is_visible: false })}
                rowMenu={[
                  {
                    id: "open",
                    label: t("admin.crm.grid.open"),
                    onClick: (c) => setDrawerContact(c),
                  },
                  {
                    id: "delete",
                    label: t("admin.crm.grid.deleteRow"),
                    danger: true,
                    onClick: (c) => handleRowDelete("person", c),
                  },
                ]}
                creating={newRowContact}
                creatingBusy={creatingContact}
                onCreate={(vals) => handleCreateRow("person", vals)}
                onCreateStart={() => setNewRowContact(true)}
                onCreateCancel={() => setNewRowContact(false)}
                onOpenFields={() => setFieldsPanel("person")}
                selection={selectedContacts}
                onToggleSelect={(id) => toggleSelect(selectedContacts, setSelectedContacts, id)}
                onToggleAll={(ids) =>
                  ids.length ? setSelectedContacts(new Set(ids)) : setSelectedContacts(new Set())
                }
                onClearSelection={() => setSelectedContacts(new Set())}
                onBulkDelete={(ids) => handleBulkDelete("person", ids)}
                onBulkEdit={(ids, f, v) => handleBulkEdit("person", ids, f, v)}
                entityLabel={t("admin.crm.tabContact")}
                suggestions={allTags}
                busyCell={(rid, fn) => !!savingCells[`${rid}|${fn}`]}
                actions={
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">
                      {contacts.length} {t("admin.crm.contacts")}
                    </span>
                    <button
                      onClick={handleExportContacts}
                      className="text-[11px] px-2.5 py-1.5 rounded bg-white/10 hover:bg-white/20 cursor-pointer"
                    >
                      {t("admin.crm.exportCsv")}
                    </button>
                    <button
                      onClick={() => contactsFileRef.current?.click()}
                      disabled={importing}
                      className="text-[11px] px-2.5 py-1.5 rounded bg-white/10 hover:bg-white/20 cursor-pointer disabled:opacity-50"
                    >
                      {importing ? t("admin.crm.importing") : t("admin.crm.importCsv")}
                    </button>
                    <input
                      ref={contactsFileRef}
                      type="file"
                      accept=".csv,.vcf,.vcard,text/csv,text/vcard,text/plain"
                      className="hidden"
                      onChange={(e) => handleImportFile(e, "contacts")}
                    />
                  </div>
                }
              />
            </div>
          )}

          {/* ============ EMPRESAS ============ */}
          {subtab === "companies" && (
            <div className="h-[640px] min-h-[400px]">
              <RecordGrid
                entity="company"
                fields={fieldsCompany}
                records={companies}
                onOpen={(c) => setDrawerCompany(c)}
                onCellCommit={(rec, f, v) => commitCell("company", rec, f, v)}
                onHide={(f) => handleFieldUpdate(f.id, { is_visible: false })}
                rowMenu={[
                  {
                    id: "open",
                    label: t("admin.crm.grid.open"),
                    onClick: (c) => setDrawerCompany(c),
                  },
                  {
                    id: "delete",
                    label: t("admin.crm.grid.deleteRow"),
                    danger: true,
                    onClick: (c) => handleRowDelete("company", c),
                  },
                ]}
                creating={newRowCompany}
                creatingBusy={creatingCompany}
                onCreate={(vals) => handleCreateRow("company", vals)}
                onCreateStart={() => setNewRowCompany(true)}
                onCreateCancel={() => setNewRowCompany(false)}
                onOpenFields={() => setFieldsPanel("company")}
                selection={selectedCompanies}
                onToggleSelect={(id) => toggleSelect(selectedCompanies, setSelectedCompanies, id)}
                onToggleAll={(ids) =>
                  ids.length ? setSelectedCompanies(new Set(ids)) : setSelectedCompanies(new Set())
                }
                onClearSelection={() => setSelectedCompanies(new Set())}
                onBulkDelete={(ids) => handleBulkDelete("company", ids)}
                onBulkEdit={(ids, f, v) => handleBulkEdit("company", ids, f, v)}
                entityLabel={t("admin.crm.tabCompany")}
                suggestions={allTags}
                busyCell={(rid, fn) => !!savingCells[`${rid}|${fn}`]}
                actions={
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">
                      {companies.length} {t("admin.crm.companiesTab.count")}
                    </span>
                    <button
                      onClick={handleExportCompanies}
                      className="text-[11px] px-2.5 py-1.5 rounded bg-white/10 hover:bg-white/20 cursor-pointer"
                    >
                      {t("admin.crm.exportCsv")}
                    </button>
                    <button
                      onClick={() => companiesFileRef.current?.click()}
                      disabled={importing}
                      className="text-[11px] px-2.5 py-1.5 rounded bg-white/10 hover:bg-white/20 cursor-pointer disabled:opacity-50"
                    >
                      {importing ? t("admin.crm.importing") : t("admin.crm.importCsv")}
                    </button>
                    <input
                      ref={companiesFileRef}
                      type="file"
                      accept=".csv,.vcf,.vcard,text/csv,text/vcard,text/plain"
                      className="hidden"
                      onChange={(e) => handleImportFile(e, "companies")}
                    />
                  </div>
                }
              />
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
                      title={t("admin.crm.pipeline.newHere")}
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
                            <p className="text-[10px] text-gray-500">{t("admin.crm.pipeline.close")} {fmtDate(d.expected_close_date)}</p>
                          )}
                        </div>
                        <div className="mt-2 flex gap-1">
                          {stages
                            .filter((s2: any) => s2.position === st.position - 1)
                            .map((s2: any) => (
                              <button key={s2.id} onClick={(e) => { e.stopPropagation(); handleMoveStage(d.id, s2.id); }} className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-gray-300 hover:bg-white/15 cursor-pointer" title={`${t("admin.crm.pipeline.moveTo")} ${s2.name}`}>←</button>
                            ))}
                          {stages
                            .filter((s2: any) => s2.position === st.position + 1)
                            .map((s2: any) => (
                              <button key={s2.id} onClick={(e) => { e.stopPropagation(); handleMoveStage(d.id, s2.id); }} className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-gray-300 hover:bg-white/15 cursor-pointer" title={`${t("admin.crm.pipeline.moveTo")} ${s2.name}`}>→</button>
                            ))}
                        </div>
                      </div>
                    ))}
                    {(dealsByStage[st.id] || []).length === 0 && (
                      <p className="text-center text-[11px] text-gray-600 py-3">{t("admin.crm.pipeline.noDeals")}</p>
                    )}
                  </div>
                </div>
              ))}
              {stages.length === 0 && (
                <div className="w-full text-center py-8 text-gray-500">{t("admin.crm.pipeline.noStages")}</div>
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
                  <option value="">{t("admin.crm.activitiesTab.allPeople")}</option>
                  {contacts.map((c: any) => (
                    <option key={c.id} value={c.id}>{c.first_name} {c.last_name || ""}</option>
                  ))}
                </select>
                <button className={btnPrimary} onClick={() => setActivityModal({})}>{t("admin.crm.activitiesTab.addActivity")}</button>
              </div>
              <div className="overflow-x-auto rounded-lg border border-white/10">
                <table className="w-full min-w-[700px] text-left text-sm">
                  <thead className="bg-[#18181b] text-gray-400 border-b border-white/10">
                    <tr>
                      <th className="px-4 py-3 font-medium">{t("admin.crm.activitiesTab.thType")}</th>
                      <th className="px-4 py-3 font-medium">{t("admin.crm.activitiesTab.thSubject")}</th>
                      <th className="px-4 py-3 font-medium">{t("admin.crm.activitiesTab.thPerson")}</th>
                      <th className="px-4 py-3 font-medium">{t("admin.crm.activitiesTab.thDue")}</th>
                      <th className="px-4 py-3 font-medium text-center">{t("admin.crm.activitiesTab.thDone")}</th>
                      <th className="px-4 py-3 font-medium"></th>
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
                            {typeLabel(a.type)}
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
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => handleDeleteActivity(a.id)}
                            className="text-gray-500 hover:text-red-400 px-1.5 py-0.5 rounded hover:bg-white/10 cursor-pointer"
                            title={t("admin.crm.delete")}
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    ))}
                    {filteredActivities.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                          {t("admin.crm.activitiesTab.empty")}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ============ INTEGRACIONES ============ */}
          {subtab === "integrations" && (
            <div className="space-y-4">
              <p className="text-xs text-gray-400">
                {t("admin.crm.integrationsTab.desc")}
              </p>

              <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold">Google Contacts (People API)</p>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      {googleStatus?.google?.account_email ||
                        t("admin.crm.integrationsTab.notConnected")}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {googleStatus?.google ? (
                      <>
                        <button
                          type="button"
                          onClick={handleGoogleSync}
                          disabled={googleBusy}
                          className={btnPrimary}
                        >
                          {googleBusy
                            ? t("admin.crm.integrationsTab.working")
                            : t("admin.crm.integrationsTab.sync")}
                        </button>
                        <button
                          type="button"
                          onClick={handleGoogleDisconnect}
                          disabled={googleBusy}
                          className={btnGhost}
                        >
                          {t("admin.crm.integrationsTab.disconnect")}
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={handleGoogleConnect}
                        disabled={googleBusy || !googleStatus?.configured}
                        title={
                          googleStatus?.configured
                            ? ""
                            : t("admin.crm.integrationsTab.notConfigured")
                        }
                        className={`${btnPrimary} disabled:opacity-50`}
                      >
                        {t("admin.crm.integrationsTab.connect")}
                      </button>
                    )}
                  </div>
                </div>

                {googleStatus?.google && (
                  <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px] text-gray-400">
                    <div>
                      <span className="block text-gray-500">
                        {t("admin.crm.integrationsTab.lastSync")}
                      </span>
                      {googleStatus.google.last_sync_at
                        ? fmtDate(googleStatus.google.last_sync_at)
                        : "—"}
                    </div>
                    <div>
                      <span className="block text-gray-500">
                        {t("admin.crm.integrationsTab.status")}
                      </span>
                      {googleStatus.google.status}
                    </div>
                    <div>
                      <span className="block text-gray-500">
                        {t("admin.crm.integrationsTab.imported")}
                      </span>
                      {googleStatus.google.last_sync_result?.inserted ?? 0}
                    </div>
                    <div>
                      <span className="block text-gray-500">
                        {t("admin.crm.integrationsTab.linked")}
                      </span>
                      {googleStatus.google.last_sync_result?.linked ?? 0}
                    </div>
                  </div>
                )}

                {!googleStatus?.configured && (
                  <p className="mt-3 text-[11px] text-amber-400/90">
                    {t("admin.crm.integrationsTab.notConfigured")}
                  </p>
                )}

                {googleStatus?.configured && !googleStatus?.google && (
                  <p className="mt-3 text-[11px] text-gray-500 break-all">
                    Redirect URI: <span className="font-mono">{googleStatus.redirect_uri}</span>
                  </p>
                )}
              </div>

              <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
                <p className="font-semibold">
                  {t("admin.crm.integrationsTab.fileTitle")}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {t("admin.crm.integrationsTab.fileDesc")}
                </p>
                <div className="flex gap-2 mt-3">
                  <button
                    type="button"
                    onClick={() => contactsFileRef.current?.click()}
                    disabled={importing}
                    className={btnPrimary}
                  >
                    {t("admin.crm.integrationsTab.importContacts")}
                  </button>
                  <button
                    type="button"
                    onClick={() => companiesFileRef.current?.click()}
                    disabled={importing}
                    className={btnGhost}
                  >
                    {t("admin.crm.integrationsTab.importCompanies")}
                  </button>
                </div>
                <p className="text-[11px] text-gray-500 mt-2">
                  {t("admin.crm.integrationsTab.fileFormats")}
                </p>
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
                    <h3 className="font-semibold text-sm">{t("admin.crm.leadsTab.title")}</h3>
                    <span className="text-xs text-gray-400">
                      {leadsData.converted} {t("admin.crm.leadsTab.converted")} · {leadsData.items?.length - (leadsData.converted || 0)} {t("admin.crm.leadsTab.pending")}
                    </span>
                  </div>
                  <div className="divide-y divide-white/5 max-h-[420px] overflow-y-auto">
                    {(leadsData.items || []).map((l: any) => (
                      <div key={l.id} className="flex items-center justify-between gap-2 px-4 py-2.5 hover:bg-white/5">
                        <div className="min-w-0 mr-2">
                          <p className="text-sm text-gray-200 truncate">
                            <span className="px-1.5 py-0.5 text-[10px] rounded bg-white/10 mr-1.5 capitalize">{l.source}</span>
                            {l.name || l.email || l.topic || t("admin.crm.leadsTab.noName")}
                          </p>
                          {l.email && <p className="text-[11px] text-gray-500 truncate">{l.email}</p>}
                          {l.topic && !l.name && !l.email && <p className="text-[11px] text-gray-500 truncate">{l.topic}</p>}
                          {(l.country || l.device || l.page_url || l.utm_source) && (
                            <p className="text-[10px] text-gray-600 truncate">
                              {[
                                l.country || null,
                                [l.device, l.browser].filter(Boolean).join("/") || null,
                                l.page_url || null,
                                l.utm_source ? `utm:${l.utm_source}${l.utm_medium ? `/${l.utm_medium}` : ""}` : null,
                              ]
                                .filter(Boolean)
                                .join(" · ")}
                            </p>
                          )}
                          <p className="text-[10px] text-gray-600">{fmtDate(l.created_at)}</p>
                        </div>
                        {l.converted_at ? (
                          <span className="px-2 py-1 text-[11px] rounded bg-green-500/10 text-green-400 border border-green-500/30 shrink-0">{t("admin.crm.leadsTab.inCrm")}</span>
                        ) : (
                          <button
                            onClick={() => handleConvertLead(l.id)}
                            disabled={convertingLeadId === l.id}
                            className="px-3 py-1.5 text-[11px] rounded bg-[#8c52ff]/20 text-[#c4b5fd] border border-[#8c52ff]/40 hover:bg-[#8c52ff]/30 cursor-pointer disabled:opacity-50 shrink-0 font-semibold"
                          >
                            {convertingLeadId === l.id ? t("admin.crm.leadsTab.converting") : t("admin.crm.leadsTab.toContact")}
                          </button>
                        )}
                      </div>
                    ))}
                    {(leadsData.items || []).length === 0 && (
                      <p className="px-4 py-8 text-center text-gray-500 text-sm">{t("admin.crm.leadsTab.noLeads")}</p>
                    )}
                  </div>
                </div>

                <div className="rounded-lg border border-white/10 bg-[#0f1113]">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                    <h3 className="font-semibold text-sm">{t("admin.crm.leadsTab.visitorsTitle")}</h3>
                    <span className="text-xs text-gray-400">
                      <span className="text-white font-semibold">{visitorsData.today}</span> {t("admin.crm.leadsTab.today")} · {visitorsData.total} {t("admin.crm.leadsTab.total")}
                    </span>
                  </div>
                  <div className="divide-y divide-white/5 max-h-[420px] overflow-y-auto">
                    {(visitorsData.recent || []).map((v: any, i: number) => (
                      <div key={i} className="flex items-center justify-between gap-2 px-4 py-2.5">
                        <div className="min-w-0">
                          <p className="text-sm text-gray-200 font-mono truncate">{v.page || "—"}</p>
                          {v.referrer && <p className="text-[11px] text-gray-500 truncate">{t("admin.crm.leadsTab.from")} {v.referrer}</p>}
                        </div>
                        <span className="text-[11px] text-gray-500 shrink-0">{fmtDateTime(v.created_at)}</span>
                      </div>
                    ))}
                    {(visitorsData.recent || []).length === 0 && (
                      <p className="px-4 py-8 text-center text-gray-500 text-sm">{t("admin.crm.leadsTab.noVisits")}</p>
                    )}
                  </div>
                  <p className="px-4 py-2 text-[10px] text-gray-600 border-t border-white/10">
                    {t("admin.crm.leadsTab.dedupeNote")}
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
                  {t("admin.crm.emailsTab.hint")}{" "}
                  <code className="text-[#7cc7e0]">{"{{contact.first_name}}"}</code>,{" "}
                  <code className="text-[#7cc7e0]">{"{{company.name}}"}</code>,{" "}
                  <code className="text-[#7cc7e0]">{"{{deal.title}}"}</code>,{" "}
                  <code className="text-[#7cc7e0]">{"{{deal.value}}"}</code>…
                </p>
                <button className={btnPrimary} onClick={() => setTemplateModal({})}>{t("admin.crm.emailsTab.newTemplate")}</button>
              </div>

              <div className="rounded-lg border border-white/10 bg-[#0f1113]">
                <div className="px-4 py-3 border-b border-white/10">
                  <h3 className="font-semibold text-sm">{t("admin.crm.emailsTab.templates")}</h3>
                </div>
                <div className="divide-y divide-white/5">
                  {(emailTemplates || []).map((tpl: any) => (
                    <div key={tpl.id} className="flex items-center justify-between gap-2 px-4 py-2.5 hover:bg-white/5">
                      <div className="min-w-0 mr-2">
                        <p className="text-sm text-gray-200 truncate">
                          <span className="px-1.5 py-0.5 text-[10px] rounded bg-white/10 mr-1.5">{tpl.is_active ? t("admin.crm.emailsTab.active") : t("admin.crm.emailsTab.paused")}</span>
                          {tpl.name}
                        </p>
                        <p className="text-[11px] text-gray-500 truncate">{tpl.subject}</p>
                      </div>
                      <div className="flex gap-1.5 shrink-0">
                        <button onClick={() => setTemplateModal({ edit: tpl })} className="text-[11px] px-2 py-1 rounded bg-white/10 hover:bg-white/20 cursor-pointer">
                          {t("admin.crm.edit")}
                        </button>
                        <button onClick={() => setSendModal({ contact_id: "" })} className="text-[11px] px-2 py-1 rounded bg-[#8c52ff]/20 border border-[#8c52ff]/40 text-[#c4b5fd] hover:bg-[#8c52ff]/30 cursor-pointer">
                          {t("admin.crm.send")}
                        </button>
                        <button onClick={() => handleDeleteTemplate(tpl.id)} className="text-[11px] px-2 py-1 rounded bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 cursor-pointer">
                          {t("admin.crm.delete")}
                        </button>
                      </div>
                    </div>
                  ))}
                  {(emailTemplates || []).length === 0 && (
                    <p className="px-4 py-8 text-center text-gray-500 text-sm">{t("admin.crm.emailsTab.noTemplates")}</p>
                  )}
                </div>
              </div>

              <div className="rounded-lg border border-white/10 bg-[#0f1113]">
                <div className="px-4 py-3 border-b border-white/10">
                  <h3 className="font-semibold text-sm">{t("admin.crm.emailsTab.recent")}</h3>
                </div>
                <div className="divide-y divide-white/5">
                  {(emailLog || []).map((e: any) => {
                    const st = sendStatus(e.status);
                    return (
                      <div key={e.id} className="flex items-center justify-between gap-2 px-4 py-2.5">
                        <div className="min-w-0 mr-2">
                          <p className="text-sm text-gray-200 truncate">
                            {e.subject || `(${t("admin.crm.emailsTab.noSubject")})`}
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
                    <p className="px-4 py-8 text-center text-gray-500 text-sm">{t("admin.crm.emailsTab.noSends")}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ============ CONTRATOS ============ */}
          {subtab === "contracts" && (
            <div className="space-y-4">
              <p className="text-xs text-gray-400">
                {t("admin.crm.contractsTab.desc")}
              </p>
              {contractPassword && (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm">
                  <span className="text-gray-300">
                    {t("admin.crm.contractsTab.pwdLabel")}{" "}
                    <span className="font-mono font-bold text-white select-all tracking-widest">{contractPassword}</span>
                  </span>
                  <button
                    onClick={() => {
                      navigator.clipboard?.writeText(contractPassword);
                      setContractPassword(null);
                    }}
                    className="px-3 py-1 text-[11px] rounded bg-white/10 hover:bg-white/20 cursor-pointer"
                  >
                    {t("admin.crm.contractsTab.copiedClose")}
                  </button>
                </div>
              )}
              <div className="overflow-x-auto rounded-lg border border-white/10">
                <table className="w-full min-w-[900px] text-left text-sm">
                  <thead className="bg-[#18181b] text-gray-400 border-b border-white/10">
                    <tr>
                      <th className="px-4 py-2.5 font-semibold">{t("admin.crm.contractsTab.thContract")}</th>
                      <th className="px-4 py-2.5 font-semibold">{t("admin.crm.contractsTab.thClient")}</th>
                      <th className="px-4 py-2.5 font-semibold">{t("admin.crm.contractsTab.thAmount")}</th>
                      <th className="px-4 py-2.5 font-semibold">{t("admin.crm.contractsTab.thStatus")}</th>
                      <th className="px-4 py-2.5 font-semibold">{t("admin.crm.contractsTab.thLink")}</th>
                      <th className="px-4 py-2.5 font-semibold">{t("admin.crm.contractsTab.thActions")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {(contracts || []).map((c) => (
                      <tr key={c.id} className="hover:bg-white/5">
                        <td className="px-4 py-2.5">
                          <span className="font-medium">{c.title}</span>
                          <span className="block text-[10px] text-gray-500">{t("admin.crm.contractsTab.created")} {fmtDate(c.created_at)}</span>
                          <span className="inline-block mt-0.5 px-1.5 py-0.5 text-[10px] rounded bg-white/10 text-gray-300">{t(`admin.crm.contractTypes.${c.contract_type || "servicios"}`)}</span>
                          {(c.failed_24h || 0) > 0 && (
                            <span className="block text-[10px] text-red-400" title={t("admin.crm.contractsTab.failedTip")}>
                              ⚠ {c.failed_24h} {t("admin.crm.contractsTab.failedTip")}
                            </span>
                          )}
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
                            <span className="px-2 py-0.5 text-[11px] rounded bg-green-500/10 text-green-400 border border-green-500/30">{t("admin.crm.contractsTab.signed")}</span>
                          ) : c.client_signed_at || c.provider_signed_at ? (
                            <span className="px-2 py-0.5 text-[11px] rounded bg-amber-500/10 text-amber-400 border border-amber-500/30">
                              {t("admin.crm.contractsTab.partial")}
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 text-[11px] rounded bg-white/10 text-gray-300 border border-white/10">{t("admin.crm.contractsTab.sent")}</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5">
                          <button
                            onClick={() => {
                              navigator.clipboard?.writeText(`${window.location.origin}/contracts/${c.slug}`);
                              alert(t("admin.crm.linkCopied"));
                            }}
                            className="text-[11px] px-2 py-1 rounded bg-[#8c52ff]/20 border border-[#8c52ff]/40 text-[#c4b5fd] hover:bg-[#8c52ff]/30 cursor-pointer"
                          >
                            {t("admin.crm.contractsTab.copyLink")}
                          </button>
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="flex gap-1.5 flex-wrap">
                            <button onClick={() => handleSignProvider(c)} disabled={!!c.provider_signed_at} className="text-[11px] px-2 py-1 rounded bg-white/10 hover:bg-white/20 cursor-pointer disabled:opacity-40">
                              {c.provider_signed_at ? t("admin.crm.contractsTab.signedBtn") : t("admin.crm.contractsTab.sign")}
                            </button>
                            <button onClick={() => handleRegenPassword(c)} className="text-[11px] px-2 py-1 rounded bg-white/10 hover:bg-white/20 cursor-pointer">{t("admin.crm.contractsTab.key")}</button>
                            <button onClick={() => setContractModal({ edit: c })} className="text-[11px] px-2 py-1 rounded bg-white/10 hover:bg-white/20 cursor-pointer">{t("admin.crm.edit")}</button>
                            <button onClick={() => handleDeleteContract(c.id)} className="text-[11px] px-2 py-1 rounded bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 cursor-pointer">
                              {t("admin.crm.delete")}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {(contracts || []).length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                          {t("admin.crm.contractsTab.noContracts")}
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
        title={contactModal?.edit ? t("admin.crm.contactModal.edit") : t("admin.crm.contactModal.new")}
        onClose={() => setContactModal(null)}
      >
        <form onSubmit={handleSaveContact} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label={t("admin.crm.contactModal.firstName")}>
              <input name="first_name" required defaultValue={contactModal?.edit?.first_name || ""} className={inputCls} placeholder={t("admin.crm.contactModal.firstNamePh")} />
            </Field>
            <Field label={t("admin.crm.contactModal.lastName")}>
              <input name="last_name" defaultValue={contactModal?.edit?.last_name || ""} className={inputCls} placeholder={t("admin.crm.contactModal.lastNamePh")} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t("admin.crm.contactModal.email")}>
              <input name="email" type="email" defaultValue={contactModal?.edit?.email || ""} className={inputCls} placeholder={t("admin.crm.contactModal.emailPh")} />
            </Field>
            <Field label={t("admin.crm.contactModal.phone")}>
              <input name="phone" defaultValue={contactModal?.edit?.phone || ""} className={inputCls} placeholder={t("admin.crm.contactModal.phonePh")} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t("admin.crm.contactModal.phone2")}>
              <input name="phone2" defaultValue={contactModal?.edit?.phone2 || ""} className={inputCls} placeholder={t("admin.crm.contactModal.phonePh")} />
            </Field>
            <Field label={t("admin.crm.contactModal.jobTitle")}>
              <input name="job_title" defaultValue={contactModal?.edit?.job_title || ""} className={inputCls} placeholder={t("admin.crm.contactModal.jobTitlePh")} />
            </Field>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Field label={t("admin.crm.contactModal.birthdate")}>
              <input name="birthdate" type="date" defaultValue={contactModal?.edit?.birthdate || ""} className={inputCls} />
            </Field>
            <Field label={t("admin.crm.contactModal.gender")}>
              <select name="gender" defaultValue={contactModal?.edit?.gender || ""} className={inputCls}>
                <option value="">{t("admin.crm.contactModal.genderUnspecified")}</option>
                <option value="female">{t("admin.crm.contactModal.genderFemale")}</option>
                <option value="male">{t("admin.crm.contactModal.genderMale")}</option>
                <option value="other">{t("admin.crm.contactModal.genderOther")}</option>
              </select>
            </Field>
            <Field label={t("admin.crm.contactModal.experienceYears")}>
              <input name="experience_years" type="number" min="0" max="80" defaultValue={contactModal?.edit?.experience_years ?? ""} className={inputCls} placeholder="5" />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t("admin.crm.contactModal.linkedin")}>
              <input name="linkedin" defaultValue={contactModal?.edit?.linkedin || ""} className={inputCls} placeholder="https://linkedin.com/in/…" />
            </Field>
            <Field label={t("admin.crm.contactModal.github")}>
              <input name="github" defaultValue={contactModal?.edit?.github || ""} className={inputCls} placeholder="https://github.com/…" />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t("admin.crm.contactModal.xHandle")}>
              <input name="x_handle" defaultValue={contactModal?.edit?.x_handle || ""} className={inputCls} placeholder="@usuario" />
            </Field>
            <Field label={t("admin.crm.contactModal.website")}>
              <input name="website" defaultValue={contactModal?.edit?.website || ""} className={inputCls} placeholder="https://…" />
            </Field>
          </div>
          <Field label={t("admin.crm.contactModal.address")}>
            <input name="address" defaultValue={contactModal?.edit?.address || ""} className={inputCls} placeholder="Calle 123, Bogotá" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t("admin.crm.contactModal.owner")}>
              <input name="owner" defaultValue={contactModal?.edit?.owner || ""} className={inputCls} placeholder="Carlos Vicioso" />
            </Field>
            <Field label={t("admin.crm.contactModal.tags")}>
              <input name="tags" defaultValue={(contactModal?.edit?.tags || []).join(", ")} className={inputCls} placeholder={t("admin.crm.contactModal.tagsPh")} />
            </Field>
          </div>
          <Field label={t("admin.crm.contactModal.notes")}>
            <textarea name="notes" rows={2} defaultValue={contactModal?.edit?.notes || ""} className={inputCls} placeholder={t("admin.crm.contactModal.notesPh")} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t("admin.crm.contactModal.company")}>
              <select name="company_id" defaultValue={contactModal?.edit?.company_id || ""} className={inputCls}>
                <option value="">{t("admin.crm.contactModal.noCompany")}</option>
                {companies.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </Field>
            <Field label={t("admin.crm.contactModal.origin")}>
              <select name="source" defaultValue={contactModal?.edit?.source || "manual"} className={inputCls}>
                <option value="manual">{t("admin.crm.contactModal.srcManual")}</option>
                <option value="tally">{t("admin.crm.contactModal.srcTally")}</option>
                <option value="whatsapp">{t("admin.crm.contactModal.srcWhatsapp")}</option>
                <option value="portfolio">{t("admin.crm.contactModal.srcPortfolio")}</option>
              </select>
            </Field>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setContactModal(null)} className={btnGhost}>{t("admin.crm.cancel")}</button>
            <button type="submit" disabled={saving} className={btnPrimary}>{saving ? t("admin.crm.saving") : t("admin.crm.save")}</button>
          </div>
        </form>
      </Modal>

      {/* ============ MODAL EMPRESA ============ */}
      <Modal
        open={!!companyModal}
        title={companyModal?.edit ? t("admin.crm.companyModal.edit") : t("admin.crm.companyModal.new")}
        onClose={() => setCompanyModal(null)}
      >
        <form onSubmit={handleSaveCompany} className="space-y-3">
          <Field label={t("admin.crm.companyModal.name")}>
            <input name="name" required defaultValue={companyModal?.edit?.name || ""} className={inputCls} placeholder={t("admin.crm.companyModal.namePh")} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t("admin.crm.companyModal.domain")}>
              <input name="domain" defaultValue={companyModal?.edit?.domain || ""} className={inputCls} placeholder={t("admin.crm.companyModal.domainPh")} />
            </Field>
            <Field label={t("admin.crm.companyModal.industry")}>
              <input name="industry" defaultValue={companyModal?.edit?.industry || ""} className={inputCls} placeholder={t("admin.crm.companyModal.industryPh")} />
            </Field>
          </div>
          <Field label={t("admin.crm.companyModal.notes")}>
            <textarea name="notes" rows={3} defaultValue={companyModal?.edit?.notes || ""} className={inputCls} placeholder={t("admin.crm.companyModal.notesPh")} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t("admin.crm.companyModal.tags")}>
              <input name="tags" defaultValue={(companyModal?.edit?.tags || []).join(", ")} className={inputCls} placeholder={t("admin.crm.companyModal.tagsPh")} />
            </Field>
            <Field label={t("admin.crm.companyModal.owner")}>
              <input name="owner" defaultValue={companyModal?.edit?.owner || ""} className={inputCls} placeholder="Carlos Vicioso" />
            </Field>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Field label={t("admin.crm.companyModal.foundedYear")}>
              <input name="founded_year" type="number" min="1800" max="2100" defaultValue={companyModal?.edit?.founded_year ?? ""} className={inputCls} placeholder="2019" />
            </Field>
            <Field label={t("admin.crm.companyModal.employeeRange")}>
              <select name="employee_range" defaultValue={companyModal?.edit?.employee_range || ""} className={inputCls}>
                <option value="">—</option>
                <option value="1-10">{t("admin.crm.companyModal.empRange1")}</option>
                <option value="11-50">{t("admin.crm.companyModal.empRange2")}</option>
                <option value="51-200">{t("admin.crm.companyModal.empRange3")}</option>
                <option value="201-1000">{t("admin.crm.companyModal.empRange4")}</option>
                <option value="1000+">{t("admin.crm.companyModal.empRange5")}</option>
              </select>
            </Field>
            <Field label={t("admin.crm.companyModal.nit")}>
              <input name="nit" defaultValue={companyModal?.edit?.nit || ""} className={inputCls} placeholder={t("admin.crm.companyModal.nitPh")} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t("admin.crm.companyModal.address")}>
              <input name="address" defaultValue={companyModal?.edit?.address || ""} className={inputCls} placeholder="Calle 123, Bogotá" />
            </Field>
            <Field label={t("admin.crm.companyModal.phone")}>
              <input name="phone" defaultValue={companyModal?.edit?.phone || ""} className={inputCls} placeholder="+57 …" />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t("admin.crm.companyModal.linkedin")}>
              <input name="linkedin" defaultValue={companyModal?.edit?.linkedin || ""} className={inputCls} placeholder="https://linkedin.com/company/…" />
            </Field>
            <Field label={t("admin.crm.companyModal.github")}>
              <input name="github" defaultValue={companyModal?.edit?.github || ""} className={inputCls} placeholder="https://github.com/…" />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t("admin.crm.companyModal.xHandle")}>
              <input name="x_handle" defaultValue={companyModal?.edit?.x_handle || ""} className={inputCls} placeholder="@empresa" />
            </Field>
            <Field label={t("admin.crm.companyModal.website")}>
              <input name="website" defaultValue={companyModal?.edit?.website || ""} className={inputCls} placeholder="https://…" />
            </Field>
          </div>
          {companyModal?.edit?.logo_url && (
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <Avatar url={companyModal.edit.logo_url} name={companyModal.edit.name} className="h-6 w-6 text-[10px]" />
              {t("admin.crm.companyModal.logoNote")}
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setCompanyModal(null)} className={btnGhost}>{t("admin.crm.cancel")}</button>
            <button type="submit" disabled={saving} className={btnPrimary}>{saving ? t("admin.crm.saving") : t("admin.crm.save")}</button>
          </div>
        </form>
      </Modal>

      {/* ============ MODAL DEAL ============ */}
      <Modal
        open={!!dealModal}
        title={dealModal?.edit ? t("admin.crm.dealModal.edit") : t("admin.crm.dealModal.new")}
        onClose={() => setDealModal(null)}
      >
        <form onSubmit={handleSaveDeal} className="space-y-3">
          <Field label={t("admin.crm.dealModal.title")}>
            <input name="title" required defaultValue={dealModal?.edit?.title || ""} className={inputCls} placeholder={t("admin.crm.dealModal.titlePh")} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t("admin.crm.dealModal.contact")}>
              <select name="contact_id" defaultValue={dealModal?.edit?.contact_id || ""} className={inputCls}>
                <option value="">{t("admin.crm.dealModal.noContact")}</option>
                {contacts.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.first_name} {c.last_name || ""}</option>
                ))}
              </select>
            </Field>
            <Field label={t("admin.crm.dealModal.company")}>
              <select name="company_id" defaultValue={dealModal?.edit?.company_id || ""} className={inputCls}>
                <option value="">{t("admin.crm.dealModal.noCompany")}</option>
                {companies.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </Field>
          </div>
          <Field label={t("admin.crm.dealModal.stage")}>
            <select name="stage_id" defaultValue={dealModal?.edit?.stage_id || dealModal?.stage_id || ""} className={inputCls}>
              {(stages || []).map((sg: any) => (
                <option key={sg.id} value={sg.id}>{sg.name}</option>
              ))}
            </select>
          </Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label={t("admin.crm.dealModal.value")}>
              <input name="value" type="number" step="0.01" defaultValue={dealModal?.edit?.value ?? 0} className={inputCls} />
            </Field>
            <Field label={t("admin.crm.dealModal.currency")}>
              <select name="currency" defaultValue={dealModal?.edit?.currency || "COP"} className={inputCls}>
                <option>COP</option>
                <option>USD</option>
                <option>EUR</option>
                <option>MXN</option>
              </select>
            </Field>
            <Field label={t("admin.crm.dealModal.prob")}>
              <input name="probability" type="number" min="0" max="100" defaultValue={dealModal?.edit?.probability ?? 10} className={inputCls} />
            </Field>
          </div>
          <Field label={t("admin.crm.dealModal.closeDate")}>
            <input name="expected_close_date" type="date" defaultValue={dealModal?.edit?.expected_close_date || ""} className={inputCls} />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setDealModal(null)} className={btnGhost}>{t("admin.crm.cancel")}</button>
            {dealModal?.edit && (
              <button type="button" onClick={() => handleDeleteDeal(dealModal.edit.id)} className={btnDanger}>{t("admin.crm.delete")}</button>
            )}
            <button type="submit" disabled={saving} className={btnPrimary}>{saving ? t("admin.crm.saving") : t("admin.crm.save")}</button>
          </div>
        </form>
      </Modal>

      {/* ============ MODAL ACTIVIDAD ============ */}
      <Modal
        open={!!activityModal}
        title={activityModal?.edit ? t("admin.crm.activityModal.edit") : t("admin.crm.activityModal.new")}
        onClose={() => setActivityModal(null)}
      >
        <form onSubmit={handleSaveActivity} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label={t("admin.crm.activityModal.type")}>
              <select name="type" defaultValue={activityModal?.edit?.type || "note"} className={inputCls}>
                <option value="note">{t("admin.crm.activityModal.typeNote")}</option>
                <option value="email">{t("admin.crm.activityModal.typeEmail")}</option>
                <option value="call">{t("admin.crm.activityModal.typeCall")}</option>
                <option value="task">{t("admin.crm.activityModal.typeTask")}</option>
                <option value="meeting">{t("admin.crm.activityModal.typeMeeting")}</option>
              </select>
            </Field>
            <Field label={t("admin.crm.activityModal.due")}>
              <input name="due_date" type="date" defaultValue={activityModal?.edit?.due_date || ""} className={inputCls} />
            </Field>
          </div>
          <Field label={t("admin.crm.activityModal.subject")}>
            <input name="subject" required defaultValue={activityModal?.edit?.subject || ""} className={inputCls} placeholder={t("admin.crm.activityModal.subjectPh")} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t("admin.crm.activityModal.person")}>
              <select name="contact_id" defaultValue={activityModal?.edit?.contact_id || ""} className={inputCls}>
                <option value="">{t("admin.crm.activityModal.noPerson")}</option>
                {contacts.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.first_name} {c.last_name || ""}</option>
                ))}
              </select>
            </Field>
            <Field label={t("admin.crm.activityModal.deal")}>
              <select name="deal_id" defaultValue={activityModal?.edit?.deal_id || ""} className={inputCls}>
                <option value="">{t("admin.crm.activityModal.noDeal")}</option>
                {deals.map((d: any) => (
                  <option key={d.id} value={d.id}>{d.title}</option>
                ))}
              </select>
            </Field>
          </div>
          <Field label={t("admin.crm.activityModal.detail")}>
            <textarea name="body" rows={3} defaultValue={activityModal?.edit?.body || ""} className={inputCls} placeholder={t("admin.crm.activityModal.detailPh")} />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setActivityModal(null)} className={btnGhost}>{t("admin.crm.cancel")}</button>
            <button type="submit" disabled={saving} className={btnPrimary}>{saving ? t("admin.crm.saving") : t("admin.crm.save")}</button>
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
                <p className="text-sm text-gray-400 break-all">{detailContact.email || t("admin.crm.contactDetail.noEmail")}</p>
                <p className="text-sm text-gray-400">{detailContact.phone || t("admin.crm.contactDetail.noPhone")}</p>
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
            {(detailContact.job_title || detailContact.birthdate || detailContact.gender || detailContact.experience_years != null || detailContact.created_at) && (
              <div className="border-t border-white/10 pt-3">
                <h4 className="text-sm font-semibold mb-2">{t("admin.crm.contactDetail.profile")}</h4>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
                  {detailContact.job_title && (
                    <div><dt className="text-[11px] text-gray-500">{t("admin.crm.contactModal.jobTitle").replace(" *", "")}</dt><dd className="text-gray-200">{detailContact.job_title}</dd></div>
                  )}
                  {detailContact.birthdate && (
                    <div><dt className="text-[11px] text-gray-500">{t("admin.crm.contactModal.birthdate")}</dt><dd className="text-gray-200">{fmtDate(detailContact.birthdate)}</dd></div>
                  )}
                  {detailContact.gender && (
                    <div><dt className="text-[11px] text-gray-500">{t("admin.crm.contactModal.gender")}</dt><dd className="text-gray-200 capitalize">{detailContact.gender}</dd></div>
                  )}
                  {detailContact.experience_years != null && (
                    <div><dt className="text-[11px] text-gray-500">{t("admin.crm.contactModal.experienceYears")}</dt><dd className="text-gray-200">{detailContact.experience_years}</dd></div>
                  )}
                  {detailContact.phone2 && (
                    <div><dt className="text-[11px] text-gray-500">{t("admin.crm.contactModal.phone2")}</dt><dd className="text-gray-200">{detailContact.phone2}</dd></div>
                  )}
                  {detailContact.created_at && (
                    <div><dt className="text-[11px] text-gray-500">{t("admin.crm.contactDetail.memberSince")}</dt><dd className="text-gray-200">{fmtDate(detailContact.created_at)}</dd></div>
                  )}
                </dl>
              </div>
            )}
            {(detailContact.linkedin || detailContact.github || detailContact.x_handle || detailContact.website) && (
              <div className="border-t border-white/10 pt-3">
                <h4 className="text-sm font-semibold mb-2">{t("admin.crm.contactDetail.social")}</h4>
                <div className="flex flex-wrap gap-1.5">
                  {detailContact.linkedin && <a href={detailContact.linkedin} target="_blank" rel="noreferrer" className="px-2 py-1 text-[11px] rounded bg-white/10 hover:bg-white/20">LinkedIn</a>}
                  {detailContact.github && <a href={detailContact.github} target="_blank" rel="noreferrer" className="px-2 py-1 text-[11px] rounded bg-white/10 hover:bg-white/20">GitHub</a>}
                  {detailContact.x_handle && <a href={detailContact.x_handle.startsWith("http") ? detailContact.x_handle : `https://x.com/${detailContact.x_handle.replace(/^@/, "")}`} target="_blank" rel="noreferrer" className="px-2 py-1 text-[11px] rounded bg-white/10 hover:bg-white/20">X</a>}
                  {detailContact.website && <a href={detailContact.website} target="_blank" rel="noreferrer" className="px-2 py-1 text-[11px] rounded bg-white/10 hover:bg-white/20">{t("admin.crm.contactModal.website")}</a>}
                </div>
              </div>
            )}
            {(detailContact.address || detailContact.owner) && (
              <div className="border-t border-white/10 pt-3">
                <h4 className="text-sm font-semibold mb-2">{t("admin.crm.contactDetail.extra")}</h4>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
                  {detailContact.address && (
                    <div><dt className="text-[11px] text-gray-500">{t("admin.crm.contactModal.address")}</dt><dd className="text-gray-200">{detailContact.address}</dd></div>
                  )}
                  {detailContact.owner && (
                    <div><dt className="text-[11px] text-gray-500">{t("admin.crm.contactModal.owner")}</dt><dd className="text-gray-200">{detailContact.owner}</dd></div>
                  )}
                </dl>
              </div>
            )}
            <div className="border-t border-white/10 pt-3">
              <h4 className="text-sm font-semibold mb-2">{t("admin.crm.contactDetail.deals")}</h4>
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
                <p className="text-xs text-gray-500">{t("admin.crm.contactDetail.noDeals")}</p>
              )}
            </div>
            <div className="border-t border-white/10 pt-3">
              <h4 className="text-sm font-semibold mb-2">{t("admin.crm.contactDetail.activities")}</h4>
              <div className="space-y-2 max-h-52 overflow-y-auto">
                {activities.filter((a: any) => a.contact_id === detailContact.id).map((a: any) => (
                  <div key={a.id} className="text-sm bg-white/5 rounded-md p-2">
                    <span className="px-1.5 py-0.5 text-[10px] rounded bg-white/10 text-gray-300 mr-1.5">{typeLabel(a.type)}</span>
                    <span className={a.done ? "line-through text-gray-500" : ""}>{a.subject}</span>
                    <p className="text-[11px] text-gray-500 mt-0.5">{fmtDateTime(a.created_at)}</p>
                  </div>
                ))}
                {activities.filter((a: any) => a.contact_id === detailContact.id).length === 0 && (
                  <p className="text-xs text-gray-500">{t("admin.crm.contactDetail.noActivities")}</p>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button onClick={() => setContactModal({ edit: detailContact })} className={btnPrimary}>{t("admin.crm.edit")}</button>
              <button onClick={() => setActivityModal({ contact_id: detailContact.id })} className={btnPrimary}>{t("admin.crm.contactDetail.addActivity")}</button>
              <button onClick={() => setSendModal({ contact_id: detailContact.id })} className={btnPrimary}>{t("admin.crm.contactDetail.sendEmail")}</button>
              <button onClick={() => handleDeleteContact(detailContact.id)} className={btnDanger}>{t("admin.crm.delete")}</button>
            </div>
          </div>
        )}
      </Modal>

      {/* ============ MODAL PLANTILLA ============ */}
      <Modal
        open={!!templateModal}
        title={templateModal?.edit ? t("admin.crm.templateModal.edit") : t("admin.crm.templateModal.new")}
        onClose={() => setTemplateModal(null)}
      >
        <form onSubmit={handleSaveTemplate} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label={t("admin.crm.templateModal.name")}>
              <input name="name" required defaultValue={templateModal?.edit?.name || ""} className={inputCls} placeholder={t("admin.crm.templateModal.namePh")} />
            </Field>
            <Field label={t("admin.crm.templateModal.status")}>
              <select name="is_active" defaultValue={templateModal?.edit ? (templateModal.edit.is_active ? "true" : "false") : "true"} className={inputCls}>
                <option value="true">{t("admin.crm.emailsTab.active")}</option>
                <option value="false">{t("admin.crm.emailsTab.paused")}</option>
              </select>
            </Field>
          </div>
          <Field label={t("admin.crm.templateModal.subject")}>
            <input name="subject" required defaultValue={templateModal?.edit?.subject || ""} className={inputCls} placeholder="Propuesta de alcance para {{contact.first_name}}" />
          </Field>
          <Field label={t("admin.crm.templateModal.subjectEn")}>
            <input name="subject_en" defaultValue={templateModal?.edit?.subject_en || ""} className={inputCls} placeholder="Scope proposal for {{contact.first_name}}" />
          </Field>
          <Field label={t("admin.crm.templateModal.body")}>
            <textarea name="body" rows={6} defaultValue={templateModal?.edit?.body || ""} className={inputCls + " font-mono text-xs"} placeholder={"Hola {{contact.first_name}},\n\n…" } />
          </Field>
          <Field label={t("admin.crm.templateModal.bodyEn")}>
            <textarea name="body_en" rows={6} defaultValue={templateModal?.edit?.body_en || ""} className={inputCls + " font-mono text-xs"} placeholder={"Hi {{contact.first_name}},\n\n…"} />
          </Field>
          <p className="text-[10px] text-gray-500">
            {t("admin.crm.templateModal.placeholdersNote")}{" "}
              {"{{contact.first_name}}, {{contact.full_name}}, {{company.name}}, {{deal.title}}, {{deal.value}}"}
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setTemplateModal(null)} className={btnGhost}>{t("admin.crm.cancel")}</button>
            <button type="submit" disabled={saving} className={btnPrimary}>{saving ? t("admin.crm.saving") : t("admin.crm.save")}</button>
          </div>
        </form>
      </Modal>

      {/* ============ MODAL ENVÍO DE EMAIL ============ */}
      <Modal open={!!sendModal} title={t("admin.crm.sendModal.title")} onClose={() => setSendModal(null)}>
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
        title={contractModal?.edit ? t("admin.crm.contractModal.edit") : t("admin.crm.contractModal.new")}
        onClose={() => setContractModal(null)}
      >
        <form onSubmit={handleSaveContract} className="space-y-3">
          <Field label={t("admin.crm.contractModal.title")}>
            <input name="title" required defaultValue={contractModal?.edit?.title || ""} className={inputCls} placeholder={t("admin.crm.contractModal.titlePh")} />
          </Field>
          <Field label={t("admin.crm.contractModal.titleEn")}>
            <input name="title_en" defaultValue={contractModal?.edit?.title_en || ""} className={inputCls} placeholder="Website project — initial scope" />
          </Field>
          <Field label={t("admin.crm.contractModal.ctype")}>
            <select name="contract_type" defaultValue={contractModal?.edit?.contract_type || "servicios"} className={inputCls}>
              {(["servicios", "consultoria", "nda", "oferta", "soporte", "licencia", "otro"] as const).map((ct) => (
                <option key={ct} value={ct}>{t(`admin.crm.contractTypes.${ct}`)}</option>
              ))}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t("admin.crm.contractModal.contact")}>
              <select name="contact_id" defaultValue={contractModal?.edit?.contact_id || contractModal?.edit?.contact?.id || ""} className={inputCls}>
                <option value="">{t("admin.crm.contractModal.noContact")}</option>
                {contacts.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.first_name} {c.last_name || ""}</option>
                ))}
              </select>
            </Field>
            <Field label={t("admin.crm.contractModal.company")}>
              <select name="company_id" defaultValue={contractModal?.edit?.company_id || contractModal?.edit?.company?.id || ""} className={inputCls}>
                <option value="">{t("admin.crm.contractModal.noCompany")}</option>
                {companies.map((co: any) => (
                  <option key={co.id} value={co.id}>{co.name}</option>
                ))}
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t("admin.crm.contractModal.currency")}>
              <select name="currency" defaultValue={contractModal?.edit?.currency || "EUR"} className={inputCls}>
                <option value="EUR">EUR — €</option>
                <option value="USD">USD — $</option>
                <option value="COP">COP — $</option>
              </select>
            </Field>
            <Field label={t("admin.crm.contractModal.amount")}>
              <input name="value" type="number" step="0.01" defaultValue={contractModal?.edit?.value ?? ""} className={inputCls} placeholder="0.00" />
            </Field>
          </div>
          <Field label={t("admin.crm.contractModal.terms")}>
            <textarea name="terms" required rows={6} defaultValue={contractModal?.edit?.terms || ""} className={inputCls + " font-mono text-xs"} placeholder={t("admin.crm.contractModal.termsPh")} />
          </Field>
          <Field label={t("admin.crm.contractModal.termsEn")}>
            <textarea name="terms_en" rows={6} defaultValue={contractModal?.edit?.terms_en || ""} className={inputCls + " font-mono text-xs"} placeholder={"1. Scope\n2. Timeline\n3. Payments\n…"} />
          </Field>
          {contractModal?.edit ? (
            <p className="text-[10px] text-gray-500">
              {t("admin.crm.contractModal.editNote")}
            </p>
          ) : (
            <p className="text-[10px] text-gray-500">
              {t("admin.crm.contractModal.createNote")}
            </p>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setContractModal(null)} className={btnGhost}>{t("admin.crm.cancel")}</button>
            <button type="submit" disabled={saving} className={btnPrimary}>{saving ? t("admin.crm.saving") : t("admin.crm.save")}</button>
          </div>
        </form>
      </Modal>

      <Modal
        open={!!importPreview}
        title={t("admin.crm.mapTitle")}
        onClose={() => setImportPreview(null)}
      >
        {importPreview && (
          <div className="space-y-3">
            <p className="text-xs text-gray-400">{t("admin.crm.mapHint")}</p>
            <div className="rounded-lg border border-white/10 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-[#18181b] text-gray-400">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium">
                      {t("admin.crm.mapTitle")}
                    </th>
                    <th className="text-left px-3 py-2 font-medium">
                      {t("admin.crm.mapSourceCol")}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {importFields
                    .filter((f) => f.kind === importPreview.kind)
                    .map((f) => {
                      const current = importPreview.mapping[f.key];
                      return (
                        <tr key={`${f.kind}-${f.key}`}>
                          <td className="px-3 py-2 text-gray-300">{f.label}</td>
                          <td className="px-3 py-2">
                            <select
                              value={current ?? -1}
                              onChange={(e) => {
                                const v = Number(e.target.value);
                                setImportPreview((p) =>
                                  p
                                    ? {
                                        ...p,
                                        mapping: { ...p.mapping, [f.key]: v },
                                      }
                                    : p
                                );
                              }}
                              className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-sm cursor-pointer"
                            >
                              <option value={-1}>
                                {t("admin.crm.mapIgnore")}
                              </option>
                              {importPreview.headers.map((h, i) => (
                                <option key={i} value={i}>
                                  {h || `Columna ${i + 1}`}
                                </option>
                              ))}
                            </select>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
            {importPreview.unmatched.length > 0 && (
              <p className="text-[11px] text-gray-500">
                {t("admin.crm.mapUnmatched")}:{" "}
                {importPreview.unmatched.join(", ")}
              </p>
            )}
            <p className="text-[11px] text-gray-500">
              {importPreview.grid.length - 1} {t("admin.crm.contacts")}
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setImportPreview(null)}
                className={btnGhost}
              >
                {t("admin.crm.cancel")}
              </button>
              <button
                type="button"
                onClick={confirmImport}
                disabled={importing}
                className={btnPrimary}
              >
                {importing
                  ? t("admin.crm.importing")
                  : t("admin.crm.mapImport")}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ============ TOAST / DRAWERS / GESTIÓN DE CAMPOS ============ */}
      {notice && (
        <div className="fixed bottom-5 right-5 z-[60] max-w-sm rounded-lg border border-red-500/30 bg-[#2a1216] px-4 py-3 text-sm text-red-200 shadow-2xl">
          {notice}
        </div>
      )}

      {liveContact && (
        <RecordDrawer
          entity="person"
          rec={liveContact}
          fields={fieldsPerson}
          avatar={<AvatarView rec={liveContact} entity="person" />}
          extras={[
            {
              key: "company",
              label: t("admin.crm.contactModal.company"),
              type: "select",
              options: [
                { value: null, label: t("admin.crm.contactModal.noCompany") },
                ...companies.map((c) => ({ value: c.id, label: c.name })),
              ],
              value: liveContact.company_id || null,
              onCommit: (v) => handleSetContactCompany(liveContact, v),
            },
            {
              key: "source",
              label: t("admin.crm.contactsTab.thOrigin"),
              type: "select",
              options: [
                { value: null, label: t("admin.crm.contactModal.srcManual") },
                ...["manual", "tally", "whatsapp", "portfolio", "web", "form", "import", "status"].map(
                  (s) => ({ value: s, label: s })
                ),
              ],
              value: liveContact.source || "manual",
              onCommit: (v) => handleSetContactSource(liveContact, v),
            },
          ]}
          onClose={() => setDrawerContact(null)}
          onCommit={(f, v) => commitCell("person", liveContact, f, v)}
          onDelete={(c) => handleRowDelete("person", c)}
          suggestions={allTags}
        />
      )}

      {liveCompany && (
        <RecordDrawer
          entity="company"
          rec={liveCompany}
          fields={fieldsCompany}
          avatar={<AvatarView rec={liveCompany} entity="company" />}
          onClose={() => setDrawerCompany(null)}
          onCommit={(f, v) => commitCell("company", liveCompany, f, v)}
          onDelete={(c) => handleRowDelete("company", c)}
          suggestions={allTags}
        />
      )}

      {fieldsPanel && (
        <FieldManager
          entity={fieldsPanel}
          fields={fieldsPanel === "person" ? fieldsPerson : fieldsCompany}
          onClose={() => setFieldsPanel(null)}
          onCreate={(v) => handleFieldCreate(fieldsPanel, v)}
          onUpdate={(id, p) => handleFieldUpdate(id, p)}
          onDelete={(id) => handleFieldDelete(id)}
        />
      )}
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
  const { t } = useTranslation();
  const [selContact, setSelContact] = useState(contactId || "");
  const [selTemplate, setSelTemplate] = useState("");
  const [selDeal, setSelDeal] = useState("");
  const [lang, setLang] = useState<"es" | "en">("es");

  const contact = contacts.find((c) => c.id === selContact);
  const deal = deals.find((d) => d.id === selDeal);
  const template = templates.find((tm) => tm.id === selTemplate);
  const subjSrc = lang === "en" && template?.subject_en ? template.subject_en : template?.subject;
  const bodySrc = lang === "en" && template?.body_en ? template.body_en : template?.body;

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <Field label={t("admin.crm.sendModal.contact")}>
        <select name="contact_id" required className={inputCls} value={selContact} onChange={(e) => setSelContact(e.target.value)}>
          <option value="">{t("admin.crm.sendModal.select")}</option>
          {contacts.map((c: any) => (
            <option key={c.id} value={c.id}>
              {c.first_name} {c.last_name || ""} — {c.email || t("admin.crm.sendModal.noEmailOpt")}
            </option>
          ))}
        </select>
      </Field>
      <Field label={t("admin.crm.sendModal.template")}>
        <select name="template_id" required className={inputCls} value={selTemplate} onChange={(e) => setSelTemplate(e.target.value)}>
          <option value="">{t("admin.crm.sendModal.select")}</option>
          {templates.map((tm: any) => (
            <option key={tm.id} value={tm.id}>{tm.is_active ? "" : t("admin.crm.sendModal.pausedOpt")}{tm.name}</option>
          ))}
        </select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label={t("admin.crm.sendModal.deal")}>
          <select name="deal_id" className={inputCls} value={selDeal} onChange={(e) => setSelDeal(e.target.value)}>
            <option value="">{t("admin.crm.sendModal.noDeal")}</option>
            {(deals || []).map((d: any) => (
              <option key={d.id} value={d.id}>{d.title}</option>
            ))}
          </select>
        </Field>
        <Field label={t("admin.crm.sendModal.lang")}>
          <div className="flex gap-1.5">
            {(["es", "en"] as const).map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setLang(l)}
                className={`flex-1 px-2 py-2 text-xs font-semibold rounded-md border cursor-pointer transition-colors ${
                  lang === l
                    ? "border-[#8c52ff] bg-[#8c52ff]/20 text-white"
                    : "border-white/10 bg-white/5 text-gray-400 hover:text-white"
                }`}
              >
                {l === "es" ? "Español" : "English"}
              </button>
            ))}
          </div>
        </Field>
      </div>
      <input type="hidden" name="lang" value={lang} />
      {template && contact?.email && (
        <div className="rounded-lg border border-white/10 bg-white/5 p-3 space-y-2">
          <p className="text-xs text-gray-400">{t("admin.crm.sendModal.preview")}</p>
          <p className="text-sm font-semibold break-words">{renderBody(subjSrc, contact, deal)}</p>
          <div className="text-[13px] text-gray-300 whitespace-pre-line break-words border-t border-white/10 pt-2">
            {renderBody(bodySrc, contact, deal)}
          </div>
        </div>
      )}
      {template && !contact?.email && (
        <p className="text-xs text-red-400">{t("admin.crm.sendModal.noEmailWarn")}</p>
      )}
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onClose} className={btnGhost}>{t("admin.crm.cancel")}</button>
        <button type="submit" disabled={sending || !template || !contact?.email} className={btnPrimary}>
          {sending ? t("admin.crm.sending") : t("admin.crm.send")}
        </button>
      </div>
    </form>
  );
}