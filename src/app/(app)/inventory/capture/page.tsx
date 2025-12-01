// src/app/(app)/inventory/capture/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/app/providers";
import {
  Box,
  Monitor,
  Building2,
  Tag,
  Hash,
  FileText,
  Calendar,
  Layers,
  Info,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

type Option = {
  id: number;
  name: string;
};

type TypeOption = Option & {
  code?: string | null;
};

type AssetForm = {
  typeId: number | null;
  brandId: number | null;
  modelId: number | null;
  currentHotelId: number | null;
  serial: string;

  // Datos del equipo
  processorId: number | null;
  ramModuleId: number | null;
  diskTypeId: number | null;
  storageCapacityId: number | null;
  operatingSystemId: number | null;

  // Facturación
  olderThan3Years: boolean;
  invoiceNumber: string;
  invoiceDate: string; // yyyy-mm-dd
  invoiceProviderId: number | null;
};

type CaptureMode = "single" | "bulk";

// Devuelve el primer arreglo que encuentre en las claves indicadas,
// o bien en `items` / `data`, o el propio objeto si ya es un array.
function extractArray<T = any>(res: any, keys: string[] = []): T[] {
  if (!res) return [];
  if (Array.isArray(res)) return res;

  for (const key of keys) {
    const value = (res as any)[key];
    if (Array.isArray(value)) return value;
  }

  if (Array.isArray((res as any).items)) return (res as any).items;
  if (Array.isArray((res as any).data)) return (res as any).data;

  return [];
}

export default function InventoryCapturePage() {
  const { fetchJSON } = useAuth();

  const [types, setTypes] = useState<TypeOption[]>([]);
  const [brands, setBrands] = useState<Option[]>([]);
  const [models, setModels] = useState<Option[]>([]);
  const [hotels, setHotels] = useState<Option[]>([]);
  const [oses, setOses] = useState<Option[]>([]);
  const [processors, setProcessors] = useState<Option[]>([]);
  const [ramModules, setRamModules] = useState<Option[]>([]);
  const [diskTypes, setDiskTypes] = useState<Option[]>([]);
  const [storages, setStorages] = useState<Option[]>([]);
  const [providers, setProviders] = useState<Option[]>([]);

  const [loadingCatalogs, setLoadingCatalogs] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [mode, setMode] = useState<CaptureMode>("single");
  const [bulkSerials, setBulkSerials] = useState("");

  const [form, setForm] = useState<AssetForm>({
    typeId: null,
    brandId: null,
    modelId: null,
    currentHotelId: null,
    serial: "",
    processorId: null,
    ramModuleId: null,
    diskTypeId: null,
    storageCapacityId: null,
    operatingSystemId: null,
    olderThan3Years: false,
    invoiceNumber: "",
    invoiceDate: "",
    invoiceProviderId: null,
  });

  /* ===========================
   *  Cargar catálogos
   * =========================== */
  useEffect(() => {
    async function loadCatalogs() {
      try {
        setLoadingCatalogs(true);
        setError(null);

        // Tipos y marcas: tolerantes al formato de la API
        const typesRes = await fetchJSON<any>("/api/catalog/types");
        const brandsRes = await fetchJSON<any>("/api/catalog/brands");

        const typesArr = extractArray<TypeOption>(typesRes, ["tipos", "types"]);
        const brandsArr = extractArray<Option>(brandsRes, ["marcas", "brands"]);

        if (typesArr.length === 0 && typesRes && typesRes.success === false) {
          throw new Error(
            typesRes.message || "No se pudo cargar el catálogo de tipos",
          );
        }
        if (brandsArr.length === 0 && brandsRes && brandsRes.success === false) {
          throw new Error(
            brandsRes.message || "No se pudo cargar el catálogo de marcas",
          );
        }

        setTypes(typesArr);
        setBrands(brandsArr);

        // Resto de catálogos
        const [
          modelsRes,
          hotelsRes,
          osRes,
          processorsRes,
          ramRes,
          disksRes,
          storageRes,
          providersRes,
        ] = await Promise.all([
          fetchJSON<any>("/api/catalog/models"),
          fetchJSON<any>("/api/catalog/hotels"),
          fetchJSON<any>("/api/catalog/os/activos"),
          fetchJSON<any>("/api/catalog/processors/activos"),
          fetchJSON<any>("/api/catalog/ram"),
          fetchJSON<any>("/api/catalog/disks"),
          fetchJSON<any>("/api/catalog/storage"),
          fetchJSON<any>("/api/catalog/providers"),
        ]);

        setModels(
          extractArray<Option>(modelsRes, ["modelos", "models", "modelosActivos"]),
        );
        setHotels(extractArray<Option>(hotelsRes, ["hoteles", "hotels"]));
        setOses(extractArray<Option>(osRes, ["sistemas", "oses"]));
        setProcessors(
          extractArray<Option>(processorsRes, ["procesadores", "processors"]),
        );
        setRamModules(extractArray<Option>(ramRes, ["rams", "ram", "memorias"]));
        setDiskTypes(extractArray<Option>(disksRes, ["discos", "disks"]));
        setStorages(
          extractArray<Option>(storageRes, [
            "almacenamientos",
            "storage",
            "capacidades",
          ]),
        );
        setProviders(
          extractArray<Option>(providersRes, ["proveedores", "providers"]),
        );
      } catch (e: any) {
        console.error("Error al cargar catálogos de captura", e);
        setError(e?.message || "Error al cargar catálogos");
      } finally {
        setLoadingCatalogs(false);
      }
    }

    loadCatalogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ===========================
   *  Helpers
   * =========================== */

  const selectedType = useMemo(
    () => types.find((t) => t.id === form.typeId) || null,
    [types, form.typeId],
  );

  // Regla: “CPU / Laptop / Notebook”
  const isComputerType = useMemo(() => {
    if (!selectedType) return false;
    const n = selectedType.name.toLowerCase();
    return (
      n.includes("cpu") ||
      n.includes("laptop") ||
      n.includes("notebook") ||
      n.startsWith("lap")
    );
  }, [selectedType]);

  // Seriales en modo múltiple
  const bulkSerialList = useMemo(
    () =>
      Array.from(
        new Set(
          bulkSerials
            .split(/\r?\n/)
            .map((s) => s.trim())
            .filter(Boolean),
        ),
      ),
    [bulkSerials],
  );
  const bulkCount = bulkSerialList.length;

  const hasAtLeastOneSerial =
    mode === "single" ? !!form.serial.trim() : bulkSerialList.length > 0;

  const canSubmit =
    !!form.typeId &&
    !!form.currentHotelId &&
    hasAtLeastOneSerial &&
    (!isComputerType ||
      (form.processorId &&
        form.ramModuleId &&
        form.diskTypeId &&
        form.storageCapacityId &&
        form.operatingSystemId)) &&
    (!form.olderThan3Years
      ? !!form.invoiceNumber.trim() &&
        !!form.invoiceDate &&
        !!form.invoiceProviderId
      : true);

  function updateForm<K extends keyof AssetForm>(key: K, value: AssetForm[K]) {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  /* ===========================
   *  Submit
   * =========================== */

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    const serialsToCreate =
      mode === "single" ? [form.serial.trim()] : bulkSerialList;

    if (serialsToCreate.length === 0) return;

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const commonPayload: any = {
        typeId: form.typeId,
        brandId: form.brandId,
        modelId: form.modelId,
        currentHotelId: form.currentHotelId,

        processorId: isComputerType ? form.processorId : null,
        ramModuleId: isComputerType ? form.ramModuleId : null,
        diskTypeId: isComputerType ? form.diskTypeId : null,
        storageCapacityId: isComputerType ? form.storageCapacityId : null,
        operatingSystemId: isComputerType ? form.operatingSystemId : null,

        olderThan3Years: form.olderThan3Years,
        invoiceNumber: form.olderThan3Years
          ? null
          : form.invoiceNumber.trim() || null,
        invoiceDate:
          form.olderThan3Years || !form.invoiceDate
            ? null
            : new Date(form.invoiceDate).toISOString(),
        invoiceProviderId: form.olderThan3Years
          ? null
          : form.invoiceProviderId,
      };

      let okCount = 0;
      const errorMessages: string[] = [];

      for (const serial of serialsToCreate) {
        const payload = {
          ...commonPayload,
          serial: serial.trim(),
        };

        const res = await fetch("/api/assets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          const msg =
            data?.error || data?.message || `Error HTTP ${res.status}`;
          errorMessages.push(`${serial}: ${msg}`);
        } else {
          okCount += 1;
        }
      }

      if (okCount === serialsToCreate.length) {
        setSuccess(`Se registraron ${okCount} equipo(s) correctamente.`);
      } else if (okCount > 0) {
        setSuccess(
          `Se registraron ${okCount} equipo(s), pero ${
            serialsToCreate.length - okCount
          } tuvieron error.`,
        );
        setError(
          errorMessages.slice(0, 3).join(" | ") ||
            "Hubo errores al registrar algunos equipos.",
        );
      } else {
        setError(
          errorMessages[0] || "No se pudo registrar ningún equipo.",
        );
      }

      if (mode === "single") {
        setForm((prev) => ({
          ...prev,
          serial: "",
          processorId: null,
          ramModuleId: null,
          diskTypeId: null,
          storageCapacityId: null,
          operatingSystemId: null,
          olderThan3Years: false,
          invoiceNumber: "",
          invoiceDate: "",
          invoiceProviderId: null,
        }));
      } else {
        setBulkSerials("");
        setForm((prev) => ({
          ...prev,
          serial: "",
        }));
      }
    } catch (e: any) {
      console.error(e);
      setError(e?.message || "No se pudo guardar el equipo");
    } finally {
      setSaving(false);
    }
  }

  /* ===========================
   *  UI
   * =========================== */

  return (
    <div className="min-h-[calc(100vh-64px)] bg-slate-50 px-4 py-6 md:px-8 md:py-8 font-sans text-slate-800">
      {/* Header */}
      <div className="mx-auto mb-6 max-w-5xl text-center md:text-left">
        <h1 className="mb-2 flex items-center justify-center gap-3 text-3xl font-bold text-slate-900 md:justify-start">
          <div className="rounded-xl bg-indigo-600 p-2 text-white shadow-lg shadow-indigo-200">
            <Box size={26} />
          </div>
          Captura de inventario
        </h1>
        <p className="mx-auto max-w-2xl text-sm text-slate-500 md:mx-0">
          Da de alta equipos en el inventario. Para CPUs y laptops se
          solicitarán también las especificaciones técnicas y la información de
          facturación.
        </p>
      </div>

      {/* Mensajes globales */}
      <div className="mx-auto mb-4 max-w-5xl space-y-2">
        {error && (
          <div className="flex items-start gap-3 rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 text-sm text-rose-800">
            <AlertCircle className="mt-0.5 shrink-0 text-rose-500" size={18} />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="flex items-start gap-3 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            <CheckCircle2
              className="mt-0.5 shrink-0 text-emerald-500"
              size={18}
            />
            <span>{success}</span>
          </div>
        )}
      </div>

      {/* Card principal */}
      <div className="mx-auto max-w-5xl overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-xl shadow-slate-200/60">
        {/* Tabs modo captura */}
        <div className="flex gap-2 border-b border-slate-100 bg-slate-50/60 p-2">
          <button
            type="button"
            onClick={() => setMode("single")}
            className={`flex-1 rounded-xl py-3 px-4 text-sm font-medium transition-all duration-300
              flex items-center justify-center gap-2
              ${
                mode === "single"
                  ? "bg-white text-indigo-600 shadow-md shadow-indigo-100 ring-1 ring-indigo-50"
                  : "text-slate-500 hover:bg-slate-100 hover:text-slate-700"
              }`}
          >
            <Monitor size={18} />
            Captura individual
          </button>
          <button
            type="button"
            onClick={() => setMode("bulk")}
            className={`flex-1 rounded-xl py-3 px-4 text-sm font-medium transition-all duration-300
              flex items-center justify-center gap-2
              ${
                mode === "bulk"
                  ? "bg-white text-indigo-600 shadow-md shadow-indigo-100 ring-1 ring-indigo-50"
                  : "text-slate-500 hover:bg-slate-100 hover:text-slate-700"
              }`}
          >
            <Layers size={18} />
            Captura múltiple
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8 p-6 md:p-8">
          {/* =============== DATOS GENERALES =============== */}
          <section>
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-800">
              <Info size={20} className="text-indigo-500" />
              Datos generales
            </h2>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {/* Tipo */}
              <div className="space-y-1.5 group">
                <label className="ml-1 text-sm font-medium text-slate-600">
                  Tipo de equipo
                </label>
                <div className="relative">
                  <Monitor
                    className="pointer-events-none absolute left-3 top-3 text-slate-400 transition-colors group-focus-within:text-indigo-500"
                    size={18}
                  />
                  <select
                    value={form.typeId ?? ""}
                    onChange={(e) =>
                      updateForm(
                        "typeId",
                        e.target.value ? Number(e.target.value) : null,
                      )
                    }
                    disabled={loadingCatalogs}
                    className="w-full cursor-pointer appearance-none rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-8 text-sm text-slate-900 transition-all
                      hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  >
                    <option value="">Selecciona un tipo…</option>
                    {types.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute right-3 top-3.5 text-slate-400">
                    <svg
                      className="h-4 w-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Marca */}
              <div className="space-y-1.5 group">
                <label className="ml-1 text-sm font-medium text-slate-600">
                  Marca
                </label>
                <div className="relative">
                  <Tag
                    className="pointer-events-none absolute left-3 top-3 text-slate-400 transition-colors group-focus-within:text-indigo-500"
                    size={18}
                  />
                  <select
                    value={form.brandId ?? ""}
                    onChange={(e) =>
                      updateForm(
                        "brandId",
                        e.target.value ? Number(e.target.value) : null,
                      )
                    }
                    disabled={loadingCatalogs}
                    className="w-full cursor-pointer appearance-none rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-8 text-sm text-slate-900 transition-all
                      hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  >
                    <option value="">Selecciona una marca…</option>
                    {brands.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute right-3 top-3.5 text-slate-400">
                    <svg
                      className="h-4 w-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Modelo */}
              <div className="space-y-1.5 group">
                <label className="ml-1 text-sm font-medium text-slate-600">
                  Modelo
                </label>
                <div className="relative">
                  <Box
                    className="pointer-events-none absolute left-3 top-3 text-slate-400 transition-colors group-focus-within:text-indigo-500"
                    size={18}
                  />
                  <select
                    value={form.modelId ?? ""}
                    onChange={(e) =>
                      updateForm(
                        "modelId",
                        e.target.value ? Number(e.target.value) : null,
                      )
                    }
                    disabled={loadingCatalogs}
                    className="w-full cursor-pointer appearance-none rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-8 text-sm text-slate-900 transition-all
                      hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  >
                    <option value="">Selecciona un modelo…</option>
                    {models.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute right-3 top-3.5 text-slate-400">
                    <svg
                      className="h-4 w-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Serial (solo modo single) */}
              {mode === "single" && (
                <div className="space-y-1.5 group">
                  <label className="ml-1 text-sm font-medium text-slate-600">
                    Número de serie / Service Tag
                  </label>
                  <div className="relative">
                    <div className="pointer-events-none absolute left-3 top-2.5 border-r border-slate-200 pr-2 font-mono text-xs text-slate-400 group-focus-within:text-indigo-500">
                      SN
                    </div>
                    <input
                      value={form.serial}
                      onChange={(e) => updateForm("serial", e.target.value)}
                      placeholder="Ej. WERTYU2345"
                      className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-12 pr-4 text-sm text-slate-900 transition-all placeholder:text-slate-300
                        focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>
                </div>
              )}

              {/* Hotel */}
              <div
                className={`space-y-1.5 group md:col-span-2 ${
                  mode === "single" ? "lg:col-span-1" : "lg:col-span-2"
                }`}
              >
                <label className="ml-1 text-sm font-medium text-slate-600">
                  Ubicación / Hotel
                </label>
                <div className="relative">
                  <Building2
                    className="pointer-events-none absolute left-3 top-3 text-slate-400 transition-colors group-focus-within:text-indigo-500"
                    size={18}
                  />
                  <select
                    value={form.currentHotelId ?? ""}
                    onChange={(e) =>
                      updateForm(
                        "currentHotelId",
                        e.target.value ? Number(e.target.value) : null,
                      )
                    }
                    disabled={loadingCatalogs}
                    className="w-full cursor-pointer appearance-none rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-8 text-sm text-slate-900 transition-all
                      hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  >
                    <option value="">Selecciona un hotel…</option>
                    {hotels.map((h) => (
                      <option key={h.id} value={h.id}>
                        {h.name}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute right-3 top-3.5 text-slate-400">
                    <svg
                      className="h-4 w-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ===== SERIAL MÚLTIPLE ===== */}
          {mode === "bulk" && (
            <section>
              <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-800">
                <Hash size={20} className="text-indigo-500" />
                Identificación (seriales)
              </h2>

              <div className="space-y-3">
                <div className="flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50 px-3 py-3 text-sm text-blue-800">
                  <Info className="mt-0.5 shrink-0 text-blue-500" size={18} />
                  <p>
                    Escribe o pega un número de serie por línea. Se crearán
                    equipos con los mismos datos generales y de facturación.
                  </p>
                </div>

                <textarea
                  rows={6}
                  value={bulkSerials}
                  onChange={(e) => setBulkSerials(e.target.value)}
                  placeholder={"WERTYU2345\nASDF1234ZX\nDIA00031ABC"}
                  className="w-full resize-none rounded-xl border border-slate-200 bg-white p-4 font-mono text-sm leading-relaxed text-slate-900 placeholder:text-slate-300
                    focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
                {bulkCount > 0 && (
                  <p className="text-[11px] text-slate-500">
                    Se capturarán{" "}
                    <span className="font-semibold">{bulkCount}</span>{" "}
                    equipo(s).
                  </p>
                )}
              </div>
            </section>
          )}

          {/* ===== DATOS DEL EQUIPO (solo CPU/Laptop) ===== */}
          {isComputerType && (
            <section>
              <div className="mb-4 flex items-center justify-between gap-2">
                <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-800">
                  <Monitor size={20} className="text-indigo-500" />
                  Datos del equipo
                </h2>
                <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-medium text-slate-50">
                  Tipo: {selectedType?.name}
                </span>
              </div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                {/* SO */}
                <div className="space-y-1.5 group">
                  <label className="ml-1 text-sm font-medium text-slate-600">
                    Sistema operativo
                  </label>
                  <div className="relative">
                    <Monitor
                      className="pointer-events-none absolute left-3 top-3 text-slate-400 transition-colors group-focus-within:text-indigo-500"
                      size={18}
                    />
                    <select
                      value={form.operatingSystemId ?? ""}
                      onChange={(e) =>
                        updateForm(
                          "operatingSystemId",
                          e.target.value ? Number(e.target.value) : null,
                        )
                      }
                      disabled={loadingCatalogs}
                      className="w-full cursor-pointer appearance-none rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-8 text-sm text-slate-900 transition-all
                        hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    >
                      <option value="">Selecciona SO…</option>
                      {oses.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.name}
                        </option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute right-3 top-3.5 text-slate-400">
                      <svg
                        className="h-4 w-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Procesador */}
                <div className="space-y-1.5 group">
                  <label className="ml-1 text-sm font-medium text-slate-600">
                    Procesador
                  </label>
                  <div className="relative">
                    <CpuIconLike />
                    <select
                      value={form.processorId ?? ""}
                      onChange={(e) =>
                        updateForm(
                          "processorId",
                          e.target.value ? Number(e.target.value) : null,
                        )
                      }
                      disabled={loadingCatalogs}
                      className="w-full cursor-pointer appearance-none rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-8 text-sm text-slate-900 transition-all
                        hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    >
                      <option value="">Selecciona procesador…</option>
                      {processors.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute right-3 top-3.5 text-slate-400">
                      <svg
                        className="h-4 w-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* RAM */}
                <div className="space-y-1.5 group">
                  <label className="ml-1 text-sm font-medium text-slate-600">
                    Memoria RAM
                  </label>
                  <div className="relative">
                    <Layers
                      className="pointer-events-none absolute left-3 top-3 text-slate-400 transition-colors group-focus-within:text-indigo-500"
                      size={18}
                    />
                    <select
                      value={form.ramModuleId ?? ""}
                      onChange={(e) =>
                        updateForm(
                          "ramModuleId",
                          e.target.value ? Number(e.target.value) : null,
                        )
                      }
                      disabled={loadingCatalogs}
                      className="w-full cursor-pointer appearance-none rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-8 text-sm text-slate-900 transition-all
                        hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    >
                      <option value="">Selecciona RAM…</option>
                      {ramModules.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name}
                        </option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute right-3 top-3.5 text-slate-400">
                      <svg
                        className="h-4 w-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Tipo disco */}
                <div className="space-y-1.5 group">
                  <label className="ml-1 text-sm font-medium text-slate-600">
                    Tipo de disco
                  </label>
                  <div className="relative">
                    <Layers
                      className="pointer-events-none absolute left-3 top-3 text-slate-400 transition-colors group-focus-within:text-indigo-500"
                      size={18}
                    />
                    <select
                      value={form.diskTypeId ?? ""}
                      onChange={(e) =>
                        updateForm(
                          "diskTypeId",
                          e.target.value ? Number(e.target.value) : null,
                        )
                      }
                      disabled={loadingCatalogs}
                      className="w-full cursor-pointer appearance-none rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-8 text-sm text-slate-900 transition-all
                        hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    >
                      <option value="">Selecciona tipo de disco…</option>
                      {diskTypes.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute right-3 top-3.5 text-slate-400">
                      <svg
                        className="h-4 w-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Almacenamiento */}
                <div className="space-y-1.5 group">
                  <label className="ml-1 text-sm font-medium text-slate-600">
                    Almacenamiento interno
                  </label>
                  <div className="relative">
                    <Box
                      className="pointer-events-none absolute left-3 top-3 text-slate-400 transition-colors group-focus-within:text-indigo-500"
                      size={18}
                    />
                    <select
                      value={form.storageCapacityId ?? ""}
                      onChange={(e) =>
                        updateForm(
                          "storageCapacityId",
                          e.target.value ? Number(e.target.value) : null,
                        )
                      }
                      disabled={loadingCatalogs}
                      className="w-full cursor-pointer appearance-none rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-8 text-sm text-slate-900 transition-all
                        hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    >
                      <option value="">Selecciona capacidad…</option>
                      {storages.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute right-3 top-3.5 text-slate-400">
                      <svg
                        className="h-4 w-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* ===== FACTURACIÓN ===== */}
          <section className="rounded-2xl border border-slate-100 bg-slate-50/80 p-6">
            <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-center">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-800">
                <FileText size={20} className="text-indigo-500" />
                Información de facturación
              </h2>

              <div className="flex rounded-lg bg-slate-200/50 p-1 text-sm font-medium">
                <button
                  type="button"
                  onClick={() => updateForm("olderThan3Years", false)}
                  className={`relative rounded-md px-4 py-1.5 transition-all ${
                    !form.olderThan3Years
                      ? "bg-white text-indigo-700 shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  Capturar factura
                </button>
                <button
                  type="button"
                  onClick={() => updateForm("olderThan3Years", true)}
                  className={`relative rounded-md px-4 py-1.5 transition-all ${
                    form.olderThan3Years
                      ? "bg-white text-indigo-700 shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  Mayor a 3 años
                </button>
              </div>
            </div>

            {!form.olderThan3Years ? (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                {/* Proveedor */}
                <div className="space-y-1.5 group">
                  <label className="ml-1 text-sm font-medium text-slate-600">
                    Proveedor
                  </label>
                  <div className="relative">
                    <Building2
                      className="pointer-events-none absolute left-3 top-3 text-slate-400 transition-colors group-focus-within:text-indigo-500"
                      size={18}
                    />
                    <select
                      value={form.invoiceProviderId ?? ""}
                      onChange={(e) =>
                        updateForm(
                          "invoiceProviderId",
                          e.target.value ? Number(e.target.value) : null,
                        )
                      }
                      disabled={loadingCatalogs}
                      className="w-full cursor-pointer appearance-none rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-8 text-sm text-slate-900 transition-all
                        hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    >
                      <option value="">Selecciona proveedor…</option>
                      {providers.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute right-3 top-3.5 text-slate-400">
                      <svg
                        className="h-4 w-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Folio */}
                <div className="space-y-1.5 group">
                  <label className="ml-1 text-sm font-medium text-slate-600">
                    Número / folio de factura
                  </label>
                  <div className="relative">
                    <FileText
                      className="pointer-events-none absolute left-3 top-3 text-slate-400 transition-colors group-focus-within:text-indigo-500"
                      size={18}
                    />
                    <input
                      value={form.invoiceNumber}
                      onChange={(e) =>
                        updateForm("invoiceNumber", e.target.value)
                      }
                      placeholder="Ej. FAC-00123"
                      className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 transition-all placeholder:text-slate-300
                        focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>
                </div>

                {/* Fecha */}
                <div className="space-y-1.5 group">
                  <label className="ml-1 text-sm font-medium text-slate-600">
                    Fecha de factura
                  </label>
                  <div className="relative">
                    <Calendar
                      className="pointer-events-none absolute left-3 top-3 text-slate-400 transition-colors group-focus-within:text-indigo-500"
                      size={18}
                    />
                    <input
                      type="date"
                      value={form.invoiceDate}
                      onChange={(e) =>
                        updateForm("invoiceDate", e.target.value)
                      }
                      className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-700 transition-all
                        focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-4 rounded-xl border border-orange-100 bg-orange-50 p-4 text-orange-800">
                <div className="shrink-0 rounded-full bg-white p-2 shadow-sm">
                  <AlertCircle className="text-orange-500" size={22} />
                </div>
                <div>
                  <p className="font-semibold">
                    Equipo marcado como mayor a 3 años
                  </p>
                  <p className="text-sm text-orange-700/80">
                    No es necesario capturar proveedor, número de factura ni
                    fecha para este activo.
                  </p>
                </div>
              </div>
            )}
          </section>

          {/* BOTÓN GUARDAR */}
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={!canSubmit || saving}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-200 transition-all
                hover:-translate-y-0.5 hover:bg-indigo-700 disabled:translate-y-0 disabled:cursor-not-allowed disabled:bg-slate-400 disabled:shadow-none"
            >
              <CheckCircle2 size={18} />
              {saving
                ? mode === "single"
                  ? "Guardando…"
                  : "Guardando lotes…"
                : mode === "single"
                ? "Guardar equipo"
                : "Guardar equipos"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/**
 * Icono pequeño para "CPU" (solo decorativo)
 */
function CpuIconLike() {
  return (
    <svg
      className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400 transition-colors group-focus-within:text-indigo-500"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <rect x="9" y="9" width="6" height="6" rx="1" />
      <path d="M9 1v3M15 1v3M9 20v3M15 20v3M1 9h3M1 15h3M20 9h3M20 15h3" />
    </svg>
  );
}
