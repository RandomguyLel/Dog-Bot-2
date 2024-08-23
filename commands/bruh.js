// commands/bruh.js
const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('bruh')
    .setDescription('Send a "bruh" gif.'),
  async execute(interaction) {
    await interaction.reply('https://tenor.com/view/bruh-bye-ciao-gif-5156041');
  },
};
