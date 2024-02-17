import { Env } from "@/config/env"
import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
    const data = await request.formData()
    const file: File | null = data.get("file") as unknown as File

    if (!file) {
        return NextResponse.json({ success: false })
    }

    await uploadToServer(file)

    return NextResponse.json({ success: true })
}

async function uploadToServer(file: File) {
    const formData = new FormData()
    formData.append("file", file)

    try {
        const response = await fetch(`${Env.backendUrl}/query/video`, {
            method: "POST",
            body: formData,
        })

        const responseJson = await response.json()

        if (response.ok) {
            console.log(
                "File uploaded successfully to external server:",
                responseJson.description,
            )
            return NextResponse.json({
                success: true,
                message: responseJson.description,
            })
        } else {
            console.error(
                "Failed to upload file to external server:",
                responseJson.message,
            )
            return NextResponse.json({
                success: false,
                message: responseJson.message,
            })
        }
    } catch (error) {
        console.error("Error in file upload to external server:", error)
        return NextResponse.json({
            success: false,
            message: "Error in file upload to external server",
        })
    }
}
