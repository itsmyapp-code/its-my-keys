"use client";

import React from "react";

export default function HelpPage() {
    return (
        <div className="container mx-auto max-w-4xl p-4 sm:p-6 lg:p-8">
            <h1 className="mb-8 text-3xl font-bold text-gray-900 dark:text-white">Help & Support</h1>

            <div className="space-y-8">
                {/* Section: Getting Started */}
                <section className="rounded-xl bg-white p-6 shadow-sm dark:bg-gray-800">
                    <h2 className="mb-4 text-xl font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                        <span>🚀</span> Getting Started
                    </h2>
                    <ul className="list-disc pl-5 space-y-2 text-gray-600 dark:text-gray-300">
                        <li>
                            <strong>Adding Keys:</strong> Go to "Add Key" to register a new physical key or asset. You can assign it a name, type, and area.
                        </li>
                    </ul>
                </section>

                {/* Section: Daily Operations */}
                <section className="rounded-xl bg-white p-6 shadow-sm dark:bg-gray-800">
                    <h2 className="mb-4 text-xl font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                        <span>🔑</span> Daily Operations
                    </h2>
                    <div className="space-y-4 text-gray-600 dark:text-gray-300">
                        <div>
                            <h3 className="font-medium text-gray-800 dark:text-white">Checking Out a Key</h3>
                            <p>Tap "IDENTIFY ASSET" in the sidebar to open the scanner. Scan the key's QR code. Select "Check Out" and choose the team member taking the key.</p>
                        </div>
                        <div>
                            <h3 className="font-medium text-gray-800 dark:text-white">Returning a Key</h3>
                            <p>Scan the key again. The system will recognize it's currently out and offer a "Return" button.</p>
                        </div>
                    </div>
                </section>

                {/* Section: Mobile App */}
                <section className="rounded-xl bg-white p-6 shadow-sm dark:bg-gray-800">
                    <h2 className="mb-4 text-xl font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                        <span>📱</span> Using the Mobile App
                    </h2>
                    <p className="text-gray-600 dark:text-gray-300">
                        ItsMyKeys is designed to work seamlessly on your phone. You can install it as an App:
                    </p>
                    <ul className="mt-2 list-disc pl-5 space-y-1 text-gray-600 dark:text-gray-300">
                        <li><strong>iOS:</strong> Tap the Share button in Safari &rarr; "Add to Home Screen".</li>
                        <li><strong>Android:</strong> Tap the menu &rarr; "Install App" or "Add to Home Screen".</li>
                    </ul>
                </section>

                {/* Section: Troubleshooting */}
                <section className="rounded-xl bg-white p-6 shadow-sm dark:bg-gray-800">
                    <h2 className="mb-4 text-xl font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                        <span>❓</span> Troubleshooting
                    </h2>
                    <div className="space-y-3 text-gray-600 dark:text-gray-300">
                        <p><strong>Scanner not working?</strong> Ensure you have granted camera permissions to the browser.</p>
                        <p><strong>Forgot Password?</strong> Use the "Forgot Password?" link on the login screen to reset it.</p>
                        <p><strong>Need more help?</strong> Contact support at <a href="mailto:support@itsmyapp.co.uk" className="text-blue-600 hover:underline">support@itsmyapp.co.uk</a>.</p>
                    </div>
                </section>
            </div>
        </div>
    );
}
