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

      <div className="space-y-8 max-w-5xl mx-auto">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Importação de Pacientes
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 text-base max-w-3xl">
            Importe dados de sistemas antigos via CSV ou Excel. O sistema validará automaticamente os dados e identificará duplicatas.
          </p>
        </div>

        {/* Wizard Steps Indicator */}
        <div className="flex items-center justify-between px-4 py-4 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-200 dark:border-slate-800">
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className="flex flex-col items-center gap-2 relative z-10">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300
                        ${step === s
                  ? 'bg-primary text-white shadow-lg shadow-primary/30 ring-4 ring-primary/10 scale-110'
                  : step > s
                    ? 'bg-emerald-500 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500'}`}
              >
                {step > s ? <CheckCircle className="w-5 h-5" /> : s}
              </div>
              <span className={`text-xs font-medium ${step === s ? 'text-primary' : 'text-slate-500'}`}>
                {s === 1 && 'Upload file'}
                {s === 2 && 'Mapeamento'}
                {s === 3 && 'Processamento'}
                {s === 4 && 'Conclusão'}
              </span>
            </div>
          ))}
          {/* Progress Line Background */}
          <div className="absolute top-9 left-0 w-full h-0.5 bg-slate-100 dark:bg-slate-800 -z-0 hidden md:block" />
        </div>

        {/* Passo 1: Upload */}
        {step === 1 && (
          <Card className="rounded-3xl border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800 pb-6">
              <CardTitle className="text-xl">Selecione o Arquivo de Origem</CardTitle>
              <CardDescription>
                Suporte para arquivos .csv, .xlsx e .xls. Certifique-se que a primeira linha contém os cabeçalhos.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8 p-8">
              <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-3xl p-12 text-center hover:border-primary/50 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-all duration-300 group cursor-pointer bg-slate-50/30 dark:bg-slate-900/10">
                <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                  <Upload className="h-10 w-10 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
                  Arraste seu arquivo aqui
                </h3>
                <p className="text-slate-500 mb-6 max-w-sm mx-auto">
                  Ou clique no botão abaixo para selecionar do seu computador
                </p>
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileChange}
                  className="hidden"
                  id="file-upload"
                />
                <label htmlFor="file-upload">
                  <Button variant="outline" className="rounded-xl px-8 h-11 border-primary/20 text-primary hover:bg-primary hover:text-white" asChild>
                    <span>Selecionar Arquivo</span>
                  </Button>
                </label>

                {file && (
                  <div className="mt-8 inline-flex items-center gap-3 px-4 py-3 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 animate-in fade-in slide-in-from-bottom-2">
                    {fileType === 'excel' ? (
                      <FileSpreadsheet className="h-5 w-5 text-emerald-500" />
                    ) : (
                      <FileText className="h-5 w-5 text-blue-500" />
                    )}
                    <div className="text-left">
                      <p className="font-medium text-sm text-slate-900 dark:text-slate-100">{file.name}</p>
                      <p className="text-xs text-slate-500">{rawRows.length} linhas detectadas</p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => setFile(null)} className="h-8 w-8 ml-2 text-slate-400 hover:text-red-500">
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>

              {headers.length > 0 && (
                <Alert className="bg-blue-50/50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900 rounded-2xl">
                  <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <AlertTitle className="text-blue-800 dark:text-blue-300">Arquivo Pré-processado</AlertTitle>
                  <AlertDescription className="text-blue-600 dark:text-blue-400">
                    Identificamos {headers.length} colunas. Clique em "Continuar" para configurar o mapeamento dos dados.
                  </AlertDescription>
                </Alert>
              )}

              <Button
                onClick={handleProceedToMapping}
                disabled={!file || headers.length === 0}
                className="w-full h-12 text-base rounded-xl shadow-lg shadow-primary/20 hover:shadow-primary/30"
              >
                Continuar para Mapeamento
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Passo 2: Mapeamento */}
        {step === 2 && (
          <div className="space-y-6">
            <Card className="rounded-3xl border-slate-200 dark:border-slate-800 shadow-sm">
              <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-6">
                <CardTitle>Mapeamento de Campos</CardTitle>
                <CardDescription>
                  Associe as colunas do arquivo aos campos do sistema Audicare.
                  <span className="text-rose-500 font-semibold ml-1"> Nome e CPF são obrigatórios.</span>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 p-6">
                <div className="grid gap-3 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                  {headers.map((header) => {
                    const mappedField = dbFields.find(f => f.value === mappings[header]);
                    const isRequired = mappedField?.required;
                    return (
                      <div
                        key={header}
                        className="grid grid-cols-1 md:grid-cols-12 items-center gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800"
                      >
                        <div className="md:col-span-4">
                          <span className="font-semibold text-slate-700 dark:text-slate-300 block truncate" title={header}>{header}</span>
                          {rawRows.length > 0 && (
                            <span className="text-xs text-slate-500 block mt-1 truncate">
                              Ex: {String(rawRows[0][headers.indexOf(header)] || '').slice(0, 40)}
                            </span>
                          )}
                        </div>
                        <div className="hidden md:flex md:col-span-1 justify-center">
                          <ArrowRight className="h-4 w-4 text-slate-300" />
                        </div>
                        <div className="md:col-span-7 flex gap-3">
                          <Select
                            value={mappings[header] || ''}
                            onValueChange={(value) => handleMappingChange(header, value)}
                          >
                            <SelectTrigger className="w-full h-11 rounded-xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800">
                              <SelectValue placeholder="Ignorar coluna" />
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
                            <Badge variant="outline" className="h-11 px-3 border-rose-200 text-rose-600 bg-rose-50">
                              Obrigatório
                            </Badge>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between pt-6 border-t border-slate-100 dark:border-slate-800">
                  <Button variant="ghost" onClick={() => setStep(1)} className="hover:bg-slate-100 rounded-xl">
                    Voltar
                  </Button>
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={() => setShowPreview(!showPreview)}
                      disabled={!hasRequiredMappings()}
                      className="rounded-xl border-slate-200"
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      {showPreview ? 'Ocultar' : 'Ver'} Preview
                    </Button>
                    <Button onClick={handleImport} disabled={!hasRequiredMappings()} className="rounded-xl shadow-lg shadow-primary/20">
                      <Settings className="mr-2 h-4 w-4" /> Iniciar Importação
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Preview dos dados */}
            {showPreview && validatedPreview.length > 0 && (
              <Card className="rounded-3xl border-slate-200 dark:border-slate-800 overflow-hidden animate-in slide-in-from-bottom-4">
                <CardHeader className="bg-slate-50 dark:bg-slate-900/50">
                  <CardTitle className="text-lg">Preview da Validação</CardTitle>
                  <CardDescription>
                    Visualização das primeiras 5 linhas processadas
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {validatedPreview.map((preview, index) => (
                      <div
                        key={index}
                        className={`p-4 ${preview.valid
                            ? 'bg-white dark:bg-slate-950'
                            : 'bg-red-50/50 dark:bg-red-900/10'
                          }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs text-slate-400">Linha {preview.rowIndex}</span>
                            {preview.valid ? (
                              <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-emerald-200">
                                ✓ Válido
                              </Badge>
                            ) : (
                              <Badge variant="destructive" className="bg-red-100 text-red-700 border-red-200 hover:bg-red-100">
                                ✗ Inválido
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div><span className="text-slate-500 block text-xs uppercase">Nome</span> <span className="font-medium">{preview.normalized.name || '-'}</span></div>
                          <div><span className="text-slate-500 block text-xs uppercase">CPF</span> <span className="font-medium">{preview.normalized.cpf || '-'}</span></div>
                        </div>
                        {preview.valid && preview.warnings.length > 0 && (
                          <div className="text-amber-600 text-xs mt-3 flex items-start gap-1 bg-amber-50 p-2 rounded-lg">
                            <AlertTriangle className="h-3 w-3 mt-0.5" /> {preview.warnings.join('; ')}
                          </div>
                        )}
                        {!preview.valid && preview.errors.length > 0 && (
                          <div className="text-red-600 text-xs mt-3 flex items-start gap-1 bg-red-50 p-2 rounded-lg">
                            <X className="h-3 w-3 mt-0.5" /> {preview.errors.join('; ')}
                          </div>
                        )}
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
          <Card className="rounded-3xl border-slate-200 dark:border-slate-800 py-12">
            <CardContent>
              <div className="flex flex-col items-center justify-center text-center space-y-8 max-w-md mx-auto">
                <div className="relative">
                  <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full animate-pulse"></div>
                  <Loader2 className="h-20 w-20 text-primary relative z-10 animate-spin" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                    Processando Arquivo...
                  </h2>
                  <p className="text-slate-500 mt-2">
                    Estamos importando e validando seus dados. Não feche esta janela.
                  </p>
                </div>
                <div className="w-full space-y-3">
                  <Progress value={progress.percentage} className="h-2" />
                  <div className="flex justify-between text-xs font-medium text-slate-500">
                    <span>{progress.current} de {progress.total} registros</span>
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
            <Card className="rounded-3xl border-slate-200 dark:border-slate-800 overflow-hidden">
              <CardHeader className="bg-slate-50/50">
                <CardTitle className="flex items-center gap-3 text-xl">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                    <CheckCircle className="h-6 w-6 text-emerald-600" />
                  </div>
                  Processamento Finalizado
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-8 p-8">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div className="p-6 rounded-3xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-800/50 text-center">
                    <div className="text-4xl font-black text-emerald-600 mb-1">{results.imported}</div>
                    <div className="text-sm font-medium text-emerald-800 dark:text-emerald-400">Sucessos</div>
                  </div>
                  <div className="p-6 rounded-3xl bg-red-50/50 dark:bg-red-950/20 border border-red-100 dark:border-red-800/50 text-center">
                    <div className="text-4xl font-black text-red-600 mb-1">{results.errors}</div>
                    <div className="text-sm font-medium text-red-800 dark:text-red-400">Falhas</div>
                  </div>
                  <div className="p-6 rounded-3xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-800/50 text-center">
                    <div className="text-4xl font-black text-amber-600 mb-1">{results.skipped}</div>
                    <div className="text-sm font-medium text-amber-800 dark:text-amber-400">Duplicados</div>
                  </div>
                  <div className="p-6 rounded-3xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-800/50 text-center">
                    <div className="text-4xl font-black text-blue-600 mb-1">{results.warnings}</div>
                    <div className="text-sm font-medium text-blue-800 dark:text-blue-400">Avisos</div>
                  </div>
                </div>

                {(results.errors > 0 || results.skipped > 0) && (
                  <Alert variant="destructive" className="rounded-2xl border-red-200 bg-red-50 text-red-900">
                    <AlertTriangle className="h-5 w-5" />
                    <AlertTitle className="text-lg font-semibold ml-2">Atenção Necessária</AlertTitle>
                    <AlertDescription className="mt-2 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ml-2">
                      <p className="text-red-700">
                        Alguns registros não foram importados devido a erros de validação ou duplicidade. Baixe o relatório detalhado para corrigir e tentar novamente.
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={exportErrorLog}
                        className="bg-white border-red-200 text-red-700 hover:bg-red-100 hover:text-red-800 shrink-0"
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Baixar Relatório de Erros (.txt)
                      </Button>
                    </AlertDescription>
                  </Alert>
                )}

                <div className="flex gap-3 justify-center pt-8">
                  <Button variant="outline" onClick={() => window.location.reload()} className="rounded-xl h-11 px-6 border-slate-200">
                    <ArrowRight className="mr-2 h-4 w-4 rotate-180" /> Voltar ao Início
                  </Button>
                  <Button onClick={resetImport} className="rounded-xl h-11 px-8 shadow-lg shadow-primary/20">
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
