
var getArrPos = function (mousePos, length) { //translates mouse coordinates into position in 2d array
    var arrPos = {};
    arrPos.x = Math.floor(mousePos.x / length);
    arrPos.y = Math.floor(mousePos.y / length);
    return arrPos;
}

var getGridPos = function (arrPos, length) { //translates position in 2d array into coordinates for top left corner of corresponding cell on canvas.
    var gridPos = {};
    gridPos.x = (arrPos.x) * length;
    gridPos.y = (arrPos.y) * length;
    return gridPos;
}

var writeSquare = function (ctx, fillValue, gridPos, length) {
    if (!fillValue) {
        ctx.fillStyle = "black";
        ctx.fillRect(gridPos.x + 1, gridPos.y + 1, length - 2, length - 2);
    }
    if (fillValue) {
        ctx.clearRect(gridPos.x + 1, gridPos.y + 1, length - 2, length - 2);
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
    for (var i = 0; i < canvasLength; i += cellLength) {
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

var initSquares = function () { //changes all squares to false
    cycleCount = 0
    updateCycleCount();
    for (var x = 0; x < squares.length; x++) {
        for (var y = 0; y < squares[x].length; y++) {
            squares[x][y] = false;
        }
    }
}

var writePattern = function () {
    for (var x = 0; x < squares.length ; x++) {
        for (var y = 0; y < squares[x].length; y++) {
            writeSquare(ctx, !squares[x][y], getGridPos({ x: x, y: y }, cellLength), cellLength);
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

    cycleCount++;
    updateCycleCount();
    for (var x = 0; x < arrayLength; x++) {
        for (var y = 0; y < arrayLength; y++) {
            var count = 0,
                left,
                right,
                up,
                down;

            if (x === 0) {
                left = arrayLength - 1;
                right = 1;
            }
            else if (x === arrayLength - 1) {
                left = x - 1
                right = 0;
            }
            else {
                left = x - 1;
                right = x + 1;
            }

            if (y === 0) {
                up = arrayLength - 1;
                down = 1;
            }
            else if (y === arrayLength - 1) {
                up = y - 1;
                down = 0;
            }
            else {
                up = y - 1;
                down = y + 1;
            }
            count += squares[x][up];
            count += squares[x][down];
            count += squares[right][down];
            count += squares[left][down];
            count += squares[right][up];
            count += squares[left][up];
            count += squares[right][y];
            count += squares[left][y];
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
    for (var x = 0; x < squares.length; x++) {
        for (var y = 0; y < squares[x].length; y++) {
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
            }, 200)
        })(cycles);
    }
}

var gosperGliderGun = function () {
    initSquares();
    //coordinates for glider gun here.
    squares[22][38] = true;
    squares[22][39] = true;
    squares[23][38] = true;
    squares[23][39] = true;
    squares[32][38] = true;
    squares[32][39] = true;
    squares[32][40] = true;
    squares[33][37] = true;
    squares[33][41] = true;
    squares[34][36] = true;
    squares[34][42] = true;
    squares[35][36] = true;
    squares[35][42] = true;
    squares[36][39] = true;
    squares[37][37] = true;
    squares[37][41] = true;
    squares[38][38] = true;
    squares[38][39] = true;
    squares[38][40] = true;
    squares[39][39] = true;
    squares[42][36] = true;
    squares[42][37] = true;
    squares[42][38] = true;
    squares[43][36] = true;
    squares[43][37] = true;
    squares[43][38] = true;
    squares[44][35] = true;
    squares[44][39] = true;
    squares[46][34] = true;
    squares[46][35] = true;
    squares[46][39] = true;
    squares[46][40] = true;
    squares[56][36] = true;
    squares[56][37] = true;
    squares[57][36] = true;
    squares[57][37] = true;
    writePattern();

}

var lifePattern = function () {//draws the word "LIFE" on the board, sets corresponding cells to alive in array, all others to dead
    initSquares();
    for (var y = 37; y < 44; y++) { //draw verticle sections of letters in "LIFE"
        squares[31][y] = true;
        squares[37][y] = true;
        squares[40][y] = true;
        squares[46][y] = true;
    }
    for (var x = 32; x < 35; x++) {
        squares[x][43] = true; //draw horiz sect of "L"
    }
    for (var x = 41; x < 44; x++) { //draw horiz sects of "F"
        squares[x][37] = true;
        squares[x][40] = true;
    }
    for (var x = 47; x < 50; x++) { //draw horiz sects of "E"
        squares[x][37] = true;
        squares[x][40] = true;
        squares[x][43] = true;
    }
    writePattern();
}

var clearGrid = function () { //all cells set to dead
    var arrPos = {};

    cycleCount = 0;
    updateCycleCount();
    for (var x = 0; x < squares.length; x++) {
        for (var y = 0; y < squares[x].length; y++) {
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
        }, 200)
    })(isRunning);
}

var updateCycleCount = function () {
    document.getElementById("cycleCount").innerHTML = "Cycle: " + cycleCount
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

var cycleCount = 0;
var cyclesButton = document.getElementById("startButton");
var playStopButton = document.getElementById("play-stop");
var canvasLength = 800;
var arrayLength = 80;
var cellLength = canvasLength / arrayLength;
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

    document.getElementById("startButton").addEventListener('mousedown', function (evt) {
        var userCycles = document.getElementById("cycles");
        cycles = userCycles.value;
        runCycle(cycles);
        userCycles.value = "";
    }, false);
};



