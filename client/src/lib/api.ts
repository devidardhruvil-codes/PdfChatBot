import type {
  AskQuestionRequest,
  ChatResponse,
  DocumentStatusResponse,
  DocumentUploadResponse,
} from "../types/document";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") ||
  "http://localhost:3001";

async function getErrorMessage(response: Response): Promise<string> {
  try {
    const data = await response.json();

    if (typeof data?.error === "string") {
      return data.error;
    }

    if (typeof data?.message === "string") {
      return data.message;
    }

    return "Something went wrong.";
  } catch {
    return `Request failed with status ${response.status}.`;
  }
}

export async function uploadPdf(file: File): Promise<DocumentUploadResponse> {
  const formData = new FormData();
  formData.append("pdf", file);

  const response = await fetch(`${API_BASE_URL}/api/documents`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error(await getErrorMessage(response));
  }

  return response.json() as Promise<DocumentUploadResponse>;
}

export async function getDocumentStatus(
  documentId: string,
): Promise<DocumentStatusResponse> {
  const response = await fetch(
    `${API_BASE_URL}/api/documents/${encodeURIComponent(documentId)}/status`,
  );

  if (!response.ok) {
    throw new Error(await getErrorMessage(response));
  }

  return response.json() as Promise<DocumentStatusResponse>;
}

export async function askDocumentQuestion(
  request: AskQuestionRequest,
): Promise<ChatResponse> {
  const response = await fetch(`${API_BASE_URL}/api/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error(await getErrorMessage(response));
  }

  return response.json() as Promise<ChatResponse>;
}

export async function deleteDocument(documentId: string): Promise<void> {
  const response = await fetch(
    `${API_BASE_URL}/api/documents/${encodeURIComponent(documentId)}`,
    {
      method: "DELETE",
    },
  );

  if (!response.ok) {
    throw new Error(await getErrorMessage(response));
  }
}
