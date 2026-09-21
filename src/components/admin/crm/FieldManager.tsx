import { useMemo, useState } from "react";
import { useTranslation } from "../../../lib/i18n";
import { FIELD_TYPE_LABELS, sortFields, tp, type CrmEntity, type CrmField } from "./types";
import { FieldIcon } from "./Cells";
import { EyeIcon, EyeOffIcon, SlidersIcon } from "./icons";

export interface FieldManagerProps {
  entity: CrmEntity;
  fields: CrmField[];
  onClose: () => void;
  onCreate: (values: { label: string; type: string; icon: string; options: string[] }) => Promise<void> | void;
  onUpdate: (id: string, patch: Partial<CrmField>) => Promise<void> | void;
  onDelete: (id: string) => Promise<void> | void;
}

const TYPE_OPTIONS = Object.entries(FIELD_TYPE_LABELS).map(([value, label]) => ({ value, label }));

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export default function FieldManager({ entity, fields, onClose, onCreate, onUpdate, onDelete }: FieldManagerProps) {
  const { t } = useTranslation();
  const sorted = useMemo(() => sortFields(fields), [fields]);

  const [showForm, setShowForm] = useState(false);
  const [label, setLabel] = useState("");
  const [type, setType] = useState("text");
  const [icon, setIcon] = useState("");
  const [optionsRaw, setOptionsRaw] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const isSelect = type === "select" || type === "multi_select";

  const save = async () => {
    const l = label.trim();
    if (!l) {
      setErr(t("admin.crm.fields.nameRequired"));
      return;
    }
    if (fields.some((f) => slugify(f.name) === slugify(l))) {
      setErr(t("admin.crm.fields.nameTaken"));
      return;
    }
    setSaving(true);
    setErr(null);
    try {
      await onCreate({
        label: l,
        type,
        icon: icon.trim() || "•",
        options: isSelect
          ? optionsRaw
              .split(",")
              .map((o) => o.trim())
              .filter(Boolean)
          : [],
      });
      setLabel("");
      setType("text");
      setIcon("");
      setOptionsRaw("");
      setShowForm(false);
    } catch (e: any) {
      setErr(e.message || t("admin.crm.fields.error"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative flex h-full w-full max-w-[380px] flex-col border-l border-white/10 bg-[#121212] shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
            <SlidersIcon className="h-4 w-4 text-gray-400" />
            {tp(t("admin.crm.fields.title"), { entity: entity === "person" ? t("admin.crm.tabContact") : t("admin.crm.tabCompany") })}
          </h3>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowForm((s) => !s)}
              className="rounded-lg border border-[#2093c4]/40 bg-[#2093c4]/10 px-2.5 py-1 text-xs font-medium text-[#7cc7e0] hover:bg-[#2093c4]/20 cursor-pointer"
            >
              + {t("admin.crm.fields.add")}
            </button>
            <button type="button" onClick={onClose} className="cursor-pointer text-gray-400 hover:text-white" aria-label={t("admin.crm.fields.close")}>
              ✕
            </button>
          </div>
        </div>

        {showForm && (
          <div className="border-b border-white/10 bg-white/[0.03] px-4 py-3">
            <label className="mb-1 block text-[11px] font-medium text-gray-500">{t("admin.crm.fields.labelField")}</label>
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder={t("admin.crm.fields.labelPh")}
              className="mb-2 w-full rounded-lg border border-white/10 bg-[#1A1A1A] px-2.5 py-1.5 text-sm text-white outline-none focus:border-[#2093c4]"
            />
            <div className="mb-2 grid grid-cols-[1fr_64px] gap-2">
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-[#1A1A1A] px-2.5 py-1.5 text-sm text-white outline-none focus:border-[#2093c4] cursor-pointer"
              >
                {TYPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              <input
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
                placeholder="emoji"
                className="w-full rounded-lg border border-white/10 bg-[#1A1A1A] px-2 py-1.5 text-center text-sm text-white outline-none focus:border-[#2093c4]"
              />
            </div>
            {isSelect && (
              <input
                value={optionsRaw}
                onChange={(e) => setOptionsRaw(e.target.value)}
                placeholder={t("admin.crm.fields.optionsPh")}
                className="mb-2 w-full rounded-lg border border-white/10 bg-[#1A1A1A] px-2.5 py-1.5 text-sm text-white outline-none focus:border-[#2093c4]"
              />
            )}
            {err && <p className="mb-2 text-xs text-red-400">{err}</p>}
            <button
              type="button"
              onClick={save}
              disabled={saving || !label.trim()}
              className="w-full rounded-lg bg-[#2093c4]/20 py-1.5 text-sm font-medium text-[#7cc7e0] hover:bg-[#2093c4]/30 disabled:opacity-40 cursor-pointer"
            >
              {saving ? "…" : t("admin.crm.fields.saveField")}
            </button>
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-auto px-2 py-2">
          {sorted.map((f) => (
            <div
              key={f.id}
              className={`mb-1 flex items-center gap-2 rounded-lg px-2 py-1.5 ${
                f.is_visible ? "hover:bg-white/5" : "opacity-50"
              }`}
            >
              <FieldIcon field={f} />
              <button
                type="button"
                onClick={() => onUpdate(f.id, { is_visible: !f.is_visible })}
                className="min-w-0 flex-1 cursor-pointer text-left"
                title={t("admin.crm.fields.toggle")}
              >
                <span className="block truncate text-sm text-white">{f.label}</span>
                <span className="block text-[11px] text-gray-500">
                  {FIELD_TYPE_LABELS[f.type] || f.type}
                  {f.is_system ? " · " + t("admin.crm.fields.system") : ""}
                  {f.is_readonly ? " · " + t("admin.crm.fields.readonly") : ""}
                </span>
              </button>
              <button
                type="button"
                onClick={() => onUpdate(f.id, { is_visible: !f.is_visible })}
                className="cursor-pointer text-gray-500 hover:text-white"
                title={f.is_visible ? t("admin.crm.fields.hide") : t("admin.crm.fields.show")}
              >
                {f.is_visible ? (
                  <EyeIcon className="h-4 w-4" />
                ) : (
                  <EyeOffIcon className="h-4 w-4" />
                )}
              </button>
              {!f.is_system && (
                <button
                  type="button"
                  onClick={() => {
                    if (confirm(t("admin.crm.fields.confirmDelete"))) onDelete(f.id);
                  }}
                  className="cursor-pointer text-gray-600 hover:text-red-400"
                  title={t("admin.crm.fields.delete")}
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}