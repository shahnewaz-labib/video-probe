import FileUpload from "@/components/file-upload"

export default function Home() {
    return (
        <div className="px-32 py-8">
            <div>
                <FileUpload className="flex flex-col gap-y-4" />
            </div>
        </div>
    )
}
