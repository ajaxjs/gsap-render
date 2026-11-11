<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { demos } from '@/demo/demos'
import Badge from '@/demo/components/ui/badge/Badge.vue'

const snippet = `<div id="stage" timeline>
  <h1 from="{ opacity: 0, y: -48 }">Hello</h1>
  <div class="card"
       from="{ opacity: 0 }"
       to="{ opacity: 1, duration: 0.8 }"></div>
</div>

const gs = new GsapRender('#stage')
gs.play()`

const features = [
  {
    title: '声明式',
    body: '一个元素一个 step，读 HTML 就能看懂动效；顺序、嵌套、位置全部有明确规则。',
  },
  {
    title: '贴近原生',
    body: '属性值就是 GSAP 的 vars：duration、ease、stagger 原样透传，文档可以直接复用。',
  },
  {
    title: '插件适配',
    body: 'SplitText、ScrollTrigger 按适配器接入，核心不认识它们；接入方式和 gsap.registerPlugin 对称。',
  },
  {
    title: '可调试',
    body: 'W001–W016 警告码 + debug 开关 + window.__GSAP_RENDER_DEBUG__ 线上逃生开关。',
  },
]
</script>

<template>
  <div>
    <section class="relative overflow-hidden border-b border-border/60">
      <div class="grid-bg pointer-events-none absolute inset-0 opacity-60" />
      <div
        class="pointer-events-none absolute -top-40 left-1/2 size-[560px] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl"
      />

      <div class="relative mx-auto grid max-w-[1400px] gap-12 px-6 py-20 lg:grid-cols-[1.1fr_1fr] lg:py-28">
        <div class="flex flex-col items-start justify-center">
          <Badge class="mb-5">GSAP 3.15 · Vue 3 · 适配器架构</Badge>
          <h1 class="text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
            <span class="block whitespace-nowrap">用 HTML 属性</span>
            <span class="block whitespace-nowrap text-primary">写 GSAP 动画</span>
          </h1>
          <p class="mt-5 max-w-xl text-pretty text-base leading-7 text-muted-foreground">
            把 <code class="rounded bg-muted px-1.5 py-0.5 text-[13px] text-foreground">from</code>
            <code class="rounded bg-muted px-1.5 py-0.5 text-[13px] text-foreground">to</code>
            <code class="rounded bg-muted px-1.5 py-0.5 text-[13px] text-foreground">timeline</code>
            写在元素上，渲染器负责解析成 GSAP 时间轴。框架无关、纯数据、可调试。
          </p>

          <div class="mt-8 flex flex-wrap items-center gap-3">
            <RouterLink
              to="/demo/basic"
              class="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
            >
              打开演示 →
            </RouterLink>
            <a
              href="https://gsap.com/docs/v3/"
              target="_blank"
              rel="noreferrer"
              class="inline-flex h-9 items-center rounded-md border border-input px-4 text-sm font-medium transition-colors hover:bg-accent"
            >
              GSAP 文档
            </a>
          </div>

          <div class="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-xs text-muted-foreground">
            <span><span class="text-primary">●</span> 一个元素 = 一个 step</span>
            <span><span class="text-primary">●</span> 并行 / 串行显式可控</span>
            <span><span class="text-primary">●</span> from + to 自动合并 fromTo</span>
          </div>
        </div>

        <div class="relative">
          <div class="overflow-hidden rounded-xl border border-border/70 bg-card/70 shadow-2xl shadow-black/40 backdrop-blur">
            <div class="flex items-center gap-1.5 border-b border-border/60 px-4 py-2.5">
              <span class="size-2.5 rounded-full bg-[#ff5f57]" />
              <span class="size-2.5 rounded-full bg-[#febc2e]" />
              <span class="size-2.5 rounded-full bg-[#28c840]" />
              <span class="ml-3 text-[11px] text-muted-foreground">demo.html</span>
            </div>
            <pre class="overflow-x-auto p-5 text-[12.5px] leading-6 text-muted-foreground"><code>{{ snippet }}</code></pre>
          </div>
        </div>
      </div>
    </section>

    <section class="mx-auto max-w-[1400px] px-6 py-16">
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div
          v-for="feature in features"
          :key="feature.title"
          class="rounded-xl border border-border/60 bg-card/40 p-5 transition-colors hover:border-primary/40"
        >
          <h3 class="text-sm font-semibold">{{ feature.title }}</h3>
          <p class="mt-2 text-[13px] leading-6 text-muted-foreground">{{ feature.body }}</p>
        </div>
      </div>
    </section>

    <section class="mx-auto max-w-[1400px] px-6 pb-24">
      <div class="mb-6 flex items-end justify-between gap-4">
        <div>
          <h2 class="text-lg font-semibold tracking-tight">演示</h2>
          <p class="mt-1 text-sm text-muted-foreground">每个演示都可以直接改 HTML / CSS / JS，然后运行。</p>
        </div>
      </div>

      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <RouterLink
          v-for="demo in demos"
          :key="demo.id"
          :to="`/demo/${demo.id}`"
          class="group rounded-xl border border-border/60 bg-card/40 p-5 transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:bg-card/70"
        >
          <div class="flex items-center justify-between">
            <h3 class="text-sm font-semibold">{{ demo.title }}</h3>
            <span class="text-xs text-muted-foreground transition-transform group-hover:translate-x-0.5">→</span>
          </div>
          <p class="mt-2 line-clamp-2 text-[13px] leading-6 text-muted-foreground">{{ demo.description }}</p>
          <div class="mt-4 flex flex-wrap gap-1.5">
            <Badge v-for="tag in demo.tags" :key="tag" variant="muted">{{ tag }}</Badge>
          </div>
        </RouterLink>
      </div>
    </section>
  </div>
</template>
