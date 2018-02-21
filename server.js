const express = require('express');
const app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var usersSockets = {}; //Key: socket, Value: username
var users = {}; //Key: username, Value: socket
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
    var newGame = createNewGame ("Game", 8, false, null);
    games [newGame.id] = newGame
    freeGames.push(newGame.id);
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
    player.properties = {};
    player.properties.brown = 0;
    player.properties.pink = 0;
    player.properties.lightBlue = 0;
    player.properties.orange = 0;
    player.properties.red = 0;
    player.properties.green = 0;
    player.properties.blue = 0;
    player.getOutOfJail = 0;
    return player;
}

function createNewGame (name, maxPlayers, isLocked, password) {
    var game = {};
    game.id = "Game_" + Math.random().toString(36).substr(4, 15);
    if (name == "") {
        game.name = "Game";
    }
    else {
        game.name = name;
    }    
    game.players = [];
    game.playerNames = [];
    game.playerCount = 0;
    game.maxPlayers = maxPlayers;
    game.isLocked = isLocked;
    game.password = password;
    game.isFull = false;

    game.join = function (name, socket) {
        game.players.push(createNewPlayer(name, socket));
        game.playerNames.push(name);
        game.playerCount ++;
        game.broadcastToPlayers ("newPlayer", name);
    }

    game.getPlayers = function () {
        return game.playerNames;
    }

    game.removePlayer = function (username) {  
        for (var i in game.players) {
            if (game.players[i].name == username) {
                console.log ("Removing " + game.players[i].name + " from game (" + game.id + ").")
                game.playerCount --;
                game.broadcastToPlayers ("playerLeft", game.players[i].name);
                delete game.players[i];
                delete game.playerNames[i];                
                if (game.playerCount == 0) {
                    game.players = [];
                    game.playerNames = [];
                }
            }
        }
    }

    game.broadcastToPlayers = function (event, data) {
        for (var i in game.playerNames) {
            if (game.playerCount > 0) {
                //Socket gives null reference as the socket is disconnected, maybe add some logic for leaving the game (try-catch?)
                try {
                    io.sockets.connected[users[game.playerNames[i]].id].emit(event, data);
                }
                catch (err) {
                    console.log ("There was an error trying to broadcast to " + game.playerNames[i]);
                }
            }
        }
    }

    game.chat = function (socket, message, player) {
        console.log (message);
        for (var i in game.playerNames) {
            if (game.playerCount > 0 && socket.id != users[game.playerNames[i]].id) {
                //Socket gives null reference as the socket is disconnected, maybe add some logic for leaving the game (try-catch?)
                try {
                    var data = {};
                    data.sender = player;
                    data.message = message;
                    io.sockets.connected[users[game.playerNames[i]].id].emit("gameChat", data);
                }
                catch (err) {
                    console.log ("There was an error trying to broadcast to " + game.playerNames[i] + "(" + err.message + ")");
                }
            }
        }
    }

    return game;
}

io.on('connection', function (socket){
    socket.on('disconnect', function(){
        if (usersSockets[socket.id]) {
            console.log(usersSockets[socket.id] + ' user disconnected from game (' + onlinePlayers[usersSockets[socket.id]].currentGameID + ')');            
            if (onlinePlayers[usersSockets[socket.id]].currentGameID != null) {
                games[onlinePlayers[usersSockets[socket.id]].currentGameID].removePlayer (usersSockets[socket.id]);
            }
            delete users[usersSockets[socket.id]];
            delete usersSockets[socket.id];
            console.log (users);
        }
    });

    socket.on('setName', function (data){
        if (users[data] == null) {
            usersSockets[socket.id] = data;
            users[data] = socket;
            console.log(data + " has joined at IP: " + socket.request.connection.remoteAddress); //Prints the username and IP of client
            socket.emit("nameConfirmation", "Welcome to the game");
            onlinePlayers[data] = createPlayerProfile (data, socket);
        }
        else {
            socket.emit ("nameTaken", "true");
        }
    });

    socket.on ('gameSelect', function (data) {
        if (data == "Join") {
            joinGame(socket);
        }        
        socket.emit ("welcomeToGame", "Welcome to the game");
    });

    socket.on ('createGame', function (data) {
        console.log (data);
        var newGame = createNewGame (data.gameName, data.maxPlayers, data.isPrivate, data.password);
        games[newGame.id] = newGame;
        freeGames.push (newGame.id);
        newGame.join (usersSockets[socket.id], socket);
        onlinePlayers[usersSockets[socket.id]].currentGameID = newGame.id;
        var data = {};
        data.gameID = newGame.id;
        data.players = newGame.getPlayers();
        socket.emit("returnCreatedGame", data);
    });

    socket.on ('selectGame', function (data) {
        var gamesArray = [];
        for (var i in freeGames) {
            var gameData = {};
            gameData.name = games[freeGames[i]].name;
            gameData.id = games[freeGames[i]].id;
            gameData.isLocked = games[freeGames[i]].isLocked;
            gameData.password = games[freeGames[i]].password;
            gameData.playerCount = games[freeGames[i]].playerCount;
            gameData.maxPlayers = games[freeGames[i]].maxPlayers;
            gamesArray.push (gameData);
        }
        socket.emit ("gamesList", gamesArray);
    });

    socket.on ("selectedGame", function (data) {
        games[data].join (usersSockets[socket.id], socket);
        onlinePlayers[usersSockets[socket.id]].currentGameID = data;
        var gameData = {};
        gameData.gameID = data;
        gameData.players = games[data].getPlayers();
        socket.emit("returnSelectedGame", gameData);
    });
    socket.on ('rollDice', function (data) {
        var firstDice = Math.floor(Math.random() * 6) + 1;
        var secondDice = Math.floor(Math.random() * 6) + 1;
        var data = {};
        data.firstDice = firstDice;
        data.secondDice = secondDice;
        if (firstDice == secondDice) {
            data.isDouble = true;
        }
        else {
            data.isDouble = false;
        }        
        games[onlinePlayers[usersSockets[socket.id]].currentGameID].broadcastToPlayers ("diceRollResult", data);
    });

    socket.on ("gameChat", function (data) {
        console.log (data);
        games[onlinePlayers[usersSockets[socket.id]].currentGameID].chat (socket, data, usersSockets[socket.id]);
    });
});

function joinGame (socket) {
    if (freeGames.length > 0) {
        try {
            games[freeGames[0]].join(usersSockets[socket.id], socket);
        }
        catch (err){
            console.log ("There was an error adding a player to the game.");
        }
    }
    else {
        var newGame = createNewGame ("Game", 8, false, null);
        games [newGame.id] = newGame
        freeGames.push(newGame.id);
    }
    
    onlinePlayers[usersSockets[socket.id]].currentGameID = freeGames[0];
    var data = {};
    data.gameID = freeGames[0];
    data.players = games[freeGames[0]].getPlayers();
    socket.emit("returnGame", data);
}

//Allow user to name their game if they create it, add name and ID attributes to game class. Maybe also add a game owner
//View game names on the select game screen
