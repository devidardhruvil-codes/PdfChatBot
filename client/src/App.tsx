import { useEffect, useState } from "react";
import PdfUpload from "./components/PdfUpload";
import ChatWindow from "./components/ChatWindow";
import { getDocumentStatus } from "./lib/api";
import type { DocumentStatus } from "./types/document";

type ActiveDocument = {
  documentId: string;
  fileName: string;
  status: DocumentStatus;
};

const POLL_INTERVAL_MS = 1500;

function getStatusMessage(status: DocumentStatus): string {
  switch (status) {
    case "indexing":
    case "in_progress":
      return "Your PDF is being prepared for questions. This usually takes a few seconds.";
    case "completed":
      return "Your PDF is ready. You can now ask questions.";
    case "failed":
      return "The PDF could not be indexed. Please try uploading it again.";
    case "cancelled":
      return "PDF indexing was cancelled. Please upload the file again.";
    default:
      return "Checking document status...";
  }
}

export default function App() {
  const [activeDocument, setActiveDocument] = useState<ActiveDocument | null>(
    null,
  );

  const [statusError, setStatusError] = useState("");

  const handleUploaded = (documentId: string, fileName: string) => {
    setStatusError("");

    setActiveDocument({
      documentId,
      fileName,
      status: "indexing",
    });
  };

  useEffect(() => {
    if (!activeDocument) {
      return;
    }

    if (
      activeDocument.status === "completed" ||
      activeDocument.status === "failed" ||
      activeDocument.status === "cancelled"
    ) {
      return;
    }

    let isCancelled = false;

    const checkDocumentStatus = async () => {
      try {
        const result = await getDocumentStatus(activeDocument.documentId);

        if (isCancelled) {
          return;
        }

        setActiveDocument((currentDocument) => {
          if (!currentDocument) {
            return null;
          }

          return {
            ...currentDocument,
            status: result.status,
          };
        });

        if (result.status === "failed" || result.status === "cancelled") {
          setStatusError(getStatusMessage(result.status));
        }
      } catch (error) {
        if (isCancelled) {
          return;
        }

        setStatusError(
          error instanceof Error
            ? error.message
            : "Could not check the document status.",
        );
      }
    };

    void checkDocumentStatus();

    const intervalId = window.setInterval(() => {
      void checkDocumentStatus();
    }, POLL_INTERVAL_MS);

    return () => {
      isCancelled = true;
      window.clearInterval(intervalId);
    };
  }, [activeDocument?.documentId, activeDocument?.status]);

  const isReady = activeDocument?.status === "completed";

  return (
    <main className="app-shell">
      <section className="app-card">
        <header className="app-header">
          <p className="eyebrow">DOCUMENT QUESTION ANSWERING</p>
          <h1>Chat with your PDF</h1>
          <p className="subtitle">
            Upload a PDF and ask questions based only on its contents.
          </p>
        </header>

        {!activeDocument ? (
          <PdfUpload onUploaded={handleUploaded} />
        ) : (
          <>
            <section className="document-status">
              <div>
                <p className="status-label">Uploaded document</p>
                <h2>{activeDocument.fileName}</h2>
              </div>

              <span className={`status-badge status-${activeDocument.status}`}>
                {activeDocument.status === "completed" ? "Ready" : "Preparing"}
              </span>
            </section>

            <p className="status-message">
              {getStatusMessage(activeDocument.status)}
            </p>

            {statusError ? (
              <p className="error-message">{statusError}</p>
            ) : null}

            {isReady ? (
              <ChatWindow documentId={activeDocument.documentId} />
            ) : (
              <div className="loading-panel">
                <span className="loading-dot" />
                <span>Preparing document search...</span>
              </div>
            )}
          </>
        )}
      </section>
    </main>
  );
}
