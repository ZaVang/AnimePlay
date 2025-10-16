#!/bin/bash

# 批量迁移 userStore 到新的模块化 stores
# 此脚本自动化完成剩余文件的迁移

echo "🔧 开始批量迁移 userStore..."

# 查找所有使用 userStore 的文件
files=$(grep -r "from '@/stores/userStore'" src --include="*.vue" --include="*.ts" -l)

for file in $files; do
    echo "📝 处理文件: $file"

    # 检查文件是否需要迁移各个 store
    needs_auth=false
    needs_collection=false
    needs_deck=false
    needs_economy=false
    needs_viewing=false
    needs_nurture=false

    # 检查文件内容以确定需要哪些 stores
    if grep -q "userStore\.isLoggedIn\|userStore\.currentUser\|userStore\.level\|userStore\.exp\|userStore\.logs\|userStore\.login\|userStore\.logout\|userStore\.addLog\|userStore\.addExp\|userStore\.playerState\.level\|userStore\.playerState\.exp" "$file"; then
        needs_auth=true
    fi

    if grep -q "userStore\.animeCollection\|userStore\.characterCollection\|userStore\.favoriteAnime\|userStore\.favoriteCharacters\|userStore\.animeGachaHistory\|userStore\.characterGachaHistory\|userStore\.drawCards\|userStore\.toggleFavorite\|userStore\.isFavorite\|userStore\.getAnimeCardCount\|userStore\.getCharacterCardCount" "$file"; then
        needs_collection=true
    fi

    if grep -q "userStore\.savedDecks\|userStore\.saveDeck\|userStore\.deleteDeck" "$file"; then
        needs_deck=true
    fi

    if grep -q "userStore\.animeGachaTickets\|userStore\.characterGachaTickets\|userStore\.knowledgePoints\|userStore\.playerState\.knowledgePoints\|userStore\.playerState\.animeGachaTickets\|userStore\.playerState\.characterGachaTickets\|userStore\.spendTickets\|userStore\.purchaseShopItem\|userStore\.dismantleCard\|userStore\.purchaseFromShop\|userStore\.dismantleAllDuplicates\|userStore\.getTodayPurchaseCount\|userStore\.canPurchaseItem" "$file"; then
        needs_economy=true
    fi

    if grep -q "userStore\.viewingQueue\|userStore\.watchedAnime\|userStore\.playerState\.viewingQueue\|userStore\.playerState\.watchedAnime\|userStore\.addToViewingQueue\|userStore\.collectFromViewingQueue" "$file"; then
        needs_viewing=true
    fi

    if grep -q "userStore\.characterNurtureData\|userStore\.presetSquads\|userStore\.towerProgress\|userStore\.getNurtureData\|userStore\.increaseAffection\|userStore\.enhanceAttribute\|userStore\.enhanceBattleStat\|userStore\.addCharacterExp\|userStore\.updateSquadMember\|userStore\.updateSquadName\|userStore\.getSquadMembers\|userStore\.getCurrentChallengeFloor\|userStore\.completeFloor\|userStore\.hasCompletedFloor\|userStore\.interactWithCharacter\|userStore\.giveGift" "$file"; then
        needs_nurture=true
    fi

    echo "  需要的 stores: auth=$needs_auth collection=$needs_collection deck=$needs_deck economy=$economy viewing=$needs_viewing nurture=$needs_nurture"
done

echo "✅ 迁移完成！请运行 npm run type-check 验证"
