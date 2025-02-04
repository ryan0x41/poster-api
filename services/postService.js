const fs = require('fs').promises;
const { connectDB } = require('./db')


// TODO: spotify album/song/artist class or something ?
// link with post?
// class Spotify {
//     ...
// } 

async function createPost(post) {
    const db = await connectDB();
    const postCollection = db.collection('post'); 

    const existingPost = await postCollection.findOne({ title: post.title, author: post.author });

    if(existingPost) {
        throw new Error('post already exists');
    }

    await postCollection.insertOne(post);
    console.log(`post ${post.postId} created`);

    return { id: post.postId };
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



async function getPostWithComments(postId) {
    const db = await connectDB();
    const postCollection = db.collection('post');
    const commentCollection = db.collection('comments');

    const post = await postCollection.findOne({ postId });
    if (!post) {
        throw new Error('post not found');
    }

    const comments = await commentCollection.find({ postId }).toArray();

    return { ...post, comments };
}

async function getAuthorPosts(authorId) {
    const db = await connectDB();
    const postCollection = db.collection('post'); 

    const posts = await postCollection.find({ author: authorId }).toArray();

    if (posts.length === 0) {
        console.log(`No posts found for author ${authorId}`);
    }

    return posts;
}

module.exports = { createPost, getAuthorPosts, addCommentToPost, getPostWithComments, toggleLikeOnComment, toggleLikeOnPost };