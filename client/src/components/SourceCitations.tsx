// client/src/components/SourceCitations.tsx

import { useState } from "react";
import type { SourceCitation } from "../types/document";

type SourceCitationsProps = {
  citations?: SourceCitation[];
};

export default function SourceCitations({
  citations = [],
}: SourceCitationsProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  if (citations.length === 0) {
    return null;
  }

  return (
    <section className="source-citations" aria-label="Sources for this answer">
      <span className="source-citations-label">Sourced from</span>

      <div className="source-tabs">
        {citations.map((citation, index) => {
          const isOpen = openIndex === index;
          return (
            <button
              key={`${citation.fileId ?? "file"}-${index}`}
              type="button"
              className={`source-tab ${isOpen ? "source-tab-open" : ""}`}
              onClick={() => setOpenIndex(isOpen ? null : index)}
              aria-expanded={isOpen}
            >
              <span className="source-tab-index">{index + 1}</span>
              <span className="source-tab-name">
                {citation.fileName || `Source ${index + 1}`}
              </span>
              {citation.pageNumber ? (
                <span className="source-tab-page">p.{citation.pageNumber}</span>
              ) : null}
            </button>
          );
        })}
      </div>

      {openIndex !== null && citations[openIndex]?.quote && (
        <blockquote className="source-quote">
          {citations[openIndex].quote}
        </blockquote>
      )}
    </section>
  );
}
