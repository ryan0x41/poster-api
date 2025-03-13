const express = require('express');
const { decodeToken, authenticateAuthHeader } = require('../middleware/authenticateAuthHeader');
const router = express.Router();
const { Conversation } = require('../models/Conversation');
const { startConversation, getConversations, getConversation } = require('../services/conversationService');

router.post('/create', decodeToken, authenticateAuthHeader, async (req, res) => {
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

router.get('/id/:conversationId', decodeToken, authenticateAuthHeader, async (req, res) => {
    try {
        const conversationId = req.params.conversationId;
        const { message, conversation } = await getConversation(conversationId);

        res.status(200).json({ message, conversation });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

router.get('/all', decodeToken, authenticateAuthHeader, async (req, res) => {
    try {
        const { conversations, message } = await getConversations(req.user.id);
        res.status(200).json({ message, conversations });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
})

module.exports = router;