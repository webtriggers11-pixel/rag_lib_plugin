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

const CSS = `
  @keyframes rag-pulse {
    0%, 100% { opacity: 0.4; transform: scale(1); }
    50% { opacity: 1; transform: scale(1.15); }
  }
  @keyframes rag-float {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-4px); }
  }
  @keyframes rag-glow {
    0%, 100% { box-shadow: 0 0 20px rgba(0, 212, 255, 0.4), 0 0 40px rgba(168, 85, 247, 0.2); }
    50% { box-shadow: 0 0 30px rgba(0, 212, 255, 0.6), 0 0 60px rgba(168, 85, 247, 0.3); }
  }
  @keyframes rag-shine {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }
  .rag-chat-open-btn:hover { animation: rag-float 1.5s ease-in-out infinite; }
  .rag-chat-open-btn { animation: rag-glow 2.5s ease-in-out infinite; }
  .rag-chat-dot { animation: rag-pulse 1.2s ease-in-out infinite; }
  .rag-chat-dot:nth-child(2) { animation-delay: 0.15s; }
  .rag-chat-dot:nth-child(3) { animation-delay: 0.3s; }
  .rag-chat-input::placeholder { color: rgba(255, 255, 255, 0.4); }
  .rag-chat-input:focus { box-shadow: 0 0 0 2px rgba(0, 212, 255, 0.5), 0 0 20px rgba(0, 212, 255, 0.2); }
  .rag-chat-send:hover { filter: brightness(1.15); transform: scale(1.02); }
  .rag-chat-cancel:hover { background: rgba(255, 82, 82, 0.2); }
  .rag-chat-hide:hover { background: rgba(255,255,255,0.1); }
  .rag-chat-panel-enter { animation: rag-panel-in 0.3s ease-out; }
  @keyframes rag-panel-in {
    from { opacity: 0; transform: scale(0.92) translateY(20px); }
    to { opacity: 1; transform: scale(1) translateY(0); }
  }
`

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
        <div style={styles.titleRow}>
          <span style={styles.titleIcon}>◆</span>
          <h2 style={styles.title}>{title}</h2>
        </div>
        {floating && (
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="rag-chat-hide"
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
              <div style={styles.emptyIcon}>💬</div>
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
                <span className="rag-chat-dot" style={styles.dot} />
                <span className="rag-chat-dot" style={styles.dot} />
                <span className="rag-chat-dot" style={styles.dot} />
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
          className="rag-chat-input"
          style={styles.input}
        />
        {loading ? (
          <button type="button" onClick={handleCancel} className="rag-chat-cancel" style={styles.cancelCta}>
            Cancel
          </button>
        ) : (
          <button type="submit" className="rag-chat-send" style={styles.sendCta} aria-label="Send">
            →
          </button>
        )}
      </form>
      {error && <p style={styles.errorBar}>{error}</p>}
    </div>
  )

  useEffect(() => {
    if (typeof document === 'undefined') return
    const id = 'rag-chat-ui-font'
    if (document.getElementById(id)) return
    const link = document.createElement('link')
    link.id = id
    link.rel = 'stylesheet'
    link.href = 'https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap'
    document.head.appendChild(link)
    return () => { link.remove() }
  }, [])

  if (floating) {
    return (
      <>
        <style>{CSS}</style>
        <div style={styles.widgetWrap}>
          {isOpen && (
            <div style={styles.panelOverlay}>
              <div className="rag-chat-panel-enter" style={styles.panel}>{panel}</div>
            </div>
          )}
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="rag-chat-open-btn"
            style={styles.openCta}
            aria-label="Open chat"
          >
            <span style={styles.openCtaIcon}>💬</span>
          </button>
        </div>
      </>
    )
  }

  return (
    <>
      <style>{CSS}</style>
      {panel}
    </>
  )
}

