"use client"

import { Upload } from "lucide-react"
import React, { useState } from "react"

import { FileDropzoneComponent } from "./file-dropzone"
import { Button } from "./ui/button"

// Keys are what browsers report; the server normalises them to Gemini's
// vocabulary. See src/lib/mime.ts — .mkv is deliberately absent, Gemini
// cannot read Matroska at inference.
const allowedFileTypes = {
    "video/mp4": [".mp4"],
    "video/quicktime": [".mov"],
    "video/webm": [".webm"],
    "video/mpeg": [".mpeg", ".mpg"],
    "video/x-msvideo": [".avi"],
    "video/x-flv": [".flv"],
    "video/x-ms-wmv": [".wmv"],
    "video/3gpp": [".3gp"]
}

interface IProps extends React.HTMLAttributes<HTMLDivElement> {
    onFileSubmit: (file: File) => void
    disabled?: boolean
}

export default function FileUpload({
    onFileSubmit,
    disabled,
    ...divProps
}: IProps) {
    const [file, setFile] = useState<File | undefined>()

    return (
        <div {...divProps}>
            <FileDropzoneComponent
                allowedFileTypes={allowedFileTypes}
                maxFiles={1}
                allowMultiple={false}
                dragAcceptText="drop"
                dragRejectText="file type not supported"
                instructionText={file ? file.name : "upload a video file"}
                instructionSubtext="mp4, mov, webm, mpeg, avi, flv, wmv, 3gp"
                onDrop={(files) => setFile(files[0])}
                uploadIcon={<Upload />}
            />
            <Button
                disabled={!file || disabled}
                className="w-full"
                onClick={() => file && onFileSubmit(file)}
            >
                Upload
            </Button>
        </div>
    )
}
