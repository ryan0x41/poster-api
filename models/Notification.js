const { v4: uuidv4 } = require('uuid');

// no follow or comment notifications for now
const NotificationType = Object.freeze({
    FOLLOW: "follow",
    MESSAGE: "message",
    // COMMENT: "comment"
});

class Notification {
    constructor({ recipientId, notificationMessage, notificationType, sender }) {
        if (!recipientId || !notificationMessage || !notificationType) {
            throw new Error('all fields (recipientId, notificationMessage, notificationType) are required');
        }

        if (!Object.values(NotificationType).includes(notificationType)) {
            throw new Error(`invalid type: ${type}. must be one of ${Object.values(NotificationType).join(", ")}`);
        }

        this.created = new Date();
        this.notificationId = uuidv4();
        this.recipientId = recipientId;
        this.notificationMessage = notificationMessage;
        this.sender = sender;
        this.notificationType = notificationType;
    }
}

module.exports = { Notification, NotificationType };