import { ButtonInteraction, ChannelType, ChatInputCommandInteraction } from "discord.js";
import { updateTeamMessage } from "../utils";
import logger from "../logger";
import Team from "../api/models/Team";
import Admin from "../api/models/Admin";
import { User } from "../api/models/User";

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

export async function handleJoin(interaction: ButtonInteraction, teamId: string) {
    const team = await Team.findOne({ teamId });
    if (!team) {
        await interaction.reply({ content: 'Ця команда більше не існує.', ephemeral: true });
        return;
    }

    const userId = interaction.user.id;
    const isUserInTeam = team.players.some(player => player.id === userId);
    const isUserInReserve = team.reserve.some(player => player.id === userId);

    if (isUserInTeam || isUserInReserve) {
        await interaction.reply({ content: 'Ви вже є учасником цієї команди або знаходитесь у черзі.', ephemeral: true });
        return;
    }

    let user = await User.findOne({ userId });
    if (!user) {
        user = new User({
            userId,
            username: interaction.user.username,
            displayName: interaction.user.displayName,
            games: [],
            teamHistory: []
        });
    }

    const isAdmin = await Admin.findOne({ userId });
    const newPlayer = {
        id: userId,
        name: interaction.user.username,
        isAdmin: !!isAdmin
    };

    const isTeamFull = team.players.length >= team.slots;
    const isReserveFull = team.reserve.length >= 2;

    if (!isTeamFull) {
        if (isAdmin) {
            team.players.unshift(newPlayer);
        } else {
            team.players.push(newPlayer);
        }
        await interaction.reply({ content: 'Ви приєдналися до команди.', ephemeral: true });
        logger.info(`User ${userId} ${interaction.user.username} joined team ${teamId}`);
    } else if (!isReserveFull) {
        if (isAdmin) {
            team.reserve.unshift(newPlayer);
        } else {
            team.reserve.push(newPlayer);
        }
        await interaction.reply({ content: 'Команда повна. Вас додано до черги.', ephemeral: true });
        logger.info(`User ${userId} ${interaction.user.username} joined queue of team ${teamId}`);
    } else {
        await interaction.reply({ content: 'На жаль, команда та черга вже повні.', ephemeral: true });
        return;
    }

    user.teamHistory.push({
        teamId: team.teamId,
        game: team.game,
        joinedAt: new Date(),
        isReserve: isTeamFull
    });

    await user.save();
    await team.save();
    await updateTeamMessage(interaction, teamId);
}

async function handleLeave(interaction: ButtonInteraction, teamId: string) {
    const team = await Team.findOne({ teamId });
    if (!team) {
        await interaction.reply({ content: 'Ця команда більше не існує.', ephemeral: true });
        return;
    }

    const user = await User.findOne({ userId: interaction.user.id });
    if (!user) {
        await interaction.reply({ content: 'Помилка: користувача не знайдено.', ephemeral: true });
        return;
    }

    const playerIndex = team.players.findIndex(player => player.id === interaction.user.id);
    const reserveIndex = team.reserve.findIndex(player => player.id === interaction.user.id);
    let wasInReserve = false;

    if (playerIndex === -1 && reserveIndex === -1) {
        await interaction.reply({ content: 'Ви не є учасником цієї команди.', ephemeral: true });
        return;
    }

    const isLeader = playerIndex === 0;
    const isLastPlayer = team.players.length === 1 && team.reserve.length === 0;

    if (isLeader && isLastPlayer) {
        // Лидер покидает пустую команду - расформировываем команду
        if (team.voiceChannelId) {
            await deleteVoiceChannel(interaction, team.voiceChannelId);
        }
        await Team.deleteOne({ teamId });
        await interaction.message.delete();
        await interaction.reply({ content: 'Ви покинули команду. Оскільки ви були єдиним гравцем, команду розформовано.', ephemeral: true });
        logger.info(`Team ${teamId} disbanded as leader ${interaction.user.id} left empty team`);
    } else {
        if (isLeader && team.players.length > 1) {
            team.players.splice(playerIndex, 1);
            const newLeaderIndex = Math.floor(Math.random() * team.players.length);
            const newLeader = team.players[newLeaderIndex];
            team.leader = newLeader.id;
            
            await interaction.client.users.cache.get(newLeader.id)?.send(`Ви стали новим лідером команди ${teamId}.`);
            logger.info(`User ${interaction.user.id} left team ${teamId} and leadership passed to ${newLeader.id}`);
        } else if (playerIndex !== -1) {
            team.players.splice(playerIndex, 1);
            if (team.reserve.length > 0) {
                const newPlayer = team.reserve.shift()!;
                team.players.push(newPlayer);
                await interaction.client.users.cache.get(newPlayer.id)?.send(`Вас переміщено з резерву до активного складу команди ${teamId}.`);
            }
        } else {
            team.reserve.splice(reserveIndex, 1);
            wasInReserve = true;
        }

        await team.save();
        await updateTeamMessage(interaction, teamId);

        const leaveMessage = wasInReserve ? 'Ви покинули резерв команди.' : 'Ви покинули команду.';
        await interaction.reply({ content: leaveMessage, ephemeral: true });
        logger.info(`User ${interaction.user.id} left ${wasInReserve ? 'reserve of ' : ''}team ${teamId}`);
    }

    const teamHistoryEntry = user.teamHistory.find(entry => entry.teamId === teamId && !entry.leftAt);
    if (teamHistoryEntry) {
        teamHistoryEntry.leftAt = new Date();
        await user.save();
    }
}

