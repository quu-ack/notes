# Botpress CLI How-To Guides

Complete guide collection for building bots using the Botpress CLI. These guides cover the most common scenarios developers encounter when working with the CLI.

---

## Table of Contents

1. [Creating Your First Bot from Scratch](#guide-1-creating-your-first-bot-from-scratch)
2. [Building a Custom Integration for External Services](#guide-2-building-a-custom-integration-for-external-services)
3. [Developing with Hot Reload (Rapid Iteration)](#guide-3-developing-with-hot-reload-rapid-iteration)
4. [Managing Multiple Environments (Dev, Staging, Production)](#guide-4-managing-multiple-environments-dev-staging-production)
5. [Debugging and Troubleshooting Bot Issues](#guide-5-debugging-and-troubleshooting-bot-issues)

---

## Guide 1: Creating Your First Bot from Scratch

### Scenario
You're starting a new chatbot project and need to set up everything from authentication to deployment.

### Prerequisites
- Node.js version 18+ installed
- pnpm package manager (recommended)
- A Botpress Cloud account

### Steps

#### 1. Authenticate with Botpress Cloud

```bash
bp login
```

When prompted:
- Enter your Personal Access Token (get it from Botpress Cloud dashboard)
- Select your workspace from the list
- The CLI will save your credentials for future use

#### 2. Initialize Your Bot Project

```bash
bp init --type bot --name my-first-bot
cd my-first-bot
```

This creates:
- `bot.definition.ts` - Bot configuration file
- `src/index.ts` - Main bot implementation
- `package.json` - Node dependencies
- `tsconfig.json` - TypeScript configuration
- `.botpress/` directory for generated files

#### 3. Install Dependencies

```bash
pnpm install
```

#### 4. Add an Integration (e.g., Slack)

```bash
bp add integration:slack@latest --alias mySlack
```

This command:
- Downloads the Slack integration
- Installs it to `.botpress/integrations/mySlack/`
- Updates your `package.json` with the dependency
- Generates TypeScript types for autocompletion

#### 5. Implement Your Bot Logic

Edit `src/index.ts`:

```typescript
import * as bp from '.botpress'
import * as mySlack from '.botpress/integrations/mySlack'

const bot = new bp.Bot({
  actions: {
    // Handle incoming messages
    async handleMessage(props) {
      const { event, client } = props

      if (event.type === 'message') {
        const userMessage = event.payload.text

        // Simple echo bot
        await client.createMessage({
          conversationId: event.conversationId,
          type: 'text',
          payload: { text: `You said: ${userMessage}` }
        })
      }
    }
  }
})

export default bot
```

#### 6. Build Your Bot

```bash
bp build
```

This command:
- Runs `bp generate` to create TypeScript types
- Runs `bp bundle` to compile your code
- Outputs to `.botpress/dist/`

#### 7. Deploy to Botpress Cloud

```bash
bp deploy
```

On first deployment:
- You'll be prompted to select an existing bot or create a new one
- The CLI caches your choice in `.botpress/.cache`
- Configuration secrets (if any) will be prompted

#### 8. Test Your Bot

```bash
bp chat
```

This launches an interactive terminal chat interface to test your bot locally.

### Common Issues

**Issue**: "No bot selected"
**Solution**: Run `bp deploy` again and select or create a bot

**Issue**: "Build failed"
**Solution**: Check `src/index.ts` for TypeScript errors, run `bp generate` first

**Issue**: "Integration not found"
**Solution**: Ensure you've run `bp build` after adding integrations

### Next Steps
- Configure integration settings in the Botpress Cloud dashboard
- Add more sophisticated conversation logic
- Set up state management with conversation variables
- Connect additional channels

---

## Guide 2: Building a Custom Integration for External Services

### Scenario
You need to connect your bot to a third-party API (e.g., a CRM system, payment gateway, or custom backend).

### Prerequisites
- Botpress Cloud account with workspace handle (e.g., `myworkspace`)
- API credentials for the external service
- Basic understanding of webhooks and REST APIs

### Steps

#### 1. Initialize Integration Project

```bash
bp init --type integration --template hello-world --name myworkspace/crm-integration
cd crm-integration
```

Your project structure:
```
crm-integration/
├── integration.definition.ts  # Schema definition
├── src/index.ts              # Implementation
├── icon.svg                  # Integration icon
├── hub.md                    # Documentation
└── package.json
```

#### 2. Define Your Integration Schema

Edit `integration.definition.ts`:

```typescript
import { z, IntegrationDefinition } from '@botpress/sdk'

export default new IntegrationDefinition({
  name: 'myworkspace/crm-integration',
  version: '1.0.0',
  readme: 'hub.md',
  icon: 'icon.svg',

  // Configuration that bot developers will provide
  configuration: {
    schema: z.object({
      crmApiUrl: z.string().url().describe('CRM API Base URL'),
      apiKey: z.string().describe('API Key for authentication'),
    }),
  },

  // Secrets (prompted during deployment, never exposed)
  secrets: {
    CRM_SECRET_TOKEN: {
      description: 'Secret token for webhook validation'
    }
  },

  // Actions that bots can call
  actions: {
    createContact: {
      title: 'Create Contact',
      description: 'Create a new contact in the CRM',
      input: {
        schema: z.object({
          email: z.string().email(),
          firstName: z.string(),
          lastName: z.string(),
          phone: z.string().optional(),
        }),
      },
      output: {
        schema: z.object({
          contactId: z.string(),
          success: z.boolean(),
        }),
      },
    },

    getContact: {
      title: 'Get Contact',
      description: 'Retrieve contact details by email',
      input: {
        schema: z.object({
          email: z.string().email(),
        }),
      },
      output: {
        schema: z.object({
          contactId: z.string().optional(),
          firstName: z.string().optional(),
          lastName: z.string().optional(),
          found: z.boolean(),
        }),
      },
    },
  },

  // Events your integration can emit to bots
  events: {
    contactCreated: {
      title: 'Contact Created',
      description: 'Triggered when a new contact is created',
      schema: z.object({
        contactId: z.string(),
        email: z.string(),
      }),
    },
  },
})
```

#### 3. Implement Actions and Event Handlers

Edit `src/index.ts`:

```typescript
import * as sdk from '@botpress/sdk'
import axios from 'axios'
import * as bp from '.botpress'

export default new bp.Integration({
  // Called when a bot installs/configures the integration
  register: async ({ ctx, logger }) => {
    const { crmApiUrl, apiKey } = ctx.configuration

    // Validate configuration by testing API connection
    try {
      await axios.get(`${crmApiUrl}/health`, {
        headers: { 'Authorization': `Bearer ${apiKey}` }
      })
      logger.forBot().info('CRM API connection validated')
    } catch (error) {
      throw new sdk.RuntimeError('Invalid CRM API credentials')
    }
  },

  // Called when a bot uninstalls the integration
  unregister: async ({ logger }) => {
    logger.forBot().info('Integration unregistered')
  },

  // Implement actions
  actions: {
    createContact: async ({ ctx, input, logger }) => {
      const { crmApiUrl, apiKey } = ctx.configuration
      const { email, firstName, lastName, phone } = input

      try {
        const response = await axios.post(
          `${crmApiUrl}/contacts`,
          { email, firstName, lastName, phone },
          { headers: { 'Authorization': `Bearer ${apiKey}` } }
        )

        logger.forBot().info(`Contact created: ${email}`)

        return {
          contactId: response.data.id,
          success: true,
        }
      } catch (error) {
        logger.forBot().error(`Failed to create contact: ${error}`)
        return {
          contactId: '',
          success: false,
        }
      }
    },

    getContact: async ({ ctx, input, logger }) => {
      const { crmApiUrl, apiKey } = ctx.configuration
      const { email } = input

      try {
        const response = await axios.get(
          `${crmApiUrl}/contacts?email=${email}`,
          { headers: { 'Authorization': `Bearer ${apiKey}` } }
        )

        if (response.data.length > 0) {
          const contact = response.data[0]
          return {
            contactId: contact.id,
            firstName: contact.firstName,
            lastName: contact.lastName,
            found: true,
          }
        }

        return { found: false }
      } catch (error) {
        logger.forBot().error(`Failed to get contact: ${error}`)
        return { found: false }
      }
    },
  },

  channels: {},

  // Webhook handler for incoming events from external service
  handler: async ({ req, client, ctx, logger }) => {
    const { CRM_SECRET_TOKEN } = ctx.secrets

    // Validate webhook signature
    const signature = req.headers['x-crm-signature']
    if (signature !== CRM_SECRET_TOKEN) {
      return {
        status: 401,
        body: JSON.stringify({ error: 'Unauthorized' }),
      }
    }

    // Parse webhook payload
    const payload = JSON.parse(req.body || '{}')

    if (payload.event === 'contact.created') {
      // Emit event to all bots using this integration
      await client.createEvent({
        type: 'contactCreated',
        payload: {
          contactId: payload.contact.id,
          email: payload.contact.email,
        },
      })

      logger.forBot().info(`Contact created event emitted: ${payload.contact.email}`)
    }

    return {
      status: 200,
      body: JSON.stringify({ received: true }),
    }
  },
})
```

#### 4. Generate Types and Build

```bash
bp build
```

#### 5. Deploy Your Integration

```bash
bp deploy --visibility public
```

You'll be prompted for:
- **CRM_SECRET_TOKEN**: The secret token value
- Deployment creates a versioned integration on Botpress Cloud

#### 6. Use the Integration in a Bot

In your bot project:

```bash
bp add integration:myworkspace/crm-integration@1.0.0 --alias crm
bp build
```

Then in your bot code:

```typescript
import * as crm from '.botpress/integrations/crm'

// Call integration actions
const result = await crm.actions.createContact({
  email: 'user@example.com',
  firstName: 'John',
  lastName: 'Doe',
})

// Listen for integration events
bot.on('crm:contactCreated', async ({ event, client }) => {
  await client.createMessage({
    conversationId: event.conversationId,
    type: 'text',
    payload: { text: `New contact created: ${event.payload.email}` }
  })
})
```

### Best Practices

1. **Error Handling**: Always wrap external API calls in try-catch blocks
2. **Logging**: Use `logger.forBot()` to provide visibility to bot developers
3. **Validation**: Validate all inputs using Zod schemas
4. **Versioning**: Use semantic versioning and document breaking changes
5. **Security**: Store sensitive data in secrets, not configuration
6. **Documentation**: Keep `hub.md` updated with usage examples

### Testing Locally

```bash
bp serve --port 8076
```

Then test webhooks using curl:

```bash
curl -X POST http://localhost:8076/ \
  -H "Content-Type: application/json" \
  -H "x-crm-signature: your-secret-token" \
  -d '{"event": "contact.created", "contact": {"id": "123", "email": "test@example.com"}}'
```

---

## Guide 3: Developing with Hot Reload (Rapid Iteration)

### Scenario
You're actively developing a bot or integration and want instant feedback without manual rebuilds and redeployments.

### Prerequisites
- Existing bot or integration project
- Botpress Cloud account
- Stable internet connection (for tunnel)

### Steps

#### 1. Understand Dev Mode

The `bp dev` command provides:
- **Automatic file watching**: Detects changes to `.ts` files
- **Hot reloading**: Rebuilds and restarts on changes
- **Tunnel setup**: Exposes local server via `https://tunnel.botpress.cloud`
- **Dev instance**: Creates a temporary bot/integration for testing
- **Fast iteration**: No manual deploy needed

#### 2. Start Development Mode

```bash
bp dev
```

Output:
```
Starting development server...
Creating dev bot...
Setting up tunnel...
Tunnel URL: https://abc123.tunnel.botpress.cloud
Dev Bot ID: dev_xyz789
Watching for changes...
```

#### 3. Understanding the Dev Workflow

The CLI:
1. Creates a dev bot/integration in the cloud (prefixed with `dev_`)
2. Stores `devId` and `tunnelId` in `.botpress/.cache`
3. Starts a local server
4. Sets up tunnel forwarding
5. Watches your TypeScript files

#### 4. Make Changes and See Them Live

Edit `src/index.ts`:

```typescript
import * as bp from '.botpress'

const bot = new bp.Bot({
  actions: {
    async handleMessage(props) {
      const { event, client } = props

      // Change this message and save
      await client.createMessage({
        conversationId: event.conversationId,
        type: 'text',
        payload: { text: 'Hello from dev mode!' } // Modified
      })
    }
  }
})

export default bot
```

Save the file, and you'll see:

```
File changed: src/index.ts
Rebuilding...
Build successful
Restarting server...
Server restarted
```

#### 5. Test Webhooks with the Tunnel URL

For integrations with webhooks, use the tunnel URL:

```bash
curl -X POST https://abc123.tunnel.botpress.cloud/webhook \
  -H "Content-Type: application/json" \
  -d '{"userId": "user123", "text": "Hello"}'
```

The request is automatically forwarded to your local server.

#### 6. View Logs in Real-Time

All logs appear in the terminal:

```
[INFO] Bot message received
[DEBUG] Processing user input: "Hello"
[INFO] Response sent: "Hello from dev mode!"
```

#### 7. Stop Dev Mode

Press `Ctrl+C` to stop the development server.

The dev bot/integration remains in the cloud but is inactive. Restart with `bp dev` to resume.

#### 8. Clean Up Dev Instances (Optional)

List dev instances:

```bash
bp bots list --dev
```

Delete a dev bot:

```bash
bp bots delete dev_xyz789
```

### Advanced Dev Mode Features

#### Custom Port

```bash
bp dev --port 8080
```

#### Custom Tunnel Provider

If using a different tunnel service:

```bash
bp dev --tunnelUrl https://my-custom-tunnel.com
```

#### Skip Tunnel Setup

For bots without webhooks:

```bash
bp dev --noTunnel
```

### Troubleshooting

**Issue**: "Dev mode failed to start"
**Solution**: Check internet connection, ensure no other process is using the port

**Issue**: "Tunnel connection lost"
**Solution**: Restart `bp dev`, tunnels can occasionally disconnect

**Issue**: "Changes not reflected"
**Solution**: Check console for build errors, ensure you're editing the correct file

**Issue**: "Integration secrets not set"
**Solution**: Dev mode uses the same secrets as deployed integrations, set them first via `bp deploy`

### Best Practices

1. **Use dev mode for active development only**: Deploy properly for testing/production
2. **Don't share tunnel URLs**: They're temporary and tied to your session
3. **Monitor console output**: Build errors appear immediately
4. **Test frequently**: Make small changes and test often
5. **Keep dev instances clean**: Delete old dev bots/integrations periodically

### When NOT to Use Dev Mode

- **Stable testing**: Use `bp serve` for controlled local testing
- **Production**: Always use `bp deploy` for production
- **CI/CD pipelines**: Dev mode is for local development only
- **Long-running bots**: Dev instances are meant to be temporary

---

## Guide 4: Managing Multiple Environments (Dev, Staging, Production)

### Scenario
You're working on a professional project and need separate environments for development, staging, and production with different configurations and credentials.

### Prerequisites
- Multiple Botpress workspaces or bots
- Different API credentials per environment
- Version control (Git) for code management

### Steps

#### 1. Set Up Multiple CLI Profiles

Create profiles for each environment:

```bash
# Development profile
bp login --profile dev
# Enter dev workspace credentials

# Staging profile
bp login --profile staging
# Enter staging workspace credentials

# Production profile
bp login --profile production
# Enter production workspace credentials
```

#### 2. List Available Profiles

```bash
bp profiles list
```

Output:
```
Available profiles:
- dev
- staging
- production (active)
```

#### 3. Switch Between Profiles

```bash
bp profiles use dev
```

Check active profile:

```bash
bp profiles active
```

Output:
```
Active profile: dev
Workspace: my-dev-workspace
API URL: https://api.botpress.cloud
```

#### 4. Structure Your Project with Environment Configs

Create environment-specific configuration files:

```
my-bot/
├── src/
│   ├── index.ts
│   └── config/
│       ├── config.dev.ts
│       ├── config.staging.ts
│       └── config.production.ts
├── bot.definition.ts
├── .env.dev
├── .env.staging
├── .env.production
└── package.json
```

#### 5. Create Environment Config Files

`src/config/config.dev.ts`:

```typescript
export const config = {
  environment: 'development',
  apiUrl: 'https://api-dev.example.com',
  logLevel: 'debug',
  featureFlags: {
    enableBetaFeatures: true,
    enableAnalytics: false,
  },
}
```

`src/config/config.production.ts`:

```typescript
export const config = {
  environment: 'production',
  apiUrl: 'https://api.example.com',
  logLevel: 'info',
  featureFlags: {
    enableBetaFeatures: false,
    enableAnalytics: true,
  },
}
```

#### 6. Use Environment Variables

`.env.dev`:

```bash
NODE_ENV=development
API_KEY=dev_key_12345
WEBHOOK_SECRET=dev_secret_xyz
```

`.env.production`:

```bash
NODE_ENV=production
API_KEY=prod_key_67890
WEBHOOK_SECRET=prod_secret_abc
```

#### 7. Load Config Dynamically

`src/index.ts`:

```typescript
import * as bp from '.botpress'
import { config as devConfig } from './config/config.dev'
import { config as stagingConfig } from './config/config.staging'
import { config as prodConfig } from './config/config.production'

// Determine environment from build or runtime
const ENV = process.env.NODE_ENV || 'development'

const config = {
  development: devConfig,
  staging: stagingConfig,
  production: prodConfig,
}[ENV]

const bot = new bp.Bot({
  actions: {
    async handleMessage(props) {
      const { client, logger } = props

      logger.forBot().info(`Running in ${config.environment} mode`)

      // Use environment-specific config
      if (config.featureFlags.enableBetaFeatures) {
        // Beta feature logic
      }
    }
  }
})

export default bot
```

#### 8. Deploy to Specific Environments

**Deploy to Development:**

```bash
# Switch to dev profile
bp profiles use dev

# Build and deploy
bp build
bp deploy --botId dev-bot-id

# Or create new dev bot
bp deploy --createNewBot
```

**Deploy to Staging:**

```bash
bp profiles use staging
bp build
bp deploy --botId staging-bot-id
```

**Deploy to Production:**

```bash
bp profiles use production
bp build
bp deploy --botId prod-bot-id
```

#### 9. Use Git Branches for Environments

```bash
# Development branch
git checkout develop
bp profiles use dev
bp deploy

# Staging branch
git checkout staging
bp profiles use staging
bp deploy

# Production branch (main)
git checkout main
bp profiles use production
bp deploy
```

#### 10. Create Deployment Scripts

`package.json`:

```json
{
  "scripts": {
    "deploy:dev": "bp profiles use dev && bp build && bp deploy --botId $DEV_BOT_ID",
    "deploy:staging": "bp profiles use staging && bp build && bp deploy --botId $STAGING_BOT_ID",
    "deploy:prod": "bp profiles use production && bp build && bp deploy --botId $PROD_BOT_ID",
    "test": "pnpm vitest",
    "lint": "bp lint"
  }
}
```

Usage:

```bash
pnpm run deploy:dev
pnpm run deploy:staging
pnpm run deploy:prod
```

#### 11. Version Integrations Per Environment

For integrations, use versioning:

```bash
# Dev: deploy as dev version
bp profiles use dev
bp deploy --visibility unlisted

# Staging: deploy as release candidate
bp profiles use staging
bp deploy --visibility private

# Production: deploy as stable release
bp profiles use production
bp deploy --visibility public
```

### Best Practices

#### 1. Environment Isolation

- Use separate workspaces for true isolation
- Never share production credentials
- Limit production access to senior developers

#### 2. Configuration Management

- Never commit secrets to Git
- Use `.env` files and add to `.gitignore`
- Document required environment variables

#### 3. Deployment Workflow

```
develop branch → dev environment (automatic)
     ↓
staging branch → staging environment (on PR approval)
     ↓
main branch → production (manual, with approval)
```

#### 4. Testing Strategy

- **Dev**: Continuous testing during development
- **Staging**: QA testing, integration tests
- **Production**: Limited canary rollout, monitoring

#### 5. Monitoring and Rollback

Monitor deployments:

```bash
# Check bot status
bp bots get <botId>

# View recent activity in Botpress Cloud dashboard
```

Rollback if needed:

```bash
# Redeploy previous Git commit
git checkout <previous-commit>
bp deploy
```

### CI/CD Integration Example

`.github/workflows/deploy.yml`:

```yaml
name: Deploy Bot

on:
  push:
    branches:
      - develop
      - staging
      - main

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: pnpm install

      - name: Run tests
        run: pnpm test

      - name: Deploy to Dev
        if: github.ref == 'refs/heads/develop'
        run: |
          echo "${{ secrets.BP_DEV_TOKEN }}" | bp login --profile dev
          bp build
          bp deploy --botId ${{ secrets.DEV_BOT_ID }}

      - name: Deploy to Staging
        if: github.ref == 'refs/heads/staging'
        run: |
          echo "${{ secrets.BP_STAGING_TOKEN }}" | bp login --profile staging
          bp build
          bp deploy --botId ${{ secrets.STAGING_BOT_ID }}

      - name: Deploy to Production
        if: github.ref == 'refs/heads/main'
        run: |
          echo "${{ secrets.BP_PROD_TOKEN }}" | bp login --profile production
          bp build
          bp deploy --botId ${{ secrets.PROD_BOT_ID }}
```

### Environment Comparison Table

| Aspect | Development | Staging | Production |
|--------|-------------|---------|------------|
| Profile | `dev` | `staging` | `production` |
| Bot ID | `dev-bot-id` | `staging-bot-id` | `prod-bot-id` |
| Log Level | `debug` | `info` | `warn` |
| Auto-deploy | Yes (on commit) | Yes (on PR merge) | Manual only |
| Feature Flags | All enabled | Selected | Stable only |
| Monitoring | Basic | Full | Full + Alerts |
| Access | All developers | QA + Leads | Restricted |

---

## Guide 5: Debugging and Troubleshooting Bot Issues

### Scenario
Your bot isn't behaving as expected, and you need to identify and fix issues quickly.

### Prerequisites
- Deployed bot or integration
- Access to Botpress Cloud dashboard
- Basic understanding of logging and debugging

### Common Issues and Solutions

#### Issue 1: Bot Not Responding to Messages

**Symptoms:**
- Messages sent but no response
- No errors in console

**Debugging Steps:**

1. **Check bot deployment status**

```bash
bp bots get <botId>
```

Verify the bot is active and deployed.

2. **Inspect recent logs**

In `src/index.ts`, add extensive logging:

```typescript
import * as bp from '.botpress'

const bot = new bp.Bot({
  actions: {
    async handleMessage(props) {
      const { event, client, logger } = props

      // Debug logging
      logger.forBot().info('=== Message Handler Called ===')
      logger.forBot().info(`Event type: ${event.type}`)
      logger.forBot().info(`Conversation ID: ${event.conversationId}`)
      logger.forBot().info(`User ID: ${event.userId}`)
      logger.forBot().info(`Payload: ${JSON.stringify(event.payload)}`)

      try {
        await client.createMessage({
          conversationId: event.conversationId,
          type: 'text',
          payload: { text: 'Response' }
        })

        logger.forBot().info('Message sent successfully')
      } catch (error) {
        logger.forBot().error(`Failed to send message: ${error}`)
      }
    }
  }
})

export default bot
```

3. **Redeploy with logging**

```bash
bp build && bp deploy
```

4. **Test and check Botpress Cloud logs**

Send a test message and view logs in the Botpress Cloud dashboard under "Logs" section.

**Common Causes:**
- Event handler not registered correctly
- Wrong conversation ID
- Integration not configured properly

---

#### Issue 2: Integration Actions Failing

**Symptoms:**
- Action calls return errors
- Timeouts or connection issues

**Debugging Steps:**

1. **Test integration locally**

```bash
bp serve --port 8076
```

2. **Call action directly with curl**

```bash
curl -X POST http://localhost:8076/action/createContact \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "firstName": "Test",
    "lastName": "User"
  }'
```

3. **Add detailed error logging**

In `src/index.ts`:

```typescript
actions: {
  createContact: async ({ ctx, input, logger }) => {
    logger.forBot().info(`Action called with input: ${JSON.stringify(input)}`)

    try {
      const { crmApiUrl, apiKey } = ctx.configuration
      logger.forBot().info(`API URL: ${crmApiUrl}`)

      const response = await axios.post(
        `${crmApiUrl}/contacts`,
        input,
        {
          headers: { 'Authorization': `Bearer ${apiKey}` },
          timeout: 10000 // 10 second timeout
        }
      )

      logger.forBot().info(`Response status: ${response.status}`)
      logger.forBot().info(`Response data: ${JSON.stringify(response.data)}`)

      return { contactId: response.data.id, success: true }

    } catch (error) {
      // Detailed error logging
      if (axios.isAxiosError(error)) {
        logger.forBot().error(`HTTP Error: ${error.response?.status}`)
        logger.forBot().error(`Error data: ${JSON.stringify(error.response?.data)}`)
      } else {
        logger.forBot().error(`Unknown error: ${error}`)
      }

      return { contactId: '', success: false }
    }
  }
}
```

4. **Verify configuration**

```bash
bp read
```

Check that configuration schema matches what you're using in code.

**Common Causes:**
- Invalid API credentials
- Network/firewall issues
- Incorrect API URL
- Missing required fields
- Timeout issues

---

#### Issue 3: Type Errors and Build Failures

**Symptoms:**
- `bp build` fails with TypeScript errors
- Autocomplete not working

**Debugging Steps:**

1. **Regenerate types**

```bash
bp generate
```

This recreates `.botpress/types/` based on your definition files.

2. **Check for type mismatches**

Example error:

```
Type '{ text: string; }' is not assignable to type 'TextPayload'
```

Solution - Check generated types:

```bash
cat .botpress/types/index.d.ts
```

Ensure your payload matches the expected type.

3. **Clear cache and rebuild**

```bash
rm -rf .botpress/
pnpm install
bp build
```

4. **Verify integration types**

After adding an integration:

```bash
bp add integration:slack@latest
bp generate
```

Check that `.botpress/integrations/slack/` exists.

**Common Causes:**
- Outdated generated types
- Mismatched schema definitions
- Corrupted cache
- Integration not properly installed

---

#### Issue 4: Webhook Handler Not Receiving Requests

**Symptoms:**
- External service sends webhooks but bot doesn't respond
- 404 or timeout errors

**Debugging Steps:**

1. **Test webhook locally**

```bash
bp serve --port 8076
```

Send test request:

```bash
curl -X POST http://localhost:8076/ \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'
```

2. **Add handler logging**

```typescript
handler: async ({ req, client, logger }) => {
  logger.forBot().info('=== Webhook Handler Called ===')
  logger.forBot().info(`Method: ${req.method}`)
  logger.forBot().info(`Headers: ${JSON.stringify(req.headers)}`)
  logger.forBot().info(`Body: ${req.body}`)

  try {
    const payload = JSON.parse(req.body || '{}')
    logger.forBot().info(`Parsed payload: ${JSON.stringify(payload)}`)

    // Your handler logic

    return {
      status: 200,
      body: JSON.stringify({ received: true })
    }
  } catch (error) {
    logger.forBot().error(`Handler error: ${error}`)
    return {
      status: 500,
      body: JSON.stringify({ error: String(error) })
    }
  }
}
```

3. **Verify webhook URL**

After deployment, get the webhook URL:

```bash
bp integrations get myworkspace/my-integration
```

Configure this URL in the external service.

4. **Check signature validation**

If using signature validation:

```typescript
const signature = req.headers['x-webhook-signature']
const expectedSignature = computeSignature(req.body, ctx.secrets.WEBHOOK_SECRET)

if (signature !== expectedSignature) {
  logger.forBot().warn(`Invalid signature. Got: ${signature}, Expected: ${expectedSignature}`)
  return { status: 401, body: JSON.stringify({ error: 'Unauthorized' }) }
}
```

**Common Causes:**
- Incorrect webhook URL configured in external service
- Signature validation failing
- Request body parsing issues
- Firewall blocking requests

---

#### Issue 5: State and Conversation Management Issues

**Symptoms:**
- Bot loses context between messages
- Variables not persisting
- Multiple conversations created for same user

**Debugging Steps:**

1. **Inspect conversation state**

```typescript
const bot = new bp.Bot({
  actions: {
    async handleMessage(props) {
      const { event, client, logger } = props

      // Get current conversation
      const { conversation } = await client.getConversation({
        id: event.conversationId
      })

      logger.forBot().info(`Conversation state: ${JSON.stringify(conversation)}`)
      logger.forBot().info(`Conversation tags: ${JSON.stringify(conversation.tags)}`)

      // Get or create user
      const { user } = await client.getOrCreateUser({
        tags: { id: event.userId }
      })

      logger.forBot().info(`User state: ${JSON.stringify(user)}`)
    }
  }
})
```

2. **Use conversation tags correctly**

```typescript
// Create conversation with external ID
const { conversation } = await client.getOrCreateConversation({
  channel: 'webhook',
  tags: {
    id: externalConversationId, // From external system
  }
})

// This ensures same conversation is reused
```

3. **Store state in conversation variables**

```typescript
// Update conversation with custom data
await client.updateConversation({
  id: conversation.id,
  tags: {
    ...conversation.tags,
    lastIntent: 'order_pizza',
    orderStatus: 'pending',
  }
})

// Retrieve later
const { conversation: updatedConv } = await client.getConversation({
  id: conversation.id
})

const lastIntent = updatedConv.tags.lastIntent
```

**Common Causes:**
- Not using `getOrCreateConversation` consistently
- Incorrect tag usage
- Creating new conversations instead of reusing existing ones

---

### General Debugging Tools

#### 1. Linting Your Project

```bash
bp lint
```

Validates your definition file against best practices.

#### 2. Dry Run Deployments

```bash
bp deploy --dryRun
```

Simulates deployment without actually deploying.

#### 3. Read Parsed Definition

```bash
bp read
```

Shows how the CLI interprets your definition file.

#### 4. Interactive Chat Testing

```bash
bp chat
```

Test bot in terminal without external integrations.

#### 5. List All Resources

```bash
bp bots list
bp integrations list
bp interfaces list
```

### Debugging Checklist

When facing issues, go through this checklist:

- [ ] Run `bp generate` to update types
- [ ] Run `bp build` to check for compile errors
- [ ] Check logs in Botpress Cloud dashboard
- [ ] Add `logger.forBot().info()` statements liberally
- [ ] Test locally with `bp serve`
- [ ] Verify configuration with `bp read`
- [ ] Check bot status with `bp bots get <botId>`
- [ ] Ensure integrations are properly installed
- [ ] Verify webhook URLs are correct
- [ ] Test with minimal reproduction case
- [ ] Clear cache: `rm -rf .botpress/` and rebuild

### Getting Help

If stuck:

1. Check [Botpress Documentation](https://botpress.com/docs)
2. Review CLI help: `bp --help` or `bp <command> --help`
3. Visit Botpress Community Forum
4. Check GitHub Issues for similar problems

---

## Quick Reference

### Most Used Commands

```bash
# Authentication
bp login
bp logout

# Project setup
bp init --type bot --name my-bot
bp add integration:slack@latest

# Development
bp build                    # Generate types + bundle
bp generate                 # Generate types only
bp bundle                   # Bundle code only
bp dev                      # Hot reload development

# Testing
bp serve --port 8076       # Local testing
bp chat                     # Interactive chat
bp lint                     # Validate definitions

# Deployment
bp deploy                   # Deploy to cloud
bp deploy --dryRun         # Test deployment
bp deploy --createNewBot   # Create new bot

# Environment management
bp profiles list            # List profiles
bp profiles use dev         # Switch profile

# Resource management
bp bots list               # List bots
bp bots get <botId>        # Get bot details
bp integrations list       # List integrations
```

### Project Structure

```
my-bot/
├── .botpress/              # Generated files (gitignored)
│   ├── .cache/            # Build cache, IDs
│   ├── dist/              # Bundled output
│   ├── integrations/      # Installed integrations
│   └── types/             # Generated TypeScript types
├── src/
│   └── index.ts           # Bot/integration implementation
├── bot.definition.ts      # Bot configuration
├── integration.definition.ts  # Integration schema
├── package.json
└── tsconfig.json
```

### Best Practices Summary

1. Always run `bp generate` after modifying definition files
2. Use `bp build` before deploying
3. Test locally with `bp serve` before deploying
4. Use `bp dev` for rapid iteration during active development
5. Keep secrets in integration secrets, not configuration
6. Use `logger.forBot()` for bot-visible logs
7. Version integrations with semantic versioning
8. Use profiles for environment separation
9. Never commit `.botpress/` or `.env` files
10. Document your integration in `hub.md`

---

## Additional Resources

- [Botpress Documentation](https://botpress.com/docs)
- [Botpress CLI GitHub](https://github.com/botpress/botpress)
- [Botpress Community](https://community.botpress.com)
- [Botpress Academy](https://academy.botpress.com)

---

**Last Updated**: 2025
**CLI Version**: Compatible with latest Botpress CLI