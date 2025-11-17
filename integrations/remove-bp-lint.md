# Procedure: Remove `/* bplint-disable */` and Migrate to New ZUI Transformer

## Overview

This procedure details the steps to remove `/* bplint-disable */` annotations from integration definitions and migrate from the legacy ZUI transformer to the new ZUI transformer. This is part of making integrations compliant with the enforced linting rules.

## Context: Why This Migration is Needed

The `bp lint` command was implemented to validate integration definitions against best practices and ensure compliance with ZUI (Zod UI) schema requirements. However, some integrations had linting failures, and to save time, these rules were temporarily disabled using `/* bplint-disable */` annotations.

Now, we want to make all integrations compliant with these enforced rules. The new ZUI transformer provides better schema validation and ensures integrations follow the correct structure.

## What is ZUI?

ZUI (Zod UI) is Botpress's schema validation system built on top of [Zod](https://zod.dev/), a TypeScript-first schema validation library. The ZUI implementation is located at `/botpress/packages/sdk/src/zui.ts`.

### How ZUI Works

1. **Schema Definition**: ZUI uses Zod schemas to define the structure of integration configurations, action inputs/outputs, channel messages, and events.

2. **Type Safety**: By using Zod schemas, ZUI provides:
   - Runtime validation of data
   - TypeScript type inference
   - Automatic type generation for bot developers

3. **Transformer**: The ZUI transformer converts Zod schemas into JSON Schema format that can be:
   - Validated at runtime
   - Used by the Botpress UI to generate forms
   - Serialized and sent to the API

4. **Key Components**:
   - `z.object()` - Defines object schemas
   - `z.string()`, `z.number()`, `z.boolean()` - Primitive types
   - `.describe()` - Adds descriptions for UI display
   - Schema merging utilities for combining schemas

The ZUI transformer improves upon the legacy version by:
- Better handling of schema properties
- Proper placement of descriptions
- Removal of unnecessary `schema` keys
- Elimination of `x-zui` annotations
- More accurate validation

## Step-by-Step Procedure

### Step 1: Remove the `/* bplint-disable */` Annotation

1. Open the `integration.definition.ts` file in your integration project.

2. Locate the `/* bplint-disable */` comment at the beginning of the file (typically on the first line).

3. **Remove this line completely.**

   **Before:**
   ```typescript
   /* bplint-disable */
   import { z, IntegrationDefinition } from '@botpress/sdk'
   // ... rest of file
   ```

   **After:**
   ```typescript
   import { z, IntegrationDefinition } from '@botpress/sdk'
   // ... rest of file
   ```

### Step 2: Run `bp lint` to Identify Issues

1. From your integration project directory, run:
   ```bash
   bp lint
   ```

2. Review all linting errors and warnings. Common issues include:
   - Missing required fields
   - Invalid schema structures
   - Incorrect property placements
   - Missing descriptions
   - Type mismatches

3. **Fix all linting issues** identified by the command. Address each error systematically.

### Step 3: Compare Legacy vs New Transformer Output

1. **Generate JSON with legacy transformer:**
   ```bash
   bp read --json > legacy-output.json
   ```
   
   This creates a JSON file using the current (legacy) transformer settings.

2. **Remove the legacy transformer configuration:**
   
   In your integration definition file, locate and remove the `__advanced` section:
   
   ```typescript
   // REMOVE THIS:
   __advanced: {
     useLegacyZuiTransformer: true,
   },
   ```

3. **Generate JSON with new transformer:**
   ```bash
   bp read --json > new-output.json
   ```

4. **Compare the outputs:**
   ```bash
   diff legacy-output.json new-output.json
   ```
   
   Or use a visual diff tool to see the differences.

### Step 4: Expected Differences and Changes

When comparing the old and new transformer outputs, you should expect to see:

#### ✅ Expected Changes (These are GOOD):

1. **No `schema` property**: The new transformer removes redundant `schema` keys that were present in the legacy version.

2. **No `x-zui: {}` annotations**: The new transformer eliminates these metadata annotations that are no longer needed.

3. **`description` property moved**: Descriptions may be in different locations. The new transformer places them according to the ZUI specification.

4. **Missing values detected by `bp lint`**: The linting process will identify missing required values, and these should be added to the definition.

5. **Removal of `__advanced` section**: This entire section should be removed from the definition file.

#### ⚠️ Integration-Specific Differences:

Some integrations might have slightly different changes depending on their structure:
- Actions with complex input/output schemas
- Channels with multiple message types
- Events with nested payloads
- Configuration schemas with conditional fields

Review these differences carefully to ensure they don't break functionality.

### Step 5: Verify the Changes

1. **Run lint again** to ensure no errors:
   ```bash
   bp lint
   ```
   
   This should pass without errors.

2. **Test the integration**:
   ```bash
   bp build
   bp deploy --dryRun
   ```

3. **Verify the JSON output**:
   ```bash
   bp read --json
   ```
   
   Confirm that:
   - No `schema` keys are present
   - No `x-zui` annotations exist
   - Descriptions are properly placed
   - The structure matches the expected format

### Step 6: Clean Up Temporary Files

Remove the temporary comparison files (do not commit them!):
```bash
rm legacy-output.json new-output.json
```

## Troubleshooting

### If You Encounter Issues

1. **Weird behavior or problems**: 
   - Comment on the parent issue (SH-191)
   - Ask `@faucon` for assistance

2. **Linting errors persist**:
   - Review the error messages carefully
   - Check the ZUI documentation
   - Ensure all Zod schemas are properly defined

3. **Transformer differences are unexpected**:
   - Compare with other migrated integrations
   - Verify that the new transformer output is correct
   - Test the integration to ensure it still works

## Summary Checklist

- [ ] Removed `/* bplint-disable */` annotation from `integration.definition.ts`
- [ ] Ran `bp lint` and fixed all issues
- [ ] Generated JSON with legacy transformer (`bp read --json`)
- [ ] Removed `__advanced: { useLegacyZuiTransformer: true }` section
- [ ] Generated JSON with new transformer (`bp read --json`)
- [ ] Compared outputs and verified expected differences:
  - [ ] No `schema` property
  - [ ] No `x-zui: {}` annotations
  - [ ] `description` properties in correct locations
  - [ ] Missing values added (detected by `bp lint`)
  - [ ] `__advanced` section removed
- [ ] Verified `bp lint` passes without errors
- [ ] Tested integration build and deployment
- [ ] Cleaned up temporary files

## Related Issues

- **Parent Issue**: SH-191 - Remove all `/* bplint-disable */` annotations and fix linter
- **Sub-issue**: This procedure (Telegram integration and others)

