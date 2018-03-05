var socket = io();

var username = "";
var playerList = [];

var playerIcons = ["player1", "player2", "player3", "player4"];
var playerIconIndex = 0;

var players = {};
var doubles = [0, 0, 0, 0];
var turn = 0;

var myTurn = false;
var haveRolled = false;

var diceUnicode = {
    1: "&#9856;",
    2: "&#9857;",
    3: "&#9858;",
    4: "&#9859;",
    5: "&#9860;",
    6: "&#9861;"
}

var properties = (function() {
    var json = null;
    $.ajax({
        'async': true,
        'global': false,
        'url': "scripts/properties.json",
        'dataType': "json",
        'success': function (data) {
            json = data;
        }
    });
    return json;
})();

var communityChestArray = (function() {
    var json = null;
    $.ajax({
        'async': true,
        'global': false,
        'url': "scripts/communityChest.json",
        'dataType': "json",
        'success': function (data) {
            json = data;
        }
    });
    return json;
})();

var properties = (function() {
    var json = null;
    $.ajax({
        'async': true,
        'global': false,
        'url': "scripts/chances.json",
        'dataType': "json",
        'success': function (data) {
            json = data;
        }
    });
    return json;
})();

var createdGameIsPrivate = false;
var maxPlayersIsNumeric = false

var lockedGames = {};

document.addEventListener ("DOMContentLoaded", init, false);

function init () {
    document.getElementById("submitUsername").addEventListener ("click", setUsername, false);    
    $("#usernameInput").on ("keypress", function (event) {
        if (event.keyCode == 13) {
            $("#submitUsername").click();
        }
    });
}

function shuffles(array){
    var i =0;
    var j = 0;
    var temp = null;
  
    for(i = array.length-1;i>0;i-=1){
        j = Math.floor(Math.random()*(i+1));
        temp=array[i];
        array[i]=array[j];
        array[j]=temp;
    }
}

function getChanceCard() {
    var card = chanceArray.shift();
    chanceArray.push(card);
    fadeCardOut(card, "chanceCard");
}

//First attempt using Philip's move functions
function createPlayer(name) { //icon is auto assigned for now
    var player = {};
    player.name = name; //done
    player.id = null//playerIcons[playerIconIndex]; //done
    player.position = "0000"; //done
    player.doublesRolled = 0; //The number of doubles the player has rolled in a row
    player.money = 1500; //done
    player.assets = []; //done

    //player.railroadsOwned = 0;
    //player.utilitiesOwned = 0;

    player.properties = {};
    player.properties["brown"] = [];
    player.properties["pink"] = [];
    player.properties["lightblue"] = [];
    player.properties["orange"] = [];
    player.properties["red"] = [];
    player.properties["green"] = [];
    player.properties["blue"] = [];
    player.properties["yellow"] = [];
    player.properties["railroad"] = [];
    player.properties["utilities"] = [];

    player.getOutOfJail = 0;
    player.jail = {};
    player.jail.jailTag = false;
    player.jail.jailRoll = 0;
    player.jail.justReleased = false;

    playerIconIndex ++;

    return player;
}

function chance(playerPos, player, card){
    if (card.Id == 6 ){
        setJailCard();
        decideOnNextPlayer();
    } else if (card.Id == 8){
        placeInJail();
    } else if (card.Id == 17) {
        //Advances player to appropriate tile
        advance(card.Tile, player);
    } else if(card.Id == 15){
        movePlayer(player, 3); // moves player forward 3 spaces
    } else if (card.Id == 16){
        moveBackwards(player, 3);
    } else if (card.Id == 9 ){
        // must calculate the amount of houses and hotels the player has.
        calcHouseHotels(card.Amount[0],card.Amount[1]); // calculates players houses and hotels
        decideOnNextPlayer();
    } else if (card.Id == 14) {
        doubleRentFromChance = true;
        var playersLeft = parseInt(playerPos.substring(0, 2));
        var playersRight = parseInt(playerPos.substring(2, 4));
        var spaces;
        if(playerPos == "0007") {
            spaces = distanceCalculator("0510", playerPos);
        } else if(playerPos == "1008") {
            spaces = distanceCalculator("1005", playerPos);
        } else if("0400") {
            spaces = distanceCalculator("0005", playerPos);
        }
        movePlayer(players[turn], spaces);
    } else if (card.Id == 22) {
        // advances player to nearest utility
        var shortest;
        var utilDist1 = distanceCalculator("0210", playerPos);
        var utilDist2 = distanceCalculator("1002", playerPos);
        if(utilDist1 < utilDist2) {
            shortest = utilDist1;
        } else {
            shortest = utilDist2;
        }

        movePlayer(player, shortest);
    }
}    

