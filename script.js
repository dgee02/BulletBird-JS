//Check for local highscore
if (localStorage.highScore) localStorage.highScore = Number(localStorage.highScore);
else localStorage.highScore = 0;

let audioButton = document.getElementById('audioButton');
let body = document.getElementById('body');
let canvas = document.getElementById('canvas');
let brush = canvas.getContext('2d');

//Images for game's canvas background
let canvasBackground1 = new Image();
canvasBackground1.onload = function () {
	brush.drawImage(canvasBackground1, canvasBackground1.width, canvasBackground1.height);
};
canvasBackground1.src = 'img/canvasBackground1.png';
let canvasBackground2 = new Image();
canvasBackground2.onload = function () {
	brush.drawImage(canvasBackground2, canvasBackground2.width, canvasBackground2.height);
};
canvasBackground2.src = 'img/canvasBackground2.png';

//Coordinates for top-left corner of canvas backgrounds
let canvasBackground1X;
let canvasBackground1Y;
let canvasBackground2X;
let canvasBackground2Y;

//Variables for canvas transition when starting new game
let canvasTransitionColor;
let canvasTransitionRadiusInitial = 540;
let canvasTransitionRadius;

let refreshCanvas;
let stopWatch;
let currentLevel;
let createBossBulletInterval;
let createCompBirdInterval;
let player;
let boss;
let compBirdsArray;
let playerBulletsArray;
let bossBulletsArray;
let bloodArray;
let addPointsArray;

//Display game's title screen immediately
CanvasTitle();

let gameKeys = {
	moveUp: false,
	moveDown: false,
	moveLeft: false,
	moveRight: false,
	fire: false,
	newGame: false,
	audio: false,
};

body.addEventListener('keydown', function (event) {
	if (event.key === 'ArrowUp' || event.key === 'w') gameKeys.moveUp = true;
	if (event.key === 'ArrowDown' || event.key === 's') gameKeys.moveDown = true;
	if (event.key === 'ArrowLeft' || event.key === 'a') gameKeys.moveLeft = true;
	if (event.key === 'ArrowRight' || event.key === 'd') gameKeys.moveRight = true;
	if (event.key === ' ') gameKeys.fire = true;
	if (event.key === 'r') {
		gameKeys.newGame = true;
		document.getElementById('startButton').click();
	}
	if (event.key === 'm') {
		gameKeys.audio = true;
		document.getElementById('audioButton').click();
	}
});

body.addEventListener('keyup', function (event) {
	if (event.key === 'ArrowUp' || event.key === 'w') gameKeys.moveUp = false;
	if (event.key === 'ArrowDown' || event.key === 's') gameKeys.moveDown = false;
	if (event.key === 'ArrowLeft' || event.key === 'a') gameKeys.moveLeft = false;
	if (event.key === 'ArrowRight' || event.key === 'd') gameKeys.moveRight = false;
	if (event.key === ' ') gameKeys.fire = false;
	if (event.key === 'r') gameKeys.newGame = false;
	if (event.key === 'm') gameKeys.audio = false;
});

//Character you play as
class Player {
	constructor() {
		this.x = canvas.width * 0.2;

		//Furthest x-coordinate player can go
		this.maxX = 610;

		this.y = canvas.height * 0.5 - 25;
		this.dX = 4.7;
		this.dY = 4.7;
		this.image = new Image();
		this.image.src = 'img/player.png';

		//Coordinates for top-left corner of player's sprite
		this.spriteX = 0;
		this.spriteY = 0;

		this.spriteWidth = 75;
		this.spriteHeight = 50;
		this.spriteSpeedInitial = 5;
		this.spriteSpeed = this.spriteSpeedInitial;

		//Rate of fire for player's bullets
		this.fireRateInitial = 12;
		this.fireRateSwitch = false;
		this.fireRate = this.fireRateInitial;

		//Number of bullets that can be fired in succession before having to reload
		this.magazineInitial = 15;
		this.magazine = this.magazineInitial;

		this.reloadTimerInitial = 225;
		this.reloadTimer = this.reloadTimerInitial;
		this.score = 0;
		this.deathCause = '';
		this.gotWin = false;
		this.isDead = false;

		//Opacity levels of player's HUD
		this.mainHUDOpacity = 0;
		this.progressHUDOpacity = 0;
		this.pointerHUDStillTimer = 90;
		this.pointerHUDFadeSwitch = false;
		this.pointerHUDOpacity = 0;

		this.fireAudio = document.getElementById('playerFireAudio');
		this.reloadAudio = document.getElementById('playerReloadAudio');
		this.reloadedAudio = document.getElementById('playerReloadedAudio');
		this.hitAudio = document.getElementById('playerHitAudio');
		this.wingAudio = document.getElementById('playerWingAudio');
	}

	Move() {
		if (gameKeys.moveUp) {
			let newY = this.y - this.dY;
			if (newY > 0) this.y = newY;
		}
		if (gameKeys.moveDown) {
			let newY = this.y + this.dY;
			if (newY + this.spriteHeight < canvas.height) this.y = newY;
		}
		if (gameKeys.moveLeft) {
			let newX = this.x - this.dX;
			if (newX > 0) this.x = newX;
		}
		if (gameKeys.moveRight) {
			let newX = this.x + this.dX;
			if (newX + this.spriteWidth < this.maxX) this.x = newX;
		}
	}

	//Shooting action of player
	Fire() {
		//Begin reloading if player's magazine is 0
		if (this.magazine == 0) {
			this.reloadTimer--;
			this.PlayReloadAudio();
		}

		//After reload completion, reset reload timer and refill player's magazine
		if (this.reloadTimer == 0) {
			this.reloadTimer = this.reloadTimerInitial;
			this.magazine = this.magazineInitial;
			this.PlayReloadedAudio();
		}

		//Shoot bullet if fire key is being pressed, bullets remain in player's magazine, and fire rate requirement is met
		if (gameKeys.fire && this.magazine > 0 && !this.fireRateSwitch) {
			//+0.01 in x-coordinate prevents collision with player's bullets
			let bullet = new PlayerBullet(this.x + this.spriteWidth + 0.01, this.y + this.spriteHeight * 0.6);

			playerBulletsArray.push(bullet);
			this.magazine--;
			this.fireRateSwitch = true;
			this.PlayFireAudio();
		}

		//Fire rate control
		if (this.fireRateSwitch) this.fireRate--;

		//Reset timer for player's fire rate and ok fire rate requirement when timer reaches 0
		if (this.fireRate == 0) {
			this.fireRate = this.fireRateInitial;
			this.fireRateSwitch = false;
		}
	}

	//Drawing of player's sprite
	Draw() {
		this.Fire();
		this.Move();
		brush.drawImage(this.image, this.spriteX, 0, this.spriteWidth, this.spriteHeight, this.x, this.y, this.spriteWidth, this.spriteHeight);
		SpriteUpdater(this, this.image.width);
	}

