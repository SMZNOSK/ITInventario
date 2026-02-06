// src/app/_ui/Sidebar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/app/providers/AuthProvider";
import { usePendingTransfers } from "@/hooks/usePendingTransfers";
import { useTheme } from "@/contexts/ThemeContext";
import {
  LayoutDashboard,
  Package,
  Camera,
  Trash2,
  FileCheck,
  Users,
  ArrowRightLeft,
  Inbox,
  ClipboardList,
  UserCheck,
  HandHelping,
  FileText,
  UserX,
  Layers,
  Tag,
  Blocks,
  Monitor,
  Cpu,
  HardDrive,
  Server,
  Database,
  ShoppingCart,
  Building2,
  UserCog,
  Palette,
  LogOut,
  ChevronDown,
  ChevronRight
} from "lucide-react";
import { useState } from "react";

interface SidebarItemProps {
  icon: any;
  label: string;
  href: string;
  active: boolean;
  showBadge?: boolean;
}

function SidebarItem({ icon: Icon, label, href, active, showBadge }: SidebarItemProps) {
  const { theme } = useTheme();

  return (
    <Link
      href={href}
      className={`
        relative group flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200
        ${active
          ? theme === "dark"
            ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30"
            : theme === "light"
              ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30"
              : "bg-orange-600 text-white shadow-lg shadow-orange-500/30"
          : theme === "dark"
            ? "text-slate-400 hover:bg-slate-800 hover:text-white"
            : theme === "light"
              ? "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              : "text-amber-700 hover:bg-amber-100 hover:text-amber-900"
        }
      `}
    >
      <Icon size={20} className={`${active ? "" : "group-hover:scale-110 transition-transform"}`} />
      <span className="font-medium text-sm flex-1">{label}</span>
      {showBadge && (
        <span className="w-2 h-2 bg-red-500 rounded-full ring-2 ring-white/20" />
      )}
    </Link>
  );
}

