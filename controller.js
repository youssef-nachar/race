const joinBtn = document.getElementById('join-btn');
const roomInput = document.getElementById('room-input');
const statusMsg = document.getElementById('status-msg');
const joinScreen = document.getElementById('join-screen');
const gamepad = document.getElementById('gamepad');
const myColorInfo = document.getElementById('my-color');

let peer = null;
let conn = null;
let inputState = { accel: false, brake: false, left: false, right: false };

// Check if room code is in URL (from QR code scan)
const urlParams = new URLSearchParams(window.location.search);
if(urlParams.has('room')) {
    roomInput.value = urlParams.get('room');
}

joinBtn.addEventListener('click', () => {
    const roomId = roomInput.value.trim().toUpperCase();
    if(roomId) {
        statusMsg.innerText = 'Connecting...';
        statusMsg.style.color = 'yellow';
        
        // Initialize PeerJS for the controller
        peer = new Peer(); 
        
        peer.on('open', (id) => {
            // Connect to the Main Screen (Host)
            conn = peer.connect(roomId);
            
            conn.on('open', () => {
                statusMsg.innerText = 'Connected!';
                statusMsg.style.color = '#00ff88';
                
                // Wait for the host to send our assigned color
                conn.on('data', (data) => {
                    if(data.type === 'init') {
                        joinScreen.style.display = 'none';
                        gamepad.style.display = 'flex';
                        myColorInfo.style.backgroundColor = data.color;
                        
                        // Try to lock orientation and go fullscreen on mobile
                        try {
                            document.documentElement.requestFullscreen();
                            screen.orientation.lock('landscape');
                        } catch(e) {}
                    }
                });
            });

            conn.on('error', (err) => {
                statusMsg.innerText = 'Connection Error!';
                statusMsg.style.color = 'red';
            });
            
            conn.on('close', () => {
                alert('Connection to TV lost.');
                location.reload();
            });
        });
        
        peer.on('error', (err) => {
            statusMsg.innerText = 'Failed to find room.';
            statusMsg.style.color = 'red';
            console.error(err);
        });
    }
});

// Button event listeners
const setupButton = (id, action) => {
    const btn = document.getElementById(id);
    
    // Touch events for mobile
    btn.addEventListener('touchstart', (e) => { e.preventDefault(); updateInput(action, true); });
    btn.addEventListener('touchend', (e) => { e.preventDefault(); updateInput(action, false); });
    
    // Mouse events for testing on desktop
    btn.addEventListener('mousedown', () => updateInput(action, true));
    btn.addEventListener('mouseup', () => updateInput(action, false));
    btn.addEventListener('mouseleave', () => updateInput(action, false));
};

setupButton('btn-accel', 'accel');
setupButton('btn-brake', 'brake');
setupButton('btn-left', 'left');
setupButton('btn-right', 'right');

// Send input data via WebRTC DataChannel
function updateInput(action, state) {
    if (inputState[action] !== state) {
        inputState[action] = state;
        if(conn && conn.open) {
            conn.send({ type: 'input', input: inputState });
        }
    }
}
