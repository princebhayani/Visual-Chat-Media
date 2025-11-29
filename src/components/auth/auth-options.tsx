"use client";

import { useState } from "react";
import { Mail } from "lucide-react";
import { signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebase";

import { Button } from "@/components/ui/button";

const AuthOptions = () => {
	const [error, setError] = useState<string | null>(null);

	const handleGoogleLogin = async () => {
		setError(null);
		try {
			await signInWithPopup(auth, googleProvider);
		} catch (err: any) {
			console.error("Unable to start Google login", err);
			setError(err.message ?? "We couldn't reach Google. Double-check your Firebase configuration.");
		}
	};

	return (
		<section className='flex min-h-screen items-center justify-center bg-left-panel px-4'>
			<div className='w-full max-w-md rounded-2xl border border-gray-700/60 bg-gray-primary/80 p-8 shadow-2xl backdrop-blur'>
				<div className='text-center'>
					<h1 className='text-2xl font-semibold text-white'>Welcome to Visual Chat Media</h1>
					<p className='mt-2 text-sm text-gray-400'>Sign in with your Google account to continue.</p>
				</div>

				<div className='mt-8 space-y-3'>
					<Button
						type='button'
						variant='secondary'
						className='w-full justify-center gap-2'
						onClick={handleGoogleLogin}
					>
						<Mail className='h-4 w-4' />
						Continue with Gmail
					</Button>
				</div>

				{error && <p className='mt-4 text-sm text-red-400 text-center'>{error}</p>}
			</div>
		</section>
	);
};

export default AuthOptions;

