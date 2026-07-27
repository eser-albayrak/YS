import type { Receipt, LabelSettings } from "../types";
import { generateLabelHTML } from "./LabelTemplate";
import { generateQRSVG } from "../utils/qr";

export interface LabelData {
  receipt: Receipt;
  paketAgirligi: number;
  seq: number;
  toplamPaket: number;
}

export interface PrintEngineParams {
  labels: LabelData[];
  settings: LabelSettings;
}

function generatePageCSS(settings: LabelSettings): string {
  return `
    @page {
      size: ${settings.widthMm}mm ${settings.heightMm}mm;
      margin: 0;
      padding: 0;
    }
    html, body {
      width: ${settings.widthMm}mm;
      height: ${settings.heightMm}mm;
      margin: 0;
      padding: 0;
      font-family: Arial, sans-serif;
    }
    .label {
      width: 100%;
      height: 100%;
      page-break-after: always;
      page-break-inside: avoid;
      border: 1px solid black;
      padding: 2mm;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      font-size: ${settings.fontSizePt}pt;
    }
    .label-title {
      font-weight: bold;
      font-size: ${settings.fontSizePt + 2}pt;
      text-align: center;
      border-bottom: 1px solid black;
      padding-bottom: 1mm;
      margin-bottom: 1mm;
    }
    .label-content {
      flex: 1;
      overflow: hidden;
      font-size: ${settings.fontSizePt - 1}pt;
    }
    .label-row {
      display: flex;
      margin-bottom: 0.5mm;
      line-height: 1.2;
    }
    .label-key {
      font-weight: bold;
      width: 35mm;
      flex-shrink: 0;
    }
    .label-value {
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .label-qr {
      display: flex;
      justify-content: center;
      align-items: center;
      margin: 1mm 0;
      min-height: 24mm;
    }
    .label-qr svg {
      max-width: ${settings.qrSizeMm}mm;
      max-height: 24mm;
    }
    .label-footer {
      font-size: ${settings.fontSizePt - 2}pt;
      text-align: center;
      border-top: 1px solid black;
      padding-top: 1mm;
    }
  `;
}

export const PrintEngine = {
  async print(params: PrintEngineParams): Promise<void> {
    const { labels, settings } = params;

    if (!labels || labels.length === 0) {
      alert("Yazdırılacak etiket yok");
      return;
    }

    const popup = window.open("", "_blank", "width=800,height=900");
    if (!popup) {
      alert("Popup açılamadı. Popup blocker'ı kontrol edin.");
      return;
    }

    try {
      let htmlContent = "";

      for (let i = 0; i < labels.length; i++) {
        const label = labels[i];
        const qrSVG = await generateQRSVG(label);
        const html = await generateLabelHTML({
          receipt: label.receipt,
          paketAgirligi: label.paketAgirligi,
          seq: label.seq,
          toplamPaket: label.toplamPaket,
          settings,
          qrSVG,
        });
        htmlContent += html;
      }

      const css = generatePageCSS(settings);

      const fullHTML = `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="utf-8">
  <style>${css}</style>
</head>
<body>
  ${htmlContent}
  <script>
    window.print();
    window.onafterprint = () => window.close();
  </script>
</body>
</html>`;

      popup.document.write(fullHTML);
      popup.document.close();
    } catch (err) {
      popup.close();
      console.error("Print error:", err);
      alert("Yazdırma hatası: " + String(err));
    }
  },
};
