var socket = io();

//First attempt using Philip's move functions
var players = [];
var doubles = [0, 0, 0, 0];
var turn = 0;
//End first attempt

document.addEventListener ("DOMContentLoaded", init, false);

function init () {
    document.getElementById("submitUsername").addEventListener ("click", setUsername, false);

    //First attempt using Philip's move functions
    // var playerIcon = document.getElementById ("player1");
    // players.push(player(playerIcon));
    //console.log(document.getElementById ("player1"));
    
    //End first attempt
}

//First attempt using Philip's move functions
function player(icon) {
    var player = {};
    player.icon = icon;
    player.position = "0000";
    //If inJail greater than 0, the player is in jail (max jail can be is 3).
    //Every turn they stay in jail, inJail is incremented, when they leave it is set to 0 again
    //They get out by either rolling a double, have a GOJF card, or pay the toll troll
    player.inJail = 0;
    return player;
}
//End first attempt

function setUsername() {
    if (document.getElementById ("usernameInput").value == false) {
        document.getElementById ("usernameInput").style.border = "1.5px solid #ed3d3d";    
    }
    else {
        socket.emit ("setName", document.getElementById("usernameInput").value);
    }
}

socket.on ("nameConfirmation", function (data) {
    console.log(data);
    $("#inputArea").fadeOut();
    window.setTimeout (function() {
        $("#inputArea").load("../content/gameSelect.txt");
        $("#inputArea").width("60%");
        $("#inputArea").fadeIn();
        $(document).on('click','#joinGameButton', joinGameClick);
        $(document).on('click','#selectGameButton', selectGameClick);
        $(document).on('click','#createGameButton', createGameClick);
    }, 500);
});

socket.on ("welcomeToGame", function (data){
    console.log (data);
});

socket.on ("returnGame", function (data){
    // console.log ("Game ID: " + data[0] + "\nPlayers: " + data[1]);
    console.log ("Game ID: " + data.gameID);
    $("#content").fadeOut()
    window.setTimeout (function() {
        $("#content").load("../content/boardHTML.txt");
        $("#content").fadeIn();
    }, 500);
    
    // $("#temp").on("click", function () {
    //     socket.emit ("rollDice", true);
    // });
    // document.getElementById ("tempButton").addEventListener ("click", function (){
    //     socket.emit ("rollDice", true);
    // }, false);

    $(document).on('click','#rollDiceButton',function(){
        $("#rollDiceButton").attr("disabled", "disabled");
        socket.emit ("rollDice", "true");
    })
});

socket.on ("diceRollResult", function (data) {
    //CALL MOVE PLAYER FUNCTIONS
    players.push(player(document.getElementById ("player1"))); ///TODO - THIS NEEDS TO BE ADJUSTED, IT'S IN A SHIT POSITION AND NEEDS TO BE BETTER IMPLEMENTED, JUST HERE FOR DEMO PURPOSES
    var total = data.firstDice + data.secondDice;
    console.log ("Is Double: " + data.isDouble + "\nFirst Dice: " + data.firstDice + "\nSecond Dice: " + data.secondDice);
    callMovePlayer (total);
})

//First attempt using Philip's move functions
function callMovePlayer (roll) {
    //var roll = Math.floor(Math.random() * (12 - 2 + 1) + 2);
    //console.log(turn + " " + roll + " " + doubles[turn] + " " + players[turn].inJail);

    if(players[turn].inJail == 0 && roll % 2 == 0) {
        doubles[turn]++;
        if(doubles[turn] == 3) {
            //Put player in jail
            players[turn].inJail = 1;
            //The position of jail is 0010
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

function selectGameClick () {
    socket.emit ("gameSelect", "Select");
}

function createGameClick () {
    socket.emit ("gameSelect", "Create");
}