	DrawHUD() {
		//As long as current level isn't boss battle...
		if (currentLevel < 3) {
			//Fade-in effect for progress bar and pointers
			if (this.progressHUDOpacity <= 0.5) {
				this.progressHUDOpacity += 0.005;
				this.pointerHUDOpacity += 0.005;
			}

			//Draw progress bar
			brush.globalAlpha = this.progressHUDOpacity.toFixed(3);
			brush.fillStyle = 'gray';
			brush.fillRect(0, 0, canvas.width, 10);
			brush.fillStyle = 'green';
			brush.fillRect(0, 0, (stopWatch / boss.phase1Start) * canvas.width, 10);

			//Once progress bar reaches optimal opacity, keep pointers on screen for some time
			if (this.progressHUDOpacity >= 0.5) this.pointerHUDStillTimer--;

			//After pointers have been on screen for some time, allow pointers to begin fade-out effect
			if (!this.pointerHUDFadeSwitch && this.pointerHUDStillTimer <= 0) this.pointerHUDFadeSwitch = true;

			//Fade-out effect for pointers
			if (this.pointerHUDOpacity > 0 && this.pointerHUDStillTimer <= 0) this.pointerHUDOpacity -= 0.005;

			//Draw pointers
			brush.globalAlpha = this.pointerHUDOpacity.toFixed(3);
			brush.textAlign = 'center';
			brush.fillStyle = 'black';
			brush.font = 'bold 40px Times New Roman';
			brush.fillText('⬆️ PROGRESS TO THE BOSS', canvas.width * 0.5, canvas.height * 0.12);

			//Two cases for this pointer since pointer would be cut-off if player was near bottom of canvas window
			if (this.y >= canvas.height - this.spriteHeight * 1.5) brush.fillText('⬅️ BULLET COUNT', this.x + this.spriteWidth * 3.4, this.y - this.spriteHeight * 0.1);
			else brush.fillText('⬅️ BULLET COUNT', this.x + this.spriteWidth * 3.4, this.y + this.spriteHeight * 1.45);

			brush.textAlign = 'right';
			brush.fillText('SCORE ⬇️', canvas.width * 0.985, canvas.height * 0.88);
		} else if (currentLevel == 3) {
			//Fade-out effect for progress bar
			if (this.mainHUDOpacity > 0) this.mainHUDOpacity -= 0.005;
			brush.globalAlpha = this.mainHUDOpacity.toFixed(3);
			brush.fillStyle = 'green';
			brush.fillRect(0, 0, canvas.width, 10);
		}

		//Separate fade-in effect for rest of HUD at start of new game (since everything drawn below remains for duration of game)
		if (currentLevel == 1) {
			if (this.mainHUDOpacity <= 0.5) this.mainHUDOpacity += 0.005;
			brush.globalAlpha = this.mainHUDOpacity.toFixed(3);
		} else brush.globalAlpha = 0.5;

		//Draw player's ammo count (two cases since ammo count would be cut-off if player was near bottom of canvas window)
		brush.textAlign = 'center';
		brush.fillStyle = 'black';
		brush.font = '22px Times New Roman';
		if (this.y >= canvas.height - this.spriteHeight * 1.5) {
			if (this.magazine > 0) brush.fillText(this.magazine + ' / ∞', this.x + this.spriteWidth * 0.45, this.y - this.spriteHeight * 0.15);
			else brush.fillText('🔄️ / ∞', this.x + this.spriteWidth * 0.45, this.y - this.spriteHeight * 0.15);
		} else {
			if (this.magazine > 0) brush.fillText(this.magazine + ' / ∞', this.x + this.spriteWidth * 0.45, this.y + this.spriteHeight * 1.4);
			else brush.fillText('🔄️ / ∞', this.x + this.spriteWidth * 0.45, this.y + this.spriteHeight * 1.4);
		}

		//Draw player's score
		brush.textAlign = 'right';
		brush.font = '30px Times New Roman';
		brush.fillText(this.score + ' PTS', canvas.width * 0.985, canvas.height * 0.97);

		//Draw visual indicator when player is at furthest x-coordinate
		if (this.x + this.spriteWidth >= this.maxX - 3 && currentLevel < 5) {
			brush.globalAlpha = 0.4;
			brush.textAlign = 'center';
			brush.font = 'bold 35px Times New Roman';
			brush.fillText('⛔', canvas.width * 0.6625, canvas.height * 0.165);
			brush.fillText('⛔', canvas.width * 0.6625, canvas.height * 0.545);
			brush.fillText('⛔', canvas.width * 0.6625, canvas.height * 0.9);
		}

		brush.globalAlpha = 1;
	}

	PlayFireAudio() {
		this.fireAudio.play();
	}

	PlayReloadAudio() {
		this.reloadAudio.play();
	}

	PlayReloadedAudio() {
		this.reloadedAudio.play();
	}

	PlayWingAudio() {
		this.wingAudio.play();
	}

	PlayHitAudio() {
		this.hitAudio.play();
	}
}

//Character player must defeat in order to win game
class Boss {
	constructor() {
		this.x = canvas.width;
		this.y = canvas.height * 0.2;
		this.dX = -2.5;
		this.dY = 0;

		//Countdown timer for boss's ability to change directions
		this.dYTimerInitial = 180;
		this.dYTimer = this.dYTimerInitial;

		//Different sprites for each phase of boss battle
		this.imagePhase1 = new Image();
		this.imagePhase1.src = 'img/boss1.png';
		this.imagePhase2 = new Image();
		this.imagePhase2.src = 'img/boss2.png';
		this.imagePhase3 = new Image();
		this.imagePhase3.src = 'img/boss3.png';

		//Coordinates for top-left corner of boss's sprite
		this.spriteX = 0;
		this.spriteY = 0;

		this.spriteWidth = 445.875;
		this.spriteHeight = 300;
		this.spriteSpeedInitial = 14;
		this.spriteSpeed = this.spriteSpeedInitial;
		this.healthInitial = 39;
		this.health = this.healthInitial;
		this.healthBarOpacity = 0;

		//Value stopwatch must reach before first phase of boss battle begins
		this.phase1Start = 1380;

		//Values player must get boss's health down to before next phase of boss battle begins
		this.phase2Start = this.healthInitial * (2 / 3);
		this.phase3Start = this.healthInitial * (1 / 3);

		//Time for boss's death animation
		this.deathAnimationTimerInitial = 250;
		this.deathAnimationTimer = this.deathAnimationTimerInitial;

		//Helps with delay for drawing points added to player's score
		this.deathAddPointsSwitch = false;

		this.hitAudio = document.getElementById('bossHitAudio');
		this.distantCryAudio = document.getElementById('bossDistantCryAudio');
		this.closeCryAudio = document.getElementById('bossCloseCryAudio');
		this.phase1Audio = document.getElementById('bossPhase1Audio');
		this.phase2Audio = document.getElementById('bossPhase2Audio');
		this.phase3Audio = document.getElementById('bossPhase3Audio');
		this.explodeAudio = document.getElementById('bossExplodeAudio');
	}

	Move() {
		let newX = this.x + this.dX;
		let newY = this.y + this.dY;

		//As long as boss is alive...
		if (this.health > 0) {
			//Set boss's movement in y-direction to random value when direction timer reaches 0
			if (this.dYTimer == 0) {
				this.dY = GetRandomNumber(-3, 3);
				this.dYTimer = this.dYTimerInitial;
			} else this.dYTimer--;

			//Movement of boss towards player at start of boss battle
			if (newX > canvas.width - 300) this.x = newX;
			else this.dX = 0;

			//Prevent boss from moving out of canvas window
			if (newY < -100 || newY > canvas.height - 200) this.dY = -this.dY;
			else this.y = newY;
		} else {
			this.y = newY;
			this.x = newX;
		}
	}

