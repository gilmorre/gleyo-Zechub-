# bot.py 🚀 run this separately: python bot.py
import discord
from discord.ext import commands
from discord import app_commands

DISCORD_BOT_TOKEN = "MTM4MzgwOTM3MDg3NzQ2NDYzNg.GKQX_5.jljwzHaW7WMliXSJOqzRxwXcMRyJXdRaLPV6mU"  # <-- replace with your actual token

# ✅ Intents (needed for member join/leave + message events)
intents = discord.Intents.default()
intents.message_content = True
intents.guilds = True
intents.members = True

# ✅ Create bot
bot = commands.Bot(command_prefix="!", intents=intents)
bot_members_cache = {} 


# ---------------- EVENTS ---------------- #
@bot.event
async def on_ready():
    global bot_members_cache

    print(f"🤖 Logged in as {bot.user} (ID: {bot.user.id})")
    print("------")

    # Sync slash commands
    try:
        synced = await bot.tree.sync()
        print(f"✅ Synced {len(synced)} slash command(s).")
    except Exception as e:
        print(f"❌ Failed syncing commands: {e}")

    # Build member cache
    bot_members_cache = {}  # reset in case of reconnect
    for guild in bot.guilds:
        try:
            await guild.chunk()  # 👈 ensures all members are fetched from Discord
            bot_members_cache[guild.id] = set(m.id for m in guild.members)
            print(f"📥 Cached {len(bot_members_cache[guild.id])} members for guild {guild.name} ({guild.id})")
        except Exception as e:
            print(f"⚠️ Failed caching members for {guild.name} ({guild.id}): {e}")



@bot.event
async def on_member_join(member):
    print(f"👋 {member.name} joined {member.guild.name}")
    # Optional: greet them in the first channel
    if member.guild.system_channel:
        await member.guild.system_channel.send(f"👋 Welcome {member.mention}!")


@bot.event
async def on_member_remove(member):
    print(f"😢 {member.name} left {member.guild.name}")
    if member.guild.system_channel:
        await member.guild.system_channel.send(f"😢 {member.name} just left us.")


# ---------------- SLASH COMMANDS ---------------- #
@bot.tree.command(name="hello", description="Say hello to the bot")
async def hello(interaction: discord.Interaction):
    await interaction.response.send_message(f"Hello {interaction.user.mention} 👋")


@bot.tree.command(name="start", description="Start something exciting")
async def start(interaction: discord.Interaction):
    await interaction.response.send_message("🚀 Let's get started!")


@bot.tree.command(name="announce", description="Send an announcement to this server")
async def announce(interaction: discord.Interaction, message: str):
    """Slash command to send announcements"""
    guild = interaction.guild
    if guild and guild.text_channels:
        channel = guild.text_channels[0]
        await channel.send(f"📢 Announcement: {message}")
        await interaction.response.send_message("✅ Announcement sent!", ephemeral=True)
    else:
        await interaction.response.send_message("⚠️ No text channel available in this guild.", ephemeral=True)


# ---------------- PREFIX COMMANDS (old style !) ---------------- #
@bot.command()
async def ping(ctx):
    await ctx.send("Pong! 🏓")


# ---------------- RUN BOT ---------------- #
bot.run(DISCORD_BOT_TOKEN)





# bot.py 🚀
import discord
from discord.ext import commands
from discord import app_commands

# 🔑 Load DB
from instance import db
from discord_models import DiscordGuild

DISCORD_BOT_TOKEN = "YOUR_DISCORD_BOT_TOKEN"

# ✅ Intents
intents = discord.Intents.default()
intents.message_content = True
intents.guilds = True
intents.members = True

# ✅ Bot
bot = commands.Bot(command_prefix="!", intents=intents)


# ---------------- EVENTS ---------------- #
@bot.event
async def on_ready():
    print(f"🤖 Logged in as {bot.user} (ID: {bot.user.id})")
    print("------")
    # Sync slash commands
    try:
        synced = await bot.tree.sync()
        print(f"✅ Synced {len(synced)} slash command(s).")
    except Exception as e:
        print(f"❌ Failed syncing commands: {e}")

    for guild in bot.guilds:
        print(f"Joined guild: {guild.name} ({guild.id})")


@bot.event
async def on_member_join(member):
    print(f"👋 {member.name} joined {member.guild.name}")
    if member.guild.system_channel:
        await member.guild.system_channel.send(f"👋 Welcome {member.mention}!")


@bot.event
async def on_member_remove(member):
    print(f"😢 {member.name} left {member.guild.name}")
    if member.guild.system_channel:
        await member.guild.system_channel.send(f"😥 {member.name} just left us.")


@bot.event
async def on_guild_remove(guild: discord.Guild):
    """Triggered when bot is kicked/removed from a server"""
    print(f"❌ Bot was removed from guild: {guild.name} ({guild.id})")

    # 🔄 Update database
    guild_record = DiscordGuild.query.filter_by(guild_id=str(guild.id)).first()
    if guild_record:
        guild_record.bot_joined = False
        db.session.commit()
        print(f"📉 Updated DB: {guild_record.guild_name} -> bot_joined=False")
    else:
        print("⚠️ Guild not found in DB, nothing updated.")


# ---------------- SLASH COMMANDS ---------------- #
@bot.tree.command(name="hello", description="Say hello to the bot")
async def hello(interaction: discord.Interaction):
    await interaction.response.send_message(f"Hello {interaction.user.mention} 👋")


@bot.tree.command(name="start", description="Start something exciting")
async def start(interaction: discord.Interaction):
    await interaction.response.send_message("🚀 Let's get started!")


@bot.tree.command(name="announce", description="Send an announcement to this server")
async def announce(interaction: discord.Interaction, message: str):
    guild = interaction.guild
    if guild and guild.text_channels:
        channel = guild.text_channels[0]
        await channel.send(f"📢 Announcement: {message}")
        await interaction.response.send_message("✅ Announcement sent!", ephemeral=True)
    else:
        await interaction.response.send_message("⚠️ No text channel available in this guild.", ephemeral=True)


# ---------------- PREFIX COMMANDS ---------------- #
@bot.command()
async def ping(ctx):
    await ctx.send("Pong! 🏓")


# ---------------- RUN BOT ---------------- #
bot.run(DISCORD_BOT_TOKEN)
