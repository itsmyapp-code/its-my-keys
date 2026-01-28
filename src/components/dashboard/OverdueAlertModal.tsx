"use client";

import React from "react";
import { Asset } from "@/types";

interface OverdueAlertModalProps {
    isOpen: boolean;
    onClose: () => void;
    overdueKeys: Asset[];
}

export function OverdueAlertModal({ isOpen, onClose, overdueKeys }: OverdueAlertModalProps) {
    if (!isOpen || overdueKeys.length === 0) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-800 border-2 border-red-100 dark:border-red-900">

                {/* Header */}
                <div className="mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400">
                            <span className="text-xl">⚠️</span>
                        </div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Overdue Keys Alert</h2>
                    </div>
                </div>

                <div className="mb-6">
                    <p className="text-gray-600 dark:text-gray-300">
                        The following keys have passed their expected return time:
                    </p>
                </div>

                {/* List */}
                <div className="max-h-[60vh] overflow-y-auto mb-6 space-y-3 pr-2">
                    {overdueKeys.map(key => {
                        const meta = key.metaData || {};
                        let dueString = "Unknown";

                        // Parse Due Date
                        if (meta.dueDate) {
                            if (typeof meta.dueDate.toDate === 'function') dueString = meta.dueDate.toDate().toLocaleString("en-GB");
                            else if (meta.dueDate.seconds) dueString = new Date(meta.dueDate.seconds * 1000).toLocaleString("en-GB");
                        }

                        // Parse Checked Out At
                        let outString = "";
                        // Check root first, then metadata
                        const checkedOutAt = (key as any).checkedOutAt || meta.checkedOutAt;

                        if (checkedOutAt) {
                            if (typeof checkedOutAt.toDate === 'function') outString = checkedOutAt.toDate().toLocaleString("en-GB");
                            else if (checkedOutAt.seconds) outString = new Date(checkedOutAt.seconds * 1000).toLocaleString("en-GB");
                        }


                        return (
                            <div key={key.id} className="rounded-lg border border-red-100 bg-red-50 p-3 dark:border-red-900/30 dark:bg-red-900/10">
                                <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-2">
                                        <div className="font-bold text-gray-900 dark:text-white">{key.name}</div>
                                        <span className="text-xs text-gray-500">({meta.location || "General"})</span>
                                    </div>
                                    <div className="text-xs font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded-full dark:bg-red-900/40 dark:text-red-300">
                                        OVERDUE
                                    </div>
                                </div>
                                <div className="mt-2 text-sm space-y-1">
                                    <div className="flex justify-between text-gray-700 dark:text-gray-300">
                                        <span>Holder:</span>
                                        <span className="font-medium">{meta.currentHolder || "Unknown"}</span>
                                    </div>
                                    <div className="flex justify-between text-gray-500 text-xs">
                                        <span>Time Out:</span>
                                        <span>{outString}</span>
                                    </div>
                                    <div className="flex justify-between text-red-700 dark:text-red-400 font-medium text-xs border-t border-red-100 dark:border-red-900/30 pt-1 mt-1">
                                        <span>Expected Return:</span>
                                        <span>{dueString}</span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Footer */}
                <div className="flex justify-end">
                    <button
                        onClick={onClose}
                        className="rounded-lg bg-gray-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-gray-800 dark:bg-gray-700 dark:hover:bg-gray-600"
                    >
                        Acknowledge
                    </button>
                </div>
            </div>
        </div>
    );
}
