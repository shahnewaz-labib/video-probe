-- CreateTable
CREATE TABLE "Chat" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "messages" JSONB[],

    CONSTRAINT "Chat_pkey" PRIMARY KEY ("id")
);
