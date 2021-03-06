import express from 'express';
import cors from 'cors';
import {createServer} from "http";
import {Server, Socket} from "socket.io";
import bodyParser from "body-parser";
import api from "../routes/api";
import path from "path";
import authentication from "../middlewares/authentication";
import Lobby from "../classes/Lobby";
import Player from "../classes/Player";
import lobbies from "./lobbies";

// Initialize
const app = express();
const server = createServer(app);
const io = new Server(server);

// Middlewares
app.use(cors());
app.use(bodyParser.json());
app.use('/api', api);

io.use(authentication);

io.on('connection', (socket: Socket) => {
    console.log('New user connected');

    socket.emit('refresh_lobbies', lobbies.getCodes());

    socket.on('create_lobby', (name: string) => {
        const lobby = new Lobby();

        const host = new Player(socket.id, socket.data.user.uuid, name ?? 'Host', true);

        lobby.join(lobby.code, host);
        socket.join(lobby.code);

        lobbies.addLobby(lobby);

        io.emit('refresh_lobbies', lobbies.getCodes());

        socket.emit('lobby_created', lobby.code);
        socket.emit('refresh_player', host);


    });

    socket.on('refresh_player', (code: string) => {
        const lobby = lobbies.getLobby(code);
        const player = lobby?.getPlayer(socket.data.user.uuid);
        const players = lobby?.getPlayerNames();
        if (player) socket.emit('refresh_player', player);
        if (players) socket.emit('get_players', players);
    });

    socket.on('join_lobby', (code: string) => {
        console.log(`JOINING ${code}`);
        const lobby = lobbies.getLobby(code);
        if (!lobby) return;

        let player = lobby.getPlayer(socket.data.user.uuid);

        console.log(lobby);

        if (!player) {
            player = new Player(socket.id, socket.data.user.uuid, 'Player');

            lobby.join(code, player);
        }

        socket.join(code);
        io.emit('refresh_lobbies', lobbies.getCodes());
        socket.emit('refresh_player', player);
        socket.emit('lobby_joined', lobby.code);
        io.in(code).emit('get_players', lobby.getPlayerNames());
    });
});


// Serve Frontend
app.get('*', (_req, res) => {
    res.sendFile(path.resolve(`${__dirname}/../../client/build/index.html`));
});

export {app, server, io};