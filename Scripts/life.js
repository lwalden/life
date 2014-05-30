
var getArrPos = function (mousePos, length) { //translates mouse coordinates into position in 2d array
    var arrPos = {};
    arrPos.x = Math.floor(mousePos.x / length) + 1;
    arrPos.y = Math.floor(mousePos.y / length) + 1;
    return arrPos;
}

var getGridPos = function (arrPos, length) { //translates position in 2d array into coordinates for top left corner of corresponding cell on canvas.
    var gridPos = {};
    gridPos.x = (arrPos.x - 1) * length;
    gridPos.y = (arrPos.y - 1) * length;
    return gridPos;
}

var writeSquare = function (ctx, fillValue, gridPos, length) {
    var squareLength = length - 2;
    if (!fillValue) {
        ctx.fillStyle = "black";
        ctx.fillRect(gridPos.x + 1, gridPos.y + 1, squareLength, squareLength);
    }
    if (fillValue) {
        ctx.clearRect(gridPos.x + 1, gridPos.y + 1, squareLength, squareLength);
    }
}

var writeArr = function (isAlive) {
    if (!isAlive) {
        isAlive = true;
    }
    else if (isAlive) {
        isAlive = false;
    }
    return isAlive;
}

var writeGrid = function (cxt) {
    for (var i = 0; i < canvasLength; i += (canvasLength/boardLength)) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, canvasLength);
        ctx.moveTo(0, i);
        ctx.lineTo(canvasLength, i);
        ctx.strokeStyle = "black";
        ctx.stroke();
    }
}

var getMousePos = function (canvas, evt) {
    var rect = canvas.getBoundingClientRect();
    return {
        x: evt.clientX - rect.left,
        y: evt.clientY - rect.top
    };
}

var initSquares = function (squares) { //changes all squares to false

    for (var x = 0; x < 42; x++) {
        for (var y = 0; y < 42; y++) {
            squares[x][y] = false;
        }
    }
}


function createArray(length) { //creates arrays of given dimension and length
    var arr = new Array(length || 0),
        i = length;

    if (arguments.length > 1) {
        var args = Array.prototype.slice.call(arguments, 1);
        while (i--) arr[length - 1 - i] = createArray.apply(this, args);
    }

    return arr;
}

var aCycle = function () { //applies the rules of life to the baord, updates the array and canvas
    var arrPos = {};
    for (var x = 1; x < squares.length - 1 ; x++) {
        for (var y = 1; y < squares[x].length - 1; y++) {
            var count = 0;
            count += squares[x][y - 1];
            count += squares[x][y + 1];
            count += squares[x + 1][y + 1];
            count += squares[x - 1][y + 1];
            count += squares[x + 1][y - 1];
            count += squares[x - 1][y - 1];
            count += squares[x + 1][y];
            count += squares[x - 1][y];
            if (count === 3 && squares[x][y] === false) {
                newSquares[x][y] = true;
                arrPos.x = x;
                arrPos.y = y;
                writeSquare(ctx, squares[x][y], getGridPos(arrPos, cellLength), cellLength);
            }
            else if (squares[x][y] === true && (count < 2 || count > 3)) {
                newSquares[x][y] = false;
                arrPos.x = x;
                arrPos.y = y;
                writeSquare(ctx, squares[x][y], getGridPos(arrPos, cellLength), cellLength);
            }
            else {
                if (squares[x][y] === true) {
                    newSquares[x][y] = true;
                }
                else {
                    newSquares[x][y] = false;
                }
            }
        }
    }
    for (var x = 1; x < squares.length - 1 ; x++) {
        for (var y = 1; y < squares[x].length - 1; y++) {
            if (newSquares[x][y] === true) {
                squares[x][y] = true;
            }
            else {
                squares[x][y] = false;
            }
        }
    }
};

var runCycle = function (cycles) {//runs a set number of cycles then stops.
    if (cycles > 0) {
        disableCyclesButton();
        (function myLoop(i) {
            setTimeout(function () {
                aCycle();
                if (--i) myLoop(i); else {
                    enableCyclesButton();
                }
            }, 250)
        })(cycles);
    }
}

