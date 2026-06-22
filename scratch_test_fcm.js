const { sendAdminOrderArrived } = require('./src/services/notificationService');

async function testNotification() {
  console.log('Starting FCM test for order 82...');
  try {
    await sendAdminOrderArrived(82);
    console.log('FCM test script execution finished.');
    process.exit(0);
  } catch (error) {
    console.error('FCM test script failed:', error);
    process.exit(1);
  }
}

testNotification();
