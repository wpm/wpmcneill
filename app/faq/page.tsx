import { ChatInterface } from './chat'

export const metadata = {
  title: 'FAQ - W.P. McNeill',
  description: 'Ask Steph questions about Bill and his work.',
}

export default function FAQPage() {
  return (
    <main style={{ padding: '1.8rem' }}>
      <h1 style={{ marginBottom: '0.25rem' }}>FAQ</h1>

      <div style={{ flex: 1, minHeight: 0 }}>
        <ChatInterface />
      </div>

      <div className="links">
        <a href="/">Home</a>
      </div>
    </main>
  )
}
