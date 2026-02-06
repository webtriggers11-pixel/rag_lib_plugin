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
  /** When true, show as floating widget with open/hide CTA. Default true. */
  floating?: boolean
}

interface Message {
  role: 'user' | 'assistant'
  content: string
  isError?: boolean
}

export function ChatUI({
  apiKey,
  baseUrl,
  placeholder = 'Ask a question…',
  title = 'Product Q&A',
  className,
  floating = true,
}: ChatUIProps) {
  const [question, setQuestion] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isOpen, setIsOpen] = useState(!floating)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  const url = baseUrl.replace(/\/$/, '') + '/rag/query'

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  function handleCancel() {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    setLoading(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const q = question.trim()
    if (!q || loading) return
    setQuestion('')
    setMessages((prev) => [...prev, { role: 'user', content: q }])
    setLoading(true)
    setError(null)
    abortControllerRef.current = new AbortController()
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey,
        },
        body: JSON.stringify({ question: q }),
        signal: abortControllerRef.current.signal,
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(typeof data.detail === 'string' ? data.detail : data.detail?.message || res.statusText || 'Request failed')
      }
      setMessages((prev) => [...prev, { role: 'assistant', content: data.answer ?? '' }])
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return
      const msg = err instanceof Error ? err.message : 'Something went wrong'
      setError(msg)
      setMessages((prev) => [...prev, { role: 'assistant', content: msg, isError: true }])
    } finally {
      abortControllerRef.current = null
      setLoading(false)
    }
  }

  const panel = (
    <div className={className} style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>{title}</h2>
        {floating && (
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            style={styles.hideCta}
            aria-label="Hide chat"
          >
            ✕
          </button>
        )}
      </div>
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
        {loading ? (
          <button type="button" onClick={handleCancel} style={styles.cancelCta}>
            Cancel
          </button>
        ) : (
          <button type="submit" style={styles.sendCta} aria-label="Send">
            Send
          </button>
        )}
      </form>
      {error && <p style={styles.errorBar}>{error}</p>}
    </div>
  )

  if (floating) {
    return (
      <div style={styles.widgetWrap}>
        {isOpen && (
          <div style={styles.panelOverlay}>
            <div style={styles.panel}>{panel}</div>
          </div>
        )}
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          style={styles.openCta}
          aria-label="Open chat"
        >
          Chat
        </button>
      </div>
    )
  }

  return panel
}

const styles: Record<string, React.CSSProperties> = {
  widgetWrap: {
    position: 'fixed' as const,
    bottom: 24,
    right: 24,
    zIndex: 9999,
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  openCta: {
    width: 56,
    height: 56,
    borderRadius: '50%',
    border: 'none',
    backgroundColor: '#5c4d9c',
    color: '#fff',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    boxShadow: '0 4px 14px rgba(92, 77, 156, 0.4)',
  },
  panelOverlay: {
    position: 'fixed' as const,
    inset: 0,
    zIndex: 9998,
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
    padding: '24px 24px 80px 24px',
    boxSizing: 'border-box' as const,
  },
  panel: {
    width: '100%',
    maxWidth: 420,
    height: 'min(560px, 80vh)',
    borderRadius: 16,
    overflow: 'hidden',
    boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
    backgroundColor: '#fff',
  },
  container: {
    fontFamily: 'system-ui, -apple-system, sans-serif',
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    minHeight: 320,
    backgroundColor: '#fff',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexShrink: 0,
    padding: '14px 16px',
    borderBottom: '1px solid #eee',
  },
  title: {
    margin: 0,
    fontSize: '1.125rem',
    fontWeight: 600,
    color: '#1a1a1a',
  },
  hideCta: {
    width: 32,
    height: 32,
    borderRadius: 8,
    border: 'none',
    backgroundColor: 'transparent',
    color: '#666',
    fontSize: 18,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
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
    padding: '12px 16px',
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
    backgroundColor: '#5c4d9c',
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
    padding: '12px 16px',
    borderTop: '1px solid #eee',
  },
  input: {
    flex: 1,
    padding: '10px 16px',
    border: '1px solid #ddd',
    borderRadius: 24,
    fontSize: 14,
    outline: 'none',
  },
  sendCta: {
    padding: '10px 20px',
    backgroundColor: '#5c4d9c',
    color: '#fff',
    border: 'none',
    borderRadius: 24,
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 500,
    flexShrink: 0,
  },
  cancelCta: {
    padding: '10px 16px',
    backgroundColor: 'transparent',
    color: '#b71c1c',
    border: '1px solid #ef5350',
    borderRadius: 24,
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 500,
    flexShrink: 0,
  },
  errorBar: {
    margin: 0,
    padding: '8px 16px',
    backgroundColor: '#ffebee',
    color: '#b71c1c',
    fontSize: 12,
    borderRadius: 0,
    flexShrink: 0,
  },
}
