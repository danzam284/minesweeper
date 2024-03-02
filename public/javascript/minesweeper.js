var ROWS = 14;
var COLS = 18;
var MINES = 40;
const boardElement = document.getElementById("board");
const boardElement2 = document.getElementById("board2");
const halfElement = document.getElementById("halfMessage");
const endElement = document.getElementById("endMessage");
const flagCount = document.getElementById("flagCount");
const cb = document.getElementById('cb-toggle');
const COLOR1 = "#000080";
const COLOR2 = "#000060";
const COLORHOVER = "#00437d";
const COLORREVEALED = "#C6E6FB";
const REQUIREMENT = 0.3;
const tileSize = 30;
var time = 0;
var board;
var numRevealed = 0;
var numClicks = 0;
var opponentHitBomb = false;

var sentHalfMessage = false;
var recievedHalfMessage = false;
var displayedHalfMessage = false;

var sentEndMessage = false;
var recievedEndMessage = false;
var displayedEndMessage = false;

const room = window.location.href.charAt(window.location.href.length - 1);
const searchParams = new URLSearchParams(window.location.search);
const single = searchParams.has('s');
const player = searchParams.has('player') ? searchParams.get("player") : undefined;

//Initializes socket
var socket;
if (!single) {
    socket = io();
    socket.emit("joinGame" + room);
}

const colors = ["", "blue", "green", "red", "darkblue", "maroon", "turquoise", "black", "gray"];

//Adjusts game variables based on room type
if (room === "0") {
    ROWS = 5; COLS = 5; MINES = 3;
} else if (room === "1") {
    ROWS = 8; COLS = 8; MINES = 12;
} else if (room === "2") {
    ROWS = 12; COLS = 12; MINES = 24;
} else if (room === "3") {
    ROWS = 15; COLS = 15; MINES = 35;
} else if (room === "4") {
    ROWS = 16; COLS = 24; MINES = 60;
}

flagCount.innerHTML = MINES;

halfElement.onanimationend = function() { this.style.display = "none"; this.hidden = true; };
endElement.onanimationend = function() { this.style.display = "none"; this.hidden = true; };

/*Socket Signals*/
if (!single) {
    //Win signal,
    socket.on("win", _ => {
        if (opponentHitBomb) {
            window.location.href = "/public/pages/index.html?msg=You Won! Your opponent hit a mine...";
        } else {
            window.location.href = "/public/pages/index.html?msg=You Won! Your opponent disconnected...";
        }
    });

    //Lose Signal
    socket.on("lose", _ => {
        window.location.href = "/public/pages/index.html?msg=You Lost. Your opponent solved the board before you...";
    });

    //Disconnect signal
    socket.on("youAreAlone", _ => {
        window.location.href = "/public/pages/index.html?msg=You Disconnected";
    });

    //Opponent lose signal
    socket.on("opponentLost", _ => {
        opponentHitBomb = true;
    });

    //User/opponent halfway done signal
    socket.on("halfWarning", _ => {
        if (!displayedHalfMessage && ((sentHalfMessage && recievedHalfMessage) || !sentHalfMessage)) {
            halfElement.innerHTML = "Your opponent is halfway done";
            halfElement.style.display = "flex";
            halfElement.hidden = false;
            displayedHalfMessage = true;
        }
        recievedHalfMessage = true;
    });

    //User/opponent almost done signal
    socket.on("endWarning", _ => {
        if (!displayedEndMessage && ((sentEndMessage && recievedEndMessage) || !sentEndMessage)) {
            endElement.innerHTML = "Your opponent is nearly done";
            endElement.style.display = "flex";
            endElement.hidden = false;
            displayedEndMessage = true;
        }
        recievedEndMessage = true;
    });

    socket.on("board1updated", board => {
        if (player === "2") {
            document.getElementById("board2").innerHTML = board;
            updateEnemyBoard();
        }
    });
    socket.on("board2updated", board => {
        if (player === "1") {
            document.getElementById("board2").innerHTML = board;
            updateEnemyBoard();
        }
    });
}

/* Randomly Generates a game board and calculates all tiles*/
function generateBoard() {
    numRevealed = 0;
    board = [];
    for (let i = 0; i < ROWS; i++) {
        board.push(new Array(COLS));
    }
    for (let i = 0; i < MINES; i++) {
        const randRow = Math.floor(Math.random() * ROWS);
        const randCol = Math.floor(Math.random() * COLS);
        if (board[randRow][randCol] === -1) {
            i--;
        } else {
            board[randRow][randCol] = -1;
        }
    }
    for (let i = 0; i < ROWS; i++) {
        for (let j = 0; j < COLS; j++) {
            let numMines = 0;
            if (board[i][j] === -1) {
                continue;
            }
            for (let k = Math.max(0, i - 1); k <= Math.min(ROWS - 1, i + 1); k++) {
                for (let l = Math.max(0, j - 1); l <= Math.min(COLS - 1, j + 1); l++) {
                    if (board[k][l] === -1) {
                        numMines++;
                    }
                }
            }
            board[i][j] = numMines;
        }
    }
}

