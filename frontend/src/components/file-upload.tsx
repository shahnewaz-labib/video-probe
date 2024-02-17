"use client"

import { Upload } from "lucide-react"
import React, { useState } from "react"
import { FileDropzoneComponent } from "./file-dropzone"
import { Button } from "./ui/button"

const allowedFileTypes = {
    "video/mp4": [".mp4"],
    "video/x-matroska": [".mkv"],
}

interface IProps extends React.HTMLAttributes<HTMLDivElement> {
    onFileSubmit: (file: File) => void
}

export default function FileUpload(props: IProps) {
    const [file, setFile] = useState<File | undefined>()

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
            {file && (
                <Button
                    className="w-full"
                    onClick={() => props.onFileSubmit(file)}
                >
                    Upload
                </Button>
            )}
        </div>
    )
}