interface SectionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function Section({ title, children, defaultOpen = true }: SectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const { theme } = useTheme();

  return (
    <div className="space-y-1">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          w-full flex items-center justify-between px-2 py-1.5 text-[10px] font-bold uppercase tracking-widest
          ${theme === "dark" ? "text-slate-500 hover:text-slate-400" : theme === "light" ? "text-slate-500 hover:text-slate-600" : "text-amber-600 hover:text-amber-700"}
          transition-colors
        `}
      >
        <span>{title}</span>
        {isOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
      </button>
      {isOpen && <div className="space-y-1">{children}</div>}
    </div>
  );
}

export default function Sidebar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const { hasPendingTransfers } = usePendingTransfers();
  const { theme, toggleTheme } = useTheme();

  const isAdmin = user?.role === "ADMIN";
  const isIng = user?.role === "INGENIERO";
  const isAlm = user?.role === "ALMACEN";

  const canInventory = isAdmin || isIng || isAlm;
  const canTeam = isAdmin || isIng || isAlm;

  const cleanPath = pathname?.split("?")[0] ?? "";

  const menuItems = {
    inventario: [
      { href: "/", label: "Dashboard", icon: LayoutDashboard, show: true },
      { href: "/assets", label: "Activos", icon: Package, show: canInventory },
      { href: "/inventory/capture", label: "Captura de inventario", icon: Camera, show: canInventory },
      { href: "/disposals", label: "Bajas", icon: Trash2, show: canInventory },
      { href: "/disposals/control", label: "Control de Bajas", icon: FileCheck, show: canInventory },
      { href: "/collaborators", label: "Colaboradores", icon: Users, show: isAdmin },
      { href: "/equipo/transfers", label: "Transferir Equipo", icon: ArrowRightLeft, show: canInventory },
      { href: "/equipo/transfers/accept", label: "Aceptar Transferencias", icon: Inbox, show: canInventory, badge: hasPendingTransfers },
      { href: "/equipo/transfers/history", label: "Historial", icon: FileText, show: isAdmin },
    ],
    equipo: [
      { href: "/assignments", label: "Asignaciones", icon: ClipboardList, show: canTeam },
      { href: "/equipo/assignments/control", label: "Control de Asignaciones", icon: UserCheck, show: canTeam },
      { href: "/equipo/loans", label: "Préstamos", icon: HandHelping, show: canTeam },
      { href: "/equipo/loans/control", label: "Control de Préstamos", icon: FileCheck, show: canTeam },
      { href: "/equipo/assignments/manual", label: "Asignación sin número", icon: UserX, show: canTeam },
      { href: "/equipo/assignments/manual/control", label: "Control sin número", icon: FileText, show: canTeam },
      { href: "/equipo/platforms", label: "Plataformas", icon: Layers, show: canTeam },
    ],
    catalogos: [
      { href: "/catalog/types", label: "Tipos", icon: Tag },
      { href: "/catalog/brands", label: "Marcas", icon: Blocks },
      { href: "/catalog/models", label: "Modelos", icon: Monitor },
      { href: "/catalog/os", label: "Sistemas Operativos", icon: Server },
      { href: "/catalog/processors", label: "Procesadores", icon: Cpu },
      { href: "/catalog/ram", label: "Memoria RAM", icon: HardDrive },
      { href: "/catalog/disks", label: "Tipos de disco", icon: Database },
      { href: "/catalog/storage", label: "Almacenamiento", icon: HardDrive },
      { href: "/catalog/providers", label: "Proveedores", icon: ShoppingCart },
    ],
    admin: [
      { href: "/admin/hotels", label: "Hoteles", icon: Building2, show: isAdmin },
      { href: "/admin/users", label: "Usuarios", icon: UserCog, show: isAdmin },
      { href: "/admin/fix-loan-sync", label: "Corregir Préstamos", icon: FileCheck, show: isAdmin },
    ],
  };

  const themeConfig = {
    dark: {
      bg: "bg-slate-900/95 backdrop-blur-sm",
      text: "text-slate-100",
      border: "border-slate-800",
      headerBg: "bg-blue-600",
      headerShadow: "shadow-lg shadow-blue-500/20",
      searchBg: "bg-slate-800",
      searchBorder: "border-slate-700 focus-within:border-blue-500",
      separatorBg: "bg-slate-800",
      profileHover: "hover:bg-slate-800/50",
    },
    light: {
      bg: "bg-white shadow-xl",
      text: "text-slate-800",
      border: "border-slate-200",
      headerBg: "bg-blue-600",
      headerShadow: "shadow-lg shadow-blue-500/20",
      searchBg: "bg-slate-100",
      searchBorder: "border-slate-200 focus-within:border-blue-500",
      separatorBg: "bg-slate-200",
      profileHover: "hover:bg-slate-100",
    },
    warm: {
      bg: "bg-orange-50/95 backdrop-blur-sm",
      text: "text-amber-950",
      border: "border-amber-200",
      headerBg: "bg-orange-600",
      headerShadow: "shadow-lg shadow-orange-500/20",
      searchBg: "bg-amber-100/50",
      searchBorder: "border-amber-200 focus-within:border-orange-500",
      separatorBg: "bg-amber-200",
      profileHover: "hover:bg-amber-100",
    },
  };

  const tc = themeConfig[theme];

  return (
    <aside
      className={`
        w-[260px] shrink-0 border-r flex flex-col transition-all duration-300
        ${tc.bg} ${tc.text} ${tc.border}
      `}
    >
      {/* Header / Logo */}
      <div className="p-5 flex items-center gap-3">
        <div className={`w-11 h-11 ${tc.headerBg} rounded-xl flex items-center justify-center ${tc.headerShadow}`}>
          <Package className="text-white" size={24} />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="font-bold text-base leading-tight">Inventario TI</h1>
          <p className="text-[10px] opacity-60 uppercase tracking-widest font-bold truncate">
            Sistema de Gestión
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 space-y-6 overflow-y-auto pb-4">
        <Section title="Inventario">
          {menuItems.inventario.map(
            (item) =>
              item.show !== false && (
                <SidebarItem
                  key={item.href}
                  {...item}
                  active={cleanPath === item.href}
                  showBadge={item.badge}
                />
              )
          )}
        </Section>

        {canTeam && (
          <Section title="Equipo">
            {menuItems.equipo.map(
              (item) =>
                item.show !== false && (
                  <SidebarItem key={item.href} {...item} active={cleanPath === item.href} />
                )
            )}
          </Section>
        )}

        <Section title="Catálogos" defaultOpen={false}>
          {menuItems.catalogos.map((item) => (
            <SidebarItem key={item.href} {...item} active={cleanPath === item.href} />
          ))}
        </Section>

        {isAdmin && (
          <Section title="Administración">
            {menuItems.admin.map(
              (item) =>
                item.show !== false && (
                  <SidebarItem key={item.href} {...item} active={cleanPath === item.href} />
                )
            )}
          </Section>
        )}
      </nav>

      {/* Theme Switcher */}
      <div className={`px-3 py-2 border-t ${tc.border}`}>
        <button
          onClick={toggleTheme}
          className={`
            w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200
            ${theme === "dark" ? "text-slate-400 hover:bg-slate-800 hover:text-white" : theme === "light" ? "text-slate-600 hover:bg-slate-100" : "text-amber-700 hover:bg-amber-100"}
          `}
        >
          <Palette size={20} />
          <span className="font-medium text-sm flex-1">
            {theme === "dark" ? "Modo Oscuro" : theme === "light" ? "Modo Claro" : "Modo Cálido"}
          </span>
        </button>
      </div>

      {/* User Profile Footer */}
      <div className={`p-3 border-t ${tc.border}`}>
        <div className={`flex items-center gap-3 p-2 rounded-xl transition-all ${tc.profileHover}`}>
          <div className="relative">
            <div className={`w-10 h-10 rounded-full ${tc.headerBg} flex items-center justify-center text-white font-bold shadow-md`}>
              {user?.name?.charAt(0) || "U"}
            </div>
            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">{user?.name || "Usuario"}</p>
            <p className="text-xs opacity-60 truncate">{user?.username || user?.role || "Usuario"}</p>
          </div>
          <button
            onClick={() => logout()}
            className={`p-1.5 rounded-lg transition-colors ${theme === "dark" ? "hover:bg-red-500/10 hover:text-red-500" : "hover:bg-red-100 hover:text-red-600"}`}
            title="Cerrar sesión"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </aside>
  );
}
