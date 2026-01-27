"use client";

import React, { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { doc, serverTimestamp, collection, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { UserProfile } from "@/types";

export function ProfileSetup() {
    const { user } = useAuth();
    const [orgName, setOrgName] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSetup = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        setLoading(true);

        try {
            console.log("Starting atomic setup for user:", user.uid);

            // Create a batch
            const batch = writeBatch(db);

            // 1. Create Organization Ref
            // Generate ID explicitly so we can use it in UserProfile
            const orgRef = doc(collection(db, "organizations"));
            const orgId = orgRef.id;

            // Add org creation to batch
            batch.set(orgRef, {
                id: orgId,
                name: orgName,
                subscriptionStatus: 'TRIAL',
                createdAt: serverTimestamp()
            });

            // 2. Create User Profile Ref
            const userRef = doc(db, "users", user.uid);
            const newProfile: UserProfile = {
                uid: user.uid,
                email: user.email || "",
                displayName: user.displayName || "Admin",
                orgId: orgId,
                role: "SUPER_ADMIN",
                photoURL: user.photoURL || undefined
            };

            // Add user profile creation to batch
            batch.set(userRef, newProfile);

            console.log("Committing batch setup...");
            await batch.commit();
            console.log("Batch setup committed successfully!");

            // Force reload to pick up new profile in Context
            window.location.reload();

        } catch (err: any) {
            console.error("Setup failed (Detailed):", {
                code: err.code,
                message: err.message,
                name: err.name,
                stack: err.stack
            });
            // JSON.stringify can sometimes return empty object for Error types, so constructing manual string
            alert(`Setup failed: ${err.message} (Code: ${err.code})`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] p-4 text-center">
            <h2 className="text-2xl font-bold mb-4">Welcome to ItsMyKeys!</h2>
            <p className="text-gray-500 mb-8 max-w-md">
                It looks like you don't have an organization set up yet.
                Let's create one to get started.
            </p>

            <form onSubmit={handleSetup} className="w-full max-w-sm space-y-4">
                <input
                    type="text"
                    placeholder="Organization Name (e.g. Acme Estates)"
                    value={orgName}
                    onChange={e => setOrgName(e.target.value)}
                    className="w-full p-3 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 outline-none focus:ring-2 focus:ring-primary"
                    required
                    autoFocus
                />
                <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 bg-primary text-primary-foreground font-bold rounded-md hover:opacity-90 transition disabled:opacity-50"
                >
                    {loading ? "Setting up..." : "Create Organization"}
                </button>
            </form>
        </div>
    );
}
