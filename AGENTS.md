# Appwrite Platform Information

For debugging with Playwright, always use:

- **URL**: https://haven-space.appwrite.network

We are using the Appwrite platform for:

- Deployment
- Site hosting
- Authentication
- Storage
- Database
- Functions
- Storage

GOOGLE_REDIRECT_URI=http://localhost:8000/api/auth/google/callback.php
APP_BASE_URL=http://localhost

**Important**: Always push changes to the repository so the Appwrite site will update automatically.

**Documentation**: When prompting or working on Appwrite-related deployment tasks, always use the Appwrite MCP (Multi-Platform Client) for documentation and reference.

**AGENTS**: Use Appwrite MCP for all agent-related tasks and interactions.

**Note**: After implementing a feature, create a `.php` test script to verify functionality. Delete the test script once the feature is confirmed working.

**Bun Commands**: Always use Bun commands for package management and task running.

**Debugging**: When debugging from localhost and encountering errors like "Internal Server Error", "Unauthorized", or any other type of error, ensure to also include fixes for the production environment.

**Run Server**: Do not run `bun run server` as it is already running by default. If issues arise (e.g., `localhost:8000` not running), do not run the server. Instead, investigate potential issues or check the latest error logs during the server run.

**Frontend**: The frontend is running on `http://localhost` (no port provided by XAMPP). The default development server is port 80 (Apache).

**Server**: The server is already running on port 8000.

**UI/UX Changes**: When making UI/UX changes, always reference @DESIGN.md and @.agents/skills/frontend-design/SKILL.md for design guidelines and best practices.

## dufault supeadmin credentials

admin@mail.com
Superadmin123
