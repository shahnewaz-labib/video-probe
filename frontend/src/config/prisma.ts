import { PrismaPg } from "@prisma/adapter-pg"

import { PrismaClient } from "@/generated/prisma/client"

// v7 requires a driver adapter — the client no longer opens its own connection,
// and the datasource url is gone from schema.prisma.
const prismaClientSingleton = () =>
    new PrismaClient({
        adapter: new PrismaPg({
            connectionString: process.env.DATABASE_URL
        })
    })

declare global {
    var prisma: undefined | ReturnType<typeof prismaClientSingleton>
}

export const prismaClient = globalThis.prisma ?? prismaClientSingleton()

if (process.env.NODE_ENV !== "production") globalThis.prisma = prismaClient
