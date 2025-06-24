const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('balances.db', (err) => {
    if (err) {
        console.error("Error opening database:", err);
    } else {
        db.run(`CREATE TABLE IF NOT EXISTS balances (
            user_id TEXT PRIMARY KEY,
            balance INTEGER DEFAULT 0
        )`, (err) => {
            if (err) {
                console.error("Error creating table:", err);
            }
        });
    }
});

module.exports = {
    data: new SlashCommandBuilder()
        .setName('roulette')
        .setDescription('Spin the roulette wheel!')
        .addIntegerOption(option =>
            option.setName('bet')
                .setDescription('The amount you want to bet.')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('number')
                .setDescription('The number you want to bet on (0-36).'))
        .addStringOption(option =>
            option.setName('color')
                .setDescription('The color you want to bet on (red/black/green).')),

    async execute(interaction) {
        try {
            const userId = interaction.user.id;
            const betAmount = interaction.options.getInteger('bet');
            const betNumber = interaction.options.getInteger('number');
            const betColor = interaction.options.getString('color')?.toLowerCase();

            if (betAmount <= 0) {
                return interaction.reply("You must bet a positive amount.");
            }

            if ((betNumber !== null && (betNumber < 0 || betNumber > 36)) || (betColor && !['red', 'black', 'green'].includes(betColor))) {
                return interaction.reply("Invalid bet options.  Bet on a number between 0 and 36, or a color (red/black/green).");
            }

            const numberOption = interaction.options.get('number');
            const colorOption = interaction.options.get('color');

            if (!numberOption && !colorOption) {
                return interaction.reply("You must bet on either a number or a color (or both).");
            }

            const row = await new Promise((resolve, reject) => {
                db.get("SELECT balance FROM balances WHERE user_id = ?", [userId], (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                });
            });

            if (!row) {
                await new Promise((resolve, reject) => {
                    db.run("INSERT INTO balances (user_id) VALUES (?)", [userId], (err) => {
                        if (err) reject(err);
                        else resolve();
                    });
                });
            }

            let balance = row ? row.balance : 0;

            if (balance < betAmount) {
                return interaction.reply("You do not have enough funds to place this bet.");
            }

            await new Promise((resolve, reject) => {
                db.run("UPDATE balances SET balance = balance - ? WHERE user_id = ?", [betAmount, userId], (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });

            balance -= betAmount;

            const winningNumber = Math.floor(Math.random() * 37); // Generate ONCE
            const winningColor = determineColor(winningNumber);   // Generate ONCE


            let winnings = 0;
            let message = `The wheel spun and landed on ${winningNumber} (${winningColor})!\n`; // Use these values

            let numberWon = false;
            let colorWon = false;

            if (betNumber !== null) {
                if (betNumber === winningNumber) {
                    numberWon = true;
                    message += `You bet on ${betNumber} and won ${betAmount * 35}!`;
                } else {
                    message += `You bet on ${betNumber} and lost.`;
                }
            }

            if (betColor) {
                if (betColor === winningColor) {
                    colorWon = true;
                    message += ` You bet on ${betColor} and won ${betAmount}!`;
                } else {
                    message += ` You bet on ${betColor} and lost.`;
                }
            }

            if (betNumber === null && betColor === null) {
                message += "You didn't place a bet!";
            }

            if (numberWon && colorWon) { // Both correct
                winnings = betAmount * 5; // 2.5 times the bet
                message += `\nBoth bets were correct! Total winnings: ${winnings}`;
            } else if (numberWon) { // Only number correct
                winnings = betAmount * 2;
                message += `\nOnly the number was correct! Total winnings: ${winnings}`;
            } else if (colorWon) { // Only color correct
                winnings = betAmount * 2;
                message += `\nOnly the color was correct! Total winnings: ${winnings}`;
            } else { // Neither correct
                message += `\nBoth bets were incorrect. You lose your bet.`;
            }

            if (winnings > 0) {
                await new Promise((resolve, reject) => {
                    db.run("UPDATE balances SET balance = balance + ? WHERE user_id = ?", [winnings, userId], (err) => {
                        if (err) reject(err);
                        else resolve();
                    });
                });
                balance += winnings;
            }

            message += `\nYour new balance is ${balance}.`;

            let embedColor = 0;

            if (winnings > 0) {
                embedColor = 0x00FF00;
            } else {
                embedColor = 0xFF0000;
            }

            const embed = new EmbedBuilder()
                .setColor(embedColor)
                .setTitle("Roulette Result")
                .setDescription(message);

            return interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error("Error in roulette command:", error);
            return interaction.reply("An error occurred. Please try again later.");
        }
    },
};

function determineColor(number) {
    const redNumbers = [1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23, 25, 27, 29, 31, 33, 35];
    if (number === 0) {
        return 'green';
    } else if (redNumbers.includes(number)) {
        return 'red';
    } else {
        return 'black';
    }
}
