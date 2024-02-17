import { ReactNode } from "react"
import { Accept, useDropzone } from "react-dropzone"

interface FileDropzoneComponentProps {
    allowedFileTypes: Accept
    onDrop: (files: File[]) => void
    allowMultiple: boolean
    maxFiles: number
    uploadIcon: ReactNode
    instructionText: string
    instructionSubtext?: string
    dragAcceptText: string
    dragRejectText: string
}

export const FileDropzoneComponent: React.FC<FileDropzoneComponentProps> = (
    props: FileDropzoneComponentProps,
) => {
    const {
        getRootProps,
        getInputProps,
        isDragActive,
        isDragAccept,
        isDragReject,
    } = useDropzone({
        onDrop: props.onDrop,
        maxFiles: props.maxFiles,
        accept: props.allowedFileTypes,
        multiple: props.allowMultiple,
        useFsAccessApi: false, // Bug Fix: https://github.com/react-dropzone/react-dropzone/issues/1190
    })

    const dropzoneBackgroundColor = isDragActive
        ? isDragAccept
            ? "bg-green-100"
            : "bg-red-100"
        : "bg-background"

    const dropZoneTextColor = isDragActive ? "text-gray-600" : "text-primary"
    const dropZoneborderColor = isDragActive
        ? "border-gray-500"
        : "border-gray-300"

    return (
        <div
            className={`${dropzoneBackgroundColor} ${dropZoneTextColor} ${dropZoneborderColor}
                    flex h-64 min-h-full w-full cursor-pointer items-center justify-center
                    rounded-lg border-2 border-dashed hover:border-gray-500 hover:text-primary/80`}
            {...getRootProps()}
        >
            <input {...getInputProps()} />

            <div className="flex flex-col items-center gap-2 p-6 text-center">
                {props.uploadIcon}
                {!isDragActive && <p>{props.instructionText}</p>}
                {!isDragActive &&
                    (props.instructionSubtext ?? (
                        <p className="text-xs">{props.instructionSubtext}</p>
                    ))}
                {isDragAccept && <p>{props.dragAcceptText}</p>}
                {isDragReject && <p>{props.dragRejectText}</p>}
            </div>
        </div>
    )
}
