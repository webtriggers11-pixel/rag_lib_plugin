import React, { useEffect, useRef, useState } from 'react'

export interface ChatUIProps {
  /** API key from your backend (dashboard: create org → create API key). */
  apiKey: string
  /** Base URL of your RAG API (e.g. https://api.example.com). No trailing slash. */
  baseUrl: string
  /** Optional placeholder for the question input. */
  placeholder?: string
  /** Optional title above the chat. */
  title?: string
  /** Optional CSS class for the container. */
  className?: string
}

interface Message {
  role: 'user' | 'assistant'
  content: string
  isError?: boolean
}

export function ChatUI({ apiKey, baseUrl, placeholder = 'Ask a question…', title = 'Chat', className }: ChatUIProps) {
  const [question, setQuestion] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const url = baseUrl.replace(/\/$/, '') + '/rag/query'

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const q = question.trim()
    if (!q || loading) return
    setQuestion('')
    setMessages((prev) => [...prev, { role: 'user', content: q }])
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey,
        },
        body: JSON.stringify({ question: q }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(typeof data.detail === 'string' ? data.detail : data.detail?.message || res.statusText || 'Request failed')
      }
      setMessages((prev) => [...prev, { role: 'assistant', content: data.answer ?? '' }])
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Something went wrong'
      setError(msg)
      setMessages((prev) => [...prev, { role: 'assistant', content: msg, isError: true }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={className} style={styles.container}>
      {title && <h2 style={styles.title}>{title}</h2>}
      <div style={styles.messagesWrap}>
        <div style={styles.messages}>
          {messages.length === 0 && !loading && (
            <div style={styles.emptyState}>
              <p style={styles.emptyText}>Ask questions about your docs.</p>
              <p style={styles.emptySubtext}>Answers are based on the documents uploaded for your organization.</p>
            </div>
          )}
          {messages.map((m, i) => (
            <div
              key={i}
              style={{
                ...styles.messageRow,
                justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start',
              }}
            >
              <div
                style={{
                  ...styles.bubble,
                  ...(m.role === 'user' ? styles.bubbleUser : m.isError ? styles.bubbleError : styles.bubbleAssistant),
                }}
              >
                {m.content}
              </div>
            </div>
          ))}
          {loading && (
            <div style={{ ...styles.messageRow, justifyContent: 'flex-start' }}>
              <div style={{ ...styles.bubble, ...styles.bubbleAssistant, ...styles.typingIndicator }}>
                <span style={styles.dot}>.</span>
                <span style={styles.dot}>.</span>
                <span style={styles.dot}>.</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>
      <form onSubmit={handleSubmit} style={styles.form}>
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder={placeholder}
          disabled={loading}
          style={styles.input}
        />
        <button type="submit" disabled={loading} style={styles.button}>
          Send
        </button>
      </form>
      {error && <p style={styles.errorBar}>{error}</p>}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    fontFamily: 'system-ui, -apple-system, sans-serif',
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    minHeight: 320,
    backgroundColor: '#fff',
  },
  title: {
    margin: '0 0 12px 0',
    fontSize: '1.125rem',
    fontWeight: 600,
    color: '#1a1a1a',
    flexShrink: 0,
  },
  messagesWrap: {
    flex: 1,
    minHeight: 200,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  messages: {
    flex: 1,
    overflowY: 'auto',
    padding: '12px 0',
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px 16px',
    textAlign: 'center' as const,
    minHeight: 160,
  },
  emptyText: {
    margin: 0,
    fontSize: 15,
    fontWeight: 500,
    color: '#333',
  },
  emptySubtext: {
    margin: '4px 0 0 0',
    fontSize: 13,
    color: '#666',
  },
  messageRow: {
    display: 'flex',
    width: '100%',
  },
  bubble: {
    maxWidth: '85%',
    padding: '10px 14px',
    borderRadius: 16,
    fontSize: 14,
    lineHeight: 1.45,
    wordBreak: 'break-word' as const,
  },
  bubbleUser: {
    backgroundColor: '#1976d2',
    color: '#fff',
    borderBottomRightRadius: 4,
  },
  bubbleAssistant: {
    backgroundColor: '#f0f0f0',
    color: '#1a1a1a',
    borderBottomLeftRadius: 4,
  },
  bubbleError: {
    backgroundColor: '#ffebee',
    color: '#b71c1c',
    borderBottomLeftRadius: 4,
  },
  typingIndicator: {
    display: 'flex',
    gap: 4,
    padding: '12px 16px',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: '50%',
    backgroundColor: '#888',
  },
  form: {
    display: 'flex',
    gap: 8,
    flexShrink: 0,
    paddingTop: 12,
    borderTop: '1px solid #eee',
  },
  input: {
    flex: 1,
    padding: '10px 14px',
    border: '1px solid #ddd',
    borderRadius: 20,
    fontSize: 14,
    outline: 'none',
  },
  button: {
    padding: '10px 20px',
    backgroundColor: '#1976d2',
    color: '#fff',
    border: 'none',
    borderRadius: 20,
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 500,
    flexShrink: 0,
  },
  errorBar: {
    margin: '8px 0 0 0',
    padding: 8,
    backgroundColor: '#ffebee',
    color: '#b71c1c',
    fontSize: 12,
    borderRadius: 8,
    flexShrink: 0,
  },
}