async function handleDisband(interaction: ButtonInteraction, teamId: string) {
    const team = await Team.findOne({ teamId });
    if (!team) {
        await interaction.reply({ content: 'Ця команда більше не існує.', ephemeral: true });
        return;
    }

    if (team.players[0].id !== interaction.user.id) {
        await interaction.reply({ content: 'Тільки лідер команди може розпустити команду.', ephemeral: true });
        return;
    }

    const now = new Date();

    // Обновляем историю команд для всех участников
    const allMembers = [...team.players, ...team.reserve];
    for (const member of allMembers) {
        const user = await User.findOne({ userId: member.id });
        if (user) {
            const teamHistoryEntry = user.teamHistory.find(entry => entry.teamId === teamId && !entry.leftAt);
            if (teamHistoryEntry) {
                teamHistoryEntry.leftAt = now;
                await user.save();
            }
        }
    }

    // Удаляем голосовой канал, если он существует
    if (team.voiceChannelId) {
        try {
            const channel = await interaction.client.channels.fetch(team.voiceChannelId);
            if (channel && channel.isVoiceBased() && channel.deletable) {
                await channel.delete();
                logger.info(`Deleted voice channel ${team.voiceChannelId} for team ${teamId}`);
            }
        } catch (error) {
            logger.error(`Failed to delete voice channel for team ${teamId}: ${error}`);
        }
    }

    await Team.deleteOne({ teamId });
    await interaction.message.delete();
    await interaction.reply({ content: 'Команду розпущено.', ephemeral: true });
    logger.info(`Team ${teamId} disbanded by ${interaction.user.id}`);
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
            const voiceChannel = await interaction.client.channels.fetch(team.voiceChannelId);
            if (voiceChannel) {
                await voiceChannel.delete();
                logger.info(`Deleted voice channel for disbanded team ${teamId}`);
            }
        } catch (error) {
            logger.error(`Failed to delete voice channel for team ${teamId}: ${error}`);
        }
    }

    await interaction.reply({ content: `Команду ${teamId} розпущено.`, ephemeral: true });
    logger.info(`Admin ${interaction.user.id} disbanded team ${teamId}`);

    // Отправляем сообщения всем участникам команды
    for (const player of [...team.players, ...team.reserve]) {
        try {
            const user = await interaction.client.users.fetch(player.id);
            await user.send(`Команду ${teamId} було розпущено адміністратором.`);
        } catch (error) {
            logger.error(`Failed to send disband notification to user ${player.id}: ${error}`);
        }
    }
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