/* Reveals a tile when clicked */
async function reveal(i, j, orig) {
    const tileClicked = boardElement.childNodes[i].childNodes[j];
    if (tileClicked.revealed || tileClicked.flagged) { return; }
    tileClicked.revealed = true;
    tileClicked.style.backgroundColor = COLORREVEALED;

    //Tile clicked is a bomb
    if (board[i][j] === -1) {
        
        //Prevents losing on the first click
        if (numRevealed === 0) {
            generateBoard();
            displayBoard();
            await reveal(i, j, true);
        } else {
            tileClicked.lastChild.src = "/public/images/bomb.png";
            tileClicked.lastChild.hidden = false;
            tileClicked.lastChild.style.animation = "0.5s bomb";
            if (!single) {
                socket.emit(player + "updateBoard" + room, boardElement.innerHTML);
            }
            await sleep(500);
            tileClicked.lastChild.hidden = true;

            //Collects tile DOM elements for animation
            const tiles = [];
            for (let i = 0; i < boardElement.childElementCount; i++) {
                const row = boardElement.childNodes[i];
                for (let j = 0; j < row.childElementCount; j++) {
                    tiles.push(row.childNodes[j]);
                }
            }
            
            //Board explosion animation
            while (tiles.length) {
                const idx = Math.floor(Math.random() * tiles.length);
                const tile = tiles[idx];
                const coords = tile.getBoundingClientRect();
                tile.animate([
                    {
                        top: coords.top + "px",
                        left: coords.left + "px",
                        position: "fixed"
                    },
                    {
                        top: (Math.random() * window.screen.availHeight * 3) - window.screen.availHeight + "px",
                        left: (Math.random() * window.screen.availWidth * 3) - window.screen.availWidth + "px",
                        position: "fixed"
                    }
                ], {duration: 1000});
                tiles.splice(idx, 1);
            }
            await sleep(1000);
            if (!single) {
                socket.emit("bomb" + room);
            }
            window.location.href = "/public/pages/index.html?msg=You Lost. You hit a mine...";
        }
    } else {

        //Tile is valid
        if (orig) {
            new Audio("/public/audio/click.mp3").play();
        }
        numRevealed++;
        let signaledThisRound = false;
        tileClicked.style.animation = "0.2s reveal";

        //Emits signals if over halfway or almost done
        if (!sentHalfMessage && !single && numRevealed >= (ROWS * COLS - MINES) / 2) {
            signaledThisRound = true;
            sentHalfMessage = true;
            socket.emit("overHalf" + room);
        }
        if (!sentEndMessage && !single && numRevealed >= (ROWS * COLS - MINES) * 0.85 && halfElement.hidden && !signaledThisRound) {
            sentEndMessage = true;
            socket.emit("nearEnd" + room);
        }
        tileClicked.firstChild.hidden = false;

        //Determines if all tiles revealed
        if (numRevealed === ROWS * COLS - MINES) {
            if (!single) {
                socket.emit("win" + room);
            }
            window.location.href = "/public/pages/index.html?msg=You Won! You solved the board in " + time + " second" + (time == 1 ? "" : "s") + "!";
        }

        //Opens up more tiles if necessary
        if (board[i][j] === 0) {
            for (let k = Math.max(0, i - 1); k <= Math.min(ROWS - 1, i + 1); k++) {
                for (let l = Math.max(0, j - 1); l <= Math.min(COLS - 1, j + 1); l++) {
                    reveal(k, l);
                }
            }
        } 

        //Ensures that many tiles are opened on first click
        else if (numRevealed === 1) {
            generateBoard();
            displayBoard();
            reveal(i, j);
        }
    }
}

/*Flags a tile*/
async function flag(i, j) {
    const tileClicked = boardElement.childNodes[i].childNodes[j];
    if (tileClicked.revealed) { return; };
    if (!tileClicked.releaved) {
        new Audio("/public/audio/flag.mp3").play();
        tileClicked.flagged = !tileClicked.flagged;
        flagCount.innerHTML = parseInt(flagCount.innerHTML) + (tileClicked.flagged ? -1 : 1);
        if (tileClicked.flagged) {
            tileClicked.lastChild.hidden = false;
            tileClicked.lastChild.animate([{ width: "100px", height: "100px" }, { width: tileSize + "px", height: tileSize + "px" }], { duration: 200 });
        } else {
            tileClicked.lastChild.animate([{ width: tileSize + "px", height: tileSize + "px" }, { width: "0px", height: "0px" }], { duration: 300 });
            await sleep(200);
            tileClicked.lastChild.hidden = true;
        }
    }
    if (!single) {
        socket.emit(player + "updateBoard" + room, boardElement.innerHTML);
    }
}

