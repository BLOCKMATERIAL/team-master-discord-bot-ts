import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import Game from '../api/models/Game';
import logger from '../logger';
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI as string;

if (!MONGODB_URI) {
    logger.error('MONGODB_URI is not defined in the environment variables');
    process.exit(1);
}

async function seedGames() {
    try {
        await mongoose.connect(MONGODB_URI);
        logger.info('Connected to MongoDB');

        const gamesData = JSON.parse(fs.readFileSync(path.join(__dirname, '../games.json'), 'utf-8')).games;

        for (const game of gamesData) {
            await Game.findOneAndUpdate(
                { value: game.value },
                { name: game.name, value: game.value },
                { upsert: true, new: true }
            );
            logger.info(`Upserted game: ${game.name}`);
        }

        logger.info('Games seeding completed');
    } catch (error) {
        logger.error('Error seeding games:', error);
    } finally {
        await mongoose.disconnect();
        logger.info('Disconnected from MongoDB');
    }
}

seedGames();