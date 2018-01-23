var socket = io();

document.addEventListener ("DOMContentLoaded", init, false);

function init () {
    document.getElementById("submitUsername").addEventListener ("click", setUsername, false);
}

function setUsername() {
    socket.emit ("setName", document.getElementById("usernameInput").value);
}

socket.on ("nameConfirmation", function (data) {
    console.log(data);
    $("#inputArea").fadeOut();
    window.setTimeout (function() {
        $("#inputArea").html("<button id='joinGameButton'>Join a game</button><br><button id='selectGameButton'>Select a Game</button><br><button id='createGameButton'>Create Game</button>");
        $("#inputArea").fadeIn();
        $("#joinGameButton").on("click", joinGameClick);
        $("#selectGameButton").on("click", selectGameClick);
        $("#createGameButton").on("click", createGameClick);
    }, 500);
})

function joinGameClick () {
    socket.emit ("gameSelect", "Join");
}

function selectGameClick () {
    socket.emit ("gameSelect", "Select");
}

function createGameClick () {
    socket.emit ("gameSelect", "Create");
}