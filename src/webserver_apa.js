// derived from:
// https://www.w3schools.com/nodejs/nodejs_raspberrypi_webserver_websocket.asp

// require http-server, and create server with function handler
var http = require('http').createServer(httpHandler);
// require socket.io module and pass the http object (server)
var io = require('socket.io')(http, {
	cors: {
		origin: "http://localhost:8080",
		methods: ["GET", "POST"],
		transports: ['websocket', 'polling'],
		credentials: true
	}, allowEIO3: true
})

var fs = require('fs');						// require filesystem module
var Gpio = require('onoff').Gpio;	// include onoff to interact with the GPIO

var APAClock = new Gpio(17, 'out');
var APAData = new Gpio(27, 'out');

http.listen(8080); // listen to port 8080

// define http-handler
function httpHandler(req, res) {
	// req: request from client to server
	// res: response from server to client
	fs.readFile(__dirname + '/apa.html', function(err, data) {
		// read file index.html
		if (err) {
			// respond with 404 on error
			res.writeHead(404, {'Content-Type': 'text/html'});
			return res.end("404 Not Found");
		}

		// respond with contents of index.html-file
		res.writeHead(200, {'Content-Type': 'text/html'});
		res.write(data);
		return res.end();
	});
}

var pressed = false;

// define web-socket-connection-handler
io.sockets.on('connection', function (socket) {
	// define lightState-message-handler to receive light-checkbox-state from client
	socket.on('idLightCheckbox', function(data) {

		if (pressed) return;

		pressed = true;

		console.log(data);

		var color = 0;

		for (var k = 0; k < 256 * 1; k++)
		{
			// write start frame 0 bits
			for (var i = 0; i < 32; i++)
			{
				APAClock.writeSync(1);
				APAData.writeSync(0);
				APAClock.writeSync(0);
			}

			for (var j = 0; j < 3; j++)
			{
				// write 3 initial bits
				for (var i = 0; i < 3; i++)
				{
					APAClock.writeSync(1);
					APAData.writeSync(1);
					APAClock.writeSync(0);
				}

				// write 5 brightness bits
				for (var i = 0; i < 5; i++)
				{
					APAClock.writeSync(1);
					APAData.writeSync(1);
					APAClock.writeSync(0);
				}

				// write BLUE
				for (var i = 0; i < 8; i++)
				{
					APAClock.writeSync(1);

					if (color == 0)
						APAData.writeSync(1);
					else
						APAData.writeSync(0);

					APAClock.writeSync(0);
				}

				// write GREEN
				for (var i = 0; i < 8; i++)
				{
					APAClock.writeSync(1);

					if (color == 1)
						APAData.writeSync(1);
					else
						APAData.writeSync(0);

					APAClock.writeSync(0);
				}

				// write RED
				for (var i = 0; i < 8; i++)
				{
					APAClock.writeSync(1);

					if (color == 2)
						APAData.writeSync(1);
					else
						APAData.writeSync(0);

					APAClock.writeSync(0);
				}

				setTimeout(() => {}, 1000);
			}

			// write end frame 1 bits
			for (var i = 0; i < 32; i++)
			{
				APAClock.writeSync(1);
				APAData.writeSync(1);
				APAClock.writeSync(0);
			}

			color++;

			if (color == 3) color = 0;
		}

		console.log("done");

		// on rising edge:
		// send bit on data
		// set rising edge on clock (send 1)

		// then after timeout send clock (send 0)
	});
});

// define handler for ctrl+c signal (exit program)
process.on('SIGINT', function () {
	// write start frame 0 bits
	for (var i = 0; i < 32; i++)
	{
		APAClock.writeSync(1);
		APAData.writeSync(0);
		APAClock.writeSync(0);
	}

	for (var j = 0; j < 3; j++)
	{
		// write 3 initial bits
		for (var i = 0; i < 3; i++)
		{
			APAClock.writeSync(1);
			APAData.writeSync(1);
			APAClock.writeSync(0);
		}

		// write 5 brightness bits
		for (var i = 0; i < 5; i++)
		{
			APAClock.writeSync(1);
			APAData.writeSync(0);
			APAClock.writeSync(0);
		}

		// write BLUE
		for (var i = 0; i < 8; i++)
		{
			APAClock.writeSync(1);
			APAData.writeSync(0);
			APAClock.writeSync(0);
		}

		// write GREEN
		for (var i = 0; i < 8; i++)
		{
			APAClock.writeSync(1);
			APAData.writeSync(0);
			APAClock.writeSync(0);
		}

		// write RED
		for (var i = 0; i < 8; i++)
		{
			APAClock.writeSync(1);
			APAData.writeSync(0);
			APAClock.writeSync(0);
		}
	}

	// write end frame 1 bits
	for (var i = 0; i < 32; i++)
	{
		APAClock.writeSync(1);
		APAData.writeSync(1);
		APAClock.writeSync(0);
	}

	APAClock.unexport();
	APAData.unexport();

	process.exit();		// exit program
});
