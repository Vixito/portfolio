// Marca compartida para todos los emails del sistema (estilo facturas:
// caja "Nutrition Facts", Open Sans, reglas negras, logo + pie).
// La marca se configura en Admin Panel → Apariencia → Marca. Este es el
// ÚNICO archivo que define el diseño: para rediseñar los correos (y que
// los contratos hereden el estilo) se edita aquí, sin tocar cada función.
export interface Brand {
  name: string;
  logo: string;
  color: string;
  footer: string;
}

export const DEFAULT_BRAND: Brand = {
  name: "Vixis Studio",
  logo: "https://cdn.vixis.dev/Vixis+Studio+-+Small+Logo.webp",
  color: "#0d0d0d",
  footer: "Vixis Studio — vixis.dev",
};

export async function getBrand(supabase: any): Promise<Brand> {
  try {
    const { data } = await supabase
      .from("home_content")
      .select("project_data")
      .eq("content_type", "projects")
      .contains("project_data", { is_appearance_settings: true })
      .maybeSingle();
    const p = data?.project_data || {};
    return {
      name: p.brand_name || DEFAULT_BRAND.name,
      logo: p.brand_logo || DEFAULT_BRAND.logo,
      color: p.brand_color || DEFAULT_BRAND.color,
      footer: p.brand_footer || DEFAULT_BRAND.footer,
    };
  } catch {
    return DEFAULT_BRAND;
  }
}

export const escHtml = (s: string): string =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function brandShell(opts: {
  brand: Brand;
  lang: string;
  title: string;
  bodyHtml: string;
  cta?: { href: string; label: string };
}): string {
  const { brand, lang, title, bodyHtml, cta } = opts;
  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escHtml(title)}</title>
  <link href="https://fonts.googleapis.com/css?family=Open+Sans:400,700,800" rel="stylesheet">
</head>
<body style="margin:0; padding:20px; font-family:'Open Sans', Arial, sans-serif; background-color:#f5f5f5;">
  <div style="border:2px solid #000; width:440px; max-width:100%; margin:20px auto; padding:0 14px; background:#fff; word-wrap:break-word; overflow-wrap:break-word;">
    <table style="width:100%; border-collapse:collapse; margin:0; padding:0; table-layout:fixed;">
      <tr>
        <td style="padding:10px 0 6px; vertical-align:middle;">
          <img src="${escHtml(brand.logo)}" alt="${escHtml(brand.name)}" style="height:22px; border-radius:4px; display:inline-block; vertical-align:middle;">
          <span style="font-size:0.95em; font-weight:800; margin-left:8px; display:inline-block; vertical-align:middle;">${escHtml(brand.name)}</span>
        </td>
      </tr>
      <tr><td style="padding:0;"><div style="border-bottom:1px solid #888989; height:1px; line-height:0; font-size:0;">&nbsp;</div></td></tr>
      <tr>
        <td style="padding:8px 0; text-align:center;">
          <h1 style="margin:4px 0; font-weight:800; font-size:1.15em;">${escHtml(title)}</h1>
        </td>
      </tr>
      <tr><td><div style="background-color:#000; height:8px; line-height:0; font-size:0; margin:4px 0;">&nbsp;</div></td></tr>
      <tr>
        <td style="padding:8px 0; font-size:0.85rem; line-height:1.6;">
          ${bodyHtml}
        </td>
      </tr>
      ${
        cta
          ? `<tr><td style="text-align:center; padding:10px 0;">
          <a href="${escHtml(cta.href)}" target="_blank" rel="noopener noreferrer" style="padding:10px 20px; background-color:${escHtml(brand.color)}; color:#ffffff !important; text-decoration:none; border-radius:4px; font-weight:700; display:inline-block;">${escHtml(cta.label)}</a>
        </td></tr>`
          : ""
      }
      <tr><td><div style="background-color:#000; height:5px; line-height:0; font-size:0; margin:4px 0;">&nbsp;</div></td></tr>
      <tr>
        <td style="text-align:center; font-size:0.65rem; color:#666; padding:8px 0;">${escHtml(brand.footer)}</td>
      </tr>
    </table>
  </div>
</body>
</html>`;
}