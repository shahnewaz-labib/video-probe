"use client"

import { Upload } from "lucide-react"
import React, { useState } from "react"
import { FileDropzoneComponent } from "./file-dropzone"
import { Button } from "./ui/button"

const allowedFileTypes = {
    "video/mp4": [".mp4"],
    "video/x-matroska": [".mkv"],
}

export default function FileUpload({
    ...props
}: React.HTMLAttributes<HTMLDivElement>) {
    const [file, setFile] = useState<File>()

    const onSubmit = async () => {
        if (!file) return

        try {
            const data = new FormData()
            data.set("file", file)

            const res = await fetch("/api/upload", {
                method: "POST",
                body: data,
            })
            if (!res.ok) throw new Error(await res.text())
        } catch (e: any) {
            console.error(e)
        }
    }

    return (
        <div {...props}>
            <FileDropzoneComponent
                allowedFileTypes={allowedFileTypes}
                maxFiles={1}
                allowMultiple={false}
                dragAcceptText="drop"
                dragRejectText="file type not supported"
                instructionText="upload mp4/mkv file"
                instructionSubtext=""
                onDrop={(files) => {
                    setFile(files[0])
                }}
                uploadIcon={<Upload />}
            />
            <Button className="w-full" onClick={onSubmit}>
                Upload
            </Button>
        </div>
    )
}
