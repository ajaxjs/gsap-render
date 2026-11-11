<script setup lang="ts">
import { TabsRoot } from 'reka-ui'

defineOptions({ inheritAttrs: false })
</script>

<template>
  <TabsRoot v-bind="$attrs" class="flex min-h-0 flex-col gap-2">
    <slot />
  </TabsRoot>
</template>
