#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameCLI = void 0;
exports.main = main;
const database_1 = __importDefault(require("./utils/database"));
const gameController_1 = require("./gameController");
async function main() {
    // Parse command-line arguments
    const args = process.argv.slice(2);
    let command;
    // Look for --cmd argument
    const cmdIndex = args.indexOf('--cmd');
    if (cmdIndex !== -1 && args[cmdIndex + 1]) {
        command = args[cmdIndex + 1];
    }
    const db = new database_1.default();
    try {
        await db.connect();
        const controller = new gameController_1.GameController(db, command);
        await controller.start();
    }
    catch (error) {
        console.error('Failed to start Shadow Kingdom:', error);
        process.exit(1);
    }
}
// Only run main if this file is executed directly
if (require.main === module) {
    main();
}
// Export GameCLI for backwards compatibility (not used anymore)
class GameCLI {
    constructor() {
        throw new Error('GameCLI is deprecated. Use GameController instead.');
    }
}
exports.GameCLI = GameCLI;
//# sourceMappingURL=index.js.map