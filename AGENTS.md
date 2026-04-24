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

**Important**: Always push changes to the repository so the Appwrite site will update automatically.

**Documentation**: When prompting or working on Appwrite-related deployment tasks, always use the Appwrite MCP (Multi-Platform Client) for documentation and reference.

**Note**: Do not push the `.playwrite-mcp` directory to the repository.

**AGENTS**: Use Appwrite MCP for all agent-related tasks and interactions.

**Note**: After implementing a feature, create a `.php` test script to verify functionality. Delete the test script once the feature is confirmed working.

**Bun Commands**: Always use Bun commands for package management and task running.

**Debugging**: When debugging from localhost and encountering errors like "Internal Server Error", "Unauthorized", or any other type of error, ensure to also include fixes for the production environment.

**Run Server**: To run the server, use the command `bun run server`.

## Codebase Structure

### Client

- **components**: Reusable UI components
- **css**: Global and component-specific styles
- **js**: JavaScript modules and utilities
- **views**: Role-specific views (admin, landlord, boarder)
- **index.html**: Main entry point

### Server

- **api**: API endpoints and route handlers
- **src**: Core application logic and services
- **database**: Database-related files
