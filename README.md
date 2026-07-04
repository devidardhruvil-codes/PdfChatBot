# PDF Chat App

A simple React and Node.js application where a user can:

- Upload a PDF
- Wait for the document to finish indexing
- Ask questions based only on that uploaded PDF
- Receive AI-generated answers
- Delete the uploaded document

## Folder Structure

```text
pdf-chat-app/
│
├── client/
│   ├── src/
│   │   ├── components/
│   │   │   ├── PdfUpload.tsx
│   │   │   ├── ChatWindow.tsx
│   │   │   └── SourceCitations.tsx
│   │   ├── lib/
│   │   │   └── api.ts
│   │   ├── types/
│   │   │   └── document.ts
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── index.css
│   │
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
│
├── server/
│   ├── src/
│   │   └── index.ts
│   ├── .env
│   ├── package.json
│   └── tsconfig.json
│
├── .gitignore
└── README.md
```
