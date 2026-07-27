import type { LabelData } from "../lib/PrintEngine";

function buildQRValue(label: LabelData): string {
  const { receipt, paketAgirligi } = label;
  return `${receipt.lotNo}|${receipt.malzemeKodu}|${paketAgirligi}`;
}

export async function generateQRSVG(label: LabelData): Promise<string> {
  const qrValue = buildQRValue(label);

  try {
    const QRCode = await import("qrcode");
    const svg = await QRCode.toString(qrValue, {
      type: "svg",
      width: 200,
      errorCorrectionLevel: "M",
      margin: 1,
    });
    return svg;
  } catch (error) {
    console.warn("QR kütüphanesi yüklü değil, placeholder gösteriliyor");
    return `<svg width="200" height="200" xmlns="http://www.w3.org/2000/svg">
      <rect width="200" height="200" fill="white" stroke="black" stroke-width="1"/>
      <text x="100" y="100" text-anchor="middle" dominant-baseline="middle" font-size="12">
        QR
      </text>
    </svg>`;
  }
}
