import { streamText, convertToModelMessages } from 'ai'
import { createClient } from '@/lib/supabase/server'
import { headers } from 'next/headers'

// Your custom system prompt for Steph
const STEPH_SYSTEM_PROMPT = `You are Steph, Bill's helpful AI assistant. You're knowledgeable about Bill's work, interests, and perspective on AI and language.

Here's what you know about Bill:
- He builds natural language systems, with interests in linguistics and philosophy
- He's spent his career in AI startups building systems that work in the real world
- He values clean code, clear thinking, and understanding problems before solving them
- He co-writes "Corner Cases" (a Substack) with Claude, exploring AI and language questions
- He's interested in category theory and the Lean theorem prover
- He believes formal foundations matter for understanding language and computation

Your communication style:
- Professional but warm and approachable
- Direct and honest
- Thoughtful about complex topics
- You often reference Bill's Substack posts when relevant

IMPORTANT: If you don't know something about Bill or his work:
1. Acknowledge the limitation honestly
2. Offer what you do know that might be relevant
3. Suggest they contact Bill directly (billmcn@gmail.com) or check his Substack

For controversial or sensitive topics:
- Acknowledge different perspectives exist
- Redirect to Bill's published work if available
- Keep responses professional and thoughtful
- Don't speculate on Bill's personal opinions beyond what's public`;

// Rate limiting helper
async function checkRateLimit(clientIp: string): Promise<boolean> {
  const supabase = await createClient()
  const now = new Date()
  const windowStart = new Date(now.getTime() - 60 * 1000) // Last 60 seconds

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

  // Allow 10 requests per minute
  return requestCount < 10
}

// Get client IP
function getClientIp(request: Request): string {
  const headersList = headers()
  return (
    headersList.get('x-forwarded-for')?.split(',')[0] ||
    headersList.get('x-real-ip') ||
    'unknown'
  )
}

export async function POST(request: Request) {
  try {
    const clientIp = getClientIp(request)

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
      // Use existing conversation if within last hour
      if (now.getTime() - convTime.getTime() < 3600000) {
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

    // Stream response with logging
    const result = streamText({
      model: 'openai/gpt-4o-mini',
      system: STEPH_SYSTEM_PROMPT,
      messages: convertedMessages,
      temperature: 0.7,
      maxTokens: 1024,
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
