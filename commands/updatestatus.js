const { SlashCommandBuilder} = require('discord.js');
const fs = require('fs');
let config = require('../config.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('updatestatus')
        .setDescription('Update the bot status')
        .addStringOption(option =>
            option.setName('status')
                .setDescription('The new status message')
                .setRequired(true)
        ),
    async execute(interaction, client) {
        // Check if the user is the bot owner
        if (interaction.user.id !== config.ownerId) {
            return interaction.reply('Only the bot owner can use this command. womp womp');
        }
        
        const newStatus = interaction.options.getString('status');
        
        // Update the status in config.json
        config.status = newStatus;
        fs.writeFileSync('./config.json', JSON.stringify(config, null, 2));
        
        // Set the new status
        client.user.setActivity(newStatus);
        
        await interaction.reply(`Status updated to: ${newStatus}`);
    },
};