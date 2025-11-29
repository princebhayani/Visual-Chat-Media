import { useEffect, useRef, useState } from "react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../ui/dropdown-menu";
import { ImageIcon, Plus, Video } from "lucide-react";
import { Dialog, DialogContent, DialogDescription } from "../ui/dialog";
import { Button } from "../ui/button";
import Image from "next/image";
import ReactPlayer from "react-player";
import toast from "react-hot-toast";
import { useConversationStore } from "@/store/chat-store";
import { authedFetch } from "@/lib/api-client";
import { useSWRConfig } from "swr";

const MediaDropdown = () => {
	const imageInput = useRef<HTMLInputElement>(null);
	const videoInput = useRef<HTMLInputElement>(null);
	const [selectedImage, setSelectedImage] = useState<File | null>(null);
	const [selectedVideo, setSelectedVideo] = useState<File | null>(null);
	const [imagePreview, setImagePreview] = useState<string | null>(null);
	const [videoPreview, setVideoPreview] = useState<string | null>(null);

	const [isLoading, setIsLoading] = useState(false);
	const { selectedConversation } = useConversationStore();
	const { mutate } = useSWRConfig();

	const handleSendMedia = async (content: string, messageType: "image" | "video") => {
		if (!selectedConversation) return;
		setIsLoading(true);
		try {
			await authedFetch("/messages", {
				method: "POST",
				body: JSON.stringify({
					conversationId: selectedConversation.id,
					content,
					messageType,
				}),
			});

			await mutate(`/messages/${selectedConversation.id}`);
		} catch (err) {
			toast.error("Failed to send media");
			console.error(err);
		} finally {
			setIsLoading(false);
		}
	};

	useEffect(() => {
		if (!selectedImage) {
			setImagePreview(null);
			return;
		}
		const reader = new FileReader();
		reader.onload = (e) => setImagePreview(e.target?.result as string);
		reader.readAsDataURL(selectedImage);
	}, [selectedImage]);

	useEffect(() => {
		if (!selectedVideo) {
			setVideoPreview(null);
			return;
		}
		const reader = new FileReader();
		reader.onload = (e) => setVideoPreview(e.target?.result as string);
		reader.readAsDataURL(selectedVideo);
	}, [selectedVideo]);

	if (!selectedConversation) {
		return null;
	}

	return (
		<>
			<input
				type='file'
				ref={imageInput}
				accept='image/*'
				onChange={(e) => setSelectedImage(e.target.files?.[0] ?? null)}
				hidden
			/>

			<input
				type='file'
				ref={videoInput}
				accept='video/*'
				onChange={(e) => setSelectedVideo(e.target.files?.[0] ?? null)}
				hidden
			/>

			{selectedImage && imagePreview && (
				<MediaImageDialog
					isOpen={selectedImage !== null}
					onClose={() => setSelectedImage(null)}
					imageSrc={imagePreview}
					isLoading={isLoading}
					onSend={async () => {
						await handleSendMedia(imagePreview, "image");
						setSelectedImage(null);
					}}
				/>
			)}

			{selectedVideo && videoPreview && (
				<MediaVideoDialog
					isOpen={selectedVideo !== null}
					onClose={() => setSelectedVideo(null)}
					videoSrc={videoPreview}
					isLoading={isLoading}
					onSend={async () => {
						await handleSendMedia(videoPreview, "video");
						setSelectedVideo(null);
					}}
				/>
			)}

			<DropdownMenu>
				<DropdownMenuTrigger>
					<Plus className='text-gray-600 dark:text-gray-400' />
				</DropdownMenuTrigger>

				<DropdownMenuContent>
					<DropdownMenuItem onClick={() => imageInput.current?.click()}>
						<ImageIcon size={18} className='mr-1' /> Photo
					</DropdownMenuItem>
					<DropdownMenuItem onClick={() => videoInput.current?.click()}>
						<Video size={20} className='mr-1' />
						Video
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
		</>
	);
};
export default MediaDropdown;

type MediaImageDialogProps = {
	isOpen: boolean;
	onClose: () => void;
	imageSrc: string;
	isLoading: boolean;
	onSend: () => Promise<void>;
};

const MediaImageDialog = ({ isOpen, onClose, imageSrc, isLoading, onSend }: MediaImageDialogProps) => {
	return (
		<Dialog
			open={isOpen}
			onOpenChange={(isOpen) => {
				if (!isOpen) onClose();
			}}
		>
			<DialogContent>
				<DialogDescription className='flex flex-col gap-10 justify-center items-center'>
					{imageSrc && <Image src={imageSrc} width={300} height={300} alt='selected image' />}
					<Button className='w-full' disabled={isLoading} onClick={onSend}>
						{isLoading ? "Sending..." : "Send"}
					</Button>
				</DialogDescription>
			</DialogContent>
		</Dialog>
	);
};

type MediaVideoDialogProps = {
	isOpen: boolean;
	onClose: () => void;
	videoSrc: string;
	isLoading: boolean;
	onSend: () => Promise<void>;
};

const MediaVideoDialog = ({ isOpen, onClose, videoSrc, isLoading, onSend }: MediaVideoDialogProps) => {
	return (
		<Dialog
			open={isOpen}
			onOpenChange={(isOpen) => {
				if (!isOpen) onClose();
			}}
		>
			<DialogContent>
				<DialogDescription>Video</DialogDescription>
				<div className='w-full'>
					{videoSrc && <ReactPlayer url={videoSrc} controls width='100%' />}
				</div>
				<Button className='w-full' disabled={isLoading} onClick={onSend}>
					{isLoading ? "Sending..." : "Send"}
				</Button>
			</DialogContent>
		</Dialog>
	);
};