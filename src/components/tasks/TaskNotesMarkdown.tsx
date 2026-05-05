'use client'

import { useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands'
import { markdown, markdownLanguage } from '@codemirror/lang-markdown'
import { syntaxTree } from '@codemirror/language'
import { EditorState } from '@codemirror/state'
import {
  Decoration,
  EditorView,
  ViewPlugin,
  WidgetType,
  keymap,
  type DecorationSet,
  type ViewUpdate,
} from '@codemirror/view'
import { messages } from '@/lib/messages'
import { updateTaskField } from '@/actions/tasks'

type SyntaxNode = ReturnType<ReturnType<typeof syntaxTree>['resolveInner']>

interface TaskNotesMarkdownProps {
  taskId: string | null
  notes: string | null
  onNotesChange: (nextNotes: string) => void
}

const LEAF_BLOCK_NODE_NAMES = new Set([
  'ATXHeading1',
  'ATXHeading2',
  'ATXHeading3',
  'ATXHeading4',
  'ATXHeading5',
  'ATXHeading6',
  'SetextHeading1',
  'SetextHeading2',
  'Paragraph',
  'ListItem',
  'Task',
  'CodeBlock',
  'FencedCode',
  'Blockquote',
  'HorizontalRule',
])

const HEADING_LINE_CLASS: Record<string, string> = {
  ATXHeading1: 'cm-md-h1',
  ATXHeading2: 'cm-md-h2',
  ATXHeading3: 'cm-md-h3',
  ATXHeading4: 'cm-md-h4',
  ATXHeading5: 'cm-md-h5',
  ATXHeading6: 'cm-md-h6',
}

const INLINE_MARK_NODE_NAMES = new Set([
  'EmphasisMark',
  'CodeMark',
  'StrikethroughMark',
])

const TASK_PREFIX_RE = /^([ \t]*)([-*+])\s\[([ xX])\]\s/
const BULLET_PREFIX_RE = /^([ \t]*)([-*+])\s/

class BulletWidget extends WidgetType {
  toDOM(): HTMLElement {
    const span = document.createElement('span')
    span.className = 'cm-md-bullet'
    span.textContent = '•'
    return span
  }

  eq(): boolean {
    return true
  }

  ignoreEvent(): boolean {
    return false
  }
}

class TaskCheckboxWidget extends WidgetType {
  constructor(
    private readonly checked: boolean,
    private readonly from: number,
    private readonly to: number
  ) {
    super()
  }

  toDOM(view: EditorView): HTMLElement {
    const wrapper = document.createElement('span')
    wrapper.className = 'cm-md-task-checkbox'

    const checkbox = document.createElement('input')
    checkbox.type = 'checkbox'
    checkbox.checked = this.checked
    checkbox.setAttribute('aria-label', this.checked ? 'Uncheck task item' : 'Check task item')

    checkbox.addEventListener('mousedown', (event) => {
      event.preventDefault()
    })
    checkbox.addEventListener('change', () => {
      const replacement = this.checked ? '- [ ] ' : '- [x] '
      view.dispatch({
        changes: { from: this.from, to: this.to, insert: replacement },
      })
    })

    wrapper.appendChild(checkbox)
    return wrapper
  }

  eq(other: TaskCheckboxWidget): boolean {
    return other.checked === this.checked && other.from === this.from && other.to === this.to
  }

  ignoreEvent(): boolean {
    return false
  }
}

function findActiveBlock(view: EditorView): { from: number; to: number } | null {
  if (!view.hasFocus) {
    return null
  }
  const cursor = view.state.selection.main.head
  const line = view.state.doc.lineAt(cursor)
  const tree = syntaxTree(view.state)
  let node: SyntaxNode | null = tree.resolveInner(line.from, 1)

  while (node !== null && node.parent !== null) {
    if (LEAF_BLOCK_NODE_NAMES.has(node.type.name)) {
      if (node.type.name === 'Paragraph') {
        let parent: SyntaxNode | null = node.parent
        while (parent !== null) {
          if (parent.type.name === 'ListItem') {
            return { from: parent.from, to: parent.to }
          }
          if (parent.type.name === 'Document') {
            break
          }
          parent = parent.parent
        }
      }
      return { from: node.from, to: node.to }
    }
    node = node.parent
  }
  return null
}

function buildDecorations(view: EditorView): DecorationSet {
  const activeBlock = findActiveBlock(view)
  const tree = syntaxTree(view.state)
  const decorations: Array<{ from: number; to: number; deco: Decoration }> = []

  function isInsideActiveBlock(from: number, to: number): boolean {
    if (activeBlock === null) {
      return false
    }
    return from >= activeBlock.from && to <= activeBlock.to
  }

  for (const visible of view.visibleRanges) {
    tree.iterate({
      from: visible.from,
      to: visible.to,
      enter: (node) => {
        const { from: nodeFrom, to: nodeTo, name } = node

        const headingClass = HEADING_LINE_CLASS[name]
        if (headingClass !== undefined) {
          const line = view.state.doc.lineAt(nodeFrom)
          decorations.push({
            from: line.from,
            to: line.from,
            deco: Decoration.line({ class: headingClass }),
          })
        }

        if (name === 'ListItem') {
          if (isInsideActiveBlock(nodeFrom, nodeTo)) {
            return
          }

          const itemLine = view.state.doc.lineAt(nodeFrom)
          const lineText = view.state.doc.sliceString(itemLine.from, itemLine.to)

          const taskMatch = lineText.match(TASK_PREFIX_RE)
          if (taskMatch) {
            const checked = /[xX]/.test(taskMatch[3] ?? '')
            const replaceFrom = itemLine.from + (taskMatch[1]?.length ?? 0)
            const replaceTo = itemLine.from + taskMatch[0].length
            decorations.push({
              from: replaceFrom,
              to: replaceTo,
              deco: Decoration.replace({
                widget: new TaskCheckboxWidget(checked, replaceFrom, replaceTo),
              }),
            })
            return false
          }

          const bulletMatch = lineText.match(BULLET_PREFIX_RE)
          if (bulletMatch) {
            const replaceFrom = itemLine.from + (bulletMatch[1]?.length ?? 0)
            const replaceTo = itemLine.from + bulletMatch[0].length
            decorations.push({
              from: replaceFrom,
              to: replaceTo,
              deco: Decoration.replace({ widget: new BulletWidget() }),
            })
          }
          return
        }

        if (isInsideActiveBlock(nodeFrom, nodeTo)) {
          return
        }

        if (name === 'HeaderMark') {
          const after = Math.min(view.state.doc.length, nodeTo + 1)
          decorations.push({
            from: nodeFrom,
            to: after,
            deco: Decoration.replace({}),
          })
          return
        }

        if (name === 'QuoteMark') {
          const after = Math.min(view.state.doc.length, nodeTo + 1)
          decorations.push({
            from: nodeFrom,
            to: after,
            deco: Decoration.replace({}),
          })
          return
        }

        if (INLINE_MARK_NODE_NAMES.has(name)) {
          decorations.push({
            from: nodeFrom,
            to: nodeTo,
            deco: Decoration.replace({}),
          })
          return
        }

        if (name === 'StrongEmphasis') {
          decorations.push({
            from: nodeFrom,
            to: nodeTo,
            deco: Decoration.mark({ tagName: 'strong' }),
          })
          return
        }

        if (name === 'Emphasis') {
          decorations.push({
            from: nodeFrom,
            to: nodeTo,
            deco: Decoration.mark({ tagName: 'em' }),
          })
          return
        }

        if (name === 'Strikethrough') {
          decorations.push({
            from: nodeFrom,
            to: nodeTo,
            deco: Decoration.mark({ tagName: 's' }),
          })
          return
        }

        if (name === 'InlineCode') {
          decorations.push({
            from: nodeFrom,
            to: nodeTo,
            deco: Decoration.mark({ class: 'cm-md-inline-code' }),
          })
          return
        }

        return
      },
    })
  }

  const ranges = decorations
    .slice()
    .sort((a, b) => a.from - b.from || a.to - b.to)
    .map(({ from, to, deco }) => deco.range(from, to))

  return Decoration.set(ranges, true)
}

const livePreviewPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet

    constructor(view: EditorView) {
      this.decorations = buildDecorations(view)
    }

    update(update: ViewUpdate): void {
      if (
        update.docChanged ||
        update.selectionSet ||
        update.viewportChanged ||
        update.focusChanged
      ) {
        this.decorations = buildDecorations(update.view)
      }
    }
  },
  {
    decorations: (plugin) => plugin.decorations,
  }
)

