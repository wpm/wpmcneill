import { ChatInterface } from './chat'

export const metadata = {
  title: 'FAQ - W.P. McNeill',
  description: 'Ask Steph questions about Bill and his work.',
}

export default function FAQPage() {
  return (
    <main style={{ height: 'calc(100vh - 12.8rem)', display: 'flex', flexDirection: 'column', padding: '1.8rem' }}>
      <h1 style={{ marginBottom: '0.25rem' }}>FAQ</h1>
      <p style={{ marginBottom: '1rem', fontStyle: 'italic', color: '#6b635b' }}>Ask Steph, Bill's AI assistant</p>

      <div style={{ flex: 1, minHeight: 0 }}>
        <ChatInterface />
      </div>

      <div className="links" style={{ marginTop: '1rem' }}>
        <a href="/">Home</a>
      </div>
    </main>
  )
}