function setJailCard(){
    players[turn].jailCard = true;
    alert("Player received Get out of Jail Free Card");
}

function calcHouseHotels(housePrice, hotelPrice) {
    var houses = 0;
    var hotels = 0;
    var houseP = 0;
    var hotelP = 0;
    var cost;
    for (var i = 0; i < players[turn].assets.length; i++){
        // line below checks the current properties object for current players assets in which it can find number of houses
        if (properties[players[turn].assets[i]].numberOfHouses == 5){
            hotels += 1;
        } else {
            houses += properties[players[turn].assets[i]].numberOfHouses;
        }
    }
    houseP = houses * housePrice;
    hotelP = hotels * hotelPrice;
    cost = houseP + hotelP;
    alert('Total Houses: '+houses +', Total Hotels: '+hotels + ', Total Repairs Cost: '+cost);
    //document.getElementById("endTurn").removeAttribute("disabled");
    //comChestFine(cost);
}

function advance(tile, playerObj){
    var spaces = distanceCalculator(tile, playerObj.position);
    movePlayer(playerObj, spaces);
    //document.getElementById(tile).appendChild(players[turn].id);
}

function getCommChestCard() {
    var card = communityChestArray.shift(); // takes top card from array
    //var card = communityChestArray[4];
    communityChestArray.push(card);
    fadeCardOut(card, "commChestCard");
}

async function communityChest(playerPos, player, card){
    /*await sleep(500);
    var card = communityChestArray.shift(); // takes top card from array
    //var card = communityChestArray[4];
    communityChestArray.push(card);  // adds card to end of array*/
  
    if (card.Id == 6){
        setJailCard(); // player receives get out of jail free card
        decideOnNextPlayer();
    } else if (card.Id == 1 || card.Id == 3 || card.Id == 5 || card.Id == 7 || card.Id ==11) {
        // community chest rewarding players
        //alert(card.Name);
        comChestCollect(card.Amount); // collect reward
        decideOnNextPlayer();
    } else if(card.Id == 2 || card.Id == 12 || card.Id == 13){
        // community chest fining player players
        //alert(card.Name);
        comChestFine(card.Amount); // fined amount on card
        decideOnNextPlayer();
    } else if (card.Id == 8){
        //go to jail card drawn from community chest
        //alert(card.Name);
        placeInJail(); // place player in jail
    } else if (card.Id == 4 || card.Id == 10){
        // must collect certain amount from each player
        alert(card.Name + ', Amount Credited: '+ card.Amount * (players.length -1));
        playerCollect(card.Amount); //collects amount stated on card from each player
        decideOnNextPlayer();
    } else if (card.Id == 9){
        // calculate the amount of houses and hotels player has
        //alert(card.Name);
        calcHouseHotels(card.Amount[0],card.Amount[1]); // calculates players houses and hotels
        decideOnNextPlayer();
    }
}

function comChestCollect(amount){
    players[turn].money += amount;
}

function comChestFine(amount){
    players[turn].money -= amount;
}

function playerCollect(amount){
    // collects amount from each player and adds to current player.
    var collection = 0;
    for(var i = 0; i < players.length; i++){
        if(players[i] != players[turn]){
            players[i].money -=amount;
            collection += amount;
        }
    }
    players[turn].money += collection;
}

