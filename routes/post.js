const express = require('express');
const router = express.Router();

const { createPost, getAuthorPosts, getPostWithComments, toggleLikeOnPost, searchPosts } = require('../services/postService');

const Post = require('../models/Post');

const authenticateCookie = require('../middleware/authenticateCookie');

router.post('/create', authenticateCookie, async (req, res) => {
    try {
        // post author should be logged in user
        const postData = {
            ...req.body,
            author: req.user.id, // enforce
        };

        const post = new Post(postData);

        console.log(post)

        if (post.author !== req.user.id) {
            throw new Error('you can only create a post for yourself!');
        }

        const postId = await createPost({ ...post });

        res.status(201).json({ message: "post created successfully", postId: postId });
    } catch (error) {
        console.error("error creating post:", error.message);
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

router.get('/:postId', async (req, res) => {
    try {
        const { postId } = req.params;
        
        const { message, post } = await getPostWithComments(postId);
        res.status(302).json({ message: message, post: post });
    } catch (error) {
        console.error("error finding post:", error.message);
        res.status(400).json({ error: error.message });
    }
});

router.post('/search', async (req, res) => {
    try {
        const { searchQuery } = req.body;
        
        const { message, posts } = await searchPosts(searchQuery);
        res.status(302).json({ message, posts });
    } catch (error) {
        console.error("error searching post:", error.message);
        res.status(400).json({ error: error.message });
    }
});

router.get('/author/:authorId', async (req, res) => {
    try {
        const { authorId } = req.params;
        const posts = await getAuthorPosts(authorId);

        res.status(200).json({ message: "posts retrieved successfully", posts: posts });
    } catch (error) {
        console.error("error finding author posts:", error.message);
        res.status(400).json({ error: error.message });
    }
});

module.exports = router; 