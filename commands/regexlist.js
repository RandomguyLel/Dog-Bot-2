const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../config.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('regexlist')
    .setDescription('List all supported platforms and their regex patterns'),
  async execute(interaction) {
    try {
      const regexPatterns = config.regexPatterns;
      if (typeof regexPatterns !== 'object') {
        throw new Error('regexPatterns should be an object');
      }

      const embed = new EmbedBuilder()
        .setTitle('Currently added platforms')
        .setColor('#0099ff');

      for (const [name, pattern] of Object.entries(regexPatterns)) {
        embed.addFields({ name: name, value: `\`${pattern}\``, inline: false });
      }

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error('Error executing command regexlist:', error);
      await interaction.reply('There was an error executing the command.');
    }
  }
};
