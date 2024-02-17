import { updateChatHistory, updateChatName } from "@/actions/chat"
import { Env } from "@/config/env"
import OpenAI from "openai"

const openai = new OpenAI({ apiKey: Env.openaiKey })

export async function POST(req: Request) {
    const data = await req.json()
    const { chatId, messages, model } = data

    const completion = await openai.chat.completions.create({
        messages,
        model
    })

    messages.push({
        role: "assistant",
        content: completion.choices[0].message.content
    })

    await updateChatHistory(chatId, messages.slice(-2))

    if (messages.length === 5) {
        await updateChatName(chatId, messages[3].content.slice(0, 10))
    }

    return Response.json(messages)
}