const editorTheme = EditorView.theme({
  '&': {
    fontFamily: 'var(--font-inter), system-ui, sans-serif',
    fontSize: '15px',
    lineHeight: '1.7',
    color: 'var(--foreground)',
    backgroundColor: 'transparent',
  },
  '&.cm-focused': {
    outline: 'none',
  },
  '.cm-scroller': {
    fontFamily: 'inherit',
    lineHeight: 'inherit',
  },
  '.cm-content': {
    padding: '14px 18px',
    caretColor: 'var(--foreground)',
    minHeight: '200px',
  },
  '.cm-line': {
    padding: '3px 0',
  },
  '.cm-md-h1': {
    fontSize: '26px',
    fontWeight: '700',
    lineHeight: '1.3',
    letterSpacing: '-0.01em',
    textDecoration: 'none',
    marginTop: '4px',
    marginBottom: '2px',
  },
  '.cm-md-h2': {
    fontSize: '22px',
    fontWeight: '700',
    lineHeight: '1.3',
    letterSpacing: '-0.005em',
    textDecoration: 'none',
    marginTop: '4px',
    marginBottom: '2px',
  },
  '.cm-md-h3': {
    fontSize: '18px',
    fontWeight: '600',
    lineHeight: '1.4',
    textDecoration: 'none',
    marginTop: '2px',
  },
  '.cm-md-h4': {
    fontSize: '16px',
    fontWeight: '600',
    lineHeight: '1.5',
    textDecoration: 'none',
  },
  '.cm-md-h5': {
    fontSize: '15px',
    fontWeight: '600',
    lineHeight: '1.5',
    textDecoration: 'none',
  },
  '.cm-md-h6': {
    fontSize: '15px',
    fontWeight: '600',
    color: 'var(--muted-foreground)',
    lineHeight: '1.5',
    textDecoration: 'none',
  },
  '.cm-md-inline-code': {
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
    fontSize: '0.9em',
    padding: '0 5px',
    borderRadius: '4px',
    backgroundColor: 'color-mix(in srgb, var(--muted) 70%, transparent)',
  },
  '.cm-md-bullet': {
    display: 'inline-block',
    width: '1em',
    marginRight: '6px',
    color: 'var(--muted-foreground)',
    textAlign: 'center',
  },
  '.cm-md-task-checkbox': {
    display: 'inline-flex',
    alignItems: 'center',
    marginRight: '8px',
    verticalAlign: 'middle',
  },
  '.cm-md-task-checkbox input': {
    width: '15px',
    height: '15px',
    accentColor: 'var(--primary)',
    cursor: 'pointer',
  },
})

