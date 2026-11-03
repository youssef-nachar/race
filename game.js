const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// Generate a random room code
const roomCode = 'RACE-' + Math.floor(1000 + Math.random() * 9000);
document.getElementById('room-code').innerText = roomCode;

// Initialize PeerJS (WebRTC Host)
const peer = new Peer(roomCode, { debug: 2 });
const players = {}; // Store active connections

peer.on('open', (id) => {
    console.log('My peer ID is: ' + id);
    
    // Generate QR Code containing the link to the controller
    const currentUrl = window.location.href;
    const baseUrl = currentUrl.substring(0, currentUrl.lastIndexOf('/'));
    const controllerUrl = baseUrl + '/controller.html?room=' + id;
    
    new QRCode(document.getElementById('qrcode'), {
        text: controllerUrl,
        width: 128,
        height: 128
    });
});

peer.on('connection', (conn) => {
    console.log('Player connected:', conn.peer);
    
    const color = getRandomColor();
    
    // Initialize player state
    players[conn.peer] = {
        connection: conn,
        x: canvas.width / 2,
        y: canvas.height / 2,
        angle: 0,
        speed: 0,
        color: color,
        input: { accel: false, brake: false, left: false, right: false }
    };

    // When connection is fully open, send them their assigned color
    conn.on('open', () => {
        conn.send({ type: 'init', color: color });
    });

    // Listen for inputs from the controller
    conn.on('data', (data) => {
        if (data.type === 'input' && players[conn.peer]) {
            players[conn.peer].input = data.input;
        }
    });

    conn.on('close', () => {
        console.log('Player disconnected:', conn.peer);
        delete players[conn.peer];
    });
});

function getRandomColor() {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}

// Game Loop
function update() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw simple track background
    ctx.fillStyle = '#444';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Update and draw players
    for (const id in players) {
        const p = players[id];
        
        // Physics
        if (p.input.accel) p.speed += 0.25;
        if (p.input.brake) p.speed -= 0.25;
        
        // Friction
        p.speed *= 0.95;
        
        // Steering
        if (Math.abs(p.speed) > 0.5) {
            if (p.input.left) p.angle -= 0.05;
            if (p.input.right) p.angle += 0.05;
        }

        // Movement
        p.x += Math.cos(p.angle) * p.speed;
        p.y += Math.sin(p.angle) * p.speed;

        // Screen wrap
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;

        // Draw Car
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);
        
        ctx.fillStyle = p.color;
        ctx.fillRect(-15, -10, 30, 20); // Car body
        ctx.fillStyle = '#000';
        ctx.fillRect(5, -12, 8, 4); // Wheels
        ctx.fillRect(5, 8, 8, 4);
        ctx.fillRect(-10, -12, 8, 4);
        ctx.fillRect(-10, 8, 8, 4);
        
        ctx.restore();
    }
    
    requestAnimationFrame(update);
}

update();

// Handle window resize
window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
});
