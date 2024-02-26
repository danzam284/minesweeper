const socket = io();
const roomsElement = document.getElementById("rooms");
var rooms = [0, 0, 0, 0, 0];
var lastRoomJoined = -1;

const searchParams = new URLSearchParams(window.location.search);
if (searchParams.has("msg")) {
    document.getElementById("msg").innerHTML = searchParams.get("msg");
}


for (let i = 0; i < rooms.length; i++) {
    document.getElementById("joinRoom" + i).onclick = async function() {
        await getRoomData();
        if (rooms[i] !== 2) {
            lastRoomJoined = i;
            socket.emit("joinRoom" + i);
        }
    }
}

async function getRoomData() {
    const data = await fetch("/rooms");
    const roomData = await data.json();
    rooms = roomData;
    for (let i = 0; i < rooms.length; i++) {
        document.getElementById("roomText" + i).innerHTML = rooms[i] + " / 2";
        document.getElementById("joinRoom" + i).disabled = (rooms[i] == 2);
    }
}

socket.on("ready", async _ => {
    window.location.href = "/public/minesweeper.html?room=" + lastRoomJoined;
});


setInterval(getRoomData, 100);