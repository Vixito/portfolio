// Texto legal del sitio (borrador). Revisar con asesoría legal antes de
// considerarlo definitivo. Se renderiza en /privacy y /terms.

export interface LegalSection {
  title: string;
  paragraphs?: string[];
  bullets?: string[];
}

export interface LegalDoc {
  title: string;
  updated: string;
  intro?: string;
  sections: LegalSection[];
}

const UPDATED_ES = "Última actualización: septiembre de 2026";
const UPDATED_EN = "Last updated: September 2026";

const CONTROLLER_ES =
  "Responsable del tratamiento: Carlos Vicioso — Vixis Studio. Contacto: carlosvicioso@vixis.dev.";
const CONTROLLER_EN =
  "Data controller: Carlos Vicioso — Vixis Studio. Contact: carlosvicioso@vixis.dev.";

export const PRIVACY: { es: LegalDoc; en: LegalDoc } = {
  es: {
    title: "Política de Privacidad",
    updated: UPDATED_ES,
    intro:
      "Esta política explica qué datos personales recoge vixis.dev (el \"Sitio\"), con qué finalidad, con quién se comparten y qué derechos puedes ejercer. Al usar el Sitio aceptas las prácticas aquí descritas.",
    sections: [
      {
        title: "1. Responsable del tratamiento",
        paragraphs: [CONTROLLER_ES],
      },
      {
        title: "2. Datos que recogemos",
        bullets: [
          "Datos que nos facilitas: nombre, correo electrónico, asunto y mensaje cuando usas el formulario de contacto, escribes por redes o contratas un servicio.",
          "Datos de contratos y facturación: datos de contacto, empresa, importes, condiciones y firmas necesarias para formalizar y facturar un servicio.",
          "Datos técnicos de navegación: dirección IP (usada para seguridad y limitación de peticiones), país, dispositivo, navegador, sistema operativo, página visitada, sitio de referencia y parámetros de campaña (UTM).",
          "Preferencias: idioma y tema (claro/oscuro), guardados localmente en tu navegador.",
        ],
      },
      {
        title: "3. Finalidades",
        bullets: [
          "Atender solicitudes de contacto, presupuestos y soporte.",
          "Gestionar la relación contractual, los pagos y las facturas.",
          "Mantener la seguridad del Sitio, prevenir abuso, spam y fraude.",
          "Elaborar estadísticas agregadas de uso para mejorar el Sitio.",
          "Cumplir obligaciones legales y contables.",
        ],
      },
      {
        title: "4. Base legal",
        paragraphs: [
          "Tratamos tus datos sobre la base de tu consentimiento (formularios), la ejecución de un contrato o la aplicación de medidas precontractuales, nuestro interés legítimo en la seguridad y mejora del Sitio, y el cumplimiento de obligaciones legales.",
        ],
      },
      {
        title: "5. Conservación",
        paragraphs: [
          "Conservamos los datos de contacto el tiempo necesario para atender tu solicitud y, si se formaliza una relación contractual o comercial, durante los plazos legales aplicables (por ejemplo, obligaciones fiscales y contables). Después se eliminan o anonimizan.",
        ],
      },
      {
        title: "6. Destinatarios y encargados",
        paragraphs: [
          "No vendemos tus datos. Podemos compartirlos con proveedores que prestan servicios necesarios para operar el Sitio:",
        ],
        bullets: [
          "Infraestructura y base de datos en la nube (Supabase).",
          "Red de distribución y seguridad (Cloudflare).",
          "Proveedores de pago (por ejemplo PayPal, DLOCAL u otros enlaces de pago) que procesan el cobro bajo sus propias políticas.",
          "Servicios de correo transaccional para enviar comunicaciones relacionadas con tu solicitud o contrato.",
          "Redes publicitarias y de monetización (por ejemplo Adsterra o Monetag) que pueden mostrar anuncios y usar cookies o identificadores propios.",
        ],
      },
      {
        title: "7. Transferencias internacionales",
        paragraphs: [
          "Algunos proveedores pueden tratar datos fuera de tu país (por ejemplo, en Estados Unidos o la Unión Europea). En esos casos se adoptan garantías contractuales y medidas razonables para proteger la información.",
        ],
      },
      {
        title: "8. Cookies y tecnologías similares",
        paragraphs: [
          "Usamos almacenamiento local para recordar tus preferencias (idioma y tema). Además, los proveedores de publicidad y analítica pueden establecer cookies o identificadores para medir audiencia y mostrar anuncios. Puedes bloquear o eliminar cookies desde la configuración de tu navegador; algunas funciones podrían dejar de funcionar correctamente.",
        ],
      },
      {
        title: "9. Seguridad",
        paragraphs: [
          "Aplicamos medidas técnicas y organizativas razonables: cifrado en tránsito (HTTPS), control de acceso, contraseñas protegidas con algoritmos robustos, limitación de peticiones y protecciones anti-bots. Ningún sistema es 100 % seguro, pero trabajamos para reducir el riesgo.",
        ],
      },
      {
        title: "10. Tus derechos",
        paragraphs: [
          "Puedes solicitar el acceso, la actualización, la rectificación, la supresión y la revocación del consentimiento sobre tus datos, así como oponerte o limitar su tratamiento, escribiendo a carlosvicioso@vixis.dev. También puedes presentar una reclamación ante la autoridad de protección de datos competente (en Colombia, la Superintendencia de Industria y Comercio).",
        ],
      },
      {
        title: "11. Menores de edad",
        paragraphs: [
          "El Sitio no está dirigido a menores de 18 años y no recoge conscientemente datos de menores. Si crees que hemos recibido datos de un menor, escríbenos para eliminarlos.",
        ],
      },
      {
        title: "12. Cambios en esta política",
        paragraphs: [
          "Podemos actualizar esta política para reflejar cambios legales u operativos. Publicaremos la versión vigente en esta página con su fecha de actualización.",
        ],
      },
    ],
  },
  en: {
    title: "Privacy Policy",
    updated: UPDATED_EN,
    intro:
      "This policy explains what personal data vixis.dev (the \"Site\") collects, for what purposes, with whom it is shared, and what rights you can exercise. By using the Site you accept the practices described here.",
    sections: [
      {
        title: "1. Data controller",
        paragraphs: [CONTROLLER_EN],
      },
      {
        title: "2. Data we collect",
        bullets: [
          "Data you provide: name, email address, subject and message when you use the contact form, reach out on social media, or hire a service.",
          "Contract and billing data: contact and company details, amounts, terms and signatures required to formalize and invoice a service.",
          "Technical browsing data: IP address (used for security and rate limiting), country, device, browser, operating system, page visited, referrer and campaign parameters (UTM).",
          "Preferences: language and theme (light/dark), stored locally in your browser.",
        ],
      },
      {
        title: "3. Purposes",
        bullets: [
          "Respond to contact requests, quotes and support.",
          "Manage the contractual relationship, payments and invoices.",
          "Keep the Site secure and prevent abuse, spam and fraud.",
          "Produce aggregated usage statistics to improve the Site.",
          "Comply with legal and accounting obligations.",
        ],
      },
      {
        title: "4. Legal basis",
        paragraphs: [
          "We process your data based on your consent (forms), the performance of a contract or pre-contractual steps, our legitimate interest in the security and improvement of the Site, and compliance with legal obligations.",
        ],
      },
      {
        title: "5. Retention",
        paragraphs: [
          "We keep contact data for as long as needed to handle your request and, if a contractual or commercial relationship is established, for the applicable legal periods (e.g. tax and accounting obligations). Data is then deleted or anonymized.",
        ],
      },
      {
        title: "6. Recipients and processors",
        paragraphs: [
          "We do not sell your data. We may share it with providers that deliver services required to run the Site:",
        ],
        bullets: [
          "Cloud infrastructure and database (Supabase).",
          "Content delivery and security network (Cloudflare).",
          "Payment providers (e.g. PayPal, DLOCAL or other payment links) that process the charge under their own policies.",
          "Transactional email services to send communications related to your request or contract.",
          "Advertising and monetization networks (e.g. Adsterra or Monetag) that may show ads and use their own cookies or identifiers.",
        ],
      },
      {
        title: "7. International transfers",
        paragraphs: [
          "Some providers may process data outside your country (e.g. in the United States or the European Union). In such cases contractual safeguards and reasonable measures are applied to protect the information.",
        ],
      },
      {
        title: "8. Cookies and similar technologies",
        paragraphs: [
          "We use local storage to remember your preferences (language and theme). In addition, advertising and analytics providers may set cookies or identifiers to measure audience and show ads. You can block or delete cookies in your browser settings; some features may stop working properly.",
        ],
      },
      {
        title: "9. Security",
        paragraphs: [
          "We apply reasonable technical and organizational measures: encryption in transit (HTTPS), access control, passwords protected with robust algorithms, rate limiting and anti-bot protections. No system is 100% secure, but we work to reduce risk.",
        ],
      },
      {
        title: "10. Your rights",
        paragraphs: [
          "You can request access, update, rectification, deletion and withdrawal of consent regarding your data, as well as object to or restrict its processing, by writing to carlosvicioso@vixis.dev. You may also lodge a complaint with the competent data protection authority (in Colombia, the Superintendencia de Industria y Comercio).",
        ],
      },
      {
        title: "11. Minors",
        paragraphs: [
          "The Site is not directed to people under 18 and does not knowingly collect data from minors. If you believe we have received a minor's data, contact us to delete it.",
        ],
      },
      {
        title: "12. Changes to this policy",
        paragraphs: [
          "We may update this policy to reflect legal or operational changes. The current version will be published on this page with its update date.",
        ],
      },
    ],
  },
};

