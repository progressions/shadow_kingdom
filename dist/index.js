#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameCLI = void 0;
const database_1 = __importDefault(require("./utils/database"));
const gameController_1 = require("./gameController");
async function main() {
    // Interactive mode only
    const db = new database_1.default();
    try {
        await db.connect();
        const controller = new gameController_1.GameController(db);
        await controller.start();
    }
    catch (error) {
        console.error('Failed to start Shadow Kingdom:', error);
        process.exit(1);
    }
}
main();
// Export GameCLI for backwards compatibility (not used anymore)
class GameCLI {
    constructor() {
        throw new Error('GameCLI is deprecated. Use GameController instead.');
    }
}
exports.GameCLI = GameCLI;
//# sourceMappingURL=index.js.map