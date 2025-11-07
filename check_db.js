import Dexie from 'dexie';

const db = new Dexie('CocktailMenuDB');
db.version(5).stores({
  ingredients: '++id',
  ingredientMaster: '++id',
  recipes: '++id'
});

async function checkData() {
  const oldIngs = await db.ingredients.toArray();
  const newIngs = await db.ingredientMaster.toArray();
  const recipes = await db.recipes.toArray();
  
  console.log('=== 旧表 ingredients ===');
  console.log('数量:', oldIngs.length);
  oldIngs.slice(0, 3).forEach(ing => {
    console.log(`ID: ${ing.id}, Name: ${ing.name}`);
  });
  
  console.log('\n=== 新表 ingredientMaster ===');
  console.log('数量:', newIngs.length);
  newIngs.slice(0, 3).forEach(ing => {
    console.log(`ID: ${ing.id}, Name: ${ing.name}`);
  });
  
  console.log('\n=== 配方中使用的原料ID ===');
  if (recipes.length > 0) {
    const recipe = recipes[0];
    console.log(`配方: ${recipe.name}`);
    recipe.ingredients?.forEach(ing => {
      console.log(`  ingredientId: ${ing.ingredientId}`);
    });
  }
}

checkData().then(() => process.exit(0));
