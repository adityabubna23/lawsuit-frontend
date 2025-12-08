import { FC, useEffect, useState } from 'react'
import { X, Download, ExternalLink } from 'lucide-react'

interface AgreementModalProps {
  url: string
  isOpen: boolean
  onClose: () => void
}

const AgreementModal: FC<AgreementModalProps> = ({ url, isOpen, onClose }) => {
  const [fileType, setFileType] = useState<'image' | 'pdf' | 'document' | 'unknown'>('unknown')

  useEffect(() => {
    if (url) {
      const extension = url.split('.').pop()?.toLowerCase().split('?')[0]
      
      if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(extension || '')) {
        setFileType('image')
      } else if (extension === 'pdf') {
        setFileType('pdf')
      } else if (['doc', 'docx', 'txt', 'rtf'].includes(extension || '')) {
        setFileType('document')
      } else {
        setFileType('unknown')
      }
    }
  }, [url])

  const handleDownload = () => {
    window.open(url, '_blank')
  }

  const handleOpenExternal = () => {
    window.open(url, '_blank')
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white w-full max-w-5xl max-h-[90vh] m-4 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-primary">Agreement Document</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              className="p-2 text-secondary hover:text-primary transition-colors"
              title="Download"
            >
              <Download className="w-5 h-5" />
            </button>
            <button
              onClick={handleOpenExternal}
              className="p-2 text-secondary hover:text-primary transition-colors"
              title="Open in new tab"
            >
              <ExternalLink className="w-5 h-5" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-secondary hover:text-primary transition-colors"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4 bg-gray-50">
          {fileType === 'image' && (
            <div className="flex items-center justify-center min-h-full">
              <img 
                src={url} 
                alt="Agreement" 
                className="max-w-full h-auto"
              />
            </div>
          )}

          {fileType === 'pdf' && (
            <iframe
              src={url}
              className="w-full h-full min-h-[600px] bg-white"
              title="PDF Agreement"
            />
          )}

          {fileType === 'document' && (
            <div className="bg-white p-8 border border-gray-200">
              <div className="text-center py-12">
                <p className="text-secondary mb-4">
                  This document format cannot be previewed directly.
                </p>
                <button
                  onClick={handleDownload}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white hover:bg-primary/90 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Download Document
                </button>
              </div>
            </div>
          )}

          {fileType === 'unknown' && (
            <div className="bg-white p-8 border border-gray-200">
              <div className="text-center py-12">
                <p className="text-secondary mb-4">
                  Unable to preview this file type.
                </p>
                <div className="flex items-center justify-center gap-4">
                  <button
                    onClick={handleDownload}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white hover:bg-primary/90 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    Download
                  </button>
                  <button
                    onClick={handleOpenExternal}
                    className="inline-flex items-center gap-2 px-6 py-3 border border-primary text-primary hover:bg-primary hover:text-white transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Open in New Tab
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default AgreementModal
