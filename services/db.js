const { MongoClient } = require('mongodb');

// connection uri and database name
const uri = process.env.MONGO_URI || 'mongodb://localhost:27017';
const dbName = process.env.DB_NAME || 'forked';

let client;
let db;

async function connectDB() {
    if (!client) {
        client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
        await client.connect();
        console.log('connected to mongodb');
        db = client.db(dbName);
    }
    return db;
}

module.exports = { connectDB };