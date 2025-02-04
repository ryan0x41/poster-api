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

module.exports = Image;