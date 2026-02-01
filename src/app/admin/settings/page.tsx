"use client";

import React, { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { GeneralSettings } from "@/components/settings/GeneralSettings";
import { TeamSettings } from "@/components/settings/TeamSettings";
import { BillingSettings } from "@/components/settings/BillingSettings";
import { ImportTools } from "@/components/settings/ImportTools";

type Tab = "GENERAL" | "TEAM" | "BILLING" | "IMPORT";

const SettingsPage = () => {
    const { user, profile } = useAuth();
    const [activeTab, setActiveTab] = useState<Tab>("GENERAL");

    return (
        <div className="mx-auto max-w-5xl p-6">
            <h1 className="mb-8 text-3xl font-bold dark:text-white">Settings & Administration</h1>

            {/* Profile Header */}
            <div className="mb-8 flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-xl font-bold text-blue-600 dark:bg-blue-900 dark:text-blue-300">
                    {user?.email?.[0].toUpperCase() || "U"}
                </div>
                <div>
                    <p className="font-medium text-gray-900 dark:text-white">{user?.displayName || "User"}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{user?.email}</p>
                    <p className="mt-1 text-xs text-gray-400">UID: {user?.uid}</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="mb-8 border-b border-gray-200 dark:border-gray-700">
                <ul className="-mb-px flex flex-wrap text-center text-sm font-medium">
                    <TabItem label="General" isActive={activeTab === "GENERAL"} onClick={() => setActiveTab("GENERAL")} />
                    <TabItem label="Team Members" isActive={activeTab === "TEAM"} onClick={() => setActiveTab("TEAM")} />
                    <TabItem label="Billing" isActive={activeTab === "BILLING"} onClick={() => setActiveTab("BILLING")} />
                    <TabItem label="Import Tools" isActive={activeTab === "IMPORT"} onClick={() => setActiveTab("IMPORT")} />
                </ul>
            </div>

            {/* Content Content */}
            <div className="min-h-[400px]">
                {activeTab === "GENERAL" && <GeneralSettings />}
                {activeTab === "TEAM" && <TeamSettings />}
                {activeTab === "BILLING" && <BillingSettings />}
                {activeTab === "IMPORT" && <ImportTools />}
            </div>
        </div>
    );
};

function TabItem({ label, isActive, onClick }: { label: string, isActive: boolean, onClick: () => void }) {
    return (
        <li className="me-2">
            <button
                onClick={onClick}
                className={`group inline-flex items-center justify-center rounded-t-lg border-b-2 p-4 ${(isActive
                    ? "border-blue-600 text-blue-600 dark:border-blue-500 dark:text-blue-500"
                    : "border-transparent hover:border-gray-300 hover:text-gray-600 dark:hover:text-gray-300"
                )}`}
            >
                {label}
            </button>
        </li>
    );
}

export default SettingsPage;
