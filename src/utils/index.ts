import * as fs from 'fs';
import { Team, Game } from '../types';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, CategoryChannel, ChannelType, Client, EmbedBuilder, Guild } from 'discord.js';
import { logger } from '..';

export const teams: { [key: string]: Team } = {};

export const games: Game[] = JSON.parse(fs.readFileSync('games.json', 'utf-8')).games;

export function generateTeamId(): string {
    return Math.random().toString(36).substring(2, 7).toUpperCase();
}

export function isUserInAnyTeam(userId: string): boolean {
    return Object.values(teams).some(team => 
        team.players.includes(userId) || team.reserve.includes(userId) || team.leader === userId
    );
}

export function getGameNameByValue(value: string): string {
    const game = games.find(g => g.value === value);
    return game ? game.name : value;
}

export function createTeamEmbed(teamId: string): EmbedBuilder {
    const team = teams[teamId];
    const embed = new EmbedBuilder()
        .setTitle(`🎮 Команда ${teamId}`)
        .setColor('#00ff00');

    embed.addFields(
        { name: 'Гра', value: getGameNameByValue(team.game), inline: true }
    );

    if (team.startTime) {
        embed.addFields({ name: 'Час початку', value: team.startTime, inline: true });
    }
    
    if (team.notes) {
        embed.addFields({ name: 'Нотатки', value: team.notes, inline: false });
    }

    if (team.voiceChannelId) {
        embed.addFields({ name: 'Голосовий канал', value: `<#${team.voiceChannelId}>`, inline: true });
    }
    
    const playerList = [];
    for (let i = 0; i < team.slots; i++) {
        if (i < team.players.length) {
            const playerId = team.players[i];
            const emoji = playerId === team.leader ? '👑' : '👤';
            playerList.push(`${emoji} <@${playerId}>`);
        } else {
            playerList.push('🔓 Вільне місце');
        }
    }

    embed.addFields({ name: '👥 Гравці:', value: playerList.join('\n'), inline: false });

    if (team.reserve.length > 0) {
        const reserveList = team.reserve.map(playerId => `🔹 <@${playerId}>`);
        embed.addFields({ name: '🔄 Черга:', value: reserveList.join('\n'), inline: false });
    }

    embed.addFields({ name: '🕒 Створено:', value: team.createdAt.toLocaleString(), inline: false });

    if (team.players.length === team.slots) {
        embed.addFields({ name: '✅ Статус:', value: 'Команда повна! 🎉', inline: false });
    }

    embed.setFooter({ text: `🆓 Вільних місць: ${team.slots - team.players.length}` });

    return embed;
}

export function createTeamButtons(teamId: string): ActionRowBuilder<ButtonBuilder> {
    const team = teams[teamId];
    const isTeamFull = team.players.length >= team.slots;

    return new ActionRowBuilder<ButtonBuilder>()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(`join_${teamId}`)
                .setLabel(isTeamFull ? 'Черга' : 'Приєднатися')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId(`leave_${teamId}`)
                .setLabel('Покинути')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId(`disband_${teamId}`)
                .setLabel('Розпустити')
                .setStyle(ButtonStyle.Secondary)
        );
}

export async function updateTeamMessage(client: Client, teamId: string) {
    const team = teams[teamId];
    const channel = await client.channels.fetch(team.channelId);
    if (channel?.isTextBased()) {
        const message = await channel.messages.fetch(team.messageId);
        const embed = createTeamEmbed(teamId);
        const row = createTeamButtons(teamId);
        await message.edit({ embeds: [embed], components: [row] });
    }
}

export function getTeamIdByLeader(userId: string): string | null {
    for (const [teamId, team] of Object.entries(teams)) {
        if (team.leader === userId) {
            return teamId;
        }
    }
    return null;
}


export async function findOrCreateGamesCategory(guild: Guild): Promise<CategoryChannel | null> {
    try {
        const existingCategory = guild.channels.cache.find(
            channel => channel.type === ChannelType.GuildCategory && channel.name.toUpperCase() === 'GAMES'
        ) as CategoryChannel | undefined;

        if (existingCategory) {
            return existingCategory;
        }

        const newCategory = await guild.channels.create({
            name: 'TEMP VOICE CHANNELS',
            type: ChannelType.GuildCategory
        });

        logger.info(`Created new GAMES category in guild ${guild.id}`);
        return newCategory;
    } catch (error) {
        logger.error(`Failed to find or create GAMES category: ${error}`);
        return null;
    }
}
