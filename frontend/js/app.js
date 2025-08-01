// frontend/js/app.js
// This is the main entry point of the application.
// It initializes all the other modules.

// Establish the global namespace for the game
window.Game = window.Game || {};

document.addEventListener('DOMContentLoaded', async () => {
    console.log("Application starting...");

    try {
        // Player.init is async and fetches core data. 
        // It must complete before other modules can safely initialize.
        await Game.Player.init();

        // Now that player data (like allCards) is loaded, init other modules.
        Game.UI.init();
        Game.UI.populateFilters(); // Populate filters now that cards are loaded
        Game.AnimeGacha.init();
        
        // Initialize character system modules
        if (Game.CharacterGacha) {
            await Game.CharacterGacha.init();
        }
        
        // Initialize unified collection module only
        if (Game.UnifiedCollection) {
            Game.UnifiedCollection.init();
        }
        
        Game.Deck.init();
        Game.Battle.init();
        
        // Show login modal after everything is ready.
        Game.UI.elements.loginModal.classList.remove('hidden');

        console.log("All modules initialized.");

    } catch (error) {
        console.error("A critical error occurred during initialization:", error);
        alert("应用初始化失败，请刷新页面重试。");
    }
}); 