const { v4: uuidv4 } = require('uuid');

const NotificationType = Object.freeze({
    FOLLOW: "follow",
    MESSAGE: "notification_message",
    COMMENT: "comment"
});

class Notification {
    constructor({ recipientId, notificationMessage, notificationType, contentRedirect = 0 }) {
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
        this.contentRedirect = contentRedirect;
        this.read = false;

    }
}

module.exports = { Notification, NotificationType };