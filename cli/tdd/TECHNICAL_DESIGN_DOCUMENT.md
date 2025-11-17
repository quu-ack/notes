# Technical Design Document: Botpress CLI

**Version:** 1.0
**Last Updated:** January 2025
**Codebase Size:** ~17,500 lines of TypeScript
**Package:** `@botpress/cli`

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [System Overview](#2-system-overview)
3. [Architecture Principles](#3-architecture-principles)
4. [Core Architecture](#4-core-architecture)
5. [Command System](#5-command-system)
6. [Service Layer](#6-service-layer)
7. [Build and Deployment Pipeline](#7-build-and-deployment-pipeline)
8. [Development Mode](#8-development-mode)
9. [Code Generation System](#9-code-generation-system)
10. [Package Management](#10-package-management)
11. [Configuration System](#11-configuration-system)
12. [Utilities Layer](#12-utilities-layer)
13. [Error Handling Strategy](#13-error-handling-strategy)
14. [Testing Strategy](#14-testing-strategy)
15. [Security Considerations](#15-security-considerations)
16. [Performance Optimizations](#16-performance-optimizations)
17. [Developer Experience](#17-developer-experience)
18. [Future Considerations](#18-future-considerations)

---

## 1. Executive Summary

### Purpose

The Botpress CLI is a comprehensive command-line interface tool that enables developers to develop, build, deploy, and manage Botpress bots, integrations, interfaces, and plugins. It serves as the primary development tool for the Botpress ecosystem.

### Key Capabilities

- **Project Lifecycle Management**: Initialize, develop, build, and deploy Botpress projects
- **Development Environment**: Local development server with hot-reload and tunneling
- **Type Generation**: Automatic TypeScript type definition generation
- **Package Management**: Install and manage dependencies (integrations, interfaces, plugins)
- **Validation & Linting**: Project validation using Spectral-based rules
- **Authentication**: Multi-profile credential management
- **API Integration**: Full integration with Botpress Cloud API

### Technology Stack

- **Language**: TypeScript
- **Build Tool**: esbuild (fast bundling and compilation)
- **CLI Framework**: Yargs with custom enhancements
- **Validation**: Zod schemas (via Botpress SDK)
- **Linting**: Spectral (OpenAPI/AsyncAPI linting engine)
- **File Watching**: @parcel/watcher (native file system monitoring)
- **API Client**: @botpress/client (generated API wrapper)

---

## 2. System Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         CLI Entry Point                       │
│                         (cli.ts)                             │
└───────────────────────────┬─────────────────────────────────┘
                            │
                ┌───────────┴───────────┐
                │                       │
        ┌───────▼────────┐     ┌───────▼────────┐
        │   Command      │     │  Configuration  │
        │   Definitions  │     │   & Constants   │
        └───────┬────────┘     └────────────────┘
                │
        ┌───────▼────────┐
        │   Command      │
        │ Implementations│
        └───────┬────────┘
                │
    ┌───────────┼───────────┐
    │           │           │
┌───▼────┐  ┌──▼───┐  ┌───▼────┐
│ API    │  │Logger│  │Utilities│
│ Client │  │      │  │ (35+)   │
└───┬────┘  └──────┘  └────────┘
    │
┌───▼─────────────────────────────────────────┐
│        Botpress Cloud API                    │
│  (Bots, Integrations, Interfaces, Plugins)  │
└─────────────────────────────────────────────┘
```

### Component Interaction Flow

```
User Command → Yargs Parser → Command Handler → Services → API Client → Botpress Cloud
                                      ↓
                              Utilities & Logger
                                      ↓
                              File System Operations
```

### Directory Structure

```
packages/cli/
├── src/
│   ├── api/                      # API client and request builders
│   ├── chat/                     # Terminal chat interface
│   ├── code-generation/          # TypeScript code generation
│   ├── command-implementations/  # Command handlers (25+ commands)
│   ├── linter/                   # Spectral-based linting
│   ├── logger/                   # Logging infrastructure
│   ├── sdk/                      # SDK validation utilities
│   ├── tables/                   # Table management
│   ├── utils/                    # Utility functions (35+ modules)
│   ├── worker/                   # Dev mode worker processes
│   ├── cli.ts                    # Main entry point
│   ├── command-definitions.ts    # Command schemas
│   ├── config.ts                 # Configuration schemas
│   └── ...
├── templates/                    # Project templates
├── e2e/                          # End-to-end tests
├── bin.js                        # Binary entry point
└── package.json
```

---

## 3. Architecture Principles

### 1. Separation of Concerns

- **Command Definitions** (pure data) are separated from **Command Implementations** (business logic)
- Service layer abstracts API and file system interactions
- Utilities are isolated into single-purpose modules

### 2. Type Safety

- Comprehensive TypeScript types throughout
- Zod schema validation for runtime type safety
- Generated types for project definitions

### 3. Composability

- Configuration schemas are composed from base schemas
- Utilities are small, focused, and reusable
- Commands extend base classes for shared functionality

### 4. Testability

- Services are injectable and mockable
- Pure functions in utilities layer
- E2E tests for critical user flows

### 5. Developer Experience

- Clear error messages with actionable guidance
- Interactive prompts for ambiguous operations
- Verbose mode for debugging
- JSON output for scripting

### 6. Performance

- Lazy loading and caching where appropriate
- Parallel operations for independent tasks
- Incremental builds and hot-reload

---

## 4. Core Architecture

### Entry Point Flow

```typescript
// bin.js (executable)
#!/usr/bin/env node
require('./dist/cli.js')

// cli.ts (main orchestrator)
1. Load environment variables (dotenv)
2. Setup global error handlers
3. Zip command definitions with implementations
4. Register commands with Yargs
5. Parse arguments and route to handler
6. Handle errors and set exit code
```

### Command Execution Lifecycle

```
┌─────────────────────────────────────────────────────┐
│ 1. User executes command                            │
│    $ bp deploy                                      │
└────────────────┬────────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────────┐
│ 2. Yargs parses arguments                           │
│    - Validates required parameters                  │
│    - Applies defaults                               │
│    - Type coercion                                  │
└────────────────┬────────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────────┐
│ 3. Command handler invoked                          │
│    - BaseCommand.handler()                          │
└────────────────┬────────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────────┐
│ 4. Command lifecycle                                │
│    a. bootstrap() - Setup logger, API client        │
│    b. run() - Execute command logic                 │
│    c. teardown() - Cleanup resources                │
└────────────────┬────────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────────┐
│ 5. Error handling                                   │
│    - Catch and map errors                           │
│    - Log appropriately                              │
│    - Set exit code                                  │
└─────────────────────────────────────────────────────┘
```

### Base Command Hierarchy

```
BaseCommand (abstract)
│
├── Provides: logger, command handling, error mapping
│   Methods: handler(), bootstrap(), teardown(), run()
│
├─► GlobalCommand (abstract)
│   │
│   ├── Adds: Global configuration (API URL, workspaceId, token)
│   │   Methods: ensureLoginConfig(), getClient()
│   │
│   ├─► ProjectCommand (abstract)
│       │
│       ├── Adds: Project context (workDir, definition)
│       │   Methods: readDef(), readProjectDefinition()
│       │
│       └─► Concrete Commands
│           ├── DeployCommand
│           ├── BuildCommand
│           ├── DevCommand
│           ├── AddCommand
│           └── ...
│
└─► Concrete Global Commands
    ├── LoginCommand
    ├── LogoutCommand
    └── InitCommand
```

**Responsibilities by Layer:**

- **BaseCommand**: Logger setup, error handling, command lifecycle
- **GlobalCommand**: Authentication, API client instantiation
- **ProjectCommand**: Project file reading, definition validation

---

## 5. Command System

### 5.1 Command Architecture

The CLI uses a **three-layer command system**:

#### Layer 1: Command Definitions (`command-definitions.ts`)

Pure data structures defining command metadata and parameters.

```typescript
{
  login: {
    description: 'Login to Botpress Cloud',
    schema: config.schemas.login
  },
  bots: {
    description: 'Bot related commands',
    subcommands: {
      create: { description: 'Create new bot', schema: config.schemas.createBot },
      get: { description: 'Get bot', schema: config.schemas.getBot },
      list: { description: 'List bots', schema: config.schemas.listBots },
      delete: { description: 'Delete bot', schema: config.schemas.deleteBot }
    }
  },
  // ... more commands
}
```

**Purpose:**
- Single source of truth for command structure
- Yargs option schemas
- Help text generation
- Supports nested subcommands

#### Layer 2: Command Implementations (`command-implementations/`)

Classes containing business logic for each command.

```typescript
export class DeployCommand extends ProjectCommand {
  async run(): Promise<void> {
    const projectDef = await this.readProjectDefinition()

    if (projectDef.type === 'integration') {
      await this.deployIntegration(projectDef)
    } else if (projectDef.type === 'bot') {
      await this.deployBot(projectDef)
    }
    // ... handle other types
  }

  private async deployBot(def: BotDefinition): Promise<void> {
    // Implementation
  }
}
```

**Purpose:**
- Encapsulate command logic
- Access to services (API client, logger, file system)
- Reusable across similar commands

#### Layer 3: Command Tree (`command-tree.ts`)

Runtime type-safe merging of definitions and implementations.

```typescript
export const commandTree = {
  login: { def: definitions.login, impl: LoginCommand },
  bots: {
    def: definitions.bots,
    subcommands: {
      create: { def: definitions.bots.subcommands.create, impl: CreateBotCommand },
      // ...
    }
  }
}
```

**Purpose:**
- Type-safe command registration
- Runtime command resolution
- Used by `register-yargs.ts` to setup CLI

### 5.2 Command Categories

#### Authentication Commands

| Command | Purpose | Implementation |
|---------|---------|----------------|
| `bp login` | Authenticate with Botpress Cloud | Stores credentials in global cache or profile |
| `bp logout` | Clear credentials | Removes credentials from cache |

#### Project Management Commands

| Command | Purpose | Implementation |
|---------|---------|----------------|
| `bp init` | Create new project | Prompts for type, copies template, updates package.json |
| `bp read` | Read project definition | Displays JSON representation of project |
| `bp gen` | Generate type definitions | Creates `.botpress/implementation/` typings |
| `bp bundle` | Bundle project code | Compiles TS to JS, bundles with esbuild |
| `bp build` | Generate + bundle | Combined operation |
| `bp lint` | Validate project | Runs Spectral linting rules |

#### Deployment Commands

| Command | Purpose | Implementation |
|---------|---------|----------------|
| `bp deploy` | Deploy to Botpress Cloud | Builds and uploads project |
| `bp dev` | Local development mode | Runs locally with hot-reload and tunneling |
| `bp serve` | Run locally (no deploy) | Executes project without deployment |

#### Entity CRUD Commands

For **bots**, **integrations**, **interfaces**, and **plugins**:

| Command Pattern | Purpose | Implementation |
|----------------|---------|----------------|
| `bp <entity> get <id>` | Fetch by ID or name | API client call with error handling |
| `bp <entity> list` | List all in workspace | Paginated API call |
| `bp <entity> delete <id>` | Delete by ID or name | API client call with confirmation |

#### Package Management Commands

| Command | Purpose | Implementation |
|---------|---------|----------------|
| `bp add <package>` | Install integration/interface/plugin | Resolves, generates code, installs to `bp_modules/` |

#### Utility Commands

| Command | Purpose | Implementation |
|---------|---------|----------------|
| `bp chat <bot-id>` | Terminal chat interface | WebSocket connection to bot |
| `bp convert` | Convert old bot format | Migrates legacy bots to new format |

### 5.3 Command Registration

The `register-yargs.ts` module walks the command tree and registers each command with Yargs:

```typescript
function registerCommands(yargs, commandTree, path = []) {
  for (const [name, node] of Object.entries(commandTree)) {
    if (node.subcommands) {
      // Register as command group
      yargs.command(name, node.def.description, (subYargs) => {
        registerCommands(subYargs, node.subcommands, [...path, name])
      })
    } else {
      // Register as leaf command
      yargs.command(
        name,
        node.def.description,
        (builder) => applySchema(builder, node.def.schema),
        (argv) => node.impl.handler(argv)
      )
    }
  }
}
```

---

## 6. Service Layer

### 6.1 API Client (`src/api/client.ts`)

Wraps `@botpress/client` with CLI-specific functionality.

**Core Responsibilities:**

1. **Authentication**: Manages API tokens and workspace context
2. **Resource Management**: CRUD operations for bots, integrations, interfaces, plugins
3. **Retry Logic**: Exponential backoff for transient failures
4. **Pagination**: Helper methods for paginated responses
5. **Error Mapping**: Converts API errors to CLI-friendly messages

**Key Methods:**

```typescript
class APIClient {
  // Authentication
  async testConnection(): Promise<void>

  // Bot operations
  async listBots(): Promise<Bot[]>
  async getBot(id: string): Promise<Bot>
  async createBot(body: BotBody): Promise<Bot>
  async updateBot(id: string, body: BotBody): Promise<Bot>
  async deleteBot(id: string): Promise<void>

  // Integration operations
  async listIntegrations(): Promise<Integration[]>
  async getIntegration(id: string): Promise<Integration>
  async createIntegration(body: IntegrationBody): Promise<Integration>
  async updateIntegration(id: string, body: IntegrationBody): Promise<Integration>

  // Interface operations
  async listInterfaces(): Promise<Interface[]>
  async getInterface(id: string): Promise<Interface>
  async createInterface(body: InterfaceBody): Promise<Interface>

  // Plugin operations
  async listPlugins(): Promise<Plugin[]>
  async getPlugin(id: string): Promise<Plugin>
  async createPlugin(body: PluginBody): Promise<Plugin>

  // Table operations
  async listTables(botId: string): Promise<Table[]>
  async createTable(botId: string, schema: TableSchema): Promise<Table>
  async updateTable(tableId: string, schema: TableSchema): Promise<Table>
  async deleteTable(tableId: string): Promise<void>

  // Workspace operations
  async getWorkspace(): Promise<Workspace>
  async listWorkspaceMembers(): Promise<Member[]>
}
```

### 6.2 Request Body Builders (`src/api/*-body.ts`)

Transforms project definitions into API request bodies.

**`bot-body.ts`:**
```typescript
function createBotBody(definition: BotDefinition, code: string): BotCreateBody {
  return {
    name: definition.name,
    description: definition.description,
    version: definition.version,
    code: encodeCode(code),
    integrations: definition.integrations,
    plugins: definition.plugins,
    configuration: {
      schema: zodToJsonSchema(definition.configuration)
    },
    events: mapEvents(definition.events),
    states: mapStates(definition.states),
    recurringEvents: definition.recurringEvents,
    // ...
  }
}
```

**Purpose:**
- Encapsulate API contract knowledge
- Transform Zod schemas to JSON Schema
- Handle code encoding/compression
- Validate required fields

### 6.3 Logger System (`src/logger/`)

**Architecture:**

```
BaseLogger (abstract)
│
├── Stream management (stdout, stderr)
├── Cleanup hooks
├── TTY detection
│
└─► Logger (default export)
    │
    ├── debug(message)
    ├── log(message)
    ├── warn(message)
    ├── error(message)
    ├── success(message)
    ├── box(message, title?)
    └── singleLineUpdate(message)  // Progress indicators
```

**Key Features:**

1. **Single-Line Updates**: For progress indicators that don't clutter output
   ```typescript
   logger.singleLineUpdate('Building... 50%')
   logger.singleLineUpdate('Building... 100%')
   logger.log('Build complete!')  // Clears single-line update
   ```

2. **Box Formatting**: Highlights important messages
   ```typescript
   logger.box('Deployment successful!', 'Success')
   // ┌─────────────────────┐
   // │ Success             │
   // ├─────────────────────┤
   // │ Deployment success! │
   // └─────────────────────┘
   ```

3. **TTY Awareness**: Disables colors and formatting when piping output

4. **Cleanup Management**: Ensures proper cleanup of single-line updates on exit

5. **Debug Mode**: Verbose logging controlled by `-v` flag

---

## 7. Build and Deployment Pipeline

### 7.1 Build Pipeline Overview

```
┌──────────┐      ┌──────────┐      ┌──────────┐
│   Gen    │ ───► │  Bundle  │ ───► │  Deploy  │
│ Command  │      │ Command  │      │ Command  │
└──────────┘      └──────────┘      └──────────┘
     │                  │                  │
     ▼                  ▼                  ▼
Generate TS         Compile TS         Upload to
type defs          with esbuild       Botpress Cloud
```

### 7.2 Generation Phase (`gen-command.ts`)

**Purpose:** Generate TypeScript type definitions for type-safe development.

**Process:**

1. Read project definition file (`*.definition.ts`)
2. Determine project type (bot, integration, interface, plugin)
3. Generate implementation typings:
   - Actions (input/output types)
   - Events (payload types)
   - States (state structure types)
   - Tables (schema types)
   - Channels (for integrations)
   - Configuration (config types)
4. Generate package typings for dependencies
5. Write to `.botpress/implementation/`

**Output Structure:**

```
.botpress/implementation/
├── index.ts                    # Main exports
├── actions/
│   ├── index.ts
│   └── [action-name].ts        # Type-safe action definitions
├── events/
│   ├── index.ts
│   └── [event-name].ts         # Type-safe event definitions
├── states/
│   └── index.ts                # State type definitions
├── configuration.ts            # Configuration types
└── tables/                     # (bots only)
    ├── index.ts
    └── [table-name].ts
```

**Example Generated Code:**

```typescript
// .botpress/implementation/actions/sendMessage.ts
import { IntegrationActionDefinition } from '@botpress/sdk'

export const sendMessage: IntegrationActionDefinition<
  { text: string; userId: string },  // Input
  { messageId: string }               // Output
> = {
  input: {
    schema: z.object({
      text: z.string(),
      userId: z.string()
    })
  },
  output: {
    schema: z.object({
      messageId: z.string()
    })
  }
}
```

### 7.3 Bundle Phase (`bundle-command.ts`)

**Purpose:** Compile TypeScript and bundle into deployable artifact.

**Process:**

1. Resolve entry point (`src/index.ts`)
2. Configure esbuild:
   ```typescript
   {
     entryPoints: ['src/index.ts'],
     bundle: true,
     platform: 'node',
     target: 'node18',
     format: 'cjs',           // CJS for bots/integrations
     outfile: '.botpress/dist/index.js',
     sourcemap: true,
     minify: false,
     external: [...sdkPackages]  // Don't bundle SDK
   }
   ```
3. Run esbuild
4. Handle errors (TypeScript, resolution, etc.)
5. Write output to `.botpress/dist/`

**Special Cases:**

- **Plugins**: Bundle both CJS and ESM formats
  ```typescript
  // CJS build
  { format: 'cjs', outfile: '.botpress/dist/index.cjs' }
  // ESM build
  { format: 'esm', outfile: '.botpress/dist/index.mjs' }
  ```

- **Dependencies**: External packages are not bundled (installed separately)

### 7.4 Build Phase (`build-command.ts`)

**Purpose:** Combined generate + bundle operation.

**Process:**

```typescript
async run() {
  await this.generate()
  await this.bundle()
}
```

**Used by:**
- `DeployCommand` (before uploading)
- `DevCommand` (before starting dev server)

### 7.5 Deploy Phase (`deploy-command.ts`)

**Purpose:** Upload project to Botpress Cloud.

#### 7.5.1 Integration Deployment

```
┌─────────────────────────────────────────────────────────┐
│ 1. Validate Definition                                  │
│    - Check icon file exists                             │
│    - Check readme file exists                           │
│    - Validate secrets schema                            │
└────────────────┬────────────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────────────┐
│ 2. Resolve Integration                                  │
│    - Check if exists (by name)                          │
│    - Determine create vs update                         │
│    - Handle workspace handles                           │
└────────────────┬────────────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────────────┐
│ 3. Collect Secrets                                      │
│    - For new secrets: prompt for values                 │
│    - For existing secrets: prompt if changed            │
│    - Store in project cache                             │
└────────────────┬────────────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────────────┐
│ 4. Create/Update Integration                            │
│    - Upload definition and code                         │
│    - Set visibility (public/private/unlisted)           │
│    - Update version                                     │
└────────────────┬────────────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────────────┐
│ 5. Display Results                                      │
│    - Integration ID                                     │
│    - Webhook URL                                        │
│    - Success message                                    │
└─────────────────────────────────────────────────────────┘
```

**Key Features:**

- **Incremental Deployment**: Only updates if definition changed
- **Secret Management**: Interactive prompts for secrets
- **Version Management**: Semantic versioning support
- **Visibility Control**: Public, private, or unlisted

#### 7.5.2 Bot Deployment

```
┌─────────────────────────────────────────────────────────┐
│ 1. Build Bot                                            │
│    - Generate types                                     │
│    - Bundle code                                        │
└────────────────┬────────────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────────────┐
│ 2. Resolve Bot                                          │
│    - By ID (if --botId provided)                        │
│    - By name (prompt to select)                         │
│    - Create new (if doesn't exist)                      │
└────────────────┬────────────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────────────┐
│ 3. Resolve Dependencies                                 │
│    - Fetch referenced integrations                      │
│    - Fetch referenced plugins                           │
│    - Validate versions                                  │
│    - Check registration status                          │
└────────────────┬────────────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────────────┐
│ 4. Update Bot                                           │
│    - Upload definition and code                         │
│    - Update configuration                               │
│    - Update integrations/plugins list                   │
└────────────────┬────────────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────────────┐
│ 5. Publish Tables                                       │
│    - Create new tables                                  │
│    - Update changed tables                              │
│    - Delete removed tables (with confirmation)          │
└────────────────┬────────────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────────────┐
│ 6. Display Results                                      │
│    - Bot ID                                             │
│    - Bot URL                                            │
│    - Integration webhook URLs                           │
│    - Success message                                    │
└─────────────────────────────────────────────────────────┘
```

**Key Features:**

- **Dependency Resolution**: Validates all integration/plugin dependencies exist
- **Table Management**: Automatically synchronizes table schemas
- **Integration Status**: Warns about unregistered integrations
- **Incremental Updates**: Only uploads if definition or code changed

#### 7.5.3 Interface Deployment

```
┌─────────────────────────────────────────────────────────┐
│ 1. Validate Definition                                  │
│    - Check required fields                              │
└────────────────┬────────────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────────────┐
│ 2. Resolve Interface                                    │
│    - Check if exists (by name)                          │
│    - Handle workspace handles                           │
└────────────────┬────────────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────────────┐
│ 3. Create/Update Interface                              │
│    - Upload definition                                  │
│    - Set visibility (public/private)                    │
└────────────────┬────────────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────────────┐
│ 4. Display Results                                      │
│    - Interface ID                                       │
│    - Success message                                    │
└─────────────────────────────────────────────────────────┘
```

#### 7.5.4 Plugin Deployment

```
┌─────────────────────────────────────────────────────────┐
│ 1. Bundle Plugin                                        │
│    - Generate CJS bundle                                │
│    - Generate ESM bundle                                │
└────────────────┬────────────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────────────┐
│ 2. Resolve Dependencies                                 │
│    - Fetch referenced integrations                      │
│    - Fetch referenced interfaces                        │
│    - Validate versions                                  │
└────────────────┬────────────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────────────┐
│ 3. Create/Update Plugin                                 │
│    - Upload definition and code (both formats)          │
│    - Set visibility (public/private/unlisted)           │
└────────────────┬────────────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────────────┐
│ 4. Display Results                                      │
│    - Plugin ID                                          │
│    - Success message                                    │
└─────────────────────────────────────────────────────────┘
```

---

## 8. Development Mode

### 8.1 Dev Mode Architecture

Development mode (`bp dev`) enables local development with hot-reload and tunneling.

**Components:**

```
┌─────────────────────────────────────────────────────────┐
│                    Dev Command                          │
│                                                         │
│  ┌───────────┐    ┌──────────┐    ┌────────────────┐  │
│  │  Tunnel   │◄───┤  Worker  │───►│ File Watcher   │  │
│  │  Manager  │    │  Manager │    │                │  │
│  └─────┬─────┘    └────┬─────┘    └────────┬───────┘  │
│        │               │                    │           │
└────────┼───────────────┼────────────────────┼───────────┘
         │               │                    │
         │               │                    │
    ┌────▼────┐    ┌─────▼──────┐    ┌───────▼────────┐
    │ Tunnel  │    │   Child    │    │   File System  │
    │ Service │    │  Process   │    │                │
    └─────────┘    └────────────┘    └────────────────┘
         │               │
         │               │
    ┌────▼───────────────▼────┐
    │   Botpress Cloud API    │
    └─────────────────────────┘
```

### 8.2 Tunnel System

**Purpose:** Expose local server to Botpress Cloud for webhook delivery.

**Architecture:**

```typescript
// Tunnel lifecycle
1. Generate/retrieve tunnel ID (cached)
2. Connect WebSocket to tunnel service
3. Receive HTTP requests over WebSocket
4. Forward to local server (default port 3000)
5. Return response over WebSocket
```

**Implementation:**

```typescript
// src/utils/tunnel-utils.ts
class TunnelManager {
  async connect(tunnelId: string): Promise<Tunnel> {
    const ws = new WebSocket(`${TUNNEL_URL}/${tunnelId}`)

    ws.on('message', async (request) => {
      const response = await this.forwardToLocal(request)
      ws.send(response)
    })

    return new Tunnel(tunnelId, ws)
  }

  private async forwardToLocal(request: HTTPRequest): Promise<HTTPResponse> {
    return axios.request({
      method: request.method,
      url: `http://localhost:${this.port}${request.path}`,
      headers: request.headers,
      data: request.body
    })
  }
}
```

**Key Features:**

- **Persistent Tunnel ID**: Cached to maintain stable webhook URL
- **Automatic Reconnection**: Handles WebSocket disconnections
- **Request Forwarding**: Transparent HTTP request/response proxying

### 8.3 Worker System

**Purpose:** Run bot/integration code in a child process with hot-reload.

**Worker State Machine:**

```
┌──────┐
│ DEAD │
└───┬──┘
    │ spawn()
    ▼
┌──────────┐
│ RELOADING│
└────┬─────┘
     │ ready
     ▼
┌──────┐  ──file change──►  ┌──────────┐
│ LIVE │                     │ RELOADING│
└───┬──┘  ◄────reloaded────  └──────────┘
    │
    │ kill()
    ▼
┌─────────┐
│ KILLING │
└────┬────┘
     │ exited
     ▼
┌────────┐
│ ERRORED│
└────────┘
```

**Implementation:**

```typescript
// src/worker/worker.ts
class Worker {
  private child: ChildProcess | null = null
  private state: WorkerState = 'dead'

  async spawn() {
    this.state = 'reloading'

    this.child = fork('./dist/index.js', [], {
      stdio: ['inherit', 'pipe', 'pipe', 'ipc'],
      env: {
        ...process.env,
        BP_TUNNEL_URL: this.tunnelUrl,
        BP_WORKSPACE_ID: this.workspaceId,
        ...this.secrets
      }
    })

    this.child.on('message', (msg) => {
      if (msg.type === 'ready') {
        this.state = 'live'
      }
    })

    this.child.on('exit', (code) => {
      if (code !== 0) {
        this.state = 'errored'
      }
    })
  }

  async reload() {
    await this.kill()
    await this.spawn()
  }

  async kill() {
    if (!this.child) return

    this.state = 'killing'
    this.child.kill('SIGTERM')

    await new Promise(resolve => {
      this.child!.on('exit', resolve)
    })

    this.state = 'dead'
  }
}
```

**Child Process Entrypoint:**

```typescript
// src/worker/child-entrypoint.ts
async function main() {
  // Load bot/integration code
  const implementation = require(process.env.BP_ENTRY_POINT!)

  // Start server
  const server = http.createServer(implementation.handler)
  await server.listen(3000)

  // Signal ready
  process.send!({ type: 'ready' })
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
```

### 8.4 File Watching

**Purpose:** Detect file changes and trigger rebuilds.

**Implementation:**

```typescript
// src/utils/file-watcher.ts
class FileWatcher {
  private watcher: Watcher
  private debounceTimer: NodeJS.Timeout | null = null

  async watch(dir: string, callback: (files: string[]) => void) {
    this.watcher = await watch(dir, {
      ignore: ['.botpress/dist', 'node_modules']
    })

    this.watcher.on('change', (events) => {
      const files = events.map(e => e.path)
      this.debounce(() => callback(files))
    })
  }

  private debounce(fn: () => void) {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer)
    }

    this.debounceTimer = setTimeout(fn, 500)  // 500ms debounce
  }
}
```

**File Change Flow:**

```
File Changed
    │
    ▼
Debounce (500ms)
    │
    ▼
Build Project
    │
    ▼
Reload Worker
```

### 8.5 Dev Mode Flow

```
┌─────────────────────────────────────────────────────────┐
│ 1. Initial Setup                                        │
│    - Create/fetch tunnel ID                             │
│    - Connect tunnel                                     │
│    - Build project                                      │
└────────────────┬────────────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────────────┐
│ 2. Dev Deployment                                       │
│    - Create dev bot/integration (flagged as dev)        │
│    - Or reuse existing (cached dev ID)                  │
└────────────────┬────────────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────────────┐
│ 3. Start Worker                                         │
│    - Spawn child process                                │
│    - Pass tunnel URL and secrets                        │
│    - Wait for ready signal                              │
└────────────────┬────────────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────────────┐
│ 4. Watch Files                                          │
│    - Start file watcher                                 │
│    - On change:                                         │
│      1. Rebuild                                         │
│      2. Reload worker                                   │
└────────────────┬────────────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────────────┐
│ 5. Display Info                                         │
│    - Tunnel URL                                         │
│    - Webhook URL                                        │
│    - "Watching for changes..."                          │
└─────────────────────────────────────────────────────────┘
```

---

## 9. Code Generation System

### 9.1 Code Generation Architecture

**Purpose:** Generate TypeScript type definitions from project definitions.

**Generator Types:**

1. **Implementation Generators**: For local development
   - `generateBotImplementation()`
   - `generateIntegrationImplementation()`
   - `generatePluginImplementation()`

2. **Package Generators**: For installed dependencies
   - `generateIntegrationPackage()`
   - `generateInterfacePackage()`
   - `generatePluginPackage()`

### 9.2 Bot Implementation Generation

**Generated Files:**

```
.botpress/implementation/
├── index.ts                    # Main exports
├── actions/
│   ├── index.ts                # Action exports
│   └── [action-name].ts        # Type-safe action handlers
├── events/
│   ├── index.ts                # Event exports
│   └── [event-name].ts         # Type-safe event emitters
├── states/
│   └── index.ts                # State types
├── configuration.ts            # Configuration schema
├── workflows/
│   └── index.ts                # Workflow types (if any)
└── tables/
    ├── index.ts                # Table exports
    └── [table-name].ts         # Table schema and operations
```

**Example Generated Action:**

```typescript
// .botpress/implementation/actions/sendEmail.ts
import * as sdk from '@botpress/sdk'
import { z } from 'zod'

export type SendEmailInput = {
  to: string
  subject: string
  body: string
}

export type SendEmailOutput = {
  messageId: string
  status: 'sent' | 'failed'
}

export const sendEmail = {
  input: {
    schema: z.object({
      to: z.string().email(),
      subject: z.string(),
      body: z.string()
    })
  },
  output: {
    schema: z.object({
      messageId: z.string(),
      status: z.enum(['sent', 'failed'])
    })
  }
} satisfies sdk.ActionDefinition<SendEmailInput, SendEmailOutput>
```

### 9.3 Integration Implementation Generation

**Generated Files:**

```
.botpress/implementation/
├── index.ts                    # Main exports
├── actions/
│   ├── index.ts
│   └── [action-name].ts
├── channels/
│   ├── index.ts
│   └── [channel-name].ts       # Channel types
├── events/
│   ├── index.ts
│   └── [event-name].ts
├── states/
│   └── index.ts
├── configuration.ts            # Configuration + secrets
├── entities/
│   ├── index.ts
│   └── [entity-name].ts        # Entity extractors
└── user.ts                     # User tags
```

**Example Generated Channel:**

```typescript
// .botpress/implementation/channels/telegram.ts
import * as sdk from '@botpress/sdk'
import { z } from 'zod'

export type TelegramMessage = {
  type: 'text' | 'image' | 'file'
  content: string
  chatId: string
}

export const telegram = {
  messages: {
    text: z.object({
      type: z.literal('text'),
      content: z.string(),
      chatId: z.string()
    }),
    image: z.object({
      type: z.literal('image'),
      content: z.string().url(),
      chatId: z.string()
    })
  }
} satisfies sdk.ChannelDefinition<TelegramMessage>
```

### 9.4 Package Generation

**Purpose:** Generate type definitions for installed packages in `bp_modules/`.

**Installation Flow:**

```
bp add telegram
    │
    ▼
Fetch Integration from API
    │
    ▼
Generate Package Code
    │
    ├─► .botpress/implementation/telegram/
    │   ├── index.ts
    │   ├── actions/
    │   ├── channels/
    │   ├── events/
    │   └── configuration.ts
    │
    └─► package.json (update bpDependencies)
```

**Generated Package Structure:**

```typescript
// bp_modules/telegram/index.ts
import * as sdk from '@botpress/sdk'

export const telegram = {
  name: 'telegram',
  version: '1.0.0',
  actions: {
    sendMessage: { ... },
    sendImage: { ... }
  },
  channels: {
    telegram: { ... }
  },
  events: {
    messageReceived: { ... }
  },
  configuration: {
    schema: z.object({
      botToken: z.string()
    })
  }
} satisfies sdk.IntegrationDefinition
```

### 9.5 Code Generation Utilities

**Zod to JSON Schema:**

```typescript
// src/utils/schema-utils.ts
function zodToJsonSchema(schema: z.ZodType): JSONSchema {
  // Convert Zod schema to JSON Schema format
  // Used for API payloads
}
```

**Type Name Generation:**

```typescript
// src/code-generation/utils.ts
function toTypeName(name: string): string {
  return toPascalCase(name) + 'Input'
}

function toConstName(name: string): string {
  return toCamelCase(name)
}
```

---

## 10. Package Management

### 10.1 Package Reference Parsing

**Supported Formats:**

```typescript
// 1. UUID (ID)
'01234567-89ab-cdef-0123-456789abcdef'

// 2. Name@version
'telegram@1.0.0'
'teams'  // latest version

// 3. Typed reference
'integration:telegram@1.0.0'
'interface:webchat'
'plugin:analytics@2.1.0'

// 4. Path reference
'./path/to/integration'
'../shared/plugins/analytics'
```

**Parser Implementation:**

```typescript
// src/package-ref.ts
type PackageRef = {
  type: 'integration' | 'interface' | 'plugin'
  name?: string
  version?: string
  id?: string
  path?: string
}

function parsePackageRef(ref: string): PackageRef {
  // UUID format
  if (UUID_REGEX.test(ref)) {
    return { type: 'integration', id: ref }
  }

  // Path format
  if (ref.startsWith('./') || ref.startsWith('../')) {
    return { type: 'integration', path: resolve(ref) }
  }

  // Typed format: integration:name@version
  if (ref.includes(':')) {
    const [type, rest] = ref.split(':')
    const [name, version] = rest.split('@')
    return { type, name, version }
  }

  // Name format: name@version
  const [name, version] = ref.split('@')
  return { type: 'integration', name, version }
}
```

### 10.2 Package Resolution

**Remote Package Resolution:**

```typescript
// src/command-implementations/add-command.ts
async resolveRemotePackage(ref: PackageRef): Promise<PackageInfo> {
  const client = this.getClient()

  if (ref.id) {
    // Resolve by ID
    return await client.getIntegration(ref.id)
  }

  if (ref.name) {
    // Resolve by name
    const integrations = await client.listIntegrations()
    const match = integrations.find(i =>
      i.name === ref.name &&
      (!ref.version || semver.satisfies(i.version, ref.version))
    )

    if (!match) {
      throw new Error(`Integration ${ref.name}@${ref.version} not found`)
    }

    return match
  }

  throw new Error('Invalid package reference')
}
```

**Local Package Resolution:**

```typescript
async resolveLocalPackage(ref: PackageRef): Promise<PackageInfo> {
  const defPath = join(ref.path, '*.definition.ts')
  const definition = await this.readDefinition(defPath)

  // Check if deployed (has cached ID)
  const cache = new ProjectCache(ref.path)
  const devId = cache.get('devId')

  if (devId) {
    // Use dev integration
    return { ...definition, id: devId, isDev: true }
  }

  // Not deployed - generate package from definition
  return { ...definition, isLocal: true }
}
```

### 10.3 Package Installation

**Installation Process:**

```
┌─────────────────────────────────────────────────────────┐
│ 1. Parse Package Reference                              │
│    - Determine type (integration/interface/plugin)      │
│    - Extract name, version, or path                     │
└────────────────┬────────────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────────────┐
│ 2. Resolve Package                                      │
│    - Remote: Fetch from API                             │
│    - Local: Read definition file                        │
└────────────────┬────────────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────────────┐
│ 3. Generate Package Code                                │
│    - Create bp_modules/[name]/                          │
│    - Generate TypeScript definitions                    │
│    - Write index.ts, actions/, events/, etc.            │
└────────────────┬────────────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────────────┐
│ 4. Update package.json                                  │
│    - Add to bpDependencies                              │
│    - Store package info (id, version, path)             │
└─────────────────────────────────────────────────────────┘
```

**Implementation:**

```typescript
// src/command-implementations/add-command.ts
async run() {
  const ref = parsePackageRef(this.argv.package)

  // Resolve package
  const pkg = ref.path
    ? await this.resolveLocalPackage(ref)
    : await this.resolveRemotePackage(ref)

  // Generate code
  const outputDir = join(this.workDir, 'bp_modules', pkg.name)
  await generatePackageCode(pkg, outputDir)

  // Update package.json
  await this.updatePackageJson(pkg)

  this.logger.success(`Installed ${pkg.name}@${pkg.version}`)
}
```

### 10.4 Package.json Structure

**bpDependencies Format:**

```json
{
  "name": "my-bot",
  "version": "1.0.0",
  "dependencies": {
    "@botpress/sdk": "^4.18.1"
  },
  "bpDependencies": {
    "telegram": {
      "type": "integration",
      "id": "01234567-89ab-cdef-0123-456789abcdef",
      "version": "1.0.0"
    },
    "webchat": {
      "type": "interface",
      "id": "abcdef01-2345-6789-abcd-ef0123456789",
      "version": "2.3.0"
    },
    "analytics": {
      "type": "plugin",
      "path": "../shared/plugins/analytics"
    }
  }
}
```

---

## 11. Configuration System

### 11.1 Configuration Schema Hierarchy

**Base Schemas:**

```typescript
// src/config.ts

// 1. Global options (available on all commands)
const globalSchema = {
  verbose: { type: 'boolean', alias: 'v', description: 'Enable verbose logging' },
  confirm: { type: 'boolean', alias: 'y', description: 'Skip confirmation prompts' },
  json: { type: 'boolean', description: 'Output in JSON format' },
  botpressHome: { type: 'string', description: 'Botpress home directory' },
  profile: { type: 'string', description: 'CLI profile to use' }
}

// 2. Project options (commands that operate on a project)
const projectSchema = {
  ...globalSchema,
  workDir: { type: 'string', description: 'Project directory' }
}

// 3. Credentials options (commands that call API)
const credentialsSchema = {
  apiUrl: { type: 'string', description: 'Botpress API URL' },
  token: { type: 'string', description: 'API token' },
  workspaceId: { type: 'string', description: 'Workspace ID' }
}

// 4. Secrets options (integration/bot deployment)
const secretsSchema = {
  secrets: { type: 'object', description: 'Integration secrets' }
}
```

**Composed Schemas:**

```typescript
// Login command
const loginSchema = {
  ...globalSchema,
  ...credentialsSchema
}

// Deploy command
const deploySchema = {
  ...projectSchema,
  ...credentialsSchema,
  ...secretsSchema,
  createNewBot: { type: 'boolean', description: 'Create new bot' },
  botId: { type: 'string', description: 'Bot ID to update' },
  noBuild: { type: 'boolean', description: 'Skip build step' },
  sourceMap: { type: 'boolean', description: 'Generate source maps' }
}

// Dev command
const devSchema = {
  ...deploySchema,
  port: { type: 'number', default: 3000, description: 'Local server port' },
  tunnelUrl: { type: 'string', description: 'Custom tunnel URL' }
}
```

### 11.2 Profile Management

**Profile Storage:**

```json
// ~/.botpress/profiles.json
{
  "default": "production",
  "profiles": {
    "production": {
      "apiUrl": "https://api.botpress.cloud",
      "workspaceId": "01234567-89ab-cdef-0123-456789abcdef",
      "token": "bp_..."
    },
    "staging": {
      "apiUrl": "https://staging-api.botpress.cloud",
      "workspaceId": "abcdef01-2345-6789-abcd-ef0123456789",
      "token": "bp_..."
    },
    "local": {
      "apiUrl": "http://localhost:8080",
      "workspaceId": "local",
      "token": "dev_token"
    }
  }
}
```

**Profile Resolution:**

```typescript
// src/command-implementations/base-command.ts
function resolveProfile(argv: GlobalArgs): CredentialsConfig {
  // 1. Command-line flags take precedence
  if (argv.token && argv.workspaceId) {
    return {
      apiUrl: argv.apiUrl || DEFAULT_API_URL,
      token: argv.token,
      workspaceId: argv.workspaceId
    }
  }

  // 2. Check specified profile
  const profileName = argv.profile || getDefaultProfile()
  const profile = loadProfile(profileName)

  if (profile) {
    return profile
  }

  // 3. Check global cache (from last login)
  const cache = new GlobalCache()
  const cached = cache.get('credentials')

  if (cached) {
    return cached
  }

  throw new NotLoggedInError()
}
```

### 11.3 Constants

**Path Constants:**

```typescript
// src/consts.ts

// Home directory
export const DEFAULT_BOTPRESS_HOME = join(homedir(), '.botpress')

// API URLs
export const DEFAULT_API_URL = 'https://api.botpress.cloud'
export const DEFAULT_TUNNEL_URL = 'wss://tunnel.botpress.cloud'
export const DEFAULT_CHAT_URL = 'https://chat.botpress.cloud'

// Directory names
export const BP_MODULES_DIR = 'bp_modules'
export const BOTPRESS_DIR = '.botpress'
export const DIST_DIR = join(BOTPRESS_DIR, 'dist')
export const IMPLEMENTATION_DIR = join(BOTPRESS_DIR, 'implementation')

// File names
export const PROFILES_FILE = 'profiles.json'
export const GLOBAL_CACHE_FILE = 'cache.json'
export const PROJECT_CACHE_FILE = join(BOTPRESS_DIR, 'cache.json')
export const DEFINITION_GLOB = '*.definition.ts'
```

### 11.4 Environment Variables

**Supported Variables:**

```bash
# API Configuration
BOTPRESS_API_URL=https://api.botpress.cloud
BOTPRESS_TOKEN=bp_...
BOTPRESS_WORKSPACE_ID=01234567-89ab-cdef-0123-456789abcdef

# Development
BOTPRESS_DEV_PORT=3000
BOTPRESS_TUNNEL_URL=wss://tunnel.botpress.cloud

# Build Configuration
BOTPRESS_SOURCEMAP=true
BOTPRESS_MINIFY=false

# CLI Behavior
BOTPRESS_HOME=/path/to/.botpress
BOTPRESS_PROFILE=staging
```

**Loading Order:**

1. Command-line flags (highest priority)
2. Environment variables
3. Profile configuration
4. Global cache
5. Default values (lowest priority)

---

## 12. Utilities Layer

The CLI includes 35+ utility modules providing reusable functionality.

### 12.1 Core Utilities

#### Cache Utilities (`cache-utils.ts`)

**Purpose:** File-system based key-value cache.

```typescript
// Global cache (~/.botpress/cache.json)
const cache = new GlobalCache()
cache.set('credentials', { apiUrl, token, workspaceId })
const creds = cache.get('credentials')

// Project cache (.botpress/cache.json)
const cache = new ProjectCache('/path/to/project')
cache.set('botId', '01234567-89ab-cdef-0123-456789abcdef')
const botId = cache.get('botId')
```

**Features:**

- Atomic read-write operations
- Retry logic with file locking
- Type-safe get/set with generics
- Automatic JSON serialization

#### Path Utilities (`path-utils.ts`)

**Purpose:** Path manipulation and validation.

```typescript
// Resolve paths relative to work directory
const absolute = resolvePath('./src/index.ts', workDir)

// Find project root (contains package.json)
const root = findProjectRoot('/path/to/nested/dir')

// Validate file exists
await ensureFileExists('/path/to/file.ts')

// Find files matching glob
const files = await findFiles('**/*.ts', { ignore: ['node_modules'] })
```

#### esbuild Utilities (`esbuild-utils.ts`)

**Purpose:** TypeScript compilation and bundling.

```typescript
// Bundle project
await bundle({
  entryPoint: 'src/index.ts',
  outfile: '.botpress/dist/index.js',
  format: 'cjs',
  sourcemap: true,
  minify: false,
  external: ['@botpress/sdk']
})

// Compile single file
const { code, map } = await compile('src/utils.ts')
```

#### Schema Utilities (`schema-utils.ts`)

**Purpose:** Zod schema to JSON Schema conversion.

```typescript
import { z } from 'zod'

const zodSchema = z.object({
  name: z.string(),
  age: z.number().optional()
})

const jsonSchema = zodToJsonSchema(zodSchema)
// {
//   type: 'object',
//   properties: {
//     name: { type: 'string' },
//     age: { type: 'number' }
//   },
//   required: ['name']
// }
```

### 12.2 Prompt Utilities

#### Interactive Prompts (`prompt-utils.ts`)

**Purpose:** User interaction for CLI commands.

```typescript
// Confirmation
const confirmed = await confirm('Are you sure?', { default: false })

// Text input
const name = await text('Enter bot name:', { initial: 'my-bot' })

// Select from list
const type = await select('Project type:', [
  { title: 'Bot', value: 'bot' },
  { title: 'Integration', value: 'integration' },
  { title: 'Plugin', value: 'plugin' }
])

// Multi-select
const integrations = await multiselect('Select integrations:', [
  { title: 'Telegram', value: 'telegram' },
  { title: 'Slack', value: 'slack' },
  { title: 'Teams', value: 'teams' }
])

// Password input (hidden)
const token = await password('API token:')
```

### 12.3 String Manipulation

#### Case Utilities (`case-utils.ts`)

**Purpose:** String case conversion.

```typescript
// toPascalCase
toPascalCase('send-message')  // 'SendMessage'
toPascalCase('send_message')  // 'SendMessage'

// toCamelCase
toCamelCase('SendMessage')    // 'sendMessage'
toCamelCase('send-message')   // 'sendMessage'

// toKebabCase
toKebabCase('SendMessage')    // 'send-message'
toKebabCase('sendMessage')    // 'send-message'

// toSnakeCase
toSnakeCase('SendMessage')    // 'send_message'
toSnakeCase('sendMessage')    // 'send_message'
```

### 12.4 File System Utilities

#### File Watcher (`file-watcher.ts`)

**Purpose:** Efficient file system monitoring with debouncing.

```typescript
const watcher = new FileWatcher()

await watcher.watch('/path/to/dir', (changes) => {
  console.log('Files changed:', changes.map(c => c.path))
}, {
  ignore: ['node_modules', '.botpress/dist'],
  debounce: 500  // 500ms
})

// Stop watching
await watcher.close()
```

#### Require Utilities (`require-utils.ts`)

**Purpose:** Dynamic code execution.

```typescript
// Load module with error handling
const module = await requireModule('./path/to/module.ts')

// Execute code in isolated context
const result = await executeCode('return 1 + 1')  // 2

// Load definition file
const definition = await loadDefinition('./bot.definition.ts')
```

### 12.5 Network Utilities

#### Tunnel Utilities (`tunnel-utils.ts`)

**Purpose:** Tunnel management for dev mode.

```typescript
// Create tunnel
const tunnel = await createTunnel({
  tunnelId: 'abc123',
  port: 3000,
  apiUrl: 'wss://tunnel.botpress.cloud'
})

// Get tunnel URL
console.log(tunnel.url)  // 'https://abc123.tunnel.botpress.cloud'

// Close tunnel
await tunnel.close()
```

### 12.6 Validation Utilities

#### Semver Utilities (`semver-utils.ts`)

**Purpose:** Semantic versioning helpers.

```typescript
// Compare versions
isGreater('2.0.0', '1.5.0')  // true

// Check if version satisfies range
satisfies('1.5.3', '^1.0.0')  // true
satisfies('2.0.0', '^1.0.0')  // false

// Get latest version from list
const latest = getLatest(['1.0.0', '1.5.0', '2.0.0'])  // '2.0.0'
```

### 12.7 Concurrency Utilities

#### Parallel Execution (`concurrency-utils.ts`)

**Purpose:** Parallel and concurrent operations.

```typescript
// Run in parallel (all at once)
const results = await parallel([
  () => fetchBot('bot1'),
  () => fetchBot('bot2'),
  () => fetchBot('bot3')
])

// Run with concurrency limit
const results = await parallelLimit([
  () => fetchBot('bot1'),
  () => fetchBot('bot2'),
  () => fetchBot('bot3')
], 2)  // Max 2 concurrent

// Map with concurrency
const bots = await mapConcurrent(
  ['bot1', 'bot2', 'bot3'],
  (id) => fetchBot(id),
  { concurrency: 2 }
)
```

### 12.8 Package.json Utilities

#### Package.json Management (`pkgjson-utils.ts`)

**Purpose:** Read and write package.json files.

```typescript
// Read package.json
const pkg = await readPackageJson('/path/to/dir')

// Update package.json
await updatePackageJson('/path/to/dir', {
  bpDependencies: {
    telegram: {
      type: 'integration',
      id: '01234567-89ab-cdef-0123-456789abcdef',
      version: '1.0.0'
    }
  }
})

// Get dependency version
const sdkVersion = await getDependencyVersion('@botpress/sdk')
```

### 12.9 VRL Utilities

#### VRL Execution (`vrl-utils.ts`)

**Purpose:** Execute VRL (Vector Runtime Language) scripts.

```typescript
// Execute VRL script
const result = await executeVRL(`
  .message = "Hello, world!"
  .timestamp = now()
`, { input: {} })

// Validate VRL syntax
const isValid = await validateVRL('.message = "test"')
```

---

## 13. Error Handling Strategy

### 13.1 Error Hierarchy

```
VError (from verror package)
    │
    └─► BotpressCLIError (base error)
        │
        ├─► NotLoggedInError
        ├─► NoBotsFoundError
        ├─► ProjectDefinitionNotFoundError
        ├─► UnsupportedProjectType
        ├─► HTTPError
        │   ├─► status: number
        │   └─► body: any
        ├─► InvalidPackageReferenceError
        ├─► ParamRequiredError
        └─► [Custom errors]
```

### 13.2 Error Construction

```typescript
// src/errors.ts

export class BotpressCLIError extends VError {
  constructor(
    message: string,
    cause?: Error,
    info?: Record<string, any>
  ) {
    super({ cause, info }, message)
  }

  // Chain errors
  static wrap(error: Error, message: string): BotpressCLIError {
    return new BotpressCLIError(message, error)
  }

  // Map known errors
  static map(error: unknown): BotpressCLIError {
    if (error instanceof BotpressCLIError) {
      return error
    }

    if (error instanceof Error) {
      // Map specific error types
      if (error.message.includes('ENOENT')) {
        return new ProjectDefinitionNotFoundError(error)
      }

      if (error.message.includes('401')) {
        return new NotLoggedInError(error)
      }

      return BotpressCLIError.wrap(error, 'An error occurred')
    }

    return new BotpressCLIError(String(error))
  }
}
```

### 13.3 Error Handling Flow

```
┌─────────────────────────────────────────────────────────┐
│ 1. Error occurs in command handler                      │
└────────────────┬────────────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────────────┐
│ 2. Caught by BaseCommand.handler()                      │
│    try {                                                │
│      await command.run()                                │
│    } catch (error) {                                    │
│      ...                                                │
│    }                                                    │
└────────────────┬────────────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────────────┐
│ 3. Mapped to BotpressCLIError                           │
│    const cliError = BotpressCLIError.map(error)         │
└────────────────┬────────────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────────────┐
│ 4. Logged with appropriate level                        │
│    - NotLoggedInError → logger.warn()                   │
│    - HTTPError → logger.error()                         │
│    - Other → logger.error()                             │
└────────────────┬────────────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────────────┐
│ 5. Debug info (if --verbose)                            │
│    logger.debug(error.stack)                            │
└────────────────┬────────────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────────────┐
│ 6. Set exit code                                        │
│    process.exitCode = 1                                 │
└─────────────────────────────────────────────────────────┘
```

### 13.4 User-Friendly Error Messages

**NotLoggedInError:**
```
You are not logged in. Please run:
  bp login
```

**ProjectDefinitionNotFoundError:**
```
Could not find project definition file.
Expected: *.definition.ts in /path/to/project

To create a new project, run:
  bp init
```

**InvalidPackageReferenceError:**
```
Invalid package reference: "telegram@invalid"

Supported formats:
  - ID:      01234567-89ab-cdef-0123-456789abcdef
  - Name:    telegram@1.0.0
  - Typed:   integration:telegram@1.0.0
  - Path:    ./path/to/integration
```

**HTTPError (API errors):**
```
Failed to deploy bot (HTTP 403)
You do not have permission to perform this action.

If you believe this is an error, please check your workspace permissions.
```

---

## 14. Testing Strategy

### 14.1 Test Types

#### Unit Tests

**Location:** Co-located with source files (`*.test.ts`)

**Coverage:**
- Utility functions (cache, path, case conversion, etc.)
- Schema transformations (Zod to JSON Schema)
- Error mapping
- Package reference parsing

**Example:**

```typescript
// src/utils/case-utils.test.ts
describe('toPascalCase', () => {
  it('converts kebab-case to PascalCase', () => {
    expect(toPascalCase('send-message')).toBe('SendMessage')
  })

  it('converts snake_case to PascalCase', () => {
    expect(toPascalCase('send_message')).toBe('SendMessage')
  })

  it('handles already PascalCase', () => {
    expect(toPascalCase('SendMessage')).toBe('SendMessage')
  })
})
```

#### Integration Tests

**Location:** `e2e/` directory

**Coverage:**
- Command execution end-to-end
- API interactions (with mocking)
- File system operations
- Build and deployment flows

**Example:**

```typescript
// e2e/deploy-bot.test.ts
describe('Deploy Bot', () => {
  let testDir: string

  beforeEach(async () => {
    testDir = await createTestProject('bot')
  })

  it('deploys bot successfully', async () => {
    const result = await execCLI(['deploy', '--botId', 'test-bot'], {
      cwd: testDir,
      env: {
        BOTPRESS_TOKEN: 'test-token',
        BOTPRESS_WORKSPACE_ID: 'test-workspace'
      }
    })

    expect(result.exitCode).toBe(0)
    expect(result.stdout).toContain('Bot deployed successfully')
  })
})
```

#### E2E Tests with Fixtures

**Fixtures:**
- `bot-with-plugin-dependency`: Tests plugin installation in bots
- `plugin-with-interface-dependency`: Tests interface dependencies
- `integration-with-entity-dependency`: Tests entity extraction

**Test Flow:**

```typescript
// e2e/add-package.test.ts
describe('Add Package', () => {
  it('installs integration from remote', async () => {
    const testDir = await copyFixture('bot-with-plugin-dependency')

    // Mock API response
    mockAPI.get('/integrations').reply(200, {
      integrations: [
        { id: '123', name: 'telegram', version: '1.0.0' }
      ]
    })

    // Run command
    await execCLI(['add', 'telegram'], { cwd: testDir })

    // Verify installation
    expect(await pathExists(join(testDir, 'bp_modules/telegram'))).toBe(true)

    const pkg = await readPackageJson(testDir)
    expect(pkg.bpDependencies.telegram).toEqual({
      type: 'integration',
      id: '123',
      version: '1.0.0'
    })
  })
})
```

### 14.2 Test Utilities

```typescript
// e2e/utils/test-helpers.ts

// Execute CLI command
async function execCLI(
  args: string[],
  options?: { cwd?: string; env?: Record<string, string> }
): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  const result = await execa('bp', args, {
    cwd: options?.cwd,
    env: { ...process.env, ...options?.env }
  })

  return {
    exitCode: result.exitCode,
    stdout: result.stdout,
    stderr: result.stderr
  }
}

// Create test project
async function createTestProject(type: 'bot' | 'integration' | 'plugin'): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'bp-test-'))
  await copyTemplate(type, dir)
  return dir
}

// Mock API responses
function mockAPI(): MockAdapter {
  return new MockAdapter(axios)
}
```

### 14.3 Linter Tests

**Location:** `src/linter/rulesets/*.test.ts`

**Coverage:**
- Validation rules for bots, integrations, interfaces
- Zod schema validation
- Entity extraction validation
- Configuration schema checks

**Example:**

```typescript
// src/linter/rulesets/integration.test.ts
describe('Integration Linter', () => {
  it('detects missing required fields', async () => {
    const definition = {
      name: 'test-integration'
      // Missing: description, version, actions, channels
    }

    const results = await lintIntegration(definition)

    expect(results).toContainEqual({
      path: ['description'],
      message: 'Missing required field: description',
      severity: 'error'
    })
  })

  it('validates action schemas', async () => {
    const definition = {
      name: 'test',
      actions: {
        sendMessage: {
          input: {
            schema: 'not a zod schema'  // Invalid
          }
        }
      }
    }

    const results = await lintIntegration(definition)

    expect(results).toContainEqual({
      path: ['actions', 'sendMessage', 'input', 'schema'],
      message: 'Invalid Zod schema',
      severity: 'error'
    })
  })
})
```

---

## 15. Security Considerations

### 15.1 Authentication & Authorization

**Token Management:**

- API tokens stored in:
  1. Global cache (`~/.botpress/cache.json`) - Encrypted at rest (OS-level)
  2. Profile files (`~/.botpress/profiles.json`) - Same encryption
  3. Environment variables (ephemeral)

- Tokens never logged (even in verbose mode)

- Token validation on every API call

**Workspace Isolation:**

- All API calls scoped to workspace ID
- No cross-workspace operations

### 15.2 Secrets Management

**Integration Secrets:**

- Prompted interactively (never in command history)
- Stored in project cache (`.botpress/cache.json`)
- Not committed to version control (`.botpress/` in `.gitignore`)
- Passed to child processes via environment variables (not CLI args)

**Example:**

```typescript
// Secure secret prompting
const secrets = {}

for (const [key, schema] of Object.entries(definition.secrets)) {
  const value = await password(`Enter value for ${key}:`)
  secrets[key] = value
}

// Store encrypted
const cache = new ProjectCache(workDir)
cache.set('secrets', secrets)

// Pass to worker
const child = fork('./dist/index.js', [], {
  env: {
    ...process.env,
    // Secrets as env vars
    ...Object.fromEntries(
      Object.entries(secrets).map(([k, v]) => [`BP_SECRET_${k}`, v])
    )
  }
})
```

### 15.3 Code Execution

**Sandboxing:**

- User code runs in child processes (isolated from CLI)
- No direct access to CLI internals
- stdio redirected (can't interfere with CLI output)

**Definition File Loading:**

- Definition files executed in same process (necessary for introspection)
- Limited to reading definitions (no side effects)
- Validation before execution

### 15.4 Input Validation

**All inputs validated:**

- Command arguments validated by Yargs schemas
- API responses validated with Zod
- File paths sanitized (prevent directory traversal)
- Package references validated (prevent malicious refs)

**Example:**

```typescript
// Path sanitization
function resolvePath(input: string, base: string): string {
  const resolved = resolve(base, input)

  // Ensure resolved path is within base
  if (!resolved.startsWith(base)) {
    throw new Error('Invalid path: outside project directory')
  }

  return resolved
}
```

### 15.5 File System Operations

**Safe File Operations:**

- All file writes use atomic operations (write to temp, then rename)
- File permissions preserved
- No overwrites without confirmation (for user-created files)

**Example:**

```typescript
// Atomic write
async function writeFileSafe(path: string, content: string): Promise<void> {
  const temp = `${path}.tmp`
  await writeFile(temp, content, 'utf8')
  await rename(temp, path)
}
```

### 15.6 Dependency Security

**Package Validation:**

- All packages validated before installation
- Version constraints enforced
- No automatic updates (explicit version pinning)

**API Response Validation:**

- All API responses validated with Zod schemas
- Unexpected fields rejected
- Type mismatches caught

---

## 16. Performance Optimizations

### 16.1 Build Performance

**esbuild for Speed:**

- 10-100x faster than Webpack/Rollup
- Parallel processing
- Incremental compilation (in dev mode)

**Caching:**

- Definition caching (skip rebuild if unchanged)
- Dependency caching (avoid re-fetching)
- Build artifact caching

**Example:**

```typescript
// Check if rebuild needed
const currentHash = await hashFile('*.definition.ts')
const cache = new ProjectCache(workDir)
const lastHash = cache.get('definitionHash')

if (currentHash === lastHash) {
  this.logger.log('Definition unchanged, skipping build')
  return
}

// Build and cache
await build()
cache.set('definitionHash', currentHash)
```

### 16.2 API Performance

**Parallel Requests:**

```typescript
// Fetch multiple bots in parallel
const bots = await Promise.all([
  client.getBot('bot1'),
  client.getBot('bot2'),
  client.getBot('bot3')
])
```

**Pagination:**

```typescript
// Lazy pagination
async function* listAllBots(client: APIClient): AsyncGenerator<Bot> {
  let nextToken: string | undefined

  while (true) {
    const response = await client.listBots({ nextToken })

    for (const bot of response.bots) {
      yield bot
    }

    if (!response.nextToken) break
    nextToken = response.nextToken
  }
}
```

**Request Caching:**

- Cache API responses for short duration (1 minute)
- Invalidate on mutations
- Useful for list operations

### 16.3 File System Performance

**Efficient File Watching:**

- Uses native file watching (via `@parcel/watcher`)
- Ignores unnecessary directories (`node_modules`, `.botpress/dist`)
- Debouncing to avoid rapid rebuilds

**Glob Performance:**

- Early termination on first match (when possible)
- Exclude patterns to reduce search space
- Parallel file reads

### 16.4 Hot Reload Performance

**Incremental Compilation:**

```typescript
// Only rebuild changed files
const changedFiles = await getChangedFiles()

if (changedFiles.every(f => f.startsWith('.botpress/implementation'))) {
  // Only generated files changed, skip generation
  await bundleOnly()
} else {
  // Definition changed, full rebuild
  await fullBuild()
}
```

**Worker Reuse:**

- Reuse child process when possible (avoid spawn overhead)
- Graceful shutdown (SIGTERM) for fast restarts
- Preload common modules

---

## 17. Developer Experience

### 17.1 Interactive Prompts

**Smart Defaults:**

```typescript
// Infer defaults from context
const botName = await text('Bot name:', {
  initial: basename(workDir)  // Use directory name as default
})

const version = await text('Version:', {
  initial: '0.0.1'  // Sensible default
})
```

**Contextual Help:**

```typescript
const type = await select('Project type:', [
  {
    title: 'Bot',
    value: 'bot',
    description: 'A conversational bot that can use integrations and plugins'
  },
  {
    title: 'Integration',
    value: 'integration',
    description: 'Connect to external services (Slack, Teams, etc.)'
  },
  {
    title: 'Plugin',
    value: 'plugin',
    description: 'Reusable functionality for bots'
  }
])
```

### 17.2 Progress Indicators

**Single-Line Updates:**

```typescript
// Building...
logger.singleLineUpdate('Building project...')

// Building... (50%)
logger.singleLineUpdate('Building project... (50%)')

// Building... (100%)
logger.singleLineUpdate('Building project... (100%)')

// Clear and show final message
logger.success('Build complete!')
```

**Spinners:**

```typescript
const spinner = logger.spinner('Deploying...')

try {
  await deploy()
  spinner.succeed('Deployed successfully!')
} catch (error) {
  spinner.fail('Deployment failed')
  throw error
}
```

### 17.3 Error Messages

**Actionable Errors:**

```typescript
// Bad
throw new Error('File not found')

// Good
throw new ProjectDefinitionNotFoundError(`
Could not find project definition file.
Expected: *.definition.ts in ${workDir}

To create a new project, run:
  bp init
`)
```

**Error Context:**

```typescript
// Include debug info
throw new BotpressCLIError('Failed to deploy bot', error, {
  botId: '123',
  workspaceId: 'abc',
  definitionPath: '/path/to/bot.definition.ts'
})
```

### 17.4 Help System

**Command Help:**

```bash
$ bp deploy --help

Deploy a bot, integration, or plugin to Botpress Cloud

Options:
  --botId <id>        Bot ID to update (optional, will prompt if not provided)
  --createNewBot      Create new bot instead of updating
  --noBuild           Skip build step (use existing bundle)
  --sourceMap         Generate source maps for debugging
  --apiUrl <url>      Botpress API URL (default: https://api.botpress.cloud)
  --token <token>     API token
  --workspaceId <id>  Workspace ID
  --workDir <dir>     Project directory (default: current directory)
  -y, --confirm       Skip confirmation prompts
  -v, --verbose       Enable verbose logging
  --json              Output in JSON format

Examples:
  $ bp deploy                           # Deploy current project
  $ bp deploy --botId abc123            # Deploy to specific bot
  $ bp deploy --createNewBot            # Create new bot
  $ bp deploy --noBuild                 # Deploy without rebuilding
```

**Global Help:**

```bash
$ bp --help

Botpress CLI - Build, deploy, and manage Botpress projects

Usage: bp <command> [options]

Commands:
  bp login                     Login to Botpress Cloud
  bp logout                    Logout from Botpress Cloud
  bp init                      Create a new project
  bp deploy                    Deploy project to Botpress Cloud
  bp dev                       Start development mode
  bp build                     Build project
  bp gen                       Generate type definitions
  bp bundle                    Bundle project code
  bp add <package>             Install integration, interface, or plugin
  bp lint                      Validate project
  bp read                      Read project definition
  bp chat <bot-id>             Chat with bot in terminal

Bot Commands:
  bp bots list                 List all bots
  bp bots get <id>             Get bot by ID
  bp bots delete <id>          Delete bot

... (similar for integrations, interfaces, plugins)

Options:
  -v, --verbose                Enable verbose logging
  --version                    Show version
  --help                       Show help

For help with a specific command:
  bp <command> --help
```

### 17.5 JSON Output Mode

**Scriptable Output:**

```bash
$ bp bots list --json
{
  "bots": [
    {
      "id": "01234567-89ab-cdef-0123-456789abcdef",
      "name": "my-bot",
      "version": "1.0.0",
      "createdAt": "2025-01-01T00:00:00Z"
    }
  ]
}

$ bp deploy --json
{
  "success": true,
  "botId": "01234567-89ab-cdef-0123-456789abcdef",
  "url": "https://chat.botpress.cloud/01234567-89ab-cdef-0123-456789abcdef"
}
```

**Piping to jq:**

```bash
# Get bot IDs
$ bp bots list --json | jq -r '.bots[].id'

# Filter by name
$ bp bots list --json | jq '.bots[] | select(.name == "my-bot")'
```

### 17.6 Verbose Mode

**Debug Logging:**

```bash
$ bp deploy -v

[DEBUG] Loading project definition from /path/to/bot.definition.ts
[DEBUG] Found definition: type=bot, name=my-bot
[DEBUG] Generating type definitions...
[DEBUG] Writing .botpress/implementation/index.ts
[DEBUG] Writing .botpress/implementation/actions/sendMessage.ts
[DEBUG] Building project...
[DEBUG] Running esbuild with options: { ... }
[DEBUG] Bundle size: 1.2 MB
[DEBUG] Connecting to API: https://api.botpress.cloud
[DEBUG] Fetching bot with ID: 123
[DEBUG] Uploading bot definition...
[DEBUG] Upload complete (1.2 MB in 2.3s)
[INFO] Bot deployed successfully!
```

---

## 18. Future Considerations

### 18.1 Potential Enhancements

**Performance:**

- Incremental type generation (only changed definitions)
- Persistent esbuild service (avoid spawn overhead)
- Build cache across projects (shared dependencies)

**Developer Experience:**

- IDE extensions (VS Code, IntelliJ)
- Web-based UI for CLI operations
- Interactive tutorials and walkthroughs

**Features:**

- Multi-bot workspace management
- A/B testing and canary deployments
- Rollback to previous versions
- Environment-specific configurations (dev, staging, prod)
- Backup and restore functionality

**Testing:**

- Built-in testing framework for bots/integrations
- Mock services for local testing
- Performance profiling tools

**Collaboration:**

- Team workflows (shared profiles, team workspaces)
- Code review integration (GitHub, GitLab)
- Deployment approval workflows

### 18.2 Scalability Considerations

**Large Projects:**

- Optimize bundle size (code splitting)
- Lazy loading of commands (reduce startup time)
- Parallel builds for multi-bot workspaces

**Large Workspaces:**

- Pagination for all list operations
- Incremental syncing (only changed bots)
- Workspace-level caching

**High-Frequency Development:**

- Optimize hot-reload (sub-second rebuilds)
- Differential updates (only changed code)
- Background compilation

### 18.3 Architectural Improvements

**Plugin System:**

- Allow community plugins for custom commands
- Plugin API for extending CLI functionality
- Plugin marketplace

**Configuration Management:**

- Centralized configuration file (`.botpressrc`)
- Environment variable file (`.env` support)
- Configuration validation and migration

**Modularity:**

- Extract shared utilities to separate packages
- Separate API client from CLI
- Reusable command framework

---

## Conclusion

The Botpress CLI is a robust, well-architected command-line tool that provides a comprehensive development experience for Botpress projects. Its modular design, clear separation of concerns, and focus on developer experience make it both maintainable and extensible.

**Key Strengths:**

- **Type Safety**: Comprehensive TypeScript coverage with runtime validation
- **Developer Experience**: Interactive prompts, helpful error messages, and progress indicators
- **Performance**: Fast builds with esbuild, efficient file watching, and parallel operations
- **Modularity**: Clear separation between commands, services, and utilities
- **Testing**: Unit and E2E tests for critical functionality
- **Security**: Secure credential management and sandboxed code execution

**Architecture Highlights:**

- Three-layer command system (definitions, implementations, tree)
- Base command hierarchy (BaseCommand → GlobalCommand → ProjectCommand)
- Service layer (API client, logger, utilities)
- Build pipeline (generate → bundle → deploy)
- Dev mode system (tunnel, worker, file watcher)
- Code generation system (implementation + package typings)

This document serves as a comprehensive reference for understanding the CLI's architecture, design decisions, and implementation details. It should be kept up-to-date as the codebase evolves.