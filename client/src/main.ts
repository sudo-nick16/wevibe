import { MSG_TYPE } from 'common';

const sendBtn = document.getElementById("send") as HTMLButtonElement;
const msgInput = document.getElementById("msg") as HTMLInputElement;
const roomInput = document.getElementById("roomId") as HTMLInputElement;
const joinBtn = document.getElementById("join") as HTMLButtonElement;

sendBtn.onclick = () => {
	if (!roomInput) {
		alert("PLEASE JOIN A ROOM FIRST!");
		return;
	}
	if (msgInput) {
		const m = JSON.stringify({ type: MSG_TYPE.CREATE_STREAM, msg: { url: msgInput.value, roomId: roomInput.value } });
		socket.send(m);
	}
}

joinBtn.onclick = () => {
	if (!roomInput) {
		alert("PLEASE JOIN A ROOM FIRST!");
		return;
	}
	const m = JSON.stringify({ type: MSG_TYPE.JOIN_ROOM, msg: { roomId: roomInput.value } })
	socket.send(m);
}

const socket = new WebSocket("ws://localhost:4000");
socket.binaryType = "arraybuffer";

let ctx: AudioContext;
let startTime: number;
let checkpoints: number[] = [];

const onDecode = (sampleRate: number, samplesDecoded: number, lchannel: Float32Array, rchannel: Float32Array) => {
	if (ctx === undefined) {
		console.log("stream connected.");
		ctx = new AudioContext();
		startTime = 1;
	}
	const source = ctx.createBufferSource();
	source.connect(ctx.destination);

	const buffer = ctx.createBuffer(1, samplesDecoded, sampleRate);

	buffer.copyToChannel(lchannel, 0);
	// buffer.copyToChannel(rchannel, 1);

	source.buffer = buffer;
	if (startTime < ctx.currentTime) {
		startTime = ctx.currentTime;
	}
	source.start(startTime);
	startTime += buffer.duration;
}

socket.onmessage = (e: MessageEvent) => {
	const buffer: ArrayBuffer = e.data;
	const view = new DataView(buffer);
	const type = view.getUint32(0);
	console.log(MSG_TYPE[type]);
	switch (type) {
		case MSG_TYPE.END_STREAM: {
			console.log("stream ended...")
			checkpoints.push(startTime);
			console.log({ checkpoints });
			break;
		}
		case MSG_TYPE.CREATE_STREAM: {
			const sampleRate = view.getUint32(4);
			const samplesDecoded = view.getUint32(8);
			const channelData = [];
			let offset = 12;
			channelData.push(new Float32Array(buffer, offset, samplesDecoded));
			offset += samplesDecoded;
			channelData.push(new Float32Array(buffer, offset, samplesDecoded));
			onDecode(sampleRate, samplesDecoded, channelData[0], channelData[1]);
			break;
		}
		default: {
			console.error("[ERROR] Invalid Event.");
		}
	}

}

socket.onerror = (error: Event) => {
	console.error("error: ", error)
}

socket.onclose = () => {
	console.log("connection closed.")
}

socket.onopen = () => {
	console.log("connection opened.")
}
