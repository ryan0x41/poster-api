const express = require('express');
const authenticateCookie = require('../middleware/authenticateCookie');
const router = express.Router();
const { Conversation } = require('../models/Conversation');
const { startConversation, getConversations } = require('../services/conversationService');

router.post('/create', authenticateCookie, async (req, res) => {
    try {
        const { participants } = req.body;
        const sender = req.user.id;

        if (!Array.isArray(participants)) {
            return res.status(400).json({ error: "participants must be an array" });
        }

        participants.push(sender);

        const conversation = new Conversation({ participants });
        const { message } = await startConversation(conversation);

        res.status(201).json({ message, conversationId: conversation.conversationId });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

router.get('/all', authenticateCookie, async (req, res) => {
    try {
        const { conversations, message } = await getConversations(req.user.id);
        res.status(200).json({ message, conversations });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
})

module.exports = router;