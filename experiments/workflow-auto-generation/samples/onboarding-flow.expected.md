# Generated Workflow: onboarding-flow
_Generated at 2026-04-06T03:26:23.144Z_

## Stages (3)

### collect-profile (input)
Collect user profile data

```typescript
// Stage: collect-profile (input)
// Collects data from an external source
async function collectProfile(ctx) {
  // TODO: Define input schema
  const input = ctx.input;
  
  // TODO: Validate input shape
  // TODO: Return normalized data
  return { data: null };
}
```

### validate-input (validate)
Validate required fields

```typescript
// Stage: validate-input (validate)
// Checks data meets requirements
async function validateInput(ctx) {
  const data = ctx.prev;
  
  // TODO: Define validation rules
  const isValid = true; // placeholder
  
  if (!isValid) {
    throw new Error("Validate required fields failed");
  }
  
  return { ...data, validated: true };
}
```

### send-welcome-email (action)
Send welcome email to user

```typescript
// Stage: send-welcome-email (action)
// Performs a side effect
async function sendWelcomeEmail(ctx) {
  const data = ctx.prev;
  
  // TODO: Implement action logic
  // Send welcome email to user
  
  return { ...data, sendWelcomeEmailDone: true };
}
```

## Wiring

- `collect-profile` → `validate-input`
- `validate-input` → `send-welcome-email`

## Human Edits Required (3)

- **collect-profile**: TODO: Implement Collect user profile data
- **validate-input**: TODO: Implement Validate required fields
- **send-welcome-email**: TODO: Implement Send welcome email to user
