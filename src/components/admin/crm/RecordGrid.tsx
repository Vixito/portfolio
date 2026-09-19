import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { CrmEntity, CrmField, RecordRow } from "./types";
import {
  cellValue,
  PRIMARY_FIELD,
  recordName,
  recordSearchText,
  sortFields,
  visibleFields,
} from "./types";
import { CellEditor, CellView, FieldIcon } from "./Cells";
import { useTranslation } from "../../../lib/i18n";

export interface RowMenuAction {
  id: string;
  label: string;
  danger?: boolean;
  onClick: (rec: RecordRow) => void;
}

export interface RecordGridProps {
  entity: CrmEntity;
  fields: CrmField[];
  records: RecordRow[];
  onOpen: (rec: RecordRow) => void;
  onCellCommit: (rec: RecordRow, field: CrmField, value: any) => Promise<void> | void;
  onHide: (field: CrmField) => void;
  rowMenu: RowMenuAction[];
  creating?: boolean;
  creatingBusy?: boolean;
  onCreate: (values: Record<string, any>) => void | Promise<void>;
  onCreateCancel: () => void;
  onOpenFields: () => void;
  selection: Set<string>;
  onToggleSelect: (id: string) => void;
  onToggleAll: (ids: string[]) => void;
  onClearSelection: () => void;
  onBulkDelete: (ids: string[]) => void;
  entityLabel: string;
  suggestions?: string[];
  busyCell?: (recId: string, fieldName: string) => boolean;
  actions?: ReactNode;
}

function useClickAway(ref: React.RefObject<HTMLElement>, onAway: () => void) {
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onAway();
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [ref, onAway]);
}

function initials(name: string) {
  const p = name
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return p || "?";
}

function HUE(id: string) {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) % 360;
  return h;
}

export function AvatarView({ rec, entity }: { rec: RecordRow; entity: CrmEntity }) {
  const img = entity === "person" ? rec.photo_url || rec.avatar : rec.logo_url || rec.logotipo;
  const name = recordName(rec, entity);
  const hue = HUE(rec.id);
  if (img) {
    return (
      <img src={img} alt="" className="h-7 w-7 shrink-0 rounded object-cover ring-1 ring-white/10 bg-white/5" />
    );
  }
  return (
    <span
      className="h-7 w-7 shrink-0 rounded flex items-center justify-center text-[10px] font-bold text-white/80"
      style={{ backgroundColor: `hsl(${hue} 45% 22%)` }}
    >
      {initials(name)}
    </span>
  );
}

function PrimaryCell({ rec, entity, onOpen }: { rec: RecordRow; entity: CrmEntity; onOpen: () => void }) {
  const { t } = useTranslation();
  const name = recordName(rec, entity);
  const sub =
    entity === "person"
      ? [rec.job_title, rec.email].filter(Boolean).join(" · ")
      : String(
          (Array.isArray(rec.data?.dominios) && rec.data?.dominios.join(", ")) ||
            rec.domain ||
            rec.email ||
            ""
        );
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full cursor-pointer items-center gap-2 text-left"
      title={t("admin.crm.grid.open")}
    >
      <AvatarView rec={rec} entity={entity} />
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium text-white">{name || "—"}</span>
        {sub && <span className="block max-w-[170px] truncate text-[11px] text-gray-500">{sub}</span>}
      </span>
    </button>
  );
}

function SaveSpinner() {
  return (
    <span className="ml-1 inline-block h-3 w-3 animate-spin rounded-full border-2 border-[#2093c4] border-t-transparent align-middle" />
  );
}