function setUsername() {
    if (document.getElementById ("usernameInput").value == false) {
        $("#usernameInput").css ("margin-top", "0px");
        $("#usernameInputLabel").html ("Username must be given");
        document.getElementById ("usernameInput").style.border = "1.5px solid #ed3d3d";    
    }
    else {
        username = document.getElementById("usernameInput").value.replace(/\s/g,'');
        socket.emit ("setName", username);
    }
}

socket.on ("nameConfirmation", function (data) {
    $("#inputArea").fadeOut(function () {
        $("#inputArea").load("../content/gameSelect.txt", function () {
            $("#inputArea").width("60%");
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
                $("#content").attr ("id", "contentWithBoard");
                playerList = data.players;            
                listPlayers (playerList);
                serverMessage ("Welcome to the Game");
                if (myTurn) {
                    $("#rollDiceButton").prop("disabled", false);
                }
        });
    });

    $(document).on('click','#rollDiceButton',function(){
        $("#rollDiceButton").attr("disabled", "disabled");
        haveRolled = true;
        socket.emit ("rollDice", "true");
    });

    $(document).keypress ("#chatInput", function (event) {
        if (event.keyCode == 13 && $.trim($("#chatInput").val()) != 0) {
            socket.emit ("gameChat", $("#chatInput").val());
            var node = document.createElement ("span");
            var text = document.createTextNode ($("#chatInput").val());
            node.className = "outgoingMessage";

            var time = new Date().toLocaleTimeString(navigator.language, {hour: '2-digit', minute:'2-digit'});
            node.title = time;
            node.append(text);            
            $("#chatWindow").append(node);
            $("#chatWindow").animate({ scrollTop: $('#chatWindow').prop("scrollHeight")}, 1000);
            $("#chatInput").val("");
            
            window.setTimeout (function () {
                $("#chatInput").blur();
            }, 60000);
        }
    });
}

socket.on ("nameTaken", function (data) {
    $("#usernameInput").css ("margin-top", "0px");
    $("#usernameInputLabel").html ("This username is already in use");
    document.getElementById("usernameInput").style.border = "1.5px solid #ed3d3d";
});

socket.on ("welcomeToGame", function (data){
    console.log (data);
});

socket.on ("returnGame", function (data){
    loadGame (data);
});

function listPlayers (playersArray) {
    for (var i in playersArray) {
        if (playersArray[i] != null) {
            players[playersArray[i]] = createPlayer(playersArray[i]);
            var node = document.createElement ("span");
            var text = document.createTextNode (playersArray[i]);
            node.id = "User_" + playersArray[i];
            node.className = "playerText";
            node.append(text);
            $("#gamePlayers").append(node);
        }
    }
    $("#contentWithBoard").fadeIn();
}

socket.on ("playerLeft", function (data) {
    serverMessage (data + " has disconnected from the game.");
    $("#gamePlayers").children("#User_" + data).css("text-decoration", "line-through");
});

socket.on ("newPlayer", function (data) {
    if (document.getElementById("User_" + data) == null) {
        serverMessage (data + " has joined the game.");
        players[data] = createPlayer(data);
        var node = document.createElement ("span");
        var text = document.createTextNode (data);
        node.id = "User_" + data;
        node.className = "playerText";
        node.append(text);
        $("#gamePlayers").append(node);
    }
    else {
        $("#gamePlayers").children("#User_" + data).css("text-decoration", "none");
        serverMessage (data + " has rejoined the game.");
    }    
});

socket.on ("yourTurn", function () {
    myTurn = true;
    haveRolled = false;
    $("#rollDiceButton").prop("disabled", false);
});

socket.on ("diceRollResult", function (data) {
    var total = data.firstDice + data.secondDice;
    $(".dice").fadeOut (function () {
        $("#firstDice").children("div").html (diceUnicode[data.firstDice]);
        $("#secondDice").children("div").html (diceUnicode[data.secondDice]);
        $(".dice").fadeIn ();
    });
    players[data.player].id = data.icon;
    $("#" + data.icon).attr ("title", data.player);
    movePlayer (players[data.player], total);
})

//First attempt using Philip's move functions
// function callMovePlayer (roll) {
//     if(players[turn].inJail == 0 && roll % 2 == 0) {
//         doubles[turn]++;
//         if(doubles[turn] == 3) {
//             //Put player in jail
//             players[turn].inJail = 1;
//             //The position of jail isLocje 0010
//             players[turn].position = "0010";
//             //Putting the player in the jail tile
//             document.getElementById(players[turn].position).appendChild(players[turn].icon);
//             if(turn == 3) {
//                 turn = 0;
//             } else {
//                 turn++;
//             }
//         } else {
//             //They've rolled a double but not their third, so they can go again
//             movePlayer(players[turn].icon, roll, turn);
//         }
//     //Otherwise they're either not in jail or they get out of jail
//     } else if(players[turn].inJail == 0 || roll == 10 || players[turn].inJail == 3) {
//         doubles[turn] = 0;
//         //Check here if they are out of jail anyway so they don't get to roll again
//         if(players[turn].inJail > 0) {
//             if(players[turn].jail == 3) {
//                 console.log("Pay the toll troll");
//             }
//             players[turn].inJail = 0;
//         }
//         movePlayer(players[turn].icon, roll, turn);
//         if(turn == 3) {
//             turn = 0;
//         } else {
//             turn++;
//         }
//     } else {
//         //Otherwise they spend another turn in jail
//         players[turn].inJail++;
//         if(turn == 3) {
//             turn = 0;
//         } else {
//             turn++;
//         }
//     }
// }

async function movePlayer(playerObj, spacesToMove) {//, turn) {
    //Gets first two numbers in the id
    var left = parseInt(playerObj.position.substring(0, 2));
    //Gets the last two numbers in the id
    var right = parseInt(playerObj.position.substring(2, 4));
    var newPosition; //The position they finish on
    //Deciding how the player's icon should move based on their position on the board
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
        //Getting the player's new position back into the "xxxx" format
        newPosition = positionHack(left, right);
        spacesToMove--;
        //Placing the player's icon on the new tile
        document.getElementById(newPosition).appendChild(document.getElementById (playerObj.id));
        //Waiting for half a second so it looks nicer
        await sleep(500);
        //walkSound.play();
        if(newPosition == "0000") {
            //console.log("Player has passed go; collect 200");
            alert("Player has passed go; collect 200");
        }
    }

    //Updating player's position
    playerObj.position = newPosition;
    //Checking for what tile they land on, currently only says "This tile is x, etc", Sean
    //and Dave are working on that I believe
    
    
    //checkTile(newPosition);
    
    
    //if(decidingOnProperty) {
    //diceFadeOut();
    //}
    if (myTurn && haveRolled) {
        endTurn ();
    }
    return;
}

