const express = require('express');
const router = express.Router();
const { createPost, getAuthorPosts, addCommentToPost, getPostWithComments, toggleLikeOnComment, toggleLikeOnPost } = require('../services/postService');

const Post = require('../models/Post');
const Comment = require('../models/Comment');

const authenticateCookie = require('../middleware/authenticateCookie');

router.post('/create', authenticateCookie, async (req, res) => {
    try {
        // post author should be logged in user
        const postData = {
            ...req.body,
            author: req.user.id, // enforce
        };

        const post = new Post(postData);

        if (post.author !== req.user.id) {
            throw new Error('you can only create a post for yourself!');
        }

        const postId = await createPost({ ...post });

        res.status(201).json(postId);
    } catch (error) {
        console.error("error creating post:", error.message);
        res.status(400).json({ error: error.message });
    }
});

router.post('/comment', authenticateCookie, async (req, res) => {
    try {
        const { content, postId } = req.body;

        const newComment = new Comment({
            author: req.user.id,
            content: content,
            postId: postId
        });

        const comment = addCommentToPost(postId, newComment.id);

        res.status(201).json({ id: comment });
    } catch (error) {
        console.error('error posting a comment on post: ', error.message);
        res.status(400).json({ error: error.message });
    }
});

router.post('/like', authenticateCookie, async (req, res) => {
    try {
        const { postId } = req.body;
        const authorId = req.user.id;

        const { message } = await toggleLikeOnPost(authorId, postId);

        res.status(200).json({ message: message, postId: postId });
    } catch (error) {
        console.error("error liking post:", error.message);
        res.status(400).json({ error: error.message });
    }
});

router.post('/comment/like', authenticateCookie, async (req, res) => {
    try {
        const { commentId } = req.body;
        const authorId = req.user.id;

        const { message } = await toggleLikeOnComment(authorId, commentId);

        res.status(200).json({ message: message, commentId: commentId });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }   
});

router.get('/author/:authorId', async (req, res) => {
    try {
        const { authorId } = req.params;
        const posts = await getAuthorPosts(authorId);

        res.status(200).json(posts);
    } catch (error) {
        console.error("error finding author posts:", error.message);
        res.status(400).json({ error: error.message });
    }
});

module.exports = router; 