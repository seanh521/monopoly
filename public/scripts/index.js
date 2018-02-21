var socket = io();

var username = "";
var playerList = [];

//First attempt using Philip's move functions
var players = [];
var doubles = [0, 0, 0, 0];
var turn = 0;
//End first attempt

var createdGameIsPrivate = false;
var maxPlayersIsNumeric = false

var lockedGames = {};

document.addEventListener ("DOMContentLoaded", init, false);
document.addEventListener("keydown", closeMenu, false);

function init () {
    document.getElementById("submitUsername").addEventListener ("click", setUsername, false);    
}

function closeMenu (event) {
    if (event.keyCode == 27 && window.getComputedStyle(document.getElementById("menuIcon2"), null).getPropertyValue("opacity") < 1) { 
        document.getElementById("menuButton").click();
    }
    if (event.keyCode == 27 && $(".inputPrompt") != null) { 
        $(".inputPrompt").fadeOut (function () {
            $(".inputPrompt").remove();
        });
    }
}

//First attempt using Philip's move functions
function player(icon) {
    var player = {};
    player.icon = icon;
    player.position = "0000";
    //If inJail greater than 0, the player isLocje in jail (max jail can be isLocje 3).
    //Every turn they stay in jail, inJail isLocje incremented, when they leave it isLocje set to 0 again
    //They get out by either rolling a double, have a GOJF card, or pay the toll troll
    player.inJail = 0;
    return player;
}
//End first attempt

function setUsername() {
    if (document.getElementById ("usernameInput").value == false) {
        $("#usernameInputLabel").html ("Username must be given");
        document.getElementById ("usernameInput").style.border = "1.5px solid #ed3d3d";    
    }
    else {
        ///////TO-DO - Strip the input for spaces and most special characters
        username = document.getElementById("usernameInput").value;
        socket.emit ("setName", username);
    }
}

socket.on ("nameConfirmation", function (data) {
    $("#inputArea").fadeOut(function () {
        $("#inputArea").load("../content/gameSelect.txt", function () {
            $("#inputArea").width("60%");
            $("#inputArea").fadeIn();
            $(document).on('click','#joinGameButton', joinGameClick);
            $(document).on('click','#selectGameButton', selectGameClick);
            $(document).on('click','#createGameButton', createGameClick);
        });        
    });
});

function loadGame (data) {
    $("#content").fadeOut(function () {
        $("#content").load("../content/boardHTML.txt", function () {
                //$("#content").css("visibility", "visible");
                playerList = data.players;            
                listPlayers (playerList);
                serverMessage ("Welcome to the Game");
        });
    });

    $(document).on('click','#rollDiceButton',function(){
        $("#rollDiceButton").attr("disabled", "disabled");
        socket.emit ("rollDice", "true");
    });

    $(document).keypress ("#chatInput", function (event) {
        if (event.keyCode == 13 && $.trim($("#chatInput").val()) != 0) {
            socket.emit ("gameChat", $("#chatInput").val());
            // var playerName = document.createElement ("p");
            // playerName.className = "senderUsername";
            // var playerNameText = document.createTextNode ("You");
            // playerName.appendChild (playerNameText);
            var node = document.createElement ("span");
            var text = document.createTextNode ($("#chatInput").val());
            node.className = "outgoingMessage";
            node.append(text);            
            // $("#chatWindow").append(playerName); 
            $("#chatWindow").append(node);
            $("#chatWindow").scrollTop($("#chatWindow").height());
            $("#chatInput").val("");
            $("#chatInput").blur();
        }
    });
}

socket.on ("nameTaken", function (data) {
    $("#usernameInputLabel").html ("This username is already in use");
    document.getElementById("usernameInput").style.border = "1.5px solid #ed3d3d";
});

socket.on ("welcomeToGame", function (data){
    console.log (data)
});

socket.on ("returnGame", function (data){
    //console.log ("Game ID: " + data.gameID + "\nPLayers: " + data.players);
    loadGame (data);
});

