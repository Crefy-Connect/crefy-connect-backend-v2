curl --location 'https://api.africastalking.com/version1/messaging/bulk' \
--header 'Content-Type: application/json' \
--header 'apiKey: atsk_a29750bb7bec8e1210d86e1d10c9a0b970b3e652d738939c2dd4954fe7ebf84bf5550b2e' \
--data '{
    "username": "username",
    "message": "This is a sample message.",
    "senderId": "ABC",
    "phoneNumbers": [
        "254113159363"
    ]
}' 