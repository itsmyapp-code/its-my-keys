"use client";

import React, { useState } from "react";
import { Scanner } from "@yudiel/react-qr-scanner";

interface QRScannerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onScan: (value: string) => void;
}

export function QRScannerModal({ isOpen, onClose, onScan }: QRScannerModalProps) {
    const [error, setError] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleScan = (detectedCodes: { rawValue: string }[]) => {
        if (detectedCodes && detectedCodes.length > 0) {
            const value = detectedCodes[0].rawValue;
            if (value) {
                onScan(value);
                onClose();
            }
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm">
            <div className="relative w-full max-w-sm overflow-hidden rounded-2xl bg-gray-900 border border-gray-700 shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between bg-gray-800 p-4">
                    <h3 className="flex items-center gap-2 text-lg font-semibold text-white">
                        <span className="text-blue-400">📸</span> Scan QR Code
                    </h3>
                    <button
                        onClick={onClose}
                        className="rounded-full p-2 text-gray-400 hover:bg-gray-700 hover:text-white"
                    >
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Scanner Area */}
                <div className="relative aspect-square w-full bg-black">
                    {error ? (
                        <div className="flex h-full flex-col items-center justify-center p-6 text-center text-red-400">
                            <p className="mb-2 text-xl">⚠️</p>
                            <p>{error}</p>
                            <p className="mt-2 text-sm text-gray-500">Please ensure camera permissions are allowed.</p>
                        </div>
                    ) : (
                        <Scanner
                            onScan={handleScan}
                            onError={(err: any) => setError("Failed to access camera. " + (err?.message || "Unknown error"))}
                            components={{
                                onOff: true,
                                torch: true,
                            }}
                            styles={{
                                container: { width: "100%", height: "100%" },
                                video: { width: "100%", height: "100%", objectFit: "cover" }
                            }}
                        />
                    )}

                    {/* Overlay Guide */}
                    {!error && (
                        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                            <div className="h-48 w-48 rounded-lg border-2 border-dashed border-blue-500/50 bg-blue-500/10"></div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="bg-gray-800 p-4 text-center">
                    <p className="text-sm text-gray-400">
                        Point your camera at a QR code to scan.
                    </p>
                </div>
            </div>
        </div>
    );
}
