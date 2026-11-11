<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { basicSetup } from 'codemirror'
import { EditorState } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import { html } from '@codemirror/lang-html'
import { css } from '@codemirror/lang-css'
import { javascript } from '@codemirror/lang-javascript'
import { oneDark } from '@codemirror/theme-one-dark'
import type { EditorLanguage } from './types'

const props = defineProps<{ modelValue: string; language: EditorLanguage }>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const host = ref<HTMLDivElement | null>(null)
let view: EditorView | null = null

const languageExtension = (language: EditorLanguage) =>
  language === 'html' ? html() : language === 'css' ? css() : javascript()

function create(): void {
  if (!host.value) return
  view = new EditorView({
    state: EditorState.create({
      doc: props.modelValue,
      extensions: [
        basicSetup,
        oneDark,
        languageExtension(props.language),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) emit('update:modelValue', update.state.doc.toString())
        }),
        EditorView.theme({
          '&': { height: '100%', backgroundColor: 'transparent' },
          '.cm-gutters': {
            backgroundColor: 'transparent',
            border: 'none',
            color: 'var(--muted-foreground)',
          },
          '.cm-activeLine': { backgroundColor: 'rgba(255,255,255,0.035)' },
          '.cm-activeLineGutter': { backgroundColor: 'transparent' },
          '.cm-content': { padding: '12px 0' },
        }),
      ],
    }),
    parent: host.value,
  })
}

onMounted(create)

watch(
  () => props.language,
  () => {
    view?.destroy()
    create()
  },
)

watch(
  () => props.modelValue,
  (value) => {
    if (!view) return
    const current = view.state.doc.toString()
    if (current === value) return
    view.dispatch({ changes: { from: 0, to: current.length, insert: value } })
  },
)

onBeforeUnmount(() => {
  view?.destroy()
  view = null
})
</script>

<template>
  <div ref="host" class="h-full min-h-0 overflow-hidden" />
</template>
