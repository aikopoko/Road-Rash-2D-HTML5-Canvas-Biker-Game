const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let buttonAPressed = false;

let gameOver = false;
let knockedDown = false;  // Player knockdown state
let knockdownDuration = 0;  // Duration for knockdown animation
let knockDirection = null; // 'left' or 'right'

const knockdownSound = new Audio('sounds/knockdown.mp3');  // Replace with actual file path

const knockdownImageRight = new Image();
knockdownImageRight.src = 'player/main-knockout-right.png';

const knockdownImageLeft = new Image();
knockdownImageLeft.src = 'player/main-knockout-left.png';

canvas.width = 800;
canvas.height = 600;

// Load the beep sound
const beepSound = new Audio('sounds/game-countdown.mp3'); // Replace with your actual file path

// Create an audio element for the background music
const bgMusic = new Audio('sounds/bg-music.mp3'); // Replace with your actual file path

// Set the background music to loop indefinitely
bgMusic.loop = true;
// Decrease the volume (50% volume in this case)
bgMusic.volume = 0.3; // Adjust this value as needed

// Create an audio element for the "uhh" sound effect
const uhhSound = new Audio('sounds/uhh.mp3'); // Replace with your actual file path

const uhhSoundPlayer = new Audio('sounds/uhh-player.mp3'); // Replace with your actual file path

const bikeSoundPlayer = new Audio('sounds/bike-sound-player.mp3'); // Replace with your actual file path
bikeSoundPlayer.volume = 0.6; 

const altBikeSoundPlayer = new Audio('sounds/alt-bike.mp3'); // Replace with your actual file path

const carSound = new Audio('sounds/car.mp3'); // Replace with your actual file path

// Countdown setup
const countdownOverlay = document.getElementById("countdownOverlay");
let countdown = 3;
let countdownInterval;

function startCountdown() {
    countdownOverlay.innerText = countdown;
    countdownInterval = setInterval(() => {
        countdown--;
        if (countdown > 0) {
            countdownOverlay.innerText = countdown;
            beepSound.play();  // Play beep sound when countdown updates
        } else if (countdown === 0) {
            countdownOverlay.innerText = "GO!";
            beepSound.play();  // Play beep sound when countdown reaches 0
        } else {
            countdownOverlay.classList.add("fade-out");
            clearInterval(countdownInterval);
            startGame();
        }
    }, 1000);
}

startCountdown();

let shakeAmount = 0;
let shakeDuration = 0;
let tiltAngle = 0;
const maxTilt = 0.5;

const backgrounds = ['bg/bg-1.png', 'bg/bg-2.png', 'bg/bg-3.png'];
let currentBackgroundIndex = 0;
const roadImages = backgrounds.map(src => {
    const img = new Image();
    img.src = src;
    return img;
});

const mainBikerImage = new Image();
mainBikerImage.src = 'player/main-character.png';

const kickImages = ['player/main-kick-left.png', 'player/main-kick-right.png'].map(src => {
    const img = new Image();
    img.src = src;
    return img;
});

let bikerImage = mainBikerImage;

const altBikerImages = ['alt-bikers/1.png', 'alt-bikers/2.png'].map(src => {
    const img = new Image();
    img.src = src;
    return img;
});

const altCarImages = ['alt-cars/1.png', 'alt-cars/2.png'].map(src => {
    const img = new Image();
    img.src = src;
    return img;
});

const player = {
    x: canvas.width / 2 - 150,
    y: canvas.height - 100,
    width: 250,
    height: 150,
    speed: 5,
    dx: 0,
    dy: 0,
};

const passingBikers = [];

function spawnPassingBiker() {
    const image = altBikerImages[Math.floor(Math.random() * altBikerImages.length)];
    let x;

    if (player.x <= 250) {
        x = player.x + 175;
    } else {
        x = player.x - 175;
    }

    const speed = 0.3;
    const y = canvas.height + 150;
    const targetX = canvas.width / 2 - player.width / 2 - 30;

    passingBikers.push({
        image,
        x,
        y,
        width: player.width,
        height: player.height,
        speed,
        targetX,
        knocked: false,
        knockDirection: null,
    });
}

const passingCars = [];

function spawnPassingCar() {
    const image = altCarImages[Math.floor(Math.random() * altCarImages.length)];

    const xStart = canvas.width / 2 - 150;
    const directionRight = Math.random() < 0.5; // 50/50 chance

    const xTarget = directionRight
        ? 400  // right
        : 150; // left
    // const xTarget = 150;
    // const xTarget = 400;

    const y = 200;

    passingCars.push({
        image,
        x: xStart,
        y,
        width: player.width,
        height: player.height,
        speed: 0.5,
        targetX: xTarget,
    });
}

setInterval(() => {
    if (passingBikers.length === 0 && passingCars.length === 0) {
        const randomSpawn = Math.random() < 0.5;
        if(randomSpawn){
            spawnPassingBiker();
            altBikeSoundPlayer.play();
        }
        else{
            spawnPassingCar();
            carSound.play();
        }
    }
}, 1000);


