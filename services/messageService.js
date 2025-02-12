const { connectDB } = require('./db')
const { Message } = require('../models/Message');
const { request } = require('express');

async function sendMessage(message) {
    if(!message instanceof Message) {
        throw new Error('message has to be an instance of Message');
    }

    const db = await connectDB();
    const messagesCollection = db.collection('messages');

    const result = await messagesCollection.insertOne(message);

    return { message: "message sent successfully" };
}

async function getMessageThread(conversationId, requestedBy) {
    const db = await connectDB();
    const messagesCollection = db.collection('messages');
    const conversationCollection = db.collection('conversations');

    const conversation = await conversationCollection.findOne({ conversationId })

    if(!conversation.participants.includes(requestedBy)) {
        throw new Error('you can only view the conversations you participate in!');
    }

    // sort messages by sendAt, acsending order
    const messages = await messagesCollection
        .find({ conversationId }, { projection: { _id: 0, conversationId: 0 } })
        .sort({ sentAt: 1 })
        .toArray();

    return messages;
}

module.exports = { sendMessage, getMessageThread };