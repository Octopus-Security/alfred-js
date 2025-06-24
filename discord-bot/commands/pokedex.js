const { SlashCommandBuilder } = require('discord.js');
const fetch = (...args) =>
    import('node-fetch').then(({default: fetch}) => fetch(...args));

module.exports = {
    data: new SlashCommandBuilder()
        .setName('pokedex')
        .setDescription('Provides information about a Pokémon.')
        .addStringOption(option =>
            option.setName('pokemon')
                .setDescription('The name of the Pokémon (or "random").'))
        .addIntegerOption(option =>
            option.setName('id')
                .setDescription('The ID of the Pokémon.'))
        ,

    async execute(interaction) {
        const pokemonName = interaction.options.getString('pokemon')?.toLowerCase();
        const pokemonId = interaction.options.getInteger('id');
        const maxPokemonId = 1025;

        try {
            let apiUrl;
            if (pokemonName === 'random') {
                let attempts = 0;
                const maxAttempts = 3;
                let data;

                while (attempts < maxAttempts) {
                    const randomId = Math.floor(Math.random() * maxPokemonId) + 1;
                    apiUrl = `https://pokeapi.co/api/v2/pokemon-species/${randomId}`;

                    const response = await fetch(apiUrl);
                    if (response.ok) {
                        data = await response.json();
                        break;
                    } else if (response.status === 404) {
                        attempts++;
                        console.log(`Random Pokémon species not found (attempt ${attempts}). Retrying... URL: ${apiUrl}`);
                    } else {
                        console.error(`PokeAPI Error: ${response.status} ${response.statusText} for URL: ${apiUrl}`);
                        return interaction.reply('There was an error fetching Pokémon data. Please try again later.');
                    }
                }

                if (attempts === maxAttempts && !data) {
                    return interaction.reply("No Pokémon found after multiple retries (random).");
                }

                const pokemonUrl = data.varieties.find(variety => variety.is_default).pokemon.url;
                const pokemonResponse = await fetch(pokemonUrl);
                if (!pokemonResponse.ok) {
                    console.error(`PokeAPI Error: ${pokemonResponse.status} ${pokemonResponse.statusText} for URL: ${pokemonUrl}`);
                    return interaction.reply('There was an error fetching Pokémon data. Please try again later.');
                }
                const pokemonData = await pokemonResponse.json();
                const embed = createPokemonEmbed(pokemonData);

                try {
                    const shinySpriteUrl = pokemonData.sprites.front_shiny;
                    if (shinySpriteUrl) {
                        embed.image = { url: pokemonData.sprites.front_default };
                        embed.fields.push({ name: 'Shiny Form', value: `[View Shiny Form](${shinySpriteUrl})`, inline: true });
                    }
                } catch (shinyError) {
                    console.error("Error fetching shiny sprite:", shinyError);
                }

                await interaction.reply({ embeds: [embed] });

            } else if (pokemonId) {
                apiUrl = `https://pokeapi.co/api/v2/pokemon/${pokemonId}`;
                const response = await fetch(apiUrl);
                if (!response.ok) {
                    console.error(`PokeAPI Error: ${response.status} ${response.statusText} for URL: ${apiUrl}`);
                    return interaction.reply(`Pokémon with ID ${pokemonId} not found.`);
                }
                const data = await response.json();
                const embed = createPokemonEmbed(data);

                try {
                    const shinySpriteUrl = data.sprites.front_shiny;
                    if (shinySpriteUrl) {
                        embed.image = { url: data.sprites.front_default };
                        embed.fields.push({ name: 'Shiny Form', value: `[View Shiny Form](${shinySpriteUrl})`, inline: true });
                    }
                } catch (shinyError) {
                    console.error("Error fetching shiny sprite:", shinyError);
                }

                await interaction.reply({ embeds: [embed] });

            } else if (pokemonName) {
                apiUrl = `https://pokeapi.co/api/v2/pokemon/${pokemonName}`;
                const response = await fetch(apiUrl);
                if (!response.ok) {
                    console.error(`PokeAPI Error: ${response.status} ${response.statusText} for URL: ${apiUrl}`);
                    return interaction.reply(`Pokémon "${pokemonName}" not found.`);
                }
                const data = await response.json();
                const embed = createPokemonEmbed(data);

                try {
                    const shinySpriteUrl = data.sprites.front_shiny;
                    if (shinySpriteUrl) {
                        embed.image = { url: data.sprites.front_default };
                        embed.fields.push({ name: 'Shiny Form', value: `[View Shiny Form](${shinySpriteUrl})`, inline: true });
                    }
                } catch (shinyError) {
                    console.error("Error fetching shiny sprite:", shinyError);
                }

                await interaction.reply({ embeds: [embed] });

            } else {
                return interaction.reply("Please provide a Pokémon name (or 'random') or ID.");
            }



        } catch (error) {
            console.error('Error fetching Pokémon data:', error);
            await interaction.reply('There was an error fetching Pokémon data. Please try again later.');
        }
    }
};

function createPokemonEmbed(data) {
    const typeColors = {
        normal: 0xA0A080,
        fire: 0xFA6C6C,
        water: 0x6CB0FA,
        electric: 0xFFCE4B,
        grass: 0x7AC74C,
        ice: 0x98D8D8,
        fighting: 0xC03028,
        poison: 0xA040A0,
        ground: 0xE0C068,
        flying: 0xA890F0,
        psychic: 0xF85888,
        bug: 0xA8B820,
        rock: 0xB8A038,
        ghost: 0x705898,
        dragon: 0x7038F8,
        steel: 0xB8B8D0,
        dark: 0x705848,
        fairy: 0xEE99AC,
    };

    const types = data.types.map(type => type.type.name);
    let embedColor;

    if (types.length === 1) {
        embedColor = typeColors[types[0]] || 0xFF0000;
    } else if (types.length === 2) {
        const color1 = typeColors[types[0]];
        const color2 = typeColors[types[1]];

        if (color1 && color2) {
            const r = Math.round((((color1 >> 16) & 255) + ((color2 >> 16) & 255)) / 2);
            const g = Math.round((((color1 >> 8) & 255) + ((color2 >> 8) & 255)) / 2);
            const b = Math.round((((color1) & 255) + ((color2) & 255)) / 2);
            embedColor = (r << 16) + (g << 8) + b;
        } else {
            embedColor = color1 || color2 || 0xFF0000;
        }
    } else {
        embedColor = 0xFF0000;
    }

    return {
        title: data.name.charAt(0).toUpperCase() + data.name.slice(1),
        color: embedColor,
        fields: [
            { name: 'ID', value: data.id.toString(), inline: true },
            { name: 'Type(s)', value: types.join(', '), inline: true },
            { name: 'Height', value: `${data.height / 10} m`, inline: true },
            { name: 'Weight', value: `${data.weight / 10} kg`, inline: true },
        ],
        image: { url: data.sprites.front_default },
        footer: { text: 'Data from PokeAPI' }, // Serebii link removed
    };
}