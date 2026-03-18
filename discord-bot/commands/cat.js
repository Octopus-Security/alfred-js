const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const axios = require('axios');

const CAT_API_KEY = process.env.CAT_API_KEY || '';

module.exports = {
    data: new SlashCommandBuilder()
        .setName('cat')
        .setDescription('Get a random cat image and/or fact.')
        .addStringOption(option =>
            option.setName('type')
                .setDescription('What to show (default: both)')
                .setRequired(false)
                .addChoices(
                    { name: 'Image + Fact', value: 'both' },
                    { name: 'Image only', value: 'image' },
                    { name: 'Fact only', value: 'fact' },
                )),
    async execute(interaction) {
        await interaction.deferReply();

        const type = interaction.options.getString('type') || 'both';

        let imageUrl = null;
        let fact = null;

        try {
            if (type === 'image' || type === 'both') {
                const headers = CAT_API_KEY ? { 'x-api-key': CAT_API_KEY } : {};
                const res = await axios.get('https://api.thecatapi.com/v1/images/search?size=med&mime_types=jpg,png', { headers });
                imageUrl = res.data[0]?.url || null;
            }

            if (type === 'fact' || type === 'both') {
                const res = await axios.get('https://catfact.ninja/fact');
                fact = res.data?.fact || null;
            }
        } catch (err) {
            console.error('[cat] API error:', err.message);
            return interaction.editReply('Could not fetch cat content right now. Try again later.');
        }

        const embed = new EmbedBuilder()
            .setColor(0x1db954)
            .setTitle('🐱 Here\'s your cat!');

        if (fact) embed.setDescription(fact);
        if (imageUrl) embed.setImage(imageUrl);

        embed.setFooter({ text: 'Powered by thecatapi.com & catfact.ninja' });

        await interaction.editReply({ embeds: [embed] });
    },
};
