const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { open } = require('sqlite');
const sqlite3 = require('sqlite3');
const path = require('path');
const axios = require('axios');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('buy')
        .setDescription('Buy a stock or crypto asset with your USD.')
        .addStringOption(option =>
            option.setName('ticker')
                .setDescription('The stock or crypto ticker you want to buy (e.g., AAPL, BTC).')
                .setRequired(true))
        .addNumberOption(option =>
            option.setName('amount')
                .setDescription('The amount of USD you want to spend.')
                .setRequired(true)
                .setMinValue(1)), // Must spend at least $1

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true }); // Private reply for financial info

        const userId = interaction.user.id;
        const ticker = interaction.options.getString('ticker').toUpperCase();
        const usdAmount = interaction.options.getNumber('amount');
        const apiKey = process.env.FINNHUB_API_KEY;

        let db;
        try {
            db = await open({
                filename: path.join(__dirname, '../balances.db'),
                driver: sqlite3.Database
            });

            // 1. Check user's balance
            const user = await db.get('SELECT * FROM users WHERE user_id = ?', [userId]);
            if (!user || user.usd_balance < usdAmount) {
                const currentBalance = user ? user.usd_balance.toFixed(2) : '0.00';
                return interaction.editReply(`You do not have enough USD to complete this transaction. Your current balance is **$${currentBalance}**.`);
            }

            // 2. Get the asset's ID from our database
            const asset = await db.get('SELECT asset_id, type FROM assets WHERE ticker = ?', [ticker]);
            if (!asset) {
                return interaction.editReply(`The ticker **${ticker}** is not a tradable asset on this bot.`);
            }

            // 3. Get the live price from the API
            const symbol = asset.type === 'CRYPTO' ? `BINANCE:${ticker}USDT` : ticker;
            const response = await axios.get(`https://finnhub.io/api/v1/quote`, {
                params: { symbol, token: apiKey }
            });
            const currentPrice = response.data.c;

            if (!currentPrice || currentPrice === 0) {
                return interaction.editReply(`Could not fetch a valid price for **${ticker}**. Please try again later.`);
            }

            // 4. Perform calculations and database transaction
            const assetAmountToBuy = usdAmount / currentPrice;
            const newUsdBalance = user.usd_balance - usdAmount;

            // Use a transaction to ensure both updates succeed or neither do
            await db.exec('BEGIN TRANSACTION');
            await db.run('UPDATE users SET usd_balance = ? WHERE user_id = ?', [newUsdBalance, userId]);
            
            // This is an "UPSERT": It inserts a new row, but if a row for that user/asset already exists, it updates the amount instead.
            await db.run(`
                INSERT INTO portfolios (user_id, asset_id, amount) VALUES (?, ?, ?)
                ON CONFLICT(user_id, asset_id) DO UPDATE SET amount = amount + excluded.amount
            `, [userId, asset.asset_id, assetAmountToBuy]);
            
            await db.exec('COMMIT');

            // 5. Send confirmation
            const newPortfolio = await db.get('SELECT amount FROM portfolios WHERE user_id = ? AND asset_id = ?', [userId, asset.asset_id]);

            const embed = new EmbedBuilder()
                .setColor(0x00FF00)
                .setTitle('Purchase Successful!')
                .setDescription(`You successfully spent **$${usdAmount.toFixed(2)}** to purchase **${assetAmountToBuy.toFixed(6)} ${ticker}**.`)
                .addFields(
                    { name: 'New USD Balance', value: `$${newUsdBalance.toFixed(2)}`, inline: true },
                    { name: `Total ${ticker} Owned`, value: `${newPortfolio.amount.toFixed(6)}`, inline: true }
                )
                .setTimestamp();
                
            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            if (db) await db.exec('ROLLBACK'); // Roll back transaction on error
            console.error("Error in /buy command:", error);
            await interaction.editReply('An error occurred while processing your transaction. Your balance has not been changed.');
        } finally {
            if (db) await db.close();
        }
    },
};