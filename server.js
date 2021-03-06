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
let lastId = 0;

class Room {
  constructor() {
    // let id = 0;
    // for (let i = 0; i < ROOM_LIST.length; i++) {
    //   id += 1;
    //   if (ROOM_LIST[i].id !== id) break;
    // }
    // this.id = id;
    this.id = ++lastId;
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
      this.board = [[null,null,null], [null,null,null], [null,null,null]];
      this.players[0].socket.emit('message', 'Oczekiwanie na przeciwnika...');
    }
  }
  startGame() {
    this.changeTurn();
    this.players[0].socket.emit('message', 'Znaleziono przeciwnika! Jest nim ' + this.players[1].name + '.');
    this.players[1].socket.emit('message', 'Znaleziono przeciwnika! Jest nim ' + this.players[0].name + '.');
    this.players[0].socket.emit('color', 'Twój kolor to czerwony.');
    this.players[1].socket.emit('color', 'Twój kolor to zielony.');
    this.players[this.turn].socket.emit('message', 'Rozpoczynasz grę!');
    this.players[Math.abs(this.turn - 1)].socket.emit('message', 'Twój przeciwnik rozpoczyna grę!');
  }
  tick(id, x, y) {
    if (this.players.length > 0 && this.id >= 0) {
      if (typeof this.players[this.turn] !== 'undefined'
      && id === this.players[this.turn].id
      && this.board[y][x] === null) {
        this.board[y][x] = this.turn.toString();
        this.turn === 0
        ? io.to(this.id).emit('draw', {type: 'x', cords: {x: x, y: y}})
        : io.to(this.id).emit('draw', {type: 'o', cords: {x: x, y: y}});
        this.changeTurn();
      }
    }
  }
  changeTurn() {
    const fields = [...this.board[0], ...this.board[1], ...this.board[2]];
    const emptyFields = fields.some(item => item === null);
    if (this.checkWin() === true) {
      io.to(this.id).emit('status', 'Wygrał gracz: ' + this.players[this.turn].name + '.');
      this.turn = null;
      this.deleteRoom();
    } else if (this.checkWin() === false && emptyFields === true) {
      if (this.turn === null) {
        this.turn = Math.round(Math.random());
      } else if (this.turn === 1) {
        this.turn = 0;
      } else if (this.turn === 0) {
        this.turn = 1;
      }
      io.to(this.id).emit('status', 'Tura gracza ' + this.players[this.turn].name + '.');
    } else if (this.checkWin() === false && emptyFields === false){
      io.to(this.id).emit('status', 'Remis!');
      this.deleteRoom();
    }
  }
  deleteRoom() {
    PLAYER_LIST.forEach((player, key) => {
      if (this.id === player.room) {
        PLAYER_LIST[key].room = null;
      }
    });
    const rIndex = ROOM_LIST.findIndex(room => room.id === this.id);
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
    const availableRoom = ROOM_LIST.find(room => room.players.length === 1);
    const room = typeof availableRoom === 'undefined'
      ? new Room()
      : availableRoom;
    this.room = room.id;
    this.socket.join(room.id);
    room.players.push(this);
    this.socket.emit('message', 'Dołączyłeś do pokoju o id ' + room.id);
    room.checkPlayers();
  }
  deletePlayer() {
    const room = ROOM_LIST.find(room => room.id === this.room);
    if (typeof room !== 'undefined') {
      io.to(room.id).emit('status', 'Twój przeciwnik opuścił grę :(');
      io.to(room.id).emit('message', 'Przeciwnik opuścił pokój.');
      io.to(room.id).emit('button', 'True.');
      room.deleteRoom();
    }
    const pIndex = PLAYER_LIST.findIndex(player => player.id === this.id);
    PLAYER_LIST.splice(pIndex, 1);
  }
}

io.on('connection', (socket) => {
  socket.on('newPlayer', (res) => {
    let player = new Player(socket, res);
    player.distribute();
  });

  socket.on('tick', (res) => {
    const player = PLAYER_LIST.find(player => player.id === socket.id);
    if (typeof player !== 'undefined') {
      const room = ROOM_LIST.find(room => room.id === player.room);
      if (typeof room !== 'undefined') room.tick(player.id, res.x, res.y);
    }
  });

  socket.on('disconnect', (res) => {
    const player = PLAYER_LIST.find(player => player.id === socket.id);
    if (typeof player !== 'undefined') player.deletePlayer();
  })
});
