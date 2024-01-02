import ytdl from "ytdl-core-discord";
import { logger } from "./logger.ts";
import { WebSocketServer, WebSocket } from 'ws'
import { MSG_TYPE } from "common";

const PORT = 4000;

interface Room {
	members: WebSocket[],
	queue: string[],
	status: "play" | "pause" | "none"
};

const ROOMS = new Map<string, Room>();

function addAudioToTheQueue(url: string, roomId: string) {
	const room = ROOMS.get(roomId)!;
	if (!room) {
		return;
	};
	room.queue.push(url);
	ROOMS.set(roomId, { ...room });
	if (room.queue.length === 1) {
		playAudioStream(roomId);
	}
}

function shiftQueue(roomId: string) {
	const room = ROOMS.get(roomId)!;
	if (!room) {
		return undefined;
	};
	const url = room.queue.shift()!;
	ROOMS.set(roomId, {...room, status: "none"});
	return url;
}

async function playAudioStream(roomId: string) {
	let room = ROOMS.get(roomId)!;
	logger.info("queue: ", room.queue);
	if (!room || room.queue.length < 1 || room.status === "play") {
		return;
	}
	const url = room.queue[0];
	ROOMS.set(roomId, { ...room, status: "play" });
	const stream = await ytdl(url, { 
		dlChunkSize: 3000
	});
	stream.on('data', (b: Buffer) => {
		let room = ROOMS.get(roomId)!;
		for (let socket of room.members) {
			socket.send(b);
		}
	})
	stream.on('end', () => {
		logger.info("stream ended.");
		let room = ROOMS.get(roomId)!;
		for (let socket of room.members) {
			socket.send(JSON.stringify({
				type: MSG_TYPE.END_STREAM
			}));
		}
		shiftQueue(roomId);
		playAudioStream(roomId);
	})
	stream.on('error', (error) => {
		logger.error(error);
		shiftQueue(roomId);
	})
}

function joinRoom(roomId: string, socket: WebSocket) {
	const room = ROOMS.get(roomId);
	if (room !== undefined) {
		room.members.push(socket)
		ROOMS.set(roomId, room);
		return
	}
	ROOMS.set(roomId, { members: [socket], status: "none", queue: [] });
}

(async () => {
	const wss = new WebSocketServer({ port: PORT});
	wss.on('connection', (socket) => {
		logger.info("Client connected.");
		socket.on('message', (data) => {
			logger.info(`Message from client: ${data}`);
			const { type, msg } = JSON.parse(data.toString());
			logger.info("Type: ", type);
			switch (type) {
				case MSG_TYPE.CREATE_STREAM: {
					logger.info("Create stream with", msg);
					const { url, roomId } = msg;
					if (!url || !roomId) {
						logger.error("url or roomId not provided.");
						break;
					}
					addAudioToTheQueue(url, roomId);
					break;
				}
				case MSG_TYPE.JOIN_ROOM: {
					logger.info("Join room ", msg);
					const { roomId } = msg;
					if (!roomId) {
						logger.error("roomId not provided.");
						break;
					}
					joinRoom(roomId, socket);
					break;
				}
				default: {
					socket.send("Got message:" + msg);
				}
			}
		})
		socket.on('error', (error) => {
			logger.error(error);
		})
		socket.on('close', () => {
			logger.info('Socket closed.');
		})
	})
	wss.on('error', (error) => {
		logger.error(error);
	})
	wss.on('listening', () => {
		logger.info("Listening on port:", PORT);
	})
})()
