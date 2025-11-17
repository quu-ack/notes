# Google Calendar Integration - Technical Documentation

## Overview

The Google Calendar integration enables Botpress chatbots to seamlessly interact with Google Calendar, providing full CRUD (Create, Read, Update, Delete) operations for calendar events. This integration allows bots to manage appointments, schedules, and events directly within conversational flows.

**Version:** 1.0.3  
**Integration Name:** `googlecalendar`  
**Title:** Google Calendar

## Architecture

### Core Components

The integration is built using the Botpress SDK and follows a modular architecture:

1. **Integration Definition** (`integration.definition.ts`): Defines the integration schema, actions, entities, and configuration
2. **Action Implementations** (`src/actions/`): Business logic for calendar operations
3. **Google API Client** (`src/google-api/`): Wrapper around Google Calendar API v3
4. **OAuth Client** (`src/google-api/oauth-client.ts`): Handles authentication flows
5. **Mapping Layer** (`src/google-api/mapping/`): Transforms data between Botpress and Google API formats
6. **Error Handling** (`src/google-api/error-handling.ts`): Centralized error management with redaction

### Interface Extensions

The integration extends five standard Botpress interfaces:

- **`listable`**: Provides `eventList` action for retrieving events
- **`creatable`**: Provides `eventCreate` action and `eventCreated` event
- **`readable`**: Provides `eventRead` action for fetching individual events
- **`updatable`**: Provides `eventUpdate` action and `eventUpdated` event
- **`deletable`**: Provides `eventDelete` action and `eventDeleted` event

This modular approach ensures consistency with other Botpress integrations and provides a standardized API surface.

## Authentication

The integration supports two authentication methods:

### 1. OAuth 2.0 (Recommended)

**Status:** Currently requires manual Google Cloud Platform setup (verification pending)

**How it works:**

- Uses OAuth 2.0 authorization code flow
- Requires `CLIENT_ID` and `CLIENT_SECRET` secrets
- Generates OAuth authorization URL via `linkTemplate.vrl`
- Handles OAuth callback at `/oauth` webhook endpoint
- Stores refresh token in integration state for token renewal
- Uses scopes:
  - `https://www.googleapis.com/auth/calendar.events` (full event management)
  - `https://www.googleapis.com/auth/calendar.readonly` (read-only access)

**OAuth Flow:**

1. User clicks authorization button in Botpress UI
2. Redirects to Google OAuth consent screen
3. User grants permissions
4. Google redirects back with authorization code
5. Integration exchanges code for access/refresh tokens
6. Refresh token stored in `oAuthConfig` state
7. Access tokens automatically refreshed as needed

**Important Notes:**

- Actions are attributed to the user who authorized the connection
- **Not recommended for personal Google accounts** - use a service account instead
- Calendar must be shared with the authorized account

### 2. Service Account (Manual Configuration)

**Configuration Type:** `serviceAccountKey`

**How it works:**

- Uses JWT (JSON Web Token) authentication
- Requires service account credentials:
  - `privateKey`: Service account private key (from JSON file)
  - `clientEmail`: Service account email address
- Calendar must be explicitly shared with the service account email
- No user interaction required

**Setup Requirements:**

1. Create Google Cloud Platform project
2. Enable Google Calendar API
3. Create service account
4. Download JSON credentials file
5. Share calendar with service account email
6. Configure integration with credentials

## Configuration

### Common Configuration

All configuration types require:

- **`calendarId`**: The ID of the Google Calendar to interact with
  - Found in Google Calendar settings under "Integrate calendar"
  - Format: typically an email address or `primary` for primary calendar

### OAuth Configuration

- **`calendarId`**: Calendar identifier
- OAuth credentials stored as secrets:
  - `CLIENT_ID`: Google OAuth Client ID
  - `CLIENT_SECRET`: Google OAuth Client Secret

### Service Account Configuration

- **`calendarId`**: Calendar identifier
- **`privateKey`**: Service account private key (full key including `-----BEGIN PRIVATE KEY-----` headers)
- **`clientEmail`**: Service account email address

## Actions

### Standard Actions (Interface-based)

These actions follow the standard Botpress interface patterns:

#### `eventList`

- **Interface:** `listable`
- **Description:** Retrieves a list of calendar events
- **Input:**
  - `nextToken` (optional): Pagination token for subsequent pages
- **Output:**
  - `items`: Array of event objects
  - `meta.nextToken`: Token for next page (if available)
- **Default Behavior:** Returns up to 100 events starting from current date/time

#### `eventCreate`

- **Interface:** `creatable`
- **Description:** Creates a new calendar event
- **Input:**
  - `item`: Event object (without `id`, `eventType`, `htmlLink`)
- **Output:**
  - `item`: Created event object with all fields populated
- **Events:** Emits `eventCreated` event

#### `eventRead`

