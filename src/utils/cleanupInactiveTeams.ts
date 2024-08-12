import { Client } from 'discord.js';
import logger from '../logger';
import Team from '../api/models/Team';  

const INACTIVE_THRESHOLD = 6 * 60 * 60 * 1000; 

export async function cleanupInactiveTeams(client: Client) {
    try {
        const now = new Date();
        const teams = await Team.find({ status: 'active' });

        for (const team of teams) {
            const timeSinceCreation = now.getTime() - team.createdAt.getTime();
            
            if (timeSinceCreation > INACTIVE_THRESHOLD) {
                try {
                    const channel = await client.channels.fetch(team.channelId);
                    if (channel?.isTextBased()) {
                        const message = await channel.messages.fetch(team.messageId || '');
                        if (message) {
                            await message.delete();
                            logger.info(`Deleted message for inactive team ${team.teamId}`);
                        }
                    }
                } catch (error) {
                    logger.warn(`Failed to delete message for team ${team.teamId}: ${error}`);
                }

                if (team.voiceChannelId) {
                    try {
                        const voiceChannel = await client.channels.fetch(team.voiceChannelId);
                        if (voiceChannel) {
                            await voiceChannel.delete();
                            logger.info(`Deleted voice channel for inactive team ${team.teamId}`);
                        }
                    } catch (error) {
                        logger.warn(`Failed to delete voice channel for team ${team.teamId}: ${error}`);
                    }
                }

                team.status = 'inactive';
                await team.save();
                logger.info(`Marked team ${team.teamId} as inactive`);
            }
        }
    } catch (error) {
        logger.error(`Error in cleanupInactiveTeams: ${error}`);
    }
}