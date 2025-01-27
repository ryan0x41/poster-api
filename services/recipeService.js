const fs = require('fs').promises;
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

        // if the unit does not exist in the supported units
        if (!Ingredient.units[unit]) {
            throw new Error(`unsupported unit: ${unit}`);
        }

        this.quantity = quantity;
        this.unit = unit || "undefined";
        this.name = name;
        this.details = details;
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

        // we have to validate ingredients are instances of the Ingredient class
        if (!Array.isArray(ingredients) || !ingredients.every(ing => ing instanceof Ingredient)) {
            throw new Error("all ingredients must be instances of the Ingredient class.");
        }

        this.id = uuidv4(); // unique identification number for the recipe
        this.name = name;
        this.description = description;
        this.authors = Array.isArray(authors) ? authors : [authors]; // make sure authors is an array
        this.servingSize = servingSize;
        this.ingredients = ingredients;
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