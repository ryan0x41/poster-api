const { v4: uuidv4 } = require('uuid');

class Post {
    constructor({ title, content, author, images = null }) {

        if(!title || !content || !author) {
            throw new Error('all fields (title, content and author) are required to make a post');
        }

        this.images = Array.isArray(images) 
            ? images.filter(img => img instanceof Image) 
            : [];


        this.postId = uuidv4();
        this.title = title;
        this.content = content;
        this.author = author;
        this.postDate = new Date();

        this.likes = 0;
        this.likedBy = [];
    }
}

module.exports = Post;