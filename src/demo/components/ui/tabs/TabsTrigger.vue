<script setup lang="ts">
import { TabsTrigger } from 'reka-ui'

defineProps<{ value: string }>()
</script>

<template>
  <TabsTrigger
    :value="value"
    class="inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium whitespace-nowrap transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
  >
    <slot />
  </TabsTrigger>
</template>
