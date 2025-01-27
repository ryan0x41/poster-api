const { connectDB } = require('./db')
// for hashing passwords
const bcrypt = require('bcrypt');
// for creating a session when logged in
const jwt = require('jsonwebtoken');

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

// file that stores user information
const USERS_FILE = process.env.USERS_FILE || 'users.json';
// more security = more computing power
const SALT_ROUNDS = 10;

/*
    the user class should hold following information
        - account creation date
        - a unique uuid (user identification number e.g. 110ec58a-a0f2-4ac4-8393-c866d813b8d1)
        - a username
        - an email
        - a password (hashed)
        - a reference number to one or more recipes
*/

class User {
    constructor(username, email, passwordHash) {
        this.account_creation = Date.now();
        this.id = uuidv4();
        this.username = username;
        this.email = email;
        this.passwordHash = passwordHash
        this.recipes = [];
    }
}

// returns users from file
async function loadUsers() {
    try {
        // use fs library to read data
        const data = await fs.readFile(USERS_FILE, 'utf-8');
        // parse data into JSON
        return JSON.parse(data);
    } catch (error) {
        // ENOENT = no such file or directory, return empty array
        if (error.code === 'ENOENT') {
            return [];
        }
        // i dont know what happened, throw the error
        throw error;
    }
}

// saves users to file
async function saveUsers(users) {
    try {
        await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2), 'utf-8');
    } catch (error) {
        throw new Error('failed to update users file');
    }
}

// middleware
function authenticateToken(req, res, next) {
    // extract token from the request header 
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    // i should do oneliners more often
    if (token == null) return res.sendStatus(401);

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            console.error(err);
            return res.sendStatus(403); // invalid token
        }
        req.user = user;
        next();
    });
}

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

// creates a user object, appends to existing or newly created .json file
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
        account_creation: Date.now(),
        recipes: [], // reference to recipes
    };

    // insert into mongodb users collection
    await usersCollection.insertOne(user);
    console.log(`user ${username} created`);

    // return the newly created user
    return { id: user.id, username: user.username, email: user.email };
}

// this is so much cleaner than fs wow
async function getUser(query) {
    const db = await connectDB();
    const usersCollection = db.collection('users');

    // query by id, username or email
    const user = await usersCollection.findOne(query);
    return user || null;
}


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
        { id: user.id, username: user.username, email: user.email },
        JWT_SECRET,
        { expiresIn: '24h' }
    );

    // return the token once generated
    return { token, user: { id: user.id, username: user.username, email: user.email } };
}

async function addUserRecipes(userId, recipes) {
    const db = await connectDB();
    const usersCollection = db.collection('users');

    const result = await usersCollection.updateOne(
        // for user id
        {id: userId },
        // push the new recipes
        { $push: { recipes: { $each: recipes } } }
    );

    if (result.matchedCount === 0) {
        throw new Error('user not found!');
    }

    console.log(`recipes added to userId: ${userId}`);
    return { userId, recipes };
}

// simple but effective
async function getUserRecipes(userId) {
    let user = await getUser({ userId: userId });
    return user?.recipes || { };
}

async function editUser(userId, newUsername, newEmail) {
    const db = await connectDB();
    const usersCollection = db.collection('users');

    const user = await usersCollection.findOne({ id: userId });
    if(!user) {
        throw new Error('user not found!');
    }

    // validate
    if (newUsername) {
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
        { id: updatedUser.id, username: updatedUser.username, email: updatedUser.email },
        JWT_SECRET,
        { expiresIn: '24h' }
    );

    console.log(`user with id ${userId} updated successfully!`);

    return {
        user: { id: updatedUser.id, username: updatedUser.username, email: updatedUser.email },
        token
    };
}

// delete a user by an id
async function deleteUser(userId) {
    const db = await connectDB();
    const usersCollection = db.collection('users');

    // delete user by id
    const result = await usersCollection.deleteOne({ id: userId });
    if (result.deletedCount === 0) {
        throw new Error('user not found!');
    }

    console.log(`user with id ${userId} deleted`);
    return { userId };
}

module.exports = { createUser, loginUser, addUserRecipes, getUserRecipes, deleteUser, editUser };