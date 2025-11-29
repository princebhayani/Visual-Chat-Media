"use client";

import { LogOut } from "lucide-react";
import { signOut } from "firebase/auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { auth } from "@/lib/firebase";
import { authedFetch } from "@/lib/api-client";
import { useFirebaseAuthContext } from "@/providers/firebase-auth-provider";

const UserMenu = () => {
	const { user } = useFirebaseAuthContext();

	if (!user) {
		return null;
	}

	const initials = user.displayName ?? user.email ?? "VCM";

	const handleLogout = async () => {
		try {
			await authedFetch("/users/status", {
				method: "POST",
				body: JSON.stringify({ isOnline: false }),
			});
		} catch (error) {
			console.error("Failed to update status before logout", error);
		} finally {
			await signOut(auth);
		}
	};

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<button
					type='button'
					className='rounded-full border border-gray-600/80 p-0.5 transition hover:border-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50'
				>
					<Avatar className='h-10 w-10'>
						<AvatarImage src={user.photoURL ?? undefined} alt={user.displayName ?? "Account avatar"} />
						<AvatarFallback>{initials.slice(0, 2).toUpperCase()}</AvatarFallback>
					</Avatar>
				</button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align='end' className='w-60'>
				<DropdownMenuLabel>
					<p className='text-sm font-medium'>{user.displayName ?? "Authenticated user"}</p>
					{user.email && <p className='text-xs text-gray-500 truncate'>{user.email}</p>}
				</DropdownMenuLabel>
				<DropdownMenuSeparator />
				<DropdownMenuItem
					className='text-red-500 focus:text-red-500'
					onSelect={(event) => {
						event.preventDefault();
						handleLogout();
					}}
				>
					<LogOut className='mr-2 h-4 w-4' />
					Sign out
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
};

export default UserMenu;

