const express = require('express');
const authenticateCookie = require('../middleware/authenticateCookie');
const router = express.Router();
const { sendMessage, getMessageThread } = require('../services/messageService');
const { Message } = require('../models/Message');

router.post('/send', authenticateCookie, async (req, res) => {
    try {
        const { conversationId, content } = req.body;
        const sender = req.user.id;
        const messageToSend = new Message({ sender, conversationId, content });

        const { message } = await sendMessage(messageToSend);
        res.status(200).json({ message });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

router.get('/thread/:conversationId', authenticateCookie, async (req, res) => {
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