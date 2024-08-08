# Discord Bot with Winston Logger

This project is a Discord bot that uses the discord.js library and Winston logging system for efficient event and error tracking. The project is built with TypeScript.

## Features

- Integration with Discord API via discord.js
- Advanced logging using Winston
- Command and interaction handling
- Customizable logging levels
- Log output to files and console
- TypeScript support

## Requirements

- Node.js (version 16.9.0 or higher)
- npm (usually comes with Node.js)
- Discord account and created bot application

## Installation

1. Clone the repository:
   ```
   git clone https://github.com/BLOCKMATERIAL/team-master-discord-bot-ts
   cd your-repo-name
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env` file in the root directory of the project and add your Discord bot token:
   ```
   DISCORD_TOKEN=your_bot_token
   ```

4. Create a directory for logs:
   ```
   mkdir logs
   ```

## Configuration

You can configure the logging level by changing the `LOG_LEVEL` environment variable in the `.env` file:

```
LOG_LEVEL=info
```

Available levels: error, warn, info, http, verbose, debug, silly.

## Usage

The project includes several npm scripts for different purposes:

- Build the project:
  ```
  npm run build
  ```

- Start the bot (after building):
  ```
  npm start
  ```

- Run the bot in development mode with auto-reloading:
  ```
  npm run dev
  ```

- Build and start the bot in one command:
  ```
  npm run build:start
  ```

For production use, we recommend using the `build:start` script:

```
npm run build:start
```

## Project Structure

- `src/`: Source TypeScript files
  - `index.ts`: Main bot file
  - `logger.ts`: Winston logger configuration
- `dist/`: Compiled JavaScript files (generated after build)
- `commands/`: Directory for bot commands
- `events/`: Directory for event handlers
- `logs/`: Directory for log files

## Logging

Logs are written to the following files:
- `logs/all.log`: All logs
- `logs/error.log`: Errors only

Logs are also output to the console during development.

## Contributing

If you'd like to contribute to the project, please create an issue or submit a pull request.

## License

This project is licensed under the [MIT License](LICENSE).

## Contact

If you have any questions or suggestions, please create an issue in this repository.