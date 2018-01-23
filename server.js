const express = require('express');
const app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var usersSockets = {};
var users = {};
var onlinePlayers = {};
var games = {};
var freeGames = [];

app.use(express.static('public'));
//app.set('view engine', 'ejs');

app.get('/', function (req, res) {
  //res.send('Hello World!');
  //res.render ('index');
    res.sendFile ('/index.html');
})

http.listen(56630, function(){
    console.log('Listening on *:56630');
});

function createPlayerProfile (name, socket) {
    var player = {};
    player.name = name;
    player.socket = socket;
    player.currentGameID = null;
    return player;
}

function createNewPlayer (name, socket) {
    var player = {};
    player.name = name;
    player.socket = socket;
    player.money = 0;
    player.properties = [];
    player.getOutOfJail = 0;
    return player;
}

function createNewGame (name, maxPlayers, isLocked, password) {
    var game = {};
    game.players = {};
    game.name = "Game_" + name;
    if (typeof (maxPlayers) == "undefined") {
        game.maxPlayers = 8;
    }
    else {
        game.maxPlayers = maxPlayers;
    }
    
    if (isLocked) {
        game.isLocked = true;
        game.password = password
    }

    game.isFull = false;
    
    game.addNewPlayer = function (player) {
        // game.players [player[0]] = 
        //create new player object or make a player object on connection and add it to the users in an array with their socket
        console.log ("Decide on architecture");
    }

    game.join = function (name, socket) {
        game.players[name] = (createNewPlayer(name, socket));     
    }

    return game;
}

io.on('connection', function (socket){
    //console.log('A user connected');
    socket.on('disconnect', function(){
        if (usersSockets[socket.request.connection.remoteAddress]) {
            console.log(usersSockets[socket.request.connection.remoteAddress] + ' user disconnected');
            delete users[usersSockets[socket.request.connection.remoteAddress]]
            delete usersSockets[socket.request.connection.remoteAddress];
            console.log (usersSockets);
            console.log (users);
        }
    });

    socket.on('setName', function (data){
        usersSockets[socket.request.connection.remoteAddress] = data;
        users[data] = socket.request.connection.remoteAddress;
        console.log (usersSockets);
        console.log (users);
        console.log(data + " has joined at IP: " + socket.request.connection.remoteAddress); //Prints the username and IP of client
        socket.emit("nameConfirmation", "Welcome to the game");
        var gameID = Math.random().toString(36).substr(4, 15);
        games["Game_" + gameID] = createNewGame(gameID);
        games["Game_" + gameID].addNewPlayer("test");
        freeGames.push("Game_" + gameID); //push to make sure people who've been waiting longest start first
        onlinePlayers[data] = createPlayerProfile (data, socket.request.connection.remoteAddress);
        console.log (games);
        console.log (onlinePlayers);
    });

    socket.on ('gameSelect', function (data) {
        console.log (data);
        if (data == "Join") {
            joinGame(socket.request.connection.remoteAddress);
        }
    })
});

function joinGame (socket) {
    try {
        games[freeGames[0]].join(usersSockets[socket], socket);
    }
    catch (err){
        return ("Error");
    }
    onlinePlayers[usersSockets[socket]].currentGameID = freeGames[0];
    console.log(games);
    console.log (onlinePlayers);
}