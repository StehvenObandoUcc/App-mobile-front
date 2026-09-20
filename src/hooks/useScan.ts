import { useState, useCallback } from 'react';
import { AsyncStatus, ScanInput, ScanResult } from '../types';
import { ScanService, mockScanService } from '../services/scan-service';

export function useScan(service: ScanService = mockScanService) {
  const [status, setStatus] = useState<AsyncStatus>('idle');
  const [data, setData] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const analyzeImage = useCallback(
    async (input: ScanInput): Promise<ScanResult> => {
      setStatus('loading');
      setError(null);
      try {
        const result = await service.analyzeImage(input);
        setData(result);
        setStatus('success');
        return result;
      } catch (err: any) {
        const msg = err?.message || 'No se pudo analizar la fotografía.';
        setError(msg);
        setStatus('error');
        throw new Error(msg);
      }
    },
    [service]
  );

  const reset = useCallback(() => {
    setStatus('idle');
    setData(null);
    setError(null);
  }, []);

  return {
    status,
    data,
    error,
    analyzeImage,
    reset,
  };
}
