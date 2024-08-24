const { Client, GatewayIntentBits, Collection, EmbedBuilder} = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});
require('dotenv').config();
//require('log-timestamp');
const fs = require('fs');
const config = require("./config.json");
//const { platform } = require('os');
//Web scraping stuff
const axios = require('axios');
const cheerio = require('cheerio');
const { isUndefined } = require('util');

const TOKEN = process.env.DISCORD_TOKEN;
//const GUILD = process.env.DISCORD_GUILD;

client.on('ready', async() => 
{
  console.log('Bot is online!');
  client.user.setActivity('DogBot v2 Beta');
  //const guild = client.guilds.cache.find(guild => guild.name === GUILD);

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


client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;
    
    const { commandName } = interaction;
    const command = client.commands.get(commandName);
    
    if (!command) return;
    
     try {
    console.log(`Executing command: ${commandName} by ${interaction.user.tag} (ID: ${interaction.user.id})`);
    await command.execute(interaction);
    console.log(`Command executed: ${commandName} by ${interaction.user.tag}`);
  } catch (error) {
    console.error(`Error executing command ${commandName}:`, error);
    await interaction.reply({ content: 'An error occurred while executing this command.', ephemeral: true });
  }
});


client.commands = new Collection();
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));
for (const file of commandFiles)
{
    const command = require(`./commands/${file}`);
    client.commands.set(command.data.name, command);
}


// Social Link Converter stuff start //

client.on('messageCreate', async message => {
  if (message.author.bot) return;

  const regexPatterns = config.regexPatterns;
  const platforms = config.platform;
  let modifiedLink = null;
  //console.log("message detected:", message.content);
  for (const [key, pattern] of Object.entries(regexPatterns)) {
    const regex = new RegExp(pattern);
    //console.log("testing for pattern:", pattern);
    if (regex.test(message.content)) {
      console.log('message valid for pattern:', pattern, 'converting start');
      const match = message.content.match(regex);
      if (match) {
        const originalLink = match[0];
        const replacement = platforms[key];
        //console.log('originalLink:', originalLink);
        //console.log('replacement:', replacement);
        // Adjust the regex to capture the domain and path separately
        const domainRegex = new RegExp(`(https?://(?:[a-zA-Z0-9-]+\\.)?)(${key}\\.com)(/\\S*)`);

        //console.log('domainRegex:', domainRegex);
        modifiedLink = originalLink.replace(domainRegex, `$1${replacement}$3`);
        //console.log('modifiedLink:', modifiedLink);
        message.content = message.content.replace(originalLink, modifiedLink);
      }
      break;
    }
  }

  if (modifiedLink) {
    const author = message.author.username;
    const textBeforeLink = message.content.split(modifiedLink)[0];
    const textAfterLink = message.content.split(modifiedLink)[1];

    const trimmedTextBeforeLink = textBeforeLink ? textBeforeLink.trim() : '';
    const trimmedTextAfterLink = textAfterLink ? textAfterLink.trim() : '';

    // Known issue: if link contains underscore, it messes up whole hyperlink formatting

    await message.delete();
    const sentMessage = await message.channel.send({
      content: `Posted by ${author}: ${trimmedTextBeforeLink} ${trimmedTextAfterLink}\n[Media](${modifiedLink})`,
      flags: [4096]
    })
    const messageId = sentMessage.id;

    // Check if embed is created within 10 seconds
    setTimeout(async () => {
      const fetchedMessage = await message.channel.messages.fetch(messageId);
      if (fetchedMessage.embeds.length === 0) {
        console.log('Embed not created, retrying...');
        const retryLink = `${modifiedLink}?embed-retry`;
        await fetchedMessage.delete();
        await message.channel.send({
        content: `(:arrows_counterclockwise:Embed retry) Posted by ${author}: ${trimmedTextBeforeLink} ${trimmedTextAfterLink}\n[Media](${retryLink})`,
        flags: [4096]
        })
      }
      else console.log('Embed success')
    }, 10000); // 10 seconds
    
  }
     
});

client.on('messageCreate', async message => {
    if (message.author.bot) return;
    if (message.content.startsWith('dirst')) {
    await message.channel.send('nedirsies daudz te ja');
  }

  if (message.content.startsWith('pips')) {
    await message.channel.send('pats ne labaks');
  }
});



//Website scraping experiment

client.on('messageCreate', async message => {
  const mobileUrlRegex = /https?:\/\/m\.ss\.com\/\S+/ ;
  const normalurlRegex = /https?:\/\/(?:www\.)?ss\.com\/\S+/;
  let match = message.content.match(normalurlRegex);
  const author = message.author.username;
  
  if (!match) {
      console.log('checking if mobile link');
      match = message.content.match(mobileUrlRegex);
      if (match) {
          // Replace mobile URL with normal URL
        console.log('indeed is mobile link')
        match[0] = match[0].replace('https://m.ss.com', 'https://www.ss.com');
        console.log(`message: ${message.content}`);
      }
    }
    if (match) {
        try {
            const url = match[0];
          const { data, original_url } = await axios.get(url);
            const $ = cheerio.load(data);

            const title = $('title').text();
            const keywords = ['VIN kods:', 'Valsts numura zīme:', 'Parādīt vin kodu', 'Aprēķināt apdrošināšanu']; // Add your specific keywords here
        
          // Extract text before and after the link
          const beforeText = message.content.split(url)[0].trim();
          let afterText = message.content.split(url)[1]?.trim();
          if (afterText === undefined){afterText = (` `)};

            const limitDescriptionByKeywords = (text, keywords) => {
                for (const keyword of keywords) {
                    const index = text.indexOf(keyword);
                    if (index !== -1) {
                        return text.substring(0, index + keyword.length);
                    }
                }
                return text;
            };

            let description = $('#msg_div_msg').text().trim() || 'No description available'; 

            // Limit the description by keywords
            description = limitDescriptionByKeywords(description, keywords);           
            const maxDescriptionLength = 5000; // Limit the description to 5500 characters
            if (description.length > maxDescriptionLength) {
                description = description.substring(0, maxDescriptionLength) + '...';
            }
          const images = [];
          
            $('img').each((i, elem) => {
              if (images.length >= 4) return false; // Stop collecting images after the first 4
              let src = $(elem).attr('src');

              if (src && src.includes('gallery') && src.endsWith('.jpg')) {
                  src = src.replace('.t.jpg', '.800.jpg');
                images.push(new URL(src, url).href);
              }
            });

            if (images.length === 0) {
                images.push('https://httpstatusdogs.com/img/404.jpg'); // Provide a default image URL if no image is found
            }
            
            const mainEmbed = new EmbedBuilder()
                .setAuthor({ name: `Posted by: ${author}\n${beforeText} ${afterText}` })
                .setTitle(`${title}`)
                .setDescription(description)
                .setURL(url)
                .setColor(0x00AE86);

            const imageEmbeds = images.map(image => {
                return new EmbedBuilder()
                    .setImage(image)
                    .setURL(url)
                    .setColor(0x00AE86);
            });

            const embeds = [mainEmbed, ...imageEmbeds];
            await message.delete();
            await message.channel.send({ embeds, flags: [4096] });
        } catch (error) {
            console.error('Error scraping the webpage:', error);
            await message.channel.send('Failed to scrape the webpage.');
        }
    }
});

client.login(TOKEN);
