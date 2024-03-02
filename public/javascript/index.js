const socket = io();
const roomsElement = document.getElementById("rooms");
var rooms = [0, 0, 0, 0, 0];
var lastRoomJoined = -1;
var showKrabs = false;
var player = -1;

const funFacts = [
    "Minesweeper was created by Curt Johnson in 1989 and gained popularity when it was included in Microsoft Windows operating systems.",
    "The objective of Minesweeper is to clear a rectangular board containing hidden \"mines\" without detonating any of them, using clues about the number of neighboring mines in each cell.",
    "Minesweeper's difficulty levels are determined by the size of the board and the number of mines hidden within it, ranging from beginner to expert.",
    "The world record for the fastest time to complete an expert-level Minesweeper game is around 24 seconds, achieved by Kamil Muranski in 2000.",
    "Minesweeper's layout and rules were inspired by a similar game called Relentless Logic, which Johnson played on the Plato system in the 1970s.",
    "In 1992, Minesweeper was recognized by the Guinness World Records as the most-played Windows game.",
    "Minesweeper has been the subject of mathematical analysis, with strategies developed to improve players' chances of winning based on probability and logical deduction.",
    "There are various versions and adaptations of Minesweeper available for different platforms, including mobile devices and online gaming websites.",
    "Minesweeper has been used as a teaching tool to improve logical thinking, problem-solving skills, and spatial reasoning in educational settings.",
    "Despite its simplicity, Minesweeper remains a popular game worldwide, with dedicated online communities, tournaments, and even competitive leagues."
];


//Manages joining room functionality
for (let i = 0; i < rooms.length; i++) {
    document.getElementById("joinRoom" + i).onclick = async function() {
        await getRoomData();
        if (rooms[i] !== 2) {
            document.getElementById('smallError').hidden = true;
            lastRoomJoined = i;
            socket.emit("joinRoom" + i);
            roomsElement.style.display = "none";
            document.getElementById("waiting").hidden = false;
            wave("Waiting for opponent to join...");
            document.getElementById("leaveRoom").hidden = false;
            document.getElementById("funFacts").hidden = false;
            document.getElementById("msg").hidden = true;
            document.getElementById("loseImg").hidden = true;
            showCopyElement(i);
        } else {
            document.getElementById('smallError').hidden = false;
        }
    }
}

//Sets up the element used for copying the room share link
function showCopyElement(room) {
    const copyElement = document.getElementById("share");
    const baseLink = window.location.href.split("?")[0];
    const specialLink = baseLink + "?auto=" + room;

    //Copies room link to clipboard
    copyElement.onclick = async () => {
        try {
            await navigator.clipboard.writeText(specialLink);
            copyElement.innerHTML = "Link copied to clipboard.";
            await sleep(700);
            copyElement.innerHTML = "Copy Room Link";
        } catch(e) {
            console.log(e);
        }
    }
    copyElement.hidden = false;
}

//Manages leaving room functionality
document.getElementById("leaveRoom").onclick = function() {
    this.hidden = true;
    document.getElementById("leaveRoom").hidden = true;
    document.getElementById("waiting").hidden = true;
    document.getElementById("funFacts").hidden = true;
    document.getElementById("share").hidden = true;
    roomsElement.style.display = "flex";
    socket.emit("leaveRoom" + lastRoomJoined);
    lastRoomJoined = -1;
    document.getElementById("msg").hidden = false;
    if (showKrabs) {
        document.getElementById("loseImg").hidden = false;
    }
}

//API call to get all room data
async function getRoomData() {
    const data = await fetch("/rooms");
    const roomData = await data.json();
    rooms = roomData;
    for (let i = 0; i < rooms.length; i++) {
        document.getElementById("roomText" + i).innerHTML = rooms[i] + " / 2";
        document.getElementById("joinRoom" + i).disabled = (rooms[i] == 2);
    }
}

socket.on("player", p => {
    player = p;
});

//Recieves socket signal to start the game
socket.on("ready", async _ => {
    window.location.href = "/public/pages/minesweeper.html?player=" + player + "&room=" + lastRoomJoined;
});

//Used for wavy text in waiting room
async function wave(text) {
    document.getElementById('waiting').innerHTML = "";
    for (let i = 0; i < text.length; i++) {
        const textElement = document.createElement("span");
        textElement.innerHTML = text[i] === " " ? "&nbsp" : text[i];
        textElement.className = "wavy";
        document.getElementById('waiting').appendChild(textElement);
        await sleep(20);
    }
}

//Parses query string to check for win/loss
const searchParams = new URLSearchParams(window.location.search);
async function checkQueryString() {
    if (searchParams.has("msg")) {
        document.getElementById("msg").innerHTML = searchParams.get("msg");
        if (searchParams.get("msg").startsWith("You Won")) {
            document.getElementById("msg").className = "goodMessage";
            confetti.start();
            await sleep(1000);
            confetti.stop();
        } else {
            document.getElementById("msg").className = "badMessage";
            document.getElementById("loseImg").hidden = false;
            showKrabs = true;
        }
    }
    if (searchParams.has("auto")) {
        const roomToJoin = searchParams.get("auto");
        document.getElementById("joinRoom" + roomToJoin).onclick();
    }
}
checkQueryString();

//Calls API request 10 times per second to constantly update data
setInterval(getRoomData, 100);

//Displays fun facts periodically
const funFact = funFacts[Math.floor(Math.random() * funFacts.length)];
document.getElementById("funFacts").innerHTML = "Fun fact: " + funFact;
setInterval(() => {
    const funFact = funFacts[Math.floor(Math.random() * funFacts.length)];
    document.getElementById("funFacts").innerHTML = "Fun fact: " + funFact;
}, 10000)

//Used to delay when necessary
function sleep(ms = 0) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
