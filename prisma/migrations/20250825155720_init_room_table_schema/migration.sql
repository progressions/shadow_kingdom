-- CreateTable
CREATE TABLE "games" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "current_room_id" INTEGER,
    "max_rooms_per_game" INTEGER NOT NULL DEFAULT 100,
    "room_count" INTEGER NOT NULL DEFAULT 0,
    "generation_cooldown_ms" INTEGER NOT NULL DEFAULT 10000,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "games_current_room_id_fkey" FOREIGN KEY ("current_room_id") REFERENCES "rooms" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "rooms" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "game_id" INTEGER NOT NULL,
    "region_id" INTEGER,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "extended_description" TEXT,
    "visited" BOOLEAN NOT NULL DEFAULT false,
    "locked" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "rooms_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "games" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "rooms_region_id_fkey" FOREIGN KEY ("region_id") REFERENCES "regions" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "regions" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "game_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "theme" TEXT NOT NULL,
    "description" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "regions_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "games" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "connections" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "game_id" INTEGER NOT NULL,
    "from_room_id" INTEGER NOT NULL,
    "to_room_id" INTEGER,
    "direction" TEXT NOT NULL,
    "description" TEXT,
    "locked" BOOLEAN NOT NULL DEFAULT false,
    "required_key" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "connections_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "games" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "connections_from_room_id_fkey" FOREIGN KEY ("from_room_id") REFERENCES "rooms" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "connections_to_room_id_fkey" FOREIGN KEY ("to_room_id") REFERENCES "rooms" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "rooms_game_id_idx" ON "rooms"("game_id");

-- CreateIndex
CREATE INDEX "rooms_region_id_idx" ON "rooms"("region_id");

-- CreateIndex
CREATE INDEX "rooms_game_id_region_id_idx" ON "rooms"("game_id", "region_id");

-- CreateIndex
CREATE INDEX "regions_game_id_idx" ON "regions"("game_id");

-- CreateIndex
CREATE INDEX "regions_game_id_theme_idx" ON "regions"("game_id", "theme");

-- CreateIndex
CREATE INDEX "connections_game_id_idx" ON "connections"("game_id");

-- CreateIndex
CREATE INDEX "connections_from_room_id_idx" ON "connections"("from_room_id");

-- CreateIndex
CREATE INDEX "connections_to_room_id_idx" ON "connections"("to_room_id");

-- CreateIndex
CREATE INDEX "connections_game_id_from_room_id_idx" ON "connections"("game_id", "from_room_id");

-- CreateIndex
CREATE UNIQUE INDEX "connections_from_room_id_direction_key" ON "connections"("from_room_id", "direction");
