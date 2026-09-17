import { useId } from "react";
import "./VixisLogo.css";

export type VixisLogoAnimation =
  | "static"
  | "draw"
  | "draw-loop"
  | "draw-full"
  | "draw-flash";

interface VixisLogoProps {
  /** px del lado (el SVG es cuadrado) */
  size?: number;
  /** variante de animación por partes */
  animation?: VixisLogoAnimation;
  /** título accesible */
  title?: string;
  className?: string;
}

const TILE_PATH =
  "M 54,0 H 196 C 220,0 250,30 250,54 V 196 C 250,220 220,250 196,250 H 54 C 30,250 0,220 0,196 V 54 C 0,30 30,0 54,0 Z";

const TRI_TOP = "68,58 182,96 68,133";
const TRI_BOTTOM = "182,113 182,194 68,156";

/**
 * Logo de Vixis Studio recreado en vectorial, con las 3 piezas
 * direccionables (tile + 2 triángulos) para animarlas por separado.
 */
export default function VixisLogo({
  size = 120,
  animation = "static",
  title = "Vixis Studio",
  className = "",
}: VixisLogoProps) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const gradId = `vixis-teal-${uid}`;

  return (
    <svg
      viewBox="0 0 250 250"
      width={size}
      height={size}
      className={`vixis-logo vixis-logo--${animation} ${className}`}
      role="img"
      aria-label={title}
    >
      <title>{title}</title>
      <defs>
        <linearGradient
          id={gradId}
          x1="68"
          y1="0"
          x2="182"
          y2="0"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#144C44" />
          <stop offset="0.5" stopColor="#19BEB6" />
          <stop offset="1" stopColor="#1EECEA" className="vixis-grad-bright" />
        </linearGradient>
      </defs>
      <path className="vixis-tile" d={TILE_PATH} fill="#0d0d0d" />
      <polygon
        className="vixis-tri vixis-tri-top"
        points={TRI_TOP}
        fill={`url(#${gradId})`}
        pathLength={100}
      />
      <polygon
        className="vixis-tri vixis-tri-bottom"
        points={TRI_BOTTOM}
        fill={`url(#${gradId})`}
        pathLength={100}
      />
    </svg>
  );
}
