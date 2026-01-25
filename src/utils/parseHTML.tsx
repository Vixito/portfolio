import { ReactNode } from "react";

// Tags HTML permitidos y sus componentes React equivalentes
const ALLOWED_TAGS: Record<string, string> = {
  b: "b",
  strong: "strong",
  i: "i",
  em: "em",
  span: "span",
  a: "a",
  br: "br",
  u: "u",
  mark: "mark",
  small: "small",
  sub: "sub",
  sup: "sup",
};

// Atributos permitidos por tag
const ALLOWED_ATTRIBUTES: Record<string, string[]> = {
  a: ["href", "target", "rel"],
  span: ["className", "style"],
};

interface ParsedElement {
  type: "text" | "element";
  content?: string;
  tag?: string;
  attributes?: Record<string, string>;
  children?: ParsedElement[];
}

/**
 * Parser HTML seguro que solo permite tags específicos
 * Convierte string HTML a elementos React
 */
export function parseHTML(html: string): ReactNode[] {
  const result: ReactNode[] = [];
  let key = 0;

  // Regex para encontrar tags HTML
  const tagRegex = /<(\/?)([\w]+)([^>]*)>/g;
  let lastIndex = 0;
  let match;

  const stack: { tag: string; children: ReactNode[]; attributes: Record<string, string> }[] = [];
  let currentChildren: ReactNode[] = result;

  while ((match = tagRegex.exec(html)) !== null) {
    const [fullMatch, isClosing, tagName, attributesStr] = match;
    const tag = tagName.toLowerCase();

    // Agregar texto antes del tag
    if (match.index > lastIndex) {
      const text = html.slice(lastIndex, match.index);
      if (text) {
        currentChildren.push(text);
      }
    }

    if (!ALLOWED_TAGS[tag]) {
      // Tag no permitido, tratar como texto
      currentChildren.push(fullMatch);
    } else if (isClosing) {
      // Tag de cierre
      if (stack.length > 0 && stack[stack.length - 1].tag === tag) {
        const { tag: closingTag, children, attributes } = stack.pop()!;
        const element = createReactElement(closingTag, attributes, children, key++);
        
        if (stack.length > 0) {
          currentChildren = stack[stack.length - 1].children;
        } else {
          currentChildren = result;
        }
        currentChildren.push(element);
      }
    } else if (tag === "br") {
      // Self-closing tag
      currentChildren.push(<br key={key++} />);
    } else {
      // Tag de apertura
      const attributes = parseAttributes(tag, attributesStr);
      stack.push({ tag, children: [], attributes });
      currentChildren = stack[stack.length - 1].children;
    }

    lastIndex = match.index + fullMatch.length;
  }

  // Agregar texto restante
  if (lastIndex < html.length) {
    const text = html.slice(lastIndex);
    if (text) {
      currentChildren.push(text);
    }
  }

  // Cerrar tags no cerrados (convertir a texto)
  while (stack.length > 0) {
    const { children } = stack.pop()!;
    if (stack.length > 0) {
      stack[stack.length - 1].children.push(...children);
    } else {
      result.push(...children);
    }
  }

  return result;
}

function parseAttributes(tag: string, attributesStr: string): Record<string, string> {
  const attributes: Record<string, string> = {};
  const allowedAttrs = ALLOWED_ATTRIBUTES[tag] || [];

  // Regex para atributos: name="value" o name='value'
  const attrRegex = /([\w-]+)=["']([^"']*)["']/g;
  let attrMatch;

  while ((attrMatch = attrRegex.exec(attributesStr)) !== null) {
    const [, name, value] = attrMatch;
    
    // Solo permitir atributos de la whitelist
    if (allowedAttrs.includes(name)) {
      // Sanitizar href para prevenir javascript:
      if (name === "href" && value.toLowerCase().startsWith("javascript:")) {
        continue;
      }
      attributes[name] = value;
    }
  }

  // Para links, agregar seguridad por defecto
  if (tag === "a") {
    if (!attributes.rel) {
      attributes.rel = "noopener noreferrer";
    }
    if (!attributes.target) {
      attributes.target = "_blank";
    }
  }

  return attributes;
}

function createReactElement(
  tag: string,
  attributes: Record<string, string>,
  children: ReactNode[],
  key: number
): ReactNode {
  const Tag = ALLOWED_TAGS[tag] as keyof JSX.IntrinsicElements;
  
  // Convertir className string a className prop
  const props: Record<string, unknown> = { key };
  
  for (const [attr, value] of Object.entries(attributes)) {
    if (attr === "class") {
      props.className = value;
    } else {
      props[attr] = value;
    }
  }

  // Agregar estilos base para algunos tags
  if (tag === "a") {
    props.className = `${props.className || ""} text-cyan hover:underline`.trim();
  }

  return (
    <Tag {...props}>
      {children.length > 0 ? children : null}
    </Tag>
  );
}

/**
 * Componente wrapper para renderizar HTML seguro
 */
interface SafeHTMLProps {
  html: string;
  className?: string;
}

export function SafeHTML({ html, className }: SafeHTMLProps) {
  const elements = parseHTML(html);
  
  return <span className={className}>{elements}</span>;
}

export default SafeHTML;
