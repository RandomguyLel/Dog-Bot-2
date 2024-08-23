// commands/hello.js
const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('hello')
    .setDescription('Say hello to the dog!'),
  async execute(interaction) {
    await interaction.reply('Whoever summoned me is gay');
  },
};