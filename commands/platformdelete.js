const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');
const fs = require('fs');
let config = require('../config.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('platformdelete')
    .setDescription('Remove a platform for link conversion')
    .addStringOption(option => option.setName('name').setDescription('Name of the platform to remove').setRequired(true)),
  async execute(interaction) {
    // Check if the user has the "Manage Server" permission
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
      return interaction.reply('You do not have permission to use this command.');
    }
      console.log("startin del interaction");
    const name = interaction.options.getString('name');

    if (config.regexPatterns[name]) {
      delete config.regexPatterns[name];
      delete config.platformp[name];
      fs.writeFileSync('./config.json', JSON.stringify(config, null, 2));
      await interaction.reply(`Removed regex pattern for platform: ${name}`);
    } else
    {
      await interaction.reply(`Platform ${name} does not exist.`);
    }
  },
};
