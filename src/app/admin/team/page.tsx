"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { TeamService } from "@/lib/services/TeamService";
import { MemberProfile, Role } from "@/types";

export default function TeamPage() {
    const { user, profile } = useAuth();
    const [members, setMembers] = useState<MemberProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [inviteEmail, setInviteEmail] = useState("");
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const fetchMembers = async () => {
        if (profile?.orgId) {
            try {
                const data = await TeamService.getMembers(profile.orgId);
                setMembers(data);
            } catch (err) {
                console.error(err);
                setError("Failed to load members");
            } finally {
                setLoading(false);
            }
        }
    };

    useEffect(() => {
        fetchMembers();
    }, [profile?.orgId]);

    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setSuccess("");
        if (!profile?.orgId) return;

        try {
            await TeamService.inviteMember(inviteEmail, "WORKER", profile.orgId);
            setSuccess("User added to team successfully!");
            setInviteEmail("");
            fetchMembers();
        } catch (err: any) {
            setError(err.message);
        }
    };

    const handleRoleChange = async (uid: string, newRole: Role) => {
        try {
            await TeamService.updateMemberRole(uid, newRole);
            setMembers(prev => prev.map(m => m.uid === uid ? { ...m, role: newRole } : m));
        } catch (err: any) {
            alert("Failed to update role: " + err.message);
        }
    };

    const handleRemove = async (uid: string) => {
        if (!confirm("Are you sure you want to remove this member from the organization?")) return;
        try {
            await TeamService.removeMember(uid);
            setMembers(prev => prev.filter(m => m.uid !== uid));
        } catch (err: any) {
            alert("Failed to remove member: " + err.message);
        }
    };

    if (loading) return <div className="p-6">Loading team...</div>;

    return (
        <div className="p-6 max-w-6xl mx-auto space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold dark:text-white">Team Management</h1>
                <div className="text-sm text-gray-500">
                    Organization ID: <span className="font-mono">{profile?.orgId}</span>
                </div>
            </div>

            {/* Invite Section */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-semibold mb-4 dark:text-white">Add Team Member</h2>
                <form onSubmit={handleInvite} className="flex gap-4 items-end">
                    <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email Address</label>
                        <input
                            type="email"
                            required
                            value={inviteEmail}
                            onChange={e => setInviteEmail(e.target.value)}
                            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-transparent dark:text-white"
                            placeholder="user@example.com"
                        />
                    </div>
                    <button
                        type="submit"
                        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded font-medium disabled:opacity-50"
                        disabled={!inviteEmail}
                    >
                        Add Member
                    </button>
                </form>
                {error && <p className="mt-2 text-red-500 text-sm">{error}</p>}
                {success && <p className="mt-2 text-green-500 text-sm">{success}</p>}
                <p className="mt-2 text-xs text-gray-500">Note: User must already have an account to be added by email.</p>
            </div>

            {/* Members List */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
                        <tr>
                            <th className="p-4 font-medium text-gray-900 dark:text-white">Name / Email</th>
                            <th className="p-4 font-medium text-gray-900 dark:text-white">Role</th>
                            <th className="p-4 font-medium text-gray-900 dark:text-white text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {members.map(member => (
                            <tr key={member.uid} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                <td className="p-4">
                                    <div className="font-medium dark:text-white">{member.displayName}</div>
                                    <div className="text-gray-500">{member.email}</div>
                                </td>
                                <td className="p-4">
                                    <select
                                        value={member.role}
                                        onChange={(e) => handleRoleChange(member.uid, e.target.value as Role)}
                                        disabled={member.uid === user?.uid} // Can't change own role
                                        className="p-1 border rounded bg-transparent dark:border-gray-600 dark:text-gray-300"
                                    >
                                        <option value="ORG_ADMIN">Admin</option>
                                        <option value="MANAGER">Manager</option>
                                        <option value="WORKER">Worker</option>
                                        <option value="USER">User (Read only)</option>
                                    </select>
                                </td>
                                <td className="p-4 text-right">
                                    {member.uid !== user?.uid && (
                                        <button
                                            onClick={() => handleRemove(member.uid)}
                                            className="text-red-600 hover:text-red-800 text-sm font-medium"
                                        >
                                            Remove
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                        {members.length === 0 && (
                            <tr>
                                <td colSpan={3} className="p-8 text-center text-gray-500">No members found</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
