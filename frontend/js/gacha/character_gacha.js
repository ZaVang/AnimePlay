// frontend/js/gacha/character_gacha.js
window.Game = window.Game || {};

// 角色抽卡系统 - 基于通用抽卡模块
Game.CharacterGacha = Game.GachaModule({
    type: 'character',
    itemType: '角色',
    itemKey: 'character',
    dataUrl: '/data/characters/all_cards.json',
    configKey: 'characterSystem',
    ticketType: 'characterGachaTickets',
    expReward: 'characterGachaEXP',
    playerMethods: {
        getCollection: () => Game.Player.getCharacterCollection(),
        getPityState: () => Game.Player.getCharacterPityState(),
        getGachaHistory: () => Game.Player.getCharacterGachaHistory()
    },
    uiElements: Game.UI.elements.characterGacha,
    cardElementCreator: Game.UI.createCharacterCardElement,
    colors: {
        primary: 'pink',
        secondary: 'purple'
    }
});

// 为了保持向后兼容性，添加一些别名方法
Object.assign(Game.CharacterGacha, {
    getAllCharacters: Game.CharacterGacha.getAllItems,
    setUpCharacters: Game.CharacterGacha.setUpItems,
    getUpCharacters: Game.CharacterGacha.getUpItems
});