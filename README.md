# rag-chat-ui

Chat UI component for your RAG backend. End users can ask questions; answers are based on the documents uploaded for your org (identified by API key).

## Flow

1. **Dashboard (admin)** creates an org and uploads PDFs for that org.
2. **Dashboard** creates an API key for that org (Org detail → Create API key). Copy the key once; it is not shown again.
3. **Your project** installs this lib and renders `ChatUI` with that API key and your backend base URL.
4. Users ask questions in the chat; the backend answers using that org’s documents.

## Install

```bash
npm install rag-chat-ui
# or from local path
npm install /path/to/chat-ui-lib
```

## Usage

```tsx
import { ChatUI } from 'rag-chat-ui'

function App() {
  return (
    <ChatUI
      apiKey="rag_xxxxxxxxxxxx"
      baseUrl="https://your-api.example.com"
      title="Product Q&A"
      placeholder="Ask a question…"
    />
  )
}
```

- **apiKey**: From your backend (dashboard → org → Create API key). Keep it secret; only use in your own app or server.
- **baseUrl**: Your RAG API base URL (no trailing slash). The component calls `POST {baseUrl}/rag/query` with header `X-API-Key`.

## Peer dependencies

- `react` (>=18)
- `react-dom` (>=18)

## Build (developers)

```bash
cd chat-ui-lib
npm install
npm run build
```
