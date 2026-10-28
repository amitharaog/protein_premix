---
description: What can I bake with what I have? Recipes plus exact grams per serving and per batch. Founder-only.
argument-hint: "<ingredients, comma-separated> | pantry  [servings N] [brownie|cake|cookie|mug cake] [vegan]"
---
Argument: $ARGUMENTS

1. If the argument is empty or `pantry`, use `data/formulation/pantry.csv`. If that file has no rows, ask the founder to list their ingredients and stop.
2. Launch `recipe-builder` with the ingredient list or pantry path, plus any servings, dessert type or vegan preference from the argument. If no servings are given, ask for 1 serving plus a 10-serving test batch.
3. Reply with the agent's top recipe in full: the gram table, liquid, method and checks. Name the others in one line each, and give the paths to the files it wrote.
