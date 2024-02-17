"use server"

import { Env } from "@/config/env"
import OpenAI from "openai"

const openai = new OpenAI({ apiKey: Env.openaiKey })

export const complete = async (messages: any) => {
    const completion = await openai.chat.completions.create({
        messages,
        model: "gpt-3.5-turbo"
    })

    messages.push({
        role: "assistant",
        content: completion.choices[0].message.content
    })

    return messages
}