// function checkTile(playerPos) {
//     //decidingOnProperty = true;
//     //walkSound.pause();
//     //console.log(playerPos);
//     alert("Player position: " + playerPos);
//     if(playerPos == "0010" || playerPos == "0000") {
//         decideOnNextPlayer();
//         //This is the jail tile, do nothing
//     } else if(playerPos == "0007" || playerPos == "1008" || playerPos == "0400") {
//         //Player has landed on chance card
//         //console.log("Draw chance card");
//         //decidingOnProperty = true;
//         alert("Draw chance card");
//         getChanceCard();
//     } else if(playerPos == "0002" || playerPos == "0710" || playerPos == "0700") {
//         //Player has landed on community chess
//         //console.log("Draw community chest card");
//         alert("Draw community chest card");
//         getCommChestCard();
//     } else if(playerPos == "1010") {
//         //Player has landed on Free Parking
//         //console.log("Free Parking");
//         landedOnKitty(players[turn]);
//     } else if(playerPos == "1000") {
//         //Player is sent to jail
//         //console.log("Player is sent to jail");
//         alert("player is sent to jail");
//         placeInJail();
//         //decideOnNextPlayer();
//     } else if(playerPos == "0004" || playerPos == "0200") {
//         //console.log("Player pays a tax");
//         playerFined(players[turn], playerPos);
//         //decideOnNextPlayer();
//     } else { 
//         isOwned(players[turn], playerPos);
//     }

