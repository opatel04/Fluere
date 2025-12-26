# Testing Scope Creep Detection

Follow these steps to verify the scope creep detection feature.

## Prerequisites
- Ensure the backend server is running (`npm run dev` in `backend`).
- Ensure the frontend server is running (`npm run dev` in `frontend`).
- You need a user account and a client.

## Step 1: Create and Lock a Spec
1.  Navigate to the **Specs** page.
2.  Create a new spec (or use an existing draft).
3.  Ensure the spec has clear deliverables (e.g., "Website Design", "Mobile App").
4.  **Lock the spec**. This is crucial because scope creep is only detected against locked specs.

## Step 2: Simulate an Incoming Email
Since we don't have a live Gmail connection for testing, we will simulate an incoming email using a curl command (or you can use Postman).

We will use the `process/email-metadata` endpoint (or similar) if available, but since that's internal, we might need to trigger the worker directly or use a test script.

**Easier Method: Use the provided test script.**

Create a file `test-scope-creep.ts` in the `backend` folder with the following content:

```typescript
import db from './src/config/database';
import aiService from './src/services/ai.service';
import scopeCreepService from './src/services/scope-creep.service';
import specService from './src/services/spec.service';

const TEST_USER_ID = 'YOUR_USER_ID'; // Replace with your user ID
const TEST_SPEC_ID = 'YOUR_LOCKED_SPEC_ID'; // Replace with your locked spec ID
const TEST_CLIENT_ID = 'YOUR_CLIENT_ID'; // Replace with the client ID associated with the spec

async function testScopeCreep() {
  try {
    console.log('Fetching spec...');
    const { content } = await specService.getSpec(TEST_SPEC_ID);

    const emailContent = `
      Subject: Urgent: Add a mobile app
      
      Hi,
      
      We really need to add a mobile app to this project. 
      Also, can we change the deadline to next week?
      
      Thanks.
    `;

    console.log('Running detection...');
    const result = await aiService.detectScopeCreep(emailContent, content);

    console.log('Result:', JSON.stringify(result, null, 2));

    if (result.isScopeCreep) {
      console.log('Scope creep detected! Creating alert...');
      await scopeCreepService.createAlert({
        spec_id: TEST_SPEC_ID,
        email_id: 'test-email-id', // Dummy ID
        client_id: TEST_CLIENT_ID,
        result: result
      });
      console.log('Alert created.');
    } else {
      console.log('No scope creep detected.');
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit();
  }
}

testScopeCreep();
```

## Step 3: Run the Test
1.  Get your `user_id`, `spec_id` (must be locked), and `client_id` from the database or UI.
2.  Update the `test-scope-creep.ts` file with these IDs.
3.  Run the script:
    ```bash
    npx ts-node test-scope-creep.ts
    ```

## Step 4: Verify the Alert
1.  Check the console output. It should say "Scope creep detected!" and show the JSON result.
2.  Check the database:
    ```sql
    SELECT * FROM scope_creep_alerts WHERE spec_id = 'YOUR_SPEC_ID';
    ```
3.  (Optional) If you have the frontend UI for alerts, refresh the page and check if the alert appears.
