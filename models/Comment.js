const { v4: uuidv4 } = require('uuid');

class Comment {
    constructor({ author, content, postId }) {
        if (!author || !content || !postId) {
            throw new Error('all fields (author, content, postId) are required to make a comment');
        }

        this.commentId = uuidv4();
        this.author = author;
        this.content = content;
        this.postId = postId;

        // init likedBy and likes
        this.likes = 0;
        this.likedBy = [];
    }
}

module.exports = Comment;