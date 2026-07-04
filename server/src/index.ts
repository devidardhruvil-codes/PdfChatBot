import "dotenv/config";
import cors from "cors";
import express from "express";
import multer from "multer";
import { GoogleGenAI } from "@google/genai";
import { randomUUID } from "crypto";

const app = express();

app.use(cors());
app.use(express.json());

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024, // 25 MB
  },
});

const geminiApiKey = process.env.GEMINI_API_KEY;

if (!geminiApiKey) {
  throw new Error(
    "GEMINI_API_KEY is missing. Add it to server/.env before starting the server.",
  );
}

const ai = new GoogleGenAI({
  apiKey: geminiApiKey,
});

// You can change this in server/.env later if needed.
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash-lite";

type AppDocumentStatus =
  | "indexing"
  | "in_progress"
  | "completed"
  | "failed"
  | "cancelled"
  | "unknown";

type DocumentRecord = {
  documentId: string;
  geminiFileName: string;
  geminiFileUri: string;
  mimeType: string;
  originalName: string;
  createdAt: string;
};

const documents = new Map<string, DocumentRecord>();

function mapGeminiFileState(state?: string): AppDocumentStatus {
  switch (String(state ?? "").toUpperCase()) {
    case "PROCESSING":
      return "in_progress";

    case "ACTIVE":
      return "completed";

    case "FAILED":
      return "failed";

    default:
      return "unknown";
  }
}

function buildDocumentQuestionPrompt(question: string): string {
  return `
You are a document question-answering assistant.

Rules:
1. Answer only using the uploaded PDF.
2. Do not use internet knowledge or outside knowledge.
3. Do not guess or invent information.
4. If the answer is not present in the PDF, say exactly:
   "I could not find that information in the uploaded document."
5. Keep the answer clear, direct, and easy to understand.

Question:
${question}
  `.trim();
}

app.post("/api/documents", upload.single("pdf"), async (req, res) => {
  try {
    const uploadedFile = req.file;

    if (!uploadedFile) {
      return res.status(400).json({
        error: "Please upload a PDF file.",
      });
    }

    if (uploadedFile.mimetype !== "application/pdf") {
      return res.status(400).json({
        error: "Only PDF files are allowed.",
      });
    }

    const pdfBlob = new Blob([new Uint8Array(uploadedFile.buffer)], {
      type: uploadedFile.mimetype,
    });

    const geminiFile = await ai.files.upload({
      file: pdfBlob,
      config: {
        displayName: uploadedFile.originalname,
        mimeType: uploadedFile.mimetype,
      },
    });

    if (!geminiFile.name || !geminiFile.uri) {
      throw new Error(
        "Gemini uploaded the file but did not return a file name or URI.",
      );
    }

    const documentId = randomUUID();

    const document: DocumentRecord = {
      documentId,
      geminiFileName: geminiFile.name,
      geminiFileUri: geminiFile.uri,
      mimeType: geminiFile.mimeType || uploadedFile.mimetype,
      originalName: uploadedFile.originalname,
      createdAt: new Date().toISOString(),
    };

    documents.set(documentId, document);

    console.log("PDF uploaded to Gemini:", {
      documentId: document.documentId,
      fileName: document.originalName,
      geminiFileName: document.geminiFileName,
      state: geminiFile.state,
    });

    return res.status(201).json({
      documentId: document.documentId,
      fileName: document.originalName,
      status: "indexing",
      message:
        "Document uploaded. Wait until processing is complete before asking questions.",
    });
  } catch (error) {
    console.error("Document upload failed:", error);

    return res.status(500).json({
      error: "Could not upload the PDF to Gemini.",
    });
  }
});

app.get("/api/documents/:documentId/status", async (req, res) => {
  try {
    const document = documents.get(req.params.documentId);

    if (!document) {
      return res.status(404).json({
        error: "Document not found.",
      });
    }

    const geminiFile = await ai.files.get({
      name: document.geminiFileName,
    });

    const status = mapGeminiFileState(geminiFile.state);

    console.log("PDF processing status:", {
      documentId: document.documentId,
      geminiFileName: document.geminiFileName,
      state: geminiFile.state,
      mappedStatus: status,
    });

    return res.json({
      documentId: document.documentId,
      fileName: document.originalName,
      status,
      providerState: geminiFile.state,
    });
  } catch (error) {
    console.error("Status check failed:", error);

    return res.status(500).json({
      error: "Could not check document status.",
    });
  }
});

app.post("/api/chat", async (req, res) => {
  try {
    const { documentId, question, previousResponseId } = req.body;

    if (
      typeof documentId !== "string" ||
      typeof question !== "string" ||
      !question.trim()
    ) {
      return res.status(400).json({
        error: "documentId and question are required.",
      });
    }

    const document = documents.get(documentId);

    if (!document) {
      return res.status(404).json({
        error:
          "Document not found. Upload the PDF again because the server may have restarted.",
      });
    }

    const geminiFile = await ai.files.get({
      name: document.geminiFileName,
    });

    const currentStatus = mapGeminiFileState(geminiFile.state);

    if (currentStatus === "in_progress" || currentStatus === "indexing") {
      return res.status(409).json({
        error:
          "The PDF is still being processed. Please wait until its status is Ready.",
      });
    }

    if (currentStatus === "failed") {
      return res.status(500).json({
        error:
          "Gemini could not process this PDF. Please upload a different PDF and try again.",
      });
    }

    if (currentStatus !== "completed") {
      return res.status(409).json({
        error:
          "The PDF is not ready for questions yet. Please upload the file again.",
      });
    }

    const prompt = buildDocumentQuestionPrompt(question.trim());

    const previousInteractionId =
      typeof previousResponseId === "string" &&
      previousResponseId.trim().length > 0
        ? previousResponseId.trim()
        : undefined;

    let interaction;

    if (previousInteractionId) {
      // For follow-up questions, Gemini continues the previous conversation.
      interaction = await ai.interactions.create({
        model: GEMINI_MODEL,
        previous_interaction_id: previousInteractionId,
        store: true,
        input: [
          {
            type: "text",
            text: prompt,
          },
        ],
      });
    } else {
      // First question: send the PDF reference and the question together.
      interaction = await ai.interactions.create({
        model: GEMINI_MODEL,
        store: true,
        input: [
          {
            type: "document",
            uri: document.geminiFileUri,
            mime_type: document.mimeType,
          },
          {
            type: "text",
            text: prompt,
          },
        ],
      });
    }

    if (!interaction.id) {
      throw new Error("Gemini did not return an interaction ID.");
    }

    const answer =
      interaction.output_text?.trim() ||
      "I could not find that information in the uploaded document.";

    return res.json({
      answer,
      responseId: interaction.id,
      citations: [],
    });
  } catch (error) {
    console.error("Chat request failed:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Could not answer the question.";

    return res.status(500).json({
      error: errorMessage,
    });
  }
});

app.delete("/api/documents/:documentId", async (req, res) => {
  const document = documents.get(req.params.documentId);

  if (!document) {
    return res.status(404).json({
      error: "Document not found.",
    });
  }

  try {
    await ai.files.delete({
      name: document.geminiFileName,
    });
  } catch (error) {
    // Gemini files expire automatically after 48 hours.
    // Even if Gemini no longer has the file, remove it from local memory.
    console.warn("Could not delete the Gemini file:", error);
  }

  documents.delete(document.documentId);

  return res.json({
    success: true,
    message: "Document deleted.",
  });
});

const port = Number(process.env.PORT || 3001);

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
  console.log(`Using Gemini model: ${GEMINI_MODEL}`);
});
