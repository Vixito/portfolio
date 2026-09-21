import { useMemo, useState, type ReactNode } from "react";
import { useTranslation } from "../../../lib/i18n";
import { cellValue, sortFields, type CrmEntity, type CrmField, type RecordRow } from "./types";
import { CellEditor, FieldIcon } from "./Cells";
import { TrashIcon } from "./icons";

export interface ExtraOption {
  value: string | null;
  label: string;
}

export interface ExtraRow {
  key: string;
  label: string;
  type: "select" | "text";
  options?: ExtraOption[];
  value: any;
  onCommit: (v: any) => Promise<void> | void;
}

export interface RecordDrawerProps {
  entity: CrmEntity;
  rec: RecordRow | null;
  fields: CrmField[];
  avatar?: ReactNode;
  extras?: ExtraRow[];
  onClose: () => void;
  onCommit: (field: CrmField, value: any) => Promise<void> | void;
  onDelete: (rec: RecordRow) => void;
  suggestions?: string[];
}

export default function RecordDrawer({
  rec,
  fields,
  avatar,
  extras = [],
  onClose,
  onCommit,
  onDelete,
  suggestions,
}: RecordDrawerProps) {
  const { t } = useTranslation();
  // Solo campos visibles: lo oculto en Campos no muestra su dato aquí tampoco.
  const sorted = useMemo(() => sortFields(fields).filter((f) => f.is_visible), [fields]);
  const [busy, setBusy] = useState<string | null>(null);

  if (!rec) return null;

  const serial = (v: any) => (v === null || v === undefined ? "" : JSON.stringify(v));

  const handleCommit = async (key: string, fn: () => Promise<void> | void) => {
    setBusy(key);
    try {
      await fn();
    } catch {
      /* revert por el padre */
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative flex h-full w-full max-w-[460px] flex-col border-l border-white/10 bg-[#121212] shadow-2xl">
        {/* cabecera */}
        <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
          {avatar}
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-sm font-semibold text-white">
              {t("admin.crm.drawer.title")}
            </h3>
          </div>
          <button
            type="button"
            onClick={() => onDelete(rec)}
            className="cursor-pointer rounded px-2 py-1 text-gray-500 hover:bg-red-500/10 hover:text-red-300"
            title={t("admin.crm.drawer.delete")}
          >
            <TrashIcon className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded px-2 py-1 text-gray-400 hover:bg-white/10 hover:text-white"
            aria-label={t("admin.crm.drawer.close")}
          >
            ✕
          </button>
        </div>

        {/* cuerpo */}
        <div className="min-h-0 flex-1 overflow-auto px-4 py-3">
          {extras.length > 0 && (
            <div className="mb-3 rounded-xl border border-white/10 bg-white/[0.03] p-3">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                {t("admin.crm.drawer.relationship")}
              </p>
              {extras.map((x) => (
                <div key={x.key} className="mb-2 flex items-center gap-2 text-sm last:mb-0">
                  <span className="w-20 shrink-0 text-[11px] text-gray-500">{x.label}</span>
                  {busy === x.key ? (
                    <span className="text-xs text-[#7cc7e0]">…</span>
                  ) : x.type === "select" ? (
                    <select
                      value={x.value ? String(x.value) : ""}
                      onChange={(e) => handleCommit(x.key, () => x.onCommit(e.target.value || null))}
                      className="min-w-0 flex-1 rounded-lg border border-white/10 bg-[#1A1A1A] px-2 py-1.5 text-sm text-white outline-none focus:border-[#2093c4] cursor-pointer"
                    >
                      {(x.options || []).map((o) => (
                        <option key={o.value ?? ""} value={o.value ?? ""}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      defaultValue={x.value ?? ""}
                      onBlur={(e) => handleCommit(x.key, () => x.onCommit(e.target.value || null))}
                      className="min-w-0 flex-1 rounded-lg border border-white/10 bg-[#1A1A1A] px-2 py-1.5 text-sm text-white outline-none focus:border-[#2093c4]"
                    />
                  )}
                </div>
              ))}
            </div>
          )}

          {sorted.map((f) => {
            if (f.is_readonly) {
              return (
                <div key={f.name} className="flex items-center gap-2 border-b border-white/5 py-2 text-sm">
                  <FieldIcon field={f} />
                  <span className="w-28 shrink-0 text-[11px] text-gray-500">{f.label}</span>
                  <span className="truncate text-gray-400">{cellValue(rec, f) ? String(cellValue(rec, f)) : "—"}</span>
                </div>
              );
            }
            const value = cellValue(rec, f);
            return (
              <div key={f.name} className="border-b border-white/5 py-2">
                <div className="mb-1 flex items-center gap-2">
                  <FieldIcon field={f} />
                  <span className="text-[11px] font-medium text-gray-400">{f.label}</span>
                  {busy === `field-${f.name}` && <span className="text-[10px] text-[#7cc7e0]">…</span>}
                </div>
                {busy === `field-${f.name}` ? (
                  <div className="text-sm text-gray-600">…</div>
                ) : (
                  <CellEditor
                    key={`${f.name}-${serial(value)}`}
                    field={f}
                    value={value}
                    suggestions={suggestions}
                    onCommit={(v) => busy || handleCommit(`field-${f.name}`, () => onCommit(f, v) )}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}