function drawPassingCars() {
    const appearStart = canvas.height * 0.1;
    const appearEnd = canvas.height * 0.6;

    for (let i = passingCars.length - 1; i >= 0; i--) {
        const car = passingCars[i];

        car.y += car.speed;

        let progress = (car.y - appearStart) / (appearEnd - appearStart);
        progress = Math.max(0, Math.min(1, progress));

        const scaleFactor = progress;
        const opacity = progress;

        car.x += (car.targetX - car.x) * 0.01 * progress;

        const scaledWidth = car.width * scaleFactor;
        const scaledHeight = car.height * scaleFactor;
        const scaledX = car.x + (car.width - scaledWidth) / 2;
        const scaledY = car.y + (car.height - scaledHeight) / 2;

        ctx.save();
        ctx.globalAlpha = opacity;
        ctx.drawImage(car.image, scaledX, scaledY, scaledWidth, scaledHeight);
        ctx.restore();

        // 🛑 Check for collision with player
        if (!gameOver && isOverlapping(
            { x: scaledX, y: scaledY, width: scaledWidth, height: scaledHeight },
            player
        )) {
            endGame();
            return;
        }

        if (car.y > canvas.height + car.height) {
            passingCars.splice(i, 1);
        }
    }
}

function drawBackground() {
    const currentImage = roadImages[currentBackgroundIndex];
    ctx.drawImage(currentImage, 0, 0, canvas.width, canvas.height);
}

function drawPlayer() {
    ctx.save();

    if (knockedDown) {
        tiltAngle = Math.sin(knockdownDuration * 0.1) * 0.2;
    
        const directionMultiplier = (knockDirection === 'left') ? -1 : 1;
        
        if(knockDirection == 'right'){
            // Push player sideways during knockdown
            player.x += 3 * directionMultiplier;
        }
        else{
            player.x += 250;
        }

        player.y = player.y + 150;
    
        // Optional: Limit movement so player doesn't fly offscreen
        player.x = Math.max(0, Math.min(canvas.width - player.width, player.x));
    
        // Fade and shrink, but keep minimum values
        // ctx.globalAlpha = Math.max(0.3, 1 - knockdownDuration / 100);
        const scale = Math.max(0.6, 1 - knockdownDuration / 500);
        ctx.scale(scale, scale);
    }

    const knockedImage = knockDirection == 'right' ? knockdownImageRight : knockdownImageLeft;
    const imageToDraw = knockedDown ? knockedImage : bikerImage;

    ctx.translate(player.x + player.width / 2, player.y + player.height / 2);
    ctx.rotate(tiltAngle);
    ctx.drawImage(imageToDraw, -player.width / 2, -player.height / 2, player.width, player.height);

    if (knockedDown) {
        knockdownDuration--;  // Decrease the knockdown duration over time
    }

    ctx.restore();
}

function drawPassingBikers() {
    const disappearStart = canvas.height * 0.6;
    const disappearEnd = canvas.height * 0.35;

    for (let i = passingBikers.length - 1; i >= 0; i--) {
        const biker = passingBikers[i];

        biker.y -= biker.speed;

        ctx.save();

        if (biker.knocked) {
            const knockSpeed = 3;
            if (biker.knockDirection === 'left') {
                biker.x -= knockSpeed;
            } else {
                biker.x += knockSpeed;
            }

            const progress = (biker.y - disappearEnd) / (disappearStart - disappearEnd);
            const opacity = Math.max(0, Math.min(1, progress));
            biker.x += (biker.targetX - biker.x) * 0.05 * (1 - progress);

            const scaledWidth = biker.width * (1 - progress);
            const scaledHeight = biker.height * (1 - progress);
            const scaledX = biker.x + (biker.width - scaledWidth) / 2;
            const scaledY = biker.y + (biker.height - scaledHeight) / 2;

            ctx.globalAlpha = opacity;
            ctx.drawImage(biker.image, scaledX, scaledY, scaledWidth, scaledHeight);
        } else {
            let progress = (biker.y - disappearEnd) / (disappearStart - disappearEnd);
            progress = Math.min(1, Math.max(0, progress));
            const scaleFactor = progress;
            const opacity = progress;

            biker.x += (biker.targetX - biker.x) * 0.05 * (1 - progress);

            const scaledWidth = biker.width * scaleFactor;
            const scaledHeight = biker.height * scaleFactor;
            const scaledX = biker.x + (biker.width - scaledWidth) / 2;
            const scaledY = biker.y + (biker.height - scaledHeight) / 2;

            ctx.globalAlpha = opacity;
            ctx.drawImage(biker.image, scaledX, scaledY, scaledWidth, scaledHeight);
        }

        ctx.restore();

        if (biker.y + biker.height < 0 || biker.x < -biker.width || biker.x > canvas.width + biker.width) {
            passingBikers.splice(i, 1);
        }
    }
}

