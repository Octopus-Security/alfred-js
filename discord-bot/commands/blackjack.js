const { SlashCommandBuilder, EmbedBuilder } = require('@discordjs/builders');
const sqlite3 = require('sqlite3').verbose();

// Database connection
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

// In-memory game state storage (FOR TESTING ONLY - use a database for production)
const gameStates = {};

// Define functions GLOBALLY:
const dealCard = () => Math.floor(Math.random() * 13) + 1;
const calculateTotal = (hand) => hand.reduce((a, b) => a + Math.min(b, 10), 0);
const createEmbed = (message, gameState) => {
    const { playerHand, dealerHand, playerTotal, dealerTotal, gameOver, winAmount, bet } = gameState;
    return new EmbedBuilder()
        .setTitle('Blackjack Game')
        .setDescription(`${message}\nYour hand: ${playerHand.join(', ')} (Total: ${playerTotal})\nDealer's hand: ${dealerHand.join(', ')} (Total: ${dealerTotal})`)
        .setColor(gameOver ? (winAmount > 0 ? 0x00FF00 : winAmount < 0 ? 0xFF0000 : 0xFFFF00) : 0x0000FF);
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('blackjack')
        .setDescription('Play a game of blackjack!')
        .addSubcommand(subcommand =>
            subcommand
                .setName('play')
                .setDescription('Start a new game of blackjack!')
                .addIntegerOption(option => option.setName('bet').setDescription('The amount of money you want to bet').setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('hit')
                .setDescription('Hit another card'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('stay')
                .setDescription('Stand and let the dealer play')),
    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'play') {
            const bet = interaction.options.getInteger('bet');
            const userId = interaction.user.id;

            db.get("SELECT balance FROM balances WHERE user_id = ?", [userId], async (err, row) => {
                if (err) {
                    console.error("Error checking balance:", err);
                    return interaction.reply({ content: 'A database error occurred.', ephemeral: true });
                }

                if (!row) {
                    return interaction.reply({ content: 'You do not have an account. Use /register to create one.', ephemeral: true });
                }

                const balance = row.balance;

                if (balance < bet) {
                    return interaction.reply({ content: 'You do not have enough money to place that bet.', ephemeral: true });
                }

                if (bet <= 0) {
                    return interaction.reply({ content: 'Bet must be a positive number.', ephemeral: true });
                }

                let playerHand = [];
                let dealerHand = [];
                let gameOver = false;
                let winAmount = 0;

                playerHand.push(dealCard());
                dealerHand.push(dealCard());
                playerHand.push(dealCard());
                dealerHand.push(dealCard());

                let playerTotal = calculateTotal(playerHand);
                let dealerTotal = calculateTotal(dealerHand);

                gameStates[interaction.user.id] = { playerHand, dealerHand, playerTotal, dealerTotal, gameOver, winAmount, bet };

                await interaction.reply({ embeds: [createEmbed("Your turn!", gameStates[interaction.user.id])] });
            });
        } else if (subcommand === 'hit') {
            const gameState = gameStates[interaction.user.id];
            if (!gameState || gameState.gameOver) {
                return interaction.reply({ content: "No game in progress or game over!", ephemeral: true });
            }

            let { playerHand, dealerHand, playerTotal, dealerTotal, gameOver, winAmount, bet } = gameState;

            const playRound = () => {
                let playerTotal = calculateTotal(playerHand);
                let dealerTotal = calculateTotal(dealerHand);

                if (playerTotal > 21) {
                    gameOver = true;
                    resultMessage = "You busted! Dealer wins.";
                    winAmount = -bet;
                } else if (dealerTotal > 21) {
                    gameOver = true;
                    resultMessage = "Dealer busted! You win!";
                    winAmount = bet;
                } else if (gameOver) {
                    if (playerTotal > dealerTotal) {
                        resultMessage = "You win!";
                        winAmount = bet;
                    } else if (playerTotal < dealerTotal) {
                        resultMessage = "Dealer wins!";
                        winAmount = -bet;
                    } else {
                        resultMessage = "It's a tie!";
                        winAmount = 0;
                    }
                }
                return { playerTotal, dealerTotal };
            };

            playerHand.push(dealCard());
            playerTotal = calculateTotal(playerHand);
            if (playerTotal > 21) {
                gameOver = true;
                resultMessage = "You busted! Dealer wins.";
                winAmount = -bet;
            }

            let { playerTotal: newPlayerTotal, dealerTotal: newDealerTotal } = playRound();
            playerTotal = newPlayerTotal;
            dealerTotal = newDealerTotal;

            gameState.playerTotal = playerTotal;
            gameState.dealerTotal = dealerTotal;
            gameStates[interaction.user.id] = gameState;

            await interaction.reply({ embeds: [createEmbed("Your turn!", gameState)] });

            if (gameOver) {
                delete gameStates[interaction.user.id];
                db.run("UPDATE balances SET balance = balance + ? WHERE user_id = ?", [winAmount, interaction.user.id], function (err) {
                    if (err) {
                        console.error("Error updating balance:", err);
                        return interaction.followUp({ content: 'An error occurred.', ephemeral: true });
                    }

                    db.get("SELECT balance FROM balances WHERE user_id = ?", [interaction.user.id], (err, row) => {
                        if (err) {
                            console.error("Error getting balance:", err);
                            return interaction.followUp({ content: 'An error occurred.', ephemeral: true });
                        }
                        const newBalance = row.balance;
                        const finalEmbed = createEmbed(resultMessage + `\nNew Balance: ${newBalance}`, gameState).setColor(winAmount > 0 ? 0x00FF00 : winAmount < 0 ? 0xFF0000 : 0xFFFF00);
                        interaction.followUp({ embeds: [finalEmbed] });
                    });
                });
            }
        } else if (subcommand === 'stay') {
            const gameState = gameStates[interaction.user.id];
            if (!gameState || gameState.gameOver) {
                return interaction.reply({ content: "No game in progress or game over!", ephemeral: true });
            }

            let { playerHand, dealerHand, playerTotal, dealerTotal, gameOver, winAmount, bet } = gameState;

            const playRound = () => {
                let playerTotal = calculateTotal(playerHand);
                let dealerTotal = calculateTotal(dealerHand);

                if (playerTotal > 21) {
                    gameOver = true;
                    resultMessage = "You busted! Dealer wins.";
                    winAmount = -bet;
                } else if (dealerTotal > 21) {
                    gameOver = true;
                    resultMessage = "Dealer busted! You win!";
                    winAmount = bet;
                } else if (gameOver) {
                    if (playerTotal > dealerTotal) {
                        resultMessage = "You win!";
                        winAmount = bet;
                    } else if (playerTotal < dealerTotal) {
                        resultMessage = "Dealer wins!";
                        winAmount = -bet;
                    } else {
                        resultMessage = "It's a tie!";
                        winAmount = 0;
                    }
                }
                return { playerTotal, dealerTotal };
            };

            playerTotal = calculateTotal(playerHand);
            dealerTotal = calculateTotal(dealerHand);

            while (dealerTotal < 17) {
                dealerHand.push(dealCard());
                dealerTotal = calculateTotal(dealerHand);
            }

            gameOver = true;
            let resultMessage = "";

            let { playerTotal: newPlayerTotal, dealerTotal: newDealerTotal } = playRound(); // Get returned totals
            playerTotal = newPlayerTotal; // Update playerTotal
            dealerTotal = newDealerTotal; // Update dealerTotal

            gameState.playerTotal = playerTotal;  // Update gameState
            gameState.dealerTotal = dealerTotal;  // Update gameState
            gameStates[interaction.user.id] = gameState; // Update the gameStates

            if (!resultMessage) { //If not busted by hit
                if (playerTotal > dealerTotal) {
                    resultMessage = "You win!";
                    winAmount = bet;
                } else if (playerTotal < dealerTotal) {
                    resultMessage = "Dealer wins!";
                    winAmount = -bet;
                } else {
                    resultMessage = "It's a tie!";
                    winAmount = 0;
                }
            }

            await interaction.reply({ embeds: [createEmbed(resultMessage, gameState)] }); // Pass gameState

            delete gameStates[interaction.user.id];

            db.run("UPDATE balances SET balance = balance + ? WHERE user_id = ?", [winAmount, interaction.user.id], function (err) {
                if (err) {
                    console.error("Error updating balance:", err);
                    return interaction.followUp({ content: 'An error occurred.', ephemeral: true });
                }

                db.get("SELECT balance FROM balances WHERE user_id = ?", [interaction.user.id], (err, row) => {
                    if (err) {
                        console.error("Error getting balance:", err);
                        return interaction.followUp({ content: 'An error occurred.', ephemeral: true });
                    }
                    const newBalance = row.balance;
                    const finalEmbed = createEmbed(resultMessage + `\nNew Balance: ${newBalance}`, gameState).setColor(winAmount > 0 ? 0x00FF00 : winAmount < 0 ? 0xFF0000 : 0xFFFF00);
                    interaction.followUp({ embeds: [finalEmbed] });
                });
            });
        }
    },
};