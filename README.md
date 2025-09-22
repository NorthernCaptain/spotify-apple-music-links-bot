# spotify-apple-music-links-bot

Telegram bot for converting music links between Apple Music and Spotify platforms, written in Node.js.

With this bot you can automatically convert Apple Music links to Spotify and vice versa in Telegram channels and chats where the bot is added.

## Features

* **Automatic Link Detection**: Bot monitors all messages in subscribed channels and detects Apple Music/Spotify links
* **Bidirectional Conversion**: Converts Apple Music ↔ Spotify links automatically
* **Smart Matching**: Uses scoring algorithm to find the best match between platforms with confidence percentage
* **Password Protection**: Subscribe with password, so only authorized users can add the bot to channels
* **Multiple Chat Support**: Works in multiple chats and telegram groups simultaneously
* **Match Confidence**: Shows match quality (e.g., "Exact match" or "95% match") for transparency

## How It Works

1. **Link Detection**: Bot scans all messages for Apple Music or Spotify links
2. **Metadata Extraction**: Retrieves track/album information from the source platform API
3. **Cross-Platform Search**: Searches for equivalent content on the target platform
4. **Smart Scoring**: Compares track name, artist, and album to find the best match
5. **Response**: Posts the converted link with match confidence percentage

### Supported Link Types
- Spotify tracks: `https://open.spotify.com/track/...`
- Spotify albums: `https://open.spotify.com/album/...`
- Apple Music tracks: `https://music.apple.com/*/album/*/*`
- Apple Music albums: `https://music.apple.com/*/album/*`

## Installation and Configuration

### Prerequisites
- Node.js 16+
- Telegram Bot Token from [BotFather](https://t.me/botfather)
- Spotify API credentials (Client ID & Secret)
- Apple Music API credentials (Team ID, Key ID, Private Key)

### Setup Steps

1. **Clone this repository**
   ```bash
   git clone https://github.com/your-username/spotify-apple-music-links-bot.git
   cd spotify-apple-music-links-bot
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Create API credentials**

   **Spotify API (Free)**:
   - Go to [Spotify for Developers](https://developer.spotify.com)
   - Create a new app to get Client ID and Client Secret
   - No subscription required (100 API calls per minute free tier)

   **Apple Music API (Free)**:
   - Use your Apple Developer Account
   - Create MusicKit Identifier in Apple Developer portal
   - Generate .p8 private key file for JWT authentication
   - Get your Team ID and Key ID

4. **Create environment file**
   ```bash
   cp sample.env prod.env
   ```

   Edit `prod.env` with your credentials:
   ```env
   # Telegram Bot Configuration
   SMBOT_TELEGRAM_TOKEN=1234567:xxxxxxxxx
   SMBOT_BOT_PASSWORD=your_secure_password
   SMBOT_STORAGE_FOLDER=/storage

   # Spotify API Credentials
   SMBOT_SPOTIFY_CLIENT_ID=your_spotify_client_id
   SMBOT_SPOTIFY_CLIENT_SECRET=your_spotify_client_secret

   # Apple Music API Credentials
   SMBOT_APPLE_MUSIC_TEAM_ID=your_apple_team_id
   SMBOT_APPLE_MUSIC_KEY_ID=your_apple_music_key_id
   SMBOT_APPLE_MUSIC_PRIVATE_KEY_PATH=/path/to/AuthKey_KeyID.p8
   ```

5. **Run with Docker**
   ```bash
   docker build -t spotify-apple-music-links-bot .
   docker run -d --name spotify-apple-music-links-bot \
     -v your_local_storage_folder:/storage \
     -v /path/to/your/apple/key:/keys \
     --restart=unless-stopped \
     spotify-apple-music-links-bot
   ```

   Or run directly:
   ```bash
   npm start
   ```

## Usage

### Adding Bot to Channel/Chat

1. **Start bot privately**:
   - Find your bot in Telegram
   - Send: `/start your_SMBOT_BOT_PASSWORD`
   - Bot confirms subscription if password is correct

2. **Add to channel**:
   - Add bot to your Telegram channel/group as admin
   - Bot will automatically monitor all messages for music links

3. **Automatic conversion**:
   - Post any Apple Music or Spotify link in the channel
   - Bot responds with converted link and match confidence
   - Example response: "🎵 Spotify → Apple Music (95% match)"

### Bot Commands

- `/start <password>` - Subscribe to bot with password
- `/stop` - Unsubscribe from bot notifications
- `/help` - Show help information

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `SMBOT_TELEGRAM_TOKEN` | Bot token from BotFather | Required |
| `SMBOT_BOT_PASSWORD` | Password for bot subscription | `unsecure` |
| `SMBOT_STORAGE_FOLDER` | Path to storage folder for chat IDs | `/storage` |
| `SMBOT_SPOTIFY_CLIENT_ID` | Spotify API client ID | Required |
| `SMBOT_SPOTIFY_CLIENT_SECRET` | Spotify API client secret | Required |
| `SMBOT_APPLE_MUSIC_TEAM_ID` | Apple Music API team ID | Required |
| `SMBOT_APPLE_MUSIC_KEY_ID` | Apple Music API key ID | Required |
| `SMBOT_APPLE_MUSIC_PRIVATE_KEY_PATH` | Path to Apple Music .p8 private key | Required |

## Technical Architecture

### Project Structure
```
src/
├── app.js              # Main application entry point
├── bot/                # Telegram bot logic
│   └── bot.js         # Bot commands and message handling
├── services/           # Music platform API services
│   ├── spotify.js     # Spotify API integration
│   ├── apple_music.js # Apple Music API integration
│   └── converter.js   # Link conversion and scoring logic
├── config/            # Configuration management
│   └── config.js      # Environment variable handling
├── db/                # Database operations
│   └── db.js          # SQLite storage for chat IDs
└── utils/             # Utility functions
    ├── logs.js        # Logging utilities
    └── scoring.js     # Match scoring algorithms
```

### Scoring Algorithm

The bot uses a sophisticated scoring system to find the best match:

1. **Exact Match (100%)**: All fields (track, artist, album) match exactly
2. **High Confidence (90-99%)**: Minor differences in formatting or punctuation
3. **Good Match (80-89%)**: Some variations in track/album names
4. **Moderate Match (60-79%)**: Different album but same track and artist
5. **Low Match (<60%)**: Significant differences, less reliable

### API Rate Limits
- **Spotify**: 100 requests/minute (free tier)
- **Apple Music**: 1000 requests/minute per key

## Example Usage

```
User posts: https://open.spotify.com/track/4iV5W9uYEdYUVa79Axb7Rh

Bot responds:
🎵 Spotify → Apple Music (Exact match)
https://music.apple.com/us/album/never-gonna-give-you-up/1558533900?i=1558533905
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Credits

Based on the architecture of [frigate-telebot](https://github.com/your-repo/frigate-telebot) and music conversion logic from [AMSpotConverter](https://github.com/your-repo/AMSpotConverter).

Copyright (c) 2025 Northern Captain.
