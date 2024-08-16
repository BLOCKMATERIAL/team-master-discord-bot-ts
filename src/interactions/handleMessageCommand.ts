import { ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';

import Admin from '../api/models/Admin';
import Team from '../api/models/Team';
import logger from '../logger';

export async function handleMessageCommand(
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
  const message = interaction.options.getString('message');

  if (!teamId || !message) {
    await interaction.reply({
      content: 'Будь ласка, вкажіть ID команди та повідомлення.',
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

  const embed = new EmbedBuilder()
    .setColor('#FF9900')
    .setTitle(`📢 Повідомлення для команди ${teamId}`)
    .setDescription(message)
    .addFields(
      { name: 'Від адміністратора', value: interaction.user.tag },
      {
        name: 'Час відправлення',
        value: new Date().toLocaleString('uk-UA', { timeZone: 'Europe/Kiev' }),
      },
    )
    .setFooter({ text: 'Це офіційне повідомлення від адміністрації сервера.' });

  for (const player of [...team.players, ...team.reserve]) {
    try {
      const user = await interaction.client.users.fetch(player.id);
      await user.send({ embeds: [embed] });
    } catch (error) {
      logger.error(`Failed to send message to user ${player.id}: ${error}`);
    }
  }

  try {
    const channel = await interaction.client.channels.fetch(team.channelId);
    if (channel?.isTextBased()) {
      await channel.send({ embeds: [embed] });
    }
  } catch (error) {
    logger.error(
      `Failed to send message to team channel ${team.channelId}: ${error}`,
    );
  }

  await interaction.reply({
    content: `Повідомлення успішно надіслано команді ${teamId}.`,
    ephemeral: true,
  });
  logger.info(`Admin ${interaction.user.id} sent message to team ${teamId}`);
}
