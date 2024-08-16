import { Client, REST, Routes, SlashCommandBuilder } from 'discord.js';

const commands = [
  new SlashCommandBuilder()
    .setName('create')
    .setDescription('Створити нову команду')
    .toJSON(),
  new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Вигнати гравця з команди')
    .addUserOption((option) =>
      option
        .setName('player')
        .setDescription('Гравець, якого потрібно вигнати')
        .setRequired(true),
    )
    .toJSON(),
  new SlashCommandBuilder()
    .setName('help')
    .setDescription('Показати довідку по командам бота')
    .toJSON(),
  new SlashCommandBuilder()
    .setName('invite')
    .setDescription('Запросити гравця до команди')
    .addUserOption((option) =>
      option
        .setName('player')
        .setDescription('Гравець, якого потрібно запросити')
        .setRequired(true),
    )
    .toJSON(),
  new SlashCommandBuilder()
    .setName('games')
    .setDescription('Вибрати ігри, в які ви граєте')
    .toJSON(),
  new SlashCommandBuilder()
    .setName('disband')
    .setDescription('Розпустити команду (тільки для адміністраторів)')
    .addStringOption((option) =>
      option
        .setName('team_id')
        .setDescription('ID команди для розпуску')
        .setRequired(true),
    )
    .toJSON(),
  new SlashCommandBuilder()
    .setName('message')
    .setDescription(
      'Надіслати повідомлення команді (тільки для адміністраторів)',
    )
    .addStringOption((option) =>
      option.setName('team_id').setDescription('ID команди').setRequired(true),
    )
    .addStringOption((option) =>
      option
        .setName('message')
        .setDescription('Повідомлення для команди')
        .setRequired(true),
    )
    .toJSON(),
];

export async function registerCommands(client: Client) {
  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN!);

  try {
    console.log('Почали оновлення команд додатка (/) .');

    await rest.put(Routes.applicationCommands(client.user!.id), {
      body: commands,
    });

    console.log('Успішно оновили команди додатка (/) .');
  } catch (error) {
    console.error(error);
  }
}