	//Drawing of boss's sprite
	Draw() {
		this.Move();

		//Draw different version of boss for each of its phases
		if (this.health >= this.phase2Start) brush.drawImage(this.imagePhase1, this.spriteX, 0, this.spriteWidth, this.spriteHeight, this.x, this.y, this.spriteWidth, this.spriteHeight);
		else if (this.health >= this.phase3Start) brush.drawImage(this.imagePhase2, this.spriteX, 0, this.spriteWidth, this.spriteHeight, this.x, this.y, this.spriteWidth, this.spriteHeight);
		else brush.drawImage(this.imagePhase3, this.spriteX, 0, this.spriteWidth, this.spriteHeight, this.x, this.y, this.spriteWidth, this.spriteHeight);

		SpriteUpdater(this, this.imagePhase1.width);

		//Player's bullets damage boss if boss has health remaining
		if (this.health > 0) {
			for (let i = 0; i < playerBulletsArray.length; i++) {
				//Hitbox for boss
				if (
					playerBulletsArray[i].x >= this.x + this.spriteWidth * 0.4 &&
					playerBulletsArray[i].y >= this.y + this.spriteHeight * 0.11 &&
					playerBulletsArray[i].y <= this.y + this.spriteHeight * 0.85
				) {
					//Draw points added to player's score (two cases since indicator would be cut-off if boss was near top of canvas window)
					if (this.y >= -39) CreateAddPoints(this.x + this.spriteWidth * 0.1, this.y + this.spriteHeight * 0.25, 50, 0);
					else CreateAddPoints(this.x + this.spriteWidth * 0.1, this.y + this.spriteHeight * 0.25 + 200, 50, 0);

					this.health--;

					//Draw blood effects
					CreateBlood(this.x + 175, this.y + 150, GetRandomNumber(1.5, 2), 'red', 2);
					CreateBlood(this.x + 175, this.y + 150, GetRandomNumber(2, 3), 'red', 2);

					this.PlayHitAudio();

					//Get rid of player's bullet
					playerBulletsArray.splice(i, 1);

					i--;
				}
			}
		} else {
			//Do following if there's still time remaining in boss's death animation...
			if (this.deathAnimationTimer > 0) {
				//Draw boss's bullets falling
				for (let i = 0; i < bossBulletsArray.length; i++) {
					bossBulletsArray[i].dY += 0.15;
					bossBulletsArray[i].dX -= 0.075;
				}

				//Draw boss falling
				this.dY += 0.15;
				this.dX -= 0.075;

				//Draw explosion
				CreateBlood(this.x + 175, this.y + 150, GetRandomNumber(2, 3), 'red', 1);
				CreateBlood(this.x + 175, this.y + 150, GetRandomNumber(4, 5), 'pink', 1);

				//Draw points added to player's score if boss has fallen out of canvas window and none of boss's bullets are in canvas window
				if (this.y > canvas.height && bossBulletsArray.length == 0 && !this.deathAddPointsSwitch) {
					CreateAddPoints(this.x + this.spriteWidth * 0.1, canvas.height * 0.96, 3000, 1);

					//Prevent infinite drawing of points added
					this.deathAddPointsSwitch = true;
				}

				this.PlayExplodeAudio();

				//Start transition to victory screen
				if (this.deathAnimationTimer < 22 && canvasTransitionRadius < canvasTransitionRadiusInitial) CanvasTransition();

				this.deathAnimationTimer--;
			} else player.gotWin = true;
		}
	}

	DrawHealthBar() {
		//Fade-in effect at start of boss battle
		if (this.health > 0 && this.healthBarOpacity <= 0.4) this.healthBarOpacity += 0.005;
		//Fade-out effect at end of boss battle
		else if (this.health <= 0 && this.healthBarOpacity > 0) this.healthBarOpacity -= 0.005;

		brush.globalAlpha = this.healthBarOpacity.toFixed(3);

		//Draw outline of health bar
		brush.fillStyle = 'black';
		brush.fillRect(canvas.width * 0.35, canvas.height * 0.9325, canvas.width * 0.3, 20);

		//Draw boss's current health
		brush.fillStyle = 'rgb(255, 0, 0)';
		brush.fillRect(canvas.width * 0.35, canvas.height * 0.9325, (this.health / this.healthInitial) * canvas.width * 0.3, 20);

		//Draw level indicators for different phases of boss
		brush.fillStyle = 'black';
		brush.fillRect(canvas.width * 0.3 * (1 / 3) + canvas.width * 0.35, canvas.height * 0.9325, 3, 20);
		brush.fillRect(canvas.width * 0.3 * (2 / 3) + canvas.width * 0.35, canvas.height * 0.9325, 3, 20);

		brush.globalAlpha = 1;
	}

	PlayHitAudio() {
		this.hitAudio.play();
	}

	PlayDistantCryAudio() {
		this.distantCryAudio.play();
	}

	PlayCloseCryAudio() {
		this.closeCryAudio.play();
	}

	PlayPhase1Audio() {
		if (this.health >= this.phase2Start) this.phase1Audio.play();
		else this.phase1Audio.pause();
	}

	PlayPhase2Audio() {
		if (this.health >= this.phase3Start) this.phase2Audio.play();
		else this.phase2Audio.pause();
	}

	PlayPhase3Audio() {
		if (this.deathAnimationTimer == this.deathAnimationTimerInitial) this.phase3Audio.play();
		else this.phase3Audio.pause();
	}

	PlayExplodeAudio() {
		this.explodeAudio.play();
	}
}

//CPU controlled birds
//Takes x-coordinate, y-coordinate as parameters
class CompBird {
	constructor(x, y) {
		this.x = x;
		this.y = y;
		this.dX = GetRandomNumber(-6, -7);
		this.dY = 0;

		//Different sprites for each bullet it absorbs from player
		this.imagePhase1 = new Image();
		this.imagePhase1.src = 'img/compBird1.png';
		this.imagePhase2 = new Image();
		this.imagePhase2.src = 'img/compBird2.png';
		this.imagePhase3 = new Image();
		this.imagePhase3.src = 'img/compBird3.png';
		this.imagePhase4 = new Image();
		this.imagePhase4.src = 'img/compBird4.png';

		//Coordinates for top-left corner of CPU controlled bird's sprite
		this.spriteX = 0;
		this.spriteY = 0;

		this.spriteWidth = 75;
		this.spriteHeight = 50;
		this.spriteSpeedInitial = GetRandomNumber(2, 4);
		this.spriteSpeed = this.spriteSpeedInitial;
		this.healthInitial = 3;
		this.health = this.healthInitial;
		this.hitAudio = document.getElementById('compBirdHitAudio');
		this.cryAudio = document.getElementById('compBirdCryAudio');
	}

	Move() {
		let newX = this.x + this.dX;
		this.x = newX;
		let newY = this.y + this.dY;
		this.y = newY;
	}

	Draw() {
		this.Move();

		//Draw different version of CPU controlled bird for each bullet it absorbs from player
		if (this.health == this.healthInitial) brush.drawImage(this.imagePhase1, this.spriteX, 0, this.spriteWidth, this.spriteHeight, this.x, this.y, this.spriteWidth, this.spriteHeight);
		else if (this.health >= this.healthInitial * (1 / 2)) brush.drawImage(this.imagePhase2, this.spriteX, 0, this.spriteWidth, this.spriteHeight, this.x, this.y, this.spriteWidth, this.spriteHeight);
		else brush.drawImage(this.imagePhase3, this.spriteX, 0, this.spriteWidth, this.spriteHeight, this.x, this.y, this.spriteWidth, this.spriteHeight);

		SpriteUpdater(this, this.imagePhase1.width);
	}

