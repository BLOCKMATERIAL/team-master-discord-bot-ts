import {
  ButtonInteraction,
  ChannelType,
  ChatInputCommandInteraction,
} from 'discord.js';

import Admin from '../api/models/Admin';
import Team, { IPlayer } from '../api/models/Team';
import { User } from '../api/models/User';
import logger from '../logger';
import { isUserInAnyTeam, updateTeamMessage } from '../utils';

export async function handleButtonInteraction(interaction: ButtonInteraction) {
  const [action, teamId] = interaction.customId.split('_');

  switch (action) {
    case 'join':
      await handleJoin(interaction, teamId);
      break;
    case 'leave':
      await handleLeave(interaction, teamId);
      break;
    case 'disband':
      await handleDisband(interaction, teamId);
      break;
  }
}

export async function handleJoin(
  interaction: ButtonInteraction,
  teamId: string,
) {
  try {
    const isInTeam = await isUserInAnyTeam(interaction.user.id);
    if (isInTeam) {
      await interaction.reply({
        content: 'Ви вже є учасником іншої команди. Ви не можете приєднатися до нової команди.',
        ephemeral: true,
      });
      logger.info(
        `User ${interaction.user.id} ${interaction.user.displayName} tried to join team ${teamId} but is already in another team`,
      );
      return;
    }

    const team = await Team.findOne({ teamId });
    if (!team) {
      await interaction.reply({
        content: 'Ця команда більше не існує.',
        ephemeral: true,
      });
      return;
    }

    const userId = interaction.user.id;
    const isUserInTeam = team.players.some((player) => player.id === userId);
    const isUserInReserve = team.reserve.some((player) => player.id === userId);

    if (isUserInTeam || isUserInReserve) {
      await interaction.reply({
        content: 'Ви вже є учасником цієї команди або знаходитесь у черзі.',
        ephemeral: true,
      });
      return;
    }

    let user = await User.findOne({ userId });
    if (!user) {
      user = new User({
        userId,
        username: interaction.user.username,
        displayName: interaction.user.displayName,
        games: [],
        teamHistory: [],
      });
    }

    const isAdmin = await Admin.findOne({ userId });
    const newPlayer: IPlayer = {
      id: userId,
      username: interaction.user.username,
      displayName: interaction.user.displayName,
      isAdmin: !!isAdmin,
    };

    const isTeamFull = team.players.length >= team.slots;
    const isReserveFull = team.reserve.length >= 2;

    if (!isTeamFull) {
      team.players.push(newPlayer);
      await interaction.reply({
        content: 'Ви приєдналися до команди.',
        ephemeral: true,
      });
      logger.info(
        `User ${userId} ${interaction.user.displayName} joined team ${teamId}`,
      );
    } else if (!isReserveFull) {
      if (isAdmin) {
        team.reserve.unshift(newPlayer);
      } else {
        team.reserve.push(newPlayer);
      }
      await interaction.reply({
        content: 'Команда повна. Вас додано до черги.',
        ephemeral: true,
      });
      logger.info(
        `User ${userId} ${interaction.user.displayName} joined queue of team ${teamId}${isAdmin ? ' as admin' : ''}`,
      );
    } else {
      await interaction.reply({
        content: 'На жаль, команда та черга вже повні.',
        ephemeral: true,
      });
      return;
    }

    user.teamHistory.push({
      teamId: team.teamId,
      game: team.game,
      joinedAt: new Date(),
      isReserve: isTeamFull,
    });

    await user.save();
    await team.save();
    await updateTeamMessage(interaction, teamId);
  } catch (error) {
    logger.error(`Error in handleJoin: ${error}`);
    await interaction.reply({
      content: 'Виникла помилка при приєднанні до команди. Спробуйте ще раз пізніше.',
      ephemeral: true,
    });
  }
}