function updatePlayer() {
    let blocked = {
        left: false,
        right: false,
        up: false,
        down: false
    };

    passingBikers.forEach(biker => {
        if (isOverlapping(player, biker)) {
            if (player.dx < 0) blocked.left = true;
            if (player.dx > 0) blocked.right = true;
            if (player.dy < 0) blocked.up = true;
            if (player.dy > 0) blocked.down = true;
        }
    });

    if (blocked.left || blocked.right) player.dx = 0;
    if (blocked.up || blocked.down) player.dy = 0;

    player.x += player.dx;
    player.y += player.dy;

    if (player.x < 0) player.x = 0;
    if (player.x + player.width > canvas.width) player.x = canvas.width - player.width;
    if (player.y < 0) player.y = 0;
    if (player.y + player.height > canvas.height) player.y = canvas.height - player.height;
}

function isOverlapping(a, b) {
    return (
        a.x < b.x + b.width - 100 &&
        a.x + a.width > b.x + 100 &&
        a.y < b.y + b.height - 100 &&
        a.y + a.height > b.y + 100
    );
}

// Modify the existing code for player kick action
function movePlayer(e) {
    if(gameOver) return;

    if(e.key ==='w' || e.key ==='ArrowUp'){
        buttonAPressed = true;
    }
    if (e.key === 'ArrowLeft' || e.key === 'a') {
        player.dx = -player.speed;
        tiltAngle = -maxTilt;
    }
    if (e.key === 'ArrowRight' || e.key === 'd') {
        player.dx = player.speed;
        tiltAngle = maxTilt;
    }

    if (e.code === 'Space') {
        let closestBiker = null;
        let minDistance = Infinity;
        passingBikers.forEach(biker => {
            const dy = Math.abs(player.y - biker.y);
            const dx = Math.abs(player.x - biker.x);
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance < minDistance) {
                minDistance = distance;
                closestBiker = biker;
            }
        });

        if (closestBiker && minDistance < 200) {
            const isLeft = closestBiker.x < player.x;
            bikerImage = isLeft ? kickImages[0] : kickImages[1];
            closestBiker.knocked = true;
            closestBiker.knockDirection = isLeft ? 'left' : 'right';
            shakeAmount = 10;
            shakeDuration = 15;

            // Play the "uhh" sound when the player kicks
            uhhSound.play(); 
        } else {
            bikerImage = kickImages[Math.floor(Math.random() * kickImages.length)];

            // Play the "uhh" sound when the player kicks randomly
            uhhSound.play();
        }
    }
}

function stopPlayer(e) {
    if(e.key ==='w' || e.key ==='ArrowUp'){
        buttonAPressed = false;
        bikeSoundPlayer.pause();
    }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'a' || e.key === 'd') {
        player.dx = 0;
        tiltAngle = 0;
    }

    if (e.code === 'Space') {
        bikerImage = mainBikerImage;
    }
}

setInterval(() => {
    if(buttonAPressed){
        bikeSoundPlayer.play();
        currentBackgroundIndex = (currentBackgroundIndex + 1) % roadImages.length;
    }
}, 500);

function gameLoop() {
    if (gameOver) return;  // Stop the game if the game is over

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawBackground();

    if (shakeDuration > 0) {
        const shakeX = Math.random() * shakeAmount - shakeAmount / 2;
        const shakeY = Math.random() * shakeAmount - shakeAmount / 2;
        ctx.translate(shakeX, shakeY);
        shakeDuration--;
        shakeAmount *= 0.9;
    }

    drawPassingBikers();
    drawPassingCars();
    drawPlayer();  // Draw the player with the knockdown animation
    updatePlayer();  // Update player (this will still happen, but player won't move)
    requestAnimationFrame(gameLoop);
}

let assetsLoaded = 0;
function checkAssetsLoaded() {
    assetsLoaded++;
    if (assetsLoaded === roadImages.length + 1 + kickImages.length + altBikerImages.length + 1) {
        // Do nothing yet; startGame() is called by countdown
    }
}

function startGame() {
    // Play background music once the game starts
    bgMusic.play();
    gameLoop();
    document.addEventListener('keydown', movePlayer);
    document.addEventListener('keyup', stopPlayer);
}

function endGame() {
    gameOver = true;
    knockedDown = true;
    knockdownDuration = 100;

    // Determine direction of knock
    if (passingCars.length > 0) {
        const car = passingCars[0]; // The one that hit
        knockDirection = (car.x < player.x) ? 'right' : 'left';
        if(car.x < 200){
            knockDirection = 'left';
        }
        else{
            knockDirection = 'right';
        }
        console.log(knockDirection);
    }
    document.getElementById('game-over').style.display = 'block';

    bgMusic.pause();
    uhhSoundPlayer.play();
    knockdownSound.play();
    // alert("💥 You were hit by a car! Game Over.");
}


roadImages.forEach(img => img.onload = checkAssetsLoaded);
mainBikerImage.onload = checkAssetsLoaded;
kickImages.forEach(img => img.onload = checkAssetsLoaded);
altBikerImages.forEach(img => img.onload = checkAssetsLoaded);
altCarImages.forEach(img => img.onload = checkAssetsLoaded);
knockdownImageLeft.onload = checkAssetsLoaded;
