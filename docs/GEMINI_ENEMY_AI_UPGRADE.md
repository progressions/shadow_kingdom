# Gemini Enemy AI Upgrade Plan

This document outlines the concepts and potential solutions for upgrading the enemy AI in the game, moving from a simple direct-pathing system to a more robust and intelligent one.

### 1. The Problem: Greedy Pathing

*   **Current State:** Enemies are using a "greedy" algorithm. At every moment, they make the locally optimal choice (move closer to the player) without any foresight.
*   **Why it Fails:** This is easily defeated by any concave obstacle. An enemy will run into the corner of a 'U' shaped wall and get stuck, even if the entrance is two steps to their left.

### 2. Simple Improvements (Good, but still flawed)

Before we get to full pathfinding, there are some simpler, "good enough" hacks.

*   **"Bug" or "Wall Follower" AI:** This is a classic simple solution.
    *   **How it works:** If the enemy runs into a wall, it picks a direction (e.g., left) and "hugs" the wall, following its contour until it's no longer blocked and can move toward the player again.
    *   **Pros:** Very simple to implement. You just need a "blocked" state and a "follow wall" state. It can solve surprisingly complex mazes.
    *   **Cons:** It's inefficient. The enemy might go the long way around an obstacle. It can also get trapped in certain geometric shapes (like a spiral). It looks very robotic.

### 3. The "Real" Solution: A* (A-Star) Pathfinding

This is the industry-standard solution for this problem and almost certainly the right approach for your game.

*   **The Concept:** A* is an algorithm that intelligently finds the shortest path between two points on a graph. In a 2D game, your "graph" is a grid of tiles representing the level.
*   **How it Works (High Level):**
    1.  **Grid Representation:** First, you need to represent your game level as a grid. Each cell is either "walkable" or "unwalkable" (a wall/obstacle). Your `level4_city_walls.js` and `temple_dungeon_map_190x110.png` suggest you already have the data to build this.
    2.  **The Search:** A* starts at the enemy's position and explores walkable neighbor tiles, calculating two costs for each tile:
        *   `g-cost`: The actual cost of the path from the start tile to the current tile.
        *   `h-cost` (Heuristic): An *estimated* cost to get from the current tile to the player's tile. This is usually the straight-line distance, ignoring obstacles.
    3.  **The Magic (`f-cost`):** A* combines these (`f-cost = g-cost + h-cost`) to prioritize which tiles to explore next. It always chooses the path that seems most promising, which allows it to "look ahead" and avoid dead ends without exhaustively searching every possible path.
*   **The Result:** The algorithm returns an optimal list of tiles (a path) that the enemy can simply walk along to reach the player, navigating perfectly around any obstacle.
*   **Pros:**
    *   **Optimal and Correct:** It finds the shortest path (given a good heuristic).
    *   **Flexible:** It can handle changing environments; you just update the grid's "walkable" status.
    *   **Looks Intelligent:** Enemies will appear much smarter as they navigate complex environments purposefully.
*   **Cons:**
    *   **Implementation Complexity:** It's more complex than direct movement. You'll need a data structure (like a Priority Queue) and to implement the algorithm's logic.
    *   **Performance:** It can be computationally expensive if your levels are huge or if many enemies are pathfinding at the exact same time. However, for a game like this, it's almost always manageable with optimizations.

### 4. Beyond Movement: Enhancing AI Behavior

Once you have A* pathfinding, you can build more interesting behaviors on top of it.

*   **Line of Sight (LOS):** An enemy shouldn't know where the player is at all times. You can use a line-drawing algorithm (like Bresenham's) to check if there's an unobstructed line between the enemy and the player.
    *   If no LOS: The enemy could be `IDLE` or `PATROLLING` between waypoints.
    *   If LOS is gained: The enemy switches to a `PURSUE` state and generates an A* path to the player's *last known position*.
    *   If LOS is lost: The enemy might go to the player's last seen spot and then enter a `SEARCHING` state before giving up and returning to `PATROL`.
*   **State Machines:** This is the key to organizing AI. An enemy isn't just "moving"; it's in a specific *state*.
    *   **Example States:** `IDLE`, `PATROL`, `PURSUE`, `ATTACKING`, `FLEEING`.
    *   The AI logic is then just a set of rules for transitioning between these states. (e.g., "If in `PURSUE` state and distance to player < attack range, switch to `ATTACKING` state.").
*   **Targeting:** Who do they attack?
    *   Right now, it's just the player.
    *   With companions in the game (`companion_dialogs.js`), you could introduce more complex targeting: attack the closest character, attack the character who last damaged them (aggro), etc.

### Recommended Path Forward

1.  **Grid Representation:** Your first step would be to create a system that can represent your level geometry as a simple 2D grid of walkable/unwalkable nodes.
2.  **A* Implementation:** Find a good JavaScript library for A* pathfinding (there are many) or implement it yourself. It's a fantastic learning exercise.
3.  **Integrate:** Create a basic `PURSUE` state for your enemies. When they want to chase the player, they will:
    a. Request a path from the A* system from their current position to the player's position.
    b. Receive a list of coordinates.
    c. Walk from one coordinate to the next until they reach the end or need a new path.
