"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const dotenv_1 = __importDefault(require("dotenv"));
const Game_1 = __importDefault(require("../api/models/Game"));
const logger_1 = __importDefault(require("../logger"));
dotenv_1.default.config();
const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
    logger_1.default.error('MONGODB_URI is not defined in the environment variables');
    process.exit(1);
}
async function seedGames() {
    try {
        await mongoose_1.default.connect(MONGODB_URI);
        logger_1.default.info('Connected to MongoDB');
        const gamesData = JSON.parse(fs_1.default.readFileSync(path_1.default.join(__dirname, '../games.json'), 'utf-8')).games;
        for (const game of gamesData) {
            await Game_1.default.findOneAndUpdate({ value: game.value }, { name: game.name, value: game.value }, { upsert: true, new: true });
            logger_1.default.info(`Upserted game: ${game.name}`);
        }
        logger_1.default.info('Games seeding completed');
    }
    catch (error) {
        logger_1.default.error('Error seeding games:', error);
    }
    finally {
        await mongoose_1.default.disconnect();
        logger_1.default.info('Disconnected from MongoDB');
    }
}
seedGames();
