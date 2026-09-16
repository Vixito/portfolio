import { useState } from "react";
import type {
  ReactNode,
  RefObject,
  Dispatch,
  SetStateAction,
} from "react";
import clsx from "clsx";
import { useTranslation } from "../../lib/i18n";
import Navigation from "../layout/Navigation";

export type AdminTab =
  | "bos"
  | "crm"
  | "products"
  | "projects"
  | "clients"
  | "testimonials"
  | "socials"
  | "events"
  | "work_experiences"
  | "technologies"
  | "studies"
  | "blog_posts"
  | "home_content"
  | "radio_settings"
  | "invoices"
  | "appearance"
  | "job_offers";

type StatusKey = "available" | "away" | "busy";

type IconName =
  | "dashboard"
  | "crm"
  | "products"
  | "projects"
  | "clients"
  | "testimonials"
  | "socials"
  | "events"
  | "work"
  | "techs"
  | "studies"
  | "blog"
  | "home"
  | "radio"
  | "invoices"
  | "appearance"
  | "jobs"
  | "globe"
  | "media";

interface Section {
  id: AdminTab;
  label: string;
  icon: IconName;
}

interface AdminShellProps {
  activeTab: AdminTab;
  onTabChange: (tab: AdminTab) => void;
  currentStatus: string;
  onStatusSelect: (status: StatusKey) => void;
  statusSelectorRef: RefObject<HTMLDivElement | null>;
  statusDropdownRef: RefObject<HTMLDivElement | null>;
  showStatusSelector: boolean;
  setShowStatusSelector: Dispatch<SetStateAction<boolean>>;
  mediaOpen: boolean;
  onToggleMedia: () => void;
  onLogout: () => void;
  children: ReactNode;
}

const ICON_PATHS: Record<IconName, ReactNode> = {
  dashboard: (
    <>
      <rect x="3" y="3" width="7" height="9" rx="1" />
      <rect x="14" y="3" width="7" height="5" rx="1" />
      <rect x="14" y="12" width="7" height="9" rx="1" />
      <rect x="3" y="16" width="7" height="5" rx="1" />
    </>
  ),
  crm: (
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2 21v-2a5 5 0 0 1 5-5h4a5 5 0 0 1 5 5v2" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      <path d="M21 21v-2a4 4 0 0 0-3-3.87" />
    </>
  ),
  products: (
    <>
      <path d="M6 2l-3 4v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
      <path d="M3 6h18" />
      <path d="M16 10a4 4 0 0 1-8 0" />
    </>
  ),
  projects: (
    <>
      <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
      <path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
      <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
      <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
    </>
  ),
  clients: (
    <>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </>
  ),
  testimonials: (
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  ),
  socials: (
    <>
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <path d="M8.59 13.51l6.83 3.98" />
      <path d="M15.41 6.51l-6.82 3.98" />
    </>
  ),
  events: (
    <>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </>
  ),
  work: (
    <>
      <rect x="2" y="7" width="20" height="14" rx="2" />
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </>
  ),
  techs: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <rect x="9" y="9" width="6" height="6" />
      <path d="M9 1v2M15 1v2M9 21v2M15 21v2M21 9h2M21 15h2M1 9h2M1 15h2" />
    </>
  ),
  studies: (
    <>
      <path d="M22 10l-10-5-10 5 10 5 10-5z" />
      <path d="M6 12v5c0 1.66 2.69 3 6 3s6-1.34 6-3v-5" />
      <path d="M22 10v6" />
    </>
  ),
  blog: (
    <>
      <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2" />
      <path d="M18 14h-8M15 18h-5" />
      <path d="M10 6h8v4h-8z" />
    </>
  ),
  home: (
    <>
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <path d="M9 22V12h6v10" />
    </>
  ),
  radio: (
    <>
      <path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9" />
      <path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5" />
      <circle cx="12" cy="12" r="2" />
      <path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5" />
      <path d="M19.1 4.9C23 8.8 23 15.2 19.1 19.1" />
    </>
  ),
  invoices: (
    <>
      <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1z" />
      <path d="M9 7h6M9 12h6" />
    </>
  ),
  appearance: (
    <>
      <circle cx="13.5" cy="6.5" r=".6" />
      <circle cx="17.5" cy="10.5" r=".6" />
      <circle cx="8.5" cy="7.5" r=".6" />
      <circle cx="6.5" cy="12.5" r=".6" />
      <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.93 0 1.65-.75 1.65-1.69 0-.44-.18-.84-.44-1.13-.29-.29-.44-.65-.44-1.12a1.64 1.64 0 0 1 1.66-1.66h2c3.05 0 5.55-2.5 5.55-5.55C21.97 6 17.46 2 12 2z" />
    </>
  ),
  jobs: (
    <>
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7z" />
      <path d="M14 2v4a2 2 0 0 0 2 2h4" />
      <path d="M10 10h7M10 14h7M10 18h4" />
    </>
  ),
  globe: (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
      <path d="M2 12h20" />
    </>
  ),
  media: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="9" cy="9" r="2" />
      <path d="M21 15l-3.09-3.09a2 2 0 0 0-2.82 0L6 21" />
    </>
  ),
};

