import express from 'express';
import {Router} from 'express';
import {static as staticDir} from 'express';
import {Server} from 'socket.io';
import http from 'http';

import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const router = Router();
app.use('/public', express.static('public'));
app.use(express.json());
app.use(express.urlencoded({extended: true}));
app.use('/public', staticDir('public'));


/*Sockets*/
const rooms = [0, 0, 0, 0, 0];
io.on('connection', socket => {
    let socketRoom = -1;
    let inGame = false;
    let won = false;
    let player = -1;
    for (let i = 0; i < rooms.length; i++) {
        //Connects a user to a room
        socket.on("joinRoom" + i, _ => {
            if (rooms[i] === 2 || socketRoom !== -1) { return; }
            socket.join("room" + i);
            rooms[i]++;
            socketRoom = i;
            if (rooms[i] === 2) {
                player = 2;
                socket.emit("player", player);
                io.to("room" + i).emit("ready");
            } else {
                player = 1;
                socket.emit("player", player);
            }
        });

        //Connects a user to a game
        socket.on("joinGame" + i, _ => {
            inGame = true;
            socket.join("room" + i);
            rooms[i]++;
            socketRoom = i;
        });

        socket.on("1updateBoard" + i, board => {
            io.to("room" + i).emit("board1updated", board);
        });

        socket.on("2updateBoard" + i, board => {
            io.to("room" + i).emit("board2updated", board);
        });

        //User wins
        socket.on("win" + i, _ => {
            won = true;
        });

        //User loses due to bomb
        socket.on("bomb" + i, _ => {
            io.to("room" + i).emit("opponentLost");
        });

        //Used to check for refresh to disconnect
        socket.on("amIAlone" + i, _ => {
            if (rooms[i] === 1) {
                socket.emit("youAreAlone");
            }
        });

        //Emits to opponent that current user is halfway
        socket.on("overHalf" + i, _ => {
            io.to("room" + i).emit("halfWarning");
        });

        //Emits to opponent that current user is almost done
        socket.on("nearEnd" + i, _ => {
            io.to("room" + i).emit("endWarning");
        });

        //Disconnects a user from a room
        socket.on("leaveRoom" + i, _ => {
            if (socketRoom != -1 && rooms[socketRoom] == 1) {
                rooms[socketRoom]--;
                socket.leave("room" + i);
                socketRoom = -1;
            }
        });
    }

    //When a user disconnects
    socket.on('disconnect', _ => {
        if (socketRoom !== -1) {
            rooms[socketRoom]--;
            if (won) {
                if (rooms[socketRoom] === 1) {
                    io.to("room" + socketRoom).emit("lose");
                }
            } else {
                if (inGame && rooms[socketRoom] === 1) {
                    io.to("room" + socketRoom).emit("win");
                }
            }
        }
    });

});


/*Routing*/

//Base route
router.route("/").get(async (req, res) => {
    return res.sendFile(__dirname + '/public/pages/index.html');
});

//Sends list of all room data
router.route("/rooms").get(async (req, res) => {
    return res.json(rooms);
});

app.use('/', router);


server.listen(3000, () => {
  console.log("We've now got a server!");
  console.log('Your routes will be running on http://localhost:3000');
});