	PlayHitAudio() {
		this.hitAudio.play();
	}

	PlayCryAudio() {
		this.cryAudio.play();
	}
}

//Bullet fired by player
//Takes x-coordinate, y-coordinate as parameters
class PlayerBullet {
	constructor(x, y) {
		this.x = x;
		this.y = y;
		this.radius = 7;
		this.dX = 13;
		this.dY = 0;
		this.color = 'cyan';
		this.glow = 0.4;
	}

	Move() {
		let newX = this.x + this.dX;
		this.x = newX;
		let newY = this.y + this.dY;
		this.y = newY;
	}

	Draw() {
		this.Move();
		brush.beginPath();

		//Draw glow of player's bullet
		brush.globalAlpha = this.glow.toFixed(3);
		brush.arc(this.x, this.y, this.radius * 1.65, ToRadians(0), ToRadians(360));
		brush.closePath();
		brush.fillStyle = this.color;
		brush.fill();

		//Draw player's bullet itself
		brush.globalAlpha = 1;
		brush.beginPath();
		brush.arc(this.x, this.y, this.radius, ToRadians(0), ToRadians(360));
		brush.closePath();
		brush.fill();
		brush.strokeStyle = 'black';
		brush.lineWidth = 2.5;
		brush.stroke();
	}
}

//Bullet fired by boss
//Takes x-coordinate, y-coordinate, x-direction speed, y-direction speed as parameters
class BossBullet {
	constructor(x, y, dX, dY) {
		this.x = x;
		this.y = y;
		this.dX = dX;
		this.dY = dY;
		this.glowSwitch = true;
		this.glow = 0;
		this.distantFireAudio = document.getElementById('bossBulletDistantFireAudio');
		this.closeFireAudio = document.getElementById('bossBulletCloseFireAudio');
		this.deflectAudio = document.getElementById('bossBulletDeflectAudio');
	}

	Move() {
		let newX = this.x + this.dX;
		this.x = newX;
		let newY = this.y + this.dY;
		this.y = newY;
	}

	Draw() {
		this.Move();

		//Glow effect for boss's bullet
		if (this.glow >= 0.2) this.glowSwitch = true;
		else if (this.glow <= 0) this.glowSwitch = false;
		if (this.glowSwitch) this.glow -= 0.005;
		else if (!this.glowSwitch) this.glow += 0.005;
	}

	PlayDistantFireAudio() {
		this.distantFireAudio.play();
	}

	PlayCloseFireAudio() {
		this.closeFireAudio.play();
	}

	PlayDeflectAudio() {
		this.deflectAudio.play();
	}
}

//Smallest version of boss's bullet (appears in phase 2 of boss battle)
class BossBullet1 extends BossBullet {
	constructor(x, y, dX, dY) {
		super(x, y, dX, dY);
		this.radius = 25;
		this.image = new Image();
		this.image.src = 'img/bossSymbol1.png';
		this.spriteX = 0;
		this.spriteY = 0;
		this.spriteWidth = 34;
		this.spriteHeight = 33;
		this.spriteSpeedInitial = 16;
		this.spriteSpeed = this.spriteSpeedInitial;
	}

	Draw() {
		super.Draw();
		DrawBossBulletLayers(this, 'black', 'red', 'firebrick', 'maroon');
		brush.drawImage(this.image, this.spriteX, 0, this.spriteWidth, this.spriteHeight, this.x - this.spriteWidth * (1 / 2), this.y - this.spriteHeight * (1 / 2), this.spriteWidth, this.spriteHeight);
		SpriteUpdater(this, this.image.width);
	}
}

//Standard version of boss's bullet (appears before boss battle and in phase 1 of boss battle)
class BossBullet2 extends BossBullet {
	constructor(x, y, dX, dY) {
		super(x, y, dX, dY);
		this.radius = 45;
		this.image = new Image();
		this.image.src = 'img/bossSymbol2.png';
		this.spriteX = 0;
		this.spriteY = 0;
		this.spriteWidth = 61;
		this.spriteHeight = 59;
		this.spriteSpeedInitial = 16;
		this.spriteSpeed = this.spriteSpeedInitial;
	}

	Draw() {
		super.Draw();
		DrawBossBulletLayers(this, 'rgb(236, 28, 36)', 'black', 'maroon', 'firebrick');
		brush.drawImage(this.image, this.spriteX, 0, this.spriteWidth, this.spriteHeight, this.x - this.spriteWidth * (1 / 2), this.y - this.spriteHeight * (1 / 2), this.spriteWidth, this.spriteHeight);
		SpriteUpdater(this, this.image.width);
	}
}

//Big version of boss's bullet (appears in phase 2 of boss battle)
class BossBullet3 extends BossBullet {
	constructor(x, y, dX, dY) {
		super(x, y, dX, dY);
		this.radius = 60;
		this.image = new Image();
		this.image.src = 'img/bossSymbol3.png';
		this.spriteX = 0;
		this.spriteY = 0;
		this.spriteWidth = 82;
		this.spriteHeight = 80;
		this.spriteSpeedInitial = 16;
		this.spriteSpeed = this.spriteSpeedInitial;
	}

	Draw() {
		super.Draw();
		DrawBossBulletLayers(this, 'black', 'red', 'firebrick', 'maroon');
		brush.drawImage(this.image, this.spriteX, 0, this.spriteWidth, this.spriteHeight, this.x - this.spriteWidth * (1 / 2), this.y - this.spriteHeight * (1 / 2), this.spriteWidth, this.spriteHeight);
		SpriteUpdater(this, this.image.width);
	}
}

//Huge version of boss's bullet (appears in phase 2 of boss battle)
class BossBullet4 extends BossBullet {
	constructor(x, y, dX, dY) {
		super(x, y, dX, dY);
		this.radius = 80;
		this.image = new Image();
		this.image.src = 'img/bossSymbol4.png';
		this.spriteX = 0;
		this.spriteY = 0;
		this.spriteWidth = 110;
		this.spriteHeight = 107;
		this.spriteSpeedInitial = 16;
		this.spriteSpeed = this.spriteSpeedInitial;
	}

	Draw() {
		super.Draw();
		DrawBossBulletLayers(this, 'black', 'red', 'firebrick', 'maroon');
		brush.drawImage(this.image, this.spriteX, 0, this.spriteWidth, this.spriteHeight, this.x - this.spriteWidth * (1 / 2), this.y - this.spriteHeight * (1 / 2), this.spriteWidth, this.spriteHeight);
		SpriteUpdater(this, this.image.width);
	}
}

//Enormous version of boss's bullet (appears in phase 3 of boss battle)
class BossBullet5 extends BossBullet {
	constructor(x, y, dX, dY) {
		super(x, y, dX, dY);
		this.radius = canvas.height;
		this.image = new Image();
		this.image.src = 'img/bossSymbol5.png';
		this.spriteX = 0;
		this.spriteY = 0;
		this.spriteWidth = 770;
		this.spriteHeight = 750;
		this.spriteSpeedInitial = 16;
		this.spriteSpeed = this.spriteSpeedInitial;
	}

