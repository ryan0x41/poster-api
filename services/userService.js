const { connectDB } = require('./db')
// for hashing passwords
const bcrypt = require('bcrypt');
// for creating a session when logged in
const jwt = require('jsonwebtoken');
// for full profile retrieval
const { getSpotifyTopArtists, getSpotifyTopTracks } = require('../controllers/spotifyController');

// dont crash on me now!
if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is not defined!');
} else {
    JWT_SECRET = process.env.JWT_SECRET;
}

// for creating unique user identification numbers
const { 
    v4: uuidv4,
} = require('uuid');

// more security = more computing power
const SALT_ROUNDS = 10;

// validate user creation input 
function validateRegistration(username, email, password) {
    // SOURCE: https://stackoverflow.com/questions/201323/how-can-i-validate-an-email-address-using-a-regular-expression
    const emailRegex = /(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:(2(5[0-5]|[0-4][0-9])|1[0-9][0-9]|[1-9]?[0-9]))\.){3}(?:(2(5[0-5]|[0-4][0-9])|1[0-9][0-9]|[1-9]?[0-9])|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)])/;

    if(!email.match(emailRegex)) {
        throw new Error('invalid email!');
    }

    // SOURCE: gpt
    // lowercase, alphanumeric, atleast 4 characters, and can contain - and _
    const usernameRegex = /^[a-z0-9_-]{4,}$/

    if(!username.match(usernameRegex)) {
        throw new Error('invalid username!');
    }

    // SOURCE ORIG: https://stackoverflow.com/questions/19605150/regex-for-password-must-contain-at-least-eight-characters-at-least-one-number-a
    const passwordRegex = /^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9])(?=.*?[#?!@$%^&*-]).{8,}$/;

    if(!password.match(passwordRegex)) {
        throw new Error('invalid password!');
    }
}

// create a user by username, email and password
async function createUser(username, email, password) {
    const db = await connectDB();
    const usersCollection = db.collection('users');

    // trust no one
    validateRegistration(username, email, password);

    // hash the password, salt the hash a number of times
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    // check if the user already exists in the db
    const existingUser = await usersCollection.findOne({
        // logical OR operation, if username OR email are present
        $or: [{ username }, { email }],
    });

    // user already exists
    if (existingUser) {
        throw new Error('username or email already exists!');
    }

    // create user document
    const user = {
        id: uuidv4(),
        username,
        email,
        passwordHash,
        accountCreation: Date.now(),
        following: [],
        isAdmin: false,
        spotifyLinked: false,
    };

    // insert into mongodb users collection
    await usersCollection.insertOne(user);
    console.log(`user ${username} created`);

    // return the newly created user
    return { id: user.id, username: user.username, email: user.email };
}

// promote user to admin
async function promote(userId) {
    const db = await connectDB();
    const usersCollection = db.collection('users');

    const result = await usersCollection.updateOne(
        { id: userId },
        { $set: { isAdmin: true } }
    );

    if (result.matchedCount === 0) {
        return { message: 'user not found' };
    }
}

// give a user feed limited by posts based on the users following
async function getUserFeed(userId, page) {
    const db = await connectDB();
    const usersCollection = db.collection('users');
    const postsCollection = db.collection('post'); 

    const user = await usersCollection.findOne({ id: userId });
    if (!user) {
        throw new Error('user not found!');
    }

    const followingList = user.following || [];

    const postsPerPage = 10;
    const pageNumber = parseInt(page, 10) || 1;
    const skipCount = (pageNumber - 1) * postsPerPage;

    const feedPosts = await postsCollection
        .find({ author: { $in: followingList } }, { projection: { _id: 0 } })
        .sort({ postDate: -1 })
        .skip(skipCount)
        .limit(postsPerPage)
        .toArray();
    

    return { message: "user feed retrieved successfully", posts: feedPosts, page: pageNumber };
}

// grab user followers
async function getFollowers(userId) {
    const db = await connectDB();
    const usersCollection = db.collection('users');

    // all users where userId is in their following array
    const followers = await usersCollection
        .find({ following: userId }, { projection: { _id: 0, email: 0, passwordHash: 0, following: 0, warnings: 0, isAdmin: 0 } })
        .toArray();

    return { message: "user followers retrieved successfully", followers };
}

// grab user following
async function getFollowing(userId) {
    const db = await connectDB();
    const usersCollection = db.collection('users');

    const user = await usersCollection.findOne({ id: userId });
    if(!user) {
        throw new Error('user not found!');
    }

    const followingList = user.following || [];

    const followingUsers = await usersCollection
        .find({ id: { $in: followingList } }, { projection: { _id: 0, id: 1, username: 1, accountCreation: 1 } })
        .toArray();

    return { message: "user following retrieved successfully", following: followingUsers };
}

// grab an authToken using usernameOrEmail and password
async function loginUser(usernameOrEmail, password) {
    const db = await connectDB();
    const usersCollection = db.collection('users');

    // find the user by email or username
    const user = await usersCollection.findOne({
        $or: [{ username: usernameOrEmail }, { email: usernameOrEmail }],
    });

    if(!user) {
        throw new Error('user not found!');
    }

    // with the user, we need to compare the hash of the password with the users hashed password
    // RESEARCH: https://stackoverflow.com/questions/40076638/compare-passwords-bcryptjs
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if(!isMatch) {
        // password is incorrect
        throw new Error('invalid password!');
    }

    console.log('generating token');

    // since the password check passed, we can create a token and pass it to the user
    const token = jwt.sign(
        // RESEARCH: https://stackoverflow.com/questions/56855440/in-jwt-the-sign-method
        { id: user.id, username: user.username, email: user.email, isAdmin: user.isAdmin },
        JWT_SECRET,
        { expiresIn: '24h' }
    );

    // return the token once generated
    return { token, user: { id: user.id, username: user.username, email: user.email, passwordHash: user.passwordHash } };
}

// get a user profile (full information) by username
async function getUserProfile(username) {
    const db = await connectDB();
    const usersCollection = db.collection('users');
    const postsCollection = db.collection('post');

    const user = await usersCollection.findOne({ username });
    if (!user) {
        throw new Error('user not found!');
    }

    const posts = await postsCollection
        .find({ author: user.id }, { projection: { _id: 0 } })
        .toArray();

    const followers = await usersCollection
        .find({ following: user.id }, { projection: { _id: 0, email: 0, passwordHash: 0, following: 0, warnings: 0, isAdmin: 0 } })
        .toArray();

    const following = user.following && user.following.length > 0 ?
        await usersCollection
            .find({ id: { $in: user.following } }, { projection: { _id: 0, id: 1, username: 1, accountCreation: 1 } })
            .toArray() :
        [];

    const spotifyTracksResponse = await getSpotifyTopTracks(user.id);
    const tracks = Array.isArray(spotifyTracksResponse.tracks) ? spotifyTracksResponse.tracks : [];
    const listeningHistory = tracks.map(item => {
        const track = item.track;
        return {
            albumCover: track.album && track.album.image ? track.album.image : '/default-album-cover.jpg',
            artistName: track.artists && track.artists[0] ? track.artists[0].name : 'Unknown Artist',
            songName: track.name
        };
    });

    const spotifyArtistsResponse = await getSpotifyTopArtists(user.id);
    const artists = Array.isArray(spotifyArtistsResponse.artists) ? spotifyArtistsResponse.artists : [];
    const favouriteArtists = artists.map(artist => ({
        imageUrl: artist.images && artist.images[0] ? artist.images[0].url : '/default-artist.jpg',
        name: artist.name
    }));

    return {
        message: "retrieved user successfully",
        user: {
            id: user.id,
            username: user.username,
            email: user.email,
            profileImageUrl: user.profileImageUrl,
            accountCreation: user.accountCreation,
            followers,
            following,
            posts,
            listeningHistory,
            favouriteArtists
        }
    };
}

// get user profile given a userId
async function getUserProfileById(userId) {
    const db = await connectDB();
    const usersCollection = db.collection('users');
    const postsCollection = db.collection('post');

    const user = await usersCollection.findOne({ id: userId });
    if (!user) {
        throw new Error('user not found!');
    }

    const posts = await postsCollection
        .find({ author: userId }, { projection: { _id: 0 } })
        .toArray();

    const followers = await usersCollection
        .find({ following: userId }, { projection: { _id: 0, email: 0, passwordHash: 0, following: 0, warnings: 0, isAdmin: 0 } })
        .toArray();

    const following = user.following && user.following.length > 0 ?
        await usersCollection
            .find({ id: { $in: user.following } }, { projection: { _id: 0, id: 1, username: 1, accountCreation: 1 } })
            .toArray() :
        [];

    const spotifyTracksResponse = await getSpotifyTopTracks(user.id);
    const tracks = Array.isArray(spotifyTracksResponse.tracks) ? spotifyTracksResponse.tracks : [];
    const listeningHistory = tracks.map(item => {
        const track = item.track;
        return {
            albumCover: track.album && track.album.image ? track.album.image : '/default-album-cover.jpg',
            artistName: track.artists && track.artists[0] ? track.artists[0].name : 'Unknown Artist',
            songName: track.name
        };
    });

    const spotifyArtistsResponse = await getSpotifyTopArtists(user.id);
    const artists = Array.isArray(spotifyArtistsResponse.artists) ? spotifyArtistsResponse.artists : [];
    const favouriteArtists = artists.map(artist => ({
        imageUrl: artist.images && artist.images[0] ? artist.images[0].url : '/default-artist.jpg',
        name: artist.name
    }));

    return {
        message: "retrieved user successfully",
        user: {
            id: user.id,
            username: user.username,
            email: user.email,
            profileImageUrl: user.profileImageUrl,
            accountCreation: user.accountCreation,
            followers,
            following,
            posts,
            listeningHistory,
            favouriteArtists
        }
    };
}

// reset a password using oldPassword and userId
async function resetPassword(oldPassword, newPassword, userId) {
    const db = await connectDB();
    const usersCollection = db.collection('users');

    const user = await usersCollection.findOne({ id: userId });

    if(!user) {
        throw new Error('user not found!');
    }

    const isMatch = await bcrypt.compare(oldPassword, user.passwordHash);
    if(!isMatch) {
        throw new Error('invalid password!');
    }

    // validate password
    const passwordRegex = /^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9])(?=.*?[#?!@$%^&*-]).{8,}$/;
    if (!passwordRegex.test(newPassword)) {
        throw new Error('passwords must contain one uppercase letter, one lowercase letter, one digit and one special character');
    }

    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    await usersCollection.updateOne(
        { id: userId },
        { $set: { passwordHash: newPasswordHash } }
    );

    return { message: "password updated successfully" }
}

// add a profile image url by userId
async function updateProfileImageUrl(userId, imageUrl) {
    const db = await connectDB();
    const usersCollection = db.collection('users');

    const user = await usersCollection.findOne({ id: userId });
    if(!user) {
        throw new Error('user not found!');
    }

    const result = await usersCollection.updateOne(
        { id: userId },
        { $set: { profileImageUrl: imageUrl } }
    );

    if (result.matchedCount === 0) {
        throw new Error('failed to update profile picture url');
    }

    return { userId };
}

// follow a user by userId
async function followUser(userId, userIdToFollow) {
    const db = await connectDB();
    const usersCollection = db.collection('users');

    // both users should exist
    const user = await usersCollection.findOne({ id: userId });
    if (!user) {
        throw new Error('user not found!');
    }

    const userToFollow = await usersCollection.findOne({ id: userIdToFollow });
    if (!userToFollow) {
        throw new Error('user to follow not found');
    }

    // check if the user is following
    const isFollowing = user.following && user.following.includes(userIdToFollow);

    if (isFollowing) {
        // unfollow, remove userIdToFollow from the following array
        await usersCollection.updateOne(
            { id: userId },
            { $pull: { following: userIdToFollow } }
        );
        return { message: 'user unfollowed successfully' };
    } else {
        // add userIdToFollow to the following array
        await usersCollection.updateOne(
            { id: userId },
            { $addToSet: { following: userIdToFollow } }
        );
        return { message: 'user followed successfully' };
    }
}

// allow account to be linked to spotify
async function linkSpotify(spotifyAccount) {
    const db = await connectDB();
    const usersCollection = db.collection('users');
    const spotifyCollection = db.collection('spotifyAccounts');
  
    const user = await usersCollection.findOne({ id: spotifyAccount.userId });
    if (!user) {
      throw new Error('user not found!');
    }

    const existingSpotify = await spotifyCollection.findOne({ userId: user.id });
    if(existingSpotify) {
        throw new Error('account already linked');
    }
  
    const insertResult = await spotifyCollection.insertOne(spotifyAccount);
    if(!insertResult.acknowledged) {
        throw new Error('error inserting spotifyAccount into database');
    }

    const updateResult = await usersCollection.updateOne(
        { id: user.id },
        { $set: { spotifyLinked: true } }
    );
    if (updateResult.matchedCount === 0) {
        throw new Error('failed to update user');
    }

    return insertResult;
}

// edit a users email or username by userId
async function editUser(newUsername, newEmail, userId) {
    const db = await connectDB();
    const usersCollection = db.collection('users');

    const user = await usersCollection.findOne({ id: userId });
    if(!user) {
        throw new Error('user not found!');
    }

    // validate
    if (newUsername) {
        console.log(newUsername);
        const usernameRegex = /^[a-z0-9_-]{4,}$/;
        if (!newUsername.match(usernameRegex)) {
            throw new Error('invalid username!');
        }

        // check for duplicate
        const usernameConflict = await usersCollection.findOne({ username: newUsername, id: { $ne: userId } });
        if (usernameConflict) {
            throw new Error('username already exists!');
        }
    }

    // validate
    if (newEmail) {
        const emailRegex = /(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:(2(5[0-5]|[0-4][0-9])|1[0-9][0-9]|[1-9]?[0-9]))\.){3}(?:(2(5[0-5]|[0-4][0-9])|1[0-9][0-9]|[1-9]?[0-9])|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)])/;
        if (!newEmail.match(emailRegex)) {
            throw new Error('invalid email!');
        }

        // check for duplicate
        const emailConflict = await usersCollection.findOne({ email: newEmail, id: { $ne: userId } });
        if (emailConflict) {
            throw new Error('Email already exists!');
        }
    }

    const updateFields = {};
    if (newUsername) updateFields.username = newUsername;
    if (newEmail) updateFields.email = newEmail;

    const result = await usersCollection.updateOne(
        { id: userId },
        { $set: updateFields }
    );

    // failure
    if (result.matchedCount === 0) {
        throw new Error('failed to update user');
    }

    // generate new token with updated information
    const updatedUser = await usersCollection.findOne({ id: userId });
    const token = jwt.sign(
        { id: updatedUser.id, username: updatedUser.username, email: updatedUser.email, isAdmin: user.isAdmin },
        JWT_SECRET,
        { expiresIn: '24h' }
    );

    console.log(`user with id ${userId} updated successfully!`);

    return { message: "updated info successfully", token };
}

// delete a user by an id
async function deleteUser(userId) {
    const db = await connectDB();
    const usersCollection = db.collection('users');

    const user = await usersCollection.findOne({ id: userId });

    const result = await usersCollection.deleteOne({ id: userId });
    if (result.deletedCount === 0) {
        throw new Error('user not found!');
    }

    console.log(`user with id ${user.id} deleted`);
    return user;
}

module.exports = { getFollowers,
                   getFollowing,
                   createUser,
                   loginUser,
                   deleteUser,
                   editUser,
                   followUser,
                   resetPassword,
                   updateProfileImageUrl,
                   getUserProfile,
                   getUserProfileById,
                   getUserFeed,
                   promote,
                   linkSpotify };