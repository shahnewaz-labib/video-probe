"use client"

import {
    Dispatch,
    ReactNode,
    SetStateAction,
    createContext,
    useState
} from "react"

export type modelType = "gpt-3.5-turbo" | "gpt-4-vision-preview"

interface IAppContext {
    selectedModel: modelType | undefined
    setSelectedModel: Dispatch<SetStateAction<modelType | undefined>>
}
export const AppContext = createContext<IAppContext>({} as IAppContext)

export function AppContextProvider({ children }: { children: ReactNode }) {
    const [selectedModel, setSelectedModel] =
        useState<modelType>("gpt-3.5-turbo")
    return (
        <AppContext.Provider
            value={{
                selectedModel,
                //@ts-ignore
                setSelectedModel
            }}
        >
            {children}
        </AppContext.Provider>
    )
}
