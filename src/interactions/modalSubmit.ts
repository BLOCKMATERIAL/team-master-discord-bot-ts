import { ChannelType, ModalSubmitInteraction, User } from 'discord.js';

import Admin from '../api/models/Admin';
import Team, { IPlayer, ITeamData } from '../api/models/Team';
import { User as UserModel } from '../api/models/User';
import logger from '../logger';
import {
  createTeamButtons,
  createTeamEmbed,
  findOrCreateGamesCategory,
  generateTeamId,
  getGameNameByValue,
  isPositiveResponse,
} from '../utils';
import { getUserRole } from '../utils/userRole';

export async function handleModalSubmit(interaction: ModalSubmitInteraction) {
  if (interaction.customId.startsWith('create_team_modal_')) {
    const game = interaction.customId.split('_').pop()!;
    const slotsInput = interaction.fields.getTextInputValue('slots_input');
    const startTimeInput =
      interaction.fields.getTextInputValue('start_time_input');
    const notesInput = interaction.fields.getTextInputValue('notes_input');
    const slots = parseInt(slotsInput);
    let user = await UserModel.findOne({ userId: interaction.user.id });
    const userRole = await getUserRole(interaction.user.id);

    if (!user) {
      user = new UserModel({
        userId: interaction.user.id,
        username: interaction.user.username,
        displayName: interaction.user.displayName,
        role: 'user',
        games: [],
        teamHistory: [],
        notificationsEnabled: true,
      });
      await user.save();
      logger.info(`Created new user record for ${interaction.user.id}`);
    }

    const leader: IPlayer = {
      id: interaction.user.id,
      username: interaction.user.username,
      displayName: interaction.user.displayName,
      role: userRole,
    };
    if (isNaN(slots) || slots < 2 || slots > 10) {
      await interaction.reply({
        content:
          'Невірна кількість гравців. Будь ласка, введіть число від 2 до 10.',
        ephemeral: true,
      });
      return;
    }

    let startTime: string | undefined;
    if (startTimeInput) {
      const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
      if (!timeRegex.test(startTimeInput)) {
        await interaction.reply({
          content: 'Невірний формат часу. Використовуйте формат HH:MM.',
          ephemeral: true,
        });
        return;
      }
      startTime = startTimeInput;
    }
    const teamId = generateTeamId();
    const createVoiceChannelInput = interaction.fields.getTextInputValue(
      'create_voice_channel_input',
    );
    const shouldCreateVoiceChannel = isPositiveResponse(
      createVoiceChannelInput,
    );
    let voiceChannelId: string | undefined;

    if (shouldCreateVoiceChannel && interaction.guild) {
      try {
        const gamesCategory = await findOrCreateGamesCategory(
          interaction.guild,
        );
        const voiceChannel = await interaction.guild.channels.create({
          name: `Team ${teamId} ${getGameNameByValue(game)} - Voice`,
          type: ChannelType.GuildVoice,
          userLimit: slots + 2,
          parent: gamesCategory ? gamesCategory.id : undefined,
        });
        voiceChannelId = voiceChannel.id;
        logger.info(
          `Created voice channel for team ${teamId} in ${gamesCategory ? 'GAMES category' : 'server root'}: ${voiceChannelId}`,
        );
      } catch (error) {
        logger.error(
          `Failed to create voice channel for team ${teamId}: ${error}`,
        );
      }
    }

    logger.info(
      `User ${interaction.user.id} created a team for game ${game} with ${slots} slots${startTime ? `, starting at ${startTime}` : ''}${notesInput ? ' with notes' : ''}`,
    );

    const teamData: ITeamData = {
      teamId: teamId,
      leader: leader,
      players: [leader],
      reserve: [],
      createdAt: new Date(),
      startTime,
      voiceChannelId,
      status: 'active',
      notes: notesInput || undefined,
      channelId: interaction.channelId!,
      slots: slots,
      game: game,
      serverId: interaction.guildId!,
      serverName: interaction.guild?.name || 'Unknown Server',
    };

    user.teamHistory.push({
      teamId: teamData.teamId,
      game: teamData.game,
      joinedAt: new Date(),
      isReserve: false
    });
    await user.save();


    const embed = await createTeamEmbed(
      teamData,
      interaction.guild!,
      interaction.client,
    );
    const row = createTeamButtons(teamData);

    const replyContent = `🎉 Гравець ${interaction.user} створив команду для гри ${getGameNameByValue(game)} з ${slots} слотами!${startTime ? ` Початок гри о ${startTime}.` : ''} @everyone`;

    try {
      const reply = await interaction.reply({
        content: replyContent,
        embeds: [embed],
        components: [row],
        fetchReply: true,
      });

      if ('id' in reply) {
        const newTeam = new Team({
          ...teamData,
          messageId: reply.id,
        });
        await newTeam.save();
        logger.info(`Team ${teamId} saved to database`);
      } else {
        throw new Error('Failed to get message ID from reply');
      }
    } catch (error) {
      logger.error(`Failed to save team ${teamId} to database:`, error);
      await interaction.followUp({
        content:
          'Виникла помилка при створенні команди. Будь ласка, спробуйте ще раз.',
        ephemeral: true,
      });
      return;
    }

    logger.info(
      `Team ${teamId} created by ${interaction.user.id} in channel ${interaction.channelId}, team: ${JSON.stringify(teamData)}`,
    );
  }
}
