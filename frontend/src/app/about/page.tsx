import Link from "next/link"

export default function About() {
    return (
        <div className="mx-auto max-w-2xl space-y-6 py-12">
            <div className="space-y-2">
                <h1 className="text-3xl font-semibold tracking-tight">
                    Video Probe
                </h1>
                <p className="text-muted-foreground">
                    Upload a video or paste a YouTube link, then ask about
                    anything said or shown in it.
                </p>
            </div>

            <div className="text-muted-foreground space-y-4 text-sm leading-relaxed">
                <p>
                    Answers cite moments as <code>MM:SS</code>. Click a
                    timestamp and the player jumps there.
                </p>
                <p>
                    Audio and visuals are read in a single pass, so you can ask
                    about something spoken, something on screen, or the
                    relationship between the two.
                </p>
                <p>
                    Uploaded files are kept on the server so you can play them
                    back, and expire from the model&rsquo;s side after 48 hours.
                    YouTube links are never downloaded — nothing is stored but
                    the URL, and those chats don&rsquo;t expire.
                </p>
            </div>

            <Link href="/" className="inline-block text-sm underline">
                Get started
            </Link>
        </div>
    )
}