	Draw() {
		super.Draw();
		DrawBossBulletLayers(this, 'black', 'black', 'black', 'black');
		brush.drawImage(this.image, this.spriteX, 0, this.spriteWidth, this.spriteHeight, this.x - this.spriteWidth * (1 / 2), this.y - this.spriteHeight * (1 / 2), this.spriteWidth, this.spriteHeight);
		SpriteUpdater(this, this.image.width);
	}
}

//Blood effects
//Takes x-coordinate, y-coordinate, radius, color as parameters
class Blood {
	constructor(x, y, radius, color) {
		this.x = x;
		this.y = y;
		this.radius = radius;
		this.dX = GetRandomNumber(-13, -10);
		this.dY = GetRandomNumber(-6.5, 7.5);
		this.color = color;
	}

	Move() {
		let newX = this.x + this.dX;
		this.x = newX;
		let newY = this.y + this.dY;
		this.y = newY;
	}

	Draw() {
		this.Move();
		brush.beginPath();
		brush.arc(this.x, this.y, this.radius, ToRadians(0), ToRadians(360));
		brush.closePath();
		brush.fillStyle = this.color;
		brush.fill();
	}
}

//Small visual indicator to show how many points added to player's score after successful hit
//Takes x-coordinate, y-coordinate, number of points to add to player's score as parameters
class AddPoints {
	constructor(x, y, amount) {
		this.x = x;
		this.y = y;

		//Number of points to add to player's score
		this.amount = amount;
		player.score += amount;

		this.opacity = 0.3;
	}

	Draw() {
		if (this.opacity > 0) {
			//Part 1 of fade-out effect
			this.y -= 0.3;

			brush.globalAlpha = this.opacity;
			brush.textAlign = 'left';
			brush.fillStyle = 'black';
			brush.font = '30px Times New Roman';
			brush.fillText(this.amount + '+', this.x, this.y);

			//Part 2 of fade-out effect
			this.opacity -= 0.005;

			brush.globalAlpha = 1;
		}
	}
}

//Converts degrees to radians
//Takes degrees as parameter
function ToRadians(degrees) {
	return (degrees * Math.PI) / 180;
}

//Randomly generates number between a and b
//Takes a, b as parameters
function GetRandomNumber(a, b) {
	if (a > b) {
		small = b;
		large = a;
	} else {
		small = a;
		large = b;
	}
	let number = parseInt(Math.random() * (large - small + 1)) + small;
	return number;
}

//Checks for collision between circle and rectangle
//Takes circle, rectangle as parameters
function CircleRectangleCollision(circle, rectangle) {
	let DEX = Math.abs(circle.x - (rectangle.x + rectangle.spriteWidth * 0.5));
	let DEY = Math.abs(circle.y - (rectangle.y + rectangle.spriteHeight * 0.5));
	let dex = DEX - rectangle.spriteWidth * 0.5;
	let dey = DEY - rectangle.spriteHeight * 0.5;
	if (
		(DEX <= rectangle.spriteWidth * 0.5 && DEY <= rectangle.spriteHeight * 0.5) ||
		(!(DEX > rectangle.spriteWidth * 0.5 + circle.radius) && !(DEY > rectangle.spriteHeight * 0.5 + circle.radius)) ||
		dex * dex + dey * dey <= Math.pow(circle.radius, 2)
	)
		return true;
	else return false;
}

//Checks for collsion between two different circles
//Takes two different circles as parameters
function CircleCircleCollision(circle1, circle2) {
	let dex = circle1.x - circle2.x;
	let dey = circle1.y - circle2.y;
	let dist = Math.sqrt(dex * dex + dey * dey);
	if (dist < circle1.radius + circle2.radius) return true;
	else return false;
}

//Checks for collision between two different rectangles
//Takes two different rectangles as parameters
function RectangleRectangleCollision(rectangle1, rectangle2) {
	if (
		!(
			rectangle1.x > rectangle2.x + rectangle2.spriteWidth ||
			rectangle2.x > rectangle1.x + rectangle1.spriteWidth ||
			rectangle1.y > rectangle2.y + rectangle2.spriteHeight ||
			rectangle2.y > rectangle1.y + rectangle1.spriteHeight
		)
	)
		return true;
	else return false;
}

//Helps to draw design details for boss's bullets
//Takes character, glow color, first layer color, second layer color, third layer color as parameters
function DrawBossBulletLayers(character, glowColor, color1, color2, color3) {
	//Draw glow of boss's bullet
	brush.globalAlpha = character.glow.toFixed(3);
	brush.beginPath();
	brush.arc(character.x, character.y, character.radius * 1.65, ToRadians(0), ToRadians(360));
	brush.closePath();
	brush.fillStyle = glowColor;
	brush.fill();

	//Draw layer
	brush.globalAlpha = 1;
	brush.beginPath();
	brush.arc(character.x, character.y, character.radius, ToRadians(0), ToRadians(360));
	brush.closePath();
	brush.strokeStyle = color1;
	brush.lineWidth = 10;
	brush.stroke();
	brush.fill();

	//Draw layer
	brush.beginPath();
	brush.arc(character.x, character.y, character.radius * 0.75, ToRadians(0), ToRadians(360));
	brush.closePath();
	brush.fillStyle = color2;
	brush.fill();

	//Draw layer
	brush.beginPath();
	brush.arc(character.x, character.y, character.radius * 0.55, ToRadians(0), ToRadians(360));
	brush.closePath();
	brush.fillStyle = color3;
	brush.fill();
}

//Creates boss's bullets
//Takes x-coordinate, y-coordinate, x-direction speed, y-direction speed, allowance to create multiple bullets, version of boss's bullet, frequency of boss's bullet creation as parameters
function CreateBossBullet(x, y, dX, dY, createMultiples, symbolType, creationFrequency) {
	//As long as boss is alive...
	if (boss.deathAnimationTimer == boss.deathAnimationTimerInitial) {
		if (createBossBulletInterval == 0) {
			switch (createMultiples) {
				case false:
					let bossBullet;
					if (symbolType == 2) {
						bossBullet = new BossBullet2(x, y, dX, dY);
						if (currentLevel < 3) bossBullet.PlayDistantFireAudio();
						else bossBullet.PlayCloseFireAudio();
					} else if (symbolType == 5) bossBullet = new BossBullet5(x, y, dX, dY);
					bossBulletsArray.push(bossBullet);
					break;
				case true:
					//Creation of boss's bullet version is randomized
					let bossBulletDecider = GetRandomNumber(0, 2);
					if (bossBulletDecider == 0) {
						for (let i = -0.5; i <= 0.5; i++) {
							let bossBullet = new BossBullet4(x, y, -3, i);
							bossBulletsArray.push(bossBullet);
							if (i == -0.5) bossBullet.PlayCloseFireAudio();
						}
					} else if (bossBulletDecider == 1) {
						for (let i = -0.6; i <= 0.6; i += 0.6) {
							let bossBullet = new BossBullet3(x, y, -3, i);
							bossBulletsArray.push(bossBullet);
							if (i == -0.6) bossBullet.PlayCloseFireAudio();
						}
					} else {
						for (let i = -3; i <= 3; i++) {
							let bossBullet = new BossBullet1(x, y, GetRandomNumber(-3, -1), i);
							bossBulletsArray.push(bossBullet);
							if (i == -3) bossBullet.PlayCloseFireAudio();
						}
					}
					break;
			}
			createBossBulletInterval = creationFrequency;
		} else createBossBulletInterval--;
	}
}

