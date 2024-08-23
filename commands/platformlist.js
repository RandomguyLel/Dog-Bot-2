const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../config.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('platformlist')
    .setDescription('List all supported platforms and their conversions'),
  async execute(interaction) {
    try {
      const platform = config.platform;
      if (typeof platform !== 'object') {
        throw new Error('platform should be an object');
      }

      const embed = new EmbedBuilder()
        .setTitle('Currently added platforms')
        .setColor('#0099ff');

      for (const [name, conversion] of Object.entries(platform)) {
        embed.addFields({ name: name, value: `\`${conversion}\``, inline: false });
      }

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error('Error executing command platformlist:', error);
      await interaction.reply('There was an error executing the command.');
    }
  }
};
