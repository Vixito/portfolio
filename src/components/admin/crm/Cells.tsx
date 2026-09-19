import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import {
  ARRAY_TYPES,
  STATUS_COLORS,
  tagAccent,
  type CrmField,
} from "./types";

// ---------- iconos ----------

export function FieldIcon({ field, className = "h-3.5 w-3.5 text-[13px]" }: { field: CrmField; className?: string }) {
  const icon = field.icon;
  if (!icon) return <span className={className} />;
  if (icon.startsWith("http")) {
    return <img src={icon} alt="" className={`${className} shrink-0 object-contain`} />;
  }
  return <span className={`${className} shrink-0 flex items-center justify-center leading-none`}>{icon}</span>;
}

// ---------- pills / chips ----------

export function TagPill({ tag, active = false }: { tag: string; active?: boolean }) {
  if (active && STATUS_COLORS[tag]) {
    return (
      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-semibold border ${STATUS_COLORS[tag]}`}>
        {tag}
      </span>
    );
  }
  const { bg, fg } = tagAccent(tag);
  return (
    <span
      className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium border"
      style={{ backgroundColor: bg, borderColor: bg, color: fg }}
    >
      {tag}
    </span>
  );
}

function Chip({ children, onRemove }: { children: ReactNode; onRemove?: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium border border-white/15 bg-white/10">
      {children}
      {onRemove && (
        <button type="button" onClick={onRemove} className="opacity-60 hover:opacity-100 cursor-pointer leading-none">✕</button>
      )}
    </span>
  );
}

// ---------- vista (celda no editada) ----------

export function CellView({ field, value }: { field: CrmField; value: any }) {
  if (value === null || value === undefined || value === "") {
    return <span className="text-gray-600 select-none">—</span>;
  }
  switch (field.type) {
    case "boolean":
      return <span>{value === true || value === "true" ? "✓" : "✕"}</span>;
    case "url": {
      const s = String(value).trim();
      const href = /^https?:\/\//.test(s) ? s : `https://${s}`;
      const short = s.replace(/^https?:\/\//, "").replace(/\/$/, "");
      return (
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="block max-w-[240px] truncate text-[#7cc7e0] hover:underline"
          title={s}
        >
          {short}
        </a>
      );
    }
    case "emails": {
      const arr = (value as string[]).filter(Boolean);
      return (
        <span className="inline-flex flex-col gap-0.5">
          {arr.map((e) => (
            <a key={e} href={`mailto:${e}`} onClick={(e2) => e2.stopPropagation()} className="truncate max-w-[240px] text-[#7cc7e0] hover:underline">
              {e}
            </a>
          ))}
        </span>
      );
    }
    case "phones": {
      const arr = (value as string[]).filter(Boolean);
      return (
        <span className="inline-flex flex-col gap-0.5">
          {arr.map((p) => (
            <span key={p} className="truncate max-w-[200px]">{p}</span>
          ))}
        </span>
      );
    }
    case "tags":
      return (
        <span className="inline-flex flex-wrap gap-1">
          {(value as string[]).map((t) => (
            <TagPill key={t} tag={t} active />
          ))}
        </span>
      );
    case "multi_select":
      return (
        <span className="inline-flex flex-wrap gap-1">
          {(value as string[]).map((t) => (
            <TagPill key={t} tag={t} />
          ))}
        </span>
      );
    case "image": {
      const s = String(value).trim();
      if (!/^https?:/i.test(s)) return <span className="truncate max-w-[220px]">{s}</span>;
      return <img src={s} alt="" className="h-8 w-8 rounded object-cover ring-1 ring-white/10 bg-white/5" />;
    }
    case "date": {
      const d = new Date(String(value));
      if (Number.isNaN(d.getTime())) return <span>{String(value)}</span>;
      return <span>{d.toLocaleDateString("es-CO")}</span>;
    }
    case "number":
      return <span className="tabular-nums">{String(value)}</span>;
    default:
      return <span className="block max-w-[260px] truncate whitespace-pre-line">{String(value)}</span>;
  }
}

// ---------- editores ----------

export interface EditorProps {
  value: any;
  onCommit: (v: any) => void;
  onCancel?: () => void;
  autoFocus?: boolean;
  suggestions?: string[];
  className?: string;
}

function useAutofocus(ref: React.RefObject<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>, on: boolean | undefined) {
  useEffect(() => {
    if (on) setTimeout(() => ref.current?.focus(), 0);
  }, [on, ref]);
}

function TextEditor({ value, onCommit, onCancel, autoFocus, type = "text", placeholder, className }: EditorProps & { type?: string; placeholder?: string }) {
  const [draft, setDraft] = useState(value ?? "");
  const ref = useRef<HTMLInputElement>(null);
  useAutofocus(ref, autoFocus);
  const done = () => {
    const v = draft.trim();
    onCommit(v === "" ? null : v);
  };
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") done();
    else if (e.key === "Escape") onCancel?.();
  };
  return (
    <input
      ref={ref}
      type={type}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={done}
      onKeyDown={onKey}
      placeholder={placeholder}
      onClick={(e) => e.stopPropagation()}
      className={`w-full min-w-[120px] rounded bg-black/30 px-1.5 py-0.5 text-sm outline-none ring-1 ring-[#2093c4]/60 ${className ?? ""}`}
    />
  );
}

