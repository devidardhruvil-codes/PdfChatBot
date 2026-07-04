// client/src/components/ChatWindow.tsx

import { useEffect, useRef, useState } from "react";
import SourceCitations from "./SourceCitations";
import type { SourceCitation } from "../types/document";

type Message = {
  role: "user" | "assistant";
  content: string;
  citations?: SourceCitation[];
  isError?: boolean;
};

type ChatWindowProps = {
  documentId: string;
};

const SUGGESTED_PROMPTS = [
  "Summarize this document in a few sentences",
  "What are the key takeaways?",
  "Are there any numbers or dates I should know?",
];

export default function ChatWindow({ documentId }: ChatWindowProps) {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [previousResponseId, setPreviousResponseId] = useState<string>();

  const scrollAnchorRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    scrollAnchorRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Auto-grow the textarea as the person types, capped by CSS max-height.
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [question]);

  const askQuestion = async (overrideQuestion?: string) => {
    const trimmedQuestion = (overrideQuestion ?? question).trim();

    if (!trimmedQuestion || loading) {
      return;
    }

    setMessages((current) => [
      ...current,
      { role: "user", content: trimmedQuestion },
    ]);

    setQuestion("");
    setLoading(true);

    try {
      const response = await fetch("http://localhost:3001/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          documentId,
          question: trimmedQuestion,
          previousResponseId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Could not get an answer.");
      }

      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: data.answer,
          citations: data.citations,
        },
      ]);

      setPreviousResponseId(data.responseId);
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content:
            error instanceof Error ? error.message : "Something went wrong.",
          isError: true,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      askQuestion();
    }
  };

  return (
    <div className="chat-window">
      <div className="chat-transcript">
        {messages.length === 0 && (
          <div className="chat-empty">
            <div>
              <div className="chat-empty-mark" aria-hidden="true">
                ?
              </div>
              <p className="chat-empty-title">Nothing asked yet</p>
            </div>
            <p className="chat-empty-subtitle">
              Ask anything about the document. Answers come with the exact
              passages they're drawn from.
            </p>
            <div className="chat-suggestions">
              {SUGGESTED_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  className="chat-suggestion-chip"
                  onClick={() => askQuestion(prompt)}
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((message, index) => (
          <div key={index} className={`chat-row chat-row-${message.role}`}>
            <div
              className="chat-avatar"
              aria-hidden="true"
              data-role={message.role}
            >
              {message.role === "user" ? "You" : "AI"}
            </div>

            <div className="chat-bubble-stack">
              <div
                className={`chat-bubble chat-bubble-${message.role} ${
                  message.isError ? "chat-bubble-error" : ""
                }`}
              >
                <p className="chat-bubble-text">{message.content}</p>
              </div>

              {message.role === "assistant" && !message.isError && (
                <SourceCitations citations={message.citations} />
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="chat-row chat-row-assistant">
            <div
              className="chat-avatar"
              data-role="assistant"
              aria-hidden="true"
            >
              AI
            </div>
            <div className="chat-bubble chat-bubble-assistant chat-bubble-typing">
              <span className="typing-dot" />
              <span className="typing-dot" />
              <span className="typing-dot" />
            </div>
          </div>
        )}

        <div ref={scrollAnchorRef} />
      </div>

      <div className="chat-composer">
        <textarea
          ref={textareaRef}
          className="chat-input"
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask a question about the uploaded document..."
          rows={1}
        />

        <button
          className="chat-send-button"
          onClick={() => askQuestion()}
          disabled={loading || !question.trim()}
        >
          {loading ? "Thinking…" : "Ask"}
        </button>
      </div>
      <p className="chat-hint">Enter to send · Shift + Enter for a new line</p>
    </div>
  );
}
