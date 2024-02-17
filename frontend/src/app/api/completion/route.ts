import { Env } from "@/config/env"
import OpenAI from "openai"

const openai = new OpenAI({ apiKey: Env.openaiKey })

export async function POST(req: Request) {
    const data = await req.json()
    const formData = await req.formData()
    const messages = data.messages
    console.log("dataaaaa", data)

    const completion = await openai.chat.completions.create({
        messages,
        model: "gpt-3.5-turbo"
    })

    messages.push({
        role: "assistant",
        content: completion.choices[0].message.content
    })

    return Response.json(messages)
}
