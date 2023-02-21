var socket = io();
var userId = "user";


$('form').submit(function() {
    socket.emit('chat message', {value: $('#m').val(), userId: userId});
    $('#m').val('');
    return false;
});

$("#led-link").on('click', function(e){
    socket.emit('toggle led', {value: 0, userId: userId});
});
$("#doorbutton").on('click', function(e){
    socket.emit('toggle door', {value: 0, userId: userId});
});

socket.on('toggle led', function(msg) {
    if(msg.value === false) {
        $('#messages').prepend($('<li>Motion Sensor: OFF<span> - '+msg.userId+'</span></li>'));
        $("#led-container").removeClass("on");
        $("#led-container").addClass("off");
        $("#led-container span").text("OFF");
    }
    else if(msg.value === true) {
        $('#messages').prepend($('<li>Motion Sensor: ON<span> - '+msg.userId+'</span></li>'));
        $("#led-container").removeClass("off");
        $("#led-container").addClass("on");
        $("#led-container span").text("ON");
    }
});
socket.on('toggle door', function(msg) {
    if(msg.value === false) {
        $('#messages').prepend($('<li>Door Closed<span> - '+msg.userId+'</span></li>'));
        $("#doorstatus").text("Closed");
    }
    else if(msg.value === true) {
      $('#messages').prepend($('<li>Door Opened<span> - '+msg.userId+'</span></li>'));
      $("#doorstatus").text("Opened");
    }
});
socket.on('chat message', function(msg) {
    $('#messages').prepend($('<li>'+msg.value+'<span> - '+msg.userId+'</span></li>'));
});

socket.on('connected users', function(msg) {
    $('#user-container').html("");
    for(var i = 0; i < msg.length; i++) {
        //console.log(msg[i]+" )msg[i] == userId( "+userId);
        if(msg[i] == userId)
            $('#user-container').append($("<div id='" + msg[i] + "' class='my-circle'><span>"+msg[i]+"</span></div>"));
        else
            $('#user-container').append($("<div id='" + msg[i] + "' class='user-circle'><span>"+msg[i]+"</span></div>"));
    }
});

socket.on('user connect', function(msg) {
    if(userId === "user"){
        console.log("Client side userId: "+msg);
        userId = msg;
    }
});

socket.on('user disconnect', function(msg) {
    console.log("user disconnect: " + msg);
    var element = '#'+msg;
    console.log(element)
    $(element).remove();
});

window.onunload = function(e) {
    socket.emit("user disconnect", userId);
}