/**
 * mediasoup Integration Handler
 * 
 * Server-side integration for mediasoup SFU
 * Handles room creation, transport management, and producer/consumer creation
 */

import { Router, Worker } from 'mediasoup/lib/types';
import * as mediasoup from 'mediasoup';

export interface MediaSoupRoom {
	roomId: string;
	router: Router;
	producers: Map<string, any>; // Producer info
	consumers: Map<string, any>; // Consumer info
	transports: Map<string, any>; // Transport info
}

export class MediaSoupHandler {
	private workers: Worker[] = [];
	private rooms: Map<string, MediaSoupRoom> = new Map();

	/**
	 * Initialize mediasoup workers
	 */
	async initialize(): Promise<void> {
		const numWorkers = 1; // Start with 1 worker, scale as needed

		for (let i = 0; i < numWorkers; i++) {
			const worker = await mediasoup.createWorker({
				logLevel: 'warn',
				logTags: ['info', 'ice', 'dtls', 'rtp', 'srtp', 'rtcp'],
				rtcMinPort: 40000,
				rtcMaxPort: 49999,
			});

			worker.on('died', () => {
				console.error('mediasoup worker died, exiting in 2 seconds...');
				setTimeout(() => process.exit(1), 2000);
			});

			this.workers.push(worker);
		}

		console.log(`[MediaSoup] Initialized ${this.workers.length} worker(s)`);
	}

	/**
	 * Create or get room
	 */
	async createRoom(roomId: string): Promise<MediaSoupRoom> {
		if (this.rooms.has(roomId)) {
			return this.rooms.get(roomId)!;
		}

		// Get worker (round-robin)
		const worker = this.workers[this.rooms.size % this.workers.length];

		// Create router
		const router = await worker.createRouter({
			mediaCodecs: [
				{
					kind: 'audio',
					mimeType: 'audio/opus',
					clockRate: 48000,
					channels: 2,
				},
				{
					kind: 'video',
					mimeType: 'video/VP8',
					clockRate: 90000,
				},
				{
					kind: 'video',
					mimeType: 'video/H264',
					clockRate: 90000,
					parameters: {
						'packetization-mode': 1,
						'profile-level-id': '42e01f',
					},
				},
				{
					kind: 'video',
					mimeType: 'video/VP9',
					clockRate: 90000,
				},
			],
		});

		const room: MediaSoupRoom = {
			roomId,
			router,
			producers: new Map(),
			consumers: new Map(),
			transports: new Map(),
		};

		this.rooms.set(roomId, room);
		console.log(`[MediaSoup] Created room: ${roomId}`);

		return room;
	}

	/**
	 * Create WebRTC transport
	 */
	async createTransport(
		roomId: string,
		direction: 'send' | 'recv'
	): Promise<any> {
		const room = this.rooms.get(roomId);
		if (!room) {
			throw new Error(`Room ${roomId} not found`);
		}

		const transport = await room.router.createWebRtcTransport({
			listenIps: [
				{
					ip: '0.0.0.0',
					announcedIp: process.env.MEDIASOUP_ANNOUNCED_IP || '127.0.0.1',
				},
			],
			enableUdp: true,
			enableTcp: true,
			preferUdp: true,
		});

		room.transports.set(transport.id, {
			transport,
			direction,
		});

		return {
			id: transport.id,
			iceParameters: transport.iceParameters,
			iceCandidates: transport.iceCandidates,
			dtlsParameters: transport.dtlsParameters,
		};
	}

	/**
	 * Connect transport
	 */
	async connectTransport(
		roomId: string,
		transportId: string,
		dtlsParameters: any
	): Promise<void> {
		const room = this.rooms.get(roomId);
		if (!room) {
			throw new Error(`Room ${roomId} not found`);
		}

		const transportInfo = room.transports.get(transportId);
		if (!transportInfo) {
			throw new Error(`Transport ${transportId} not found`);
		}

		await transportInfo.transport.connect({ dtlsParameters });
	}

