const { v4: uuidv4 } = require('uuid');

class Post {
    constructor({ title, content, author, images = [] }) {

        if (!title || !content || !author) {
            throw new Error('all fields (title, content and author) are required to make a post');
        }

        this.postId = uuidv4();
        this.title = title;
        this.content = content;
        this.author = author;
        this.postDate = new Date();

        this.likes = 0;
        this.likedBy = [];

        // images should be an array, each image must be validated to make sure its a url
        this.images = Array.isArray(images) ? this.validateImages(images) : [];
    }

    validateImages(images) {
        // SOURCE: https://www.freecodecamp.org/news/how-to-write-a-regular-expression-for-a-url/
        const urlRegex = /(https:\/\/www\.|http:\/\/www\.|https:\/\/|http:\/\/)?[a-zA-Z]{2,}(\.[a-zA-Z]{2,})(\.[a-zA-Z]{2,})?\/[a-zA-Z0-9]{2,}|((https:\/\/www\.|http:\/\/www\.|https:\/\/|http:\/\/)?[a-zA-Z]{2,}(\.[a-zA-Z]{2,})(\.[a-zA-Z]{2,})?)|(https:\/\/www\.|http:\/\/www\.|https:\/\/|http:\/\/)?[a-zA-Z0-9]{2,}\.[a-zA-Z0-9]{2,}\.[a-zA-Z0-9]{2,}(\.[a-zA-Z0-9]{2,})?/g;
        return images.filter(image => typeof image === "string" && urlRegex.test(image));
    }
}

module.exports = Post;