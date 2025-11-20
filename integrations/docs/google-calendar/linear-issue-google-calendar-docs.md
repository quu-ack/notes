# Improve Google Calendar Integration Documentation

**Team:** DOCS (Documentation)  
**Priority:** High  
**Type:** Documentation

## Summary
The Google Calendar integration documentation lacks clarity on how to write bots in code, use integration actions, handle events, and configure authentication. This creates confusion for developers trying to implement bots using the integration.

## Issues to Address

### 1. Missing "Bot as Code" Documentation
- **Problem:** The docs explain setup but provide no guidance on writing a bot in code or where to start
- **Solution Needed:** Add a bot template and clear getting started guide for code-based bot development

### 2. Integration Actions Usage Unclear
- **Problem:** Unclear distinction between plugin actions and integration actions
- **Current State:**
  - Plugins use: `bot.actionHandlers['plugin#action']`
  - Integrations use: `props.client.callAction({ type: 'integration:action', input: {} })`
- **Solution Needed:** Clearly document the `:` separator for integrations vs `#` for plugins with examples
(probably solved in the 1. point)

### 3. Type Information Not Highlighted
- **Problem:** Input types ARE typed but this isn't obvious in the documentation
- **Solution Needed:** Explicitly highlight that integration action inputs are typed and show how to access/use the types

### 4. Events Usage Unclear
- **Problem:** How to use integration events is not documented
- **Note:** EVENTCREATE and related events have been removed
- **Solution Needed:** Clearly document for each integration if it has actions, events or channels

### 5. Configuration Documentation Gaps

#### Service Account Configuration
- **Problem:** Missing `configurationType: serviceAccountKey` causes OAuth state lookup errors
- **Details:**
  - When using service account auth, must specify `configurationType: 'serviceAccountKey'`
  - Without it, integration tries to access non-existent 'oAuthConfig' state
  - For now oAuth ain't available so the configurationType doesnt include it
- **Solution Needed:** Document the `configurationType` requirement and explain when to use `'serviceAccountKey'` vs other types

#### Impersonation Email
- **Problem:** `impersonateEmail` requirement not clearly documented
- **Details:**
  - Required for Google Meet creation and attendee invitations
  - Must correspond to an email of a person actually in the workspace
- **Solution Needed:** Document the `impersonateEmail` field, when it's required, and what it should contain

### 6. Access Rights & Limitations

#### Domain-Wide Delegation
- **Problem:** Critical requirement for attendee invitations not documented
- **Details:**
  - Pure service accounts (no DWD) can only create events on their own calendar
  - Cannot act "as" a user to invite others without Domain-Wide Delegation
  - Requires:
    - Workspace domain (Gmail personal accounts don't support this)
    - Service account with Domain-Wide Delegation enabled
    - Admin-configured OAuth scopes
- **References:**
  - https://developers.google.com/identity/protocols/oauth2/service-account?hl=en
  - https://issuetracker.google.com/issues/408598694?pli=1
- **Solution Needed:** Add comprehensive section on Domain-Wide Delegation setup and requirements

#### Google Meet Creation
- **Problem:** Meet creation limitations not documented
- **Details:**
  - May require OAuth sign-in (needs verification)
  - Only works for Workspace users, not @gmail.com accounts
- **Reference:** https://stackoverflow.com/questions/67396417/error-invalid-conference-type-value-while-creating-event-with-google-meet-link
- **Solution Needed:** Document Meet creation requirements and limitations

#### Required Scopes
- **Problem:** Essential scopes not clearly highlighted
- **Details:**
  - Required scopes:
    - `https://www.googleapis.com/auth/calendar`
    - `https://www.googleapis.com/auth/calendar.events`
  - Important: Do not add more scopes, as it will by default throw exceptions for bot requests
- **Solution Needed:** Prominently document required scopes and warn against adding additional scopes

#### Access Level Limitations
- **Problem:** Different capabilities for different account types not documented
- **Details:**
  - Meeting creation and attendee invitations only work for Workspace users (not @gmail.com)
  - Adding events without meets or attendees works for @gmail accounts
  - Read access restrictions in Botpress or when organization restricts access
- **Solution Needed:** Create a clear matrix showing what works for different account types

## Recommended Documentation Structure

1. **Quick Start Guide**
   - Bot template example
   - Basic integration action call
   - Minimal working example

2. **Integration Actions**
   - How to call actions (`client.callAction()`)
   - Type information and autocomplete
   - Examples for each action

3. **Events**
   - How to subscribe to events
   - Event payload structure
   - Example event handlers

4. **Authentication & Configuration**
   - OAuth setup
   - Service account setup with `configurationType`
   - `impersonateEmail` configuration
   - Domain-Wide Delegation setup guide

5. **Limitations & Requirements**
   - Account type limitations (Workspace vs Gmail)
   - Required scopes
   - Feature availability matrix
   - Access rights considerations

## Related Files
- `integrations/docs/google-calendar/google-calendar-readme.md`
- `integration-thoughts.md`

