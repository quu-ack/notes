# Integration Ownership Checklist

## Setup
1. Install the integration in a test bot
2. Store all credentials in the Integration Vault in 1Password

## Testing
3. Test all functionality (actions, events, channels) : actions are working fine
4. If anything is broken, create an issue in the **SHELL (Integration)** team in Linear

## Documentation Review
5. Review the documentation and readme for completeness and accuracy
6. If documentation is incomplete or incorrect, create an issue in the **DOCS (Documentation)** team in Linear:
 - check the integration thoughts for missing points on docs

## Use Case Validation
7. Identify a real bot use case that serves a real purpose
8. If no use case can be identified, create an issue in the **SHELL (Integration)** team to improve the integration

## Blocker Identification
9. Identify reasons why a bot developer wouldn't install or use this integration:
 - main blocker is we need to have oAuth working
10. For each blocker identified, create an issue in the **SHELL (Integration)** team

## Production Log Review
11. Check production logs for the latest versions:
    - Look for errors or warnings
    - Verify error reporting to bot developers
    - Confirm PostHog tracking is working
12. For each issue found, create an issue in the **SHELL (Integration)** team

## Additional Improvements
13. Document any other fixes or features that would improve the integration
14. Create an issue in the **SHELL (Integration)** team for each improvement idea

## Completion
15. Reply to the tracking issue with:
    - Summary of work completed
    - Links to all created Linear issues
