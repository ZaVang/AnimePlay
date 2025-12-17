#!/bin/bash

# 迁移CharacterProfile.vue
sed -i.bak '
s/import { useUserStore } from .@\/stores\/userStore./import { useNurtureStore } from '\''@\/stores\/modules\/nurtureStore'\'';/
s/const userStore = useUserStore();/const nurtureStore = useNurtureStore();/
s/userStore\.getLevelProgress/nurtureStore.getLevelProgress/g
' src/components/nurture/CharacterProfile.vue

# 迁移CharacterSelector.vue
sed -i.bak '
s/import { useUserStore } from .@\/stores\/userStore./import { useCollectionStore } from '\''@\/stores\/modules\/collectionStore'\'';\nimport { useNurtureStore } from '\''@\/stores\/modules\/nurtureStore'\'';/
s/const userStore = useUserStore();/const collectionStore = useCollectionStore();\nconst nurtureStore = useNurtureStore();/
s/userStore\.characterCollection/collectionStore.characterCollection/g
s/userStore\.getNurtureData/nurtureStore.getNurtureData/g
' src/components/nurture/CharacterSelector.vue

echo "Migration complete!"