export function TaskNotesMarkdown({ taskId, notes, onNotesChange }: TaskNotesMarkdownProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const viewRef = useRef<EditorView | null>(null)
  const lastMarkdownRef = useRef(notes ?? '')
  const onNotesChangeRef = useRef(onNotesChange)
  const taskIdRef = useRef<string | null>(taskId)
  const persistTimerRef = useRef<number | null>(null)

  useEffect(() => {
    onNotesChangeRef.current = onNotesChange
  }, [onNotesChange])

  useEffect(() => {
    taskIdRef.current = taskId
  }, [taskId])

  useEffect(() => {
    const container = containerRef.current
    if (container === null) {
      return
    }

    const initialDoc = notes ?? ''
    lastMarkdownRef.current = initialDoc

    const persistDebounced = () => {
      const currentTaskId = taskIdRef.current
      if (currentTaskId === null) {
        return
      }
      if (persistTimerRef.current !== null) {
        window.clearTimeout(persistTimerRef.current)
      }
      persistTimerRef.current = window.setTimeout(async () => {
        persistTimerRef.current = null
        try {
          await updateTaskField(currentTaskId, 'notes', lastMarkdownRef.current)
        } catch {
          toast.error('Failed to update notes')
        }
      }, 600)
    }

    const view = new EditorView({
      parent: container,
      state: EditorState.create({
        doc: initialDoc,
        extensions: [
          history(),
          keymap.of([...defaultKeymap, ...historyKeymap]),
          markdown({ base: markdownLanguage }),
          EditorView.lineWrapping,
          editorTheme,
          livePreviewPlugin,
          EditorView.updateListener.of((update) => {
            if (!update.docChanged) {
              return
            }
            const next = update.state.doc.toString()
            lastMarkdownRef.current = next
            onNotesChangeRef.current(next)
            persistDebounced()
          }),
        ],
      }),
    })

    viewRef.current = view

    return () => {
      if (persistTimerRef.current !== null) {
        window.clearTimeout(persistTimerRef.current)
        persistTimerRef.current = null

        const flushTaskId = taskIdRef.current
        if (flushTaskId !== null) {
          void updateTaskField(flushTaskId, 'notes', lastMarkdownRef.current).catch(() => {
            toast.error('Failed to update notes')
          })
        }
      }

      view.destroy()
      viewRef.current = null
    }
  }, [taskId])

  return (
    <section className="space-y-2">
      <p className="text-xs text-muted-foreground">{messages.taskDetail.notes}</p>
      <div
        ref={containerRef}
        className="task-notes-editor min-h-[220px] cursor-text rounded-md border border-border/60 bg-card/80 backdrop-blur-sm"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) {
            event.preventDefault()
            viewRef.current?.focus()
          }
        }}
      />
    </section>
  )
}
