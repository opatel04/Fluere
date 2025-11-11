import notificationService from '../src/services/notification.service';
import smsService from '../src/services/sms.service';
import logger from '../src/config/logger';

async function testNotifications() {
  console.log('\n🧪 Testing Notification Services...\n');

  // Get test email and phone from command line or use defaults
  const testEmail = process.argv[2] || 'test@example.com';
  const testPhone = process.argv[3] || '+1234567890'; // Must be in E.164 format

  console.log(`📧 Test Email: ${testEmail}`);
  console.log(`📱 Test Phone: ${testPhone}\n`);

  // Test 1: Email Service Connection
  console.log('1️⃣ Testing Email Service Connection...');
  const emailConnected = await notificationService.verifyConnection();
  console.log(`   ${emailConnected ? '✅' : '❌'} Email connection: ${emailConnected ? 'SUCCESS' : 'FAILED'}\n`);

  if (!emailConnected) {
    console.log('❌ Email service not configured. Check your .env file:');
    console.log('   - EMAIL_ENABLED=true');
    console.log('   - EMAIL_HOST=smtp.sendgrid.net');
    console.log('   - EMAIL_USER=apikey');
    console.log('   - EMAIL_PASSWORD=SG.xxx\n');
  }

  // Test 2: Send Welcome Email
  if (emailConnected) {
    console.log('2️⃣ Sending Welcome Email...');
    const emailSent = await notificationService.sendWelcomeEmail(
      testEmail,
      'Test User',
      'http://localhost:3000'
    );
    console.log(`   ${emailSent ? '✅' : '❌'} Welcome email: ${emailSent ? 'SENT' : 'FAILED'}\n`);
  }

  // Test 3: Send Task Created Email
  if (emailConnected) {
    console.log('3️⃣ Sending Task Created Email...');
    const taskEmailSent = await notificationService.sendTaskCreated(
      testEmail,
      'Test User',
      'Build landing page for new feature',
      'Acme Corp',
      new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString() // 3 days from now
    );
    console.log(`   ${taskEmailSent ? '✅' : '❌'} Task email: ${taskEmailSent ? 'SENT' : 'FAILED'}\n`);
  }

  // Test 4: Send Daily Digest Email
  if (emailConnected) {
    console.log('4️⃣ Sending Daily Digest Email...');
    const digestSent = await notificationService.sendDailyDigest(testEmail, 'Test User', {
      tasksDueToday: 3,
      tasksDueThisWeek: 12,
      followUpsNeeded: 2,
      atRiskClients: 1,
      recentTasks: [
        { title: 'Design homepage mockup', client: 'Acme Corp', due_date: new Date().toISOString() },
        { title: 'Review contract', client: 'Beta Inc', due_date: new Date().toISOString() },
      ],
      urgentFollowUps: [{ client: 'Gamma LLC', days: 5 }],
    });
    console.log(`   ${digestSent ? '✅' : '❌'} Daily digest: ${digestSent ? 'SENT' : 'FAILED'}\n`);
  }

  // Test 5: Send SMS
  console.log('5️⃣ Sending Test SMS...');
  const smsSent = await smsService.sendSMS({
    to: testPhone,
    body: '[Fluere] Test message: Your notification service is working! 🎉',
  });
  console.log(`   ${smsSent ? '✅' : '❌'} SMS: ${smsSent ? 'SENT' : 'FAILED'}\n`);

  if (!smsSent) {
    console.log('❌ SMS service not configured. Check your .env file:');
    console.log('   - SMS_ENABLED=true');
    console.log('   - TWILIO_ACCOUNT_SID=ACxxx');
    console.log('   - TWILIO_AUTH_TOKEN=xxx');
    console.log('   - TWILIO_PHONE_NUMBER=+1xxx\n');
    console.log('   - Test phone must be in E.164 format: +1234567890\n');
  }

  // Test 6: Send Task Created SMS
  if (smsSent) {
    console.log('6️⃣ Sending Task Created SMS...');
    const taskSmsSent = await smsService.sendTaskCreatedSMS(
      testPhone,
      'Build landing page',
      'Acme Corp',
      new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
    );
    console.log(`   ${taskSmsSent ? '✅' : '❌'} Task SMS: ${taskSmsSent ? 'SENT' : 'FAILED'}\n`);
  }

  // Summary
  console.log('\n📊 Test Summary:');
  console.log(`   📧 Email Service: ${emailConnected ? '✅ Working' : '❌ Not configured'}`);
  console.log(`   📱 SMS Service: ${smsSent ? '✅ Working' : '❌ Not configured'}\n`);

  if (emailConnected || smsSent) {
    console.log('🎉 At least one notification service is working!\n');
    console.log('Check your email/phone for test messages.\n');
  } else {
    console.log('❌ No notification services are configured.\n');
    console.log('Run this script with your email and phone:');
    console.log('   npx ts-node scripts/test-notifications.ts your@email.com +1234567890\n');
  }

  process.exit(emailConnected || smsSent ? 0 : 1);
}

// Run the tests
testNotifications().catch((error) => {
  logger.error('Test failed:', error);
  process.exit(1);
});
