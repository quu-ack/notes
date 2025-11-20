# Integration Thoughts & Feedback

## Doc
- the docs explains the setup, but nothing on the bot as code
- Its very unclear for a user to understand how to write a bot in code, where to start : I wrote a bot template
    - Integration actions must use client.callAction() with ':' separator, not bot.actionHandlers with '#'.
        - Plugins use: bot.actionHandlers['plugin#action']
        - Integrations use: props.client.callAction({ type: 'integration:action', input: {} })

- The exposed method of the integrations are not typed so its hard to know what to pass in the input: this is wrong => input ARE typed but it could be highlighted in the doc because it's not obvious
- How the fuck do we use the events
    - EVENTS ARE EMPTY OBJECT BUT WE HAVE CREATEEVENT AND EVENTCREATE tabarnak -> EVENTCREATE and suck are now removed

## Access Rights
- Can only have read access in botpress or when organization restrict access
    - I actually don't know what would be the procedure to ovecome this one


## Unexpected
- Missing configurationType caused OAuth state lookup error in bot.definition.
    - When using service account auth, must specify configurationType: 'serviceAccountKey'
        - This is weird I would have expected manual in configuration type
    - Without it, integration tries to access non-existent 'oAuthConfig' state
    - With it, integration uses JWT auth directly from privateKey/clientEmail



## Blockers
### Domain Wide Delegation for add attendees
VERY IMPORTANT :
https://developers.google.com/identity/protocols/oauth2/service-account?hl=en
https://issuetracker.google.com/issues/408598694?pli=1

Context:
A pure service account (no DWD) can:
- Create events on its own calendar.
- Usually not act “as” a user to invite others.

If you want the bot to create events on behalf of a real user (with attendees, send invites, etc.), you need:
- A Workspace domain (Gmail personal accounts don’t support this).
- A service account with Domain-Wide Delegation enabled.

Admin-configured OAuth scopes such as:


### Meet creation
Apparently cant create a meet without being oauth signed in (to verify though)
https://stackoverflow.com/questions/67396417/error-invalid-conference-type-value-while-creating-event-with-google-meet-link
 




## Access Rights
The meeting creations and attendees send invitation only works for users of the Meet API (not @gmail.com, only organizations)

Very important: These two scopes are essentials 
- https://www.googleapis.com/auth/calendar
- https://www.googleapis.com/auth/calendar.events

Note: Do not add more scopes, as it will by default throws exceptions for the bot requests

However, adding events without meets or attendees works for @gmail accounts

## Configuration
impersonateEmail: this corresponds to an email of a person actually in the workspace, this is mandatory for the google meet creations and attendees invitations