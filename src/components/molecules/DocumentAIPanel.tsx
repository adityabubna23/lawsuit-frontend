import { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { documentAiApi } from "@/services/api"
import { Sparkles, FileText, MessageSquare, Loader2, ShieldCheck, AlertCircle, Copy, Check } from "lucide-react"

type ExtractionStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED" | null | undefined

interface DocumentAIPanelProps {
  caseId: string
  document: {
    id: string
    mimeType: string
    filename: string
    extractedText?: string | null
    extractionStatus?: ExtractionStatus
    summary?: string | null
  }
}

const SUPPORTED_MIME = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]

function isSupportedForExtraction(mime: string): boolean {
  return SUPPORTED_MIME.includes(mime) || mime.startsWith("image/")
}

const DocumentAIPanel = ({ caseId, document }: DocumentAIPanelProps) => {
  const queryClient = useQueryClient()
  const [question, setQuestion] = useState("")
  const [answer, setAnswer] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)

  const supported = isSupportedForExtraction(document.mimeType)
  const hasText = Boolean(document.extractedText && document.extractedText.length > 0)

  const invalidateDocs = () => {
    queryClient.invalidateQueries({ queryKey: ["case-documents", caseId] })
  }

  const extractMutation = useMutation({
    mutationFn: () => documentAiApi.extract(caseId, document.id),
    onSuccess: () => {
      setLocalError(null)
      invalidateDocs()
    },
    onError: (err: any) => {
      setLocalError(err?.response?.data?.error || err?.message || "Extraction failed")
    },
  })

  const summarizeMutation = useMutation({
    mutationFn: () => documentAiApi.summarize(caseId, document.id),
    onSuccess: () => {
      setLocalError(null)
      invalidateDocs()
    },
    onError: (err: any) => {
      setLocalError(err?.response?.data?.error || err?.message || "Summarization failed")
    },
  })

  const askMutation = useMutation({
    mutationFn: (q: string) => documentAiApi.ask(caseId, document.id, q),
    onSuccess: (res) => {
      setAnswer(res.data?.answer ?? "")
      setLocalError(null)
    },
    onError: (err: any) => {
      setLocalError(err?.response?.data?.error || err?.message || "Request failed")
    },
  })

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // ignore
    }
  }

  const handleAsk = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = question.trim()
    if (!trimmed) return
    setAnswer(null)
    askMutation.mutate(trimmed)
  }

  const summary = summarizeMutation.data?.data?.summary ?? document.summary ?? null
  const isProcessing = document.extractionStatus === "PROCESSING" || extractMutation.isPending

  if (!supported) {
    return (
      <div className="border border-gray-200 rounded-lg bg-white p-4">
        <div className="flex items-start gap-3 text-gray-600">
          <AlertCircle className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-gray-800">AI insights not available</p>
            <p className="text-xs text-gray-500 mt-1">
              Text extraction is supported for PDFs, Word documents, and images. This file type is not supported.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="border border-gray-200 rounded-lg bg-white overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-primary/5 to-transparent">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold text-gray-800">Document Intelligence</h3>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <ShieldCheck className="w-3.5 h-3.5 text-green-600" />
          <span>Confidential</span>
        </div>
      </div>

      {/* Actions */}
      <div className="p-4 space-y-4">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => extractMutation.mutate()}
            disabled={isProcessing}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md bg-primary text-white hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isProcessing ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <FileText className="w-3.5 h-3.5" />
            )}
            {hasText ? "Re-extract text" : "Extract text"}
          </button>

          <button
            onClick={() => summarizeMutation.mutate()}
            disabled={!hasText || summarizeMutation.isPending}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md border border-primary/30 text-primary bg-white hover:bg-primary/5 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title={!hasText ? "Extract text first" : undefined}
          >
            {summarizeMutation.isPending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5" />
            )}
            Summarize
          </button>
        </div>

        {/* Status / error */}
        {document.extractionStatus === "PROCESSING" && (
          <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Processing — this may take a moment for large documents.
          </div>
        )}
        {localError && (
          <div className="flex items-start gap-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
            <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
            <span>{localError}</span>
          </div>
        )}

        {/* Summary */}
        {summary && (
          <div className="border border-gray-200 rounded-md bg-gray-50">
            <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200">
              <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Summary</span>
              <button
                onClick={() => handleCopy(summary)}
                className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-primary transition-colors"
              >
                {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <div className="p-3 text-sm text-gray-800 whitespace-pre-wrap leading-relaxed max-h-48 overflow-auto">
              {summary}
            </div>
          </div>
        )}

        {/* Ask a question */}
        {hasText && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <MessageSquare className="w-3.5 h-3.5 text-gray-500" />
              <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                Ask about this document
              </span>
            </div>
            <form onSubmit={handleAsk} className="flex gap-2">
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="e.g. What are the key obligations?"
                className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                disabled={askMutation.isPending}
              />
              <button
                type="submit"
                disabled={!question.trim() || askMutation.isPending}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-md bg-primary text-white hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {askMutation.isPending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <MessageSquare className="w-3.5 h-3.5" />
                )}
                Ask
              </button>
            </form>

            {answer && (
              <div className="mt-3 border border-gray-200 rounded-md bg-white">
                <div className="px-3 py-2 border-b border-gray-200 text-xs font-semibold text-gray-700 uppercase tracking-wide">
                  Answer
                </div>
                <div className="p-3 text-sm text-gray-800 whitespace-pre-wrap leading-relaxed max-h-48 overflow-auto">
                  {answer}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Extracted text preview */}
        {hasText && (
          <details className="border border-gray-200 rounded-md">
            <summary className="cursor-pointer px-3 py-2 text-xs font-semibold text-gray-700 uppercase tracking-wide hover:bg-gray-50">
              View extracted text
            </summary>
            <div className="px-3 py-3 text-xs text-gray-700 whitespace-pre-wrap leading-relaxed max-h-60 overflow-auto border-t border-gray-200 bg-gray-50 font-mono">
              {document.extractedText}
            </div>
          </details>
        )}

        {!hasText && document.extractionStatus !== "PROCESSING" && !extractMutation.isPending && (
          <p className="text-xs text-gray-500 leading-relaxed">
            Click <span className="font-medium text-gray-700">Extract text</span> to let our AI read this document.
            You can then generate a summary or ask questions about its contents — processed securely and never shared
            outside your case.
          </p>
        )}
      </div>
    </div>
  )
}

export default DocumentAIPanel