/*Converts the board array to a html board*/
function displayBoard() {

    //Adjusts position based on size of board
    boardElement.style.top = "calc(50% - " + (((tileSize / 2) + 1) * ROWS) + "px";
    if (!single && !cb.checked) {
        boardElement.style.left = "calc(70% - " + (((tileSize / 2) + 1) * COLS) + "px";
        boardElement2.style.left = "calc(30% - " + (((tileSize / 4) + 1) * COLS) + "px";
        boardElement2.style.top = "calc(50% - " + (((tileSize / 4) + 1) * COLS) + "px";
    } else {
        boardElement.style.left = "calc(50% - " + (((tileSize / 2) + 1) * COLS) + "px";
    }
    boardElement.innerHTML = "";

    for (let i = 0; i < ROWS; i++) {
        const rowElement = document.createElement("div");
        rowElement.className = "row";
        for (let j = 0; j < COLS; j++) {
            const tile = document.createElement("div");
            tile.style.backgroundColor = ((i + j) % 2) ? COLOR1 : COLOR2;
            tile.revealed = false;
            tile.flagged = false;
            tile.className = "tile";

            //Creates hover effect for tiles
            tile.onmouseenter = () => { if (!tile.revealed) { tile.style.backgroundColor = COLORHOVER;}};
            tile.onmouseleave = () => { if (!tile.revealed) { tile.style.backgroundColor = ((i + j) % 2) ? COLOR1 : COLOR2;}};

            //Triggers click or right click events for tiles
            tile.onclick = async (ev) => {
                if (numRevealed === 0) {
                    await reveal(i, j, true);
                    
                    while (numRevealed < REQUIREMENT * ROWS * COLS) {
                        generateBoard();
                        displayBoard();
                        numRevealed = 0;
                        await reveal(i, j, true);
                    }
                    
                } else {
                    await reveal(i, j, true);
                }
                if (!single) {
                    socket.emit(player + "updateBoard" + room, boardElement.innerHTML);
                }
            };
            tile.addEventListener('contextmenu', (ev) => {
                flag(i, j);
                ev.preventDefault();
            });

            //Creates number inside tiles
            const p = document.createElement("p");
            p.innerHTML = board[i][j] == 0 ? "" : board[i][j];
            p.style.color = colors[board[i][j]];
            p.hidden = true;
            tile.appendChild(p);

            //Prepares flag for tiles
            const flagImg = document.createElement("img");
            flagImg.style.zIndex = "1";
            flagImg.style.width = tileSize + "px";
            flagImg.style.height = tileSize + "px";
            flagImg.src = "/public/images/flag.png";
            flagImg.hidden = true;
            tile.appendChild(flagImg);
            rowElement.appendChild(tile);
        }
        boardElement.appendChild(rowElement);
    }
    if (!single && boardElement2.childElementCount < 5) {
        boardElement2.innerHTML = boardElement.innerHTML;
        updateEnemyBoard();
    }
}
generateBoard();
displayBoard();

//Updates the timer every second
setInterval(function() {
    document.getElementById("timer").innerHTML = String(++time).padStart(4, '0');
}, 1000);

function updateEnemyBoard() {
    for (let i = 0; i < boardElement2.childElementCount; i++) {
        const row = boardElement2.childNodes[i];
        for (let j = 0; j < row.childElementCount; j++) {
            row.childNodes[j].style.width = (tileSize / 2) + "px";
            row.childNodes[j].style.height = (tileSize / 2) + "px";
            row.childNodes[j].lastChild.style.width = (tileSize / 2) + "px";
            row.childNodes[j].lastChild.style.height = (tileSize / 2) + "px";
            row.childNodes[j].style.animation = "";
        }
    }
}

//Used to check if current user refreshed (if so disconnect)
if (!single) {
    var check = setTimeout(function() {
        socket.emit("amIAlone" + room);
        clearTimeout(check);
    }, 1000)
}

//Used to delay when necessary
function sleep(ms = 0) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

cb.addEventListener('click', function() {
    document.getElementById("toggleText").innerHTML = cb.checked ? "Show Opponent" : "Hide Opponent";
    if (cb.checked) {
        boardElement2.style.display = "none";
        boardElement.style.left = "calc(50% - " + (((tileSize / 2) + 1) * COLS) + "px";
    } else {
        boardElement2.style.display = "flex";
        boardElement.style.left = "calc(70% - " + (((tileSize / 2) + 1) * COLS) + "px";
    }
}, false);
