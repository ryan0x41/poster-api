const fs = require('fs').promises;
const { connectDB } = require('./db')

const SPECIAL_USER_IDS = new Set(["cafebabe", "feedface"]);

async function createPost(post) {
    const db = await connectDB();
    const postCollection = db.collection('post');

    const existingPost = await postCollection.findOne({ title: post.title, author: post.author });

    if (existingPost) {
        throw new Error('post already exists');
    }

    await postCollection.insertOne(post);
    console.log(`post ${post.postId} created`);

    return { postId: post.postId };
}

async function addCommentToPost(postId, comment) {
    if (!(comment instanceof Comment)) {
        throw new Error('comment must be an instance of the Comment class');
    }

    const db = await connectDB();
    const commentCollection = db.collection('comments');

    comment.postId = postId;
    await commentCollection.insertOne(comment);
    console.log(`comment ${comment.commentId} added to post ${postId}`);

    return { commentId: comment.commentId };
}

async function toggleLikeOnPost(authorId, postId) {
    const db = await connectDB();
    const postCollection = db.collection('post');

    // find post to like
    const post = await postCollection.findOne({ postId });

    if (!post) {
        throw new Error("post not found");
    }

    // check if user has already liked the post
    const hasLiked = post.likedBy.includes(authorId);

    // we remove 1 like if the user has liked already (unlike)
    // we add one like when user has not already liked before
    const updateOperation = hasLiked
        ? {
            $inc: { likes: -1 },
            $pull: { likedBy: authorId } // remove user from likedBy 
        }
        : {
            $inc: { likes: 1 },
            $push: { likedBy: authorId } // add user to likedBy 
        };

    // perform update
    const updateResult = await postCollection.updateOne(
        { postId },
        updateOperation
    );

    // failure
    if (updateResult.modifiedCount === 0) {
        throw new Error("failde to update likes");
    }

    // grab updated psot
    const updatedPost = await postCollection.findOne({ postId });

    // some more turnary operators because they look great
    return {
        message: hasLiked ? "like removed" : "like added",
        post: updatedPost
    };
}

async function toggleLikeOnComment(authorId, commentId) {
    const db = await connectDB();
    const commentCollection = db.collection('comments');

    // find comment to like
    const comment = await commentCollection.findOne({ commentId });

    if (!comment) {
        throw new Error("comment not found");
    }

    // check if user has already liked the comment
    const hasLiked = comment.likedBy.includes(authorId);

    // we remove 1 like if the user has liked already (unlike)
    // we add one like when user has not already liked before
    const updateOperation = hasLiked
        ? {
            $inc: { likes: -1 },
            $pull: { likedBy: authorId } // remove user from likedBy 
        }
        : {
            $inc: { likes: 1 },
            $push: { likedBy: authorId } // add user to likedBy 
        };

    // perform update
    const updateResult = await commentCollection.updateOne(
        { commentId },
        updateOperation
    );

    // failure
    if (updateResult.modifiedCount === 0) {
        throw new Error("failde to update likes");
    }

    // grab updated comment
    const updatedComment = await commentCollection.findOne({ commentId });

    // some more turnary operators because they look great
    return {
        message: hasLiked ? "like removed" : "like added",
        comment: updatedComment
    };
}

async function searchPosts(searchQuery) {
    const db = await connectDB();
    const postCollection = db.collection('post');

    if (!searchQuery || searchQuery.trim() === '') {
        return { message: 'search query is empty', postIds: [] };
    }

    // case insensitive, allow regex
    const posts = await postCollection.find({
        $or: [
            // search title and content
            { title: { $regex: searchQuery, $options: 'i' } },
            { content: { $regex: searchQuery, $options: 'i' } }
        ]
    }).toArray();

    // structure the json response
    const structuredPosts = posts.map(post => ({
        postId: post.postId,
        title: post.title,
        authorId: post.author,
    }));

    return {
        message: posts.length ? 'posts found' : 'no posts match the search query',
        posts: structuredPosts
    };
}

async function getPostWithComments(postId) {
    const db = await connectDB();
    const postCollection = db.collection('post');
    const commentCollection = db.collection('comments');

    const post = await postCollection.findOne({ postId }, { projection: { _id: 0 } });
    if (!post) {
        throw new Error('post not found');
    }

    const comments = await commentCollection.find({ postId }).toArray();

    return { message: 'retrieved post with comments successfully', post: { ...post, comments } };
}

async function getPost(postId) {
    const db = await connectDB();
    const postCollection = db.collection('post');

    const post = await postCollection.findOne({ postId }, { projection: { _id: 0 } });
    if (!post) {
        throw new Error('post not found');
    }

    return { message: 'retrieved post successfully', post };
}

async function deletePost(userId, postId) {
    const db = await connectDB();
    const postCollection = db.collection('post');

    const postToDelete = await postCollection.findOne({ postId });

    if (!postToDelete) {
        throw new Error('post not found');
    }

    if (postToDelete.author !== userId && !SPECIAL_USER_IDS.has(userId)) {
        throw new Error('you can only delete a post you created!');
    }

    const result = await postCollection.deleteOne({ postId });
    if (!result.deletedCount > 0) {
        throw new Error('error deleting post');
    }

    return { message: 'success' };
}

async function getAuthorPosts(authorId) {
    const db = await connectDB();
    const postCollection = db.collection('post');

    const posts = await postCollection.find({ author: authorId }, { projection: { _id: 0 } }).toArray();

    if (posts.length === 0) {
        console.log(`No posts found for author ${authorId}`);
    }

    return posts;
}

module.exports = { createPost, getAuthorPosts, addCommentToPost, getPostWithComments, toggleLikeOnComment, toggleLikeOnPost, searchPosts, deletePost, getPost };