//Creates CPU controlled birds
function CreateCompBird() {
	if (createCompBirdInterval == 0) {
		let compBird = new CompBird(canvas.width + 100, GetRandomNumber(0, canvas.height - 50));
		compBirdsArray.push(compBird);
		compBird.PlayCryAudio();

		//Randomize timer for creation of next bird
		createCompBirdInterval = GetRandomNumber(60, 100);
	} else createCompBirdInterval--;
}

//Creates blood effects
//Takes x-coordinate, y-coordinate, radius, color, number of splatters to create as parameters
function CreateBlood(x, y, radius, color, amount) {
	for (let i = 0; i < amount; i++) {
		bloodArray.push(new Blood(x, y, radius, color));
	}
}

//Creates small visual indicators to show how many points were added to player's score
//Takes x-coordinate, y-coordinate, number of points to add to player's score as parameters
function CreateAddPoints(x, y, amount) {
	addPointsArray.push(new AddPoints(x, y, amount));
}

//Displays player's bullets
//Takes allowance for collision with boss's bullet, allowance for collision with CPU controlled bird as parameters
function DisplayPlayerBullets(withBossBulletCollision, withCompBirdCollision) {
	loop1: for (let i = 0; i < playerBulletsArray.length; i++) {
		playerBulletsArray[i].Draw();

		//Player dies if player collides with own bullet
		if (CircleRectangleCollision(playerBulletsArray[i], player)) {
			player.deathCause = 'YOUR OWN BULLET KILLED YOU';
			player.isDead = true;
			break;
		}

		//If collision with boss's bullet is allowed, player's bullet bounces off of boss's bullet
		if (withBossBulletCollision) {
			for (let j = 0; j < bossBulletsArray.length; j++) {
				if (CircleCircleCollision(playerBulletsArray[i], bossBulletsArray[j])) {
					playerBulletsArray[i].dX = (playerBulletsArray[i].x - bossBulletsArray[j].x) * 0.3;
					playerBulletsArray[i].dY = (playerBulletsArray[i].y - bossBulletsArray[j].y) * 0.3;
					bossBulletsArray[j].PlayDeflectAudio();
				}
			}
		}

		//If collision with CPU controlled bird is allowed, player's bullet damages CPU controlled bird
		if (withCompBirdCollision) {
			for (let j = 0; j < compBirdsArray.length; j++) {
				if (CircleRectangleCollision(playerBulletsArray[i], compBirdsArray[j])) {
					compBirdsArray[j].health--;
					compBirdsArray[j].PlayHitAudio();
					if (compBirdsArray[j].health > 0) {
						//Draw blood effects
						CreateBlood(compBirdsArray[j].x + 25, compBirdsArray[j].y + 30, GetRandomNumber(1.5, 2), 'red', 2);
						CreateBlood(compBirdsArray[j].x + 25, compBirdsArray[j].y + 30, GetRandomNumber(2, 3), 'rgb(0, 140, 255)', 2);

						//Draw points added to player's score if CPU controlled bird has been damaged (two cases since points would be cut-off if bird was near top of canvas window)
						if (compBirdsArray[j].y >= canvas.height * 0.08) CreateAddPoints(compBirdsArray[j].x, compBirdsArray[j].y - compBirdsArray[j].spriteHeight * 0.15, 50, 0);
						else CreateAddPoints(compBirdsArray[j].x, compBirdsArray[j].y + compBirdsArray[j].spriteHeight * 1.4, 50, 0);
					} else {
						//If player's bullet kills CPU controlled bird, draw explosion
						CreateBlood(
							GetRandomNumber(compBirdsArray[j].x + compBirdsArray[j].spriteWidth * 0.1, compBirdsArray[j].x + compBirdsArray[j].spriteWidth * 0.9),
							GetRandomNumber(compBirdsArray[j].y + compBirdsArray[j].spriteHeight * 0.1, compBirdsArray[j].y + compBirdsArray[j].spriteHeight * 0.9),
							GetRandomNumber(1.5, 2),
							'red',
							30
						);
						CreateBlood(
							GetRandomNumber(compBirdsArray[j].x + compBirdsArray[j].spriteWidth * 0.1, compBirdsArray[j].x + compBirdsArray[j].spriteWidth * 0.9),
							GetRandomNumber(compBirdsArray[j].y + compBirdsArray[j].spriteHeight * 0.1, compBirdsArray[j].y + compBirdsArray[j].spriteHeight * 0.9),
							GetRandomNumber(3, 4),
							'pink',
							30
						);
						CreateBlood(
							GetRandomNumber(compBirdsArray[j].x + compBirdsArray[j].spriteWidth * 0.1, compBirdsArray[j].x + compBirdsArray[j].spriteWidth * 0.9),
							GetRandomNumber(compBirdsArray[j].y + compBirdsArray[j].spriteHeight * 0.1, compBirdsArray[j].y + compBirdsArray[j].spriteHeight * 0.9),
							GetRandomNumber(2, 3),
							'rgb(0, 140, 255)',
							20
						);

						//Draw points added to player's score if CPU controlled bird has been killed (two cases since points would be cut-off if bird was near top of canvas window)
						if (compBirdsArray[j].y >= canvas.height * 0.08) CreateAddPoints(compBirdsArray[j].x, compBirdsArray[j].y - compBirdsArray[j].spriteHeight * 0.15, 500, 1);
						else CreateAddPoints(compBirdsArray[j].x, compBirdsArray[j].y + compBirdsArray[j].spriteHeight * 1.4, 500, 1);

						//Get rid of CPU controlled bird
						compBirdsArray.splice(j, 1);

						j--;
					}
					//Get rid of player's bullet
					playerBulletsArray.splice(i, 1);

					i--;
					continue loop1;
				}
			}
		}

		//Get rid of player's bullet if it goes off canvas window
		if (
			playerBulletsArray[i].x + playerBulletsArray[i].radius * 1.65 < 0 ||
			playerBulletsArray[i].x - playerBulletsArray[i].radius * 1.65 > canvas.width ||
			playerBulletsArray[i].y - playerBulletsArray[i].radius * 1.65 > canvas.height ||
			playerBulletsArray[i].y + playerBulletsArray[i].radius * 1.65 < 0
		) {
			playerBulletsArray.splice(i, 1);
			i--;
		}
	}
}

