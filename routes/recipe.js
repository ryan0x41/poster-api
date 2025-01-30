const express = require('express');
const router = express.Router();
const { Recipe, createRecipe, getAuthorRecipes } = require('../services/recipeService');
const authenticateCookie = require('../middleware/authenticateCookie');

router.post('/create', authenticateCookie, async (req, res) => {
    try {
        const recipe = new Recipe(req.body);

        if(recipe.authors.length != 1) {
            throw new Error('there must be only one author when creating a recipe!');
        }

        if(recipe.authors[0] !== req.user.id) {
            throw new Error('you can only create a recipe for yourself!');
        }

        const recipeId = await createRecipe(recipe);

        res.status(201).json(recipeId);
    } catch (error) {
        console.error("error creating recipe:", error.message);
        res.status(400).json({ error: error.message });
    }
});

router.get('/author/:authorId', async (req, res) => {
    try {
        const { authorId } = req.params;
        const recipes = await getAuthorRecipes(authorId);

        res.status(200).json(recipes);
    } catch (error) {
        console.error("error finding author recipes:", error.message);
        res.status(400).json({ error: error.message });
    }
});

module.exports = router; 