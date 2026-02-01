"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useState, useEffect, Suspense } from "react";
import { useInventory } from "@/contexts/InventoryContext"; // Allow looking up assets
import { QRScannerModal } from "@/components/common/QRScannerModal";
import { KeyActionModal } from "@/components/dashboard/KeyActionModal";
import { QuickSetupModal } from "@/components/dashboard/QuickSetupModal";
import { Asset } from "@/types";

const NAV_ITEMS = [
    { label: "Dashboard", href: "/" },
    { label: "Assets", href: "/admin/assets" },
    { label: "Add Key", href: "/admin/add-key" },
    { label: "Audit Mode", href: "/admin/audit", className: "hidden sm:flex" }, // Hidden on mobile
    { label: "Active Loans", href: "/admin/reports" },
    // { label: "Import Keys", href: "/admin/import" },
    // { label: "Team", href: "/admin/team" },
    // { label: "Billing", href: "/admin/billing" },
    // { label: "Settings", href: "/admin/settings" }, // Moved to Gear Icon
];

interface SidebarProps {
    isOpen: boolean;
    onClose: () => void;
}

// Helper component to handle URL params safely within Suspense
function UrlScanner({ onScan }: { onScan: (code: string, silent: boolean) => void }) {
    const searchParams = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        const scanCode = searchParams.get('scan');
        if (scanCode) {
            onScan(scanCode, true); // Call handleScan with silent true
            // Clean URL
            router.replace(pathname);
        }
    }, [searchParams, onScan, router, pathname]);

    return null;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
    const pathname = usePathname();
    const router = useRouter();
    const { user, profile, logout } = useAuth();
    const { assets, loading } = useInventory(); // Get assets for lookup

    const [isScannerOpen, setIsScannerOpen] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
    const [isQuickSetupOpen, setIsQuickSetupOpen] = useState(false); // New state

    const handleScan = (code: string, silent: boolean = false) => {
        setIsScannerOpen(false);

        // precise match logic similar to Dashboard
        const exactMatch = assets.find(a =>
            a.qrCode === code ||
            a.metaData?.keyCode === code ||
            a.name === code ||
            a.id === code // Also check ID
        );

        if (exactMatch) {
            setSelectedAsset(exactMatch);
            // CHECK FOR PILOT SETUP
            if (exactMatch.isSetupComplete === false) {
                setIsQuickSetupOpen(true);
            } else {
                setIsModalOpen(true);
            }
        } else {
            if (!silent) {
                // Fallback: If not found, maybe redirect to assets page with search?
                // Or just alert. Redirect is useful if it's a fuzzy match case.
                if (confirm(`Asset "${code}" not found directly. Search for it on Assets page?`)) {
                    router.push(`/admin/assets?action=scan&q=${encodeURIComponent(code)}`); // We might need to handle 'q' param in AssetList later but for now let's just go there.
                    // actually AssetList checks query param? No, it handles action=scan.
                    // Simpler: Just go to assets page and let them try there?
                    // actually just showing alert is safer.
                }
            }
        }
    };

    if (!user) return null;

    return (
        <>
            <Suspense>
                <UrlScanner onScan={handleScan} />
            </Suspense>

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
                <div className="flex h-full flex-col">
                    {/* Header Area with Logo and Gear Icon */}
                    <div className="flex items-center justify-between p-4">
                        <div className="flex items-center gap-2">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src="/logo.jpg"
                                alt="ItsMyKeys Logo"
                                className="h-10 w-auto rounded-lg"
                            />
                        </div>
                        <div className="flex items-center gap-1">
                            {/* Settings Gear Icon */}
                            <Link
                                href="/admin/settings"
                                onClick={onClose}
                                className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white"
                                title="Settings"
                            >
                                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                            </Link>
                            <button
                                onClick={onClose}
                                className="sm:hidden text-gray-500 hover:bg-gray-100 p-2 rounded-md"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto px-3 py-2">
                        {/* Prominent Identify Action */}
                        <div className="mb-4">
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
                                <li key={item.href} className={item.className || ""}>
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
                        </ul>
                    </div>

                    {/* Footer Area: User / Help */}
                    <div className="border-t border-gray-200 p-4 dark:border-gray-700">
                        {/* User Profile Info */}
                        <div className="mb-4 flex items-center gap-3 px-2">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                                <span className="text-lg font-bold">
                                    {(profile?.displayName?.[0] || user?.email?.[0] || "?").toUpperCase()}
                                </span>
                            </div>
                            <div className="flex flex-col overflow-hidden">
                                <span className="truncate text-sm font-medium text-gray-900 dark:text-white">
                                    {profile?.displayName || "User"}
                                </span>
                                <span className="truncate text-xs text-gray-500 dark:text-gray-400">
                                    {user?.email}
                                </span>
                            </div>
                        </div>

                        <ul className="space-y-2 font-medium">
                            <li>
                                <Link
                                    href="/help"
                                    onClick={onClose}
                                    className="flex w-full items-center rounded-lg p-2 text-gray-900 hover:bg-gray-100 dark:text-white dark:hover:bg-gray-700"
                                >
                                    <svg className="h-6 w-6 flex-shrink-0 text-gray-500 transition duration-75 group-hover:text-gray-900 dark:text-gray-400 dark:group-hover:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <span className="ml-3">Help & Support</span>
                                </Link>
                            </li>
                            <li>
                                <button
                                    onClick={() => logout()}
                                    className="flex w-full items-center rounded-lg p-2 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                                >
                                    <svg className="h-6 w-6 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                    </svg>
                                    <span className="ml-3">Sign Out</span>
                                </button>
                            </li>
                        </ul>
                    </div>
                </div>

            </aside>

            {/* Quick Setup Modal */}
            {
                selectedAsset && isQuickSetupOpen && (
                    <QuickSetupModal
                        asset={selectedAsset}
                        isOpen={isQuickSetupOpen}
                        onClose={() => {
                            setIsQuickSetupOpen(false);
                            setSelectedAsset(null);
                        }}
                        onSuccess={() => {
                            setIsQuickSetupOpen(false);
                            setSelectedAsset(null);
                            // Optional: Open standard modal after setup? 
                            // For now, just close and let them scan again or find it in list to checkout.
                            alert("Setup Complete! You can now check this key out.");
                        }}
                    />
                )
            }

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
                        allAssets={assets}
                    />
                )
            }
        </>
    );
}
