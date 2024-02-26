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
    for (let i = 0; i < rooms.length; i++) {
        socket.on("joinRoom" + i, _ => {
            if (rooms[i] === 2 || socketRoom !== -1) { return; }
            socket.join("room" + i);
            rooms[i]++;
            socketRoom = i;
            if (rooms[i] === 2) {
                io.to("room" + i).emit("ready");
            }
        });
        socket.on("joinGame" + i, _ => {
            inGame = true;
            socket.join("room" + i);
            rooms[i]++;
            socketRoom = i;
        });
        socket.on("win" + i, _ => {
            won = true;
        });
    }

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
router.route("/").get(async (req, res) => {
    return res.sendFile(__dirname + '/public/index.html');
});

router.route("/rooms").get(async (req, res) => {
    return res.json(rooms);
});


app.use('/', router);

server.listen(3000, () => {
  console.log("We've now got a server!");
  console.log('Your routes will be running on http://localhost:3000');
});