const { connectDB } = require('./db')
const { Conversation } = require('../models/Conversation');

async function startConversation(conversation) {
    if (!(conversation instanceof Conversation)) {
        throw new Error('conversation has to be an instance of Conversation');
    }

    const db = await connectDB();
    const usersCollection = db.collection('users');

    for(let i=0; i<conversation.participants.length; i++) {
        let userId = conversation.participants[i];

        const existingUser = await usersCollection.findOne({ id: userId })
        if(!existingUser) {
            throw new Error('user does not exist')
        }
    }

    const conversationCollection = db.collection('conversations');

    const existingConversation = await conversationCollection.findOne({ participants: conversation.participants });
    if(existingConversation) {
        return { message: "existing conversation found", conversationId: existingConversation.conversationId };
    }

    const result = await conversationCollection.insertOne(conversation);
    if (!result.acknowledged || !result.insertedId) {
        throw new Error("failed to insert conversation into the database.");
    }

    return { message: "conversation started successfully", conversationId: conversation.conversationId };
}

async function deleteConversation(userId, conversationId) {
    const db = await connectDB();
    const conversationCollection = db.collection('conversations');
    const messagesCollection = db.collection('messages');

    const { conversation } = await getConversation(userId, conversationId);
    if(!conversation.participants.includes(userId)) {   
        throw new Error('you can only delete a conversation you created');
    }

    let result;

    result = await conversationCollection.deleteOne({ conversationId });
    if (!result.deletedCount > 0) { 
        throw new Error('error deleting conversation');
    }

    result = await messagesCollection.deleteMany({ conversationId });
    if (!result.deletedCount > 0) { 
        throw new Error('error deleting messages');
    }

    return { message: "delete conversation/messages success" };
}

async function getConversation(userId, conversationId) {
    const db = await connectDB();
    const conversationCollection = db.collection('conversations');

    const conversation = await conversationCollection.findOne({ conversationId });

    if (!conversation) {
        throw new Error('conversation does not exist');
    }

    if (!conversation.participants.includes(userId)) {
        throw new Error('you can only read conversations you participate in');
    }

    return { message: "conversation retrieved successfully", conversation };
}

async function getConversations(userId) {
    const db = await connectDB();
    const conversationCollection = db.collection('conversations');

    const conversations = await conversationCollection.find({ participants: userId }, { projection: { _id: 0 } }).toArray();

    return { message: "conversations retrieved successfully", conversations };
}

module.exports = { startConversation, getConversations, getConversation, deleteConversation };