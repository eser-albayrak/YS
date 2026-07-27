import { api } from "./api";

export interface FormMetadata {
  id: string; // e.g. "SAT_F09"
  formAdi: string; // e.g. "Satın Alma Sipariş Formu"
  formKodu: string; // e.g. "SAT/F09"
  yururlukTarihi: string; // e.g. "08.03.2004"
  revTarihi: string; // e.g. "28.09.2022"
  revNo: string; // e.g. "03"
}

export const DEFAULT_FORM_METADATA_LIST: FormMetadata[] = [
  {
    id: "SAT_F09",
    formAdi: "Satın Alma Sipariş Formu",
    formKodu: "SAT/F09",
    yururlukTarihi: "08.03.2004",
    revTarihi: "28.09.2022",
    revNo: "03",
  },
  {
    id: "STK_F01",
    formAdi: "Hammadde Stok Takip Raporu",
    formKodu: "STK/F01",
    yururlukTarihi: "15.01.2010",
    revTarihi: "10.05.2023",
    revNo: "02",
  },
  {
    id: "GKT_F01",
    formAdi: "Giriş Kalite Kabul Fişi",
    formKodu: "GKT/F01",
    yururlukTarihi: "01.06.2012",
    revTarihi: "12.11.2023",
    revNo: "04",
  },
  {
    id: "MAL_F01",
    formAdi: "Malzeme Tanımları Formu",
    formKodu: "MAL/F01",
    yururlukTarihi: "05.04.2014",
    revTarihi: "18.01.2024",
    revNo: "01",
  },
  {
    id: "RAP_F01",
    formAdi: "Kalite Raporlama Formu",
    formKodu: "RAP/F01",
    yururlukTarihi: "20.02.2018",
    revTarihi: "15.08.2024",
    revNo: "02",
  },
];

const STORAGE_KEY = "gkys_form_metadata_v1";

function getLocalList(): FormMetadata[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return DEFAULT_FORM_METADATA_LIST;
}

function saveLocalList(list: FormMetadata[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {}
}

export async function loadAllFormMetadata(): Promise<FormMetadata[]> {
  try {
    const data = await api.get<FormMetadata[]>("/form-metadata");
    if (Array.isArray(data) && data.length > 0) {
      saveLocalList(data);
      return data;
    }
    return getLocalList();
  } catch {
    return getLocalList();
  }
}

export async function loadFormMetadataItem(
  formId: string,
  fallbackKodu?: string,
  fallbackAdi?: string
): Promise<FormMetadata> {
  const all = await loadAllFormMetadata();
  const found = all.find((f) => f.id === formId);
  if (found) return found;

  const defaultFound = DEFAULT_FORM_METADATA_LIST.find((f) => f.id === formId);
  if (defaultFound) return defaultFound;

  return {
    id: formId,
    formAdi: fallbackAdi || formId,
    formKodu: fallbackKodu || formId,
    yururlukTarihi: "01.01.2020",
    revTarihi: "01.01.2024",
    revNo: "01",
  };
}

export async function saveFormMetadataItem(item: FormMetadata): Promise<FormMetadata[]> {
  const current = getLocalList();
  const idx = current.findIndex((f) => f.id === item.id);
  let updated: FormMetadata[];
  if (idx !== -1) {
    updated = [...current];
    updated[idx] = item;
  } else {
    updated = [...current, item];
  }

  saveLocalList(updated);

  try {
    await api.put<FormMetadata[]>("/form-metadata", updated);
  } catch (err) {
    console.warn("Form metadata sunucuya kaydolamadı, yerel kaydedildi:", err);
  }

  return updated;
}

export async function deleteFormMetadataItem(formId: string): Promise<FormMetadata[]> {
  const current = getLocalList();
  const updated = current.filter((f) => f.id !== formId);
  saveLocalList(updated);

  try {
    await api.put<FormMetadata[]>("/form-metadata", updated);
  } catch (err) {
    console.warn("Form metadata sunucuda silinemedi, yerel silindi:", err);
  }

  return updated;
}

