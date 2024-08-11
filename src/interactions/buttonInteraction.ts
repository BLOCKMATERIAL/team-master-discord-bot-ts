import { ButtonInteraction, ChannelType, ChatInputCommandInteraction } from "discord.js";
import { updateTeamMessage } from "../utils";
import logger from "../logger";
import Team from "../api/models/User";
import Admin from "../api/models/Admin";

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

async function handleJoin(interaction: ButtonInteraction, teamId: string) {
    const team = await Team.findOne({ teamId });
    if (!team) {
        await interaction.reply({ content: 'Ця команда більше не існує.', ephemeral: true });
        return;
    }

    const isAdmin = await Admin.findOne({ userId: interaction.user.id });
    const newPlayer = {
        id: interaction.user.id,
        name: interaction.user.username,
        isAdmin: !!isAdmin
    };

    if (team.players.length < team.slots) {
        if (isAdmin) {
            team.players.unshift(newPlayer);
        } else {
            team.players.push(newPlayer);
        }
        await interaction.reply({ content: 'Ви приєдналися до команди.', ephemeral: true });
    } else if (team.reserve.length < 2) {
        if (isAdmin) {
            team.reserve.unshift(newPlayer);
        } else {
            team.reserve.push(newPlayer);
        }
        await interaction.reply({ content: 'Команда повна. Вас додано до резерву.', ephemeral: true });
    } else {
        await interaction.reply({ content: 'На жаль, команда та резерв уже повні.', ephemeral: true });
        return;
    }

    await team.save();
    await updateTeamMessage(interaction.client, teamId);
}

async function handleLeave(interaction: ButtonInteraction, teamId: string) {
    const team = await Team.findOne({ teamId });
    if (!team) {
        await interaction.reply({ content: 'Ця команда більше не існує.', ephemeral: true });
        logger.info(`User ${interaction.user.id} ${interaction.user.username} tried to leave team ${teamId} but team does not exist`);
        return;
    }

    if (!team.players.some(p => p.id === interaction.user.id) && !team.reserve.some(p => p.id === interaction.user.id)) {
        await interaction.reply({ content: 'Ви не є учасником цієї команди.', ephemeral: true });
        logger.info(`User ${interaction.user.id} ${interaction.user.username} tried to leave team ${teamId} but is not a member`);
        return;
    }

    const isLeader = team.leader === interaction.user.id;
    const wasInReserve = team.reserve.some(p => p.id === interaction.user.id);

    if (isLeader) {
        if (team.players.length === 1) {
            if (team.voiceChannelId) {
                await deleteVoiceChannel(interaction, team.voiceChannelId);
            }
            await Team.deleteOne({ teamId });
            await interaction.message.delete();
            await interaction.reply({ content: 'Ви покинули команду. Оскільки ви були єдиним гравцем, команду розформовано.', ephemeral: true });
            logger.info(`User ${interaction.user.id} ${interaction.user.username} disbanded team by leave command ${teamId}`);
            return;
        } else {
            const newLeaderIndex = team.players.findIndex(p => p.id !== interaction.user.id);
            if (newLeaderIndex !== -1) {
                team.leader = team.players[newLeaderIndex].id;
                await interaction.client.users.cache.get(team.leader)?.send(`Ви стали новим лідером команди ${teamId}.`);
                logger.info(`User ${interaction.user.id} ${interaction.user.username} left team ${teamId} and passed leadership to ${team.leader}`);
            }
        }
    }

    team.players = team.players.filter(p => p.id !== interaction.user.id);
    team.reserve = team.reserve.filter(p => p.id !== interaction.user.id);


    if (!wasInReserve && team.reserve.length > 0 && team.players.length < team.slots) {
        const newPlayer = team.reserve.shift()!;
        team.players.push(newPlayer);
        await interaction.client.users.cache.get(newPlayer.id)?.send(`Вас переміщено з резерву до активного складу команди ${teamId}.`);
    }

    await team.save();
    await updateTeamMessage(interaction.client, teamId);
    
    const leaveMessage = isLeader 
        ? 'Ви покинули команду і передали роль лідера іншому гравцю.' 
        : (wasInReserve ? 'Ви покинули резерв команди.' : 'Ви покинули команду.');
    await interaction.reply({ content: leaveMessage, ephemeral: true });
}
async function handleDisband(interaction: ButtonInteraction, teamId: string) {
    const team = await Team.findOne({ teamId });
    if (!team) {
        await interaction.reply({ content: 'Ця команда більше не існує.', ephemeral: true });
        return;
    }

    if (team.leader !== interaction.user.id) {
        await interaction.reply({ content: 'Тільки лідер команди може розпустити команду.', ephemeral: true });
        return;
    }

    let voiceChannelDeleted = false;
    if (team.voiceChannelId) {
        voiceChannelDeleted = await deleteVoiceChannel(interaction, team.voiceChannelId);
    }

    team.status = 'disbanded';
    await team.save();

    try {
        const channel = await interaction.client.channels.fetch(team.channelId);
        if (channel?.isTextBased() && team.messageId) {
            const message = await channel.messages.fetch(team.messageId);
            await message.delete();
        }
    } catch (error) {
        logger.error(`Failed to delete team message: ${error}`);
    }

    const replyContent = voiceChannelDeleted
        ? 'Команду розпущено, і голосовий канал видалено.'
        : 'Команду розпущено.';
    await interaction.reply({ content: replyContent, ephemeral: true });
}
export async function handleDisbandAdmin(interaction: ChatInputCommandInteraction) {
    const isAdmin = await Admin.findOne({ userId: interaction.user.id });
    if (!isAdmin) {
        await interaction.reply({ content: 'Ця команда доступна тільки для адміністраторів.', ephemeral: true });
        return;
    }

    const teamId = interaction.options.getString('team_id');
    if (!teamId) {
        await interaction.reply({ content: 'Будь ласка, вкажіть ID команди.', ephemeral: true });
        return;
    }

    const team = await Team.findOne({ teamId });
    if (!team) {
        await interaction.reply({ content: 'Команду не знайдено.', ephemeral: true });
        return;
    }

    await Team.deleteOne({ teamId });
    await interaction.reply({ content: `Команду ${teamId} розпущено.`, ephemeral: true });
    logger.info(`Admin ${interaction.user.id} disbanded team ${teamId}`);
}

async function deleteVoiceChannel(interaction: ButtonInteraction, channelId: string): Promise<boolean> {
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