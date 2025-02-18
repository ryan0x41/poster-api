const express = require('express');
const router = express.Router();

const { readNotification, deleteNotification, createNotification, getNotifications, getNotification } = require('../services/notificationService');
const { Notification } = require('../models/Notification');

const authenticateCookie = require('../middleware/authenticateCookie');

router.get('/:notificationId', authenticateCookie, async (req, res) => {
    try {
        const notificationId = req.params.notificationId;
        const { message, notification } = await getNotification(req.user.id, notificationId);

        return res.status(200).json({ message, notification });
    } catch (error) {
        console.error(error);
        res.status(400).json({ error: error.message });
    }
});

router.get('/all/:pageNumber?', authenticateCookie, async (req, res) => {
    try {
        const { pageNumber } = req.params;

        const { message, notifications } = await getNotifications(req.user.id,
            pageNumber && Number.isInteger(Number(pageNumber)) && Number(pageNumber) > 0
                ? Number(pageNumber)
                : undefined
        );

        res.status(200).json({ message, notifications });
    } catch (error) {
        console.error(error);
        res.status(400).json({ error: error.message });
    }
});

router.patch('/read/:notificationId', authenticateCookie, async (req, res) => {
    try {
        const notificationId = req.params.notificationId;
        const { message } = await readNotification(req.user.id, notificationId);

        res.status(200).json({ message });
    } catch (error) {
        console.error(error);
        res.status(400).json({ error: error.message });
    }
});

router.patch('/delete/:notificationId', authenticateCookie, async (req, res) => {
    try {
        const notificationId = req.params.notificationId;
        const { message } = await deleteNotification(req.user.id, notificationId);

        res.status(200).json({ message });
    } catch (error) {
        console.error(error);
        res.status(400).json({ error: error.message });
    }
});

router.post('/test/create', authenticateCookie, async (req, res) => {
    try {
        const notification = new Notification(req.body);
        const { message, notificationId } = await createNotification(notification);

        res.status(200).json({ message, notificationId });
    } catch (error) {
        console.error(error);
        res.status(400).json({ error: error.message });
    }
});

module.exports = router;