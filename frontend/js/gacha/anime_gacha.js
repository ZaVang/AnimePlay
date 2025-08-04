// frontend/js/gacha/anime_gacha.js
window.Game = window.Game || {};

// 动画抽卡系统 - 基于通用抽卡模块
Game.AnimeGacha = Game.GachaModule({
    type: 'anime',
    itemType: '动画',
    itemKey: 'anime',
    dataUrl: '/data/anime/all_cards.json',
    configKey: 'animeSystem',
    ticketType: 'animeGachaTickets',
    expReward: 'animeGachaEXP',
    playerMethods: {
        getCollection: () => Game.Player.getAnimeCollection(),
        getPityState: () => Game.Player.getAnimePityState(),
        getGachaHistory: () => Game.Player.getAnimeGachaHistory()
    },
    uiElements: Game.UI.elements.animeGacha,
    cardElementCreator: Game.UI.createAnimeCardElement,
    colors: {
        primary: 'indigo',
        secondary: 'pink'
    }
});

// 为了保持向后兼容性，添加一些别名方法
Object.assign(Game.AnimeGacha, {
    getAllAnimes: Game.AnimeGacha.getAllItems,
    setUpAnime: Game.AnimeGacha.setUpItems,
    getUpAnime: Game.AnimeGacha.getUpItems
});