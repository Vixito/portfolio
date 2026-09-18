export type ImportKind = "contacts" | "companies";

export const normalizeKey = (s: string): string =>
  (s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const CONTACT_ALIASES: Record<string, string[]> = {
  first_name: [
    "first name",
    "firstname",
    "given name",
    "givenname",
    "nombre",
    "nombres",
    "nombre de pila",
    "primer nombre",
    "first",
  ],
  last_name: [
    "last name",
    "lastname",
    "family name",
    "familyname",
    "surname",
    "apellido",
    "apellidos",
    "segundo apellido",
    "second last name",
  ],
  full_name: [
    "name",
    "full name",
    "fullname",
    "nombre completo",
    "display name",
    "displayname",
    "contact name",
    "nombre y apellido",
    "fn",
  ],
  phone2: [
    "phone 2 value",
    "phone 2",
    "telefono 2",
    "segundo telefono",
    "other phone",
    "home phone",
    "telefono fijo",
  ],
  email: [
    "email",
    "e mail",
    "e mail 1 value",
    "email 1 value",
    "email address",
    "correo",
    "correo electronico",
    "correo 1",
    "mail",
  ],
  phone: [
    "phone",
    "phone 1 value",
    "phone 1",
    "telefono",
    "telefono 1",
    "tel",
    "mobile",
    "movil",
    "celular",
    "celular 1",
    "whatsapp",
    "phone number",
    "telephone",
  ],
  company: [
    "company",
    "company name",
    "empresa",
    "organizacion",
    "organization",
    "organization name",
    "organization 1 name",
    "compania",
    "employer",
  ],
  job_title: [
    "job title",
    "organization 1 title",
    "organization title",
    "cargo",
    "puesto",
    "position",
    "title",
    "rol",
    "role",
    "profesion",
    "profession",
  ],
  linkedin: ["linkedin", "linkedin url", "linked in", "perfil linkedin"],
  github: ["github", "github url", "git hub"],
  x_handle: [
    "twitter",
    "twitter username",
    "x handle",
    "x username",
    "usuario twitter",
  ],
  website: [
    "website",
    "website 1 value",
    "sitio web",
    "pagina web",
    "web",
    "homepage",
    "url",
  ],
  address: [
    "address",
    "address 1 formatted",
    "direccion",
    "ubicacion",
    "location",
    "ciudad",
    "city",
  ],
  birthdate: [
    "birthday",
    "birthdate",
    "birth day",
    "bday",
    "cumpleanos",
    "fecha de nacimiento",
  ],
  gender: ["gender", "genero", "sexo"],
  experience_years: [
    "experience years",
    "years of experience",
    "anos de experiencia",
    "experiencia",
  ],
  owner: ["owner", "propietario", "responsable", "assigned to", "asignado a"],
  tags: ["tags", "etiquetas", "tag", "labels", "categorias"],
  source: ["source", "origen", "fuente", "canal"],
  notes: [
    "notes",
    "notas",
    "note",
    "observaciones",
    "comentarios",
    "description",
  ],
};

const COMPANY_ALIASES: Record<string, string[]> = {
  name: [
    "name",
    "nombre",
    "empresa",
    "company",
    "company name",
    "organizacion",
    "organization",
  ],
  domain: [
    "domain",
    "dominio",
    "website",
    "sitio web",
    "pagina web",
    "web",
    "url",
  ],
  industry: ["industry", "industria", "sector", "rubro"],
  notes: ["notes", "notas", "observaciones", "comentarios", "description"],
};

const CONTACT_ORDER = [
  "first_name",
  "last_name",
  "full_name",
  "phone2",
  "email",
  "phone",
  "company",
  "job_title",
  "linkedin",
  "github",
  "x_handle",
  "website",
  "address",
  "birthdate",
  "gender",
  "experience_years",
  "owner",
  "tags",
  "source",
  "notes",
];

const COMPANY_ORDER = ["name", "domain", "industry", "notes"];

export interface HeaderMapping {
  mapping: Record<string, number>;
  matched: Record<string, string>;
  unmatched: string[];
}

export function autoMapHeaders(
  headers: string[],
  kind: ImportKind
): HeaderMapping {
  const aliases = kind === "contacts" ? CONTACT_ALIASES : COMPANY_ALIASES;
  const order = kind === "contacts" ? CONTACT_ORDER : COMPANY_ORDER;
  const normHeaders = headers.map(normalizeKey);
  const used = new Set<number>();
  const mapping: Record<string, number> = {};
  const matched: Record<string, string> = {};

  const claim = (field: string, idx: number) => {
    mapping[field] = idx;
    used.add(idx);
    matched[field] = headers[idx];
  };

  for (const field of order) {
    const fieldAliases = aliases[field] || [];
    const exact = normHeaders.findIndex(
      (h, i) => !used.has(i) && fieldAliases.includes(h)
    );
    if (exact >= 0) claim(field, exact);
  }

  for (const field of order) {
    if (mapping[field] !== undefined) continue;
    const fieldAliases = aliases[field] || [];
    const contains = normHeaders.findIndex((h, i) => {
      if (used.has(i) || !h) return false;
      return fieldAliases.some((a) => a.length >= 3 && h.includes(a));
    });
    if (contains >= 0) claim(field, contains);
  }

  const unmatched = headers.filter(
    (_, i) => !used.has(i) && normalizeKey(headers[i]) !== ""
  );

  return { mapping, matched, unmatched };
}

export function splitFullName(full: string): {
  first_name: string;
  last_name: string;
} {
  const parts = (full || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { first_name: "", last_name: "" };
  if (parts.length === 1) return { first_name: parts[0], last_name: "" };
  return {
    first_name: parts.slice(0, -1).join(" "),
    last_name: parts[parts.length - 1],
  };
}

export function nameFromEmail(email: string): string {
  const local = (email || "").split("@")[0] || "";
  return local
    .replace(/[._\-+]+/g, " ")
    .replace(/\d+/g, "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export const normalizeEmail = (v: string): string =>
  (v || "").trim().toLowerCase();

export const normalizeName = (
  first: string,
  last: string
): string => `${normalizeKey(first)}|${normalizeKey(last)}`;

export interface VCardRecord {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  company: string;
  job_title: string;
  website: string;
  address: string;
  notes: string;
  birthdate: string;
  tags: string[];
}

const unescapeVCard = (v: string): string =>
  (v || "")
    .replace(/\\n/gi, "\n")
    .replace(/\\,/g, ",")
    .replace(/\\;/g, ";")
    .replace(/\\\\/g, "\\")
    .trim();

export function isVCard(text: string): boolean {
  return /BEGIN:VCARD/i.test(text.slice(0, 2000));
}

export function parseVCards(text: string): VCardRecord[] {
  const cards = text.split(/END:VCARD/i);
  const records: VCardRecord[] = [];

  for (const card of cards) {
    if (!/BEGIN:VCARD/i.test(card)) continue;
    const body = card.replace(/.*BEGIN:VCARD/i, "").replace(/\r/g, "");
    const lines = body.split("\n").flatMap((line) => {
      return line.replace(/\n[ \t]/g, "").split(/\n/);
    });

    const rec: VCardRecord = {
      first_name: "",
      last_name: "",
      email: "",
      phone: "",
      company: "",
      job_title: "",
      website: "",
      address: "",
      notes: "",
      birthdate: "",
      tags: [],
    };

    for (const rawLine of lines) {
      if (!rawLine || !rawLine.includes(":")) continue;
      const colon = rawLine.indexOf(":");
      const rawKey = rawLine.slice(0, colon).toUpperCase();
      const value = unescapeVCard(rawLine.slice(colon + 1));
      if (!value) continue;
      const key = rawKey.split(";")[0].split("=")[0].trim();

      if (key === "FN" && !rec.first_name) {
        const split = splitFullName(value);
        rec.first_name = split.first_name;
        rec.last_name = rec.last_name || split.last_name;
      } else if (key === "N") {
        const [last = "", first = ""] = value.split(";");
        rec.last_name = rec.last_name || unescapeVCard(last);
        rec.first_name = rec.first_name || unescapeVCard(first).split(";")[0];
      } else if (key === "EMAIL" && !rec.email) {
        rec.email = value;
      } else if (key === "TEL" && !rec.phone) {
        rec.phone = value;
      } else if (key === "ORG" && !rec.company) {
        rec.company = value.split(";")[0];
      } else if (key === "TITLE" && !rec.job_title) {
        rec.job_title = value;
      } else if (key === "URL" && !rec.website) {
        rec.website = value;
      } else if (key === "BDAY" && !rec.birthdate) {
        rec.birthdate = value.slice(0, 10);
      } else if (key === "ADR" && !rec.address) {
        rec.address = value
          .split(";")
          .map((p) => p.trim())
          .filter(Boolean)
          .join(", ");
      } else if (key === "NOTE" && !rec.notes) {
        rec.notes = value;
      } else if (key === "CATEGORIES") {
        rec.tags = value
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean);
      }
    }

    if (!rec.first_name && rec.email) {
      rec.first_name = nameFromEmail(rec.email);
    }
    if (rec.first_name || rec.email || rec.phone || rec.company) {
      records.push(rec);
    }
  }

  return records;
}

export function dedupeRecords<
  T extends { email?: string; first_name?: string; last_name?: string; name?: string; domain?: string }
>(records: T[], kind: ImportKind): { unique: T[]; duplicates: number } {
  const seen = new Set<string>();
  const unique: T[] = [];
  let duplicates = 0;

  for (const rec of records) {
    const keys: string[] = [];
    if (kind === "contacts") {
      const email = normalizeEmail(rec.email || "");
      if (email) keys.push(`email:${email}`);
      const name = normalizeName(rec.first_name || "", rec.last_name || "");
      if (name !== "|") keys.push(`name:${name}`);
      const username = normalizeName(rec.first_name || "", "");
      if (username && !email) keys.push(`first:${username}`);
    } else {
      const name = normalizeKey(rec.name || "");
      if (name) keys.push(`name:${name}`);
      const domain = normalizeKey(rec.domain || "");
      if (domain) keys.push(`domain:${domain}`);
    }

    if (keys.length === 0) continue;

    if (keys.some((k) => seen.has(k))) {
      duplicates++;
      continue;
    }
    keys.forEach((k) => seen.add(k));
    unique.push(rec);
  }

  return { unique, duplicates };
}
