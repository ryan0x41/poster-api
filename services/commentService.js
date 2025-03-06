const { connectDB } = require('./db');
const Comment = require('../models/Comment');

// if you know you know, macho reference
const SPECIAL_USER_IDS = new Set(["cafebabe", "feedface"]);

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

async function deleteComment(userId, commentId) {
    const db = await connectDB();
    const commentCollection = db.collection('comments');

    const commentToDelete = await commentCollection.findOne({ commentId });

    if (!commentToDelete) {
        throw new Error('comment not found');
    }

    // check for admin user id
    // why? because i forgot admins are a thing and now im creating a report system which needs to use this service
    if (commentToDelete.author !== userId && !SPECIAL_USER_IDS.has(userId)) {
        throw new Error('you can only delete a comment you created!');
    }

    const result = await commentCollection.deleteOne({ commentId });
    if (!result.deletedCount > 0) {
        throw new Error('error deleting comment');
    }

    return { message: 'success' };
}

async function getComment(commentId) {
    const db = await connectDB();
    const commentCollection = db.collection('comments');

    const comment = await commentCollection.findOne({ commentId }, { projection: { _id: 0, commentId: 0 } });

    return { comment };
}

async function getCommentsOnPost(postId) {
    const db = await connectDB();
    const commentCollection = db.collection('comments');

    const comments = await commentCollection.find({ postId }, { projection: { _id: 0 } }).toArray();
    return { comments };
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

module.exports = { toggleLikeOnComment, addCommentToPost, deleteComment, getComment, getCommentsOnPost };