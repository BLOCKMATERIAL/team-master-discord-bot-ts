import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  CategoryChannel,
  ChannelType,
  Client,
  EmbedBuilder,
  Guild,
} from 'discord.js';
import * as fs from 'fs';

import Team, { IPlayer, ITeamData } from '../api/models/Team';
import logger from '../logger';
import { Game } from '../types';
import { getRankEmoji, getValorantRank } from './valorantRankUtil';

export const games: Game[] = JSON.parse(
  fs.readFileSync('games.json', 'utf-8'),
).games;

export function generateTeamId(): string {
  return Math.random().toString(36).substring(2, 7).toUpperCase();
}

export async function isUserInAnyTeam(userId: string): Promise<boolean | void> {
  try {
    const team = await Team.findOne({
      status: 'active',
      $or: [{ leader: userId }, { players: userId }, { reserve: userId }],
    });
    return !!team;
  } catch (error) {
    logger.error('Error checking if user is in any team:', error);
  }
}

export function getGameNameByValue(value: string): string {
  const game = games.find((g) => g.value === value);
  return game ? game.name : value;
}

export async function createTeamEmbed(
  team: ITeamData,
  guild: Guild,
  client: Client,
): Promise<EmbedBuilder> {
  const embed = new EmbedBuilder()
    .setTitle(`🎮 Команда ${team.teamId}`)
    .setColor('#00ff00')
    .setDescription(`Команда для гри ${getGameNameByValue(team.game)}`);

  embed.addFields({
    name: 'Гра',
    value: getGameNameByValue(team.game),
    inline: true,
  });

  if (team.startTime) {
    embed.addFields({
      name: 'Час початку',
      value: team.startTime,
      inline: true,
    });
  }

  if (team.notes) {
    embed.addFields({ name: 'Нотатки', value: team.notes, inline: false });
  }

  if (team.voiceChannelId) {
    embed.addFields({
      name: 'Голосовий канал',
      value: `<#${team.voiceChannelId}>`,
      inline: true,
    });
  }

  const playerList = [];
  for (let i = 0; i < team.slots; i++) {
    if (i < team.players.length) {
      const player = team.players[i];
      const emoji =
        player.id === team.leader.id ? '👑' : player.isAdmin ? '🛡️' : '👤'; 
      let playerDisplay = `${emoji} <@${player.id}>`;

      if (team.game.toLowerCase() === 'valorant') {
        const member = await guild.members.fetch(player.id).catch(() => null);
        if (member) {
          const rank = getValorantRank(member);
          if (rank) {
            const rankEmoji = getRankEmoji(rank);
            playerDisplay += ` ${rankEmoji} ${rank}`;
          }
        }
      }

      playerList.push(playerDisplay);
    } else {
      playerList.push('🔓 Вільне місце');
    }
  }

  embed.addFields({
    name: '👥 Гравці:',
    value: playerList.join('\n'),
    inline: false,
  });

  if (team.reserve.length > 0) {
    const reserveList = await Promise.all(
      team.reserve.map(async (player: IPlayer) => {
        let reserveDisplay = `🔹 <@${player.id}>`;

        if (team.game.toLowerCase() === 'valorant') {
          const member = await guild.members.fetch(player.id).catch(() => null);
          if (member) {
            const rank = getValorantRank(member);
            if (rank) {
              const rankEmoji = getRankEmoji(rank);
              reserveDisplay += ` ${rankEmoji} ${rank}`;
            }
          }
        }

        return reserveDisplay;
      }),
    );
    embed.addFields({
      name: '🔄 Черга:',
      value: reserveList.join('\n'),
      inline: false,
    });
  }

  embed.addFields({
    name: '🕒 Створено:',
    value: team.createdAt.toLocaleString(),
    inline: false,
  });

  if (team.players.length === team.slots) {
    embed.addFields({
      name: '✅ Статус:',
      value: 'Команда повна! 🎉',
      inline: false,
    });
  }

  embed.setFooter({
    text: `🆓 Вільних місць: ${team.slots - team.players.length} | ⏳ Місць у резерві: ${2 - team.reserve.length}`,
  });

  return embed;
}

export function createTeamButtons(
  team: ITeamData,
): ActionRowBuilder<ButtonBuilder> {
  const isTeamFull = team.players.length >= team.slots;
  const isReserveFull = team.reserve.length >= 2;

  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`join_${team.teamId}`)
      .setLabel(
        isTeamFull ? (isReserveFull ? 'Повна' : 'В чергу') : 'Приєднатися',
      )
      .setStyle(
        isTeamFull
          ? isReserveFull
            ? ButtonStyle.Secondary
            : ButtonStyle.Primary
          : ButtonStyle.Success,
      )
      .setDisabled(isTeamFull && isReserveFull),
    new ButtonBuilder()
      .setCustomId(`leave_${team.teamId}`)
      .setLabel('Покинути')
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId(`disband_${team.teamId}`)
      .setLabel('Розпустити')
      .setStyle(ButtonStyle.Secondary),
  );
}

export async function updateTeamMessage(interaction: any, teamId: string) {
  const client = interaction.client;
  const team = await Team.findOne({ teamId: teamId });
  if (!team) {
    logger.error(`Team ${teamId} not found in database`);
    return;
  }
  const channel = await client.channels.fetch(team.channelId);
  if (channel?.isTextBased()) {
    const message = await channel.messages.fetch(team.messageId || '');
    const embed = await createTeamEmbed(
      team,
      interaction.guild!,
      interaction.client,
    );

    const row = createTeamButtons(team);
    await message.edit({ embeds: [embed], components: [row] });
  }
}

export async function getTeamIdByLeader(
  userId: string,
): Promise<string | null> {
  try {
    const team = await Team.findOne({ leader: userId, status: 'active' });
    return team ? team.teamId : null;
  } catch (error) {
    logger.error(`Error in getTeamIdByLeader: ${error}`);
    throw error;
  }
}

export async function findOrCreateGamesCategory(
  guild: Guild,
): Promise<CategoryChannel | null> {
  try {
    const existingCategory = guild.channels.cache.find(
      (channel) =>
        channel.type === ChannelType.GuildCategory &&
        channel.name.toUpperCase() === `TEMP VOICE CHANNELS (TEAM MASTER BOT)`,
    ) as CategoryChannel | undefined;

    if (existingCategory) {
      return existingCategory;
    }

    const newCategory = await guild.channels.create({
      name: 'TEMP VOICE CHANNELS (TEAM MASTER BOT)',
      type: ChannelType.GuildCategory,
    });

    logger.info(`Created new GAMES category in guild ${guild.id}`);
    return newCategory;
  } catch (error) {
    logger.error(`Failed to find or create GAMES category: ${error}`);
    return null;
  }
}

export function isPositiveResponse(input: string): boolean {
  const positiveResponses = ['так', 'yes', 'y', 'да', 'true', '1'];
  return positiveResponses.includes(input.toLowerCase().trim());
}
