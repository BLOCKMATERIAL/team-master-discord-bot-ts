import { ChatInputCommandInteraction } from 'discord.js';

import Admin from '../api/models/Admin';
import Team, { IPlayer } from '../api/models/Team';
import logger from '../logger';
import {
  getTeamIdByLeader,
  isUserInAnyTeam,
  updateTeamMessage,
} from '../utils';
import { User } from '../api/models/User';
import { getUserRole } from '../utils/userRole';


export async function handleInviteCommand(
  interaction: ChatInputCommandInteraction,
) {
  try {
    const teamId = await getTeamIdByLeader(interaction.user.id);

    if (!teamId) {
      await interaction.reply({
        content: 'Ви не є лідером жодної команди.',
        ephemeral: true,
      });
      return;
    }

    const playerToInvite = interaction.options.getUser('player');
    if (!playerToInvite) {
      await interaction.reply({
        content: 'Вказаного користувача не знайдено.',
        ephemeral: true,
      });
      return;
    }

    const userRole = await getUserRole(playerToInvite.id);

    const newPlayer: IPlayer = {
      id: playerToInvite.id,
      username: playerToInvite.username,
      displayName: playerToInvite.displayName,
      role: userRole,
    };

    if (await isUserInAnyTeam(playerToInvite.id)) {
      await interaction.reply({
        content: 'Цей гравець вже є учасником іншої команди або в резерві.',
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

    if (team.players.length >= team.slots && team.reserve.length >= 2) {
      await interaction.reply({
        content: 'Команда та резерв повні. Неможливо запросити більше гравців.',
        ephemeral: true,
      });
      return;
    }

    if (team.players.length < team.slots) {
      team.players.push(newPlayer);
      logger.info(
        `User ${interaction.user.id} invited ${playerToInvite.id} ${playerToInvite.displayName} to team ${teamId}`,
      );
      await interaction.reply({
        content: `Гравця ${playerToInvite} запрошено до команди.`,
        ephemeral: true,
      });
    } else {
      team.reserve.push(newPlayer);
      logger.info(
        `User ${interaction.user.id} invited ${playerToInvite.id} ${playerToInvite.displayName} to reserve of team ${teamId}`,
      );
      await interaction.reply({
        content: `Гравця ${playerToInvite} запрошено до резерву команди.`,
        ephemeral: true,
      });
    }

    await team.save();
    await updateTeamMessage(interaction, teamId);

    // Получаем ссылку на сообщение команды
    let messageLink = '';
    try {
      const channel = await interaction.client.channels.fetch(team.channelId);
      if (channel?.isTextBased() && team.messageId) {
        const message = await channel.messages.fetch(team.messageId);
        messageLink = message.url;
      }
    } catch (error) {
      logger.error(`Failed to get team message link: ${error}`);
    }

    const invitedUser = await User.findOne({ userId: playerToInvite.id });
    if (invitedUser && invitedUser.notificationsEnabled) {
      try {
        await playerToInvite.send(
          `Вас було запрошено до команди ${teamId}. Натисніть на посилання нижче, щоб приєднатися до команди:\n${messageLink}`
        );
      } catch (error) {
        logger.warn(
          `Failed to send invitation message to user ${playerToInvite.id}: ${error}`,
        );
        await interaction.followUp({
          content: `Не вдалося надіслати повідомлення гравцю ${playerToInvite}. Можливо, у них вимкнені особисті повідомлення.`,
          ephemeral: true,
        });
      }
    } else {
      await interaction.followUp({
        content: `Гравець ${playerToInvite} має вимкнені сповіщення. Повідомлення про запрошення не було надіслано.`,
        ephemeral: true,
      });
    }
  } catch (error) {
    logger.error(`Error in handleInviteCommand: ${error}`);
    await interaction.reply({
      content: 'Виникла помилка при обробці команди. Спробуйте ще раз пізніше.',
      ephemeral: true,
    });
  }
}