export default function RecordGrid(props: RecordGridProps) {
  const { t } = useTranslation();
  const {
    entity,
    fields,
    records,
    onOpen,
    onCellCommit,
    onHide,
    rowMenu,
    creating,
    creatingBusy,
    onCreate,
    onCreateCancel,
    onOpenFields,
    selection,
    onToggleSelect,
    onToggleAll,
    onClearSelection,
    onBulkDelete,
    entityLabel,
    suggestions,
    busyCell,
    actions,
  } = props;

  const primary = useMemo(
    () => sortFields(fields).find((f) => f.name === PRIMARY_FIELD[entity]),
    [fields, entity]
  );
  const visible = useMemo(() => visibleFields(fields, entity), [fields, entity]);
  const columns = useMemo(() => (primary ? [primary, ...visible] : visible), [primary, visible]);

  const template = useMemo(
    () =>
      [
        "44px",
        entity === "person" ? "250px" : "230px",
        ...columns.slice(primary ? 1 : 0).map(() => "minmax(160px, 1fr)"),
        "40px",
        "52px",
      ].join(" "),
    [columns, entity, primary]
  );

  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<{ recId: string; fieldName: string } | null>(null);
  const [draft, setDraft] = useState<Record<string, any>>({});
  const [sortKey, setSortKey] = useState<string>(primary ? PRIMARY_FIELD[entity] : "");
  const [sortDir, setSortDir] = useState<1 | -1>(1);
  const [colMenu, setColMenu] = useState<string | null>(null);
  const [rowMenuRec, setRowMenuRec] = useState<string | null>(null);
  const colMenuRef = useRef<HTMLDivElement>(null);
  const rowMenuRef = useRef<HTMLDivElement>(null);
  useClickAway(colMenuRef, () => setColMenu(null));
  useClickAway(rowMenuRef, () => setRowMenuRec(null));

  const sorted = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = q ? records.filter((r) => recordSearchText(r, fields).includes(q)) : [...records];
    if (sortKey) {
      const f = fields.find((x) => x.name === sortKey);
      if (f) {
        list.sort((a, b) => {
          const av = cellValue(a, f);
          const bv = cellValue(b, f);
          const ax = av == null ? "" : String(av).toLowerCase();
          const bx = bv == null ? "" : String(bv).toLowerCase();
          if (ax === bx) return 0;
          return ax < bx ? -sortDir : sortDir;
        });
      }
    }
    return list;
  }, [records, fields, search, sortKey, sortDir]);

  const allIds = sorted.map((r) => r.id);
  const someSelected = selection.size > 0;
  const allSelected = allIds.length > 0 && allIds.every((id) => selection.has(id));

  const toggleSort = (field: CrmField) => {
    setEditing(null);
    if (sortKey === field.name) setSortDir((d) => (d === 1 ? -1 : 1));
    else {
      setSortKey(field.name);
      setSortDir(1);
    }
  };

  const startEdit = (rec: RecordRow, field: CrmField) => {
    if (field.is_readonly) return;
    setRowMenuRec(null);
    setEditing({ recId: rec.id, fieldName: field.name });
  };

  const commitEdit = async (rec: RecordRow, field: CrmField, value: any) => {
    setEditing(null);
    try {
      await onCellCommit(rec, field, value);
    } catch {
      /* revert handled por el padre */
    }
  };

  const renderCell = (rec: RecordRow, field: CrmField) => {
    const active = editing?.recId === rec.id && editing?.fieldName === field.name;
    const value = cellValue(rec, field);
    const busy = busyCell?.(rec.id, field.name) || false;

    if (active) {
      return (
        <CellEditor
          key={`${rec.id}-${field.name}`}
          field={field}
          value={value}
          suggestions={suggestions}
          autoFocus
          onCommit={(v) => commitEdit(rec, field, v)}
          onCancel={() => setEditing(null)}
        />
      );
    }
    if (busy) {
      return (
        <span className="flex items-center gap-1.5 text-gray-400">
          <SaveSpinner />
          <CellView field={field} value={value} />
        </span>
      );
    }
    return (
      <button
        type="button"
        onClick={() => startEdit(rec, field)}
        className="block w-full cursor-text rounded px-2 py-1 text-left hover:bg-white/[0.03]"
        title={`${field.label} — ${t("admin.crm.grid.clickToEdit")}`}
      >
        <CellView field={field} value={value} />
      </button>
    );
  };

  const renderNewRowCell = (field: CrmField) => (
    <div key={`new-${field.name}`} className="px-1 py-1">
      <CellEditor
        field={field}
        value={draft[field.name] ?? null}
        suggestions={suggestions}
        onCommit={(v) => setDraft((d) => ({ ...d, [field.name]: v }))}
      />
    </div>
  );

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* barra de herramientas */}
      <div className="flex flex-wrap items-center gap-2 px-1 pb-2">
        <div className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 focus-within:border-[#2093c4]">
          <span className="text-sm text-gray-500">🔍</span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("admin.crm.grid.search", { entity: entityLabel.toLowerCase() })}
            className="w-44 bg-transparent text-sm outline-none placeholder:text-gray-600 sm:w-56"
          />
          {search && (
            <button type="button" onClick={() => setSearch("")} className="text-xs text-gray-500 hover:text-white cursor-pointer">✕</button>
          )}
        </div>
        {someSelected && (
          <button
            type="button"
            onClick={() => onBulkDelete([...selection])}
            className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-sm font-medium text-red-300 hover:bg-red-500/20 cursor-pointer"
          >
            {t("admin.crm.grid.deleteSelected", { n: selection.size })}
          </button>
        )}
        <button
          type="button"
          onClick={onOpenFields}
          className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-gray-300 hover:bg-white/10 cursor-pointer"
        >
          ⚙️ {t("admin.crm.grid.fields")}
        </button>
        {actions}
        <div className="flex-1" />
        {creating ? (
          <div className="flex items-center gap-1.5 text-xs text-emerald-300">
            {creatingBusy && <SaveSpinner />}
            {t("admin.crm.grid.creatingLabel", { entity: entityLabel })}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => {
              setDraft({});
              setSearch("");
            }}
            className="rounded-lg bg-[#2093c4] px-3 py-1.5 text-sm font-semibold text-white shadow hover:bg-[#22a5db] cursor-pointer"
          >
            + {t("admin.crm.grid.new", { entity: entityLabel })}
          </button>
        )}
      </div>

      {/* tabla */}
      {records.length === 0 && !creating ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center text-sm text-gray-500">
          <span className="text-4xl">{entity === "person" ? "👤" : "🏢"}</span>
          {t("admin.crm.grid.empty", { entity: entityLabel })}
          <button
            type="button"
            onClick={() => setDraft({})}
            className="rounded-lg bg-[#2093c4] px-3 py-1.5 text-sm font-semibold text-white cursor-pointer"
          >
            + {t("admin.crm.grid.new", { entity: entityLabel })}
          </button>
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-auto rounded-lg border border-white/10 bg-[#121215]">
          <div className="w-max min-w-full">
            {/* header */}
            <div
              className="grid border-b border-white/10 bg-[#1a1a1f] text-[11px] font-semibold uppercase tracking-wider text-gray-500"
              style={{ gridTemplateColumns: template }}
            >
              <div className="flex items-center justify-center px-2 py-2">
                <span
                  className={`h-3.5 w-3.5 rounded border cursor-pointer inline-flex items-center justify-center text-[10px] ${
                    allSelected ? "border-[#2093c4] bg-[#2093c4] text-white" : "border-white/30"
                  }`}
                  onClick={() => (allSelected ? onClearSelection() : onToggleAll(allIds))}
                  role="button"
                  aria-label={t("admin.crm.grid.selectAll")}
                >
                  {allSelected ? "✓" : ""}
                </span>
              </div>
              <div className="flex items-center gap-1 px-3 py-2">
                <FieldIcon field={primary} className="h-3.5 w-3.5" />
                <button
                  type="button"
                  onClick={() => primary && toggleSort(primary)}
                  className="cursor-pointer hover:text-white"
                >
                  {primary?.label}
                </button>
                {sortKey === primary?.name && (
                  <span className="text-[#2093c4]">{sortDir === 1 ? "▲" : "▼"}</span>
                )}
              </div>
              {visible.map((f) => (
                <div key={f.name} className="group flex items-center gap-1 px-3 py-2">
                  <FieldIcon field={f} className="h-3.5 w-3.5" />
                  <button
                    type="button"
                    onClick={() => toggleSort(f)}
                    className="cursor-pointer hover:text-white"
                  >
                    {f.label}
                  </button>
                  {sortKey === f.name && (
                    <span className="text-[#2093c4]">{sortDir === 1 ? "▲" : "▼"}</span>
                  )}
                  <span
                    role="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setColMenu(colMenu === f.name ? null : f.name);
                    }}
                    className="cursor-pointer opacity-0 transition-opacity group-hover:opacity-100 hover:text-white"
                  >
                    ▾
                  </span>
                </div>
              ))}
              <div className="px-2 py-2" />
              <div className="flex items-center justify-center px-2 py-2">
                <button
                  type="button"
                  onClick={onOpenFields}
                  className="cursor-pointer text-gray-500 hover:text-[#2093c4]"
                  title={t("admin.crm.grid.addField")}
                >
                  +
                </button>
              </div>
            </div>

            {/* menú de columna */}
            {colMenu && colMenuRef && (
              <div
                ref={colMenuRef}
                className="absolute z-30 mt-1 w-48 rounded-lg border border-white/10 bg-[#1d1d22] p-1 shadow-xl"
              >
                {fields
                  .filter((f) => f.name === colMenu)
                  .map((f) => (
                    <div key={f.name} className="py-1">
                      <button
                        type="button"
                        onClick={() => toggleSort(f)}
                        className="block w-full px-2 py-1 text-left text-xs text-gray-300 hover:bg-white/10 cursor-pointer"
                      >
                        ▲ {t("admin.crm.grid.sortAsc")}
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleSort(f)}
                        className="block w-full px-2 py-1 text-left text-xs text-gray-300 hover:bg-white/10 cursor-pointer"
                      >
                        ▼ {t("admin.crm.grid.sortDesc")}
                      </button>
                      {!f.is_readonly && (
                        <button
                          type="button"
                          onClick={() => {
                            onHide(f);
                            setColMenu(null);
                          }}
                          className="mt-1 block w-full border-t border-white/5 px-2 py-1 text-left text-xs text-red-300 hover:bg-white/10 cursor-pointer"
                        >
                          {t("admin.crm.grid.hideColumn")}
                        </button>
                      )}
                    </div>
                  ))}
              </div>
            )}

            {/* fila nueva */}
            {creating && (
              <div
                className="grid border-b border-[#2093c4]/20 bg-[#2093c4]/[0.04]"
                style={{ gridTemplateColumns: template }}
              >
                <div className="flex items-center justify-center px-2">
                  <span className="text-xs text-[#7cc7e0]">+</span>
                </div>
                <div className="px-1 py-1">
                  <CellEditor
                    field={primary}
                    value={draft[primary.name] ?? null}
                    suggestions={suggestions}
                    autoFocus
                    onCommit={(v) => setDraft((d) => ({ ...d, [primary.name]: v }))}
                  />
                  <div className="px-1 text-[10px] text-gray-600">
                    {t("admin.crm.grid.required", { label: primary?.label })}
                  </div>
                </div>
                {visible.map((f) => renderNewRowCell(f))}
                <div className="px-1 py-1" />
                <div className="flex flex-col items-center justify-center gap-1 px-1">
                  <button
                    type="button"
                    onClick={() => onCreate(draft)}
                    disabled={creatingBusy || !String(draft[primary.name] ?? "").trim()}
                    className="flex h-6 w-6 items-center justify-center rounded bg-emerald-500/30 text-emerald-300 hover:bg-emerald-500/50 disabled:opacity-30 cursor-pointer"
                    title={t("admin.crm.grid.save")}
                  >
                    ✓
                  </button>
                  <button
                    type="button"
                    onClick={onCreateCancel}
                    disabled={creatingBusy}
                    className="flex h-6 w-6 items-center justify-center rounded border border-white/10 text-gray-400 hover:text-white cursor-pointer disabled:opacity-30"
                    title={t("admin.crm.grid.cancel")}
                  >
                    ✕
                  </button>
                </div>
              </div>
            )}

            {/* filas */}
            {sorted.map((rec) => (
              <div
                key={rec.id}
                className={`grid border-b border-white/5 last:border-0 hover:bg-[#16161a] ${
                  selection.has(rec.id) ? "bg-[#2093c4]/[0.07]" : ""
                }`}
                style={{ gridTemplateColumns: template }}
              >
                <div className="flex items-center justify-center px-2">
                  <span
                    role="button"
                    className={`h-3.5 w-3.5 rounded border inline-flex items-center justify-center text-[10px] cursor-pointer ${
                      selection.has(rec.id) ? "border-[#2093c4] bg-[#2093c4] text-white" : "border-white/30"
                    }`}
                    onClick={() => onToggleSelect(rec.id)}
                    aria-label={t("admin.crm.grid.selectRow")}
                  >
                    {selection.has(rec.id) ? "✓" : ""}
                  </span>
                </div>
                <div className="items-center px-3 py-1.5">
                  <PrimaryCell rec={rec} entity={entity} onOpen={() => onOpen(rec)} />
                </div>
                {visible.map((f) => (
                  <div key={f.name} className="flex items-center overflow-hidden">
                    {renderCell(rec, f)}
                  </div>
                ))}
                <div className="relative flex items-center justify-center">
                  <button
                    type="button"
                    onClick={() => setRowMenuRec(rowMenuRec === rec.id ? null : rec.id)}
                    className="cursor-pointer rounded px-1 text-gray-500 hover:bg-white/10 hover:text-white"
                    aria-label={t("admin.crm.grid.rowMenu")}
                  >
                    ⋮
                  </button>
                  {rowMenuRec === rec.id && (
                    <div
                      ref={rowMenuRef}
                      className="absolute right-0 top-5 z-30 w-44 rounded-lg border border-white/10 bg-[#1d1d22] p-1 shadow-xl"
                    >
                      {rowMenu.map((a) => (
                        <button
                          key={a.id}
                          type="button"
                          onClick={() => {
                            setRowMenuRec(null);
                            a.onClick(rec);
                          }}
                          className={`block w-full px-2 py-1.5 text-left text-xs cursor-pointer hover:bg-white/10 ${
                            a.danger ? "text-red-300" : "text-gray-300"
                          }`}
                        >
                          {a.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="px-2 py-1" />
              </div>
            ))}

            {sorted.length === 0 && (
              <div className="px-4 py-8 text-center text-sm text-gray-500">
                {t("admin.crm.grid.noMatches")}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 px-1 pt-2 text-[11px] text-gray-600">
        <span>{t("admin.crm.grid.count", { n: sorted.length })}</span>
        {someSelected && (
          <>
            <span className="text-gray-500">·</span>
            <button type="button" onClick={onClearSelection} className="cursor-pointer text-[#7cc7e0] hover:underline">
              {t("admin.crm.grid.clearSelection")}
            </button>
          </>
        )}
      </div>
    </div>
  );
}