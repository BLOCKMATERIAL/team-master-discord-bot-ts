import { REST, Routes, SlashCommandBuilder, Client } from 'discord.js';

const commands = [
    new SlashCommandBuilder()
        .setName('create')
        .setDescription('Створити нову команду')
        .toJSON(),
    new SlashCommandBuilder()
        .setName('kick')
        .setDescription('Вигнати гравця з команди')
        .addUserOption(option => 
            option.setName('player')
                .setDescription('Гравець, якого потрібно вигнати')
                .setRequired(true))
        .toJSON(),
    new SlashCommandBuilder()
        .setName('help')
        .setDescription('Показати довідку по командам бота')
        .toJSON(),
    // Temp disable need clarify requirements
    // new SlashCommandBuilder()
    //     .setName('createvoice')
    //     .setDescription('Створити голосовий канал для команди')
    //     .addStringOption(option =>
    //         option.setName('name')
    //             .setDescription('Назва голосового каналу')
    //             .setRequired(true))
    //     .addIntegerOption(option =>
    //         option.setName('limit')
    //             .setDescription('Обмеження кількості користувачів (опціонально)')
    //             .setRequired(false))
    //     .toJSON(),
];

export async function registerCommands(client: Client) {
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN!);

    try {
        console.log('Почали оновлення команд додатка (/) .');

        await rest.put(
            Routes.applicationCommands(client.user!.id),
            { body: commands },
        );

        console.log('Успішно оновили команди додатка (/) .');
    } catch (error) {
        console.error(error);
    }
}