var lifePattern = function () {//draws the word "LIFE" on the board, sets corresponding cells to alive in array, all others to dead
    for (var x = 1; x < squares.length - 1 ; x++) {
        for (var y = 1; y < squares[x].length - 1; y++) {
            squares[x][y] = false;
        }
    }
    for (var y = 27; y < 34; y++) { //draw verticle sections of letters in "LIFE"
        squares[21][y] = true;
        squares[27][y] = true;
        squares[30][y] = true;
        squares[36][y] = true;
    }
    for (var x = 22; x < 25; x++) {
        squares[x][33] = true; //draw horiz sect of "L"
    }
    for (var x = 31; x < 34; x++) { //draw horiz sects of "F"
        squares[x][27] = true;
        squares[x][30] = true;
    }
    for (var x = 37; x < 40; x++) { //draw horiz sects of "E"
        squares[x][27] = true;
        squares[x][30] = true;
        squares[x][33] = true;
    }
    for (var x = 1; x < squares.length - 1 ; x++) {
        for (var y = 1; y < squares[x].length - 1; y++) {
            writeSquare(ctx, !squares[x][y], getGridPos({ x: x, y: y }, cellLength), cellLength);
        }
    }
}

var clearGrid = function () { //all cells set to dead
    var arrPos = {};
    for (var x = 1; x < squares.length - 1 ; x++) {
        for (var y = 1; y < squares[x].length - 1; y++) {
            if (squares[x][y]) {               
                arrPos.x = x;
                arrPos.y = y;
                writeSquare(ctx, squares[x][y], getGridPos(arrPos, cellLength), cellLength);
                squares[x][y] = false;
            }
        }
    }
}

var step = function () { //one cycle is run
    aCycle();
}

var play = function () { //cycles run until stop button is pressed
    var isRunning = true;
    disableCyclesButton();
    enableStopButton();

    (function myLoop(i) {
        playStopButton.addEventListener('mousedown', function (evt) {
            i = false;
        }, false);
        setTimeout(function () {
            aCycle();
            if (i) myLoop(i); else {
                enableCyclesButton();
                enablePlayButton();
            }
        }, 250)
    })(isRunning);
}

var enableCyclesButton = function () {
    cyclesButton.innerHTML = "Start";
    cyclesButton.removeAttribute = "disabled";
}

var disableCyclesButton = function () {
    cyclesButton.innerHTML = "Running...";
    cyclesButton.style = "disabled";
}

var enableStopButton = function () {
    playStopButton.classList.remove("btn-success");
    playStopButton.classList.add("btn-danger");
    playStopButton.innerHTML = "Stop <span class='glyphicon glyphicon-stop'></span>";
    playStopButton.removeAttribute("onclick");
}

var enablePlayButton = function () {
    playStopButton.innerHTML = "Go <span class='glyphicon glyphicon-play'></span>";
    playStopButton.setAttribute("onclick", "play();");
    playStopButton.classList.remove("btn-danger");
    playStopButton.classList.add("btn-success");
}

var cyclesButton = document.getElementById("startButton");
var playStopButton = document.getElementById("play-stop");
var canvasLength = 600;
var boardLength = 60;
var arrayLength = boardLength + 2;
var cellLength = canvasLength / boardLength;
var canvas = document.getElementById('myCanvas');
var ctx = canvas.getContext('2d');
var squares = createArray(arrayLength, arrayLength);
var newSquares = createArray(arrayLength, arrayLength);
var cycles;

lifePattern();
window.onload = function () {
    writeGrid(ctx);

    canvas.addEventListener('mousedown', function (evt) {
        var mousePos = getMousePos(canvas, evt);
        var arrPos = getArrPos(mousePos, cellLength);
        var gridPos = getGridPos(arrPos, cellLength);
        writeSquare(ctx, squares[arrPos.x][arrPos.y], gridPos, cellLength);
        squares[arrPos.x][arrPos.y] = writeArr(squares[arrPos.x][arrPos.y]);
    }, false);

    //document.getElementById("startButton").addEventListener('mousedown', function (evt) {
    //    var userCycles = document.getElementById("cycles");
    //    cycles = userCycles.value;
    //    runCycle(cycles);
    //    userCycles.value = "";
    //}, false);
};



