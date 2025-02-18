const { connectDB } = require('./db');
const { Notification } = require('../models/Notification');

async function createNotification(notification) {
    if(!notification instanceof Notification) {
        throw new Error('notification has to be an instance of Notification');
    }

    const db = await connectDB();
    const notificationCollection = db.collection('notifications');

    const existingNotification = await notificationCollection.findOne({ notificationId: notification.notificationId });
    if(existingNotification) {
        throw new Error('notification already exists');
    }

    const result = await notificationCollection.insertOne(notification);
    if(!result.acknowledged) {
        console.log('error inserting notification to notificationCollection');
    }

    return { message: "notification created succesfully", notificationId: notificationCollection.notificationId };
}

async function getNotification(recipientId, notificationId) {
    const db = await connectDB();
    const notificationCollection = db.collection('notifications');

    const notification = await notificationCollection.findOne({ notificationId }, { projection: { _id: 0 }});

    if(!notification) {
        throw new Error('notification not found');
    }

    if(recipientId !== notification.recipientId) {
        throw new Error('you can only read notifications for you');
    }

    return { message: "notification recieved successfully", notification };
};

async function getNotifications(recipientId, page = 1, pageSize = 50) {
    const db = await connectDB();
    const notificationCollection = db.collection('notifications');

    page = Math.max(1, page);
    const skip = (page - 1) * pageSize;

    const notifications = await notificationCollection
        .find({ recipientId }, { projection: { _id: 0 } })
        .sort({ created: -1 })
        .skip(skip)
        .limit(pageSize)
        .toArray();

    // total number of notifications
    const totalNotifications = await notificationCollection.countDocuments();

    // calculate total pages
    const totalPages = Math.ceil(totalNotifications / pageSize);

    return {
        message: "notifications recieved successfully",
        page,
        totalPages,
        totalNotifications,
        notifications
    };
}

async function deleteNotification(recipientId, notificationId) {
    const db = await connectDB();
    const notificationCollection = db.collection('notifications');

    const notification = await notificationCollection.findOne({ notificationId });
    if(!notification) {
        throw new Error('notification not found');
    }

    if(recipientId !== notification.recipientId) {
        throw new Error('you can only delete a notification you recieved');
    }

    const result = await notificationCollection.deleteOne({ notificationId });
    if(!result.deletedCount > 0) {
        throw new Error('error deleting notification');
    }

    return { message: "deleted notification successfully" };
};

async function readNotification(recipientId, notificationId) {
    const db = await connectDB();
    const notificationCollection = db.collection('notifications');

    const notification = await notificationCollection.findOne({ notificationId });

    if (!notification) {
        throw new Error('notification not found');
    }

    if (recipientId !== notification.recipientId) {
        throw new Error('you can only read a notification you received');
    }

    const updateResult = await notificationCollection.updateOne(
        { notificationId },
        { $set: { read: true } }
    );

    if (updateResult.modifiedCount === 0) {
        throw new Error('failed to update notification status');
    }

    return { message: "read receipt sent successfully" };
}


module.exports = { readNotification, deleteNotification, createNotification, getNotifications, getNotification };