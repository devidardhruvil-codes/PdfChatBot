// client/src/components/PdfUpload.tsx

import { useRef, useState } from "react";

type PdfUploadProps = {
  onUploaded: (documentId: string, fileName: string) => void;
};

type UploadState = "idle" | "dragging" | "uploading" | "error";

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function PdfUpload({ onUploaded }: PdfUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [state, setState] = useState<UploadState>("idle");
  const [progress, setProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isBusy = state === "uploading";

  const selectFile = (candidate: File | null) => {
    if (candidate && candidate.type !== "application/pdf") {
      setState("error");
      setErrorMessage("That file isn't a PDF. Choose a .pdf file instead.");
      return;
    }
    setErrorMessage("");
    setState("idle");
    setFile(candidate);
  };

  const uploadPdf = () => {
    if (!file || isBusy) return;

    const formData = new FormData();
    formData.append("pdf", file);

    setState("uploading");
    setProgress(0);
    setErrorMessage("");

    const xhr = new XMLHttpRequest();
    xhr.open("POST", "http://localhost:3001/api/documents");

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        setProgress(Math.round((event.loaded / event.total) * 100));
      }
    };

    xhr.onload = () => {
      let data: { documentId?: string; fileName?: string; error?: string } = {};
      try {
        data = JSON.parse(xhr.responseText);
      } catch {
        // fall through to generic error below
      }

      if (xhr.status >= 200 && xhr.status < 300 && data.documentId) {
        onUploaded(data.documentId, data.fileName ?? file.name);
        setState("idle");
        setProgress(100);
      } else {
        setState("error");
        setErrorMessage(data.error || "Upload failed. Try again.");
      }
    };

    xhr.onerror = () => {
      setState("error");
      setErrorMessage("Couldn't reach the server. Check your connection.");
    };

    xhr.send(formData);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (isBusy) return;
    selectFile(event.dataTransfer.files?.[0] ?? null);
  };

  return (
    <div className="pdf-upload">
      <div
        className={`pdf-dropzone ${
          state === "dragging" ? "pdf-dropzone-active" : ""
        } ${isBusy ? "pdf-dropzone-busy" : ""}`}
        onDragOver={(event) => {
          event.preventDefault();
          if (!isBusy) setState("dragging");
        }}
        onDragLeave={() => {
          if (!isBusy) setState(file ? "idle" : "idle");
        }}
        onDrop={handleDrop}
        onClick={() => !isBusy && fileInputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            fileInputRef.current?.click();
          }
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          className="pdf-dropzone-input"
          onChange={(event) => selectFile(event.target.files?.[0] ?? null)}
        />

        <div className="pdf-dropzone-icon" aria-hidden="true">
          PDF
        </div>

        <p className="pdf-dropzone-title">
          {file ? "Ready to index" : "Drop a PDF here"}
        </p>
        <p className="pdf-dropzone-subtitle">
          {file
            ? "Click Upload to start reading it"
            : "or click to browse your files"}
        </p>
      </div>

      {file && (
        <div className="pdf-file-chip">
          <div className="pdf-file-chip-info">
            <span className="pdf-file-chip-name">{file.name}</span>
            <span className="pdf-file-chip-size">
              {formatFileSize(file.size)}
            </span>
          </div>

          {!isBusy && (
            <button
              type="button"
              className="pdf-file-chip-remove"
              onClick={(event) => {
                event.stopPropagation();
                setFile(null);
                if (fileInputRef.current) fileInputRef.current.value = "";
              }}
              aria-label="Remove selected file"
            >
              ×
            </button>
          )}
        </div>
      )}

      {isBusy && (
        <div className="pdf-progress-track" aria-hidden="true">
          <div
            className="pdf-progress-fill"
            style={{ width: `${Math.max(progress, 6)}%` }}
          />
        </div>
      )}

      {state === "error" && errorMessage && (
        <p className="pdf-error-message">{errorMessage}</p>
      )}

      <button
        className="pdf-upload-button"
        onClick={uploadPdf}
        disabled={!file || isBusy}
      >
        {isBusy ? `Uploading… ${progress}%` : "Upload PDF"}
      </button>
    </div>
  );
}
