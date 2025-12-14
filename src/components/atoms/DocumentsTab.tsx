import { useState } from "react"
import { AddDocumentSchema } from "@/schema/case.schema"
import api, { apiEndpoints } from "@/services/api"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Plus, FileText, Image, File, Film, Music, X, Download, ExternalLink } from "lucide-react"
import UploadInput from "./UploadButton"
import Modal from "./Modal"

interface Document {
  id: string;
  mimeType: string;
  size: number;
  caseId: string | null;
  uploaderId: string;
  filename: string;
  url: string;
  version: number;
  uploadedAt: Date;
}

interface DocumentsQueryResponse {
  data: Document[]
}

const DocumentsTab = ({ caseId } : { caseId: string }) => {
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string>("")
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null)
  const queryClient = useQueryClient()

  const createDocumentMutation = useMutation({
    mutationFn: async (data: AddDocumentSchema) => {
      const res = await api.post(apiEndpoints.case.addDocument(caseId), data.body);
      return res.data;
    },
    onSuccess: () => {
      alert('Document added successfully');
      setIsUploadModalOpen(false);
      setImageUrl(null);
      setFileName("");
      queryClient.invalidateQueries({ queryKey: ['case-documents', caseId] });
    },
    onError: (error: any) => {
      alert('Error adding document: ' + error.message);
    }
  })

  const getDocumentQuery = useQuery({
    queryKey: ['case-documents', caseId],
    queryFn: async () => {
      const res = await api.get<DocumentsQueryResponse>(apiEndpoints.case.getDocuments(caseId));
      return res.data;
    }
  })

  const handleUploadDocument = () => {
    if (!imageUrl) {
      alert('Please upload a file first');
      return;
    }
    
    // Extract filename from URL if not set
    const extractedFileName = fileName || imageUrl.split('/').pop() || 'document';
    
    // Detect mime type from file extension
    const extension = extractedFileName.split('.').pop()?.toLowerCase() || '';
    const mimeTypeMap: Record<string, string> = {
      'pdf': 'application/pdf',
      'doc': 'application/msword',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'webp': 'image/webp',
      'svg': 'image/svg+xml',
      'mp4': 'video/mp4',
      'mp3': 'audio/mpeg',
      'txt': 'text/plain',
    };
    const mimeType = mimeTypeMap[extension] || 'application/octet-stream';

    createDocumentMutation.mutate({
      body: {
        fileurl: imageUrl,
        fileName: extractedFileName,
        mimeType: mimeType,
      }
    });
  }

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) {
      return <Image className="w-12 h-12 text-blue-500" />;
    }
    if (mimeType.startsWith('video/')) {
      return <Film className="w-12 h-12 text-purple-500" />;
    }
    if (mimeType.startsWith('audio/')) {
      return <Music className="w-12 h-12 text-green-500" />;
    }
    if (mimeType === 'application/pdf') {
      return <FileText className="w-12 h-12 text-red-500" />;
    }
    if (mimeType.includes('document') || mimeType.includes('word')) {
      return <FileText className="w-12 h-12 text-blue-600" />;
    }
    return <File className="w-12 h-12 text-gray-500" />;
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
  }

  const getFilePreviewType = (mimeType: string): 'image' | 'pdf' | 'video' | 'other' => {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType === 'application/pdf') return 'pdf';
    if (mimeType.startsWith('video/')) return 'video';
    return 'other';
  }

  const documents = getDocumentQuery.data?.data || [];

  return (
    <div className="p-4">
      {/* Header with Upload Button */}
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold text-gray-800">Documents</h3>
        <button
          onClick={() => setIsUploadModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Upload Document
        </button>
      </div>

      {/* Documents Grid - Google Drive Style */}
      {getDocumentQuery.isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : documents.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <File className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <p>No documents uploaded yet</p>
          <p className="text-sm">Click the upload button to add documents</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {documents.map((doc) => (
            <div
              key={doc.id}
              onClick={() => setSelectedDocument(doc)}
              className="flex flex-col items-center p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md hover:border-primary/50 cursor-pointer transition-all group"
            >
              {/* Thumbnail or Icon */}
              <div className="w-full h-24 flex items-center justify-center mb-3 bg-gray-50 rounded-lg overflow-hidden">
                {doc.mimeType.startsWith('image/') ? (
                  <img 
                    src={doc.url} 
                    alt={doc.filename} 
                    className="max-w-full max-h-full object-contain"
                  />
                ) : (
                  getFileIcon(doc.mimeType)
                )}
              </div>
              {/* File Name */}
              <p className="text-sm font-medium text-gray-800 text-center truncate w-full" title={doc.filename}>
                {doc.filename}
              </p>
              {/* File Size */}
              <p className="text-xs text-gray-500 mt-1">
                {formatFileSize(doc.size)}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Upload Modal */}
      <Modal open={isUploadModalOpen}>
        <div className="w-[500px] max-w-[90vw]">
          {/* Modal Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-800">Upload Document</h2>
            <button
              onClick={() => {
                setIsUploadModalOpen(false);
                setImageUrl(null);
                setFileName("");
              }}
              className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          {/* Modal Content */}
          <div className="p-4">
            <UploadInput 
              imageUrl={imageUrl} 
              setImageUrl={(url) => {
                if (typeof url === 'function') {
                  setImageUrl(url);
                } else {
                  setImageUrl(url);
                  // Extract filename from URL
                  if (url) {
                    const urlFileName = decodeURIComponent(url.split('/').pop()?.split('?')[0] || '');
                    setFileName(urlFileName);
                  }
                }
              }} 
              width="full" 
            />
          </div>
          
          {/* Modal Footer */}
          <div className="flex justify-end gap-3 p-4 border-t border-gray-200">
            <button
              onClick={() => {
                setIsUploadModalOpen(false);
                setImageUrl(null);
                setFileName("");
              }}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleUploadDocument}
              disabled={!imageUrl || createDocumentMutation.isPending}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {createDocumentMutation.isPending ? 'Saving...' : 'Save Document'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Document Preview Modal */}
      {selectedDocument && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/50"
            onClick={() => setSelectedDocument(null)}
          />
          
          {/* Modal */}
          <div className="relative bg-white w-full max-w-5xl max-h-[90vh] m-4 flex flex-col rounded-lg overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-800 truncate">{selectedDocument.filename}</h2>
              <div className="flex items-center gap-2">
                <a
                  href={selectedDocument.url}
                  download={selectedDocument.filename}
                  className="p-2 text-gray-500 hover:text-primary transition-colors"
                  title="Download"
                >
                  <Download className="w-5 h-5" />
                </a>
                <a
                  href={selectedDocument.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 text-gray-500 hover:text-primary transition-colors"
                  title="Open in new tab"
                >
                  <ExternalLink className="w-5 h-5" />
                </a>
                <button
                  onClick={() => setSelectedDocument(null)}
                  className="p-2 text-gray-500 hover:text-primary transition-colors"
                  title="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-4 bg-gray-50">
              {getFilePreviewType(selectedDocument.mimeType) === 'image' && (
                <div className="flex items-center justify-center min-h-[400px]">
                  <img 
                    src={selectedDocument.url} 
                    alt={selectedDocument.filename} 
                    className="max-w-full h-auto"
                  />
                </div>
              )}

              {getFilePreviewType(selectedDocument.mimeType) === 'pdf' && (
                <iframe
                  src={selectedDocument.url}
                  className="w-full h-full min-h-[600px] bg-white"
                  title={selectedDocument.filename}
                />
              )}

              {getFilePreviewType(selectedDocument.mimeType) === 'video' && (
                <div className="flex items-center justify-center min-h-[400px]">
                  <video 
                    src={selectedDocument.url} 
                    controls 
                    className="max-w-full max-h-[70vh]"
                  />
                </div>
              )}

              {getFilePreviewType(selectedDocument.mimeType) === 'other' && (
                <div className="bg-white p-8 border border-gray-200 rounded-lg">
                  <div className="text-center py-12">
                    {getFileIcon(selectedDocument.mimeType)}
                    <p className="text-gray-500 mt-4 mb-4">
                      This file type cannot be previewed directly.
                    </p>
                    <a
                      href={selectedDocument.url}
                      download={selectedDocument.filename}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      Download Document
                    </a>
                  </div>
                </div>
              )}
            </div>

            {/* Footer with file info */}
            <div className="px-4 py-3 border-t border-gray-200 bg-gray-50 text-sm text-gray-500">
              <span>{formatFileSize(selectedDocument.size)}</span>
              <span className="mx-2">•</span>
              <span>{new Date(selectedDocument.uploadedAt).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default DocumentsTab