- **Interface:** `readable`
- **Description:** Retrieves a single event by ID
- **Input:**
  - `id`: Event ID
- **Output:**
  - `item`: Complete event object

#### `eventUpdate`

- **Interface:** `updatable`
- **Description:** Updates an existing event (partial updates supported)
- **Input:**
  - `item`: Event object with `id` and fields to update
- **Output:**
  - `item`: Updated event object
- **Events:** Emits `eventUpdated` event

#### `eventDelete`

- **Interface:** `deletable`
- **Description:** Deletes an event from the calendar
- **Input:**
  - `id`: Event ID to delete
- **Output:** Empty object
- **Events:** Emits `eventDeleted` event

### Direct Actions

These actions provide more control and are not bound by interface constraints:

#### `listEvents`

- **Description:** Retrieves events with advanced filtering
- **Input:**
  - `count` (1-2500, default: 100): Maximum number of events to return
  - `pageToken` (optional): Pagination token
  - `timeMin` (optional): RFC3339 date string - only return events on or after this date (defaults to now)
- **Output:**
  - `events`: Array of event objects
  - `nextPageToken`: Token for next page (if available)

#### `createEvent`

- **Description:** Creates a new event with full control
- **Input:** Event object (see Event Entity schema)
- **Output:** Created event object

#### `updateEvent`

- **Description:** Updates an event with full control
- **Input:** Event object with `id` and fields to update
- **Output:** Updated event object

#### `deleteEvent`

- **Description:** Deletes an event
- **Input:**
  - `eventId`: Event ID to delete
- **Output:** Empty object

## Event Entity Schema

Events are represented with the following schema:

```typescript
{
  id: string                    // Opaque identifier (auto-generated)
  summary: string               // Event title (required)
  description?: string          // Event description (HTML supported)
  location?: string             // Geographic location (free-form text)
  startDateTime: string         // Start date/time (RFC3339 format, required)
  endDateTime: string           // End date/time (RFC3339 format, required)
  colorId?: string              // Color ID for event display
  eventType: 'default' | 'birthday' | 'focusTime' | 'fromGmail' | 'outOfOffice' | 'workingLocation'
  guestsCanInviteOthers?: boolean  // Default: true
  guestsCanSeeOtherGuests?: boolean // Default: true
  htmlLink: string              // URL to event in Google Calendar Web UI (read-only)
  recurrence?: string[]         // RFC5545 recurrence rules (RRULE, EXRULE, RDATE, EXDATE)
  status?: 'confirmed' | 'tentative' | 'cancelled'  // Default: 'confirmed'
  visibility?: 'default' | 'public' | 'private' | 'confidential'  // Default: 'default'
}
```

### Date/Time Format

The integration accepts dates in multiple formats and automatically converts them to RFC3339:

**Supported Formats:**

- Full RFC3339: `2024-01-01T00:00:00Z`
- RFC3339 with milliseconds: `2024-01-01T00:00:00.123Z`
- ISO 8601 with timezone: `2024-01-01T00:00:00+05:00`
- Date only: `2024-01-01` (assumes UTC midnight)
- Date and time: `2024-01-01T12:30:45`
- Space-separated: `2024-01-01 00:00:00`

The `IsoToRFC3339` utility handles all conversions automatically.

### Recurrence Rules

Events can be made recurring using RFC 5545 recurrence rules:

**Examples:**

- Daily: `RRULE:FREQ=DAILY`
- Daily for 5 days: `RRULE:FREQ=DAILY;COUNT=5`
- Weekly on specific days: `RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR`
- Monthly on 15th: `RRULE:FREQ=MONTHLY;BYMONTHDAY=15`
- Yearly: `RRULE:FREQ=YEARLY;BYMONTH=1;BYMONTHDAY=1`
- First Monday of month: `RRULE:FREQ=MONTHLY;BYDAY=1MO`
- Every 2 weeks: `RRULE:FREQ=WEEKLY;INTERVAL=2;BYDAY=MO`
- Until date: `RRULE:FREQ=DAILY;UNTIL=20261231T000000Z`
- With exceptions: `RRULE:FREQ=WEEKLY;BYDAY=MO;EXDATE=20260325T000000Z`

The `recurrence` field accepts an array of RFC5545 lines (RRULE, EXRULE, RDATE, EXDATE).

## Data Flow

### Request Flow

1. **Action Invocation** → Botpress calls action (e.g., `createEvent`)
2. **Action Wrapper** → `wrapAction` creates `GoogleClient` instance
3. **OAuth Client** → Authenticates and gets access token
4. **Request Mapping** → Converts Botpress event format to Google API format
   - Handles date/time conversion (ISO → RFC3339)
   - Maps field names and structures
5. **Google API Call** → Makes request to Google Calendar API v3
6. **Response Mapping** → Converts Google API response to Botpress format
7. **Error Handling** → Catches and redacts sensitive error information
8. **Return Result** → Returns formatted event data