function listPlayers (playersArray) {
    for (var i in playersArray) {
        if (playersArray[i] != null) {
            var node = document.createElement ("span");
            var text = document.createTextNode (playersArray[i]);
            node.id = "User_" + playersArray[i];
            node.className = "playerText";
            node.append(text);
            $("#gamePlayers").append(node);
        }
    }
    $("#content").fadeIn();
}

socket.on ("playerLeft", function (data) {
    serverMessage (data + " has disconnected from the game.");
    $("#gamePlayers").children("#User_" + data).css("text-decoration", "line-through");
});

socket.on ("newPlayer", function (data) {
    serverMessage (data + " has joined the game.");
    if (document.getElementById("User_" + data) == null) {
        
        var node = document.createElement ("span");
        var text = document.createTextNode (data);
        node.id = "User_" + data;
        node.className = "playerText";
        node.append(text);
        $("#gamePlayers").append(node);
    }
    else {
        $("#gamePlayers").children("#User_" + data).css("text-decoration", "none");
    }    
});

socket.on ("diceRollResult", function (data) {
    //CALL MOVE PLAYER FUNCTIONS
    players.push(player(document.getElementById ("player1"))); ///TO-DO - THIS NEEDS TO BE ADJUSTED, IT'S IN A SHIT POSITION AND NEEDS TO BE BETTER IMPLEMENTED, JUST HERE FOR DEMO PURPOSES
    var total = data.firstDice + data.secondDice;
    console.log ("Is Double: " + data.isDouble + "\nFirst Dice: " + data.firstDice + "\nSecond Dice: " + data.secondDice);
    callMovePlayer (total);
})

//First attempt using Philip's move functions
function callMovePlayer (roll) {
    if(players[turn].inJail == 0 && roll % 2 == 0) {
        doubles[turn]++;
        if(doubles[turn] == 3) {
            //Put player in jail
            players[turn].inJail = 1;
            //The position of jail isLocje 0010
            players[turn].position = "0010";
            //Putting the player in the jail tile
            document.getElementById(players[turn].position).appendChild(players[turn].icon);
            if(turn == 3) {
                turn = 0;
            } else {
                turn++;
            }
        } else {
            //They've rolled a double but not their third, so they can go again
            movePlayer(players[turn].icon, roll, turn);
        }
    //Otherwise they're either not in jail or they get out of jail
    } else if(players[turn].inJail == 0 || roll == 10 || players[turn].inJail == 3) {
        doubles[turn] = 0;
        //Check here if they are out of jail anyway so they don't get to roll again
        if(players[turn].inJail > 0) {
            if(players[turn].jail == 3) {
                console.log("Pay the toll troll");
            }
            players[turn].inJail = 0;
        }
        movePlayer(players[turn].icon, roll, turn);
        if(turn == 3) {
            turn = 0;
        } else {
            turn++;
        }
    } else {
        //Otherwise they spend another turn in jail
        players[turn].inJail++;
        if(turn == 3) {
            turn = 0;
        } else {
            turn++;
        }
    }
}