export const TERMS: { es: LegalDoc; en: LegalDoc } = {
  es: {
    title: "Términos y Condiciones",
    updated: UPDATED_ES,
    intro:
      "Estos términos regulan el uso de vixis.dev (el \"Sitio\") y, con carácter general, los servicios ofrecidos por Vixis Studio. Al usar el Sitio o contratar un servicio aceptas estas condiciones.",
    sections: [
      {
        title: "1. Identificación",
        paragraphs: [
          "El Sitio es operado por Carlos Vicioso — Vixis Studio. Contacto: carlosvicioso@vixis.dev.",
        ],
      },
      {
        title: "2. Uso aceptable",
        bullets: [
          "No usar el Sitio para fines ilícitos, fraudulentos o que vulneren derechos de terceros.",
          "No intentar acceder sin autorización a sistemas, cuentas, datos o áreas restringidas.",
          "No introducir malware, realizar ataques, scraping abusivo ni sobrecargar la infraestructura.",
          "No suplantar la identidad de Vixis Studio ni de terceros.",
        ],
      },
      {
        title: "3. Propiedad intelectual",
        paragraphs: [
          "Salvo indicación contraria, los textos, el diseño, la marca, los logotipos, el código y los contenidos del Sitio son propiedad de Vixis Studio o se usan con autorización. No se permite su reproducción, distribución o transformación sin consentimiento previo por escrito.",
        ],
      },
      {
        title: "4. Servicios y presupuestos",
        paragraphs: [
          "La información del Sitio es informativa y no constituye una oferta vinculante. Los trabajos de desarrollo, diseño u otros se formalizan mediante propuesta o contrato que define alcance, plazos, entregables y precio. Salvo pacto en contrario, los presupuestos tienen una validez limitada y pueden variar si cambia el alcance.",
        ],
      },
      {
        title: "5. Pagos, productos y reembolsos",
        bullets: [
          "Los pagos se procesan a través de proveedores externos (por ejemplo PayPal, DLOCAL u otros enlaces de pago) bajo sus propias condiciones.",
          "Los productos digitales de la tienda, una vez entregados o descargados, no son reembolsables salvo lo exigido por la ley aplicable o por defecto del producto.",
          "Los servicios profesionales se rigen por el contrato o propuesta aceptada; los anticipos y pagos parciales pueden no ser reembolsables si el trabajo ya ha comenzado.",
        ],
      },
      {
        title: "6. Contratos y firma electrónica",
        paragraphs: [
          "Para determinados servicios se genera un contrato con enlace público protegido por contraseña. La firma electrónica registrada en dicho enlace tiene validez entre las partes en la medida permitida por la ley aplicable. El contrato firmado prevalece sobre estos términos para el servicio concreto.",
        ],
      },
      {
        title: "7. Enlaces y servicios de terceros",
        paragraphs: [
          "El Sitio puede incluir enlaces y contenido de terceros (redes sociales, anuncios, herramientas de pago). No controlamos ni somos responsables de sus contenidos, políticas o prácticas. Su uso se rige por los términos de dichos terceros.",
        ],
      },
      {
        title: "8. Disponibilidad",
        paragraphs: [
          "Procuramos mantener el Sitio disponible y correcto, pero no garantizamos la ausencia de interrupciones, errores o pérdida de datos. Podemos suspender, modificar o retirar total o parcialmente el Sitio sin previo aviso cuando sea necesario.",
        ],
      },
      {
        title: "9. Limitación de responsabilidad",
        paragraphs: [
          "En la medida permitida por la ley, Vixis Studio no será responsable de daños indirectos, incidentales, especiales o consecuentes derivados del uso o imposibilidad de uso del Sitio, ni de lucro cesante o pérdida de datos. Nada en estos términos excluye responsabilidades que no puedan limitarse legalmente.",
        ],
      },
      {
        title: "10. Ley aplicable y jurisdicción",
        paragraphs: [
          "Estos términos se rigen por las leyes de la República de Colombia. Cualquier controversia se someterá a los jueces y tribunales competentes de Colombia, salvo que una norma imperativa disponga otra cosa.",
        ],
      },
      {
        title: "11. Cambios",
        paragraphs: [
          "Podemos actualizar estos términos. La versión vigente se publicará en esta página con su fecha de actualización. El uso continuado del Sitio implica la aceptación de los términos actualizados.",
        ],
      },
    ],
  },
  en: {
    title: "Terms of Service",
    updated: UPDATED_EN,
    intro:
      "These terms govern the use of vixis.dev (the \"Site\") and, in general, the services offered by Vixis Studio. By using the Site or hiring a service you accept these conditions.",
    sections: [
      {
        title: "1. Identification",
        paragraphs: [
          "The Site is operated by Carlos Vicioso — Vixis Studio. Contact: carlosvicioso@vixis.dev.",
        ],
      },
      {
        title: "2. Acceptable use",
        bullets: [
          "Do not use the Site for unlawful or fraudulent purposes or to infringe third-party rights.",
          "Do not attempt to access systems, accounts, data or restricted areas without authorization.",
          "Do not introduce malware, carry out attacks, abusive scraping or overload the infrastructure.",
          "Do not impersonate Vixis Studio or third parties.",
        ],
      },
      {
        title: "3. Intellectual property",
        paragraphs: [
          "Unless stated otherwise, the texts, design, brand, logos, code and content of the Site are owned by Vixis Studio or used with authorization. Reproduction, distribution or transformation without prior written consent is not permitted.",
        ],
      },
      {
        title: "4. Services and quotes",
        paragraphs: [
          "Information on the Site is informative and does not constitute a binding offer. Development, design or other work is formalized through a proposal or contract defining scope, timelines, deliverables and price. Unless agreed otherwise, quotes are valid for a limited time and may change if the scope changes.",
        ],
      },
      {
        title: "5. Payments, products and refunds",
        bullets: [
          "Payments are processed through external providers (e.g. PayPal, DLOCAL or other payment links) under their own terms.",
          "Digital products in the store, once delivered or downloaded, are non-refundable except as required by applicable law or in the event of a product defect.",
          "Professional services are governed by the accepted contract or proposal; deposits and partial payments may be non-refundable once work has started.",
        ],
      },
      {
        title: "6. Contracts and electronic signature",
        paragraphs: [
          "For certain services a contract is generated with a public link protected by a password. The electronic signature recorded on that link is valid between the parties to the extent permitted by applicable law. The signed contract prevails over these terms for the specific service.",
        ],
      },
      {
        title: "7. Third-party links and services",
        paragraphs: [
          "The Site may include links and third-party content (social media, ads, payment tools). We do not control and are not responsible for their content, policies or practices. Their use is governed by their own terms.",
        ],
      },
      {
        title: "8. Availability",
        paragraphs: [
          "We strive to keep the Site available and accurate, but we do not guarantee the absence of interruptions, errors or data loss. We may suspend, modify or remove all or part of the Site without prior notice when necessary.",
        ],
      },
      {
        title: "9. Limitation of liability",
        paragraphs: [
          "To the extent permitted by law, Vixis Studio will not be liable for indirect, incidental, special or consequential damages arising from the use or inability to use the Site, nor for lost profits or data loss. Nothing in these terms excludes liability that cannot be legally limited.",
        ],
      },
      {
        title: "10. Governing law and jurisdiction",
        paragraphs: [
          "These terms are governed by the laws of the Republic of Colombia. Any dispute will be submitted to the competent courts of Colombia, unless a mandatory rule provides otherwise.",
        ],
      },
      {
        title: "11. Changes",
        paragraphs: [
          "We may update these terms. The current version will be published on this page with its update date. Continued use of the Site implies acceptance of the updated terms.",
        ],
      },
    ],
  },
};
