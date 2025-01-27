const express = require('express');
const router = express.Router();

// the CRUD operations needed from userService
const { createUser, loginUser, getUserRecipes, addUserRecipes, deleteUser, editUser } = require('../services/userService');

// security reasons, dont allow users to edit other user recipes/accounts and what not
const authenticateCookie = require('../middleware/authenticateCookie');

router.post('/register', async (req, res) => {
    const { username, email, password } = req.body;

    // if username, email or password do not exist
    if (!username || !email || !password) {
        // status 400 is bad request
        return res.status(400).json({ error: 'username, email, and password are required to register!' });
    }

    // try to create a new user
    try {
        // status 201 is creation successful
        const newUser = await createUser(username, email, password );
        res.status(201).json({ message: 'user created successfully', user: newUser });
    } catch (error) {
        console.error(error);
        res.status(400).json({ error: error.message });
    }
});

router.post('/login', async (req, res) => {
    const { usernameOrEmail, password } = req.body;

    if (!usernameOrEmail || !password) {
        // status 400 is bad request
        return res.status(400).json({ error: 'username, and password are required to login!' });
    }

    try {
        // status 201 is creation successful
        const { token } = await loginUser(usernameOrEmail, password );
        res.status(201).json({ message: 'user logged in successfully', token: token });
    } catch (error) {
        console.error(error);
        res.status(400).json({ error: error.message });
    }    
});

router.post('/add-recipes', authenticateCookie, async (req, res) => {
    const { userId, recipes } = req.body;

    if(req.user.id != userId) { 
        return res.status(401).json({ error: 'you can only update the recipes of your own account!'});
    }

    if(!userId || !recipes) {
        return res.status(400).json({ error: 'userId and recipe required to add a recipe!'});   
    }

    // make sure recipes is an array
    if (!Array.isArray(recipes)) {
        return res.status(400).json({ error: 'recipes must be an array!' });
    }
    
    try {
        const user = await addUserRecipes(userId, recipes );
        res.status(201).json({ message: 'user recipe added successfully', recipe: user.recipe });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;