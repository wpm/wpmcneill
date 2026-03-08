'use client'

import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { useState } from 'react'
import styles from './chat.module.css'

export function ChatInterface() {
  const [input, setInput] = useState('')
  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/chat',
    }),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return

    sendMessage({ text: input })
    setInput('')
  }

  return (
    <div className={styles.chatContainer}>
      <div className={styles.messagesContainer}>
        {messages.length === 0 && (
          <div className={styles.initialMessage}>
            <p>
              <strong>Hi. I'm Steph, Bill's helpful AI assistant.</strong>
            </p>
            <p>What is your question?</p>
          </div>
        )}

        {messages.map((message, idx) => (
          <div
            key={idx}
            className={`${styles.message} ${
              message.role === 'user' ? styles.userMessage : styles.assistantMessage
            }`}
          >
            <div className={styles.messageContent}>
              {message.parts
                ?.filter((part) => part.type === 'text')
                .map((part, i) => (
                  <div key={i}>{part.text}</div>
                ))}
            </div>
          </div>
        ))}

        {status === 'streaming' && (
          <div className={`${styles.message} ${styles.assistantMessage}`}>
            <div className={styles.messageContent}>
              <div className={styles.thinking}>Steph is thinking...</div>
            </div>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className={styles.inputForm}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask me anything..."
          disabled={status === 'streaming'}
          className={styles.input}
        />
        <button
          type="submit"
          disabled={status === 'streaming' || !input.trim()}
          className={styles.button}
        >
          Send
        </button>
      </form>
    </div>
  )
}
