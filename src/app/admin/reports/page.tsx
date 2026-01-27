"use client";

import React, { useState } from "react";
import { useInventory } from "@/contexts/InventoryContext";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function ReportsPage() {
    const { keys, loading } = useInventory();
    const [generating, setGenerating] = useState(false);

    if (loading) return <div className="p-10 text-center">Loading Data...</div>;

    // Filter for checked out OR missing keys
    const activeKeys = keys
        .filter(k => k.status === "CHECKED_OUT" || k.status === "MISSING")
        .sort((a, b) => {
            // Priority: Missing > Overdue > Normal Checked Out
            if (a.status === "MISSING" && b.status !== "MISSING") return -1;
            if (b.status === "MISSING" && a.status !== "MISSING") return 1;

            const now = new Date().getTime();
            const aOverdue = a.metaData?.dueDate && a.metaData.dueDate.toDate().getTime() < now;
            const bOverdue = b.metaData?.dueDate && b.metaData.dueDate.toDate().getTime() < now;

            if (aOverdue && !bOverdue) return -1;
            if (!aOverdue && bOverdue) return 1;
            return 0;
        });

    const generatePdf = () => {
        setGenerating(true);
        const doc = new jsPDF();

        doc.setFontSize(18);
        doc.text("Active Loans & Missing Keys Report", 14, 20);

        doc.setFontSize(10);
        doc.text(`Generated: ${new Date().toLocaleString("en-GB")}`, 14, 30);
        doc.text(`Total Items: ${activeKeys.length}`, 14, 35);

        const now = new Date();
        const tableData = activeKeys.map(k => {
            const meta = k.metaData || {};
            const isMissing = k.status === "MISSING";
            const isOverdue = !isMissing && meta.dueDate && meta.dueDate.toDate() < now;

            let statusLabel = (meta.loanType || "STANDARD").replace(/_/g, " ");
            if (isMissing) statusLabel = "MISSING";
            else if (isOverdue) statusLabel += " (OVERDUE)";

            let dateInfo = meta.dueDate ? meta.dueDate.toDate().toLocaleDateString("en-GB") : "Indefinite";
            if (isMissing && meta.missingSince) {
                dateInfo = `Reported: ${meta.missingSince.toDate().toLocaleString("en-GB")}`;
            }

            return [
                meta.keyCode || k.name,
                k.name, // using k.name as Asset name
                meta.currentHolder || "Unknown",
                meta.holderCompany || "-",
                meta.checkedOutAt ? meta.checkedOutAt.toDate().toLocaleString("en-GB") : "-",
                dateInfo,
                statusLabel
            ];
        });

        autoTable(doc, {
            startY: 40,
            head: [['Key', 'Asset', 'Holder', 'Company', 'Out Since', 'Due / Missing', 'Status']],
            body: tableData,
            theme: 'grid',
            headStyles: { fillColor: [41, 128, 185] },
            didParseCell: (data) => {
                // Highlight rows in PDF
                if (data.section === 'body') {
                    const rowKeyId = activeKeys[data.row.index];
                    const isMissing = rowKeyId.status === "MISSING";
                    const isOverdue = !isMissing && rowKeyId.metaData?.dueDate && rowKeyId.metaData.dueDate.toDate() < now;

                    if (isMissing) {
                        data.cell.styles.textColor = [200, 0, 0]; // Red
                        data.cell.styles.fontStyle = 'bold';
                    } else if (isOverdue) {
                        data.cell.styles.textColor = [200, 0, 0];
                    }
                }
            }
        });

        // Explicitly handle download via Blob to ensure filename is respected
        const pdfBlob = doc.output("blob");
        const url = URL.createObjectURL(pdfBlob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `active-loans-report-${new Date().toISOString().slice(0, 10)}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        setGenerating(false);
    };

    return (
        <div className="mx-auto max-w-6xl space-y-8 p-4">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold dark:text-white">Active Loans & Missing</h1>
                <button
                    onClick={generatePdf}
                    disabled={generating || activeKeys.length === 0}
                    className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
                >
                    {generating ? "Generating..." : "Download PDF"}
                </button>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-gray-500 dark:text-gray-400">
                        <thead className="bg-gray-50 text-xs uppercase text-gray-700 dark:bg-gray-700 dark:text-gray-400">
                            <tr>
                                <th className="px-6 py-3">Key</th>
                                <th className="px-6 py-3">Asset</th>
                                <th className="px-6 py-3">Holder</th>
                                <th className="px-6 py-3">Company</th>
                                <th className="px-6 py-3">Out Since</th>
                                <th className="px-6 py-3">Due / Missing</th>
                                <th className="px-6 py-3">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {activeKeys.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-10 text-center italic">
                                        No keys currently checked out.
                                    </td>
                                </tr>
                            ) : (
                                activeKeys.map((key) => {
                                    const meta = key.metaData || {};
                                    const isMissing = key.status === "MISSING";
                                    const isOverdue = !isMissing && meta.dueDate && meta.dueDate.toDate() < new Date();

                                    let rowClass = "bg-white hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-600";
                                    if (isMissing) rowClass = "bg-red-50 dark:bg-red-900/20 hover:bg-red-100";
                                    else if (isOverdue) rowClass = "bg-orange-50 dark:bg-orange-900/10 hover:bg-orange-100";

                                    let textClass = "text-gray-900 dark:text-white";
                                    if (isMissing) textClass = "text-red-700 dark:text-red-400 font-bold";
                                    else if (isOverdue) textClass = "text-orange-700 dark:text-orange-400";

                                    return (
                                        <tr key={key.id} className={`border-b dark:border-gray-700 ${rowClass}`}>
                                            <td className={`px-6 py-4 font-medium ${textClass}`}>
                                                {meta.keyCode || key.name}
                                            </td>
                                            <td className="px-6 py-4">{key.name}</td>
                                            <td className="px-6 py-4 font-medium">{meta.currentHolder || "Unknown"}</td>
                                            <td className="px-6 py-4">{meta.holderCompany || "-"}</td>
                                            <td className="px-6 py-4">
                                                {meta.checkedOutAt ? meta.checkedOutAt.toDate().toLocaleString("en-GB") : "-"}
                                            </td>
                                            <td className={`px-6 py-4 ${isMissing || isOverdue ? "font-bold" : ""}`}>
                                                {isMissing && meta.missingSince
                                                    ? `Reported: ${meta.missingSince.toDate().toLocaleString("en-GB")}`
                                                    : meta.dueDate ? meta.dueDate.toDate().toLocaleDateString("en-GB") : "Indefinite"}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${isMissing ? "bg-red-100 text-red-800" :
                                                    isOverdue ? "bg-orange-100 text-orange-800" :
                                                        "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300"
                                                    }`}>
                                                    {isMissing ? "MISSING" : (meta.loanType || "STANDARD").replace(/_/g, " ")}
                                                    {!isMissing && isOverdue && " (OVERDUE)"}
                                                </span>
                                            </td>
                                        </tr>
                                    )
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