function SidebarIcon({ name, className }: { name: IconName; className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {ICON_PATHS[name]}
    </svg>
  );
}

function AdminShell(props: AdminShellProps) {
  const {
    activeTab,
    onTabChange,
    currentStatus,
    onStatusSelect,
    statusSelectorRef,
    statusDropdownRef,
    showStatusSelector,
    setShowStatusSelector,
    onToggleMedia,
    mediaOpen,
    onLogout,
    children,
  } = props;
  const { t } = useTranslation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const sectionGroups: { group: string; items: Section[] }[] = [
    {
      group: t("admin.groups.dashboard"),
      items: [
        { id: "bos", label: "BOS", icon: "dashboard" },
        { id: "crm", label: t("admin.crm"), icon: "crm" },
      ],
    },
    {
      group: t("admin.groups.content"),
      items: [
        { id: "products", label: t("admin.products"), icon: "products" },
        { id: "projects", label: t("admin.projects"), icon: "projects" },
        { id: "clients", label: t("admin.clients"), icon: "clients" },
        { id: "testimonials", label: t("admin.testimonials"), icon: "testimonials" },
        { id: "socials", label: t("admin.socials"), icon: "socials" },
        { id: "events", label: t("admin.events"), icon: "events" },
        {
          id: "work_experiences",
          label: t("admin.workExperiences"),
          icon: "work",
        },
        { id: "technologies", label: t("admin.technologies"), icon: "techs" },
        { id: "studies", label: t("admin.studies"), icon: "studies" },
      ],
    },
    {
      group: t("admin.groups.general"),
      items: [
        { id: "blog_posts", label: t("admin.blogPosts"), icon: "blog" },
        { id: "home_content", label: t("admin.homeContent"), icon: "home" },
      ],
    },
    {
      group: t("admin.groups.system"),
      items: [
        { id: "radio_settings", label: t("admin.radioSettings"), icon: "radio" },
        { id: "invoices", label: t("admin.invoices"), icon: "invoices" },
        { id: "appearance", label: t("admin.appearance"), icon: "appearance" },
        { id: "job_offers", label: t("admin.jobOffers"), icon: "jobs" },
      ],
    },
  ];

  const activeLabel = sectionGroups
    .flatMap((group) => group.items)
    .find((item) => item.id === activeTab)?.label;

  const SidebarContent = (
    <div className="flex h-full w-full flex-col bg-white text-slate-700 dark:bg-slate-900 dark:text-slate-200">
      {/* Brand */}
      <div className="flex h-16 shrink-0 items-center gap-3 border-b border-slate-200 px-5 dark:border-white/10">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg shadow-md shadow-blue-900/15 dark:shadow-lg dark:shadow-blue-900/40">
          <img
            src="https://cdn.vixis.dev/Foto+de+Perfil+2.webp"
            alt=""
            className="h-full w-full object-cover"
          />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-extrabold tracking-tight text-slate-900 dark:text-white">
            Jarvis
          </p>
          <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">Vixis Studio</p>
        </div>
      </div>

      {/* Navegación */}
      <div className="flex-1 overflow-y-auto px-3 py-4">
        {sectionGroups.map((group) => (
          <div key={group.group} className="mb-5">
            <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              {group.group}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const isActive = item.id === activeTab;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      onTabChange(item.id);
                      setMobileOpen(false);
                    }}
                    className={clsx(
                      "flex w-full items-center gap-3 rounded-lg py-2.5 pr-3 text-left text-sm transition-colors cursor-pointer border-l-2",
                      isActive
                        ? "border-[#2093c4] bg-[#2093c4]/10 pl-2.5 font-semibold text-sky-700 dark:bg-[#2093c4]/15 dark:text-[#5fc1e4]"
                        : "border-transparent pl-3 text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/5 dark:hover:text-white"
                    )}
                  >
                    <SidebarIcon name={item.icon} className="h-[18px] w-[18px] shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="shrink-0 space-y-0.5 border-t border-slate-200 px-3 py-4 dark:border-white/10">
        <button
          type="button"
          onClick={() => {
            onToggleMedia();
            setMobileOpen(false);
          }}
          className={clsx(
            "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors cursor-pointer border-l-2",
            mediaOpen
              ? "border-[#2093c4] bg-[#2093c4]/10 text-sky-700 dark:bg-[#2093c4]/15 dark:text-[#5fc1e4]"
              : "border-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/5 dark:hover:text-white"
          )}
        >
          <SidebarIcon name="media" className="h-[18px] w-[18px] shrink-0" />
          <span className="truncate">{t("admin.mediaResources")}</span>
        </button>
        <a
          href="https://vixis.dev"
          target="_blank"
          rel="noopener noreferrer"
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-600 transition-colors border-l-2 border-transparent hover:bg-slate-100 hover:text-slate-900 cursor-pointer dark:text-slate-300 dark:hover:bg-white/5 dark:hover:text-white"
        >
          <SidebarIcon name="globe" className="h-[18px] w-[18px] shrink-0" />
          <span className="truncate">{t("admin.viewSite")}</span>
        </a>
      </div>
    </div>
  );

  return (
    <div className="flex h-dvh w-full overflow-hidden">
      {/* Overlay móvil */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar: drawer en móvil, estática en lg+ */}
      <aside
        className={clsx(
          "fixed inset-y-0 left-0 z-50 w-72 shrink-0 transform transition-transform duration-300 lg:static lg:z-auto lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {SidebarContent}
      </aside>

      {/* Columna principal */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topbar estilo TailAdmin */}
        <header className="relative z-30 flex h-16 shrink-0 items-center gap-3 border-b border-slate-200 bg-white/85 px-3 backdrop-blur-lg sm:px-5 dark:border-slate-800 dark:bg-slate-900/85">
          <button
            type="button"
            aria-label="Menu"
            onClick={() => setMobileOpen(!mobileOpen)}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition-colors hover:bg-slate-100 cursor-pointer lg:hidden dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>

          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-500">
              Vixis / Admin
            </p>
            <h1 className="truncate text-base font-bold text-slate-900 sm:text-lg dark:text-white">
              {activeLabel || t("admin.title")}
            </h1>
          </div>

          <div className="ml-auto flex shrink-0 items-center gap-1.5">
            {/* Selector de estado */}
            <div className="relative" ref={statusSelectorRef}>
              <button
                type="button"
                onClick={() =>
                  setShowStatusSelector((prev: boolean) => !prev)
                }
                className="flex h-10 items-center gap-2 rounded-lg border border-[#331d83]/30 bg-[#331d83]/10 px-3 text-xs font-semibold text-[#331d83] transition-colors hover:bg-[#331d83]/20 cursor-pointer dark:text-[#a78bfa] dark:border-[#331d83]/50"
              >
                <span
                  className={clsx(
                    "h-2 w-2 rounded-full",
                    currentStatus === "available" && "bg-emerald-500",
                    currentStatus === "away" && "bg-amber-500",
                    currentStatus === "busy" && "bg-red-500"
                  )}
                />
                <span className="hidden md:inline">
                  {t(`statusBadge.${currentStatus}`)}
                </span>
                <span className="md:hidden">{t("admin.changeStatus")}</span>
                <svg
                  className={clsx(
                    "h-3.5 w-3.5 transition-transform",
                    showStatusSelector ? "rotate-180" : ""
                  )}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>

              <div
                ref={statusDropdownRef}
                style={{
                  display: "none",
                  borderColor: "rgba(51, 29, 131, 0.5)",
                }}
                className="absolute right-0 top-full mt-2 min-w-[200px] rounded-lg border bg-black/90 shadow-lg z-50 backdrop-blur-lg"
              >
                {(["available", "away", "busy"] as const).map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => onStatusSelect(status)}
                    className={clsx(
                      "block w-full px-4 py-2 text-left text-white transition-colors cursor-pointer first:rounded-t-lg last:rounded-b-lg",
                      currentStatus === status
                        ? "bg-[#331d83]/60"
                        : "hover:bg-[#331d83]/30"
                    )}
                  >
                    {t(`statusBadge.${status}`)}
                  </button>
                ))}
              </div>
            </div>

            {/* Cerrar sesión */}
            <button
              type="button"
              onClick={onLogout}
              className="flex h-10 items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 text-xs font-semibold text-red-600 transition-colors hover:bg-red-500/20 cursor-pointer"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
              <span className="hidden sm:inline">{t("admin.logout")}</span>
            </button>
          </div>
        </header>

        {/* Contenido principal: el lienzo queda oscuro (se ven las tarjetas admin-card) */}
        <main className="flex min-w-0 flex-1 flex-col overflow-y-auto px-3 pb-24 pt-5 sm:px-6 lg:px-10 lg:pt-8">
          {children}
        </main>
      </div>

      {/* Nav del portfolio: fuera del sidebar (móvil = ancho completo; lg+ = solo sobre el contenido) */}
      <div className="pointer-events-none fixed inset-0 z-40 transform-gpu lg:left-72 site-nav-zone">
        <div className="pointer-events-auto">
          <Navigation externalBase="https://vixis.dev" />
        </div>
      </div>
    </div>
  );
}

export default AdminShell;