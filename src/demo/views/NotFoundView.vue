<script setup lang="ts">
import { RouterLink } from 'vue-router'
</script>

<template>
  <div class="mx-auto flex max-w-xl flex-col items-center gap-4 px-6 py-32 text-center">
    <p class="font-mono text-6xl font-semibold text-primary/40">404</p>
    <h1 class="text-xl font-semibold">页面不存在</h1>
    <p class="text-sm text-muted-foreground">检查一下地址，或者从演示列表重新进入。</p>
    <RouterLink
      to="/"
      class="mt-2 inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
    >
      返回首页
    </RouterLink>
  </div>
</template>
