<script setup lang="ts">
import { cn } from '@/demo/lib/utils'

const props = withDefaults(defineProps<{ variant?: 'default' | 'outline' | 'muted' }>(), {
  variant: 'default',
})
</script>

<template>
  <span
    :class="
      cn(
        'inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium tracking-wide',
        props.variant === 'outline' && 'border-border text-muted-foreground',
        props.variant === 'muted' && 'border-transparent bg-muted text-muted-foreground',
        props.variant === 'default' && 'border-primary/30 bg-primary/10 text-primary',
      )
    "
  >
    <slot />
  </span>
</template>
