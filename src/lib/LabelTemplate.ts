import type { Receipt, LabelSettings } from "../types";

export interface LabelTemplateParams {
  receipt: Receipt;
  paketAgirligi: number;
  seq: number;
  toplamPaket: number;
  settings: LabelSettings;
  qrSVG: string;
}

function safe(text: string | null | undefined): string {
  if (!text) return "—";
  return String(text).replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function formatDate(date: string): string {
  try {
    return new Date(date).toLocaleDateString("tr-TR");
  } catch {
    return safe(date);
  }
}

export async function generateLabelHTML(
  params: LabelTemplateParams
): Promise<string> {
  const {
    receipt,
    paketAgirligi,
    seq,
    toplamPaket,
    settings,
    qrSVG,
  } = params;

  return `
<div class="label">
  <div class="label-title">${safe(settings.headerText)}</div>
  
  <div class="label-content">
    <div class="label-row">
      <div class="label-key">Firma:</div>
      <div class="label-value">${safe(receipt.firma)}</div>
    </div>
    
    <div class="label-row">
      <div class="label-key">Malzeme Kodu:</div>
      <div class="label-value">${safe(receipt.malzemeKodu)}</div>
    </div>
    
    <div class="label-row">
      <div class="label-key">LOT:</div>
      <div class="label-value">${safe(receipt.lotNo)}</div>
    </div>
    
    <div class="label-row">
      <div class="label-key">Ambalaj (KG):</div>
      <div class="label-value">${paketAgirligi.toFixed(2)}</div>
    </div>
    
    ${toplamPaket > 1 ? `
    <div class="label-row">
      <div class="label-key">Paket:</div>
      <div class="label-value">${seq}/${toplamPaket}</div>
    </div>
    ` : ""}
    
    <div class="label-row">
      <div class="label-key">Giriş Tarihi:</div>
      <div class="label-value">${formatDate(receipt.girisTarihi)}</div>
    </div>
    
    <div class="label-row">
      <div class="label-key">Sipariş No:</div>
      <div class="label-value">${safe(receipt.siparisNo) || "—"}</div>
    </div>
  </div>
  
  <div class="label-qr">
    ${qrSVG}
  </div>
  
  <div class="label-footer">${safe(settings.footerText)}</div>
</div>
`;
}
