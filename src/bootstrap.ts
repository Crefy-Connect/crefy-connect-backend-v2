import AfricasTalkingSMS from './services/africas.talking.service.js';

// Initialize with just senderId (no shortCode)
const smsClient = new AfricasTalkingSMS();

// Send SMS using sender ID
async function sendPromotionalMessage() {
    const result = await smsClient.sendSms(
        '+254113159363', // Single recipient
        'Hello! Our sale starts tomorrow. Visit our store for 20% off!',
        {
            enqueue: true // Optional: queue message if rate limited
        }
    );

    if (result.status === 'success') {
        console.log('Message sent via sender ID:', result.messageId);
        result.recipients?.forEach(recipient => {
            console.log(`To: ${recipient.phoneNumber}, Status: ${recipient.status}`);
        });
    } else {
        console.error('Failed to send:', result.errorMessage);
    }
}

sendPromotionalMessage();