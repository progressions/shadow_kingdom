-- CreateTable
CREATE TABLE "games" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_played_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "rooms" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "game_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "region_id" INTEGER,
    "region_distance" INTEGER,
    CONSTRAINT "rooms_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "games" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "rooms_region_id_fkey" FOREIGN KEY ("region_id") REFERENCES "regions" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "connections" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "game_id" INTEGER NOT NULL,
    "from_room_id" INTEGER NOT NULL,
    "to_room_id" INTEGER,
    "direction" TEXT,
    "name" TEXT NOT NULL,
    "processing" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "connections_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "games" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "connections_from_room_id_fkey" FOREIGN KEY ("from_room_id") REFERENCES "rooms" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "connections_to_room_id_fkey" FOREIGN KEY ("to_room_id") REFERENCES "rooms" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "game_state" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "game_id" INTEGER NOT NULL,
    "current_room_id" INTEGER NOT NULL,
    "player_name" TEXT,
    CONSTRAINT "game_state_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "games" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "game_state_current_room_id_fkey" FOREIGN KEY ("current_room_id") REFERENCES "rooms" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "regions" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "game_id" INTEGER NOT NULL,
    "name" TEXT,
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "center_room_id" INTEGER,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "regions_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "games" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "games_name_key" ON "games"("name");

-- CreateIndex
CREATE INDEX "rooms_game_id_idx" ON "rooms"("game_id");

-- CreateIndex
CREATE INDEX "rooms_region_id_idx" ON "rooms"("region_id");

-- CreateIndex
CREATE INDEX "connections_game_id_idx" ON "connections"("game_id");

-- CreateIndex
CREATE INDEX "connections_from_room_id_direction_name_idx" ON "connections"("from_room_id", "direction", "name");

-- CreateIndex
CREATE INDEX "connections_game_id_from_room_id_idx" ON "connections"("game_id", "from_room_id");

-- CreateIndex
CREATE INDEX "connections_game_id_from_room_id_processing_idx" ON "connections"("game_id", "from_room_id", "processing");

-- CreateIndex
CREATE UNIQUE INDEX "game_state_game_id_key" ON "game_state"("game_id");

-- CreateIndex
CREATE INDEX "regions_game_id_idx" ON "regions"("game_id");
