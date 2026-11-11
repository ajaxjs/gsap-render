<script setup lang="ts">
import { TabsList } from 'reka-ui'
</script>

<template>
  <TabsList
    class="inline-flex h-8 w-fit items-center justify-center rounded-lg bg-muted p-0.5 text-muted-foreground"
  >
    <slot />
  </TabsList>
</template>