### Error Handling

The integration implements comprehensive error handling:

1. **Google API Errors**: Extracted and formatted for user-friendly messages
2. **Error Redaction**: Sensitive information removed from error messages
3. **Sentry Integration**: Errors tracked for monitoring (if configured)
4. **Runtime Errors**: Wrapped in `sdk.RuntimeError` with descriptive messages

Error handling decorator (`@handleErrors`) wraps all Google API calls.

## State Management

### Integration State

- **`oAuthConfig`**: Stores OAuth refresh token
  - Used for automatic token renewal
  - Only populated when using OAuth authentication
  - Not used with service account authentication

## Webhooks

### OAuth Callback

**Endpoint:** `/oauth`  
**Method:** GET  
**Purpose:** Handles OAuth authorization code callback

**Flow:**

1. Google redirects to `/oauth?code={authorizationCode}&state={webhookId}`
2. Handler extracts authorization code
3. Exchanges code for tokens via `GoogleClient.authenticateWithAuthorizationCode`
4. Stores refresh token in state
5. Logs success

## Dependencies

### Runtime Dependencies

- `@botpress/client`: Botpress client SDK
- `@botpress/common`: Common utilities
- `@botpress/sdk`: Botpress SDK core
- `@botpress/sdk-addons`: SDK addons (Sentry integration)
- `googleapis`: Google APIs client library (v144.0.0)

### Development Dependencies

- `@botpress/cli`: Botpress CLI tools
- `@botpresshub/creatable`: Creatable interface module
- `@botpresshub/deletable`: Deletable interface module
- `@botpresshub/listable`: Listable interface module
- `@botpresshub/readable`: Readable interface module
- `@botpresshub/updatable`: Updatable interface module
- `@sentry/cli`: Sentry CLI tools

## Code Structure

```
integrations/googlecalendar/
├── integration.definition.ts      # Integration definition and interface extensions
├── package.json                   # Dependencies and scripts
├── hub.md                         # User-facing documentation
├── linkTemplate.vrl               # OAuth URL generation template
├── definitions/                   # Schema definitions
│   ├── actions.ts                # Action schemas
│   ├── configuration.ts          # Configuration schemas
│   ├── entities/
│   │   └── event.ts              # Event entity schema
│   ├── events.ts                 # Event definitions
│   ├── secrets.ts                # Secret definitions
│   └── states.ts                 # State definitions
├── src/
│   ├── index.ts                  # Integration entry point
│   ├── setup.ts                  # Registration/unregistration
│   ├── actions/                  # Action implementations
│   │   ├── index.ts              # Action exports
│   │   ├── action-wrapper.ts     # Action wrapper with GoogleClient factory
│   │   └── implementations/
│   │       ├── create-event.ts
│   │       ├── delete-event.ts
│   │       ├── list-events.ts
│   │       ├── update-event.ts
│   │       └── interfaces/       # Interface-based actions
│   │           ├── event-create.ts
│   │           ├── event-delete.ts
│   │           ├── event-list.ts
│   │           ├── event-read.ts
│   │           └── event-update.ts
│   ├── google-api/               # Google API client layer
│   │   ├── index.ts              # Exports
│   │   ├── google-client.ts      # Main Google Calendar client
│   │   ├── oauth-client.ts       # OAuth authentication
│   │   ├── error-handling.ts     # Error handling utilities
│   │   ├── types.d.ts            # TypeScript type definitions
│   │   └── mapping/
│   │       ├── index.ts
│   │       ├── request-mapping.ts # Botpress → Google API
│   │       ├── response-mapping.ts # Google API → Botpress
│   │       └── datetime-utils/
│   │           ├── iso-to-rfc3339.ts      # Date conversion utility
│   │           └── iso-to-rfc3339.test.ts # Tests
│   └── webhook-events/           # Webhook handlers
│       ├── index.ts
│       ├── handler-dispatcher.ts  # Routes webhook requests
│       └── handlers/
│           └── oauth-callback.ts # OAuth callback handler
└── bp_modules/                    # Interface modules (generated)
    ├── creatable/
    ├── deletable/
    ├── listable/
    ├── readable/
    └── updatable/
```

## Key Implementation Details

### GoogleClient Class

The `GoogleClient` class encapsulates all Google Calendar API interactions:

- **Singleton Pattern**: Created per action invocation via `GoogleClient.create()`
- **Authentication**: Handles both OAuth and Service Account authentication
- **Error Handling**: All methods decorated with `@handleErrors`
- **API Version**: Uses Google Calendar API v3

### Action Wrapper

The `wrapAction` function provides:

- **Tool Factory**: Creates `GoogleClient` instance automatically
- **Error Handling**: Wraps action implementations in try-catch
- **Logging**: Debug logs for action invocations
- **Error Messages**: Custom error messages per action

