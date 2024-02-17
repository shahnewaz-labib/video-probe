"use client"

import {
    Dispatch,
    ReactNode,
    SetStateAction,
    createContext,
    useState
} from "react"

interface IAppContext {
    mode: "transcript-based" | "frame-based"
    setMode: Dispatch<SetStateAction<"transcript-based" | "frame-based">>
}

export const AppContext = createContext<IAppContext>({} as IAppContext)

export function AppContextProvider({ children }: { children: ReactNode }) {
    const [mode, setMode] = useState<IAppContext["mode"]>("transcript-based")
    return (
        <AppContext.Provider
            value={{
                mode,
                setMode
            }}
        >
            {children}
        </AppContext.Provider>
    )
}
