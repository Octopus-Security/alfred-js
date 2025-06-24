const { SlashCommandBuilder } = require('discord.js');
const axios = require('axios');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('geoip')
        .setDescription('Returns GeoIP information for an IP address.')
        .addStringOption(option =>
            option.setName('ip')
                .setDescription('The IP address to lookup.')
                .setRequired(true)),
    async execute(interaction) {
        const ip = interaction.options.getString('ip');

        try {
            const apiUrl = `http://ip-api.com/json/${ip}`;

            const response = await axios.get(apiUrl);
            const geoipData = response.data;

            if (geoipData.status === 'fail') {
                return interaction.reply(`Could not retrieve GeoIP information for ${ip}. Error: ${geoipData.message || 'Unknown error'}`);
            }

            const geoip = {
                title: `GeoIP information for ${ip}:`,
                color: 10038562, // Ruby color code
                fields: [
                    { name: "Country", value: geoipData.country, inline: true },
                    { name: "Country Code", value: geoipData.countryCode, inline: true },
                    { name: "Region", value: geoipData.region, inline: true },
                    { name: "Region Name", value: geoipData.regionName, inline: true },
                    { name: "City", value: geoipData.city, inline: true },
                    { name: "Zip Code", value: geoipData.zip, inline: true },
                    { name: "Latitude", value: String(geoipData.lat), inline: true },
                    { name: "Longitude", value: String(geoipData.lon), inline: true },
                    { name: "Timezone", value: geoipData.timezone, inline: true },
                    { name: "ISP", value: geoipData.isp, inline: true },
                ],
            };

            await interaction.reply({ embeds: [geoip] });

        } catch (error) {
            console.error(`Error getting GeoIP data for ${ip}:`, error);

            if (error.response) {
                console.error("Response data:", error.response.data);
                console.error("Response status:", error.response.status);
                console.error("Response headers:", error.response.headers);

                if (error.response.status === 404) {
                    await interaction.reply(`Could not find GeoIP information for ${ip}.`);
                } else {
                    await interaction.reply(`GeoIP API Error: ${error.response.status}`);
                }
            } else if (error.request) {
                console.error("Request:", error.request);
                await interaction.reply("No response received from the GeoIP API. Please try again later.");
            } else {
                console.error('Error message:', error.message);
                await interaction.reply("There was an error setting up the request to the GeoIP API. Please try again later.");
            }
        }
    },
};