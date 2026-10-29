import React, { useState, useEffect } from 'react';
import {
  onboardingService,
  ImportPreviewResponse,
  ImportConfirmResponse,
  ImportHistoryItem,
} from '../../services/onboarding.service';
import { PageHeader } from '../../components/shared/PageHeader';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import {
  UploadCloud,
  Download,
  CheckCircle2,
  AlertCircle,
  FileText,
  RotateCw,
  Users,
  GraduationCap,
  HeartHandshake,
  Check,
} from 'lucide-react';

export const BulkDataImportPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'teachers' | 'students' | 'parents'>('teachers');
  const [csvContent, setCsvContent] = useState('');
  const [filename, setFilename] = useState('import.csv');
  const [previewing, setPreviewing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [previewResult, setPreviewResult] = useState<ImportPreviewResponse | null>(null);
  const [confirmResult, setConfirmResult] = useState<ImportConfirmResponse | null>(null);
  const [historyItems, setHistoryItems] = useState<ImportHistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadHistory = async () => {
    try {
      setLoadingHistory(true);
      const data = await onboardingService.getImportHistory(1, 20);
      setHistoryItems(data.imports || []);
    } catch {
      // offline / mock fallback
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const handleDownloadTemplate = async (type: 'teachers' | 'students' | 'parents') => {
    try {
      const blob = await onboardingService.downloadTemplate(type);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `edumanage_${type}_template.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to download CSV template.');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFilename(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setCsvContent(content);
      setPreviewResult(null);
      setConfirmResult(null);
      setErrorMessage(null);
    };
    reader.readAsText(file);
  };

  const handlePreview = async () => {
    if (!csvContent.trim()) {
      setErrorMessage('Please upload or paste CSV data first.');
      return;
    }
    try {
      setPreviewing(true);
      setErrorMessage(null);
      setConfirmResult(null);
      const result = await onboardingService.previewImport(activeTab, csvContent, filename);
      setPreviewResult(result);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to parse and validate CSV file.');
    } finally {
      setPreviewing(false);
    }
  };

  const handleConfirm = async () => {
    if (!previewResult) return;
    try {
      setConfirming(true);
      setErrorMessage(null);
      const result = await onboardingService.confirmImport(previewResult.batchId, activeTab);
      setConfirmResult(result);
      await loadHistory();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to execute import.');
    } finally {
      setConfirming(false);
    }
  };

  const handleDownloadErrorReport = async (batchId: string) => {
    try {
      const blob = await onboardingService.downloadErrorReport(batchId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `import_errors_${batchId}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to download error report.');
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
      <PageHeader
        title="Bulk Data Importer"
        description="Upload CSV files to batch-import faculty, students, and parent records with two-stage validation."
      />

      {errorMessage && (
        <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-sm flex items-start gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <p>{errorMessage}</p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-border">
        <button
          type="button"
          onClick={() => {
            setActiveTab('teachers');
            setPreviewResult(null);
            setConfirmResult(null);
          }}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'teachers'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Users className="w-4 h-4" />
          Teachers Import
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveTab('students');
            setPreviewResult(null);
            setConfirmResult(null);
          }}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'students'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <GraduationCap className="w-4 h-4" />
          Students Import
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveTab('parents');
            setPreviewResult(null);
            setConfirmResult(null);
          }}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'parents'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <HeartHandshake className="w-4 h-4" />
          Parents Import
        </button>
      </div>

      {/* Upload & Instructions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-4">
          <div className="bg-card border border-border/80 rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm">Step 1: Upload or Paste CSV</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDownloadTemplate(activeTab)}
                className="text-xs gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                Download Template
              </Button>
            </div>

            <div className="border-2 border-dashed border-border/80 rounded-xl p-6 text-center hover:border-primary/50 transition-colors">
              <UploadCloud className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-xs text-foreground font-medium mb-1">
                Drag and drop your CSV file here, or browse
              </p>
              <p className="text-[11px] text-muted-foreground mb-3">
                Supported format: .csv (RFC-4180), max 5 MB, up to 1,000 rows
              </p>
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={handleFileUpload}
                className="hidden"
                id="csv-file-input"
              />
              <label htmlFor="csv-file-input">
                <Button variant="secondary" size="sm" type="button" className="text-xs pointer-events-none">
                  Select CSV File
                </Button>
              </label>
              {filename && (
                <p className="text-xs text-primary font-medium mt-2">Selected: {filename}</p>
              )}
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">
                Or Paste Raw CSV Data Directly:
              </label>
              <textarea
                rows={4}
                value={csvContent}
                onChange={(e) => setCsvContent(e.target.value)}
                placeholder="Name,Email,EmployeeId,Department..."
                className="w-full text-xs font-mono p-3 bg-muted/30 border border-input rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                size="sm"
                onClick={handlePreview}
                disabled={previewing || !csvContent.trim()}
                className="text-xs gap-1.5"
              >
                <FileText className="w-3.5 h-3.5" />
                {previewing ? 'Validating CSV...' : 'Stage A: Validate & Preview'}
              </Button>
            </div>
          </div>
        </div>

        {/* Guidance Column */}
        <div className="bg-card border border-border/80 rounded-xl p-5 shadow-sm space-y-3">
          <h3 className="font-semibold text-sm">Import Safety Guidelines</h3>
          <ul className="text-xs text-muted-foreground space-y-2 list-disc list-inside">
            <li>
              <strong>No Default Passwords:</strong> Imported users receive a cryptographically secure, time-limited activation code.
            </li>
            <li>
              <strong>Uniqueness Checks:</strong> Identifiers like Employee IDs and Admission Numbers must be unique per school.
            </li>
            <li>
              <strong>Two-Stage Validation:</strong> Records are never inserted until you preview and explicitly confirm the batch.
            </li>
            <li>
              <strong>Formula Injection Defense:</strong> All downloaded error logs and exports automatically sanitize DDE formulas.
            </li>
          </ul>
        </div>
      </div>

      {/* Stage A: Preview Results */}
      {previewResult && (
        <div className="bg-card border border-border/80 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-semibold text-sm">Stage A: Import Validation Summary</h3>
              <p className="text-xs text-muted-foreground">
                Batch ID: <code className="bg-muted px-1.5 py-0.5 rounded">{previewResult.batchId}</code> ({previewResult.filename})
              </p>
            </div>

            <Button
              size="sm"
              onClick={handleConfirm}
              disabled={confirming || previewResult.validRowsCount === 0 || confirmResult !== null}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              {confirming
                ? 'Processing Import...'
                : `Stage B: Confirm Import (${previewResult.validRowsCount} Valid Rows)`}
            </Button>
          </div>

          {/* Counts Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-lg border bg-muted/20">
              <span className="text-xs text-muted-foreground">Total Rows</span>
              <p className="text-xl font-bold">{previewResult.totalRows}</p>
            </div>
            <div className="p-3 rounded-lg border bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400">
              <span className="text-xs">Valid Rows</span>
              <p className="text-xl font-bold">{previewResult.validRowsCount}</p>
            </div>
            <div className="p-3 rounded-lg border bg-destructive/10 border-destructive/30 text-destructive">
              <span className="text-xs">Invalid Rows</span>
              <p className="text-xl font-bold">{previewResult.invalidRowsCount}</p>
            </div>
            <div className="p-3 rounded-lg border bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400">
              <span className="text-xs">Duplicate Rows</span>
              <p className="text-xl font-bold">{previewResult.duplicateRowsCount}</p>
            </div>
          </div>

          {/* Row Errors Table */}
          {previewResult.errors.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-destructive flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5" />
                Row-Level Validation Errors ({previewResult.errors.length})
              </h4>
              <div className="max-h-48 overflow-y-auto border rounded-lg text-xs">
                <table className="w-full text-left">
                  <thead className="bg-muted text-muted-foreground sticky top-0">
                    <tr>
                      <th className="p-2">Row #</th>
                      <th className="p-2">Identifier</th>
                      <th className="p-2">Field</th>
                      <th className="p-2">Error Message</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {previewResult.errors.map((err, i) => (
                      <tr key={i} className="hover:bg-muted/40">
                        <td className="p-2 font-mono">{err.row}</td>
                        <td className="p-2 font-medium">{err.identifier || '—'}</td>
                        <td className="p-2 text-muted-foreground">{err.field || '—'}</td>
                        <td className="p-2 text-destructive">{err.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Confirmation Outcome */}
          {confirmResult && (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-xs space-y-1">
              <div className="flex items-center gap-2 font-semibold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Import Finished: {confirmResult.message}</span>
              </div>
              <p>
                Successfully created <strong>{confirmResult.importedCount}</strong> records.{' '}
                {confirmResult.failedCount > 0 && `Failed: ${confirmResult.failedCount}.`}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Past Import History */}
      <div className="bg-card border border-border/80 rounded-xl p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm">Past Import Batches</h3>
          <Button variant="ghost" size="sm" onClick={loadHistory} className="text-xs gap-1.5">
            <RotateCw className="w-3.5 h-3.5" /> Refresh
          </Button>
        </div>

        {loadingHistory ? (
          <div className="h-20 bg-muted/40 rounded-lg animate-pulse"></div>
        ) : historyItems.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-6">
            No previous imports recorded for this school.
          </p>
        ) : (
          <div className="overflow-x-auto border rounded-lg text-xs">
            <table className="w-full text-left">
              <thead className="bg-muted text-muted-foreground">
                <tr>
                  <th className="p-2.5">Date</th>
                  <th className="p-2.5">Batch ID</th>
                  <th className="p-2.5">Type</th>
                  <th className="p-2.5">Filename</th>
                  <th className="p-2.5">Status</th>
                  <th className="p-2.5">Imported / Total</th>
                  <th className="p-2.5">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {historyItems.map((item) => (
                  <tr key={item._id} className="hover:bg-muted/40">
                    <td className="p-2.5 text-muted-foreground">
                      {new Date(item.createdAt).toLocaleDateString()}
                    </td>
                    <td className="p-2.5 font-mono">{item.batchId}</td>
                    <td className="p-2.5 uppercase font-medium">{item.importType}</td>
                    <td className="p-2.5 truncate max-w-[150px]">{item.filename}</td>
                    <td className="p-2.5">
                      <Badge
                        variant={
                          item.status === 'completed'
                            ? 'default'
                            : item.status === 'partial'
                            ? 'secondary'
                            : 'outline'
                        }
                        className={
                          item.status === 'completed'
                            ? 'bg-emerald-600 text-white'
                            : item.status === 'partial'
                            ? 'bg-amber-500/20 text-amber-700'
                            : ''
                        }
                      >
                        {item.status}
                      </Badge>
                    </td>
                    <td className="p-2.5">
                      {item.importedRows} / {item.totalRows}
                    </td>
                    <td className="p-2.5">
                      {item.invalidRows > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDownloadErrorReport(item.batchId)}
                          className="text-[11px] h-7 px-2 text-destructive gap-1"
                        >
                          <Download className="w-3 h-3" /> Errors CSV
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
