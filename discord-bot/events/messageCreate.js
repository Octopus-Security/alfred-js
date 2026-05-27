const { Events } = require('discord.js');
const { askOctopusAI, conversations } = require('../commands/ai');

const AI_CHANNEL_NAME = process.env.AI_CHANNEL_NAME || 'octopus-ai';
const PREFIX = '!ai';

module.exports = {
  name: Events.MessageCreate,
  async execute(message) {
    // Ignore bots
    if (message.author.bot) return;

    const isDM = message.channel.type === 1; // DM channel
    const isAIChannel = message.channel.name === AI_CHANNEL_NAME;
    const hasPrefix = message.content.startsWith(PREFIX);

    // Respond in: DMs, #octopus-ai channel, or !ai prefix anywhere
    if (!isDM && !isAIChannel && !hasPrefix) return;

    let userMessage = message.content;
    if (hasPrefix) userMessage = message.content.slice(PREFIX.length).trim();
    if (!userMessage) return;

    // !reset clears history
    if (userMessage.toLowerCase() === 'reset') {
      conversations.delete(message.author.id);
      return message.reply('🔄 Conversation history cleared.');
    }

    // Show typing indicator
    try { await message.channel.sendTyping(); } catch {}

    try {
      const reply = await askOctopusAI(message.author.id, userMessage);
      // Split long replies
      const chunks = [];
      let text = reply;
      while (text.length > 0) {
        chunks.push(text.slice(0, 1900));
        text = text.slice(1900);
      }
      await message.reply(chunks[0]);
      for (let i = 1; i < chunks.length; i++) {
        await message.channel.send(chunks[i]);
      }
    } catch (err) {
      await message.reply(`❌ OctopusAI error: ${err.message}`);
    }
  },
};
