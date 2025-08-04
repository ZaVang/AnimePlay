// frontend/js/app.js
// This is the main entry point of the application.
// It initializes all the other modules.

// Establish the global namespace for the game
window.Game = window.Game || {};

document.addEventListener('DOMContentLoaded', async () => {
    console.log("Application starting...");

    try {
        // Player.init must be first, but it no longer loads card data.
        await Game.Player.init();
        
        // Gacha systems load their own data and must complete before UI/Deck.
        await Game.AnimeGacha.init();
        if (Game.CharacterGacha) {
            await Game.CharacterGacha.init();
        }

        // Now that all data is loaded, initialize UI and other dependent modules.
        Game.UI.init();
        Game.Deck.init();
        
        if (Game.UnifiedCollection) {
            Game.UnifiedCollection.init(); // This will populate filters
        }
        
        Game.Battle.init();
        
        // Show login modal after everything is ready.
        Game.UI.showLoginModal();

        console.log("All modules initialized.");

    } catch (error) {
        console.error("A critical error occurred during initialization:", error);
        alert("应用初始化失败，请刷新页面重试。");
    }
});
