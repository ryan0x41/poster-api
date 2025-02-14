const { connectDB } = require('./db')
const { Conversation } = require('../models/Conversation');

async function startConversation(conversation) {
    if (!(conversation instanceof Conversation)) {
        throw new Error('conversation has to be an instance of Conversation');
    }    

    const db = await connectDB();
    const conversationCollection = db.collection('conversations');

    const result = await conversationCollection.insertOne(conversation);
    if (!result.acknowledged || !result.insertedId) {
        throw new Error("failed to insert conversation into the database.");
    }

    return { message: "conversation started successfully" };
}

async function getConversations(userId) {
    const db = await connectDB();
    const conversationCollection = db.collection('conversations');

    const conversations = await conversationCollection.find({ participants: userId }, { projection: { _id: 0 } }).toArray();

    return { message: "conversations retrieved successfully", conversations };
}

module.exports = { startConversation, getConversations }