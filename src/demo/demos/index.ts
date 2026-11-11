import { basic } from './basic'
import { controlsDemo } from './controls'
import { inViewDemo } from './inview'
import { prefixDemo } from './prefix'
import { scrollDemo } from './scroll'
import { splitDemo } from './split'
import { staggerDemo } from './stagger'
import { timelineDemo } from './timeline'
import type { Demo } from './types'

export const demos: Demo[] = [
  basic,
  timelineDemo,
  splitDemo,
  scrollDemo,
  inViewDemo,
  staggerDemo,
  controlsDemo,
  prefixDemo,
]

export function findDemo(id: string): Demo | undefined {
  return demos.find((demo) => demo.id === id)
}

export type { Demo, DemoFiles } from './types'
