const { SlashCommandBuilder } = require('discord.js');
const axios = require('axios');

const tickerIds = {
    btc: 90,
    xmr: 28,
    eth: 80,
    ethc: 118,
    ltc: 1,
    doge: 2,
    xrp: 58,
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('crypto')
        .setDescription('Gets cryptocurrency price from CoinLore.')
        .addStringOption(option =>
            option.setName('ticker')
                .setDescription('The cryptocurrency ticker (btc, xmr, eth, ethc, ltc, doge, xrp).')
                .setRequired(true)
                .addChoices(
                    { name: 'Bitcoin (BTC)', value: 'btc' },
                    { name: 'Monero (XMR)', value: 'xmr' },
                    { name: 'Ethereum (ETH)', value: 'eth' },
                    { name: 'Ethereum Classic (ETC)', value: 'ethc' },
                    { name: 'Litecoin (LTC)', value: 'ltc' },
                    { name: 'Dogecoin (DOGE)', value: 'doge' },
                    { name: 'Ripple (XRP)', value: 'xrp' },
                )),
    async execute(interaction) {
        const ticker = interaction.options.getString('ticker').toLowerCase();
        const currencyId = tickerIds[ticker];

        if (!currencyId) {
            return interaction.reply("Invalid ticker symbol. Please choose from the available options.");
        }

        try {
            const apiUrl = `https://api.coinlore.net/api/ticker/?id=${currencyId}`;

            const response = await axios.get(apiUrl);
            const cryptoJson = response.data;

            if (!cryptoJson || cryptoJson.length === 0) {
                return interaction.reply(`Could not retrieve data for ${ticker.toUpperCase()} from CoinLore.`);
            }

            const cryptoData = cryptoJson[0];
            const cryptoEmb = {
                title: cryptoData.name,
                color: 0x000000, // Black color code
                fields: [
                    {
                        name: "Ticker",
                        value: cryptoData.symbol,
                        inline: true,
                    },
                    {
                        name: "USD Price",
                        value: cryptoData.price_usd,
                        inline: true,
                    },
                    {
                        name: "24hr change",
                        value: `${cryptoData.percent_change_24h}%`,
                        inline: true,
                    },
                    {
                        name: "7d change",
                        value: `${cryptoData.percent_change_7d}%`,
                        inline: true,
                    },
                ],
            };

            await interaction.reply({ embeds: [cryptoEmb] });

        } catch (error) {
            console.error(`Error getting ${ticker.toUpperCase()} data:`, error);

            if (error.response) {
                console.error("Response data:", error.response.data);
                console.error("Response status:", error.response.status);
                console.error("Response headers:", error.response.headers);
                await interaction.reply(`CoinLore API Error: ${error.response.status}`);
            } else if (error.request) {
                console.error("Request:", error.request);
                await interaction.reply("No response received from the CoinLore API. Please try again later.");
            } else {
                console.error('Error message:', error.message);
                await interaction.reply("There was an error setting up the request to CoinLore. Please try again later.");
            }
        }
    },
};