import { streamText, convertToModelMessages } from 'ai'
import { createClient } from '@/lib/supabase/server'
import { headers } from 'next/headers'
import { buildSystemPrompt } from '@/lib/prompts'
import { config } from '@/lib/config'

// Rate limiting helper
async function checkRateLimit(clientIp: string): Promise<boolean> {
  const supabase = await createClient()
  const now = new Date()
  const windowMs = config.rateLimit.windowSeconds * 1000
  const windowStart = new Date(now.getTime() - windowMs)

  // Get request count
  const { data: rateLimitData } = await supabase
    .from('rate_limits')
    .select('*')
    .eq('client_ip', clientIp)
    .gt('created_at', windowStart.toISOString())

  const requestCount = rateLimitData?.length || 0

  // Record this request
  await supabase.from('rate_limits').insert({
    client_ip: clientIp,
    created_at: now.toISOString(),
  })

  return requestCount < config.rateLimit.maxRequests
}

// Get client IP
async function getClientIp(_request: Request): Promise<string> {
  const headersList = await headers()
  return (
    headersList.get('x-forwarded-for')?.split(',')[0] || headersList.get('x-real-ip') || 'unknown'
  )
}

export async function POST(request: Request) {
  try {
    const clientIp = await getClientIp(request)

    // Check rate limit
    const isAllowed = await checkRateLimit(clientIp)
    if (!isAllowed) {
      return new Response('Rate limit exceeded', { status: 429 })
    }

    const { messages } = await request.json()
    const supabase = await createClient()

    // Get or create conversation
    let conversationId: string
    const { data: existingConvs } = await supabase
      .from('conversations')
      .select('id, created_at')
      .eq('client_ip', clientIp)
      .order('created_at', { ascending: false })
      .limit(1)

    const now = new Date()

    if (existingConvs && existingConvs.length > 0) {
      const lastConv = existingConvs[0]
      const convTime = new Date(lastConv.created_at)
      // Use existing conversation if within timeout window
      if (now.getTime() - convTime.getTime() < config.conversationTimeoutMs) {
        conversationId = lastConv.id
      } else {
        // Create new conversation
        const { data: newConv } = await supabase
          .from('conversations')
          .insert({
            client_ip: clientIp,
            created_at: now.toISOString(),
          })
          .select('id')
        conversationId = newConv?.[0]?.id || crypto.randomUUID()
      }
    } else {
      // Create new conversation
      const { data: newConv } = await supabase
        .from('conversations')
        .insert({
          client_ip: clientIp,
          created_at: now.toISOString(),
        })
        .select('id')
      conversationId = newConv?.[0]?.id || crypto.randomUUID()
    }

    // Log user message
    const userMessage = messages[messages.length - 1]
    if (userMessage?.text) {
      await supabase.from('messages').insert({
        conversation_id: conversationId,
        role: 'user',
        content: userMessage.text,
        created_at: now.toISOString(),
      })
    }

    // Convert messages for AI SDK
    const convertedMessages = await convertToModelMessages(messages)

    // Build system prompt (could include Substack context in the future)
    const systemPrompt = buildSystemPrompt()

    // Stream response with logging
    const result = streamText({
      model: config.model,
      system: systemPrompt,
      messages: convertedMessages,
      temperature: config.temperature,
      maxTokens: config.maxTokens,
      onFinish: async ({ text }) => {
        // Log assistant message after stream completes
        try {
          await supabase.from('messages').insert({
            conversation_id: conversationId,
            role: 'assistant',
            content: text,
            created_at: new Date().toISOString(),
          })
        } catch (error) {
          console.error('Failed to log assistant message:', error)
        }
      },
    })

    return result.toUIMessageStreamResponse({
      originalMessages: messages,
    })
  } catch (error) {
    console.error('Chat API error:', error)
    return new Response('Internal server error', { status: 500 })
  }
}