//Displays boss's bullets
//Takes allowance for collision with CPU controlled bird as parameter
function DisplayBossBullets(withCompBirdCollision) {
	for (let i = 0; i < bossBulletsArray.length; i++) {
		bossBulletsArray[i].Draw();

		//Player dies if player collides with boss's bullet
		if (CircleRectangleCollision(bossBulletsArray[i], player)) {
			player.deathCause = "A BOSS'S BULLET KILLED YOU";
			player.isDead = true;
			break;
		}

		//If collision with CPU controlled bird is allowed, boss's bullet kills CPU controlled bird
		if (withCompBirdCollision) {
			for (let j = 0; j < compBirdsArray.length; j++) {
				if (CircleRectangleCollision(bossBulletsArray[i], compBirdsArray[j])) {
					compBirdsArray[j].PlayHitAudio();

					//Draw explosion
					CreateBlood(
						GetRandomNumber(compBirdsArray[j].x + compBirdsArray[j].spriteWidth * 0.1, compBirdsArray[j].x + compBirdsArray[j].spriteWidth * 0.9),
						GetRandomNumber(compBirdsArray[j].y + compBirdsArray[j].spriteHeight * 0.1, compBirdsArray[j].y + compBirdsArray[j].spriteHeight * 0.9),
						GetRandomNumber(1.5, 2),
						'red',
						30
					);
					CreateBlood(
						GetRandomNumber(compBirdsArray[j].x + compBirdsArray[j].spriteWidth * 0.1, compBirdsArray[j].x + compBirdsArray[j].spriteWidth * 0.9),
						GetRandomNumber(compBirdsArray[j].y + compBirdsArray[j].spriteHeight * 0.1, compBirdsArray[j].y + compBirdsArray[j].spriteHeight * 0.9),
						GetRandomNumber(3, 4),
						'pink',
						30
					);
					CreateBlood(
						GetRandomNumber(compBirdsArray[j].x + compBirdsArray[j].spriteWidth * 0.1, compBirdsArray[j].x + compBirdsArray[j].spriteWidth * 0.9),
						GetRandomNumber(compBirdsArray[j].y + compBirdsArray[j].spriteHeight * 0.1, compBirdsArray[j].y + compBirdsArray[j].spriteHeight * 0.9),
						GetRandomNumber(2, 3),
						'rgb(0, 140, 255)',
						20
					);

					//Get rid of CPU controlled bird
					compBirdsArray.splice(j, 1);

					j--;
				}
			}
		}

		//Get rid of boss's bullet if it goes off canvas window
		if (
			bossBulletsArray[i].x + bossBulletsArray[i].radius * 1.65 < 0 ||
			bossBulletsArray[i].x - 100 > canvas.width ||
			bossBulletsArray[i].y - bossBulletsArray[i].radius * 1.65 > canvas.height ||
			bossBulletsArray[i].y + bossBulletsArray[i].radius * 1.65 < 0
		) {
			bossBulletsArray.splice(i, 1);
			i--;
		}
	}
}

//Displays CPU controlled birds
function DisplayCompBirds() {
	for (let i = 0; i < compBirdsArray.length; i++) {
		compBirdsArray[i].Draw();

		//Player dies if player collides with CPU controlled bird
		if (RectangleRectangleCollision(player, compBirdsArray[i])) {
			player.deathCause = 'A BIRD KILLED YOU';
			player.isDead = true;
			break;
		}

		//Get rid of CPU controlled bird if it goes off canvas window
		if (compBirdsArray[i].x + compBirdsArray[i].spriteWidth < 0) {
			compBirdsArray.splice(i, 1);
			i--;
		}
	}
}

//Displays blood effects
function DisplayBlood() {
	for (let i = 0; i < bloodArray.length; i++) {
		bloodArray[i].Draw();
		bloodArray[i].dY += 0.2;

		//Get rid of blood effect if it goes off canvas window
		if (bloodArray[i].x + bloodArray[i].radius < 0 || bloodArray[i].y - bloodArray[i].radius > canvas.height) {
			bloodArray.splice(i, 1);
			i--;
		}
	}
}

//Displays small visual indicators to show how many points were added to player's score
function DisplayAddPoints() {
	for (let i = 0; i < addPointsArray.length; i++) {
		addPointsArray[i].Draw();

		//Get rid of visual indicator if its opacity is 0
		if (addPointsArray[i].opacity <= 0) {
			addPointsArray.splice(i, 1);
			i--;
		}
	}
}

//Tracks current level being played by player
function LevelTracker() {
	if (boss.health < boss.phase3Start) currentLevel = 5;
	else if (boss.health < boss.phase2Start) currentLevel = 4;
	else if (stopWatch >= boss.phase1Start) currentLevel = 3;
	else if (stopWatch >= 650) currentLevel = 2;
	else currentLevel = 1;
}

//Controls all events that occur in each level
function LevelMaker() {
	switch (currentLevel) {
		case 1:
			if (stopWatch == 600) boss.PlayDistantCryAudio();
			if (stopWatch > 280) CreateCompBird();
			CanvasBackground();
			player.Draw();
			DisplayBlood();
			DisplayPlayerBullets(false, true);
			DisplayCompBirds();
			DisplayAddPoints();
			player.DrawHUD();
			player.PlayWingAudio();
			stopWatch++;
			break;
		case 2:
			CreateCompBird();
			CreateBossBullet(canvas.width + 100, GetRandomNumber(60, canvas.height - 60), -8, 0, false, 2, GetRandomNumber(110, 150));
			CanvasBackground();
			player.Draw();
			DisplayBlood();
			DisplayPlayerBullets(true, true);
			DisplayCompBirds();
			DisplayBossBullets(true);
			DisplayAddPoints();
			player.DrawHUD();
			player.PlayWingAudio();
			stopWatch++;
			break;
		case 3:
			if (stopWatch == boss.phase1Start) boss.PlayCloseCryAudio();
			if (stopWatch > boss.phase1Start + 220) CreateBossBullet(boss.x + 100, boss.y + 150, -6, GetRandomNumber(-3.5, 3.5), false, 2, GetRandomNumber(110, 150));
			CanvasBackground();
			player.Draw();
			DisplayBlood();
			DisplayPlayerBullets(true, true);
			DisplayCompBirds();
			DisplayBossBullets(true);
			boss.Draw();
			DisplayAddPoints();
			boss.DrawHealthBar();
			player.DrawHUD();
			player.PlayWingAudio();
			boss.PlayPhase1Audio();
			stopWatch++;
			break;
		case 4:
			CreateBossBullet(boss.x + 120, boss.y + 160, null, null, true, null, 180);
			CanvasBackground();
			player.Draw();
			DisplayBlood();
			DisplayPlayerBullets(true, false);
			DisplayBossBullets(false);
			boss.Draw();
			DisplayAddPoints();
			boss.DrawHealthBar();
			player.DrawHUD();
			player.PlayWingAudio();
			boss.PlayPhase2Audio();
			break;
		case 5:
			if (player.x > 0 && boss.deathAnimationTimer == boss.deathAnimationTimerInitial) player.x -= 3;
			for (let i = 0; i < bossBulletsArray.length - 1; i++) {
				bossBulletsArray[i].dX -= 0.01;
				if (bossBulletsArray[i].dY > 0 && bossBulletsArray[i].dY != 0) bossBulletsArray[i].dY -= 0.01;
				else if (bossBulletsArray[i].dY < 0 && bossBulletsArray[i].dY != 0) bossBulletsArray[i].dY += 0.01;
			}
			CreateBossBullet(-canvas.height - canvas.height * (1 / 2), canvas.height / 2, 1.5, 0, false, 5, 1200);
			CanvasBackground();
			player.Draw();
			DisplayBlood();
			DisplayPlayerBullets(true, false);
			DisplayBossBullets(false);
			boss.Draw();
			DisplayAddPoints();
			boss.DrawHealthBar();
			player.DrawHUD();
			player.PlayWingAudio();
			boss.PlayPhase3Audio();
			break;
	}
	if (canvasTransitionRadius > 0) CanvasTransition();
}

//Prevents focus on HTML buttons
function Blur() {
	document.getElementById('startButton').blur();
	document.getElementById('audioButton').blur();
	document.getElementById('titleButton').blur();
}

