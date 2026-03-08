'use client'

import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import styles from './chat.module.css'

export function ChatInterface() {
  const [input, setInput] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    const el = e.target
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }

  const SESSION_KEY = 'steph-chat-messages'

  const { messages, setMessages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/chat',
    }),
  })

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(SESSION_KEY)
      if (saved) setMessages(JSON.parse(saved))
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    if (messages.length > 0) {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(messages))
    }
  }, [messages])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, status])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return

    sendMessage({ text: input })
    setInput('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (!input.trim() || status === 'submitted' || status === 'streaming') return
      sendMessage({ text: input })
      setInput('')
      if (textareaRef.current) textareaRef.current.style.height = 'auto'
    }
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
            className={`${styles.message} ${message.role === 'user' ? styles.userMessage : styles.assistantMessage}`}
          >
            <div className={styles.messageContent}>
              <ReactMarkdown>
                {message.parts
                  ?.filter((part) => part.type === 'text')
                  .map((part) => part.text)
                  .join('')}
              </ReactMarkdown>
            </div>
          </div>
        ))}

        {(status === 'submitted' || status === 'streaming') && messages[messages.length - 1]?.role !== 'assistant' && (
          <div className={`${styles.message} ${styles.assistantMessage}`}>
            <div className={styles.messageContent}>
              <div className={styles.thinking}>
                <span className={styles.thinkingDot} />
                <span className={styles.thinkingDot} />
                <span className={styles.thinkingDot} />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSubmit} className={styles.inputForm}>
        <textarea
          ref={textareaRef}
          value={input}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder="Ask me anything..."
          disabled={status === 'streaming'}
          className={styles.input}
          rows={1}
        />
        <button
          type="submit"
          disabled={status === 'submitted' || status === 'streaming' || !input.trim()}
          className={styles.button}
        >
          Send
        </button>
      </form>
    </div>
  )
}
