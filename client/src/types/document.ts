export type DocumentStatus =
  | "indexing"
  | "in_progress"
  | "completed"
  | "failed"
  | "cancelled"
  | "unknown";

export type DocumentUploadResponse = {
  documentId: string;
  fileName: string;
  status: DocumentStatus;
  message?: string;
};

export type DocumentStatusResponse = {
  documentId: string;
  fileName: string;
  status: DocumentStatus;
};

export type SourceCitation = {
  fileId?: string;
  fileName?: string;
  quote?: string;
  pageNumber?: number;
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: SourceCitation[];
};

export type ChatResponse = {
  answer: string;
  responseId: string;
  citations?: SourceCitation[];
  rawOutput?: unknown;
};

export type AskQuestionRequest = {
  documentId: string;
  question: string;
  previousResponseId?: string;
};
