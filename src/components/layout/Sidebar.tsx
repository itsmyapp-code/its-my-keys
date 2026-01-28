"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";
import { useInventory } from "@/contexts/InventoryContext"; // Allow looking up assets
import { QRScannerModal } from "@/components/common/QRScannerModal";
import { KeyActionModal } from "@/components/dashboard/KeyActionModal";
import { Asset } from "@/types";

const NAV_ITEMS = [
    { label: "Dashboard", href: "/" },
    { label: "Assets", href: "/admin/assets" },
    { label: "Add Key", href: "/admin/add-key" },
    { label: "Audit Mode", href: "/admin/audit" },
    { label: "Active Loans", href: "/admin/reports" },
    { label: "Import Keys", href: "/admin/import" },
    { label: "Settings", href: "/admin/settings" },
];

interface SidebarProps {
    isOpen: boolean;
    onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
    const pathname = usePathname();
    const router = useRouter();
    const { user, profile, logout } = useAuth();
    const { assets } = useInventory(); // Get assets for lookup

    const [isScannerOpen, setIsScannerOpen] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);

    const handleScan = (code: string) => {
        setIsScannerOpen(false);

        // precise match logic similar to Dashboard
        const exactMatch = assets.find(a =>
            a.qrCode === code ||
            a.metaData?.keyCode === code ||
            a.name === code
        );

        if (exactMatch) {
            setSelectedAsset(exactMatch);
            setIsModalOpen(true);
        } else {
            // Fallback: If not found, maybe redirect to assets page with search?
            // Or just alert. Redirect is useful if it's a fuzzy match case.
            if (confirm(`Asset "${code}" not found directly. Search for it on Assets page?`)) {
                router.push(`/admin/assets?action=scan&q=${encodeURIComponent(code)}`); // We might need to handle 'q' param in AssetList later but for now let's just go there.
                // actually AssetList checks query param? No, it handles action=scan.
                // Simpler: Just go to assets page and let them try there?
                // actually just showing alert is safer.
            }
        }
    };

    if (!user) return null;

    return (
        <>
            {/* Mobile Backdrop */}
            {isOpen && (
                <div
                    className="fixed inset-0 z-30 bg-gray-900/50 sm:hidden"
                    onClick={onClose}
                />
            )}

            <aside className={`fixed left-0 top-0 z-40 h-screen w-64 border-r border-gray-200 bg-white transition-transform dark:border-gray-700 dark:bg-gray-800 
                ${isOpen ? "translate-x-0" : "-translate-x-full"} sm:translate-x-0`}
            >
                <div className="h-full px-3 py-4 overflow-y-auto">
                    <div className="mb-5 flex items-center justify-between pl-2.5">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src="/logo.jpg"
                            alt="ItsMyKeys Logo"
                            className="h-12 w-auto rounded-lg"
                        />
                        <button
                            onClick={onClose}
                            className="sm:hidden text-gray-500 hover:bg-gray-100 p-1 rounded-md"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>

                    {/* Prominent Identify Action */}
                    {/* Prominent Identify Action - Now opens Camera directly */}
                    <div className="mb-4 px-2">
                        <button
                            onClick={() => {
                                onClose();
                                setIsScannerOpen(true);
                            }}
                            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3 text-sm font-bold text-white shadow-md transition-all hover:from-blue-700 hover:to-indigo-700 hover:shadow-lg active:scale-95"
                        >
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                            </svg>
                            IDENTIFY ASSET
                        </button>
                    </div>

                    <ul className="space-y-2 font-medium">
                        {NAV_ITEMS.map((item) => (
                            <li key={item.href}>
                                <Link
                                    href={item.href}
                                    onClick={() => onClose()} // Close on navigate (mobile)
                                    className={`flex items-center rounded-lg p-2 text-gray-900 hover:bg-gray-100 dark:text-white dark:hover:bg-gray-700 ${pathname === item.href ? "bg-gray-100 dark:bg-gray-700" : ""
                                        }`}
                                >
                                    <span className="ml-3">{item.label}</span>
                                </Link>
                            </li>
                        ))}
                        <li>
                            <button
                                onClick={() => logout()}
                                className="flex w-full items-center rounded-lg p-2 text-gray-900 hover:bg-gray-100 dark:text-white dark:hover:bg-gray-700"
                            >
                                <span className="ml-3">Sign Out</span>
                            </button>
                        </li>
                    </ul>
                </div>
            </aside >

            {/* Global Scanner & Action Modal embedded in Sidebar for access from anywhere */}
            {
                isScannerOpen && (
                    <QRScannerModal
                        isOpen={isScannerOpen}
                        onClose={() => setIsScannerOpen(false)}
                        onScan={handleScan}
                    />
                )
            }

            {
                selectedAsset && (
                    <KeyActionModal
                        keyItem={selectedAsset}
                        isOpen={isModalOpen}
                        onClose={() => {
                            setIsModalOpen(false);
                            setSelectedAsset(null);
                        }}
                        orgId={profile?.orgId || ""}
                    />
                )
            }
        </>
    );
}
