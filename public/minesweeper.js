const ROWS = 14;
const COLS = 18;
const MINES = 40;
const boardElement = document.getElementById("board");
var board;
var numRevealed = 0;
var numClicks = 0;
const room = window.location.href.charAt(window.location.href.length - 1);
const socket = io();
socket.emit("joinGame" + room);

socket.on("win", _ => {
    window.location.href = "/public/index.html?msg=You Won";
});
socket.on("lose", _ => {
    window.location.href = "/public/index.html?msg=You Lost";
});

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

function reveal(i, j) {
    const tileClicked = boardElement.childNodes[i].childNodes[j];
    if (tileClicked.revealed || tileClicked.flagged) { return; }
    tileClicked.revealed = true;
    tileClicked.style.backgroundColor = "aliceblue";
    if (board[i][j] === -1) {
        if (numRevealed === 0) {
            generateBoard();
            displayBoard();
            reveal(i, j);
        } else {
            window.location.href = "/public/index.html?msg=You Lost";
        }
    } else {
        numRevealed++;
        tileClicked.firstChild.hidden = false;
        if (numRevealed === ROWS * COLS - MINES) {
            socket.emit("win" + room);
            window.location.href = "/public/index.html?msg=You Win";
        }
        if (board[i][j] === 0) {
            for (let k = Math.max(0, i - 1); k <= Math.min(ROWS - 1, i + 1); k++) {
                for (let l = Math.max(0, j - 1); l <= Math.min(COLS - 1, j + 1); l++) {
                    reveal(k, l);
                }
            }
        } else if (numRevealed === 1) {
            generateBoard();
            displayBoard();
            reveal(i, j);
        }
    }
}

function flag(i, j) {
    const tileClicked = boardElement.childNodes[i].childNodes[j];
    if (tileClicked.revealed) { return; };
    if (!tileClicked.releaved) {
        tileClicked.style.backgroundColor = tileClicked.flagged ? (((i + j) % 2) ? "blue" : "turquoise") : "red";
        tileClicked.flagged = !tileClicked.flagged;
    }
}

function displayBoard() {
    boardElement.innerHTML = "";
    for (let i = 0; i < ROWS; i++) {
        const rowElement = document.createElement("div");
        rowElement.className = "row";
        for (let j = 0; j < COLS; j++) {
            const tile = document.createElement("div");
            tile.style.backgroundColor = ((i + j) % 2) ? "blue" : "turquoise";
            tile.revealed = false;
            tile.flagged = false;
            tile.className = "tile";
            tile.onmouseenter = () => { if (!tile.revealed && !tile.flagged) { tile.style.backgroundColor = "aliceblue";}};
            tile.onmouseleave = () => { if (!tile.revealed && !tile.flagged) { tile.style.backgroundColor = ((i + j) % 2) ? "blue" : "turquoise";}};
            tile.onclick = (ev) => { reveal(i, j); };
            tile.addEventListener('contextmenu', (ev) => {
                flag(i, j);
                ev.preventDefault();
            });
            const p = document.createElement("p");
            p.innerHTML = board[i][j] == 0 ? "" : board[i][j];
            p.hidden = true;
            tile.appendChild(p);
            rowElement.appendChild(tile);
        }
        boardElement.appendChild(rowElement);
    }
}
generateBoard();
displayBoard();