<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'

const props = defineProps<{ html: string; css: string; js: string; runId: number }>()

const playUrl = `${import.meta.env.BASE_URL}play.html`
const frame = ref<HTMLIFrameElement | null>(null)
let ready = false
let sentRunId = -1

function origin(): string {
  return window.location.origin
}

function post(): void {
  const win = frame.value?.contentWindow
  if (!win) return
  win.postMessage(
    { type: 'demo:run', payload: { html: props.html, css: props.css, js: props.js } },
    origin(),
  )
}

function send(): void {
  if (!ready) return
  if (sentRunId === props.runId) return
  sentRunId = props.runId
  post()
}

function onMessage(event: MessageEvent): void {
  if (event.origin !== origin()) return
  if (event.source !== frame.value?.contentWindow) return
  if ((event.data as { type?: string })?.type !== 'demo:ready') return
  ready = true
  send()
}

function onLoad(): void {
  ready = false
  sentRunId = -1
  frame.value?.contentWindow?.postMessage({ type: 'demo:ping' }, origin())
}

onMounted(() => window.addEventListener('message', onMessage))
onBeforeUnmount(() => window.removeEventListener('message', onMessage))
watch(() => props.runId, send)
</script>

<template>
  <iframe ref="frame" :src="playUrl" title="demo preview" class="h-full w-full border-0" @load="onLoad" />
</template>
