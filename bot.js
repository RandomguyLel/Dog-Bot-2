const { Client, Intents } = require('discord.js');
const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES] });
require('dotenv').config();
require('log-timestamp');
const fs = require('fs');
const config = require("./config.json");
const regexInstagram = /(https:\/\/www\.instagram\.com\/\S+)/;
const regexTwitter = /(https:\/\/twitter\.com\/\S+)/;
const regexTikTok = /(https?:\/\/(?:www\.)?tiktok\.com\/\S+)/;

const TOKEN = process.env.DISCORD_TOKEN;
const GUILD = process.env.DISCORD_GUILD;

client.on('ready', async() => 
{
    client.user.setActivity('Woof woof Im a dog - Local JS edition');
    const guild = client.guilds.cache.find(guild => guild.name === GUILD);

    try
    {
        await client.application?.commands.set(client.commands.map(command => command.data));
        console.log('Slash commands registered!');
    } 
    catch (error) 
    {
    console.error('Failed to register slash commands:', error);
    }
});

client.on('messageCreate', async message => {
 if (message.author.bot) console.log('Dog did stuff',author.user.name);
});

client.on('interaction', async interaction => {
    if (!interaction.isCommand()) return;
    
    const { commandName } = interaction;
    const command = client.commands.get(commandName);
    
    if (!command) return;
    
    try {
     await command.execute(interaction);
    } catch (error) {
     console.error(error);
     await interaction.reply({ content: 'An error occurred while executing this command.', ephemeral: true });
    }
    });


client.commands = new Discord.Collection();
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));
for (const file of commandFiles)
{
    const command = require(`./commands/${file}`);
    client.commands.set(command.data.name, command);
}


client.login(TOKEN);
