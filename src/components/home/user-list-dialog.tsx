"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { ImageIcon, MessageSquareDiff } from "lucide-react";
import toast from "react-hot-toast";
import { useConversationStore } from "@/store/chat-store";
import { useAuthedSWR } from "@/hooks/useAuthedSWR";
import { authedFetch } from "@/lib/api-client";
import { mapConversation, type BackendConversation } from "@/lib/chat-mappers";

type UserListDialogProps = {
	currentUser: any;
};

const UserListDialog = ({ currentUser }: UserListDialogProps) => {
	const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
	const [groupName, setGroupName] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [selectedImage, setSelectedImage] = useState<File | null>(null);
	const [renderedImage, setRenderedImage] = useState("");

	const imgRef = useRef<HTMLInputElement>(null);
	const dialogCloseRef = useRef<HTMLButtonElement>(null);

	const { data: users } = useAuthedSWR<any[]>("/users");

	const { setSelectedConversation } = useConversationStore();

	const handleCreateConversation = async () => {
		if (selectedUsers.length === 0) return;
		setIsLoading(true);
		try {
			const isGroup = selectedUsers.length > 1;

			const response = await authedFetch<BackendConversation>("/conversations", {
				method: "POST",
				body: JSON.stringify({
					participantIds: selectedUsers,
					isGroup,
					groupName: isGroup ? groupName : undefined,
					groupImageUrl: isGroup ? renderedImage || undefined : undefined,
				}),
			});

			const conversation = mapConversation(response, currentUser?.firebaseUid);

			dialogCloseRef.current?.click();
			setSelectedUsers([]);
			setGroupName("");
			setSelectedImage(null);

			setSelectedConversation(conversation);
		} catch (err) {
			toast.error("Failed to create conversation");
			console.error(err);
		} finally {
			setIsLoading(false);
		}
	};

	useEffect(() => {
		if (!selectedImage) return setRenderedImage("");
		const reader = new FileReader();
		reader.onload = (e) => setRenderedImage(e.target?.result as string);
		reader.readAsDataURL(selectedImage);
	}, [selectedImage]);

	const sanitizedUsers = useMemo(() => users ?? [], [users]);

	return (
		<Dialog>
			<DialogTrigger>
				<MessageSquareDiff size={20} />
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogClose ref={dialogCloseRef} />
					<DialogTitle>USERS</DialogTitle>
				</DialogHeader>

				<DialogDescription>Start a new chat</DialogDescription>
				{renderedImage && (
					<div className='w-16 h-16 relative mx-auto'>
						<Image src={renderedImage} fill alt='group image' className='rounded-full object-cover' />
					</div>
				)}
				<input
					type='file'
					accept='image/*'
					ref={imgRef}
					hidden
					onChange={(e) => setSelectedImage(e.target.files?.[0] ?? null)}
				/>
				{selectedUsers.length > 1 && (
					<>
						<Input placeholder='Group Name' value={groupName} onChange={(e) => setGroupName(e.target.value)} />
						<Button className='flex gap-2' onClick={() => imgRef.current?.click()}>
							<ImageIcon size={20} />
							Group Image
						</Button>
					</>
				)}
				<div className='flex flex-col gap-3 overflow-auto max-h-60'>
					{sanitizedUsers.map((user) => (
						<div
							key={user.id}
							className={`flex gap-3 items-center p-2 rounded cursor-pointer active:scale-95 
								transition-all ease-in-out duration-300
							${selectedUsers.includes(user.id) ? "bg-green-primary" : ""}`}
							onClick={() => {
								if (selectedUsers.includes(user.id)) {
									setSelectedUsers(selectedUsers.filter((id) => id !== user.id));
								} else {
									setSelectedUsers([...selectedUsers, user.id]);
								}
							}}
						>
							<Avatar className='overflow-visible'>
								{user.isOnline && (
									<div className='absolute top-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-foreground' />
								)}

								<AvatarImage src={user.avatarUrl ?? "/placeholder.png"} className='rounded-full object-cover' />
								<AvatarFallback>
									<div className='animate-pulse bg-gray-tertiary w-full h-full rounded-full'></div>
								</AvatarFallback>
							</Avatar>

							<div className='w-full '>
								<div className='flex items-center justify-between'>
									<p className='text-md font-medium'>{user.name || user.email?.split("@")[0]}</p>
								</div>
							</div>
						</div>
					))}
				</div>
				<div className='flex justify-between'>
					<Button variant={"outline"} onClick={() => dialogCloseRef.current?.click()}>
						Cancel
					</Button>
					<Button
						onClick={handleCreateConversation}
						disabled={selectedUsers.length === 0 || (selectedUsers.length > 1 && !groupName) || isLoading}
					>
						{isLoading ? <div className='w-5 h-5 border-t-2 border-b-2 rounded-full animate-spin' /> : "Create"}
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
};
export default UserListDialog;
