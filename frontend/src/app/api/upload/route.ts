import { Env } from "@/config/env"

export async function POST(request: Request) {
    const data = await request.formData()
    const file: File | null = data.get("file") as unknown as File

    if (!file) {
        return Response.json({ success: false })
    }

    const formData = new FormData()
    formData.append("file", file)

    try {
        const response = await fetch(`${Env.backendUrl}/query/audio`, {
            method: "POST",
            body: formData,
            headers: {
                "x-api-key": Env.backendApiKey
            }
        })

        const responseJson = await response.json()
        console.log("response", responseJson)

        if (response.ok) {
            return Response.json({
                success: true,
                messages: responseJson.messages
            })
        } else {
            return Response.json({
                success: false
            })
        }
    } catch (error) {
        return Response.json({
            success: false
        })
    }
}
