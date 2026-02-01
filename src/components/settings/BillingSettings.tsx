"use client";

import React, { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { loadStripe } from "@stripe/stripe-js";

// Initialize Stripe outside of component to avoid recreating it
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "pk_test_sample_key");

export function BillingSettings() {
    const { user, profile } = useAuth();
    const [loading, setLoading] = useState(false);

    return (
        <div className="space-y-6">
            <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400">
                Billing & Subscription
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Current Plan Card */}
                <div className="p-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                    <h2 className="text-xl font-semibold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-green-600 to-emerald-600">Current Plan</h2>
                    <div className="space-y-3">
                        <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700">
                            <span className="text-gray-500">Plan</span>
                            <span className="font-medium">Free Tier</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700">
                            <span className="text-gray-500">Status</span>
                            <span className="px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">Active</span>
                        </div>
                        <div className="flex justify-between items-center py-2">
                            <span className="text-gray-500">Next Billing</span>
                            <span className="font-medium">--</span>
                        </div>
                    </div>
                </div>

                {/* Payment Method Card */}
                <div className="p-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                    <h2 className="text-xl font-semibold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-pink-600">Payment Methods</h2>
                    <p className="text-sm text-gray-500 mb-4">Manage your credit cards and billing details secure with Stripe.</p>

                    <button
                        className="w-full py-2.5 rounded-lg bg-gray-900 text-white hover:bg-gray-800 transition shadow-sm font-medium disabled:opacity-50"
                        disabled={loading}
                        onClick={() => alert("Stripe Customer Portal integration needed")}
                    >
                        Manage in Stripe Portal
                    </button>
                </div>
            </div>

            {/* Upgrade Options (Demo) */}
            <div className="pt-8">
                <h2 className="text-xl font-bold mb-6">Available Plans</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Basic */}
                    <PlanCard
                        name="Starter"
                        price="Free"
                        features={["Up to 50 Assets", "3 Team Members", "Basic Reports"]}
                        current={true}
                    />
                    {/* Pro */}
                    <PlanCard
                        name="Pro"
                        price="£29/mo"
                        features={["Unlimited Assets", "Unlimited Team", "Advanced Reports", "API Access"]}
                        highlight
                    />
                    {/* Enterprise */}
                    <PlanCard
                        name="Enterprise"
                        price="Contact Us"
                        features={["Custom SLA", "Dedicated Support", "On-premise Options"]}
                    />
                </div>
            </div>
        </div>
    );
}

function PlanCard({ name, price, features, current, highlight }: { name: string, price: string, features: string[], current?: boolean, highlight?: boolean }) {
    return (
        <div className={`relative p-6 rounded-xl border ${highlight ? 'border-blue-500 shadow-xl ring-1 ring-blue-500 bg-white dark:bg-gray-800' : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'}`}>
            {highlight && <div className="absolute top-0 right-0 -mr-2 -mt-2 px-3 py-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-bold rounded-full shadow-md">POPULAR</div>}
            <h3 className="text-lg font-bold mb-2">{name}</h3>
            <div className="text-3xl font-extrabold mb-4">{price}</div>
            <ul className="space-y-2 mb-6 text-sm text-gray-600 dark:text-gray-300">
                {features.map((f, i) => (
                    <li key={i} className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                        {f}
                    </li>
                ))}
            </ul>
            <button
                className={`w-full py-2 rounded-lg font-medium transition ${current
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : highlight
                        ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg hover:shadow-blue-500/25'
                        : 'bg-white border border-gray-300 hover:bg-gray-50 text-gray-900'}`}
                disabled={current}
            >
                {current ? "Current Plan" : "Upgrade"}
            </button>
        </div>
    )
}