function NumberEditor(props: EditorProps) {
  return (
    <TextEditor
      {...props}
      type="number"
      onCommit={(raw) => {
        const v = String(raw ?? "");
        if (v === "") return props.onCommit(null);
        const n = Number(v);
        props.onCommit(Number.isFinite(n) ? n : null);
      }}
    />
  );
}

function DateEditor(props: EditorProps) {
  const [draft, setDraft] = useState(props.value ? String(props.value).slice(0, 10) : "");
  const ref = useRef<HTMLInputElement>(null);
  useAutofocus(ref, props.autoFocus);
  const done = () => props.onCommit(draft || null);
  return (
    <input
      ref={ref}
      type="date"
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={done}
      onKeyDown={(e) => e.key === "Escape" && props.onCancel?.()}
      onClick={(e) => e.stopPropagation()}
      className="w-full rounded bg-black/30 px-1.5 py-0.5 text-sm outline-none ring-1 ring-[#2093c4]/60"
    />
  );
}

function SelectEditor({ value, onCommit, onCancel, autoFocus, options, className }: EditorProps & { options: string[] }) {
  const [draft, setDraft] = useState(value ? String(value) : "");
  const ref = useRef<HTMLSelectElement>(null);
  useAutofocus(ref, autoFocus);
  const commit = (v: string) => onCommit(v || null);
  return (
    <select
      ref={ref}
      value={draft}
      onChange={(e) => commit(e.target.value)}
      onBlur={() => onCommit(draft || null)}
      onKeyDown={(e) => {
        if (e.key === "Escape") onCancel?.();
        else e.stopPropagation();
      }}
      onClick={(e) => e.stopPropagation()}
      className={`w-full min-w-[140px] rounded bg-black/40 px-1.5 py-0.5 text-sm outline-none ring-1 ring-[#2093c4]/60 cursor-pointer ${className ?? ""}`}
    >
      <option value="">—</option>
      {options.map((o) => (
        <option key={o} value={o}>{o}</option>
      ))}
    </select>
  );
}

function BooleanEditor({ value, onCommit }: EditorProps) {
  const on = value === true || value === "true";
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onCommit(!on);
      }}
      className={`h-5 w-5 rounded border flex items-center justify-center text-sm cursor-pointer ${
        on ? "bg-emerald-500/30 border-emerald-400 text-emerald-300" : "bg-black/30 border-white/20 text-gray-500"
      }`}
    >
      {on ? "✓" : ""}
    </button>
  );
}

