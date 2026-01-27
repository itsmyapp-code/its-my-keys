"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

const NAV_ITEMS = [
    { label: "Dashboard", href: "/" },
    { label: "Add Key", href: "/admin/add-key" },
    { label: "Audit Mode", href: "/admin/audit" },
    { label: "Active Loans", href: "/admin/reports" }, // New Link
    { label: "Import Keys", href: "/admin/import" },
    { label: "Settings", href: "/admin/settings" },
];

interface SidebarProps {
    isOpen: boolean;
    onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
    const pathname = usePathname();
    const { user, logout } = useAuth();

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
            </aside>
        </>
    );
}
