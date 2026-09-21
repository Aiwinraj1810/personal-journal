import { useCallback, useState } from 'react';

import { type ImportResult, exportBackup, importBackup } from '@/lib/backup';

export function useBackup() {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runExport = useCallback(async () => {
    setIsExporting(true);
    setError(null);
    try {
      await exportBackup();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed.');
      return false;
    } finally {
      setIsExporting(false);
    }
  }, []);

  const runImport = useCallback(async (): Promise<ImportResult | null> => {
    setIsImporting(true);
    setError(null);
    try {
      return await importBackup();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed.');
      return null;
    } finally {
      setIsImporting(false);
    }
  }, []);

  return { runExport, runImport, isExporting, isImporting, error };
}
