const express = require('express');
const router = express.Router();
const { Image, Comment, Post, createPost, getAuthorPosts, addCommentToPost, getPostWithComments } = require('../services/postService');
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