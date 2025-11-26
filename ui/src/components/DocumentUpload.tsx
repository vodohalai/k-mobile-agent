import { useState, useEffect } from 'react';
import { Upload, FileText, Trash2, RefreshCw } from 'lucide-react';

interface Document {
    id: string;
    name: string;
    size: number;
    uploadedAt: string;
}

export const DocumentUpload: React.FC = () => {
    const [documents, setDocuments] = useState<Document[]>([]);
    const [uploading, setUploading] = useState(false);
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [uploadProgress, setUploadProgress] = useState('');

    const fetchDocuments = async () => {
        try {
            const res = await fetch('/api/admin/documents');
            const data = await res.json();
            setDocuments(data);
        } catch (error) {
            console.error('Failed to fetch documents', error);
        }
    };

    useEffect(() => {
        fetchDocuments();
    }, []);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        setSelectedFiles(prev => [...prev, ...Array.from(e.target.files!)]);
        e.target.value = '';
    };

    const handleRemoveSelectedFile = (index: number) => {
        setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    };

    const handleUploadFiles = async () => {
        if (selectedFiles.length === 0) return;

        setUploading(true);
        let successCount = 0;

        for (let i = 0; i < selectedFiles.length; i++) {
            const file = selectedFiles[i];
            setUploadProgress(`Uploading ${i + 1}/${selectedFiles.length}: ${file.name}...`);

            const formData = new FormData();
            formData.append('file', file);

            try {
                await fetch('/api/admin/documents', {
                    method: 'POST',
                    body: formData,
                });
                successCount++;
            } catch (error) {
                console.error(`Upload failed for ${file.name}`, error);
            }
        }

        setUploadProgress('');
        setUploading(false);
        setSelectedFiles([]);

        if (successCount > 0) {
            await fetchDocuments();
            if (successCount < selectedFiles.length) {
                alert(`Uploaded ${successCount}/${selectedFiles.length} files. Some failed.`);
            }
        } else {
            alert('Upload failed.');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this document?')) return;
        try {
            await fetch(`/api/admin/documents/${id}`, { method: 'DELETE' });
            setDocuments(documents.filter(d => d.id !== id));
        } catch (error) {
            console.error('Delete failed', error);
        }
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-100">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                    <FileText className="w-6 h-6 text-green-600" />
                    <h2 className="text-xl font-semibold text-gray-800">Knowledge Base</h2>
                </div>
                <button onClick={fetchDocuments} className="text-gray-500 hover:text-gray-700">
                    <RefreshCw className="w-5 h-5" />
                </button>
            </div>

            <div className="mb-6 space-y-4">
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <Upload className="w-8 h-8 mb-3 text-gray-400" />
                        <p className="mb-2 text-sm text-gray-500"><span className="font-semibold">Click to select files</span> or drag and drop</p>
                        <p className="text-xs text-gray-500">TXT, MD, PDF (text only)</p>
                    </div>
                    <input type="file" className="hidden" onChange={handleFileSelect} disabled={uploading} accept=".txt,.md" multiple />
                </label>

                {selectedFiles.length > 0 && (
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                        <h3 className="text-sm font-medium text-blue-800 mb-2">Selected Files ({selectedFiles.length})</h3>
                        <div className="space-y-2 max-h-40 overflow-y-auto">
                            {selectedFiles.map((file, index) => (
                                <div key={index} className="flex items-center justify-between text-sm bg-white p-2 rounded border border-blue-100">
                                    <span className="truncate max-w-[80%] text-gray-700">{file.name}</span>
                                    <button
                                        onClick={() => handleRemoveSelectedFile(index)}
                                        className="text-red-500 hover:text-red-700"
                                        disabled={uploading}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                        <div className="mt-4 flex justify-end">
                            <button
                                onClick={handleUploadFiles}
                                disabled={uploading}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {uploading ? (
                                    <>
                                        <RefreshCw className="w-4 h-4 animate-spin" />
                                        Processing...
                                    </>
                                ) : (
                                    <>
                                        <Upload className="w-4 h-4" />
                                        Upload {selectedFiles.length} Files
                                    </>
                                )}
                            </button>
                        </div>
                        {uploading && <p className="text-center text-sm text-blue-600 mt-2">{uploadProgress}</p>}
                    </div>
                )}
            </div>

            <div className="space-y-2">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Uploaded Documents</h3>
                {documents.length === 0 ? (
                    <p className="text-center text-gray-400 py-4">No documents uploaded yet.</p>
                ) : (
                    documents.map((doc) => (
                        <div key={doc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-md hover:bg-gray-100 transition-colors">
                            <div className="flex items-center gap-3">
                                <FileText className="w-5 h-5 text-gray-400" />
                                <div>
                                    <p className="font-medium text-gray-800">{doc.name}</p>
                                    <p className="text-xs text-gray-500">{new Date(doc.uploadedAt).toLocaleString()} • {(doc.size / 1024).toFixed(1)} KB</p>
                                </div>
                            </div>
                            <button
                                onClick={() => handleDelete(doc.id)}
                                className="p-2 text-gray-400 hover:text-red-600 rounded-full hover:bg-red-50"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};
