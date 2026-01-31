"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import {
    onAuthStateChanged,
    User,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase/client";
import { UserProfile, Organization } from "@/types";

interface AuthContextType {
    user: User | null;
    profile: UserProfile | null;
    loading: boolean;
    organization: Organization | null;
    signInWithEmail: (email: string, pass: string) => Promise<void>;
    signUpWithEmail: (email: string, pass: string) => Promise<void>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    profile: null,
    loading: true,
    organization: null,
    signInWithEmail: async () => { },
    signUpWithEmail: async () => { },
    logout: async () => { },
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [organization, setOrganization] = useState<Organization | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            setUser(firebaseUser);

            if (firebaseUser) {
                // Fetch user profile from Firestore
                try {
                    const docRef = doc(db, "users", firebaseUser.uid);
                    const docSnap = await getDoc(docRef);
                    if (docSnap.exists()) {
                        const userData = docSnap.data() as UserProfile;
                        setProfile(userData);

                        // Fetch Organization
                        if (userData.orgId) {
                            const orgRef = doc(db, "organizations", userData.orgId);
                            const orgSnap = await getDoc(orgRef);
                            if (orgSnap.exists()) {
                                setOrganization({ id: orgSnap.id, ...orgSnap.data() } as Organization);
                            }
                        }
                    } else {
                        // Handle case where user exists in Auth but not in Firestore (e.g. migration)
                        console.error("No user profile found");
                        setProfile(null);
                        setOrganization(null);
                    }
                } catch (error) {
                    console.error("Error fetching user profile:", error);
                }
            } else {
                setProfile(null);
                setOrganization(null);
            }

            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const signInWithEmail = async (email: string, pass: string) => {
        await signInWithEmailAndPassword(auth, email, pass);
    };

    const signUpWithEmail = async (email: string, pass: string) => {
        await createUserWithEmailAndPassword(auth, email, pass);
    };

    const logout = async () => {
        try {
            await signOut(auth);
            setProfile(null);
            setOrganization(null);
        } catch (error) {
            console.error("Error signing out", error);
        }
    };

    return (
        <AuthContext.Provider value={{ user, profile, organization, loading, signInWithEmail, signUpWithEmail, logout }}>
            {children}
        </AuthContext.Provider>
    );
}