export async function handleLeave(interaction: ButtonInteraction, teamId: string) {
  const team = await Team.findOne({ teamId });
  if (!team) {
    await interaction.reply({
      content: 'Ця команда більше не існує.',
      ephemeral: true,
    });
    return;
  }

  const user = await User.findOne({ userId: interaction.user.id });
  if (!user) {
    await interaction.reply({
      content: 'Помилка: користувача не знайдено.',
      ephemeral: true,
    });
    return;
  }

  const playerIndex = team.players.findIndex(
    (player) => player.id === interaction.user.id,
  );
  const reserveIndex = team.reserve.findIndex(
    (player) => player.id === interaction.user.id,
  );
  let wasInReserve = false;

  if (playerIndex === -1 && reserveIndex === -1) {
    await interaction.reply({
      content: 'Ви не є учасником цієї команди.',
      ephemeral: true,
    });
    return;
  }

  const isLeader = team.leader.id === interaction.user.id;
  const isLastPlayer = team.players.length === 1 && team.reserve.length === 0;

  if (isLastPlayer) {
    // Последний игрок покидает команду - расформировываем команду
    if (team.voiceChannelId) {
      try {
        const voiceChannel = await interaction.client.channels.fetch(team.voiceChannelId);
        if (voiceChannel) {
          await voiceChannel.delete();
          logger.info(`Deleted voice channel ${team.voiceChannelId} for disbanded team ${teamId}`);
        }
      } catch (error) {
        logger.error(`Failed to delete voice channel for team ${teamId}: ${error}`);
      }
    }
    await Team.deleteOne({ teamId });
    await interaction.message.delete();
    await interaction.reply({
      content: 'Ви покинули команду. Оскільки ви були єдиним гравцем, команду розформовано.',
      ephemeral: true,
    });
    logger.info(`Team ${teamId} disbanded as last player ${interaction.user.id} left`);
  } else {
    if (isLeader) {
      // Лидер покидает команду
      team.players.splice(playerIndex, 1);
      
      // Выбираем нового лидера из оставшихся игроков
      if (team.players.length > 0) {
        const newLeaderIndex = Math.floor(Math.random() * team.players.length);
        const newLeader = team.players[newLeaderIndex];
        team.leader = newLeader;
        await interaction.client.users.cache
          .get(newLeader.id)
          ?.send(`Ви стали новим лідером команди ${teamId}.`);
        logger.info(
          `User ${interaction.user.id} left team ${teamId} and leadership passed to ${newLeader.id}`,
        );
      }

      // Если есть игроки в резерве, перемещаем первого в основной состав
      if (team.reserve.length > 0) {
        const newPlayer = team.reserve.shift()!;
        team.players.push(newPlayer);
        await interaction.client.users.cache
          .get(newPlayer.id)
          ?.send(
            `Вас переміщено з резерву до активного складу команди ${teamId}.`,
          );
        logger.info(
          `User ${newPlayer.id} moved from reserve to active roster in team ${teamId}`,
        );
      }
    } else if (playerIndex !== -1) {
      // Обычный игрок покидает команду
      team.players.splice(playerIndex, 1);
      if (team.reserve.length > 0) {
        const newPlayer = team.reserve.shift()!;
        team.players.push(newPlayer);
        await interaction.client.users.cache
          .get(newPlayer.id)
          ?.send(
            `Вас переміщено з резерву до активного складу команди ${teamId}.`,
          );
        logger.info(
          `User ${newPlayer.id} moved from reserve to active roster in team ${teamId}`,
        );
      }
    } else {
      // Игрок покидает резерв
      team.reserve.splice(reserveIndex, 1);
      wasInReserve = true;
    }

    // Проверяем, что у команды все еще есть лидер
    if (team.players.length > 0 && !team.players.some(player => player.id === team.leader.id)) {
      const newLeaderIndex = Math.floor(Math.random() * team.players.length);
      const newLeader = team.players[newLeaderIndex];
      team.leader = newLeader;
      await interaction.client.users.cache
        .get(newLeader.id)
        ?.send(`Ви стали новим лідером команди ${teamId}.`);
      logger.info(
        `New leader ${newLeader.id} assigned to team ${teamId} after previous leader left`,
      );
    }

    await team.save();
    await updateTeamMessage(interaction, teamId);

    const leaveMessage = wasInReserve
      ? 'Ви покинули резерв команди.'
      : 'Ви покинули команду.';
    await interaction.reply({ content: leaveMessage, ephemeral: true });
    logger.info(
      `User ${interaction.user.id} left ${wasInReserve ? 'reserve of ' : ''}team ${teamId}`,
    );
  }

  const teamHistoryEntry = user.teamHistory.find(
    (entry) => entry.teamId === teamId && !entry.leftAt,
  );
  if (teamHistoryEntry) {
    teamHistoryEntry.leftAt = new Date();
    await user.save();
  }
}

