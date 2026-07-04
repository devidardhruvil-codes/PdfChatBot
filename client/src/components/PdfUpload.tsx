// client/src/components/PdfUpload.tsx

import { useState } from "react";

type PdfUploadProps = {
  onUploaded: (documentId: string, fileName: string) => void;
};

export default function PdfUpload({ onUploaded }: PdfUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const uploadPdf = async () => {
    if (!file) {
      setMessage("Please select a PDF.");
      return;
    }

    const formData = new FormData();
    formData.append("pdf", file);

    try {
      setLoading(true);
      setMessage("Uploading and indexing document...");

      const response = await fetch("http://localhost:3001/api/documents", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Upload failed.");
      }

      onUploaded(data.documentId, data.fileName);
      setMessage("Upload complete. Preparing document for questions.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Something went wrong.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <input
        type="file"
        accept="application/pdf"
        onChange={(event) => {
          setFile(event.target.files?.[0] || null);
        }}
      />

      <button onClick={uploadPdf} disabled={!file || loading}>
        {loading ? "Uploading..." : "Upload PDF"}
      </button>

      {message && <p>{message}</p>}
    </div>
  );
}
