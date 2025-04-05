'use client';

import { useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { api } from '@/api';
import { toast } from 'react-hot-toast';
import axios from 'axios';

type CreateMessageFormProps = {
	communityId: string;
	onMessageSent?: () => void;
};

export default function CreateMessageForm({ communityId, onMessageSent }: CreateMessageFormProps) {
	const { publicKey, signTransaction } = useWallet();
	const [content, setContent] = useState('');
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [communityData, setCommunityData] = useState<any>(null);
	const [image, setImage] = useState<File | null>(null);
	const [imagePreview, setImagePreview] = useState<string | null>(null);
	const [uploadingImage, setUploadingImage] = useState(false);

	// Fetch the actual community data to get its UUID
	useEffect(() => {
		const fetchCommunityData = async () => {
			try {
				const { data } = await api.get(`/communities/${communityId}/messages`);
				setCommunityData(data);
				console.log('Community data loaded:', data);
			} catch (err) {
				console.error('Error fetching community data:', err);
				setError('Could not load community data. Please refresh the page.');
			}
		};

		fetchCommunityData();
	}, [communityId]);

	const uploadToPinata = async (file: File): Promise<string> => {
		try {
			setUploadingImage(true);
			toast.loading('Uploading image...', { id: 'upload' });

			const formData = new FormData();
			formData.append('file', file);

			const res = await axios.post('https://api.pinata.cloud/pinning/pinFileToIPFS', formData, {
				headers: {
					'Content-Type': 'multipart/form-data',
					pinata_api_key: process.env.NEXT_PUBLIC_PINATA_API_KEY!,
					pinata_secret_api_key: process.env.NEXT_PUBLIC_PINATA_SECRET_KEY!,
				},
			});

			const url = `https://gateway.pinata.cloud/ipfs/${res.data.IpfsHash}`;
			toast.success('Image uploaded successfully!', { id: 'upload' });
			return url;
		} catch (error) {
			console.error('Error uploading to Pinata:', error);
			toast.error('Failed to upload image', { id: 'upload' });
			throw new Error('Failed to upload image');
		} finally {
			setUploadingImage(false);
		}
	};

	const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (file) {
			if (file.size > 5 * 1024 * 1024) {
				// 5MB limit
				toast.error('Image size should be less than 5MB');
				return;
			}

			setImage(file);
			// 미리보기 생성
			const reader = new FileReader();
			reader.onloadend = () => {
				setImagePreview(reader.result as string);
			};
			reader.readAsDataURL(file);
		}
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!content.trim()) {
			toast.error('Please enter a message');
			return;
		}
		if (!communityData?.id) {
			setError('Community data not loaded yet. Please wait or refresh the page.');
			return;
		}

		if (!publicKey) {
			toast.error('Please connect your wallet');
			return;
		}

		setLoading(true);
		setError(null);

		try {
			let imageUrl = null;
			if (image) {
				imageUrl = await uploadToPinata(image);
			}

			toast.loading('Sending message...', { id: 'message' });

			console.log('imageUrl', imageUrl);
			await api.post(`/messages`, {
				content,
				communityId,
				imageUrl,
			});

			setContent('');
			setImage(null);
			setImagePreview(null);
			onMessageSent?.();
			toast.success('Message sent successfully!', { id: 'message' });
		} catch (error) {
			console.error('Error sending message:', error);
			toast.error('Failed to send message');
		} finally {
			setLoading(false);
		}
	};

	return (
		<form onSubmit={handleSubmit} className="space-y-2">
			{error && (
				<div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-md p-2 text-red-800 dark:text-red-300 text-sm">
					{error}
				</div>
			)}

			<div className="flex items-start gap-2">
				<div className="flex-1">
					<input
						type="text"
						value={content}
						onChange={(e) => setContent(e.target.value)}
						placeholder="Type your message..."
						disabled={loading || uploadingImage || !communityData}
						className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800"
					/>
				</div>
				<div className="flex flex-col gap-2">
					<label className="cursor-pointer">
						<div
							className={`w-10 h-10 bg-[rgba(255,182,193,0.5)] hover:bg-[rgba(255,182,193,0.6)] rounded-md flex items-center justify-center border-2 border-[rgba(255,182,193,0.5)] ${
								uploadingImage ? 'opacity-50' : ''
							}`}
						>
							{uploadingImage ? (
								<div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
							) : (
								<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
									<path
										fillRule="evenodd"
										d="M4 5a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-1.586a1 1 0 01-.707-.293l-1.121-1.121A2 2 0 0011.172 3H8.828a2 2 0 00-1.414.586L6.293 4.707A1 1 0 015.586 5H4zm6 9a3 3 0 100-6 3 3 0 000 6z"
										clipRule="evenodd"
									/>
								</svg>
							)}
						</div>
						<input
							type="file"
							accept=".jpg,.jpeg,.png,.gif"
							onChange={handleImageChange}
							disabled={uploadingImage}
							className="hidden"
						/>
					</label>
					<button
						type="submit"
						disabled={loading || !content.trim() || uploadingImage || !publicKey || !communityData}
						className="w-10 h-10 bg-[rgba(255,182,193,0.5)] hover:bg-[rgba(255,182,193,0.6)] rounded-md flex items-center justify-center border-2 border-[rgba(255,182,193,0.5)] disabled:opacity-50 disabled:cursor-not-allowed"
					>
						{loading ? (
							<div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
						) : (
							<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
								<path
									fillRule="evenodd"
									d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13a1 1 0 102 0V9.414l1.293 1.293a1 1 0 001.414-1.414z"
									clipRule="evenodd"
								/>
							</svg>
						)}
					</button>
				</div>
			</div>

			{imagePreview && (
				<div className="relative">
					<img src={imagePreview} alt="Preview" className="max-w-xs rounded-md" />
					<button
						type="button"
						onClick={() => {
							setImage(null);
							setImagePreview(null);
						}}
						className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
					>
						<svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
							<path
								fillRule="evenodd"
								d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
								clipRule="evenodd"
							/>
						</svg>
					</button>
				</div>
			)}

			{!communityData && <div className="text-xs text-gray-500">Loading community data...</div>}
		</form>
	);
}
