export interface DemoFiles {
  html: string
  css: string
  js: string
}

export interface Demo {
  id: string
  title: string
  description: string
  tags: string[]
  /** 打开时默认展开预览（滚动类 demo 用） */
  fullPreview?: boolean
  files: DemoFiles
}
