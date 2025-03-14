const express = require('express');
const { decodeToken, authenticateAuthHeader } = require('../middleware/authenticateAuthHeader');
const router = express.Router();
const { Conversation } = require('../models/Conversation');
const { startConversation, getConversations, getConversation, deleteConversation } = require('../services/conversationService');

router.post('/create', decodeToken, authenticateAuthHeader, async (req, res) => {
    try {
        const { participants } = req.body;
        const sender = req.user.id;

        if (!Array.isArray(participants)) {
            return res.status(400).json({ error: "participants must be an array" });
        }

        participants.push(sender);
        const uniqueParticipants = [...new Set(participants)];
        if (uniqueParticipants.length < 2) {
            return res.status(400).json({ error: "cannot start conversation with yourself" });
        }

        const conversation = new Conversation({ participants });
        const { message, conversationId } = await startConversation(conversation);

        res.status(201).json({ message, conversationId });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

router.delete('/delete/:conversationId', decodeToken, authenticateAuthHeader, async (req, res) => {
    try {   
        const conversationId = req.params.conversationId;
        const userId = req.user.id;

        const { message } = await deleteConversation(userId, conversationId);
        res.status(200).json({ message });
    } catch(error) {
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