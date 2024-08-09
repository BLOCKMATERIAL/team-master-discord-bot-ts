import { ChatInputCommandInteraction, ChannelType } from "discord.js";
import logger from "../logger";

export async function handleCreateVoiceCommand(interaction: ChatInputCommandInteraction) {
    const channelName = interaction.options.getString('name', true);
    const userLimit = interaction.options.getInteger('limit') || undefined;

    if (!interaction.guild) {
        await interaction.reply({ content: 'Ця команда може бути використана тільки на сервері.', ephemeral: true });
        return;
    }

    try {
        const voiceChannel = await interaction.guild.channels.create({
            name: channelName,
            type: ChannelType.GuildVoice,
            userLimit: userLimit ? userLimit + 2 : undefined,
        });

        logger.info(`Created voice channel: ${voiceChannel.id} by ueer ${interaction.user.id} for team ${channelName}`);
        await interaction.reply({ content: `Голосовий канал "${channelName}" створено успішно!`, ephemeral: true });
    } catch (error) {
        logger.error(`Failed to create voice channel: ${error}`);
        await interaction.reply({ content: 'Не вдалося створити голосовий канал. Будь ласка, спробуйте ще раз пізніше.', ephemeral: true });
    }
}