import SummaryService from './src/services/summary.service';
import logger from './src/config/logger';

const userId = 'a910985b-be4b-4666-b604-c7bc75ea88f8';

async function testEmail() {
  try {
    logger.info('Manually triggering test email...');
    const summaryService = new SummaryService();
    const result = await summaryService.generateDailySummary(userId, true);

    if (result) {
      logger.info('✅ Email sent successfully!');
      console.log('\n✅ EMAIL SENT SUCCESSFULLY!');
      console.log('Check your inbox at: ompatel1752004@gmail.com\n');
    } else {
      logger.error('❌ Failed to send email');
      console.log('\n❌ FAILED TO SEND EMAIL\n');
    }

    process.exit(0);
  } catch (error) {
    logger.error('Error sending test email:', error);
    console.error('\n❌ ERROR:', error);
    process.exit(1);
  }
}

testEmail();