const styles: Record<string, React.CSSProperties> = {
  widgetWrap: {
    position: 'fixed' as const,
    bottom: 24,
    right: 24,
    zIndex: 9999,
    fontFamily: '"DM Sans", "Segoe UI", system-ui, sans-serif',
  },
  openCta: {
    width: 64,
    height: 64,
    borderRadius: '50%',
    border: '2px solid rgba(0, 212, 255, 0.5)',
    background: 'linear-gradient(135deg, #00d4ff 0%, #a855f7 50%, #ec4899 100%)',
    color: '#fff',
    fontSize: 28,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'transform 0.2s, filter 0.2s',
  },
  openCtaIcon: {
    filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))',
  },
  panelOverlay: {
    position: 'fixed' as const,
    inset: 0,
    zIndex: 9998,
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
    padding: '24px 24px 96px 24px',
    boxSizing: 'border-box' as const,
    background: 'radial-gradient(ellipse at bottom right, rgba(0,212,255,0.08) 0%, transparent 50%)',
  },
  panel: {
    width: '100%',
    maxWidth: 420,
    height: 'min(580px, 82vh)',
    borderRadius: 24,
    overflow: 'hidden',
    boxShadow: '0 25px 50px -12px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.06), 0 0 60px -15px rgba(168, 85, 247, 0.3)',
    background: 'linear-gradient(180deg, rgba(15, 15, 25, 0.95) 0%, rgba(10, 10, 18, 0.98) 100%)',
    backdropFilter: 'blur(20px)',
  },
  container: {
    fontFamily: '"DM Sans", "Segoe UI", system-ui, sans-serif',
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    minHeight: 320,
    background: 'linear-gradient(180deg, rgba(15, 15, 25, 0.98) 0%, rgba(10, 10, 18, 0.99) 100%)',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexShrink: 0,
    padding: '16px 20px',
    background: 'linear-gradient(90deg, rgba(0, 212, 255, 0.12) 0%, rgba(168, 85, 247, 0.08) 100%)',
    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
  },
  titleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  titleIcon: {
    color: '#00d4ff',
    fontSize: 14,
  },
  title: {
    margin: 0,
    fontSize: '1.2rem',
    fontWeight: 700,
    background: 'linear-gradient(90deg, #fff 0%, #a0a0b0 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  },
  hideCta: {
    width: 36,
    height: 36,
    borderRadius: 12,
    border: '1px solid rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    color: 'rgba(255,255,255,0.7)',
    fontSize: 18,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background 0.2s',
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
    padding: '16px 20px',
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '32px 20px',
    textAlign: 'center' as const,
    minHeight: 180,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
    opacity: 0.9,
  },
  emptyText: {
    margin: 0,
    fontSize: 17,
    fontWeight: 600,
    color: 'rgba(255, 255, 255, 0.95)',
  },
  emptySubtext: {
    margin: '8px 0 0 0',
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.5)',
    lineHeight: 1.5,
  },
  messageRow: {
    display: 'flex',
    width: '100%',
  },
  bubble: {
    maxWidth: '88%',
    padding: '12px 18px',
    borderRadius: 18,
    fontSize: 14,
    lineHeight: 1.5,
    wordBreak: 'break-word' as const,
  },
  bubbleUser: {
    background: 'linear-gradient(135deg, #00d4ff 0%, #a855f7 100%)',
    color: '#fff',
    borderBottomRightRadius: 6,
    boxShadow: '0 4px 20px rgba(0, 212, 255, 0.25)',
  },
  bubbleAssistant: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    color: 'rgba(255, 255, 255, 0.9)',
    borderBottomLeftRadius: 6,
    border: '1px solid rgba(255, 255, 255, 0.06)',
  },
  bubbleError: {
    backgroundColor: 'rgba(255, 82, 82, 0.15)',
    color: '#ff6b6b',
    borderBottomLeftRadius: 6,
    border: '1px solid rgba(255, 82, 82, 0.3)',
  },
  typingIndicator: {
    display: 'flex',
    gap: 6,
    padding: '14px 20px',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    backgroundColor: '#00d4ff',
  },
  form: {
    display: 'flex',
    gap: 10,
    flexShrink: 0,
    padding: '16px 20px',
    borderTop: '1px solid rgba(255, 255, 255, 0.08)',
    background: 'rgba(0, 0, 0, 0.2)',
  },
  input: {
    flex: 1,
    padding: '14px 20px',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    borderRadius: 16,
    fontSize: 14,
    outline: 'none',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    color: '#fff',
    transition: 'box-shadow 0.2s, border-color 0.2s',
  },
  sendCta: {
    width: 48,
    height: 48,
    padding: 0,
    background: 'linear-gradient(135deg, #00d4ff 0%, #a855f7 100%)',
    color: '#fff',
    border: 'none',
    borderRadius: 14,
    cursor: 'pointer',
    fontSize: 22,
    fontWeight: 600,
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'filter 0.2s, transform 0.2s',
  },
  cancelCta: {
    padding: '14px 18px',
    backgroundColor: 'transparent',
    color: '#ff5252',
    border: '1px solid rgba(255, 82, 82, 0.5)',
    borderRadius: 14,
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 600,
    flexShrink: 0,
    transition: 'background 0.2s',
  },
  errorBar: {
    margin: 0,
    padding: '10px 20px',
    background: 'rgba(255, 82, 82, 0.15)',
    color: '#ff6b6b',
    fontSize: 12,
    borderTop: '1px solid rgba(255, 82, 82, 0.2)',
    flexShrink: 0,
  },
}
