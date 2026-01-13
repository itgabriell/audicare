import React, { useState } from 'react';
import { DragDropUpload } from './drag-drop-upload';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './card';
import { Badge } from './badge';
import { Button } from './button';
import { Upload, FileText, Trash2 } from 'lucide-react';

const DragDropDemo = () => {
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [uploadHistory, setUploadHistory] = useState([]);

  const handleFilesSelected = (files) => {
    console.log('Files selected:', files);
    const newHistory = files.map(file => ({
      id: Date.now() + Math.random(),
      name: file.name,
      size: file.size,
      type: file.type,
      timestamp: new Date(),
      status: 'pending'
    }));
    setUploadHistory(prev => [...prev, ...newHistory]);
  };

  const handleFileRemove = (file) => {
    console.log('File removed:', file);
    setUploadHistory(prev => prev.filter(f => f.name !== file.name));
  };

  const handleSimulateUpload = () => {
    setUploadHistory(prev => prev.map(file => ({
      ...file,
      status: 'uploading'
    })));

    // Simulate upload completion
    setTimeout(() => {
      setUploadHistory(prev => prev.map(file => ({
        ...file,
        status: 'completed'
      })));
      setUploadedFiles(prev => [...prev, ...uploadHistory.filter(f => f.status === 'uploading')]);
    }, 2000);
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'uploading': return 'bg-blue-100 text-blue-800';
      case 'error': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto p-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">Drag & Drop Upload Demo</h1>
        <p className="text-muted-foreground">
          Demonstração do componente de upload com arrastar e soltar
        </p>
      </div>

      {/* Upload Component */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload de Arquivos
          </CardTitle>
          <CardDescription>
            Arraste arquivos ou clique para selecionar. Suporte a imagens, PDFs e documentos.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DragDropUpload
            onFilesSelected={handleFilesSelected}
            onFileRemove={handleFileRemove}
            maxFiles={5}
            maxSize={10 * 1024 * 1024} // 10MB
            acceptedTypes={['image/*', 'application/pdf', '.doc', '.docx', '.txt']}
          />

          {uploadHistory.length > 0 && (
            <div className="mt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Histórico de Upload</h3>
                <Button
                  onClick={handleSimulateUpload}
                  disabled={uploadHistory.some(f => f.status === 'uploading')}
                  size="sm"
                >
                  Simular Upload
                </Button>
              </div>

              <div className="space-y-2">
                {uploadHistory.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center justify-between p-3 border rounded-lg bg-card"
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{file.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatFileSize(file.size)} • {file.type}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={getStatusColor(file.status)}>
                        {file.status === 'completed' ? 'Concluído' :
                         file.status === 'uploading' ? 'Fazendo upload...' :
                         file.status === 'error' ? 'Erro' : 'Pendente'}
                      </Badge>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleFileRemove(file)}
                        className="h-8 w-8 p-0"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Usage Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>Como Usar</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2">Importação:</h4>
            <pre className="bg-muted p-3 rounded text-sm overflow-x-auto">
{`import { DragDropUpload } from '@/components/ui/drag-drop-upload';

<DragDropUpload
  onFilesSelected={(files) => console.log(files)}
  onFileRemove={(file) => console.log('removed', file)}
  maxFiles={5}
  maxSize={10 * 1024 * 1024}
  acceptedTypes={['image/*', 'application/pdf']}
/>`}
            </pre>
          </div>

          <div>
            <h4 className="font-semibold mb-2">Propriedades:</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li><code>onFilesSelected</code> - Callback quando arquivos são selecionados</li>
              <li><code>onFileRemove</code> - Callback quando um arquivo é removido</li>
              <li><code>maxFiles</code> - Número máximo de arquivos (padrão: 5)</li>
              <li><code>maxSize</code> - Tamanho máximo por arquivo em bytes</li>
              <li><code>acceptedTypes</code> - Tipos de arquivo aceitos</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export { DragDropDemo };
