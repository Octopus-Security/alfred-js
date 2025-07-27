const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./balances.db');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('portfolio')
        .setDescription('View your complete asset portfolio.')
        .addUserOption(option => 
            option.setName('user')
            .setDescription('The user whose portfolio to view.')
            .setRequired(false)), // Optional, defaults to yourself

    async execute(interaction) {
        const targetUser = interaction.options.getUser('user') || interaction.user;
        const userId = targetUser.id;

        try {
            // Get user's USD and Chip balance from the main 'users' table
            const userRow = await new Promise((resolve, reject) => {
                db.get(`SELECT * FROM users WHERE user_id = ?`, [userId], (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                });
            });

            // If user doesn't exist at all, create them with defaults
            if (!userRow) {
                await new Promise((resolve, reject) => {
                    db.run('INSERT INTO users (user_id) VALUES (?)', [userId], (err) => {
                        if (err) reject(err);
                        else resolve();
                    });
                });
                 const embed = new EmbedBuilder()
                    .setTitle(`${targetUser.username}'s Portfolio`)
                    .setColor(0x0099FF)
                    .setThumbnail(targetUser.displayAvatarURL())
                    .addFields(
                        { name: '💵 USD Balance', value: `$100.00`, inline: true },
                        { name: '🎰 Casino Chips', value: `0`, inline: true },
                        { name: 'Assets', value: 'No stocks or crypto held.' }
                    );
                return interaction.reply({ embeds: [embed] });
            }

            // Get all their owned stocks/crypto from the 'portfolios' table
            const query = `
                SELECT p.amount, a.ticker, a.type
                FROM portfolios p
                JOIN assets a ON p.asset_id = a.asset_id
                WHERE p.user_id = ? AND p.amount > 0
            `;
            const assetRows = await new Promise((resolve, reject) => {
                db.all(query, [userId], (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                });
            });

            const embed = new EmbedBuilder()
                .setTitle(`${targetUser.username}'s Portfolio`)
                .setColor(0x0099FF)
                .setThumbnail(targetUser.displayAvatarURL())
                .addFields(
                    { name: '💵 USD Balance', value: `$${userRow.usd_balance.toFixed(2)}`, inline: true },
                    { name: '🎰 Casino Chips', value: `${userRow.chip_balance}`, inline: true }
                );
            
            const stocks = assetRows.filter(a => a.type === 'STOCK');
            const cryptos = assetRows.filter(a => a.type === 'CRYPTO');

            if (stocks.length > 0) {
                embed.addFields({ 
                    name: '📈 Stocks', 
                    value: stocks.map(s => `**${s.ticker}**: ${s.amount.toFixed(4)}`).join('\n'),
                    inline: false 
                });
            }

            if (cryptos.length > 0) {
                embed.addFields({ 
                    name: '💎 Crypto', 
                    value: cryptos.map(c => `**${c.ticker}**: ${c.amount.toFixed(4)}`).join('\n'),
                    inline: false 
                });
            }

            if (stocks.length === 0 && cryptos.length === 0) {
                embed.addFields({ name: 'Assets', value: 'No stocks or crypto held.' });
            }

            interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error("Error in /portfolio command:", error);
            return interaction.reply({ content: 'An error occurred.', ephemeral: true });
        }
    },
};