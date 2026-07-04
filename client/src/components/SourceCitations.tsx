import type { SourceCitation } from "../types/document";

type SourceCitationsProps = {
  citations?: SourceCitation[];
};

export default function SourceCitations({
  citations = [],
}: SourceCitationsProps) {
  if (citations.length === 0) {
    return null;
  }

  return (
    <section className="source-citations">
      <h4>Sources</h4>

      <ul>
        {citations.map((citation, index) => (
          <li key={`${citation.fileId ?? "file"}-${index}`}>
            <strong>
              {citation.fileName || `Document source ${index + 1}`}
            </strong>

            {citation.pageNumber ? (
              <span> — Page {citation.pageNumber}</span>
            ) : null}

            {citation.quote ? (
              <blockquote>“{citation.quote}”</blockquote>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
