import { useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'

interface MarkdownEditorProps {
  value: string
  onChange: (value: string) => void
  rows?: number
}

interface ApplyResult {
  value: string
  selectionStart: number
  selectionEnd: number
}

type Tab = 'write' | 'preview'

export default function MarkdownEditor({ value, onChange, rows = 5 }: MarkdownEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [tab, setTab] = useState<Tab>('write')

  const run = (transform: (start: number, end: number) => ApplyResult) => {
    const el = textareaRef.current
    const start = el?.selectionStart ?? 0
    const end = el?.selectionEnd ?? 0
    const result = transform(start, end)
    onChange(result.value)
    requestAnimationFrame(() => {
      if (!el) return
      el.focus()
      el.setSelectionRange(result.selectionStart, result.selectionEnd)
    })
  }

  const wrapInline = (before: string, after: string, placeholder: string) =>
    run((start, end) => {
      const selected = value.slice(start, end)
      const insert = selected || placeholder
      return {
        value: value.slice(0, start) + before + insert + after + value.slice(end),
        selectionStart: start + before.length,
        selectionEnd: start + before.length + insert.length,
      }
    })

  const prefixLine = (prefix: string, placeholder: string) =>
    run((start, end) => {
      const selected = value.slice(start, end)
      const insert = selected || placeholder
      const inserted = insert
        .split('\n')
        .map((line) => `${prefix}${line}`)
        .join('\n')
      return {
        value: value.slice(0, start) + inserted + value.slice(end),
        selectionStart: start,
        selectionEnd: start + inserted.length,
      }
    })

  const insertCode = () =>
    run((start, end) => {
      const selected = value.slice(start, end)
      if (selected.includes('\n')) {
        const inserted = '```\n' + (selected || 'код') + '\n```'
        return {
          value: value.slice(0, start) + inserted + value.slice(end),
          selectionStart: start + '```\n'.length,
          selectionEnd: start + inserted.length - '\n```'.length,
        }
      }
      const insert = selected || 'код'
      return {
        value: value.slice(0, start) + '`' + insert + '`' + value.slice(end),
        selectionStart: start + 1,
        selectionEnd: start + 1 + insert.length,
      }
    })

  const insertLink = () =>
    run((start, end) => {
      const text = value.slice(start, end) || 'текст'
      const inserted = `[${text}](https://)`
      return {
        value: value.slice(0, start) + inserted + value.slice(end),
        selectionStart: start + 1 + text.length + 2,
        selectionEnd: start + 1 + text.length + 2 + 'https://'.length,
      }
    })

  const tools: Array<{ label: string; symbol: string; onClick: () => void }> = [
    { label: 'Заголовок', symbol: 'H1', onClick: () => prefixLine('### ', 'Заголовок') },
    { label: 'Жирный', symbol: 'B', onClick: () => wrapInline('**', '**', 'жирный текст') },
    { label: 'Курсив', symbol: 'I', onClick: () => wrapInline('*', '*', 'курсив') },
    {
      label: 'Зачёркнутый',
      symbol: 'S',
      onClick: () => wrapInline('~~', '~~', 'зачёркнутый текст'),
    },
    { label: 'Цитата', symbol: '»', onClick: () => prefixLine('> ', 'Цитата') },
    { label: 'Код', symbol: '</>', onClick: insertCode },
    { label: 'Ссылка', symbol: 'A→', onClick: insertLink },
    { label: 'Список', symbol: '•', onClick: () => prefixLine('- ', 'Пункт списка') },
    {
      label: 'Нумерованный список',
      symbol: '1.',
      onClick: () => prefixLine('1. ', 'Пункт списка'),
    },
  ]

  return (
    <div className="markdown-editor">
      <div className="markdown-editor__tabs" role="tablist">
        <button
          className="markdown-editor__tab"
          type="button"
          role="tab"
          aria-selected={tab === 'write'}
          onClick={() => setTab('write')}
        >
          Написать
        </button>
        <button
          className="markdown-editor__tab"
          type="button"
          role="tab"
          aria-selected={tab === 'preview'}
          onClick={() => setTab('preview')}
        >
          Предпросмотр
        </button>
      </div>

      {tab === 'write' ? (
        <>
          <div className="markdown-editor__toolbar" aria-label="Форматирование">
            {tools.map((tool) => (
              <button
                className="markdown-editor__tool"
                key={tool.label}
                type="button"
                aria-label={tool.label}
                title={tool.label}
                onClick={tool.onClick}
              >
                {tool.symbol}
              </button>
            ))}
          </div>
          <textarea
            className="markdown-editor__textarea"
            ref={textareaRef}
            rows={rows}
            value={value}
            aria-label="Описание"
            onChange={(e) => onChange(e.target.value)}
          />
        </>
      ) : (
        <div className="markdown-editor__preview markdown">
          {value.trim() ? (
            <ReactMarkdown>{value}</ReactMarkdown>
          ) : (
            <p className="markdown-editor__empty">Здесь появится предпросмотр описания</p>
          )}
        </div>
      )}
    </div>
  )
}