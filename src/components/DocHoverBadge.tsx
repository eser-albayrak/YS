import { useState } from "react";
import type { DocFile } from "../types";

interface Props {
  doc: DocFile | undefined;
  label: string;
  onUpload: (file: File | null) => void;
  uploading?: boolean;
}

export default function DocHoverBadge({ doc, label, onUpload, uploading }: Props) {
  const [hover, setHover] = useState(false);

  return (
    <div className="doc-badge-wrap">
      <div className="doc-badge-row">
        {label && <span className="doc-badge-label">{label}</span>}
        {doc ? (
          <a
            className="doc-badge-filename"
            href={doc.url}
            target="_blank"
            rel="noreferrer"
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
            title="Önizlemek için üzerine gel, tam görüntülemek için tıkla"
          >
            📄 {doc.name}
          </a>
        ) : (
          <span className="muted">Yüklenmedi</span>
        )}
        <label className="btn-secondary btn-small doc-upload-btn">
          {uploading ? "Yükleniyor..." : doc ? "Değiştir" : "Yükle"}
          <input
            type="file"
            accept="application/pdf"
            disabled={uploading}
            style={{ display: "none" }}
            onChange={(e) => onUpload(e.target.files?.[0] || null)}
          />
        </label>
      </div>

      {hover && doc && (
        <div className="doc-hover-preview">
          <iframe src={doc.url} title={doc.name} />
        </div>
      )}
    </div>
  );
}
