const express = require('express');
const router = express.Router();
const Comment = require('../models/Comment');

const { toggleLikeOnComment, deleteComment, addCommentToPost, getComment, getCommentsOnPost } = require('../services/commentService');

const authenticateCookie = require('../middleware/authenticateCookie');

const { createNotification } = require('../services/notificationService');
const { Notification, NotificationType } = require('../models/Notification');
const { getPost } = require('../services/postService');

router.post('/create', authenticateCookie, async (req, res) => {
    try {
        const { content, postId } = req.body;

        const newComment = new Comment({
            author: req.user.id,
            content: content,
            postId: postId
        });

        const { commentId } = await addCommentToPost(postId, newComment);

        const { post } = await getPost(postId);
        if (post.author !== req.user.id) {
            const commentNotification = new Notification({
                recipientId: post.author,
                notificationMessage: `${req.user.username} commented on your post.`,
                notificationType: NotificationType.COMMENT,
            });
            await createNotification(commentNotification);
        }

        res.status(201).json({ message: "comment created successfully", commentId: commentId });
    } catch (error) {
        console.error('error posting a comment on post: ', error.message);
        res.status(400).json({ error: error.message });
    }
});

router.get('/:commentId', async (req, res) => {
    try {
        const commentId = req.params.commentId;
        const { comment } = await getComment(commentId);

        res.status(200).json({ message: "comment retrieved successfully", comment });
    } catch (error) {
        console.error('error retrieving comment: ', error.message);
        res.status(400).json({ error: error.message });
    }
});

router.delete('/delete/:commentId', authenticateCookie, async (req, res) => {
    try {
        const { message } = await deleteComment(req.user.id, req.params.commentId);
        res.status(200).json({ message });
    } catch (error) {
        console.error("error deleting comment:", error.message);
        res.status(400).json({ error: error.message });
    }
});

router.get('/post/:postId', async (req, res) => {
    try {
        const postId = req.params.postId;
        const { comments } = await getCommentsOnPost(postId);

        res.status(200).json({ message: "comments retrieved successfully", comments });
    } catch (error) {
        console.error('error retrieving comment: ', error.message);
        res.status(400).json({ error: error.message });
    }
});

router.post('/like', authenticateCookie, async (req, res) => {
    try {
        const { commentId } = req.body;
        const authorId = req.user.id;

        const { message } = await toggleLikeOnComment(authorId, commentId);

        res.status(200).json({ message: message, commentId: commentId });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }   
});

module.exports = router; 