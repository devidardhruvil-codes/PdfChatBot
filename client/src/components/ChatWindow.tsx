// client/src/components/ChatWindow.tsx

import { useState } from "react";

type Message = {
  role: "user" | "assistant";
  content: string;
};

type ChatWindowProps = {
  documentId: string;
};

export default function ChatWindow({ documentId }: ChatWindowProps) {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [previousResponseId, setPreviousResponseId] = useState<string>();

  const askQuestion = async () => {
    const trimmedQuestion = question.trim();

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
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div>
        {messages.map((message, index) => (
          <div key={index}>
            <strong>{message.role === "user" ? "You" : "Document AI"}:</strong>
            <p>{message.content}</p>
          </div>
        ))}
      </div>

      <textarea
        value={question}
        onChange={(event) => setQuestion(event.target.value)}
        placeholder="Ask a question about the uploaded document..."
        rows={4}
      />

      <button onClick={askQuestion} disabled={loading}>
        {loading ? "Thinking..." : "Ask"}
      </button>
    </div>
  );
}
