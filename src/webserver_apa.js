// Import required modules
const http = require('http');
const socketIO = require('socket.io');
const fs = require('fs');
const { Gpio } = require('onoff');

// GPIO setup
const APAClock = new Gpio(17, 'out');
const APAData = new Gpio(27, 'out');

// Create an HTTP server
const server = http.createServer((req, res) => {
	fs.readFile(__dirname + '/apa.html', (err, data) => {
		if (err) {
			res.writeHead(404, { 'Content-Type': 'text/html' });
			return res.end("404 Not Found");
		}
		res.writeHead(200, { 'Content-Type': 'text/html' });
		res.write(data);
		return res.end();
	});
});

// Attach socket.io to the server
const io = socketIO(server, {
	cors: {
		origin: "http://localhost:1337",
		methods: ["GET", "POST"],
		transports: ['websocket', 'polling'],
		credentials: true
	},
	allowEIO3: true
});


console.log('Runs on 1337');
console.log('https://www.lcd-module.de/eng/pdf/zubehoer/APA102C.pdf');
console.log('http://192.168.188.25:1337/')
server.listen(1337); // Server listens on port 1337

// Function to send data to APA102 LED strip
function sendDataToLED(colorIndex) {
	// Start Frame
	for (let i = 0; i < 32; i++) {
		sendBit(0);
	}

	// LED Frame
	for (let j = 0; j < 3; j++) {
		sendBit(1, 3); // 3 initial bits
		sendBit(1, 5); // 5 brightness bits

		// Send colors
		sendColor(colorIndex === 0, 8); // Blue
		sendColor(colorIndex === 1, 8); // Green
		sendColor(colorIndex === 2, 8); // Red
	}

	// End Frame
	for (let i = 0; i < 32; i++) {
		sendBit(1);
	}
}

// Function to send a single bit to the LED strip
function sendBit(bit, count = 1) {
	for (let i = 0; i < count; i++) {
		APAClock.writeSync(1);
		APAData.writeSync(bit);
		APAClock.writeSync(0);
	}
}

// Function to send color data
function sendColor(isColorOn, bits) {
	for (let i = 0; i < bits; i++) {
		sendBit(isColorOn ? 1 : 0);
	}
}

let colorIndex = 0; // Current color index

// Socket connection handler
io.on('connection', (socket) => {
	socket.on('idLightCheckbox', (data) => {
		console.log(data);
		sendDataToLED(colorIndex);
		colorIndex = (colorIndex + 1) % 3; // Cycle through colors
	});
});

// Cleanup on exit
process.on('SIGINT', () => {
	sendDataToLED(-1); // Turn off LEDs
	APAClock.unexport();
	APAData.unexport();
	process.exit();
});