//Displays game's title screen
function CanvasTitle() {
	brush.fillStyle = 'rgb(211, 254, 236)';
	brush.fillRect(0, 0, canvas.width, canvas.height);
	let canvasTitle = new Image();
	canvasTitle.src = 'img/canvasTitle.png';
	canvasTitle.onload = function () {
		brush.drawImage(canvasTitle, 0, 0);
	};
	canvasTransitionColor = 'rgb(211, 254, 236)';
}

//Displays game's canvas background
function CanvasBackground() {
	//Clear canvas window
	brush.clearRect(0, 0, canvas.width, canvas.height);

	//Draw background image
	brush.drawImage(canvasBackground1, canvasBackground1X, canvasBackground1Y);
	canvasBackground1X--;
	brush.drawImage(canvasBackground1, canvasBackground1X + canvasBackground1.width, canvasBackground1Y);

	//Draw additional background image
	brush.drawImage(canvasBackground2, canvasBackground2X, canvasBackground2Y);
	canvasBackground2X -= 1.52;
	brush.drawImage(canvasBackground2, canvasBackground2X + canvasBackground2.width, canvasBackground2Y);

	//Loop all background images
	if (canvasBackground1X <= -canvasBackground1.width) canvasBackground1X = 0;
	if (canvasBackground2X <= -canvasBackground2.width) canvasBackground2X = 0;
}

//Displays canvas transition when starting new game
function CanvasTransition() {
	brush.beginPath();
	brush.arc(canvas.width * 0.5, canvas.height * 0.5, canvasTransitionRadius, ToRadians(0), ToRadians(360));
	brush.closePath();
	brush.fillStyle = canvasTransitionColor;
	brush.fill();
	brush.strokeStyle = 'black';
	brush.lineWidth = 2;
	brush.stroke();

	//Default effect
	if (boss.health > 0) canvasTransitionRadius -= 30;
	else {
		//Reverse transition effect if player wins game
		canvasTransitionColor = 'rgb(223, 252, 221)';
		canvasTransitionRadius += 25;
	}
}

//Helps to update sprite animation
//Takes character, character sprite width as parameters
function SpriteUpdater(character, width) {
	if (character.spriteSpeed == 0) {
		//Move to next frame of sprite
		character.spriteX += character.spriteWidth;

		//Once last frame of sprite is reached, move next frame to first frame of sprite
		if (character.spriteX >= width) character.spriteX = 0;

		//Reset timer for sprite's speed
		character.spriteSpeed = character.spriteSpeedInitial;
	} else character.spriteSpeed--;
}

//Controls value and icon for audio button
function AudioButtonValue() {
	if (audioButton.value == '🔇') {
		audioButton.value = '🔊';
		audioButton.innerHTML = '🔊';
	} else {
		audioButton.value = '🔇';
		audioButton.innerHTML = '🔇';
	}
}

//Controls muting and unmuting of game's audio
function AudioController() {
	let elements = document.querySelectorAll('audio');
	if (player.isDead || player.gotWin) {
		[].forEach.call(elements, function (elements) {
			elements.muted = true;
			elements.pause();
		});
	} else if (audioButton.value == '🔇') {
		[].forEach.call(elements, function (elements) {
			elements.muted = true;
		});
	} else {
		[].forEach.call(elements, function (elements) {
			elements.muted = false;
		});
	}
}

//Starts new game
function NewGame() {
	//Disable HTML buttons that can interrupt active game
	document.getElementById('startButton').disabled = true;
	document.getElementById('titleButton').disabled = true;

	//Initial parameters
	canvasBackground1X = 0;
	canvasBackground1Y = 0;
	canvasBackground2X = 0;
	canvasBackground2Y = 0;
	canvasTransitionRadius = canvasTransitionRadiusInitial;
	stopWatch = 0;
	createBossBulletInterval = GetRandomNumber(90, 140);
	createCompBirdInterval = GetRandomNumber(45, 90);
	player = new Player();
	boss = new Boss();
	compBirdsArray = [];
	playerBulletsArray = [];
	bossBulletsArray = [];
	bloodArray = [];
	addPointsArray = [];

	function Animate() {
		LevelTracker();
		LevelMaker();
		AudioController();

		//Game animates if player is alive and player hasn't won game yet
		if (!player.isDead && !player.gotWin) requestAnimationFrame(Animate);
		else {
			//When player wins, stop animating, go to victory screen, renable HTML buttons
			cancelAnimationFrame(refreshCanvas);
			GameResults();
			document.getElementById('startButton').disabled = false;
			document.getElementById('titleButton').disabled = false;
		}
	}

	//Animate next frame of game
	refreshCanvas = requestAnimationFrame(Animate);
}

//Controls what's diplayed after game win or loss
function GameResults() {
	//Unmute to play win or loss audio (all other game audio is muted and stopped at this point)
	let elements = document.querySelectorAll('audio');
	[].forEach.call(elements, function (elements) {
		elements.currentTime = 0;
		elements.muted = false;
	});

	brush.font = '30px Times New Roman';

	//Victory screen
	if (player.gotWin) {
		if (audioButton.value == '🔊') document.getElementById('winAudio').play();
		brush.fillStyle = 'rgb(223, 252, 221)';
		brush.fillRect(0, 0, canvas.width, canvas.height);
		brush.fillStyle = 'rgb(204, 172, 0)';
		let canvasWin = new Image();
		canvasWin.src = 'img/canvasWin.png';
		canvasWin.onload = function () {
			brush.drawImage(canvasWin, 0, 0);
			brush.textAlign = 'right';
			brush.fillText('Score  ', canvas.width * 0.315, canvas.height * 0.75);
			brush.fillText('High Score  ', canvas.width * 0.315, canvas.height * 0.85);
			brush.textAlign = 'left';
			brush.fillText('  ' + player.score + ' PTS', canvas.width * 0.315, canvas.height * 0.75);
			if (player.score > parseInt(localStorage.getItem('highScore'))) localStorage.setItem('highScore', player.score.toString());
			brush.fillText('  ' + localStorage.getItem('highScore') + ' PTS', canvas.width * 0.315, canvas.height * 0.85);
		};
		canvasTransitionColor = 'rgb(223, 252, 221)';
	} else {
		//Loss screen
		if (audioButton.value == '🔊') document.getElementById('playerHitAudio').play();
		brush.fillStyle = 'red';
		brush.fillRect(0, 0, canvas.width, canvas.height);
		brush.fillStyle = 'rgb(236, 28, 36)';
		let canvasDefeat = new Image();
		canvasDefeat.src = 'img/canvasDefeat.png';
		canvasDefeat.onload = function () {
			brush.drawImage(canvasDefeat, 0, 0);
			brush.textAlign = 'center';
			brush.font = '35px Times New Roman';
			brush.fillText(player.deathCause, canvas.width * 0.5, canvas.height * 0.375);
			brush.textAlign = 'right';
			brush.font = '30px Times New Roman';
			brush.fillText('Score  ', canvas.width * 0.5, canvas.height * 0.725);
			brush.fillText('High Score  ', canvas.width * 0.5, canvas.height * 0.825);
			brush.textAlign = 'left';
			brush.fillText('  ' + player.score + ' PTS', canvas.width * 0.5, canvas.height * 0.725);
			if (player.score > parseInt(localStorage.getItem('highScore'))) localStorage.setItem('highScore', player.score.toString());
			brush.fillText('  ' + localStorage.getItem('highScore') + ' PTS', canvas.width * 0.5, canvas.height * 0.825);
		};
		canvasTransitionColor = 'rgb(94, 0, 19)';
	}
}
