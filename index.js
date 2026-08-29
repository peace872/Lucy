import "dotenv/config";
import {
  Client,
    GatewayIntentBits,
      Events,
        REST,
          Routes,
            SlashCommandBuilder
            } from "discord.js";

            const {
              DISCORD_TOKEN,
                CLIENT_ID,
                  GUILD_ID,
                    AI_API_KEY,
                      AI_API_URL,
                        AI_MODEL
                        } = process.env;

                        if (!DISCORD_TOKEN || !CLIENT_ID || !GUILD_ID || !AI_API_KEY) {
                          console.error("❌ Missing environment variables.");
                            process.exit(1);
                            }

                            const client = new Client({
                              intents: [
                                  GatewayIntentBits.Guilds,
                                      GatewayIntentBits.GuildMessages,
                                          GatewayIntentBits.MessageContent
                                            ]
                                            });

                                            const conversations = new Map();
                                            const cooldowns = new Map();

                                            const LUCY_PROMPT = `
                                            You are Lucy, a Discord AI chatbot.

                                            PERSONALITY:
                                            You are friendly, funny, confident, playful and slightly chaotic.
                                            You have a natural Gen-Z personality.
                                            Use slang such as bro, nah, fr, ngl, lmao, 💀 and 😭 naturally,
                                            but don't force slang into every message.

                                            You enjoy talking about sports, movies, web shows, anime,
                                            games, music, memes, internet culture, school and random topics.

                                            You have your own opinions and don't blindly agree with users.
                                            Understand jokes, sarcasm and memes.
                                            Playfully roast users when appropriate, but never be hateful,
                                            abusive or genuinely cruel.

                                            If the user is upset or discussing something serious,
                                            be supportive instead of roasting them.

                                            If someone asks you to date them, reject them playfully
                                            without acting as their romantic partner.

                                            You are completely NSFW-free.
                                            Never produce sexual or explicit content.

                                            Never claim to be human.
                                            You are an AI character named Lucy.

                                            Keep responses conversational and avoid repeating yourself.
                                            Respond naturally to the user's actual message.
                                            `;

                                            async function askAI(userId, message) {
                                              if (!conversations.has(userId)) {
                                                  conversations.set(userId, []);
                                                    }

                                                      const history = conversations.get(userId);

                                                        history.push({
                                                            role: "user",
                                                                content: message
                                                                  });

                                                                    // Keep memory from becoming huge.
                                                                      if (history.length > 12) {
                                                                          history.splice(0, history.length - 12);
                                                                            }

                                                                              const response = await fetch(AI_API_URL, {
                                                                                  method: "POST",
                                                                                      headers: {
                                                                                            "Content-Type": "application/json",
                                                                                                  "Authorization": `Bearer ${AI_API_KEY}`
                                                                                                      },
                                                                                                          body: JSON.stringify({
                                                                                                                model: AI_MODEL,
                                                                                                                      messages: [
                                                                                                                              {
                                                                                                                                        role: "system",
                                                                                                                                                  content: LUCY_PROMPT
                                                                                                                                                          },
                                                                                                                                                                  ...history
                                                                                                                                                                        ],
                                                                                                                                                                              temperature: 0.9,
                                                                                                                                                                                    max_tokens: 250
                                                                                                                                                                                        })
                                                                                                                                                                                          });

                                                                                                                                                                                            if (!response.ok) {
                                                                                                                                                                                                const error = await response.text();
                                                                                                                                                                                                    console.error("AI API error:", error);
                                                                                                                                                                                                        throw new Error("AI request failed");
                                                                                                                                                                                                          }

                                                                                                                                                                                                            const data = await response.json();

                                                                                                                                                                                                              const reply =
                                                                                                                                                                                                                  data.choices?.[0]?.message?.content?.trim() ||
                                                                                                                                                                                                                      "Bro my brain just lagged 💀";

                                                                                                                                                                                                                        history.push({
                                                                                                                                                                                                                            role: "assistant",
                                                                                                                                                                                                                                content: reply
                                                                                                                                                                                                                                  });

                                                                                                                                                                                                                                    return reply;
                                                                                                                                                                                                                                    }

                                                                                                                                                                                                                                    function onCooldown(userId) {
                                                                                                                                                                                                                                      const now = Date.now();
                                                                                                                                                                                                                                        const last = cooldowns.get(userId) || 0;

                                                                                                                                                                                                                                          if (now - last < 3000) {
                                                                                                                                                                                                                                              return true;
                                                                                                                                                                                                                                                }

                                                                                                                                                                                                                                                  cooldowns.set(userId, now);
                                                                                                                                                                                                                                                    return false;
                                                                                                                                                                                                                                                    }

                                                                                                                                                                                                                                                    const commands = [
                                                                                                                                                                                                                                                      new SlashCommandBuilder()
                                                                                                                                                                                                                                                          .setName("chat")
                                                                                                                                                                                                                                                              .setDescription("Talk to Lucy")
                                                                                                                                                                                                                                                                  .addStringOption(option =>
                                                                                                                                                                                                                                                                        option
                                                                                                                                                                                                                                                                                .setName("message")
                                                                                                                                                                                                                                                                                        .setDescription("What do you want to say?")
                                                                                                                                                                                                                                                                                                .setRequired(true)
                                                                                                                                                                                                                                                                                                        .setMaxLength(1000)
                                                                                                                                                                                                                                                                                                            ),

                                                                                                                                                                                                                                                                                                              new SlashCommandBuilder()
                                                                                                                                                                                                                                                                                                                  .setName("reset")
                                                                                                                                                                                                                                                                                                                      .setDescription("Reset your conversation with Lucy")
                                                                                                                                                                                                                                                                                                                      ].map(command => command.toJSON());

                                                                                                                                                                                                                                                                                                                      const rest = new REST({ version: "10" }).setToken(DISCORD_TOKEN);

                                                                                                                                                                                                                                                                                                                      async function registerCommands() {
                                                                                                                                                                                                                                                                                                                        await rest.put(
                                                                                                                                                                                                                                                                                                                            Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
                                                                                                                                                                                                                                                                                                                                { body: commands }
                                                                                                                                                                                                                                                                                                                                  );

                                                                                                                                                                                                                                                                                                                                    console.log("✅ Slash commands registered.");
                                                                                                                                                                                                                                                                                                                                    }

                                                                                                                                                                                                                                                                                                                                    client.once(Events.ClientReady, async readyClient => {
                                                                                                                                                                                                                                                                                                                                      console.log(`✅ Lucy is online as ${readyClient.user.tag}`);

                                                                                                                                                                                                                                                                                                                                        try {
                                                                                                                                                                                                                                                                                                                                            await registerCommands();
                                                                                                                                                                                                                                                                                                                                              } catch (error) {
                                                                                                                                                                                                                                                                                                                                                  console.error("❌ Command registration failed:", error);
                                                                                                                                                                                                                                                                                                                                                    }
                                                                                                                                                                                                                                                                                                                                                    });

                                                                                                                                                                                                                                                                                                                                                    client.on(Events.InteractionCreate, async interaction => {
                                                                                                                                                                                                                                                                                                                                                      if (!interaction.isChatInputCommand()) return;

                                                                                                                                                                                                                                                                                                                                                        if (interaction.commandName === "reset") {
                                                                                                                                                                                                                                                                                                                                                            conversations.delete(interaction.user.id);

                                                                                                                                                                                                                                                                                                                                                                return interaction.reply({
                                                                                                                                                                                                                                                                                                                                                                      content: "Memory reset 😭 We starting fresh.",
                                                                                                                                                                                                                                                                                                                                                                            ephemeral: true
                                                                                                                                                                                                                                                                                                                                                                                });
                                                                                                                                                                                                                                                                                                                                                                                  }

                                                                                                                                                                                                                                                                                                                                                                                    if (interaction.commandName !== "chat") return;

                                                                                                                                                                                                                                                                                                                                                                                      if (onCooldown(interaction.user.id)) {
                                                                                                                                                                                                                                                                                                                                                                                          return interaction.reply({
                                                                                                                                                                                                                                                                                                                                                                                                content: "Bro slow down 😭 Give me a second.",
                                                                                                                                                                                                                                                                                                                                                                                                      ephemeral: true
                                                                                                                                                                                                                                                                                                                                                                                                          });
                                                                                                                                                                                                                                                                                                                                                                                                            }

                                                                                                                                                                                                                                                                                                                                                                                                              const message = interaction.options.getString("message");

                                                                                                                                                                                                                                                                                                                                                                                                                await interaction.deferReply();

                                                                                                                                                                                                                                                                                                                                                                                                                  try {
                                                                                                                                                                                                                                                                                                                                                                                                                      const reply = await askAI(interaction.user.id, message);

                                                                                                                                                                                                                                                                                                                                                                                                                          await interaction.editReply(reply);
                                                                                                                                                                                                                                                                                                                                                                                                                            } catch (error) {
                                                                                                                                                                                                                                                                                                                                                                                                                                console.error(error);

                                                                                                                                                                                                                                                                                                                                                                                                                                    await interaction.editReply(
                                                                                                                                                                                                                                                                                                                                                                                                                                          "Nahhh my brain exploded 💀 Try again in a moment."
                                                                                                                                                                                                                                                                                                                                                                                                                                              );
                                                                                                                                                                                                                                                                                                                                                                                                                                                }
                                                                                                                                                                                                                                                                                                                                                                                                                                                });

                                                                                                                                                                                                                                                                                                                                                                                                                                                client.on(Events.MessageCreate, async message => {
                                                                                                                                                                                                                                                                                                                                                                                                                                                  if (message.author.bot) return;

                                                                                                                                                                                                                                                                                                                                                                                                                                                    if (!message.mentions.has(client.user)) return;

                                                                                                                                                                                                                                                                                                                                                                                                                                                      if (onCooldown(message.author.id)) return;

                                                                                                                                                                                                                                                                                                                                                                                                                                                        const content = message.content
                                                                                                                                                                                                                                                                                                                                                                                                                                                            .replace(`<@${client.user.id}>`, "")
                                                                                                                                                                                                                                                                                                                                                                                                                                                                .trim();

                                                                                                                                                                                                                                                                                                                                                                                                                                                                  if (!content) {
                                                                                                                                                                                                                                                                                                                                                                                                                                                                      return message.reply("Yo 😭 you summoned me for nothing?");
                                                                                                                                                                                                                                                                                                                                                                                                                                                                        }

                                                                                                                                                                                                                                                                                                                                                                                                                                                                          try {
                                                                                                                                                                                                                                                                                                                                                                                                                                                                              await message.channel.sendTyping();

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  const reply = await askAI(message.author.id, content);

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      await message.reply(reply);
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        } catch (error) {
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            console.error(error);
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                await message.reply(
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      "Bro my AI brain is taking a nap 💀 Try again."
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          );
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            }
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            });

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            client.login(DISCORD_TOKEN);