	/**
	 * Create producer (send media to SFU)
	 */
	async createProducer(
		roomId: string,
		transportId: string,
		rtpParameters: any,
		kind: 'audio' | 'video'
	): Promise<string> {
		const room = this.rooms.get(roomId);
		if (!room) {
			throw new Error(`Room ${roomId} not found`);
		}

		const transportInfo = room.transports.get(transportId);
		if (!transportInfo) {
			throw new Error(`Transport ${transportId} not found`);
		}

		const producer = await transportInfo.transport.produce({
			kind,
			rtpParameters,
		});

		room.producers.set(producer.id, {
			producer,
			transportId,
			kind,
		});

		// Notify other participants about new producer
		this.broadcastNewProducer(room, producer.id, kind);

		return producer.id;
	}

	/**
	 * Create consumer (receive media from SFU)
	 */
	async createConsumer(
		roomId: string,
		transportId: string,
		producerId: string
	): Promise<any> {
		const room = this.rooms.get(roomId);
		if (!room) {
			throw new Error(`Room ${roomId} not found`);
		}

		const producerInfo = room.producers.get(producerId);
		if (!producerInfo) {
			throw new Error(`Producer ${producerId} not found`);
		}

		const transportInfo = room.transports.get(transportId);
		if (!transportInfo) {
			throw new Error(`Transport ${transportId} not found`);
		}

		const consumer = await transportInfo.transport.consume({
			producerId: producerInfo.producer.id,
			rtpCapabilities: transportInfo.transport.router.rtpCapabilities,
		});

		room.consumers.set(consumer.id, {
			consumer,
			transportId,
			producerId,
		});

		return {
			id: consumer.id,
			producerId: producerInfo.producer.id,
			kind: producerInfo.kind,
			rtpParameters: consumer.rtpParameters,
		};
	}

	/**
	 * Close producer
	 */
	async closeProducer(roomId: string, producerId: string): Promise<void> {
		const room = this.rooms.get(roomId);
		if (!room) {
			return;
		}

		const producerInfo = room.producers.get(producerId);
		if (producerInfo) {
			producerInfo.producer.close();
			room.producers.delete(producerId);
		}
	}

	/**
	 * Close consumer
	 */
	async closeConsumer(roomId: string, consumerId: string): Promise<void> {
		const room = this.rooms.get(roomId);
		if (!room) {
			return;
		}

		const consumerInfo = room.consumers.get(consumerId);
		if (consumerInfo) {
			consumerInfo.consumer.close();
			room.consumers.delete(consumerId);
		}
	}

	/**
	 * Get all producers in room
	 */
	getProducers(roomId: string): Array<{ id: string; kind: 'audio' | 'video' }> {
		const room = this.rooms.get(roomId);
		if (!room) {
			return [];
		}

		return Array.from(room.producers.entries()).map(([id, info]) => ({
			id,
			kind: info.kind,
		}));
	}

	/**
	 * Broadcast new producer to all participants
	 */
	private broadcastNewProducer(room: MediaSoupRoom, producerId: string, kind: 'audio' | 'video'): void {
		// This would emit to all sockets in the room
		// Implementation depends on your Socket.io setup
	}

	/**
	 * Close room
	 */
	async closeRoom(roomId: string): Promise<void> {
		const room = this.rooms.get(roomId);
		if (!room) {
			return;
		}

		// Close all producers
		room.producers.forEach((info) => {
			info.producer.close();
		});

		// Close all consumers
		room.consumers.forEach((info) => {
			info.consumer.close();
		});

		// Close all transports
		room.transports.forEach((info) => {
			info.transport.close();
		});

		// Close router
		room.router.close();

		this.rooms.delete(roomId);
		console.log(`[MediaSoup] Closed room: ${roomId}`);
	}
}

// Singleton instance
export const mediaSoupHandler = new MediaSoupHandler();

