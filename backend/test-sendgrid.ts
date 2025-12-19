import notificationService from './src/services/notification.service';
import logger from './src/config/logger';

async function testEmailConnection() {
  logger.info('Testing SendGrid SMTP connection...');

  try {
    const isConnected = await notificationService.verifyConnection();

    if (isConnected) {
      logger.info('✅ SendGrid SMTP connection successful!');
      logger.info('Email service is ready to send emails.');
    } else {
      logger.error('❌ SendGrid SMTP connection failed!');
      logger.error('Please check your EMAIL_HOST, EMAIL_PORT, EMAIL_USER, and EMAIL_PASSWORD settings.');
    }

    process.exit(isConnected ? 0 : 1);
  } catch (error) {
    logger.error('Error testing email connection:', error);
    process.exit(1);
  }
}

testEmailConnection();
