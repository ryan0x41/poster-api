const { v4: uuidv4 } = require('uuid');

class Conversation {
    constructor({ participants }) {
        if (!Array.isArray(participants)) {
            throw new Error('Participants must be an array');
        }

        this.conversationId = uuidv4();
        this.participants = participants;
        this.createdAt = new Date();
    }
}

module.exports = { Conversation };