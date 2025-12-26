import db from './src/config/database';
import aiService from './src/services/ai.service';
import specService from './src/services/spec.service';
import scopeCreepService from './src/services/scope-creep.service';
import logger from './src/config/logger';

async function testScopeCreepDetection() {
  try {
    const emailId = 'c00f76a4-faf3-4b0d-ae2a-fc5bb8f94fca';
    const userId = 'a910985b-be4b-4666-b604-c7bc75ea88f8';
    const clientId = '5a4d2a1c-56da-4e70-ab82-2c39ce58f01d';
    const specId = '3a3e1703-9538-43af-b6b5-cd8bf4f89ea5';

    console.log('🧪 Starting scope creep detection test...\n');

    // 1. Get the email
    const emailResult = await db.query('SELECT * FROM emails WHERE id = $1', [emailId]);
    const email = emailResult.rows[0];

    if (!email) {
      console.error('❌ Email not found!');
      process.exit(1);
    }

    console.log('📧 Email found:');
    console.log(`   Subject: ${email.subject}`);
    console.log(`   From: ${email.sender_email}`);
    console.log(`   Body preview: ${email.body.substring(0, 100)}...\n`);

    // 2. Get the locked spec
    const { content } = await specService.getSpec(specId);

    console.log('📋 Locked spec:');
    console.log(`   Project: ${content.project_name}`);
    console.log(`   Deliverables: ${content.deliverables.length}`);
    console.log(`   Timeline: ${content.timeline?.start_date} → ${content.timeline?.delivery_date}\n`);

    // 3. Run scope creep detection
    console.log('🤖 Running AI scope creep detection...\n');

    const scopeResult = await aiService.detectScopeCreep(
      `Subject: ${email.subject}\n\n${email.body}`,
      content
    );

    console.log('📊 Detection Results:');
    console.log(`   Has scope creep: ${scopeResult.hasScopeCreep}`);
    console.log(`   Overall confidence: ${scopeResult.overallConfidence}`);
    console.log(`   Detections found: ${scopeResult.detections.length}\n`);

    if (scopeResult.detections.length > 0) {
      console.log('🚨 Scope Creep Items Detected:\n');
      scopeResult.detections.forEach((detection, index) => {
        console.log(`   ${index + 1}. ${detection.detectedDeviation.description}`);
        console.log(`      Category: ${detection.category}`);
        console.log(`      Severity: ${detection.severity}`);
        console.log(`      Estimated Hours: ${detection.estimatedHours}`);
        console.log(`      Quote: "${detection.clientQuote}"`);
        console.log(`      Reasoning: ${detection.reasoning}\n`);
      });

      // 4. Create alerts
      console.log('💾 Creating scope creep alerts in database...\n');

      const alerts = await scopeCreepService.createAlerts({
        spec_id: specId,
        email_id: emailId,
        client_id: clientId,
        result: scopeResult
      });

      console.log(`✅ Created ${alerts.length} alert(s):\n`);
      alerts.forEach((alert, index) => {
        console.log(`   Alert ${index + 1}:`);
        console.log(`      ID: ${alert.id}`);
        console.log(`      Severity: ${alert.severity}`);
        console.log(`      Category: ${alert.category}`);
        console.log(`      Status: ${alert.status}\n`);
      });

      console.log('✨ Test completed successfully!\n');
      console.log(`📱 View in UI: http://localhost:3001/specs/${specId}\n`);
    } else {
      console.log('✅ No scope creep detected (all requests are in scope)\n');
    }

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    process.exit(0);
  }
}

testScopeCreepDetection();
