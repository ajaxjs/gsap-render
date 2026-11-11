<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { demos, findDemo } from '@/demo/demos'
import Badge from '@/demo/components/ui/badge/Badge.vue'
import Button from '@/demo/components/ui/button/Button.vue'
import CodeEditor from '@/demo/components/CodeEditor.vue'
import DemoFrame from '@/demo/components/DemoFrame.vue'
import Tabs from '@/demo/components/ui/tabs/Tabs.vue'
import TabsList from '@/demo/components/ui/tabs/TabsList.vue'
import TabsTrigger from '@/demo/components/ui/tabs/TabsTrigger.vue'
import type { EditorLanguage } from '@/demo/components/types'

const route = useRoute()
const demo = computed(() => findDemo(String(route.params.id)))

const tab = ref<EditorLanguage>('html')
const runId = ref(0)
const expanded = ref(false)
const files = reactive({ html: '', css: '', js: '' })

watch(
  () => demo.value?.id,
  () => {
    const current = demo.value
    if (!current) return
    files.html = current.files.html
    files.css = current.files.css
    files.js = current.files.js
    tab.value = 'html'
    expanded.value = !!current.fullPreview
    runId.value++
  },
  { immediate: true },
)

function run(): void {
  runId.value++
}

function reset(): void {
  const current = demo.value
  if (!current) return
  files.html = current.files.html
  files.css = current.files.css
  files.js = current.files.js
  runId.value++
}

function onEdit(value: string): void {
  files[tab.value] = value
}

function onKeydown(event: KeyboardEvent): void {
  if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
    event.preventDefault()
    run()
  }
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))
</script>

<template>
  <div v-if="!demo" class="mx-auto flex max-w-xl flex-col items-center gap-4 px-6 py-24 text-center">
    <h1 class="text-xl font-semibold">演示不存在</h1>
    <p class="text-sm text-muted-foreground">地址里的 id 没有对应的演示。</p>
    <RouterLink to="/" class="text-sm text-primary underline underline-offset-4">返回首页</RouterLink>
  </div>

  <div v-else class="mx-auto flex h-[calc(100vh-3.5rem)] w-full max-w-[1500px]">
    <aside class="hidden w-58 shrink-0 overflow-y-auto border-r border-border/60 p-3 lg:block">
      <p class="px-2 pb-2 pt-1 text-[10px] font-semibold tracking-[0.18em] text-muted-foreground">DEMOS</p>
      <RouterLink
        v-for="item in demos"
        :key="item.id"
        :to="`/demo/${item.id}`"
        class="mb-1 flex flex-col rounded-lg px-2.5 py-2 text-sm transition-colors hover:bg-accent"
        active-class="bg-accent text-foreground"
      >
        <span class="font-medium">{{ item.title }}</span>
        <span class="truncate text-[11px] text-muted-foreground">{{ item.tags.join(' · ') }}</span>
      </RouterLink>
    </aside>

    <div class="flex min-w-0 flex-1 flex-col">
      <div class="flex flex-wrap items-center gap-3 border-b border-border/60 px-4 py-2.5">
        <div class="min-w-0">
          <h1 class="flex items-center gap-2 truncate text-sm font-semibold">
            {{ demo.title }}
            <Badge variant="muted" class="hidden sm:inline-flex">/demo/{{ demo.id }}</Badge>
          </h1>
          <p class="truncate text-xs text-muted-foreground">{{ demo.description }}</p>
        </div>
        <div class="ml-auto flex items-center gap-2">
          <span class="hidden text-[11px] text-muted-foreground sm:inline">Ctrl/⌘ + Enter</span>
          <Button size="sm" variant="ghost" @click="expanded = !expanded">
            {{ expanded ? '收起预览' : '展开预览' }}
          </Button>
          <Button size="sm" variant="outline" @click="reset">重置</Button>
          <Button size="sm" @click="run">运行</Button>
        </div>
      </div>

      <div class="flex gap-1 overflow-x-auto border-b border-border/60 px-3 py-2 lg:hidden">
        <RouterLink
          v-for="item in demos"
          :key="item.id"
          :to="`/demo/${item.id}`"
          class="whitespace-nowrap rounded-md px-2.5 py-1 text-xs text-muted-foreground hover:bg-accent"
          active-class="bg-accent text-foreground"
        >
          {{ item.title }}
        </RouterLink>
      </div>

      <div
        class="grid min-h-0 flex-1 gap-3 p-3"
        :class="expanded ? 'grid-rows-[minmax(0,1fr)]' : 'grid-rows-[minmax(0,1.05fr)_minmax(0,0.95fr)]'"
      >
        <section class="min-h-0 overflow-hidden rounded-xl border border-border/60 bg-black/30">
          <DemoFrame :html="files.html" :css="files.css" :js="files.js" :run-id="runId" />
        </section>

        <section v-show="!expanded" class="flex min-h-0 flex-col overflow-hidden rounded-xl border border-border/60 bg-card/30">
          <div class="flex items-center gap-3 border-b border-border/60 px-3 py-2">
            <Tabs v-model="tab">
              <TabsList>
                <TabsTrigger value="html">HTML</TabsTrigger>
                <TabsTrigger value="css">CSS</TabsTrigger>
                <TabsTrigger value="js">JS</TabsTrigger>
              </TabsList>
            </Tabs>
            <span class="ml-auto hidden text-[11px] text-muted-foreground md:inline">
              改完点「运行」重新渲染 iframe
            </span>
          </div>
          <div class="min-h-0 flex-1">
            <CodeEditor :model-value="files[tab]" :language="tab" @update:model-value="onEdit" />
          </div>
        </section>
      </div>
    </div>
  </div>
</template>
