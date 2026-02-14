const fs = require('fs');
const path = require('path');
const axios = require('axios');
const cheerio = require('cheerio');
const { MessageFlags } = require('discord.js');

const CONFIG_PATH = path.join(__dirname, 'config.json');
const IS_COMPONENTS_V2 = 1 << 15; // 32768 — Discord Components V2 message flag

const MOBILE_URL_REGEX = /https?:\/\/m\.ss\.com\/\S+/;
const NORMAL_URL_REGEX = /https?:\/\/(?:www\.)?ss\.com\/\S+/;

const KEYWORDS = ['VIN kods:', 'Valsts numura zīme:', 'Parādīt vin kodu', 'Aprēķināt apdrošināšanu'];

const SPEC_LABEL_STARTERS = [
  'Marka:', 'Izlaiduma gads:', 'Motors:', 'Ātrumkārba:', 'Nobraukums', 'Krāsa:',
  'Virsbūves tips:', 'Tehniskā apskate:', 'Dzinēja tilpums:', 'Durvju skaits:', 'Vietu skaits:', 'Cena:'
];

function limitDescriptionByKeywords(text, keywords) {
  for (const keyword of keywords) {
    const index = text.indexOf(keyword);
    if (index !== -1) return text.substring(0, index + keyword.length);
  }
  return text;
}

/**
 * Handle ss.com listing links: scrape page and send Components V2 message with description + media gallery.
 * @param {Message} message - Discord message
 * @returns {Promise<boolean>} - true if message was an ss.com link and was handled
 */
async function handleSsComMessage(message) {
  let match = message.content.match(NORMAL_URL_REGEX);
  if (!match) {
    match = message.content.match(MOBILE_URL_REGEX);
    if (match) match[0] = match[0].replace('https://m.ss.com', 'https://www.ss.com');
  }
  if (!match) return false;

  const url = match[0];
  const author = message.author.username;
  const beforeText = message.content.split(url)[0].trim();
  let afterText = message.content.split(url)[1]?.trim();
  if (afterText === undefined) afterText = ' ';

  try {
    const { data } = await axios.get(url);
    const $ = cheerio.load(data);
    const title = $('title').text();

    let description = $('#msg_div_msg').text().trim() || 'No description available';
    let lines = description
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(line => line.length > 0);

    const firstSpecIndex = lines.findIndex(line => {
      const t = line.trim();
      return SPEC_LABEL_STARTERS.some(start => t === start || t.startsWith(start + ' '));
    });
    if (firstSpecIndex > 0) {
      lines = [...lines.slice(0, firstSpecIndex), '', ...lines.slice(firstSpecIndex)];
    }
    description = lines.join('\n');
    description = limitDescriptionByKeywords(description, KEYWORDS);
    const maxDescriptionLength = 3950;
    if (description.length > maxDescriptionLength) {
      description = description.substring(0, maxDescriptionLength) + '...';
    }

    const scraperCfg = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
    const imageLimit = Math.min(10, Math.max(1, parseInt(scraperCfg.ssScraperImageLimit, 10) || 10));
    const images = [];

    $('img').each((i, elem) => {
      if (images.length >= imageLimit) return false;
      let src = $(elem).attr('src');
      if (src && src.includes('gallery') && src.endsWith('.jpg')) {
        src = src.replace('.t.jpg', '.800.jpg');
        images.push(new URL(src, url).href);
      }
    });

    if (images.length === 0) {
      images.push('https://httpstatusdogs.com/img/404.jpg');
    }

    const TEXT_DISPLAY_MAX = 4000;
    const header = `Posted by: **${author}**\n${beforeText ? `${beforeText} ` : ''}${afterText ? afterText : ''}`.trim();
    const titleLine = `**[${title}](${url})**`;
    let bodyText = [header, titleLine, '', description].join('\n');
    if (bodyText.length > TEXT_DISPLAY_MAX) {
      bodyText = bodyText.slice(0, TEXT_DISPLAY_MAX - 3) + '...';
    }

    const components = [
      { type: 10, content: bodyText },
      { type: 12, items: images.slice(0, imageLimit).map(img => ({ media: { url: img } })) },
      { type: 1, components: [{ type: 2, style: 5, label: 'View listing', url }] }
    ];

    await message.delete();
    await message.channel.send({
      flags: [IS_COMPONENTS_V2 | MessageFlags.SuppressNotifications],
      components
    });
    return true;
  } catch (error) {
    console.error('Error scraping the webpage:', error);
    await message.channel.send('Failed to scrape the webpage.').catch(() => {});
    return true;
  }
}

module.exports = { handleSsComMessage };
