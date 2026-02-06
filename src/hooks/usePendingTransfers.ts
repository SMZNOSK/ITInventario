// src/hooks/usePendingTransfers.ts
import { useAuth } from "@/app/providers";
import { useEffect, useState } from "react";

export function usePendingTransfers() {
    const { fetchJSON } = useAuth();
    const [hasPendingTransfers, setHasPendingTransfers] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let mounted = true;

        const checkPendingTransfers = async () => {
            try {
                setLoading(true);

                // Check all transfer types in parallel
                const [assetsRes, assignmentsRes, loansRes, manualRes] = await Promise.all([
                    fetchJSON<{ items: any[] }>(
                        "/api/transfers/assets/pending?scope=destination"
                    ).catch(() => ({ items: [] })),
                    fetchJSON<{ items: any[] }>(
                        "/api/assignments/transfers?type=received&status=PENDING"
                    ).catch(() => ({ items: [] })),
                    fetchJSON<{ items: any[] }>(
                        "/api/loans/transfers?type=received&status=PENDING"
                    ).catch(() => ({ items: [] })),
                    fetchJSON<{ items: any[] }>(
                        "/api/assignments/manual/transfers?type=received&status=PENDING"
                    ).catch(() => ({ items: [] })),
                ]);

                const totalPending =
                    (assetsRes.items?.length || 0) +
                    (assignmentsRes.items?.length || 0) +
                    (loansRes.items?.length || 0) +
                    (manualRes.items?.length || 0);

                if (mounted) {
                    setHasPendingTransfers(totalPending > 0);
                    setLoading(false);
                }
            } catch (err) {
                console.error("Error checking pending transfers:", err);
                if (mounted) {
                    setHasPendingTransfers(false);
                    setLoading(false);
                }
            }
        };

        checkPendingTransfers();

        // Poll every 30 seconds
        const interval = setInterval(checkPendingTransfers, 30000);

        return () => {
            mounted = false;
            clearInterval(interval);
        };
    }, [fetchJSON]);

    return { hasPendingTransfers, loading };
}
