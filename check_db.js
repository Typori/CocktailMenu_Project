import Dexie from 'dexie';

const db = new Dexie('CocktailMenuDB');
db.version(7).stores({
  ingredientMaster: '++id',
  recipes: '++id',
  venues: '++id',
  venueIngredients: '++id',
  venueRecipes: '++id'
});

async function checkData() {
  const ingredients = await db.ingredientMaster.toArray();
  const recipes = await db.recipes.toArray();
  const venues = await db.venues.toArray();
  const venueIngredients = await db.venueIngredients.toArray();
  
  console.log('=== 全局原料库 (ingredientMaster) ===');
  console.log('数量:', ingredients.length);
  ingredients.slice(0, 5).forEach(ing => {
    console.log(`ID: ${ing.id}, Name: ${ing.name}, Price: ¥${ing.price}, Quantity: ${ing.quantity}${ing.unit}`);
  });
  
  console.log('\n=== 配方库 (recipes) ===');
  console.log('数量:', recipes.length);
  recipes.slice(0, 3).forEach(recipe => {
    console.log(`ID: ${recipe.id}, Name: ${recipe.name}`);
    if (recipe.ingredients && recipe.ingredients.length > 0) {
      console.log('  使用的原料:');
      recipe.ingredients.forEach(ing => {
        console.log(`    - ingredientId: ${ing.ingredientId}, quantity: ${ing.quantity}${ing.unit}`);
      });
    }
  });
  
  console.log('\n=== 店面 (venues) ===');
  console.log('数量:', venues.length);
  venues.forEach(venue => {
    console.log(`ID: ${venue.id}, Name: ${venue.name}`);
  });
  
  console.log('\n=== 店面原料 (venueIngredients) ===');
  console.log('数量:', venueIngredients.length);
  venueIngredients.slice(0, 5).forEach(vi => {
    console.log(`VenueID: ${vi.venueId}, MasterID: ${vi.ingredientMasterId}, Stock: ${vi.currentStock}`);
  });
}

checkData().then(() => process.exit(0)).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
