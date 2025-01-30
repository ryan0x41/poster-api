const fs = require('fs').promises;
const { connectDB } = require('./db')
// for creating unique user identification numbers
const { 
    v4: uuidv4,
} = require('uuid');

// TODO: spotify album/song/artist class or something ?
// link with post?
// class Spotify {
//     ...
// } 

class Image {
    constructor({ imageLink, width, height, format }) {
        this.imageLink = imageLink;
        this.width = width;
        this.height = height;
        this.format = format;

        // MAYBE_TODO: restrict width, height and format
        // if ( ... ) {
        //
        // }
    }

    // MVP, im just doing things man
    toEmbed() {
        return `<img src="${this.imageLink}" width="${this.width}" height="${this.height}" alt="Image">`;
    }    
}

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

    like(authorId) {
        if (!authorId) {
            throw new Error('authorId is required to like a comment');
        }

        if (this.likedBy.includes(authorId)) {
            throw new Error('user has already liked this comment');
        }

        this.likes += 1;
        this.likedBy.push(authorId);
    }
}

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
    }

    toMarkdown() {
        const imageMarkdown = this.images.map(img => `![Image](${img.imageLink})`).join("\n");
        return `
        # ${this.title}
        > ${this.author}
        ###### *${this.postDate.toDateString()}*
    
        ${this.content}
    
        ${imageMarkdown}
        `;
    }
    
}

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

module.exports = { Image, Comment, Post, createPost, getAuthorPosts, addCommentToPost, getPostWithComments };