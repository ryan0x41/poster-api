const express = require('express');
const { decodeToken, authenticateAuthHeader } = require('../middleware/authenticateAuthHeader');
const router = express.Router();
const { sendMessage, getMessageThread } = require('../services/messageService');
const { Message } = require('../models/Message');

const { getConversation } = require('../services/conversationService');
const { createNotification } = require('../services/notificationService');
const { Notification, NotificationType } = require('../models/Notification');

const { getIO, userSockets } = require('../socket');

router.post('/send', decodeToken, authenticateAuthHeader, async (req, res) => {
    try {
        const { conversationId, content } = req.body;
        const sender = req.user.id;
        const messageToSend = new Message({ sender, conversationId, content });

        const { message } = await sendMessage(messageToSend);

        // for notifs, every participant in a conversation should recieve a notification
        const { conversation } = await getConversation(req.user.id, conversationId);
        // the sender should not recieve an notification for a message they sent
        const recipients = conversation.participants.filter(participant => participant !== sender);

        const io = getIO();

        // for each recipient, create a notification for each of them
        for (const recipientId of recipients) {
            const messageNotification = new Notification({
                recipientId,
                notificationMessage: `${req.user.username} sent you a message.`,
                notificationType: NotificationType.MESSAGE,
                sender,
            });
            await createNotification(messageNotification);

            // emit message to user if user is connected
            const recipientSocketId = userSockets[recipientId];
            if (recipientSocketId) {
                // real time message retrieval
                io.to(recipientSocketId).emit('new_message', {
                    conversationId,
                    sender,
                    content,
                    sendAt: new Date().toISOString(),
                });

                // real time notification for message
                io.to(recipientSocketId).emit('new_notification', {
                    notificationData: messageNotification,
                });
            }
        }

        res.status(200).json({ message });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

router.patch('/typing/:conversationId', decodeToken, authenticateAuthHeader, async (req, res) => {
    try {
        const conversationId = req.params.conversationId;
        const sender = req.user.id;
        const { conversation } = await getConversation(req.user.id, conversationId);

        const recipients = conversation.participants.filter(participant => participant !== sender);
        const io = getIO();

        for (const recipientId of recipients) {
            // emit message to user if user is connected
            const recipientSocketId = userSockets[recipientId];
            if (recipientSocketId) {
                io.to(recipientSocketId).emit('typing', {
                    conversationId,
                    sender,
                });
            }
        }

        res.status(200).json({ message: "typing receipt sent" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

router.get('/thread/:conversationId', decodeToken, authenticateAuthHeader, async (req, res) => {
    try {
        const conversationId = req.params.conversationId;
        const messages = await getMessageThread(conversationId, req.user.id);

        res.status(200).json({ message: "message thread recieved", messages });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;