//     //Will probably have to put this somewhere else
//     /*if(endTurnAllowed) {
//         if(!rolledDouble) {
//             document.getElementById("endTurn").removeAttribute("disabled");
//         } else {
//             playerRolledDouble();
//         }
//     }*/
// }



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

function endTurn () {
    if (myTurn && haveRolled) {
        var prompt = document.createElement ("div");
        prompt.className = "endTurnPrompt";
        $(prompt).hide().appendTo("#contentWithBoard").fadeIn();
        $(".endTurnPrompt").html ("<div><button id='endItAll'>End your turn</button></div>");
        $("#endItAll").click (function () {
            $(".endTurnPrompt").fadeOut(function () {
                $(".endTurnPrompt").remove();
                socket.emit ("turnEnded", "true");
                myTurn = false;
                haveRolled = true;
                return;
            });            
        });
        window.setTimeout (function () {
            if (myTurn && haveRolled) {
                socket.emit ("turnEnded", "true");
                myTurn = false;
                haveRolled = true;
            }            
            $(".endTurnPrompt").fadeOut(function () {
                $(".endTurnPrompt").remove();
                return;
            });
        }, 5000);
    }
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
                if ($.isNumeric($("#maxPlayersInput").val())) {                   
                    $("#maxPlayersInputLabel").html (""); 
                    $("#maxPlayersInput").css ("margin-top", "14px");
                    document.getElementById ("maxPlayersInput").style.border = "none";
                    maxPlayersIsNumeric = true
                }
                else {
                    $("#maxPlayersInput").css ("margin-top", "0px");
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
    var namePass = false;
    var maxPlayersPass = false;
    var passwordPass = false;

    if ($("#gameName").val() != false) {
        $("#gameNameLabel").html ("");
        $("#gameName").css ("margin-top", "14px");
        namePass = true;
    }
    else {
        $("#gameName").css ("margin-top", "0px");
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
            $("#gamePassword").css ("margin-top", "14px");
            passwordPass = true;
        }
        else {
            $("#gamePassword").css ("margin-top", "0px");
            $("#gamePasswordLabel").html ("Password must be given");
            document.getElementById("gamePassword").style.border = "1.5px solid #ed3d3d";
            passwordPass = false;
        }
    }

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
                            $("#passwordInput").css ("margin-top", "0px");
                            $("#passwordInputLabel").html ("Password invalid");                            
                            $(".passwordInput").css ("border", "1.5px solid #ed3d3d");
                        }
                    }
                    else {
                        $("#passwordInput").css ("margin-top", "0px");
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
    var time = new Date().toLocaleTimeString(navigator.language, {hour: '2-digit', minute:'2-digit'});
    node.title = time;
    node.append(text);
    if (playerName != null) {
        $("#chatWindow").append(playerName);
    }    
    $("#chatWindow").append(node);
    $("#chatWindow").animate({ scrollTop: $('#chatWindow').prop("scrollHeight")}, 1000);
});

socket.on ("serverMessage", function (data) {
    serverMessage(data);
});

function serverMessage (message) {
    var node = document.createElement ("span");
    var text = document.createTextNode (message);
    node.className = "serverMessage";
    var time = new Date().toLocaleTimeString(navigator.language, {hour: '2-digit', minute:'2-digit'});
    node.title = time;
    node.append(text);
    $("#chatWindow").append(node);
    $("#chatWindow").animate({ scrollTop: $('#chatWindow').prop("scrollHeight")}, 1000);
}