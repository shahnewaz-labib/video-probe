"use server"

import { Env } from "@/config/env"
import OpenAI from "openai"
import { updateChatHistory } from "./chat"

const openai = new OpenAI({ apiKey: Env.openaiKey })

export type modelType = "gpt-3.5-turbo" | "gpt-4-vision-preview"

export const complete = async (
    chatId: string,
    messages: any,
    model: modelType = "gpt-3.5-turbo"
) => {
    const completion = await openai.chat.completions.create({
        messages,
        model
    })

    messages.push({
        role: "assistant",
        content: completion.choices[0].message.content
    })

    await updateChatHistory(chatId, messages.slice(-2))

    return messages
}
