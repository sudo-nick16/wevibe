import { MSG_TYPE } from 'common';
import { OpusDecoder, OpusDecodedAudio } from 'opus-decoder';

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

let ctx: AudioContext;
let startTime: number;
let checkpoints: number[] = [];

// interface DecodedAudio {
// 	left: Float32Array;
// 	right: Float32Array;
// 	sampleRate: number;
// 	samplesDecoded: number;
// }

const onDecode = ({ samplesDecoded, sampleRate, channelData: [left, right] }: OpusDecodedAudio) => {
	if (ctx === undefined) {
		console.log("stream connected.");
		ctx = new AudioContext();
		startTime = 10;
	}
	const source = ctx.createBufferSource();
	source.connect(ctx.destination);
	const buffer = ctx.createBuffer(2, samplesDecoded, sampleRate);
	buffer.copyToChannel(left, 0);
	buffer.copyToChannel(right, 1);
	source.buffer = buffer;
	source.start(startTime);
	startTime += buffer.duration;
}

const opusDecoder = new OpusDecoder();

socket.onmessage = (e: MessageEvent) => {
	if (e.data.arrayBuffer) {
		try {
			opusDecoder.ready.then(() => {
				try {
					e.data.arrayBuffer().then((ab: ArrayBuffer) => {
						const a = new Uint8Array(ab);
						const da = opusDecoder.decodeFrame(a);
						onDecode(da);
					})
				} catch (error) {
					console.log("ERROR: ", error);
				}
			});
		} catch (err) {
			console.log("ERROR: ", err);
			opusDecoder.ready.then(() => opusDecoder.free());
		}
		return;
	}

	const { type } = JSON.parse(e.data);
	console.log(e.data, type)
	switch (type) {
		case MSG_TYPE.END_STREAM: {
			console.log("stream ended...")
			checkpoints.push(startTime);
			console.log({ checkpoints });
			break;
		}
		default: {
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