async function handleDisband(interaction: ButtonInteraction, teamId: string) {
  const team = await Team.findOne({ teamId });
  if (!team) {
    await interaction.reply({
      content: 'Ця команда більше не існує.',
      ephemeral: true,
    });
    return;
  }

  if (team.leader.id !== interaction.user.id) {
    await interaction.reply({
      content: 'Тільки лідер команди може розпустити команду.',
      ephemeral: true,
    });
    logger.warn(`User ${interaction.user.id} tried to disband team ${teamId} but is not the leader`);
    return;
  }
  const now = new Date();

  // Обновляем историю команд для всех участников
  const allMembers = [...team.players, ...team.reserve];
  for (const member of allMembers) {
    const user = await User.findOne({ userId: member.id });
    if (user) {
      const teamHistoryEntry = user.teamHistory.find(
        (entry) => entry.teamId === teamId && !entry.leftAt,
      );
      if (teamHistoryEntry) {
        teamHistoryEntry.leftAt = now;
        await user.save();
      }
    }
  }

  // Удаляем голосовой канал, если он существует
  if (team.voiceChannelId) {
    try {
      const channel = await interaction.client.channels.fetch(
        team.voiceChannelId,
      );
      if (channel && channel.isVoiceBased() && channel.deletable) {
        await channel.delete();
        logger.info(
          `Deleted voice channel ${team.voiceChannelId} for team ${teamId}`,
        );
      }
    } catch (error) {
      logger.error(
        `Failed to delete voice channel for team ${teamId}: ${error}`,
      );
    }
  }

  await Team.deleteOne({ teamId });
  await interaction.message.delete();
  await interaction.reply({ content: 'Команду розпущено.', ephemeral: true });
  logger.info(`Team ${teamId} disbanded by ${interaction.user.id} ${interaction.user.displayName}`);
}

export async function handleDisbandAdmin(
  interaction: ChatInputCommandInteraction,
) {
  const isAdmin = await Admin.findOne({ userId: interaction.user.id });
  if (!isAdmin) {
    await interaction.reply({
      content: 'Ця команда доступна тільки для адміністраторів.',
      ephemeral: true,
    });
    return;
  }

  const teamId = interaction.options.getString('team_id');
  if (!teamId) {
    await interaction.reply({
      content: 'Будь ласка, вкажіть ID команди.',
      ephemeral: true,
    });
    return;
  }

  const team = await Team.findOne({ teamId });
  if (!team) {
    await interaction.reply({
      content: 'Команду не знайдено.',
      ephemeral: true,
    });
    return;
  }

  // Изменяем статус команды вместо удаления
  team.status = 'disbanded';
  await team.save();

  try {
    const channel = await interaction.client.channels.fetch(team.channelId);
    if (channel?.isTextBased()) {
      const message = await channel.messages.fetch(team.messageId as string);
      if (message) {
        await message.delete();
        logger.info(`Deleted message for disbanded team ${teamId}`);
      }
    }
  } catch (error) {
    logger.error(`Failed to delete message for team ${teamId}: ${error}`);
  }

  if (team.voiceChannelId) {
    try {
      const voiceChannel = await interaction.client.channels.fetch(
        team.voiceChannelId,
      );
      if (voiceChannel) {
        await voiceChannel.delete();
        logger.info(`Deleted voice channel for disbanded team ${teamId}`);
      }
    } catch (error) {
      logger.error(
        `Failed to delete voice channel for team ${teamId}: ${error}`,
      );
    }
  }

  await interaction.reply({
    content: `Команду ${teamId} розпущено.`,
    ephemeral: true,
  });
  logger.info(`Admin ${interaction.user.id} disbanded team ${teamId}`);

  // Отправляем сообщения всем участникам команды
  for (const player of [...team.players, ...team.reserve]) {
    try {
      const user = await interaction.client.users.fetch(player.id);
      await user.send(`Команду ${teamId} було розпущено адміністратором.`);
    } catch (error) {
      logger.error(
        `Failed to send disband notification to user ${player.id}: ${error}`,
      );
    }
  }
}

async function deleteVoiceChannel(
  interaction: ButtonInteraction,
  channelId: string,
): Promise<boolean> {
  if (interaction.guild) {
    try {
      const channel = await interaction.guild.channels.fetch(channelId);
      if (channel && channel.type === ChannelType.GuildVoice) {
        await channel.delete();
        logger.info(`Deleted voice channel ${channelId}`);
        return true;
      }
    } catch (error) {
      logger.error(`Failed to delete voice channel ${channelId}: ${error}`);
    }
  }
  return false;
}
