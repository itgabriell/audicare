import React, { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, File, X, Check, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './button';
import { Progress } from './progress';

const DragDropUpload = ({
  onFilesSelected,
  onFileRemove,
  acceptedTypes = ['image/*', 'application/pdf', '.doc', '.docx'],
  maxFiles = 5,
  maxSize = 10 * 1024 * 1024, // 10MB
  className,
  ...props
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(new Set());
  const [uploadProgress, setUploadProgress] = useState(new Map());
  const [errors, setErrors] = useState(new Map());

  const fileInputRef = useRef(null);

  const validateFile = useCallback((file) => {
    // Check file size
    if (file.size > maxSize) {
      return `Arquivo muito grande. Máximo: ${Math.round(maxSize / 1024 / 1024)}MB`;
    }

    // Check file type
    const isAccepted = acceptedTypes.some(type => {
      if (type.startsWith('.')) {
        return file.name.toLowerCase().endsWith(type.toLowerCase());
      }
      return file.type.match(type);
    });

    if (!isAccepted) {
      return 'Tipo de arquivo não suportado';
    }

    return null;
  }, [maxSize, acceptedTypes]);

  const processFiles = useCallback((fileList) => {
    const newFiles = Array.from(fileList);
    const validFiles = [];
    const newErrors = new Map(errors);

    // Check total file count
    if (files.length + newFiles.length > maxFiles) {
      newErrors.set('count', `Máximo de ${maxFiles} arquivos permitido`);
      setErrors(newErrors);
      return;
    }

    newFiles.forEach(file => {
      const error = validateFile(file);
      if (error) {
        newErrors.set(file.name, error);
      } else {
        validFiles.push(file);
        newErrors.delete(file.name);
      }
    });

    if (validFiles.length > 0) {
      setFiles(prev => [...prev, ...validFiles]);
      onFilesSelected?.(validFiles);
    }

    setErrors(newErrors);
  }, [files.length, maxFiles, validateFile, onFilesSelected, errors]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(false);

    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles.length > 0) {
      processFiles(droppedFiles);
    }
  }, [processFiles]);

  const handleFileInput = useCallback((e) => {
    const selectedFiles = e.target.files;
    if (selectedFiles.length > 0) {
      processFiles(selectedFiles);
    }
  }, [processFiles]);

  const handleRemoveFile = useCallback((fileToRemove) => {
    setFiles(prev => prev.filter(file => file !== fileToRemove));
    onFileRemove?.(fileToRemove);
    setErrors(prev => {
      const newErrors = new Map(prev);
      newErrors.delete(fileToRemove.name);
      return newErrors;
    });
  }, [onFileRemove]);

  const handleUploadFile = useCallback(async (file) => {
    setUploading(prev => new Set([...prev, file.name]));

    try {
      // Simulate upload progress
      for (let progress = 0; progress <= 100; progress += 10) {
        await new Promise(resolve => setTimeout(resolve, 100));
        setUploadProgress(prev => new Map(prev.set(file.name, progress)));
      }

      // File uploaded successfully
      setUploadProgress(prev => {
        const newProgress = new Map(prev);
        newProgress.set(file.name, 100);
        return newProgress;
      });
    } catch (error) {
      setErrors(prev => new Map(prev.set(file.name, 'Erro no upload')));
    } finally {
      setUploading(prev => {
        const newUploading = new Set(prev);
        newUploading.delete(file.name);
        return newUploading;
      });
    }
  }, []);

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (file) => {
    if (file.type.startsWith('image/')) return '🖼️';
    if (file.type === 'application/pdf') return '📄';
    if (file.type.includes('word') || file.type.includes('document')) return '📝';
    return '📎';
  };

  return (
    <div className={cn("space-y-4", className)} {...props}>
      {/* Upload Zone */}
      <motion.div
        className={cn(
          "relative border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200 cursor-pointer",
          isDragOver
            ? "border-primary bg-primary/5 scale-[1.02]"
            : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50"
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={acceptedTypes.join(',')}
          onChange={handleFileInput}
          className="hidden"
        />

        <motion.div
          className="flex flex-col items-center gap-4"
          animate={isDragOver ? { y: -5 } : { y: 0 }}
        >
          <div className={cn(
            "p-4 rounded-full transition-colors",
            isDragOver ? "bg-primary/10" : "bg-muted"
          )}>
            <Upload className={cn(
              "h-8 w-8 transition-colors",
              isDragOver ? "text-primary" : "text-muted-foreground"
            )} />
          </div>

          <div>
            <p className="text-lg font-medium text-foreground mb-1">
              {isDragOver ? 'Solte os arquivos aqui' : 'Arraste arquivos ou clique para selecionar'}
            </p>
            <p className="text-sm text-muted-foreground">
              Suporta: {acceptedTypes.join(', ')} • Máx: {Math.round(maxSize / 1024 / 1024)}MB por arquivo
            </p>
          </div>
        </motion.div>
      </motion.div>

      {/* Error Messages */}
      <AnimatePresence>
        {errors.size > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-2"
          >
            {Array.from(errors.entries()).map(([key, error]) => (
              <motion.div
                key={key}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive"
              >
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>{error}</span>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* File List */}
      <AnimatePresence>
        {files.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-2"
          >
            <h4 className="font-medium text-foreground">Arquivos selecionados ({files.length})</h4>

            <div className="space-y-2">
              {files.map((file, index) => {
                const isUploading = uploading.has(file.name);
                const progress = uploadProgress.get(file.name) || 0;
                const hasError = errors.has(file.name);

                return (
                  <motion.div
                    key={`${file.name}-${index}`}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className={cn(
                      "flex items-center gap-3 p-3 border rounded-lg bg-card transition-all",
                      hasError && "border-destructive/50 bg-destructive/5"
                    )}
                  >
                    {/* File Icon */}
                    <div className="text-lg flex-shrink-0">
                      {getFileIcon(file)}
                    </div>

                    {/* File Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">
                        {file.name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {formatFileSize(file.size)}
                      </p>

                      {/* Progress Bar */}
                      {isUploading && (
                        <div className="mt-2">
                          <Progress value={progress} className="h-1" />
                          <p className="text-xs text-muted-foreground mt-1">
                            Fazendo upload... {progress}%
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1">
                      {!isUploading && !hasError && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleUploadFile(file);
                          }}
                          className="h-8 w-8 p-0"
                        >
                          <Upload className="h-3 w-3" />
                        </Button>
                      )}

                      {progress === 100 && !hasError && (
                        <div className="flex items-center text-green-600">
                          <Check className="h-4 w-4" />
                        </div>
                      )}

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveFile(file);
                        }}
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export { DragDropUpload };
