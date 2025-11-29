"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";

type FirebaseAuthContextValue = {
	user: User | null;
	isLoading: boolean;
};

const FirebaseAuthContext = createContext<FirebaseAuthContextValue>({ user: null, isLoading: true });

export const FirebaseAuthProvider = ({ children }: { children: ReactNode }) => {
	const [user, setUser] = useState<User | null>(null);
	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
			setUser(currentUser);
			setIsLoading(false);
		});

		return () => unsubscribe();
	}, []);

	return <FirebaseAuthContext.Provider value={{ user, isLoading }}>{children}</FirebaseAuthContext.Provider>;
};

export const useFirebaseAuthContext = () => useContext(FirebaseAuthContext);

