import type { data as Es } from '../es/data';

/** English texts · zone «data». Must have exactly the same keys as ../es/data.ts. */
export const data: typeof Es = {
  auth: {
    noSession: 'There is no active session.',
    deleteAccountError: "We couldn't delete your account. Please try again.",
    saveError: 'Could not store the session securely on this device.',
    secureReadError: 'Error accessing secure credential storage.',
    hydrationError: 'Unexpected error accessing secure storage.',
    invalidCredentials: 'Invalid credentials',
    registerError: 'Error registering user',
    loginError: 'Error signing in',
    createAccountError: 'Error creating account',
  },
  network: {
    connectionError: 'Could not connect to the server. Check your internet connection or make sure the backend is running.',
    requestError: 'Error in the request to the server',
  },
  notifications: {
    channelName: 'Expiry alerts',
    channelDescription: 'Reminds you before a food item in your pantry expires.',
    testTitle: 'Test · Spinach expires in 2 days',
    testBody: 'This is how your expiry alerts will look. Tap it to open the Pantry.',
  },
  recipes: {
    loadError: 'Error loading recipes',
    favoriteError: 'Error updating favorite',
    prepareError: 'Error preparing the recipe',
    discardError: 'Error discarding the recipe',
    deleteSelectedError: 'Error deleting the selected recipes',
    generateAiError: 'Error generating recipes with AI',
  },
  scan: {
    noImage: 'No valid image was provided to analyze',
    notFood: 'This does not look like food. Try a photo of your fridge or pantry.',
    noClearFood: 'We did not detect clear food in this photo. Try better light or a closer shot.',
    noFood: 'No food was detected in the image.',
    analyzeError: 'Could not analyze the photo.',
  },
  inventory: {
    loadError: 'Error loading inventory',
    addError: 'Error adding the item',
    updateError: 'Error updating the item',
    deleteError: 'Error deleting the item',
    deleteManyError: 'Error deleting the items',
  },
};
