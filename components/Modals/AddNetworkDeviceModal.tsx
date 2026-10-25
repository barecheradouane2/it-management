"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Pencil, X, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

import {
  createNetworkDevice,
  updateNetworkDevice,
  type NetworkDeviceFormData,
} from "@/lib/actions/networkdevice";
import type { DeviceType } from "@prisma/client";

type DeviceOption = {
  id: number;
  codeSarpi: string | null;
  serialNumber: string | null;
  brand: string;
  model: string | null;
  type: DeviceType;
  location: string | null;
};

type NetworkDeviceItem = {
  id: number;
  deviceId: number | null;
  host: string | null;
  wifiSsid: string | null;
  wifiPassword: string | null;
  adminLogin: string | null;
  adminPassword: string | null;
  note: string | null;
};

type Props = {
  networkDevice?: NetworkDeviceItem;
  devices: DeviceOption[];
  onSuccess?: () => void;
};

const emptyValues: NetworkDeviceFormData = {
  deviceId: null,
  host: "",
  wifiSsid: "",
  wifiPassword: "",
  adminLogin: "",
  adminPassword: "",
  note: "",
};

export default function AddEditNetworkDeviceModal({
  networkDevice,
  devices,
  onSuccess,
}: Props) {
  const [open, setOpen] = useState(false);
  const [showWifiPass, setShowWifiPass] = useState(false);
  const [showAdminPass, setShowAdminPass] = useState(false);
  const isEdit = Boolean(networkDevice);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<NetworkDeviceFormData>({
    defaultValues: emptyValues,
  });

  const getFormValues = (item: NetworkDeviceItem): NetworkDeviceFormData => ({
    deviceId: item.deviceId,
    host: item.host ?? "",
    wifiSsid: item.wifiSsid ?? "",
    wifiPassword: item.wifiPassword ?? "",
    adminLogin: item.adminLogin ?? "",
    adminPassword: item.adminPassword ?? "",
    note: item.note ?? "",
  });

  useEffect(() => {
    if (networkDevice) {
      reset(getFormValues(networkDevice));
    }
  }, [networkDevice, reset]);

  const openModal = () => {
    reset(networkDevice ? getFormValues(networkDevice) : emptyValues);
    setOpen(true);
  };

  const closeModal = () => {
    setOpen(false);
    reset(networkDevice ? getFormValues(networkDevice) : emptyValues);
  };

  const onSubmit = async (data: NetworkDeviceFormData) => {
    try {
      const payload: NetworkDeviceFormData = {
        ...data,
        deviceId: data.deviceId ? Number(data.deviceId) : null,
      };

      const result = isEdit
        ? await updateNetworkDevice(networkDevice!.id, payload)
        : await createNetworkDevice(payload);

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success(
        isEdit
          ? "Équipement réseau mis à jour !"
          : "Équipement réseau ajouté avec succès !"
      );

      closeModal();
      onSuccess?.();
    } catch (error) {
      console.error(error);
      toast.error("Une erreur s'est produite. Veuillez réessayer.");
    }
  };

  const inputClass =
    "w-full rounded-lg border border-slate-300 px-3 py-2 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200 text-sm";
  const labelClass = "mb-1 block text-left text-sm font-medium text-slate-700";

  return (
    <>
      {isEdit ? (
        <button
          type="button"
          onClick={openModal}
          title="Modifier équipement réseau"
          className="rounded-lg border border-slate-300 p-2 text-slate-700 transition hover:bg-slate-50"
        >
          <Pencil size={16} />
        </button>
      ) : (
        <button
          type="button"
          onClick={openModal}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
        >
          + Add Network Device
        </button>
      )}

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl bg-white shadow-xl"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b p-6">
              <div>
                <h2 className="text-left text-xl font-semibold text-slate-900">
                  {isEdit
                    ? "Modifier Configuration Réseau"
                    : "Nouvelle Configuration Réseau"}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Associez un matériel et gérez les identifiants Wi-Fi et administration.
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 p-6">
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                {/* Device Selector */}
                <div className="sm:col-span-2">
                  <label className={labelClass}>Lier à un matériel (Device)</label>
                  <select
                    {...register("deviceId", {
                      setValueAs: (v) => (v === "" || v === "0" ? null : Number(v)),
                    })}
                    className={inputClass}
                  >
                    <option value="">-- Aucun matériel lié (Standalone) --</option>
                    {devices.map((device) => (
                      <option key={device.id} value={device.id}>
                        {device.codeSarpi ? `[${device.codeSarpi}] ` : ""}
                        {device.brand} {device.model ?? ""} ({device.type})
                        {device.location ? ` - ${device.location}` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Host / IP */}
                <div className="sm:col-span-2">
                  <label className={labelClass}>Host / IP Address / Hostname</label>
                  <input
                    placeholder="e.g. 192.168.1.254 ou AP-WIFI-SDR"
                    {...register("host")}
                    className={inputClass}
                  />
                </div>

                {/* Section Wi-Fi */}
                <div className="sm:col-span-2 rounded-lg border border-blue-200 bg-blue-50/40 p-4">
                  <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-blue-900">
                    Configuration Wi-Fi
                  </h3>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className={labelClass}>Wi-Fi Name (SSID)</label>
                      <input
                        placeholder="e.g. SARPI-GUEST"
                        {...register("wifiSsid")}
                        className={inputClass}
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className={labelClass}>Wi-Fi Password</label>
                        <button
                          type="button"
                          onClick={() => setShowWifiPass(!showWifiPass)}
                          className="flex items-center gap-1 text-xs text-blue-700 hover:underline"
                        >
                          {showWifiPass ? <EyeOff size={14} /> : <Eye size={14} />}
                          {showWifiPass ? "Masquer" : "Afficher"}
                        </button>
                      </div>
                      <input
                        type={showWifiPass ? "text" : "password"}
                        placeholder="Clé de sécurité Wi-Fi"
                        {...register("wifiPassword")}
                        className={inputClass}
                      />
                    </div>
                  </div>
                </div>

                {/* Section Admin Login / Password */}
                <div className="sm:col-span-2 rounded-lg border border-amber-200 bg-amber-50/40 p-4">
                  <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-amber-900">
                    Accès Administration (Router / Switch / Imprimante)
                  </h3>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className={labelClass}>Identifiant Admin (User)</label>
                      <input
                        placeholder="e.g. admin"
                        {...register("adminLogin")}
                        className={inputClass}
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className={labelClass}>Mot de passe Admin</label>
                        <button
                          type="button"
                          onClick={() => setShowAdminPass(!showAdminPass)}
                          className="flex items-center gap-1 text-xs text-amber-700 hover:underline"
                        >
                          {showAdminPass ? <EyeOff size={14} /> : <Eye size={14} />}
                          {showAdminPass ? "Masquer" : "Afficher"}
                        </button>
                      </div>
                      <input
                        type={showAdminPass ? "text" : "password"}
                        placeholder="Mot de passe du panneau d'administration"
                        {...register("adminPassword")}
                        className={inputClass}
                      />
                    </div>
                  </div>
                </div>

                {/* Note */}
                <div className="sm:col-span-2">
                  <label className={labelClass}>Note / Remarque</label>
                  <textarea
                    rows={3}
                    placeholder="Informations supplémentaires..."
                    {...register("note")}
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t pt-5">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={isSubmitting}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  Annuler
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-50"
                >
                  {isSubmitting
                    ? "Enregistrement..."
                    : isEdit
                    ? "Enregistrer"
                    : "Créer l'équipement"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}