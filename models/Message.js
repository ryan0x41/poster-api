const { v4: uuidv4 } = require('uuid');

class Message {
    constructor({ sender, conversationId, content }) {

        if (!sender || !conversationId || !content) {
            throw new Error('you need sender, conversation and content to message a conversation');
        }

        this.sender = sender;
        this.conversationId = conversationId;
        this.content = content;
        this.sendAt = new Date();
    }
}

module.exports = { Message };