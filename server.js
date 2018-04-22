const express = require('express');
const app = express();

const server = require('http').Server(app);
const io = require('socket.io')(server);

app.use('/public', express.static('public'));

server.listen(3000);

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

const PLAYER_LIST = [];
const ROOM_LIST = [];

class Room {
  constructor() {
    let id = 0;
    for (let i = 0; i < ROOM_LIST.length; i++) {
      id += 1;
      if (ROOM_LIST[i].id !== id) break;
    }
    this.id = id;
    this.players = [];
    this.turn = null;
    this.board = [
      [null, null, null],
      [null, null, null],
      [null, null, null],
    ];
    ROOM_LIST.push(this);
  }
  checkPlayers() {
    if (this.players.length === 2) {
      this.startGame();
    } else if (this.players.length === 0) {
      this.deleteRoom();
    } else {
      this.board = [ [null,null,null], [null,null,null], [null,null,null]];
      this.players[0].socket.emit('message', 'Oczekiwanie na przeciwnika...');
    }
  }
  startGame() {
    this.changeTurn();
    this.players[0].socket.emit('message', 'Znaleziono przeciwnika! Jest nim ' + this.players[1].name + '.');
    this.players[1].socket.emit('message', 'Znaleziono przeciwnika! Jest nim ' + this.players[0].name + '.');
    this.players[this.turn].socket.emit('message', 'Rozpoczynasz grę!');
  }
  tick(id, x, y) {
    console.log('id', id, 'x', x, 'y', y);
    if (id === this.players[this.turn].id && this.board[y][x] === null) {
      this.board[y][x] = this.turn.toString();
      this.turn === 0
        ? io.to(this.id).emit('draw', {type: 'x', cords: {x: x, y: y}})
        : io.to(this.id).emit('draw', {type: 'o', cords: {x: x, y: y}});
      this.changeTurn();
    }
    console.log(this.board);
  }
  changeTurn() {
    if (this.checkWin() === true) {
      io.to(this.id).emit('status', 'Wygrał gracz: ' + this.players[this.turn].name + '.');
      this.turn = null;
      this.deleteRoom();
    } else {
      if (this.turn === null) {
        this.turn = Math.round(Math.random());
      } else if (this.turn === 1) {
        this.turn = 0;
      } else if (this.turn === 0) {
        this.turn = 1;
      }
      io.to(this.id).emit('status', 'Tura gracza ' + this.players[this.turn].name + '.');
    }
  }
  deleteRoom() {
    const rIndex = ROOM_LIST.find(room => room.id === this.id);
    ROOM_LIST.splice(rIndex, 1);
  }
  checkWin() {
    let b = this.board;
    if ((b[0][0] === b[0][1] && b[0][1] === b[0][2] && b[0][2] !== null && b[0][0] !== null && b[0][1] !== null) ||
      (b[1][0] === b[1][1] && b[1][1] === b[1][2] && b[0][2] !== null && b[1][1] !== null && b[1][2] !== null) ||
      (b[2][0] === b[2][1] && b[2][1] === b[2][2] && b[2][2] !== null && b[2][0] !== null && b[2][1] !== null) ||
      (b[0][0] === b[1][0] && b[1][0] === b[2][0] && b[2][0] !== null && b[0][0] !== null && b[1][0] !== null) ||
      (b[0][1] === b[1][1] && b[1][1] === b[2][1] && b[2][1] !== null && b[0][1] !== null && b[1][1] !== null) ||
      (b[0][2] === b[1][2] && b[1][2] === b[2][2] && b[2][2] !== null && b[1][2] !== null && b[0][2] !== null) ||
      (b[0][0] === b[1][1] && b[1][1] === b[2][2] && b[2][2] !== null && b[0][0] !== null && b[1][1] !== null) ||
      (b[0][2] === b[1][1] && b[1][1] === b[2][0] && b[2][0] !== null && b[0][2] !== null && b[1][1] !== null)) {
        return true;
      } else {
        return false;
      }
  }
}

class Player {
  constructor(socket, name) {
    this.id = socket.id;
    this.socket = socket;
    this.name = name;
    PLAYER_LIST.push(this);
  }
  distribute() {
    const room = ROOM_LIST.find(room => room.players.length === 1) ? ROOM_LIST.find(room => room.players.length === 1) : new Room();
    this.room = room.id;
    this.socket.join(room.id);
    room.players.push(this);
    this.socket.emit('message', 'Dołączyłeś do pokoju o id ' + room.id);
    room.checkPlayers();
  }
  deletePlayer() {
    const pIndex = PLAYER_LIST.findIndex(player => player.id === that.id);
    PLAYER_LIST.splice(pIndex, 1);
    const room = ROOM_LIST.find(room => room.id === that.room);
    if (typeof room !== 'undefined') {
      const pIndexInRoom = room.players.findIndex(player => player.id === that.id);
      room.players.splice(pIndexInRoom, 1);
      room.players.length === 0 ? room.deleteRoom() : 1;
    }
  }
}

io.on('connection', (socket) => {
  socket.on('newPlayer', function(res) {
    let player = new Player(socket, res);
    player.distribute();
  });

  socket.on('tick', (res) => {
    const player = PLAYER_LIST.find(player => player.id === socket.id);
    const room = ROOM_LIST.find(room => room.id === player.room);
    if (typeof room !== 'undefined') room.tick(player.id, res.x, res.y);
  });

  socket.on('disconnect', (res) => {
    const player = PLAYER_LIST.find(player => player.id === socket.id);
    if (typeof room !== 'undefined') player.deletePlayer();
  })
});
