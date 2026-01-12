import React, { useState, useCallback, useMemo } from 'react';
import { Helmet } from 'react-helmet';
import {
  Upload,
  FileText,
  CheckCircle,
  ArrowRight,
  Settings,
  Loader2,
  AlertTriangle,
  Eye,
  X,
  FileSpreadsheet,
  RefreshCw,
  Download,
  Info,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { addPatient, checkDuplicatePatient } from '@/database';
import { parseCSV, validateAndNormalizePatient } from '@/lib/dataImportUtils';
import * as XLSX from 'xlsx';

const BATCH_SIZE = 50; // Processar 50 pacientes por vez para evitar sobrecarga

const ImportData = () => {
  const [file, setFile] = useState(null);
  const [fileType, setFileType] = useState(null); // 'csv' ou 'excel'
  const [step, setStep] = useState(1); // 1: Upload, 2: Preview/Mapping, 3: Importing, 4: Results
  const [headers, setHeaders] = useState([]);
  const [rawRows, setRawRows] = useState([]);
  const [previewRows, setPreviewRows] = useState([]);
  const [mappings, setMappings] = useState({});
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, percentage: 0 });
  const [results, setResults] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const { toast } = useToast();

  const dbFields = [
    { value: 'name', label: 'Nome Completo', required: true },
    { value: 'cpf', label: 'CPF', required: true },
    { value: 'phone', label: 'Telefone (ou múltiplos separados por vírgula)', required: false },
    { value: 'phone2', label: 'Telefone 2 (opcional)', required: false },
    { value: 'phone3', label: 'Telefone 3 (opcional)', required: false },
    { value: 'email', label: 'E-mail', required: false },
    { value: 'birthdate', label: 'Data de Nascimento', required: false },
    { value: 'gender', label: 'Sexo', required: false },
    { value: 'address', label: 'Endereço', required: false },
    { value: 'medical_history', label: 'Histórico Médico', required: false },
    { value: 'allergies', label: 'Alergias', required: false },
    { value: 'medications', label: 'Medicamentos', required: false },
    { value: 'notes', label: 'Observações', required: false },
  ];

  // Processa arquivo Excel
  const processExcelFile = useCallback((file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Converte para JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
        
        if (jsonData.length === 0) {
          toast({
            title: 'Arquivo vazio',
            description: 'O arquivo Excel não contém dados.',
            variant: 'destructive',
          });
          return;
        }

        const detectedHeaders = jsonData[0].map(h => String(h || '').trim()).filter(h => h);
        const rows = jsonData.slice(1).filter(row => row.some(cell => cell));

        if (detectedHeaders.length === 0) {
          toast({
            title: 'Cabeçalho inválido',
            description: 'O arquivo não possui cabeçalhos válidos.',
            variant: 'destructive',
          });
          return;
        }

        setHeaders(detectedHeaders);
        setRawRows(rows);
        setPreviewRows(rows.slice(0, 5)); // Preview das primeiras 5 linhas
        setMappings(
          detectedHeaders.reduce((acc, h) => {
            acc[h] = '';
            return acc;
          }, {})
        );
      } catch (error) {
        console.error('[ImportData] Erro ao processar Excel:', error);
        toast({
          title: 'Erro ao processar arquivo',
          description: 'Não foi possível ler o arquivo Excel. Verifique o formato.',
          variant: 'destructive',
        });
      }
    };
    reader.readAsArrayBuffer(file);
  }, [toast]);

  // Processa arquivo CSV
  const processCSVFile = useCallback((file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = String(e.target.result || '');
        const { headers: detectedHeaders, rows } = parseCSV(text);

        if (detectedHeaders.length === 0) {
          toast({
            title: 'CSV vazio',
            description: 'O arquivo não contém cabeçalho.',
            variant: 'destructive',
          });
          return;
        }

        if (rows.length === 0) {
          toast({
            title: 'Sem dados',
            description: 'O arquivo não contém linhas de dados.',
            variant: 'destructive',
          });
          return;
        }

        setHeaders(detectedHeaders);
        setRawRows(rows);
        setPreviewRows(rows.slice(0, 5)); // Preview das primeiras 5 linhas
        setMappings(
          detectedHeaders.reduce((acc, h) => {
            acc[h] = '';
            return acc;
          }, {})
        );
      } catch (error) {
        console.error('[ImportData] Erro ao processar CSV:', error);
        toast({
          title: 'Erro ao processar arquivo',
          description: error?.message || 'Não foi possível ler o arquivo CSV.',
          variant: 'destructive',
        });
      }
    };
    reader.readAsText(file);
  }, [toast]);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    const fileName = selectedFile.name.toLowerCase();
    const isCSV = fileName.endsWith('.csv') || selectedFile.type === 'text/csv';
    const isExcel = fileName.endsWith('.xlsx') || fileName.endsWith('.xls') || 
                    selectedFile.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
                    selectedFile.type === 'application/vnd.ms-excel';

    if (!isCSV && !isExcel) {
      toast({
        title: 'Arquivo inválido',
        description: 'Por favor, selecione um arquivo CSV ou Excel (.xlsx, .xls).',
        variant: 'destructive',
      });
      return;
    }

    setFile(selectedFile);
    setFileType(isCSV ? 'csv' : 'excel');
    setResults(null);
    setStep(1);
    setShowPreview(false);

    if (isExcel) {
      processExcelFile(selectedFile);
    } else {
      processCSVFile(selectedFile);
    }
  };

  const handleProceedToMapping = () => {
    if (!file || headers.length === 0) {
      toast({
        title: 'Erro',
        description: 'Arquivo não foi processado corretamente.',
        variant: 'destructive',
      });
      return;
    }
    setStep(2);
  };

  const handleMappingChange = (header, dbField) => {
    setMappings((prev) => ({ ...prev, [header]: dbField }));
  };

  const hasRequiredMappings = useMemo(() => {
    const mappedFields = Object.values(mappings);
    const hasName = mappedFields.includes('name');
    const hasCpf = mappedFields.includes('cpf');
    return hasName && hasCpf;
  }, [mappings]);

  // Valida preview dos dados
  const validatedPreview = useMemo(() => {
    if (!showPreview || previewRows.length === 0) return [];
    
    return previewRows.map((row, index) => {
      const rawData = {};
      headers.forEach((header, colIndex) => {
        const dbField = mappings[header];
        const value = row[colIndex];
        if (dbField && value) {
          rawData[dbField] = String(value).trim();
        }
      });

      const validation = validateAndNormalizePatient(rawData);
      return {
        rowIndex: index + 2, // +2 porque linha 1 é cabeçalho e index começa em 0
        rawData,
        ...validation,
      };
    });
  }, [previewRows, headers, mappings, showPreview]);

  const handleImport = async () => {
    if (!file || rawRows.length === 0) return;

    setImporting(true);
    setStep(3);
    
    const importResults = {
      imported: 0,
      errors: 0,
      skipped: 0,
      warnings: 0,
      details: [],
    };

    const totalRows = rawRows.length;
    setProgress({ current: 0, total: totalRows, percentage: 0 });

    try {
      // Processa em batches
      for (let batchStart = 0; batchStart < totalRows; batchStart += BATCH_SIZE) {
        const batchEnd = Math.min(batchStart + BATCH_SIZE, totalRows);
        const batch = rawRows.slice(batchStart, batchEnd);

        await Promise.all(
          batch.map(async (row, batchIndex) => {
            const rowIndex = batchStart + batchIndex + 2; // +2 para linha do cabeçalho e index

            try {
              // Mapeia dados
              const rawData = {};
              headers.forEach((header, colIndex) => {
                const dbField = mappings[header];
                const value = row[colIndex];
                if (dbField && value) {
                  rawData[dbField] = String(value).trim();
                }
              });

              // Valida e normaliza
              const validation = validateAndNormalizePatient(rawData);

              if (!validation.valid) {
                importResults.errors++;
                importResults.details.push({
                  row: rowIndex,
                  status: 'error',
                  message: validation.errors.join('; '),
                });
                return;
              }

              // Verifica duplicatas
              const isDuplicate = await checkDuplicatePatient(
                validation.normalized.name,
                validation.normalized.cpf
              );

              if (isDuplicate) {
                importResults.skipped++;
                importResults.details.push({
                  row: rowIndex,
                  status: 'skipped',
                  message: 'Paciente já existe no sistema (CPF ou nome duplicado)',
                });
                return;
              }

              // Adiciona paciente
              await addPatient(validation.normalized);
              importResults.imported++;
              if (validation.warnings.length > 0) {
                importResults.warnings++;
              }
              importResults.details.push({
                row: rowIndex,
                status: 'success',
                message: validation.warnings.length > 0 
                  ? `Importado com avisos: ${validation.warnings.join('; ')}`
                  : 'Importado com sucesso',
              });

              // Atualiza progresso
              const current = batchStart + batchIndex + 1;
              setProgress({
                current,
                total: totalRows,
                percentage: Math.round((current / totalRows) * 100),
              });
            } catch (error) {
              importResults.errors++;
              importResults.details.push({
                row: rowIndex,
                status: 'error',
                message: error?.message || 'Erro desconhecido ao importar',
              });
            }
          })
        );

        // Pequena pausa entre batches para não sobrecarregar
        if (batchEnd < totalRows) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      setResults(importResults);
      setStep(4);

      toast({
        title: 'Importação concluída',
        description: `${importResults.imported} pacientes importados, ${importResults.errors} erros, ${importResults.skipped} duplicados ignorados.`,
        variant: importResults.errors > 0 ? 'destructive' : 'default',
      });
    } catch (error) {
      console.error('[ImportData] Erro crítico na importação', error);
      toast({
        title: 'Erro crítico na importação',
        description: error?.message || 'Ocorreu um erro durante a importação.',
        variant: 'destructive',
      });
      setResults({
        ...importResults,
        errors: importResults.errors + 1,
      });
      setStep(4);
    } finally {
      setImporting(false);
    }
  };

  const resetImport = () => {
    setStep(1);
    setFile(null);
    setFileType(null);
    setHeaders([]);
    setRawRows([]);
    setPreviewRows([]);
    setMappings({});
    setResults(null);
    setShowPreview(false);
    setProgress({ current: 0, total: 0, percentage: 0 });
  };

  const exportErrorLog = () => {
    if (!results) return;
    
    const errorLog = results.details
      .filter(d => d.status === 'error' || d.status === 'skipped')
      .map(d => `Linha ${d.row}: ${d.message}`)
      .join('\n');

    const blob = new Blob([errorLog], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `erros_importacao_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <Helmet>
        <title>Importar Dados - Audicare</title>
        <meta
          name="description"
          content="Importação de dados de pacientes do Miller ERP ou outros sistemas via CSV/Excel"
        />
      </Helmet>

      <div className="space-y-6 max-w-6xl mx-auto">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Importação de Pacientes
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Importe pacientes de sistemas antigos via CSV ou Excel (.xlsx, .xls).
            Suporta validação automática, detecção de duplicatas e preview dos dados.
          </p>
        </div>

        {/* Passo 1: Upload */}
        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>Passo 1: Selecione o Arquivo</CardTitle>
              <CardDescription>
                Arquivos suportados: CSV (.csv) ou Excel (.xlsx, .xls)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary transition-colors">
                <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">
                  Arraste um arquivo CSV ou Excel ou clique para selecionar
                </p>
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileChange}
                  className="hidden"
                  id="file-upload"
                />
                <label htmlFor="file-upload">
                  <Button variant="outline" asChild>
                    <span>Selecionar Arquivo</span>
                  </Button>
                </label>
                {file && (
                  <div className="mt-4 flex items-center justify-center gap-2 text-sm">
                    {fileType === 'excel' ? (
                      <FileSpreadsheet className="h-4 w-4 text-green-500" />
                    ) : (
                      <FileText className="h-4 w-4 text-blue-500" />
                    )}
                    <span className="font-medium">{file.name}</span>
                    <Badge variant="secondary">
                      {rawRows.length} {rawRows.length === 1 ? 'linha' : 'linhas'}
                    </Badge>
                  </div>
                )}
              </div>

              {headers.length > 0 && (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertTitle>Arquivo processado</AlertTitle>
                  <AlertDescription>
                    {headers.length} colunas detectadas. Clique em "Continuar" para mapear os campos.
                  </AlertDescription>
                </Alert>
              )}

              <Button
                onClick={handleProceedToMapping}
                disabled={!file || headers.length === 0}
                className="w-full"
              >
                Continuar para Mapeamento
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Passo 2: Mapeamento */}
        {step === 2 && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Passo 2: Mapear Campos</CardTitle>
                <CardDescription>
                  Associe as colunas do seu arquivo aos campos do sistema.
                  <span className="text-destructive font-semibold"> Nome e CPF são obrigatórios.</span>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-2">
                  {headers.map((header) => {
                    const mappedField = dbFields.find(f => f.value === mappings[header]);
                    const isRequired = mappedField?.required;
                    return (
                      <div
                        key={header}
                        className="grid grid-cols-3 items-center gap-4 p-2 rounded-md hover:bg-muted/50"
                      >
                        <div className="text-right">
                          <span className="font-medium truncate block">{header}</span>
                          {rawRows.length > 0 && (
                            <span className="text-xs text-muted-foreground">
                              Ex: {String(rawRows[0][headers.indexOf(header)] || '').slice(0, 30)}
                            </span>
                          )}
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground mx-auto" />
                        <Select
                          value={mappings[header] || ''}
                          onValueChange={(value) => handleMappingChange(header, value)}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Selecione..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">Ignorar coluna</SelectItem>
                            {dbFields.map((field) => (
                              <SelectItem key={field.value} value={field.value}>
                                {field.label}
                                {field.required && ' *'}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {isRequired && (
                          <Badge variant="outline" className="text-xs">
                            Obrigatório
                          </Badge>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between pt-4 border-t">
                  <Button variant="outline" onClick={() => setStep(1)}>
                    Voltar
                  </Button>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setShowPreview(!showPreview)}
                      disabled={!hasRequiredMappings()}
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      {showPreview ? 'Ocultar' : 'Mostrar'} Preview
                    </Button>
                    <Button onClick={handleImport} disabled={!hasRequiredMappings()}>
                      <Settings className="mr-2 h-4 w-4" /> Iniciar Importação
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Preview dos dados */}
            {showPreview && validatedPreview.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Preview dos Dados (Primeiras 5 linhas)</CardTitle>
                  <CardDescription>
                    Validação e normalização dos dados antes da importação
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {validatedPreview.map((preview, index) => (
                      <div
                        key={index}
                        className={`p-3 rounded-md border ${
                          preview.valid
                            ? 'border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/20'
                            : 'border-destructive/50 bg-destructive/5'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <span className="font-medium">Linha {preview.rowIndex}</span>
                            {preview.valid ? (
                              <Badge variant="outline" className="ml-2 text-green-600">
                                ✓ Válido
                              </Badge>
                            ) : (
                              <Badge variant="destructive" className="ml-2">
                                ✗ Inválido
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="text-sm space-y-1">
                          <div><strong>Nome:</strong> {preview.normalized.name || 'N/A'}</div>
                          <div><strong>CPF:</strong> {preview.normalized.cpf || 'N/A'}</div>
                          {preview.valid && preview.warnings.length > 0 && (
                            <div className="text-amber-600 text-xs mt-2">
                              ⚠ Avisos: {preview.warnings.join('; ')}
                            </div>
                          )}
                          {!preview.valid && preview.errors.length > 0 && (
                            <div className="text-destructive text-xs mt-2">
                              ✗ Erros: {preview.errors.join('; ')}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Passo 3: Importando */}
        {step === 3 && (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <Loader2 className="h-16 w-16 text-primary mx-auto animate-spin" />
                <div>
                  <h2 className="text-xl font-semibold text-foreground">
                    Importando Pacientes...
                  </h2>
                  <p className="text-muted-foreground mt-2">
                    Por favor, aguarde. Isso pode levar alguns minutos para grandes volumes.
                  </p>
                </div>
                <div className="space-y-2 max-w-md mx-auto">
                  <Progress value={progress.percentage} className="w-full" />
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>{progress.current} de {progress.total} pacientes processados</span>
                    <span>{progress.percentage}%</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Passo 4: Resultados */}
        {step === 4 && results && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  Importação Concluída
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800">
                    <div className="text-2xl font-bold text-green-600">{results.imported}</div>
                    <div className="text-sm text-muted-foreground">Importados</div>
                  </div>
                  <div className="p-4 rounded-lg bg-destructive/5 border border-destructive/20">
                    <div className="text-2xl font-bold text-destructive">{results.errors}</div>
                    <div className="text-sm text-muted-foreground">Erros</div>
                  </div>
                  <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
                    <div className="text-2xl font-bold text-amber-600">{results.skipped}</div>
                    <div className="text-sm text-muted-foreground">Duplicados</div>
                  </div>
                  <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
                    <div className="text-2xl font-bold text-blue-600">{results.warnings}</div>
                    <div className="text-sm text-muted-foreground">Avisos</div>
                  </div>
                </div>

                {(results.errors > 0 || results.skipped > 0) && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Erros ou duplicatas encontrados</AlertTitle>
                    <AlertDescription className="flex items-center justify-between">
                      <span>
                        {results.errors > 0 && `${results.errors} linha(s) com erro. `}
                        {results.skipped > 0 && `${results.skipped} paciente(s) duplicado(s) ignorado(s).`}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={exportErrorLog}
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Exportar Log
                      </Button>
                    </AlertDescription>
                  </Alert>
                )}

                <div className="flex gap-2 justify-end pt-4 border-t">
                  <Button variant="outline" onClick={resetImport}>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Nova Importação
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </>
  );
};

export default ImportData;
