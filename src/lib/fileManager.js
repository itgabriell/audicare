import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { dataCompressor } from './dataCompressor';

// Gerenciador de arquivos completo
export class FileManager {
  constructor(options = {}) {
    this.bucket = options.bucket || 'chat-files';
    this.maxFileSize = options.maxFileSize || 50 * 1024 * 1024; // 50MB
    this.allowedTypes = options.allowedTypes || [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf', 'text/plain', 'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'audio/mpeg', 'audio/wav', 'audio/ogg', 'video/mp4', 'video/webm'
    ];
    this.cache = new Map();
    this.uploadQueue = [];
    this.processing = false;
  }

  // Validar arquivo
  validateFile(file) {
    if (!file) {
      throw new Error('Arquivo não fornecido');
    }

    if (file.size > this.maxFileSize) {
      throw new Error(`Arquivo muito grande. Máximo: ${this.formatFileSize(this.maxFileSize)}`);
    }

    if (!this.allowedTypes.includes(file.type)) {
      throw new Error(`Tipo de arquivo não permitido: ${file.type}`);
    }

    return true;
  }

  // Upload de arquivo
  async uploadFile(file, options = {}) {
    const {
      conversationId,
      messageId,
      onProgress,
      metadata = {}
    } = options;

    this.validateFile(file);

    const fileId = crypto.randomUUID();
    const fileName = `${fileId}_${file.name}`;
    const filePath = conversationId ? `${conversationId}/${fileName}` : fileName;

    try {
      // Upload para Supabase Storage
      const { data, error } = await supabase.storage
        .from(this.bucket)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
          onUploadProgress: (progress) => {
            onProgress?.({
              loaded: progress.loaded,
              total: progress.total,
              percentage: (progress.loaded / progress.total) * 100
            });
          }
        });

      if (error) throw error;

      // Obter URL pública
      const { data: urlData } = supabase.storage
        .from(this.bucket)
        .getPublicUrl(filePath);

      // Salvar metadados no banco
      const fileRecord = {
        id: fileId,
        name: file.name,
        original_name: file.name,
        size: file.size,
        type: file.type,
        mime_type: file.type,
        path: filePath,
        url: urlData.publicUrl,
        bucket: this.bucket,
        conversation_id: conversationId,
        message_id: messageId,
        metadata: {
          ...metadata,
          uploaded_at: new Date().toISOString(),
          uploaded_by: 'current_user' // TODO: integrar com auth
        }
      };

      const { data: dbData, error: dbError } = await supabase
        .from('files')
        .insert([fileRecord])
        .select()
        .single();

      if (dbError) throw dbError;

      // Adicionar ao cache
      this.cache.set(fileId, dbData);

