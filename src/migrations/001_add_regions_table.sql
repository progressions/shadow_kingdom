-- Migration: 001_add_regions_table.sql
-- Description: Create regions table for thematic world generation
-- Date: 2025-01-19

CREATE TABLE regions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  game_id INTEGER NOT NULL,
  name TEXT,
  type TEXT NOT NULL,
  description TEXT NOT NULL,
  center_room_id INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
);

CREATE INDEX idx_regions_game ON regions(game_id);