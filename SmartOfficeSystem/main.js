"use strict" ; // Strict mode
//================================================Modules===============================================================
var upmBuzzer = require("jsupm_buzzer");
var mraa=require('mraa');
var SerialPort = require("serialport");
var grove_motion = require('jsupm_biss0001');
var groveSensor = require('jsupm_grove');
var five = require("johnny-five");
var Edison = require("edison-io");
var moment = require("moment");
var express = require('express');
var app = express();
var path = require('path');
var http = require('http').Server(app);
var io = require('socket.io')(http);
var board = new five.Board({
  io: new Edison()
});
//====================================================Buzzer Sounds===================================================
var chords = [];
chords.push(upmBuzzer.DO);
chords.push(upmBuzzer.FA);
chords.push(upmBuzzer.DO);
chords.push(upmBuzzer.FA);
chords.push(upmBuzzer.DO);
chords.push(upmBuzzer.FA);
chords.push(upmBuzzer.DO);
chords.push(upmBuzzer.FA);
var chordIndex = 0;
//Start of program
board.on("ready", function() { 
//=============================================Declarations=============================================================
 var thermometer = new five.Thermometer({
    controller: "GROVE",
    pin: "A0"
  }); 
var u = new mraa.Uart(0); //UART
var serialPath = u.getDevicePath();
var alarm = new five.Button(2); //D2
var button = new five.Button(3); //D3
var touch = new five.Button(4); //D4
var motor=new five.Led(8);
var led = new five.Led(5);
//var led=0;
var ledState = true; //Boolean to hold the state of Security
var doorState=true;
var xz=1; //Motion Sensor State
var xy=1;
var leftTime=null;
var motion=0;
var myBuzzer = new upmBuzzer.Buzzer(6); //D6
var myMotionObj = new grove_motion.BISS0001(7); //D7
var lcd = new five.LCD({
    controller: "JHD1313M1" //LCD
 });

//Security
var beforeTime = moment('8:00 am','hh:mm a');  
var afterTime = moment('2:58:00 pm','hh:mm:ss a');   // Time when motion sensor turns on 
var offTime = moment('2:59:00 pm','hh:mm:ss a');   // Time when motion sensor turns off
// Getting date & time value using momentJS   
function time() {
 return moment().add(8,'hours').format("h:mm:ss a");
}
function date(){
 return moment().format("dddd,MMM D");
}
function dateTime(){
return moment().add(8,'hours').format("dddd, MMMM Do YYYY, h:mm:ss a");
}
function countDown(){
return afterTime-moment().add(8,'hours').format("h:mm:ss a");
}
// Card Reader

var serialPort = new SerialPort(serialPath, {
    baudrate: 9600
});
serialPort.on("open",function() {
    console.log("open");
 console.log("Connected to "+serialPath);
    serialPort.on("data", function(data) {
          if (chords.length != 0)
 {
    for(var x=0;x<1;x++){
        ( myBuzzer.playSound(chords[chordIndex], 50000) );
        chordIndex++;
        console.log("data received: " + data);
        console.log("Card Scanned.");
     //  console.log(data);
  //Reset the sound to start from the beginning.
        if (chordIndex > chords.length - 1)
                        chordIndex = 0;
    }
 }
         led.off();

         switch(data){
            case "0011294334" : // your RFID Tag number
        console.log("User Red");
                break;

            case "0012955344":
        console.log("User Blue");
                break;
                case "0010467635":
        console.log("User Yellow");
                break;

        }
         });
   
    });
  serialPort.write("This is a test.\n", function(err, results) {
        console.log("err " + err);
        console.log("results " + results);
    });


//Temperature Sensor
var f = 0;
var d=null;
var t=null;
  thermometer.on("data", function() {
  f = Math.round(this.celsius);
  d = dateTime(); // For real-time clock
  t = countDown(); //Count down timer
},1000);
//Real-time clock
 setInterval(function() {
    lcd.clear();
    lcd.cursor(0, 0).bgColor("Blue").print(date());
    lcd.cursor(1, 0).bgColor("Blue").print(time());
  }, 800);



// =============================================Websocket controls=========================================================
var connectedUsersArray = [];
var userId;

app.get('/', function(req, res) {
    //Join all arguments together and normalize the resulting path.
    res.sendFile(path.join(__dirname + '/client', 'index.html'));
});

//Allow use of files in client folder
app.use(express.static(__dirname + '/client'));
app.use('/client', express.static(__dirname + '/client'));

//Socket.io Event handlers
io.on('connection', function(socket) {
    console.log("\n Add new User: User"+connectedUsersArray.length);
   if(connectedUsersArray.length > 0) {
        var element = connectedUsersArray[connectedUsersArray.length-1];
        userId = 'User' + (parseInt(element.replace("User", ""))+1);
    }
    else {
        userId = "User0";
    }
    console.log('a user connected: '+userId);
    io.emit('user connect', userId);
    connectedUsersArray.push(userId);
    console.log('Number of Users Connected ' + connectedUsersArray.length);
    console.log('User(s) Connected: ' + connectedUsersArray);
    io.emit('connected users', connectedUsersArray);

    socket.on('user disconnect', function(msg) {
        console.log('remove: ' + msg);
        connectedUsersArray.splice(connectedUsersArray.lastIndexOf(msg), 1);
        io.emit('user disconnect', msg);
        clearInterval(interval);
    });
// Chat box
    socket.on('chat message', function(msg) {
        io.emit('chat message', msg);
        console.log('message: ' + msg.value);
    });
// Toggle Motion sensor
    socket.on('toggle led', function(msg) {
        led.write(ledState?1:0); //if ledState is true then write a '1' (high) otherwise write a '0' (low)
        msg.value = ledState;
        io.emit('toggle led', msg);
        if(xz%2==0){
        motion=0;
        lcd.clear();
        lcd.bgColor("#2EFE64");
        lcd.cursor(1,0).print("MotionSensor:OFF");
        led.off();
        }
        else{
        motion=1;    
        lcd.clear();
        lcd.bgColor("#EFF5FB");
        lcd.cursor(1,0).print("MotionSensor:ON");
        led.on();
        }
        xz++;
        ledState = !ledState; //invert the ledState
    });
// Door switch
    socket.on('toggle door', function(msg) {
        led.write(doorState?1:0); //if ledState is true then write a '1' (high) otherwise write a '0' (low)
        msg.value = doorState;
        io.emit('toggle door', msg);
        if(xy%2==0){
        lcd.clear();
        lcd.bgColor("red").cursor(1,0).print("Door Closed");
if (chords.length != 0)
 {
    for(var x=0;x<1;x++){
        ( myBuzzer.playSound(chords[chordIndex], 30000) );
        chordIndex++;
        //Reset the sound to start from the beginning.
        if (chordIndex > chords.length - 1)
                        chordIndex = 0;
    }
 }
        }
        else{
        lcd.clear();
        lcd.bgColor("green").cursor(1,0).print("Door Opened");
if (chords.length != 0)
 {
    for(var x=0;x<1;x++){
        ( myBuzzer.playSound(chords[chordIndex], 80000) );
        chordIndex++;
        //Reset the sound to start from the beginning.
        if (chordIndex > chords.length - 1)
                        chordIndex = 0;
    }
 }
        }
        xy++;
        doorState = !doorState;
    });
//Temperature
    var interval = setInterval(function(){
        socket.emit('temperature', { celsius: f }); //read the temperature every 500ms and send the reading
    }, 750);
//Clock
    var interval2 = setInterval(function(){
        socket.emit('dateTime', { dateTime: d });
    },250);
    var interval3= setInterval(function(){
        socket.emit('countDown', { countDown: t });
    },250);
});


//====================================For automated motion sensor activation==================================
setInterval(function(){
function securityTime(){   
 return moment().add(8,'hours');
}
var currentTime=securityTime();
if(currentTime.isAfter(offTime) && currentTime.isAfter(afterTime) && motion==0){ //Manually OFF when alarm is ON
 xz=1;
 led.off();
}
else if(currentTime.isAfter(offTime) && currentTime.isAfter(afterTime) && motion==1){ //Manually ON when alarm is OFF
 xz=2;
 led.on();
}
else if (currentTime.isAfter(afterTime) && currentTime.isBefore(offTime) && motion==0) { // AUTO ON
 xz=2;
 led.on();
} 
else if (currentTime.isAfter(afterTime) && currentTime.isBefore(offTime) && motion==1) { //AUTO OFF
 xz=1;
 led.off();
} 
else if(currentTime.isBefore(beforeTime)&& currentTime.isBefore(afterTime)&& currentTime.isBefore(offTime) && motion==0){
 motion=motion;
 xz=xz; 
}

},1000);

    
http.listen(3000, function(){
    console.log('Web server Active listening on *:3000');
});
// ============================================Board controls====================================================    

//D4 TouchSensor
touch.on("press", function() {
    lcd.cursor(1,0).print("Door opened").bgColor("Green");
    if (chords.length != 0)
 {
    for(var x=0;x<1;x++){
        ( myBuzzer.playSound(chords[chordIndex], 80000) );
        chordIndex++;
        //Reset the sound to start from the beginning.
        if (chordIndex > chords.length - 1)
                        chordIndex = 0;
    }
 }
    led.toggle();
 });

  touch.on("release", function() {
    led.toggle();
    lcd.bgColor("Blue");
    lcd.clear();  
 });
//D2 Motion OFF
alarm.on("press", function() {
 lcd.clear();
 lcd.bgColor("red");
 lcd.print("Fire!" );

if (chords.length != 0)
 {
    for(var x=0;x<25;x++){
        ( myBuzzer.playSound(chords[chordIndex], 100000) );
        chordIndex++;
         motor.on();
        //Reset the sound to start from the beginning.
        if (chordIndex > chords.length - 1)
                        chordIndex = 0;
    }
 }
 motor.off();
});
//D7 Motion Sensor

// Motion sensor will turned on/off by use of button controls
button.on("press", function() {
    xz++;
    if((xz%2==0)&& motion==0){
     motion=1;
     lcd.clear();
     lcd.bgColor("#EFF5FB");
     lcd.cursor(1,0).print("MotionSensor:ON");
     led.on();
    }
     else if((xz%2==0)&& motion==1){
     motion=0;
     lcd.clear();
     lcd.bgColor("#EFF5FB");
     lcd.cursor(1,0).print("MotionSensor:OFF");
     led.on();
    }
    else if((xz%2!==0)&&motion==1){
     motion=0;
     lcd.clear();
     lcd.bgColor("#2EFE64");
     lcd.cursor(1,0).print("MotionSensor:OFF");
     led.off();
    }
    else if((xz%2!==0)&&motion==0) {
    motion=1;
    xz=1;
    lcd.clear();
    lcd.bgColor("#2EFE64");
    lcd.cursor(1,0).print("MotionSensor:OFF");
    led.off();
    }
    else {
    motion=0;
    xz=1;
    lcd.clear();
    lcd.bgColor("#2EFE64");
    lcd.cursor(1,0).print("MotionSensor:OFF");
    led.off(); 
    }
});
// Motion-Detection code
var security=setInterval(function()
{
if (myMotionObj.value() && xz%2==0 && chords.length != 0){
lcd.clear();
lcd.bgColor("red");
lcd.cursor(1,0).print("Motion detected!");
for(var x=0;x<25;x++){
        ( myBuzzer.playSound(chords[chordIndex], 150000) );
        chordIndex++;
        //Reset the sound to start from the beginning.
         if (chordIndex > chords.length - 1)
      chordIndex = 0;
}
}},1000);
    
}); 
//========================================END OF CODE ============================================================
