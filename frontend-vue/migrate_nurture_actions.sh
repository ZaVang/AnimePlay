#!/bin/bash

# Helper function to migrate a file
migrate_file() {
    local file=$1
    echo "Migrating $file..."
    
    # Backup
    cp "$file" "$file.backup"
    
    # 检查文件内容并决定需要导入哪些stores
    local needs_auth=$(grep -c "userStore\.addLog\|userStore\.isLoggedIn\|userStore\.currentUser\|userStore\.level\|userStore\.exp" "$file" || true)
    local needs_economy=$(grep -c "userStore\.playerState\.knowledgePoints\|userStore\.knowledgePoints" "$file" || true)
    local needs_nurture=$(grep -c "userStore\.getNurtureData\|userStore\.enhanceAttribute\|userStore\.increaseAffection\|userStore\.enhanceBattleStat\|userStore\.addCharacterExp" "$file" || true)
    
    # 构建导入语句
    local imports=""
    [[ $needs_auth -gt 0 ]] && imports+="import { useAuthStore } from '@/stores/modules/authStore';\n"
    [[ $needs_economy -gt 0 ]] && imports+="import { useEconomyStore } from '@/stores/modules/economyStore';\n"
    [[ $needs_nurture -gt 0 ]] && imports+="import { useNurtureStore } from '@/stores/modules/nurtureStore';\n"
    
    # 移除旧的userStore导入
    sed -i.tmp '/import.*useUserStore.*from.*@\/stores\/userStore/d' "$file"
    
    # 在<script setup lang="ts">后添加新导入
    if [[ -n "$imports" ]]; then
        awk -v imports="$imports" '
            /<script setup/ {
                print
                print imports
                next
            }
            { print }
        ' "$file.tmp" > "$file"
    else
        mv "$file.tmp" "$file"
    fi
    
    # 替换store实例声明
    [[ $needs_auth -gt 0 ]] && sed -i '' 's/const userStore = useUserStore();/const authStore = useAuthStore();/' "$file"
    [[ $needs_economy -gt 0 ]] && sed -i '' '/const authStore/a\
const economyStore = useEconomyStore();
' "$file"
    [[ $needs_nurture -gt 0 ]] && sed -i '' '/const economyStore/a\
const nurtureStore = useNurtureStore();
' "$file"
    
    # 替换具体调用
    sed -i '' '
        s/userStore\.addLog(/authStore.addLog(/g
        s/userStore\.playerState\.knowledgePoints/economyStore.knowledgePoints/g
        s/userStore\.knowledgePoints/economyStore.knowledgePoints/g
        s/userStore\.getNurtureData(/nurtureStore.getNurtureData(/g
        s/userStore\.enhanceAttribute(/nurtureStore.enhanceAttribute(/g
        s/userStore\.increaseAffection(/nurtureStore.increaseAffection(/g
        s/userStore\.enhanceBattleStat(/nurtureStore.enhanceBattleStat(/g
        s/userStore\.addCharacterExp(/nurtureStore.addCharacterExp(/g
    ' "$file"
    
    rm -f "$file.tmp"
    echo "✅ Migrated $file"
}

# 迁移所有文件
migrate_file "src/components/nurture/actions/BattleTraining.vue"
migrate_file "src/components/nurture/actions/ResourceDisplay.vue"
migrate_file "src/components/nurture/actions/TrainingSystem.vue"
migrate_file "src/components/nurture/actions/SpecialActivities.vue"
migrate_file "src/components/nurture/DialogueSystem.vue"
migrate_file "src/components/nurture/interactions/DeepInteractions.vue"
migrate_file "src/components/nurture/interactions/QuickInteractions.vue"

echo "🎉 All files migrated!"
