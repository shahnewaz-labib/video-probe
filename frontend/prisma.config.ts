import "dotenv/config" // v7 no longer loads .env automatically

import { defineConfig, env } from "prisma/config"

export default defineConfig({
    schema: "prisma/schema.prisma",
    migrations: {
        path: "prisma/migrations"
    },
    datasource: {
        url: env("DATABASE_URL")
    }
})
