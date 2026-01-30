import { db } from "../firebase/client";
import {
    collection,
    query,
    where,
    getDocs,
    doc,
    updateDoc,
    getDoc,
    Timestamp,
    serverTimestamp
} from "firebase/firestore";
import { MemberProfile, Role } from "@/types";

const USERS_COLLECTION = "users";

export const TeamService = {
    /**
     * Get all members of an organization
     * Note: Currently we store user profiles in a top-level 'users' collection with an 'orgId' field.
     * In the future, we might want to mirror this to a subcollection 'organizations/{orgId}/members' for easier RBAC.
     * For now, we will query the 'users' collection.
     */
    getMembers: async (orgId: string): Promise<MemberProfile[]> => {
        const q = query(collection(db, "users"), where("orgId", "==", orgId));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                uid: doc.id,
                email: data.email,
                displayName: data.displayName || "Unknown",
                role: data.role || "user",
                photoURL: data.photoURL,
                joinedAt: data.createdAt || Timestamp.now()
            } as MemberProfile;
        });
    },

    /**
     * Update a member's role
     */
    updateMemberRole: async (uid: string, newRole: Role) => {
        const userRef = doc(db, "users", uid);
        await updateDoc(userRef, { role: newRole });
    },

    /**
     * Remove a member from the organization
     * This effectively "deactivates" them or removes their orgId
     */
    removeMember: async (uid: string) => {
        const userRef = doc(db, "users", uid);
        // We don't delete the user account (Auth), just remove their association
        await updateDoc(userRef, {
            orgId: "",
            role: "USER" // Reset to default basic user
        });
    },

    /**
     * Invite a member (Placeholders)
     * In a real app, this would trigger a Cloud Function to send an email.
     * For now, we might just create a "phantom" profile or rely on them signing up.
     * Let's assume we just log it for now or create a pre-approved doc.
     */
    inviteMember: async (email: string, role: Role, orgId: string) => {
        // Check if user already exists
        const q = query(collection(db, "users"), where("email", "==", email));
        const snapshot = await getDocs(q);

        if (!snapshot.empty) {
            // User exists, update them
            const userDoc = snapshot.docs[0];
            await updateDoc(userDoc.ref, {
                orgId: orgId,
                role: role
            });
            return { status: "added", uid: userDoc.id };
        } else {
            // User doesn't exist. 
            // We can't create an Auth user from client SDK easily without logging them in.
            // Validating this requirement: distinct from "Bulk Input" but related.
            // For this phase, we will return a message saying "Ask user to sign up first" 
            // OR create an "Invites" collection.

            // Let's create an 'invites' collection so when they sign up, they get auto-added?
            // Or simplified: Just fail for now.
            throw new Error("User with this email not found. Use the Bulk Import feature to pre-create accounts is not fully supported yet without Cloud Functions. Ask them to sign up, then add them.");
        }
    }
};
