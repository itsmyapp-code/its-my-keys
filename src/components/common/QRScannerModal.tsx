"use client";

import React, { useState, useEffect } from "react";
import { Scanner } from "@yudiel/react-qr-scanner";

interface QRScannerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onScan: (value: string) => void;
}

export function QRScannerModal({ isOpen, onClose, onScan }: QRScannerModalProps) {
    const [error, setError] = useState<string | null>(null);
    const [nfcStatus, setNfcStatus] = useState<"IDLE" | "SCANNING" | "ERROR" | "UNSUPPORTED">("IDLE");
    const [nfcError, setNfcError] = useState("");
    const [lastKeyTime, setLastKeyTime] = useState(0);
    const [barcodeBuffer, setBarcodeBuffer] = useState("");

    // Initialize NFC
    useEffect(() => {
        if (!isOpen) return;

        const startNfc = async () => {
            if (!('NDEFReader' in window)) {
                setNfcStatus("UNSUPPORTED");
                return;
            }

            try {
                // @ts-ignore - Web NFC API is experimental
                const ndef = new NDEFReader();
                await ndef.scan();
                setNfcStatus("SCANNING");

                // @ts-ignore
                ndef.onreading = (event: any) => {
                    const decoder = new TextDecoder();
                    for (const record of event.message.records) {
                        if (record.recordType === "text") {
                            const text = decoder.decode(record.data);
                            onScan(text);
                            onClose();
                            return;
                        }
                    }
                    // Fallback: Use serial number if message empty
                    if (event.serialNumber) {
                        onScan(event.serialNumber);
                        onClose();
                    }
                };

                // @ts-ignore
                ndef.onreadingerror = () => {
                    setNfcError("NFC Read Failed");
                };

            } catch (err: any) {
                console.error("NFC Error:", err);
                setNfcStatus("ERROR");
                setNfcError(err.message || "Failed to start NFC");
            }
        };

        startNfc();
    }, [isOpen, onScan, onClose]);

    // Handle Keyboard Scanner (Wedge)
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            const currentTime = Date.now();
            const timeDiff = currentTime - lastKeyTime;

            // Scanners type very fast (usually < 50ms between keys)
            // We increase timeout to 500ms to handle slower scanners/PCs or fast manual entry.
            if (timeDiff > 500) {
                setBarcodeBuffer("");
            }

            setLastKeyTime(currentTime);

            if (e.key === "Enter" || e.key === "Tab") {
                if (barcodeBuffer.length > 0) {
                    e.preventDefault(); // Prevent tab focus change or form submit
                    onScan(barcodeBuffer);
                    onClose();
                }
                setBarcodeBuffer("");
            } else if (e.key.length === 1) {
                // Only add printable characters
                setBarcodeBuffer(prev => prev + e.key);
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isOpen, lastKeyTime, barcodeBuffer, onScan, onClose]);

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

    const handleManualSubmit = () => {
        if (barcodeBuffer.length > 0) {
            onScan(barcodeBuffer);
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm">
            <div className="relative w-full max-w-sm overflow-hidden rounded-2xl bg-gray-900 border border-gray-700 shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between bg-gray-800 p-4">
                    <h3 className="flex items-center gap-2 text-lg font-semibold text-white">
                        <span className="text-blue-400">📸</span> Scan Asset
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
                    {/* Live Buffer Feedback (Overlay for BOTH Camera and Error states) */}
                    {barcodeBuffer && (
                        <div className="absolute top-4 left-4 right-4 z-20">
                            <div className="bg-black/80 rounded p-2 text-white font-mono text-lg break-all border border-blue-500/50 shadow-lg text-center backdrop-blur-md">
                                {barcodeBuffer}
                            </div>
                            <button
                                onClick={handleManualSubmit}
                                className="mt-2 w-full bg-blue-600/90 hover:bg-blue-700 text-white rounded py-2 text-sm font-bold shadow-lg backdrop-blur-md transition-all"
                            >
                                Process Code ⏎
                            </button>
                        </div>
                    )}

                    {error ? (
                        <div className="flex h-full flex-col items-center justify-center p-6 text-center text-gray-400">
                            <div className="mb-4 rounded-full bg-gray-800 p-4">
                                <span className="text-4xl">⌨️</span>
                            </div>
                            <p className="mb-2 text-xl font-medium text-white">Scanner Ready</p>
                            <p className="text-sm">Camera not detected, but you can use your USB/Bluetooth scanner.</p>
                            <p className="mt-4 text-xs text-red-400 opacity-60">Camera Error: {error}</p>
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

                {/* Status Footer */}
                <div className="bg-gray-800 p-4 space-y-3">
                    <div className="text-center">
                        <p className="text-sm text-gray-400">
                            Scan QR Code via Camera or <span className="text-white font-medium">USB Scanner</span>
                        </p>
                    </div>

                    {/* NFC Indicator */}
                    <div className={`p-2 rounded-lg border flex items-center justify-center gap-2 ${nfcStatus === 'SCANNING' ? 'bg-blue-900/20 border-blue-500/30 text-blue-300' :
                        nfcStatus === 'ERROR' ? 'bg-red-900/20 border-red-500/30 text-red-300' :
                            'bg-gray-700/50 border-gray-600 text-gray-500'
                        }`}>
                        {nfcStatus === 'SCANNING' && (
                            <span className="relative flex h-2 w-2 mr-1">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                            </span>
                        )}
                        <span className="text-xs font-medium">
                            {nfcStatus === 'SCANNING' ? "Ready to Tap NFC Tag" :
                                nfcStatus === 'UNSUPPORTED' ? "NFC Not Supported on this device" :
                                    nfcStatus === 'ERROR' ? nfcError : "NFC Inactive"}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
