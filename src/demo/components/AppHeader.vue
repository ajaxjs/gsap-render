<script setup lang="ts">
import { RouterLink } from 'vue-router'
</script>

<template>
  <header class="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
    <div class="mx-auto flex h-14 max-w-[1400px] items-center gap-6 px-4 sm:px-6">
      <RouterLink to="/" class="group flex items-center gap-2">
        <span class="relative flex size-6 items-center justify-center rounded-md bg-primary/15 ring-1 ring-primary/40">
          <span class="size-2 rounded-full bg-primary transition-transform group-hover:scale-125" />
        </span>
        <span class="text-sm font-semibold tracking-tight">GSAP Render</span>
        <span class="hidden rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground sm:inline">
          v0.1
        </span>
      </RouterLink>

      <nav class="flex items-center gap-1 text-sm">
        <RouterLink
          to="/"
          class="rounded-md px-2.5 py-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          exact-active-class="text-foreground"
        >
          首页
        </RouterLink>
        <RouterLink
          to="/demo/basic"
          class="rounded-md px-2.5 py-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          active-class="text-foreground"
        >
          演示
        </RouterLink>
      </nav>

      <div class="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
        <a
          href="https://gsap.com/docs/v3/"
          target="_blank"
          rel="noreferrer"
          class="hidden rounded-md px-2 py-1 transition-colors hover:bg-accent hover:text-foreground sm:inline"
        >
          GSAP 文档 ↗
        </a>
        <span class="hidden items-center gap-1.5 rounded-full border border-border px-2 py-1 md:flex">
          <span class="size-1.5 rounded-full bg-primary" />
          debug 模式已关闭
        </span>
      </div>
    </div>
  </header>
</template>
