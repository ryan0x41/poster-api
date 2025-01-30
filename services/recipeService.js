const fs = require('fs').promises;
const { connectDB } = require('./db')
// for creating unique user identification numbers
const { 
    v4: uuidv4,
} = require('uuid');

/*
    an ingredient must contain the following
    ----------------------------------------
        - a quantity                     (2)
        - a unit of measurement        (tsp)
        - a name                 (olive oil)

        and can optionally contain some
        - details           (finely chopped)

        using this  class we should be able 
        to  convert  easily  between  units 
        of  measurement  for  international 
        purposes
    ----------------------------------------
*/
class Ingredient {
    // conversion ratios to milliliters
    static units = {
        ml: 1,
        g: 1,
        l: 1000,
        tsp: 5,
        tbs: 15,
        oz: 28.41,
        cup: 250,
        pt: 568.26,
        qt: 1136.52
    };

    constructor({ quantity, unit, name, details = null }) {
        // make sure quantity, unit and name all exist
        if (quantity === undefined || name === undefined) {
            throw new Error("quantity and name are required fields for an ingredient");
        }

        // if the unit is supported or set as custom/undefined
        // e.g. a "pinch" of salt or 2 "cloves" of garlic
        this.isConvertible = Ingredient.units[unit] !== undefined;

        if (this.isConvertible) {
            this.quantityInMl = quantity * Ingredient.units[unit];
        } else {
            this.quantityInMl = null;
        }

        this.quantity = quantity;
        this.unit = unit || "undefined";
        this.name = name;
        this.details = details;
        this.ingredientId = uuidv4();
    }

    // converts the ingredient to a specific unit for human consumption
    toUnit(targetUnit) {
        if(!this.isConvertible) {
            return `${this.quantity} ${this.unit || ""} of ${this.name}${this.details ? ` (${this.details})` : ''}`.trim();
        }

        if (!Ingredient.units[targetUnit]) {
            throw new Error(`unsupported target unit: ${targetUnit}`);
        }

        const convertedQuantity = this.quantityInMl / Ingredient.units[targetUnit];
        return `${convertedQuantity.toFixed(2)} ${targetUnit} of ${this.name}${this.details ? ` (${this.details})` : ''}`;
    }

    // string representation of the ingredient in its original unit
    toString() {
        return `${this.quantity} ${this.unit || ""} of ${this.name}${this.details ? ` (${this.details})` : ''}`.trim();
    }
}

/*
    a recipe must contain the following
    -----------------------------------
        - a name
        - description
        - author(s)
        - serving size
        - ingredient(s)
        - method
    -----------------------------------
*/
class Recipe {
    constructor({ name, description, authors, servingSize, ingredients, method }) {
        if (!name || !description || !authors || !servingSize || !ingredients || !method) {
            throw new Error("all fields (name, description, authors, servingSize, ingredients, method) are required.");
        }

        this.ingredients = ingredients.map(ing => {
            if (ing instanceof Ingredient) {
                return ing;
            }
            return new Ingredient(ing);
        });

        this.recipeId = uuidv4(); // unique identification number for the recipe
        this.name = name;
        this.description = description;
        this.authors = Array.isArray(authors) ? authors : [authors]; // make sure authors is an array
        this.servingSize = servingSize;
        this.method = Array.isArray(method) ? method : [method]; // ensure method is an array (for each step)
    }

    // this will probably never be used but sure
    toString() {
        return `
        Recipe: ${this.name}
        Description: ${this.description}
        Author(s): ${this.authors.join(", ")}
        Serving Size: ${this.servingSize}
        Ingredients: ${this.ingredients.map(ing => ing.toString()).join("\n")}
        Method: ${this.method.join("\n")}
        `;
    }
}

async function createRecipe(recipe) {
    const db = await connectDB();
    const recipesCollection = db.collection('recipes'); 

    // check if recipe already exists in the database
    const existingRecipe = await recipesCollection.findOne(recipe);

    if(existingRecipe) {
        throw new Error('recipe already exists!');
    }

    await recipesCollection.insertOne(recipe);
    console.log(`recipe ${recipe.recipeId} created`);

    return { id: recipe.recipeId };
}

async function getAuthorRecipes(authorId) {
    const db = await connectDB();
    const recipesCollection = db.collection('recipes'); 
    
    const authorRecipes = await recipesCollection.find({ authors: { $in: [authorId] } }).toArray();

    return { authorRecipes: authorRecipes };
}

module.exports = { Ingredient, Recipe, createRecipe, getAuthorRecipes };