"use server"

import { Env } from "@/config/env"
import OpenAI from "openai"
import { updateChatHistory } from "./chat"

const openai = new OpenAI({ apiKey: Env.openaiKey })

export const complete = async (chatId: string, messages: any) => {
    const completion = await openai.chat.completions.create({
        messages,
        model: "gpt-3.5-turbo"
    })

    messages.push({
        role: "assistant",
        content: completion.choices[0].message.content
    })

    await updateChatHistory(chatId, messages)

    return messages
}
