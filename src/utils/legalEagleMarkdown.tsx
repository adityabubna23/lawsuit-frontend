import React from 'react'

// Shared markdown-ish renderer for Legal Eagle AI replies, so the full-page
// chat and the floating widget render identically (same fonts/colors/style).

export const renderInlineFormatting = (text: string): React.ReactNode => {
  const parts = text.split(/(`[^`]+`)/g)
  return parts.map((part, i) => {
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={i} className="px-1.5 py-0.5 bg-gray-100 text-primary text-sm rounded font-mono">
          {part.slice(1, -1)}
        </code>
      )
    }
    const boldParts = part.split(/(\*\*[^*]+\*\*)/g)
    return boldParts.map((bp, j) => {
      if (bp.startsWith('**') && bp.endsWith('**')) {
        return <strong key={`${i}-${j}`} className="font-semibold text-midnight">{bp.slice(2, -2)}</strong>
      }
      return bp
    })
  })
}

export const renderLegalEagleContent = (content: string, isUser: boolean) => {
  if (isUser) return <p className="whitespace-pre-wrap">{content}</p>

  const lines = content.split('\n')
  const elements: React.ReactNode[] = []
  let inCodeBlock = false
  let codeContent: string[] = []
  let codeLanguage = ''

  lines.forEach((line, index) => {
    if (line.startsWith('```')) {
      if (!inCodeBlock) {
        inCodeBlock = true
        codeLanguage = line.slice(3).trim()
        codeContent = []
      } else {
        elements.push(
          <div key={`code-${index}`} className="my-3 rounded-lg overflow-hidden border border-gray-200">
            {codeLanguage && (
              <div className="px-4 py-2 bg-midnight text-white text-xs font-medium">{codeLanguage}</div>
            )}
            <pre className="p-4 bg-gray-900 text-gray-100 text-sm overflow-x-auto">
              <code>{codeContent.join('\n')}</code>
            </pre>
          </div>,
        )
        inCodeBlock = false
        codeContent = []
        codeLanguage = ''
      }
      return
    }
    if (inCodeBlock) {
      codeContent.push(line)
      return
    }
    if (line.startsWith('### ')) {
      elements.push(<h3 key={index} className="text-lg font-semibold text-midnight mt-4 mb-2">{line.slice(4)}</h3>)
      return
    }
    if (line.startsWith('## ')) {
      elements.push(<h2 key={index} className="text-xl font-bold text-midnight mt-5 mb-2">{line.slice(3)}</h2>)
      return
    }
    if (line.startsWith('# ')) {
      elements.push(<h1 key={index} className="text-2xl font-bold text-midnight mt-6 mb-3">{line.slice(2)}</h1>)
      return
    }
    if (line.startsWith('- ') || line.startsWith('* ')) {
      elements.push(
        <li key={index} className="ml-4 mb-1 flex items-start gap-2">
          <span className="text-primary mt-1.5">•</span>
          <span>{renderInlineFormatting(line.slice(2))}</span>
        </li>,
      )
      return
    }
    const numberedMatch = line.match(/^(\d+)\.\s/)
    if (numberedMatch) {
      elements.push(
        <li key={index} className="ml-4 mb-1 flex items-start gap-2">
          <span className="text-primary font-medium min-w-[20px]">{numberedMatch[1]}.</span>
          <span>{renderInlineFormatting(line.slice(numberedMatch[0].length))}</span>
        </li>,
      )
      return
    }
    if (line.trim() === '') {
      elements.push(<div key={index} className="h-2" />)
      return
    }
    elements.push(<p key={index} className="mb-2 leading-relaxed">{renderInlineFormatting(line)}</p>)
  })

  return <div className="space-y-1">{elements}</div>
}

export default renderLegalEagleContent
