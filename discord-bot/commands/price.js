const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const axios = require('axios');
require('dotenv').config({ path: '../../.env' }); // Adjust path to find .env in the root

module.exports = {
    data: new SlashCommandBuilder()
        .setName('price')
        .setDescription('Check the current price of a stock or crypto asset.')
        .addStringOption(option =>
            option.setName('ticker')
                .setDescription('The stock or crypto ticker (e.g., AAPL, BTC).')
                .setRequired(true)),

    async execute(interaction) {
        await interaction.deferReply();

        const ticker = interaction.options.getString('ticker').toUpperCase();
        const apiKey = process.env.FINNHUB_API_KEY;

        if (!apiKey) {
            return interaction.editReply({ content: 'The Finnhub API key is not configured. Please contact the bot owner.', ephemeral: true });
        }

        try {
            // Finnhub uses a different endpoint for crypto
            const isCrypto = ['BTC', 'ETH', 'XMR', 'ETC', 'LTC', 'DOGE', 'XRP'].includes(ticker);
            const symbol = isCrypto ? `BINANCE:${ticker}USDT` : ticker;

            const response = await axios.get(`https://finnhub.io/api/v1/quote`, {
                params: {
                    symbol: symbol,
                    token: apiKey
                }
            });

            const data = response.data;

            // Finnhub returns a current price of 0 for invalid tickers
            if (!data || data.c === 0) {
                return interaction.editReply({ content: `Could not find a price for the ticker **${ticker}**. Please check the ticker and try again.`, ephemeral: true });
            }

            const currentPrice = data.c;
            const change = data.d;
            const percentChange = data.dp;
            const color = change >= 0 ? 0x00FF00 : 0xFF0000; // Green for up, red for down
            const trendEmoji = change >= 0 ? '📈' : '📉';

            const embed = new EmbedBuilder()
                .setColor(color)
                .setTitle(`${trendEmoji} Price for ${ticker}`)
                .addFields(
                    { name: 'Current Price', value: `$${currentPrice.toFixed(2)}`, inline: true },
                    { name: 'Change', value: `${change.toFixed(2)}`, inline: true },
                    { name: 'Percent Change', value: `${percentChange.toFixed(2)}%`, inline: true },
                    { name: 'Previous Close', value: `$${data.pc.toFixed(2)}`, inline: true },
                    { name: 'Day High', value: `$${data.h.toFixed(2)}`, inline: true },
                    { name: 'Day Low', value: `$${data.l.toFixed(2)}`, inline: true }
                )
                .setFooter({ text: 'Data provided by Finnhub.io' })
                .setTimestamp();
            
            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error(`Error fetching price for ${ticker}:`, error);
            await interaction.editReply({ content: 'An error occurred while fetching the price data. The API might be temporarily unavailable.', ephemeral: true });
        }
    },
};