function positionHack(left, right) {
    var leftFixed;
    var rightFixed;

    if(left < 10) {
        leftFixed = "0".concat(left.toString());
    } else {
        leftFixed = left.toString();
    }

    if(right < 10) {
        rightFixed = "0".concat(right.toString());
    } else {
        rightFixed = right.toString();
    }

    return leftFixed.concat(rightFixed);
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
//End first attempt

async function movePlayer(playr, spacesToMove, turn) { //async
    //Gets first two numbers in the id
    //console.log (players[0]);
    var left = parseInt(players[turn].position.substring(0, 2));
    //Gets the last two numbers in the id
    var right = parseInt(players[turn].position.substring(2, 4));
    var newPosition;
    while(spacesToMove > 0) {
        if(left == 0 && right < 10) {
            right++;
        } else if(right == 10 && left < 10) {
            left++;
        } else if(left == 10 && right > 0) {
            right--;
        } else if(right == 0 && left > 0) {
            left--;
        }
        newPosition = positionHack(left, right);
        spacesToMove--;
        document.getElementById(newPosition).appendChild(playr);
        await sleep(500);
    }

    players[turn].position = newPosition;
    $("#rollDiceButton").removeAttr("disabled");
}

function joinGameClick () {
    socket.emit ("gameSelect", "Join");
}

function createGameClick () {
    $("#inputArea").fadeOut(function () {
        $("#inputArea").load("../content/createGame.txt", function () {
            $("#inputArea").width("25%");
            $("#inputArea").height("40%");
            $("#inputArea").fadeIn();
            $(document).on('click', '#createGame', createGame);
            $(document).on("change keyup paste", "#maxPlayersInput", function (event) {
                console.log ($("#maxPlayersInput").val()); 
                if ($.isNumeric($("#maxPlayersInput").val())) {                   
                    $("#maxPlayersInputLabel").html (""); 
                    document.getElementById ("maxPlayersInput").style.border = "none";
                    maxPlayersIsNumeric = true
                }
                else {
                    $("#maxPlayersInputLabel").html ("Only numbers allowed in this input");
                    document.getElementById ("maxPlayersInput").style.border = "1.5px solid #ed3d3d";
                    maxPlayersIsNumeric = false
                }
            });
            $("#checkboxLabel").unbind ("click");
            $("#checkboxLabel").change (function () {
                if ($("#gamePassword").prop("disabled")) {
                    $("#gamePassword").prop("disabled", false);
                    createdGameIsPrivate = true;
                }
                else {
                    $("#gamePassword").prop("disabled", true);
                    createdGameIsPrivate = false;
                }                
            });
        });        
    });
}

function createGame () {
    console.log ("Create Game clicked")
    var namePass = false;
    var maxPlayersPass = false;
    var passwordPass = false;

    if ($("#gameName").val() != false) {
        $("#gameNameLabel").html ("");
        namePass = true;
    }
    else {
        $("#gameNameLabel").html ("Input cannot be left empty");
        document.getElementById("gameName").style.border = "1.5px solid #ed3d3d";
        namePass = false;
    }

    if (maxPlayersIsNumeric || $("#maxPlayersInput").val() == false) {
         maxPlayersPass = true;
    }
    else {
        maxPlayersPass = false;
    }

    if (createdGameIsPrivate) {
        if ($("#gamePassword").val() != false) {
            $("#gamePasswordLabel").html ("");
            passwordPass = true;
        }
        else {
            $("#gamePasswordLabel").html ("Password must be given");
            document.getElementById("gamePassword").style.border = "1.5px solid #ed3d3d";
            passwordPass = false;
        }
    }

    console.log ("Name Pass: " + namePass + "\nMax Players Pass: " + maxPlayersPass);
    if (namePass && maxPlayersPass) {
        if (createdGameIsPrivate) {
            if (passwordPass) {
                loadCreatedGame ();
                return;
            }
        }
        loadCreatedGame ();
    }
}

function loadCreatedGame () {
    console.log("Checking game info for creation")
    var data = {};
    data.gameName = $("#gameName").val().toString();
    
    if ($("#maxPlayersInput").val() == false) {
        data.maxPlayers = 8;
    }
    else {
        data.maxPlayers = parseInt ($("#maxPlayersInput").val());
    }
    
    if (createdGameIsPrivate) {
        data.password = $("#gamePassword").val();
        data.isPrivate = true;
    }
    else {
        data.password = null;
        data.isPrivate = false;
    }
    socket.emit ("createGame", data);
}

socket.on ("returnCreatedGame", function (data) {
    loadGame (data);
});

function selectGameClick () {
    socket.emit ("selectGame", "true");
}

socket.on ("gamesList", function (data) {
    $("#inputArea").fadeOut(function () {
        $("#inputArea").height("60%");
        $("#inputArea").html ("");
        $("#inputArea").css("overflow-y", "scroll");
        $("#inputArea").css("display", "unset");
        $("#inputArea").css("align-items", "unset");
        $("#inputArea").css("justify-content", "unset");
        for (var i in data) {
            console.log (data[i]);
            var game = document.createElement ("div");
            game.className = "gamesListElement";
            game.id = data[i].id;
            var gameInfo = document.createElement ("div");
            gameInfo.className = "gameElementInfo";
            var gameJoin = document.createElement ("button");
            gameJoin.className = "gameElementJoin";
            gameJoin.id = game.id = data[i].id;
            var gameJoinText = document.createTextNode ("Join");
            gameJoin.append (gameJoinText);
            var gameInfoText = document.createTextNode (data[i].name + " (" + data[i].id + ")\n" + data[i].playerCount + "/" + data[i].maxPlayers);
            gameInfo.append (gameInfoText);
            if (data[i].isLocked) {
                gameInfo.innerHTML += "<i class='material-icons' id='lockIcon'>lock_outline</i>";
                lockedGames [data[i].id] = data[i].password;
                console.log (lockedGames)
            }
            game.append (gameInfo);
            game.append (gameJoin);
            $("#inputArea").append (game);
        }
        $("#inputArea").fadeIn();
        $(".gameElementJoin").click (function (event) {
            if (lockedGames[event.target.id] == null) {
                socket.emit ("selectedGame", event.target.id);
            }
            else {
                var prompt = document.createElement ("div");
                prompt.className = "inputPrompt";
                $(prompt).hide().appendTo("#content").fadeIn();
                $(".inputPrompt").html ("<div><label for='maxPlayers' id='passwordInputLabel' class='warningLabel'></label><input name=\"gamePassword\" type=\"password\" class=\"passwordInput\" autocomplete=\"off\" placeholder=\"Game Password\" onfocus=\"this.placeholder = ''\" onblur=\"this.placeholder = 'Game Password'\"/><button id='joinLockedGameButton'>Join Game</button></div><div class='closeButton'><i class='material-icons' id='closeIcon'>close</i></div>");
                $("#joinLockedGameButton").click (function () {
                    if ($(".passwordInput").val() != false) {
                        if (lockedGames[event.target.id] == $(".passwordInput").val()) {
                            socket.emit ("selectedGame", event.target.id);
                        }
                        else {
                            $("#passwordInputLabel").html ("Password invalid");
                            $(".passwordInput").css ("border", "1.5px solid #ed3d3d");
                        }
                    }
                    else {
                        $("#passwordInputLabel").html ("Password must be given");
                        $(".passwordInput").css ("border", "1.5px solid #ed3d3d");
                    }
                });
                $(".closeButton").click (function () {
                    $(".inputPrompt").fadeOut (function () {
                        $(".inputPrompt").remove();
                    });
                });
            }
        })
    });
});

socket.on ("returnSelectedGame", function (data) {
    loadGame (data);
});

socket.on ("gameChat", function (data) {
    var playerName = null;
    if ($("#chatWindow").children().last().attr("id") != data.sender) {
        playerName = document.createElement ("p");
        playerName.className = "chatUsername";
        var playerNameText = document.createTextNode (data.sender);
        playerName.appendChild (playerNameText);
    }    
    var node = document.createElement ("span");
    var text = document.createTextNode (data.message);
    node.id = data.sender;
    node.className = "incomingMessage";
    node.append(text);
    if (playerName != null) {
        $("#chatWindow").append(playerName);
    }    
    $("#chatWindow").append(node);
    $("#chatWindow").scrollTop($("#chatWindow").height());
});

socket.on ("serverMessage", function (data) {
    serverMessage(data);
});

function serverMessage (message) {
    var node = document.createElement ("span");
    var text = document.createTextNode (message);
    node.className = "serverMessage";
    node.append(text);
    $("#chatWindow").append(node);
    $("#chatWindow").scrollTop($("#chatWindow").height());
}