      return dbData;

    } catch (error) {
      console.error('[FileManager] Erro no upload:', error);
      throw error;
    }
  }

  // Upload múltiplo com fila
  async uploadFiles(files, options = {}) {
    const results = [];
    const errors = [];

    for (const file of files) {
      try {
        const result = await this.uploadFile(file, options);
        results.push(result);
      } catch (error) {
        errors.push({ file: file.name, error: error.message });
      }
    }

    return { results, errors };
  }

  // Download de arquivo
  async downloadFile(fileId, options = {}) {
    try {
      const fileData = await this.getFileData(fileId);

      // Para arquivos pequenos, usar fetch direto
      if (fileData.size < 10 * 1024 * 1024) { // 10MB
        const response = await fetch(fileData.url);
        const blob = await response.blob();

        // Criar link de download
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileData.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);

      } else {
        // Para arquivos grandes, abrir em nova aba
        window.open(fileData.url, '_blank');
      }

      // Registrar download
      await this.recordDownload(fileId);

    } catch (error) {
      console.error('[FileManager] Erro no download:', error);
      throw error;
    }
  }

  // Obter dados do arquivo
  async getFileData(fileId) {
    // Verificar cache primeiro
    if (this.cache.has(fileId)) {
      return this.cache.get(fileId);
    }

    const { data, error } = await supabase
      .from('files')
      .select('*')
      .eq('id', fileId)
      .single();

    if (error) throw error;

    // Adicionar ao cache
    this.cache.set(fileId, data);
    return data;
  }

  // Listar arquivos
  async listFiles(options = {}) {
    const {
      conversationId,
      messageId,
      type,
      limit = 50,
      offset = 0
    } = options;

    let query = supabase
      .from('files')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (conversationId) {
      query = query.eq('conversation_id', conversationId);
    }

    if (messageId) {
      query = query.eq('message_id', messageId);
    }

    if (type) {
      query = query.eq('type', type);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Adicionar ao cache
    data.forEach(file => {
      this.cache.set(file.id, file);
    });

    return data;
  }

  // Deletar arquivo
  async deleteFile(fileId) {
    try {
      const fileData = await this.getFileData(fileId);

      // Deletar do storage
      const { error: storageError } = await supabase.storage
        .from(this.bucket)
        .remove([fileData.path]);

      if (storageError) throw storageError;

      // Deletar do banco
      const { error: dbError } = await supabase
        .from('files')
        .delete()
        .eq('id', fileId);

      if (dbError) throw dbError;

      // Remover do cache
      this.cache.delete(fileId);

      return true;

    } catch (error) {
      console.error('[FileManager] Erro ao deletar:', error);
      throw error;
    }
  }

  // Compartilhar arquivo
  async shareFile(fileId, options = {}) {
    const {
      expiresIn = 24 * 60 * 60 * 1000, // 24 horas
      maxDownloads = null
    } = options;

    try {
      const fileData = await this.getFileData(fileId);

      // Criar link compartilhável
      const shareToken = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + expiresIn);

      const shareData = {
        id: shareToken,
        file_id: fileId,
        expires_at: expiresAt.toISOString(),
        max_downloads: maxDownloads,
        download_count: 0,
        created_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('file_shares')
        .insert([shareData])
        .select()
        .single();

      if (error) throw error;

      // Gerar URL compartilhável
      const shareUrl = `${window.location.origin}/shared/${shareToken}`;

      return {
        ...data,
        share_url: shareUrl,
        file: fileData
      };

    } catch (error) {
      console.error('[FileManager] Erro ao compartilhar:', error);
      throw error;
    }
  }

  // Acessar arquivo compartilhado
  async accessSharedFile(shareToken) {
    const { data, error } = await supabase
      .from('file_shares')
      .select(`
        *,
        file:files(*)
      `)
      .eq('id', shareToken)
      .single();

    if (error) throw error;

    // Verificar se expirou
    if (new Date(data.expires_at) < new Date()) {
      throw new Error('Link expirado');
    }

    // Verificar limite de downloads
    if (data.max_downloads && data.download_count >= data.max_downloads) {
      throw new Error('Limite de downloads atingido');
    }

    return data;
  }

  // Registrar download
  async recordDownload(fileId) {
    const { error } = await supabase
      .from('files')
      .update({
        download_count: supabase.raw('download_count + 1'),
        last_downloaded_at: new Date().toISOString()
      })
      .eq('id', fileId);

    if (error) {
      console.warn('[FileManager] Erro ao registrar download:', error);
    }
  }

  // Utilitários
  formatFileSize(bytes) {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`;
  }

  getFileIcon(mimeType) {
    if (mimeType.startsWith('image/')) return '🖼️';
    if (mimeType.startsWith('video/')) return '🎥';
    if (mimeType.startsWith('audio/')) return '🎵';
    if (mimeType === 'application/pdf') return '📄';
    if (mimeType.includes('word')) return '📝';
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return '📊';
    return '📎';
  }

  isImage(mimeType) {
    return mimeType.startsWith('image/');
  }

  isVideo(mimeType) {
    return mimeType.startsWith('video/');
  }

  isAudio(mimeType) {
    return mimeType.startsWith('audio/');
  }

  // Limpeza de cache
  clearCache() {
    this.cache.clear();
  }

  // Estatísticas
  getStats() {
    const files = Array.from(this.cache.values());
    const totalSize = files.reduce((sum, file) => sum + file.size, 0);

    return {
      cachedFiles: this.cache.size,
      totalSize,
      formattedSize: this.formatFileSize(totalSize),
      filesByType: files.reduce((acc, file) => {
        const type = file.type.split('/')[0];
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {})
    };
  }
}

// Instância global
export const fileManager = new FileManager();

// Hook React para upload de arquivos
export function useFileUpload(options = {}) {
  const {
    conversationId,
    onSuccess,
    onError,
    maxFiles = 10
  } = options;

  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState({});
  const [uploadedFiles, setUploadedFiles] = useState([]);

  const uploadFiles = useCallback(async (files) => {
    if (files.length > maxFiles) {
      onError?.(new Error(`Máximo de ${maxFiles} arquivos por vez`));
      return;
    }

    setUploading(true);
    setProgress({});
    const newProgress = {};
    const results = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        newProgress[file.name] = 0;
      }
      setProgress(newProgress);

      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        try {
          const result = await fileManager.uploadFile(file, {
            conversationId,
            onProgress: (progressData) => {
              setProgress(prev => ({
                ...prev,
                [file.name]: progressData.percentage
              }));
            }
          });

          results.push(result);
          setUploadedFiles(prev => [...prev, result]);

        } catch (error) {
          console.error(`Erro ao fazer upload de ${file.name}:`, error);
          onError?.(error);
        }
      }

      onSuccess?.(results);
    } finally {
      setUploading(false);
      setProgress({});
    }
  }, [conversationId, maxFiles, onSuccess, onError]);

  const clearUploadedFiles = useCallback(() => {
    setUploadedFiles([]);
  }, []);

  return {
    uploadFiles,
    uploading,
    progress,
    uploadedFiles,
    clearUploadedFiles
  };
}

// Hook para gerenciar arquivos de uma conversa
export function useConversationFiles(conversationId, options = {}) {
  const {
    autoLoad = true,
    type = null
  } = options;

  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadFiles = useCallback(async () => {
    if (!conversationId) return;

    setLoading(true);
    setError(null);

    try {
      const fileList = await fileManager.listFiles({
        conversationId,
        type,
        limit: 100
      });

      setFiles(fileList);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [conversationId, type]);

  useEffect(() => {
    if (autoLoad) {
      loadFiles();
    }
  }, [autoLoad, loadFiles]);

  const deleteFile = useCallback(async (fileId) => {
    try {
      await fileManager.deleteFile(fileId);
      setFiles(prev => prev.filter(f => f.id !== fileId));
    } catch (error) {
      console.error('Erro ao deletar arquivo:', error);
      throw error;
    }
  }, []);

  const downloadFile = useCallback(async (fileId) => {
    await fileManager.downloadFile(fileId);
  }, []);

  return {
    files,
    loading,
    error,
    loadFiles,
    deleteFile,
    downloadFile
  };
}

// Hook para visualização de arquivos
export function useFileViewer() {
  const [currentFile, setCurrentFile] = useState(null);
  const [viewerOpen, setViewerOpen] = useState(false);

  const openFile = useCallback((file) => {
    setCurrentFile(file);
    setViewerOpen(true);
  }, []);

  const closeViewer = useCallback(() => {
    setViewerOpen(false);
    setCurrentFile(null);
  }, []);

  const canPreview = useCallback((file) => {
    return fileManager.isImage(file.mime_type) ||
           fileManager.isVideo(file.mime_type) ||
           file.mime_type === 'application/pdf';
  }, []);

  return {
    currentFile,
    viewerOpen,
    openFile,
    closeViewer,
    canPreview
  };
}

// Hook para compartilhamento de arquivos
export function useFileSharing() {
  const [sharing, setSharing] = useState(false);
  const [shareLinks, setShareLinks] = useState(new Map());

  const shareFile = useCallback(async (fileId, options = {}) => {
    setSharing(true);

    try {
      const shareData = await fileManager.shareFile(fileId, options);
      setShareLinks(prev => new Map(prev).set(fileId, shareData));

      // Copiar para clipboard
      await navigator.clipboard.writeText(shareData.share_url);

      return shareData;
    } finally {
      setSharing(false);
    }
  }, []);

  const getShareLink = useCallback((fileId) => {
    return shareLinks.get(fileId);
  }, [shareLinks]);

  return {
    shareFile,
    sharing,
    getShareLink,
    shareLinks: Array.from(shareLinks.values())
  };
}

// Hook para drag & drop de arquivos
export function useFileDrop(options = {}) {
  const {
    onFilesSelected,
    accept = fileManager.allowedTypes.join(','),
    multiple = true
  } = options;

  const [isDragging, setIsDragging] = useState(false);
  const [dragCounter, setDragCounter] = useState(0);

  const handleDragEnter = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragCounter(prev => prev + 1);
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragCounter(prev => {
      const newCounter = prev - 1;
      if (newCounter === 0) {
        setIsDragging(false);
      }
      return newCounter;
    });
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();

    setIsDragging(false);
    setDragCounter(0);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      onFilesSelected?.(files);
    }
  }, [onFilesSelected]);

  const dragProps = {
    onDragEnter: handleDragEnter,
    onDragLeave: handleDragLeave,
    onDragOver: handleDragOver,
    onDrop: handleDrop
  };

  return {
    isDragging,
    dragProps
  };
}

// Utilitários para desenvolvimento
if (process.env.NODE_ENV === 'development') {
  window.FileManager = {
    manager: fileManager,
    stats: () => fileManager.getStats(),
    clearCache: () => fileManager.clearCache(),
    allowedTypes: fileManager.allowedTypes
  };
}
