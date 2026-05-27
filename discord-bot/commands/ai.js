const { SlashCommandBuilder } = require('discord.js');

const OCTOPUS_AI_URL = process.env.OCTOPUS_AI_URL || 'http://octopus-ai:4000';

// Per-user conversation history (in-memory, resets on restart)
const conversations = new Map();

async function askOctopusAI(userId, message) {
  const history = conversations.get(userId) || [];
  history.push({ role: 'user', content: message });

  // Keep last 20 messages
  if (history.length > 20) history.splice(0, history.length - 20);

  const res = await fetch(`${OCTOPUS_AI_URL}/v1/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'auto',
      messages: history,
      chat_id: `discord-${userId}`,
    }),
    signal: AbortSignal.timeout(60_000),
  });

  if (!res.ok) throw new Error(`OctopusAI error: ${res.status}`);
  const data = await res.json();
  const reply = data.choices?.[0]?.message?.content || '(no response)';

  history.push({ role: 'assistant', content: reply });
  conversations.set(userId, history);

  return reply;
}

function chunkMessage(text, maxLen = 1900) {
  const chunks = [];
  while (text.length > 0) {
    chunks.push(text.slice(0, maxLen));
    text = text.slice(maxLen);
  }
  return chunks;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ai')
    .setDescription('Talk to OctopusAI — your server intelligence')
    .addStringOption(opt =>
      opt.setName('message')
        .setDescription('What do you want to ask?')
        .setRequired(true)
    )
    .addBooleanOption(opt =>
      opt.setName('reset')
        .setDescription('Reset conversation history')
        .setRequired(false)
    ),

  async execute(interaction) {
    const message = interaction.options.getString('message');
    const reset = interaction.options.getBoolean('reset') ?? false;

    if (reset) conversations.delete(interaction.user.id);

    await interaction.deferReply();

    try {
      const reply = await askOctopusAI(interaction.user.id, message);
      const chunks = chunkMessage(reply);
      await interaction.editReply(chunks[0]);
      for (let i = 1; i < chunks.length; i++) {
        await interaction.followUp(chunks[i]);
      }
    } catch (err) {
      await interaction.editReply(`❌ OctopusAI error: ${err.message}`);
    }
  },

  // Exported for use by message handler
  askOctopusAI,
  conversations,
};
