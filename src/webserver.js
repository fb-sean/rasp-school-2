// derived from:
// https://www.w3schools.com/nodejs/nodejs_raspberrypi_webserver_websocket.asp

// require http-server, and create server with function handler
const http = require('http').createServer(httpHandler);
// require socket.io module and pass the http object (server)
const io = require('socket.io')(http, {
    cors: {
        origin: "http://localhost:8080",
        methods: ["GET", "POST"],
        transports: ['websocket', 'polling'],
        credentials: true
    }, allowEIO3: true
})

const fs = require('fs');
const Gpio = require('onoff').Gpio;
// Set up RGB LED pins
const RED = new Gpio(27, 'out');	// Red pin
const GREEN = new Gpio(17, 'out');	// Green pin
const BLUE = new Gpio(22, 'out');	// Blue pin

http.listen(8080); // listen to port 8080

function httpHandler(req, res) {
    // req: request from client to server
    // res: response from server to client
    fs.readFile(__dirname + '/index.html', function (err, data) {
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

function sleep(ms) {
    const endTime = new Date().getTime() + ms;
    while (new Date().getTime() < endTime);
}

let pwm = false;
const period = 40;
const partDuration = 5;
const parts = period / partDuration;

let dutyCycle = 0.5;
let pwmInterval = null;
function softwarePwm() {
    let highTime = parts * dutyCycle;
    let lowTime = parts - highTime;

    for(let i = 0; i < parts; i++) {
        if(i < highTime) {
            RED.writeSync(1);
        } else {
            RED.writeSync(0);
        }

        sleep(partDuration);
    }
}


let party = false;
let partyInterval = null;
const intervalFunctionForParty = () => {
    if (party) {
        let nextColor = '';
        if (currentColor === 'green') {
            nextColor = 'blue';
        } else if (currentColor === 'blue') {
            nextColor = 'red';
        } else if (currentColor === 'red') {
            nextColor = 'green';
        }

        currentColor = nextColor;

        RED.writeSync(nextColor === 'red' ? 1 : 0);
        GREEN.writeSync(nextColor === 'green' ? 1 : 0);
        BLUE.writeSync(nextColor === 'blue' ? 1 : 0);
    }
};
let currentColor = 'green';

const resetLamps = () => {
    RED.writeSync(0);
    GREEN.writeSync(0);
    BLUE.writeSync(0);
}

// define web-socket-connection-handler
io.sockets.on('connection', function (socket) {
    socket.on('changePower', (power) => {
        if (pwm) {
            pwm = false;
            console.log('Stopping PWM.');

            setTimeout(() => {
                pwm = true;

                console.log('Starting PWM with new power settings.');
                softwarePwm(RED, 25, power);
            }, 250);
        }
    });

    socket.on('changeColorTo', (states) => {
        console.log('Current states:');
        console.log(states);

        if (party && !states['party']) {
            console.log('Stopping party mode.');
            resetLamps();
        }

        party = states['party'];
        if (partyInterval) clearInterval(partyInterval);
        if (states['party'] === true) {
            console.log('Starting party mode.');
            partyInterval = setInterval(intervalFunctionForParty, 250);
        }

        if (pwmInterval && !states['pwm']) {
            clearInterval(pwmInterval);
            pwmInterval = null;

            console.log('Stopping PWM.');

            resetLamps();
        } else {
            if (states['pwm']) {
                if (pwmInterval) clearInterval(pwmInterval);
                pwmInterval = setInterval(softwarePwm, period);
            }
        }

        pwm = states['pwm'];

        if (!states['party'] && !states['pwm']) {
            RED.writeSync(states['red'] ? 1 : 0);
            GREEN.writeSync(states['green'] ? 1 : 0);
            BLUE.writeSync(states['blue'] ? 1 : 0);
        }
    });

    socket.on('disconnect', () => {
        console.log('Socket disconnected. Resetting all settings.');

        party = false;

        RED.writeSync(0);
        GREEN.writeSync(0);
        BLUE.writeSync(0);
    });
});

console.log('Started lol');

process.on('SIGINT', function () {
    resetLamps();
    RED.unexport();
    GREEN.unexport();
    BLUE.unexport();
    process.exit();
});
