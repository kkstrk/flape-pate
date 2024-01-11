import { getScore, setScore } from './storage.js';

// html elements
// const sfxButton = document.getElementById('sfx');
const playButton = document.getElementById('play');
const scoreElement = document.getElementById('score');
const highScoreElement = document.getElementById('high-score');

// html canvas
const canvas = document.querySelector('canvas');
const ctx = canvas.getContext('2d');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// sprites
const images = {
	top: new Image(),
	bottom: new Image(),
	pate: new Image(),
};

// animation frames
const fps = 60;
let raf;
let prevFrame = 0; 

const states = {
	start: 0,
	playing: 1,
	over: 2,
};
let state = states.start;

const score = {
	x: Math.floor(canvas.width / 2),
	y: Math.floor(canvas.height * 0.15),
	current: 0,
	highest: getScore(),
	init() {
		this.current = 0;
	},
	update() {
		this.current += 1;
	},
	draw() {
		// TODO: consider moving score to HTML DOM
		ctx.font = '34px "Press Start 2P"';
		ctx.fillStyle = '#fff';
		ctx.fillText(`${this.current}`, this.x, this.y);
	},
};

const pate = {
	x: 0,
	y: 0,
	vy: 0,
	height: 32,
	width: 37,
	init() {
		this.x = Math.floor(canvas.width * 0.33);
		this.y = Math.floor(canvas.height / 2);
		this.vy = 0;
		this.spriteN = 0;
		this.frame = 0;
	},
	draw() {
		ctx.drawImage(
			images.pate,
			0,
			this.spriteN * (this.height + 9),
			this.width,
			this.height,
			this.x,
			this.y,
			this.width,
			this.height,
		);
		this.frame = (this.frame + 1) % 6;
		if (this.frame % 6 == 0) {
			this.spriteN = (this.spriteN + 1) % 4;
		}
	},
};

const rocks = {
	current: 0,
	visible: [],
	vx: 4,
	width: 60,
	gap: { x: 210, y: 200 },
	init() {
		this.current = 0;
		this.visible = [{ x: canvas.width, height: Math.floor(canvas.height * 0.33) }];
	},
	draw() {
		this.visible.forEach(({ x, height }) => {
			ctx.beginPath();
			ctx.rect(x, 0, this.width, height);
			ctx.rect(x, height + this.gap.y, this.width, canvas.height - height - this.gap.y);
			ctx.fillStyle = '#514062';
			ctx.fill();
			ctx.closePath();
		});
	},
};

// TODO: on each frame move cave by rocks.vx
const cave = {
	height: 34,
	draw() {
		ctx.beginPath();
		ctx.rect(0, 0, canvas.width, this.height);
		ctx.rect(0, canvas.height - this.height, canvas.width, this.height); 
		ctx.fillStyle = '#514062';
		ctx.fill();
		ctx.closePath();

		// let x = 0;
		// while (x < canvas.width) {
		// 	ctx.drawImage(images.top, x, this.height, images.top.width * 2, images.top.height * 2);
		// 	ctx.drawImage(images.bottom, x, canvas.height - this.height - images.bottom.height * 2, images.bottom.width * 2, images.bottom.height * 2);
		// 	x += images.top.width * 2;
		// }
	},
};

const pateMaxY = canvas.height - cave.height - pate.height;
const pateMinY = cave.height;

const rockMinHeight = Math.floor(canvas.height * 0.12);
const rockMaxHeight = Math.floor(canvas.height * 0.88 - rocks.gap.y);

const startGame = () => {
	score.init();
	pate.init();
	rocks.init();

	state = states.playing;
	raf = requestAnimationFrame(draw);

	document.body.classList.toggle('playing');
	document.body.classList.remove('over');
};

const endGame = () => {
	state = states.over;
	cancelAnimationFrame(raf);

	document.body.classList.toggle('playing');
	document.body.classList.add('over');

	const newHighScore = score.current > score.highest;

	// update high score
	if (newHighScore) {
		score.highest = score.current;
		setScore(score.highest);
	}

	scoreElement.textContent = String(score.current).padStart(String(score.highest).length, '0');
	highScoreElement.textContent = score.highest;
};
 
const draw = () => {
	raf = requestAnimationFrame(draw);

	let now = Math.round(fps * Date.now() / 1000);
	if (now === prevFrame) return;
	prevFrame = now;

	ctx.clearRect(0, 0, canvas.width, canvas.height);
	cave.draw();
	rocks.draw();
	pate.draw();

	// collided with ceiling or floor
	if (pate.y <= pateMinY || pate.y >= pateMaxY) {
		endGame();
		return;
	}

	// collided with rock
	const currentRock = rocks.visible.at(rocks.current);
	if (pate.x + pate.width >= currentRock.x && (
		// collided with top rock
		pate.y <= currentRock.height
		// collided with bottom rock
        || pate.y + pate.height >= currentRock.height + rocks.gap.y
	)) {
		endGame();
		return;
	}

	// animate fly/fall
	pate.vy += 0.3; // fall velocity
	pate.y = Math.min(pate.y + pate.vy, pateMaxY);

	// animate rocks
	rocks.visible.forEach((rock) => {
		rock.x -= rocks.vx;
	});

	// remove rocks that are no longer visible
	if (rocks.visible.at(0).x + rocks.width < 0) {
		rocks.visible.shift();
		rocks.current -= 1;
	}

	// add rocks that will become visible
	if (rocks.visible.at(-1).x < canvas.width - rocks.width - rocks.gap.x) {
		rocks.visible.push({
			x: canvas.width,
			// TODO: adjust height in reference to previous rock
			height: Math.random() * (rockMaxHeight - rockMinHeight) + rockMinHeight
		});
	}

	// update score
	if (pate.x > rocks.visible.at(rocks.current).x + rocks.width) {
		score.update();
		rocks.current += 1;
	}

	score.draw();
};

const play = () => {
	if (state === states.start) {
		startGame();
	} else if (state === states.over) {
		// do nothing
	} else if (state === states.playing) {
		pate.vy = -6; // fly velocity
	}
};

// attach handlers for user interaction
window.addEventListener('keydown', ({ code }) => {
	if (code == 'Space' || code == 'KeyW' || code == 'ArrowUp') {
		play();
	}
});

if ('ontouchstart' in window
	|| navigator.maxTouchPoints > 0
	|| navigator.msMaxTouchPoints > 0) {
	canvas.addEventListener('touchstart', play);
} else {
	canvas.addEventListener('mousedown', play);
}

playButton.addEventListener('click', () => {
	state = states.start;
	play();
});

// load images
let loadedImages = 0;
const allImages = Object.values(images);
allImages.forEach((image) => {
	image.addEventListener('load', () => {
		loadedImages += 1;
		if (loadedImages === allImages.length) {
			cave.draw();
		}
	});
});
images.top.src = '/sprites/top.png';
images.bottom.src = '/sprites/bottom.png';
images.pate.src = '/sprites/pate.png';
