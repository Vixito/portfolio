// Modelo compartido del CRM estilo Notion/Twenty.

export type CrmEntity = "person" | "company";

export interface CrmField {
  id: string;
  entity_type: CrmEntity;
  name: string;
  label: string;
  label_en?: string | null;
  type: string;
  icon?: string | null;
  options: string[];
  storage: "column" | "data";
  column_name?: string | null;
  position: number;
  is_system: boolean;
  is_visible: boolean;
  is_readonly: boolean;
  description?: string | null;
  settings?: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
}

export type RecordRow = {
  id: string;
  data?: Record<string, any>;
  [k: string]: any;
};

export const FIELD_TYPE_LABELS: Record<string, string> = {
  text: "Texto",
  textarea: "Texto largo",
  number: "Número",
  date: "Fecha",
  select: "Selección",
  multi_select: "Multi-selección",
  emails: "Correos",
  phones: "Teléfonos",
  tags: "Etiquetas",
  url: "Enlace",
  image: "Imagen",
  boolean: "Sí / No",
};

// Tipos que se editan como lista de valores
export const ARRAY_TYPES = new Set(["multi_select", "emails", "phones", "tags"]);

// Interpolación local {{var}} (el t() del proyecto no acepta parámetros).
export function tp(template: string, vars: Record<string, string | number>): string {
  return String(template ?? "").replace(/\{\{\s*([\w.]+)\s*\}\}/g, (m, k: string) =>
    vars[k] !== undefined ? String(vars[k]) : m
  );
}

// Campo de identidad de cada entidad (primer columna congelada)
export const PRIMARY_FIELD: Record<CrmEntity, string> = {
  person: "nombres",
  company: "nombre",
};

export const STATUS_COLORS: Record<string, string> = {
  Nuevo: "bg-slate-400/20 text-slate-300 border-slate-400/30",
  "Interesado/a": "bg-cyan-500/15 text-cyan-300 border-cyan-400/30",
  Lead: "bg-sky-500/15 text-sky-300 border-sky-400/30",
  Prospecto: "bg-indigo-500/15 text-indigo-300 border-indigo-400/30",
  Cliente: "bg-emerald-500/15 text-emerald-300 border-emerald-400/30",
  "Ex-cliente": "bg-gray-500/20 text-gray-400 border-gray-400/30",
  Inactivo: "bg-zinc-500/15 text-zinc-400 border-zinc-400/30",
};

// Etiqueta canónica de cada estado (la que guardan los tags automáticos).
export const STATUS_TAG: Record<string, string> = {
  nuevo: "Nuevo",
  interesado: "Interesado/a",
  lead: "Lead",
  prospecto: "Prospecto",
  cliente: "Cliente",
  "ex-cliente": "Ex-cliente",
  inactivo: "Inactivo",
};

export function statusTagLabel(status: unknown): string {
  const s = String(status ?? "");
  return STATUS_TAG[s] ?? s;
}

const TAG_HUES: Array<[string, string]> = [
  ["#2093c4", "text-[#7cc7e0]"],
  ["#8c52ff", "text-[#c4b5fd]"],
  ["#10b981", "text-emerald-300"],
  ["#f59e0b", "text-amber-300"],
  ["#ec4899", "text-pink-300"],
  ["#6366f1", "text-indigo-300"],
  ["#14b8a6", "text-teal-300"],
  ["#f97316", "text-orange-300"],
];

export function tagAccent(tag: string): { bg: string; fg: string } {
  const i = [...tag].reduce((a, c) => a + c.charCodeAt(0), 0) % TAG_HUES.length;
  const [hex, fg] = TAG_HUES[i];
  return { bg: `${hex}26`, fg };
}

export function cellValue(rec: RecordRow | null | undefined, field: CrmField): any {
  if (!rec) return null;
  if (field.storage === "column" && field.column_name) {
    return rec[field.column_name] ?? null;
  }
  const d = rec.data;
  return d && d[field.name] !== undefined ? d[field.name] : null;
}

export function recordName(rec: RecordRow | null | undefined, entity: CrmEntity): string {
  if (!rec) return "";
  if (entity === "company") return String(rec.name || "");
  const names = [rec.first_name, rec.last_name].filter(Boolean).join(" ");
  return names || String(rec.email || "");
}

export function sortFields(fields: CrmField[]): CrmField[] {
  return [...fields].sort((a, b) => a.position - b.position);
}

export function visibleFields(fields: CrmField[], entity: CrmEntity): CrmField[] {
  const primary = PRIMARY_FIELD[entity];
  return sortFields(fields).filter(
    (f) => f.is_visible && f.name !== primary && !f.is_readonly
  );
}

// Escribe el valor de un campo en una copia del registro (optimista).
export function setRecordField(rec: RecordRow, field: CrmField, value: any): RecordRow {
  if (field.storage === "column" && field.column_name) {
    return { ...rec, [field.column_name]: value };
  }
  const data = { ...(rec.data || {}) };
  if (value === null || value === undefined || value === "") delete data[field.name];
  else data[field.name] = value;
  return { ...rec, data };
}

export function formatValue(field: CrmField, value: any): string {
  if (value === null || value === undefined || value === "") return "";
  if (Array.isArray(value)) return value.filter(Boolean).join(", ");
  if (field.type === "date") {
    const d = new Date(String(value));
    if (!Number.isNaN(d.getTime())) return d.toLocaleDateString("es-CO");
    return String(value);
  }
  if (field.type === "boolean") return value === true || value === "true" ? "Sí" : "No";
  return String(value);
}

export function recordSearchText(rec: RecordRow, fields: CrmField[]): string {
  const parts: string[] = [];
  for (const f of fields) {
    parts.push(formatValue(f, cellValue(rec, f)));
  }
  return parts.join(" ").toLowerCase();
}