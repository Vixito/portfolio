// Declaraciones de tipos para módulos npm usados en Deno
// Estos módulos se resuelven a través de import_map.json
// Con skipLibCheck: true, TypeScript no verificará estos tipos estrictamente

// React - los tipos están disponibles a través de @types/react
declare module "react" {
  // Permitir cualquier tipo para evitar errores de resolución
  const React: any;
  export = React;
  export as namespace React;
}

declare module "react/jsx-runtime" {
  export function jsx(type: any, props: any, key?: any): any;
  export function jsxs(type: any, props: any, key?: any): any;
  export function Fragment(props: { children?: any }): any;
}

// React DOM - los tipos están disponibles a través de @types/react-dom
declare module "react-dom" {
  const ReactDOM: any;
  export = ReactDOM;
  export as namespace ReactDOM;
}

declare module "react-dom/client" {
  export function createRoot(container: any): any;
}

// Otros módulos npm - se resuelven a través de import_map.json
declare module "react-router-dom";
declare module "gsap";
declare module "gsap/ScrollTrigger";
declare module "framer-motion";
declare module "react-hook-form";
declare module "@hookform/resolvers";
declare module "@hookform/resolvers/zod";
declare module "zod";
declare module "recharts";
declare module "@tanstack/react-query";
declare module "zustand";
declare module "@supabase/supabase-js";
