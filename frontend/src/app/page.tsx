import UploadForm from "@/components/upload-form"
import { Env } from "@/config/env"
import { listVideoModels } from "@/lib/models"

export default async function Home() {
    const models = await listVideoModels()
    const configured = Env.geminiModel
    const defaultModel = models.some((m) => m.id === configured)
        ? configured
        : models[0].id

    return <UploadForm models={models} defaultModel={defaultModel} />
}