function ArrayEditor({ value, onCommit, autoFocus, suggestions, placeholder, allowFree = true }: EditorProps) {
  const [items, setItems] = useState<string[]>(Array.isArray(value) ? value.filter(Boolean) : []);
  const [draft, setDraft] = useState("");
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  useAutofocus(inputRef, autoFocus);

  const commit = (next: string[]) => {
    setItems((cur) => {
      const clean = next.length ? next : (cur.length ? cur : []);
      return clean;
    });
    onCommit(next.length ? next : null);
  };
  const add = (raw: string) => {
    const v = String(raw).trim();
    if (!v) return;
    const next = items.includes(v) ? items : [...items, v];
    commit(next);
    setDraft("");
  };
  const remove = (t: string) => commit(items.filter((x) => x !== t));
  const suggs = suggestions
    ? [...new Set([...items, ...suggestions])].filter((s) => s.toLowerCase().includes(draft.trim().toLowerCase()))
    : [];

  return (
    <div className="flex flex-wrap items-center gap-1 min-w-[160px]" onClick={(e) => e.stopPropagation()}>
      {items.map((t) => (
        <Chip key={t} onRemove={() => remove(t)}>{t}</Chip>
      ))}
      <input
        ref={inputRef}
        value={draft}
        onChange={(e) => {
          setDraft(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={(e) => {
          if (e.relatedTarget?.className !== "sugg") add(draft);
          setOpen(false);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            add(draft);
          } else if (e.key === "Escape") {
            add(draft);
            onCommit(items.length ? items : null);
          } else e.stopPropagation();
        }}
        placeholder={placeholder || "Añadir…"}
        className="min-w-[70px] flex-1 bg-transparent text-sm outline-none placeholder:text-gray-600"
      />
      {open && suggs.length > 0 && (
        <div className="sugg absolute z-20 mt-7 max-h-32 overflow-auto rounded-lg border border-white/10 bg-[#161619] p-1 shadow-xl">
          {suggs.map((s) => (
            <button
              key={s}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                add(s);
              }}
              className="block w-full text-left px-2 py-1 rounded text-xs text-gray-300 hover:bg-white/10 cursor-pointer sugg"
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function TextareaEditor({ value, onCommit, onCancel, autoFocus }: EditorProps) {
  const [draft, setDraft] = useState(value ? String(value) : "");
  const ref = useRef<HTMLTextAreaElement>(null);
  useAutofocus(ref, autoFocus);
  return (
    <textarea
      ref={ref}
      value={draft}
      rows={2}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => onCommit(draft.trim() ? draft : null)}
      onKeyDown={(e) => {
        if (e.key === "Escape") onCancel?.();
        else e.stopPropagation();
      }}
      onClick={(e) => e.stopPropagation()}
      className="w-full rounded bg-black/30 px-1.5 py-0.5 text-sm outline-none ring-1 ring-[#2093c4]/60 resize-y"
    />
  );
}

function ImageEditor(props: EditorProps) {
  const [draft, setDraft] = useState(props.value ? String(props.value) : "");
  const ref = useRef<HTMLInputElement>(null);
  useAutofocus(ref, props.autoFocus);
  const done = () => props.onCommit(draft.trim() || null);
  return (
    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
      {/^https?:/i.test(draft) && <img src={draft} alt="" className="h-6 w-6 rounded object-cover ring-1 ring-white/10 bg-white/5" />}
      <input
        ref={ref}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={done}
        onKeyDown={(e) => {
          if (e.key === "Enter") done();
          else if (e.key === "Escape") props.onCancel?.();
          else e.stopPropagation();
        }}
        placeholder="https://…"
        className="w-full min-w-[160px] rounded bg-black/30 px-1.5 py-0.5 text-sm outline-none ring-1 ring-[#2093c4]/60"
      />
    </div>
  );
}

// Editor genérico según el tipo de campo.
export function CellEditor({ field, value, onCommit, onCancel, autoFocus, suggestions, className }: EditorProps & { field: CrmField }) {
  const props = { value, onCommit, onCancel, autoFocus, suggestions, className };
  switch (field.type) {
    case "number": return <NumberEditor {...props} />;
    case "date": return <DateEditor {...props} />;
    case "select": return <SelectEditor {...props} options={field.options || []} />;
    case "boolean": return <BooleanEditor {...props} />;
    case "textarea": return <TextareaEditor {...props} />;
    case "image": return <ImageEditor {...props} />;
    case "multi_select":
    case "emails":
    case "phones":
    case "tags":
      return <ArrayEditor {...props} />;
    case "url": return <TextEditor {...props} type="url" placeholder="https://…" />;
    default: return <TextEditor {...props} type="text" />;
  }
}

export function isArrayField(field: CrmField) {
  return ARRAY_TYPES.has(field.type);
}