import { ChannelType, ModalSubmitInteraction } from "discord.js";
import { createTeamButtons, createTeamEmbed, findOrCreateGamesCategory, generateTeamId, getGameNameByValue, isPositiveResponse, teams } from "../utils";
import { logger } from "..";

export async function handleModalSubmit(interaction: ModalSubmitInteraction) {
    if (interaction.customId.startsWith('create_team_modal_')) {
        const game = interaction.customId.split('_').pop()!;
        const slotsInput = interaction.fields.getTextInputValue('slots_input');
        const startTimeInput = interaction.fields.getTextInputValue('start_time_input');
        const notesInput = interaction.fields.getTextInputValue('notes_input');
        const slots = parseInt(slotsInput);

        if (isNaN(slots) || slots < 2 || slots > 10) {
            await interaction.reply({ content: 'Невірна кількість гравців. Будь ласка, введіть число від 2 до 10.', ephemeral: true });
            return;
        }

        let startTime: string | undefined;
        if (startTimeInput) {
            const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
            if (!timeRegex.test(startTimeInput)) {
                await interaction.reply({ content: 'Невірний формат часу. Використовуйте формат HH:MM.', ephemeral: true });
                return;
            }
            startTime = startTimeInput;
        }
        const teamId = generateTeamId();
        const createVoiceChannelInput = interaction.fields.getTextInputValue('create_voice_channel_input');
        const shouldCreateVoiceChannel = isPositiveResponse(createVoiceChannelInput);
        let voiceChannelId: string | undefined;

        if (shouldCreateVoiceChannel && interaction.guild) {
            try {
                const gamesCategory = await findOrCreateGamesCategory(interaction.guild);
                const voiceChannel = await interaction.guild.channels.create({
                    name: `Team ${teamId} - Voice`,
                    type: ChannelType.GuildVoice,
                    userLimit: slots,
                    parent: gamesCategory ? gamesCategory.id : undefined
                });
                voiceChannelId = voiceChannel.id;
                logger.info(`Created voice channel for team ${teamId} in ${gamesCategory ? 'GAMES category' : 'server root'}: ${voiceChannelId}`);
            } catch (error) {
                logger.error(`Failed to create voice channel for team ${teamId}: ${error}`);
            }
        }

        logger.info(`User ${interaction.user.id} created a team for game ${game} with ${slots} slots${startTime ? `, starting at ${startTime}` : ''}${notesInput ? ' with notes' : ''}`);
        
        teams[teamId] = {
            id: teamId,
            leader: interaction.user.id,
            players: [interaction.user.id],
            reserve: [],
            createdAt: new Date(),
            startTime,
            voiceChannelId,
            notes: notesInput || undefined,
            channelId: interaction.channelId!,
            messageId: '',
            slots: slots,
            game: game
        };

        const embed = createTeamEmbed(teamId);
        const row = createTeamButtons(teamId);

        const replyContent = `🎉 Гравець ${interaction.user} створив команду для гри ${getGameNameByValue(game)} з ${slots} слотами!${startTime ? ` Початок гри о ${startTime}.` : ''} @everyone`;

        const reply = await interaction.reply({
            content: replyContent,
            embeds: [embed],
            components: [row],
            fetchReply: true,
        });

        if ('id' in reply) {
            teams[teamId].messageId = reply.id;
        }
    }
}
