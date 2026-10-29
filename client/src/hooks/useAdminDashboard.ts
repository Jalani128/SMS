import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './useAuth';
import {
  dashboardService,
  DashboardOverviewData,
} from '../services/dashboard.service';

export interface UseAdminDashboardReturn {
  data: DashboardOverviewData | null;
  isLoading: boolean;
  error: string | null;
  timeframe: 'week' | 'month' | 'year';
  setTimeframe: (tf: 'week' | 'month' | 'year') => void;
  refetch: () => Promise<void>;
  isDevMock: boolean;
}

export const useAdminDashboard = (): UseAdminDashboardReturn => {
  const { school } = useAuth();
  const [data, setData] = useState<DashboardOverviewData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [timeframe, setTimeframe] = useState<'week' | 'month' | 'year'>('month');

  // Keep ref to active AbortController to cancel in-flight requests on unmount
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchDashboardData = useCallback(async () => {
    // Cancel any existing in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsLoading(true);
    setError(null);

    try {
      const currency = school?.currency || 'USD';
      const overview = await dashboardService.getOverview(currency, controller.signal);
      setData(overview);
    } catch (err: any) {
      if (err.name === 'CanceledError' || err.code === 'ERR_CANCELED') {
        // Request was intentionally cancelled due to unmount/refetch
        return;
      }
      setError(err.message || 'Failed to load administrator dashboard data.');
    } finally {
      setIsLoading(false);
    }
  }, [school?.currency]);

  useEffect(() => {
    fetchDashboardData();

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchDashboardData]);

  return {
    data,
    isLoading,
    error,
    timeframe,
    setTimeframe,
    refetch: fetchDashboardData,
    isDevMock: data?.isDevMock ?? true,
  };
};
