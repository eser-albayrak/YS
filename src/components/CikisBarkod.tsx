import { useCallback, useEffect, useRef, useState } from "react";
import { consumeLot, undoMovement } from "../lib/storage";
import { findMaterial } from "../lib/materialsStorage";
import { useQrCameraScanner } from "../hooks/useQrCameraScanner";
import type { StockLot } from "../types";
import { IATFFormFooter } from "./IATFFormFooter";

interface Props {
  lots: StockLot[];
  onChanged: () => void;
}

interface AutoResult {
  movementId: string;
  malzemeKodu: string;
  firma: string;
  lotNo: string;
  miktar: number;
  kalanSonrasi: number;
  undone: boolean;
}

const QR_REGION_ID = "qr-camera-region";

export default function CikisBarkod({ lots, onChanged }: Props) {
  const [scanValue, setScanValue] = useState("");
  const [kullanici, setKullanici] = useState("");

  const [manualLot, setManualLot] = useState<StockLot | null>(null);
  const [manualMiktar, setManualMiktar] = useState("");

  const [autoResult, setAutoResult] = useState<AutoResult | null>(null);

  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleScan = useCallback(
    async (raw: string) => {
      const lotNo = raw.split("|")[0].trim();
      const lot = lots.find((l) => l.lotNo === lotNo);
      setManualLot(null);
      setAutoResult(null);

      if (!lot) {
        setMessage({ type: "error", text: `Lot bulunamadı: ${lotNo}` });
        return;
      }
      if (lot.kalanMiktar <= 0) {
        setMessage({ type: "error", text: `Lot stokta yok (tükenmiş): ${lotNo}` });
        return;
      }

      setBusy(true);
      try {
        const material = await findMaterial(lot.malzemeKodu);
        const standart = material?.ambalajMiktariStandart;

        if (standart && standart > 0) {
          const miktar = Math.min(standart, lot.kalanMiktar);
          const { movement } = await consumeLot(lot.lotNo, miktar, kullanici || undefined);
          setAutoResult({
            movementId: movement.id,
            malzemeKodu: lot.malzemeKodu,
            firma: lot.firma,
            lotNo: lot.lotNo,
            miktar,
            kalanSonrasi: lot.kalanMiktar - miktar,
            undone: false,
          });
          setMessage(null);
          onChanged();
        } else {
          setManualLot(lot);
          setManualMiktar(String(lot.kalanMiktar));
          setMessage(null);
        }
      } catch (err: any) {
        setMessage({ type: "error", text: err.message });
      } finally {
        setBusy(false);
      }
    },
    [kullanici, lots, onChanged]
  );

  const {
    status: cameraStatus,
    errorMessage: cameraErrorMessage,
    start: startCamera,
    stop: stopCamera,
    retry: retryCamera,
    scanFile,
  } = useQrCameraScanner((decodedText) => {
    handleScan(decodedText);
    setCameraOpen(false);
  });

  const [fileScanning, setFileScanning] = useState(false);

  const toggleCamera = () => {
    if (cameraOpen) {
      stopCamera();
      setCameraOpen(false);
    } else {
      setCameraOpen(true);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileScanning(true);
    try {
      const decoded = await scanFile(file);
      if (decoded) {
        setMessage({ type: "ok", text: "QR Kod fotoğraftan başarıyla okundu." });
      }
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Görselden QR kod okunamadı." });
    } finally {
      setFileScanning(false);
      e.target.value = "";
    }
  };

  useEffect(() => {
    if (cameraOpen) {
      startCamera(QR_REGION_ID);
    } else {
      stopCamera();
    }
  }, [cameraOpen, startCamera, stopCamera]);

  function handleScanSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!scanValue.trim()) return;
    handleScan(scanValue);
    setScanValue("");
  }

  async function handleConfirmManual() {
    if (!manualLot) return;
    const m = parseFloat(manualMiktar.replace(",", "."));
    if (isNaN(m) || m <= 0) {
      setMessage({ type: "error", text: "Geçerli bir çıkış miktarı girin." });
      return;
    }
    setBusy(true);
    try {
      await consumeLot(manualLot.lotNo, m, kullanici || undefined);
      setMessage({
        type: "ok",
        text: `${m} kg düşüldü. Lot: ${manualLot.lotNo} (${manualLot.malzemeKodu})`,
      });
      setManualLot(null);
      setManualMiktar("");
      onChanged();
      inputRef.current?.focus();
    } catch (err: any) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setBusy(false);
    }
  }

  async function handleUndo() {
    if (!autoResult) return;
    try {
      await undoMovement(autoResult.movementId);
      setAutoResult({ ...autoResult, undone: true });
      onChanged();
    } catch (err: any) {
      setMessage({ type: "error", text: err.message });
    }
  }

  return (
    <div className="panel">
      <h2>Depo Çıkışı — Barkod / QR Okut</h2>
      <p className="muted">
        Standart ambalajı tanımlı malzemelerde okutulduğu an stoktan otomatik düşülür, onay
        beklemez. Yanlış okutursan aşağıdaki "Geri Al" ile anında düzeltebilirsin.
      </p>

      <div className="grid2" style={{ marginBottom: 16 }}>
        <label>
          Malzemeci (opsiyonel — tüm okutmalarda kullanılır)
          <input value={kullanici} onChange={(e) => setKullanici(e.target.value)} />
        </label>
      </div>

      <form onSubmit={handleScanSubmit} className="scan-row">
        <input
          ref={inputRef}
          autoFocus
          value={scanValue}
          onChange={(e) => setScanValue(e.target.value)}
          placeholder="USB okuyucu ile okutun veya lot no yazıp Enter'a basın"
          className="scan-input"
        />
      </form>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        <button
          type="button"
          className="btn-secondary"
          onClick={toggleCamera}
        >
          {cameraOpen ? "Kamerayı Kapat" : "📷 Telefon Kamerasıyla Tara"}
        </button>

        <label className="btn-secondary" style={{ cursor: "pointer", display: "inline-flex", alignItems: "center" }}>
          {fileScanning ? "⏳ Görsel Okunuyor..." : "📁 Fotoğraf / Görselden QR Oku"}
          <input
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={handleFileUpload}
            disabled={fileScanning}
          />
        </label>
      </div>

      {cameraOpen && (
        <div className="card" style={{ marginBottom: 16 }}>
          {cameraStatus === "starting" && (
            <p className="muted" style={{ padding: "12px 0" }}>⏳ Kamera başlatılıyor...</p>
          )}
          {cameraErrorMessage && (
            <div style={{ marginBottom: 12 }}>
              <p className="error" style={{ marginBottom: 8 }}>{cameraErrorMessage}</p>
              <button
                type="button"
                className="btn-small btn-secondary"
                onClick={() => retryCamera(QR_REGION_ID)}
              >
                🔄 Kamerayı Yeniden Dene
              </button>
            </div>
          )}
          <div id={QR_REGION_ID} className="qr-camera-region" style={{ minHeight: 250 }} />
          <p className="muted" style={{ marginTop: 8 }}>
            QR kodu kamera çerçevesinin içine getir, otomatik okunacaktır.
          </p>
        </div>
      )}

      {/* Görselden QR okuma için geçici div */}
      <div id="qr-file-temp-region" style={{ display: "none" }} />

      {message && (
        <p className={message.type === "ok" ? "success-text" : "error"}>{message.text}</p>
      )}

      {autoResult && (
        <div className={`card ${autoResult.undone ? "" : "card-auto-ok"}`}>
          <div className="card-header">
            <strong>{autoResult.malzemeKodu}</strong>
            <span className="muted">{autoResult.firma}</span>
          </div>
          <div className="card-meta">Lot: {autoResult.lotNo}</div>

          {autoResult.undone ? (
            <p className="muted">↩ Bu işlem geri alındı, stok eski haline döndürüldü.</p>
          ) : (
            <>
              <p className="success-text" style={{ fontSize: 15 }}>
                ✓ {autoResult.miktar} kg otomatik düşüldü — depoda kalan: {autoResult.kalanSonrasi} kg
              </p>
              <button className="btn-danger" onClick={handleUndo}>
                ↩ Geri Al
              </button>
            </>
          )}
        </div>
      )}

      {manualLot && (
        <div className="card">
          <div className="card-header">
            <strong>{manualLot.malzemeKodu}</strong>
            <span className="muted">{manualLot.firma}</span>
          </div>
          <div className="card-meta">
            Lot: <strong>{manualLot.lotNo}</strong> · Depoda kalan: {manualLot.kalanMiktar} kg
          </div>
          <p className="warning-text">
            Bu malzeme için standart ambalaj miktarı tanımlı değil — miktarı elle gir. (Malzeme
            Tanımları ekranından tanımlarsan bir sonraki okutmada otomatik düşer.)
          </p>
          <div className="grid2">
            <label>
              Çıkış Miktarı (KG)
              <input
                value={manualMiktar}
                onChange={(e) => setManualMiktar(e.target.value)}
                inputMode="decimal"
              />
            </label>
          </div>
          <button className="btn-primary" disabled={busy} onClick={handleConfirmManual}>
            Çıkışı Onayla — Stoktan Düş
          </button>
        </div>
      )}

      <IATFFormFooter formId="DEP_F05" defaultKodu="DEP/F05" defaultAdi="Üretime Hammadde Çıkış Formu" />
    </div>
  );
}