### Date/Time Conversion

The `IsoToRFC3339` utility:

- Accepts multiple date formats (ISO 8601, RFC3339, partial dates)
- Handles timezone conversions
- Validates date inputs
- Converts to RFC3339 format required by Google API
- Removes unnecessary milliseconds (`.000Z` → `Z`)

### Request/Response Mapping

**Request Mapping:**

- Converts Botpress event schema to Google Calendar API format
- Handles date/time conversion
- Removes quotes added by Botpress Studio
- Maps field names appropriately

**Response Mapping:**

- Converts Google API responses to Botpress format
- Handles optional fields with defaults
- Maps enums (eventType, status, visibility)
- Extracts pagination tokens

## Usage Examples

### Creating an Event

```typescript
// Using direct action
await client.callAction({
  type: 'googlecalendar/createEvent',
  input: {
    summary: 'Team Meeting',
    description: 'Weekly team sync',
    location: 'Conference Room A',
    startDateTime: '2024-01-15T10:00:00Z',
    endDateTime: '2024-01-15T11:00:00Z',
    visibility: 'private',
    recurrence: ['RRULE:FREQ=WEEKLY;BYDAY=MO'],
  },
})

// Using interface action
await client.callAction({
  type: 'googlecalendar/eventCreate',
  input: {
    item: {
      summary: 'Team Meeting',
      startDateTime: '2024-01-15T10:00:00Z',
      endDateTime: '2024-01-15T11:00:00Z',
    },
  },
})
```

### Listing Events

```typescript
// Get upcoming events
const result = await client.callAction({
  type: 'googlecalendar/listEvents',
  input: {
    count: 50,
    timeMin: '2024-01-01T00:00:00Z',
  },
})

// Pagination
if (result.output.nextPageToken) {
  const nextPage = await client.callAction({
    type: 'googlecalendar/listEvents',
    input: {
      count: 50,
      pageToken: result.output.nextPageToken,
    },
  })
}
```

### Updating an Event

```typescript
await client.callAction({
  type: 'googlecalendar/updateEvent',
  input: {
    id: 'event-id-123',
    summary: 'Updated Meeting Title',
    location: 'New Location',
  },
})
```

### Deleting an Event

```typescript
await client.callAction({
  type: 'googlecalendar/deleteEvent',
  input: {
    eventId: 'event-id-123',
  },
})
```

## Migration Notes

### From Version 0.x to 1.x

**Breaking Changes:**

1. **Authentication**: Now supports both OAuth and Service Account
   - Service Account users must reconfigure using "Manual configuration" option
2. **Date Format**: ISO 8601 dates now fully supported (previously required RFC3339)
3. **New Fields**: Recurrence and visibility settings now available
   - Returned in list operations
   - Can be set during create/update

## Testing

The integration includes unit tests for date/time conversion:

- `iso-to-rfc3339.test.ts`: Comprehensive tests for date format conversion
- Tests cover various input formats, edge cases, and error conditions

## Monitoring

The integration integrates with Sentry for error tracking:

- Errors automatically reported if Sentry secrets configured
- Error redaction ensures sensitive data not logged
- Environment and release tracking supported

## Security Considerations

1. **OAuth Tokens**: Refresh tokens stored securely in integration state
2. **Service Account Keys**: Private keys stored as configuration (encrypted at rest)
3. **Error Redaction**: Sensitive information removed from error messages
4. **Calendar Sharing**: Service accounts require explicit calendar sharing
5. **Scope Limitation**: OAuth scopes limited to calendar events only

## Limitations

1. **OAuth Verification**: Automatic OAuth configuration pending Google verification
2. **Event Attendees**: Attendee management not currently supported
3. **Calendar Management**: Only event operations supported (not calendar creation/deletion)
4. **Webhooks**: No support for Google Calendar push notifications
5. **Event Instances**: Recurring event instance management not supported

## Future Enhancements

Potential improvements:

- Support for event attendees (inviting, updating, removing)
- Calendar management operations (create, list, delete calendars)
- Google Calendar push notifications/webhooks
- Recurring event instance management
- Event reminders configuration
- Timezone handling improvements
- Batch operations for multiple events

## Related Documentation

- [Google Calendar API v3 Reference](https://developers.google.com/calendar/api/v3/reference)
- [RFC 5545 (iCalendar)](https://tools.ietf.org/html/rfc5545)
- [RFC 3339 (Date and Time)](https://tools.ietf.org/html/rfc3339)
- [Botpress SDK Documentation](https://botpress.com/docs)

## Support

For issues, questions, or contributions:

- Check existing `hub.md` for user-facing documentation
- Review error logs for troubleshooting
- Ensure calendar is properly shared (for service accounts)
- Verify OAuth credentials are correct (for OAuth flow)
