import { getScore, setScore } from './storage.js';

// html elements
const sfxButton = document.getElementById('sfx');
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
	ceiling: new Image(),
	ceilingMound: new Image(),
	floor: new Image(),
	floorMound: new Image(),
	pate: new Image(),
};

// animation frames
const fps = 60;
let raf;
let prevFrame = 0;

let sfx = true;

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
		// TODO: use HTML DOM to display score
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

const cave = {
	x: 0,
	ceiling: { height: 16 + 32, padding: 16 },
	floor: { height: 32 + 32, padding: 32 },
	init() {
		this.x = 0;
	},
	draw() {
		ctx.beginPath();
		ctx.rect(0, 0, canvas.width, this.ceiling.padding);
		ctx.rect(0, canvas.height - this.floor.padding, canvas.width, this.floor.padding); 
		ctx.fillStyle = '#352940';
		ctx.fill();
		ctx.closePath();

		let x = this.x;
		while (x < canvas.width) {
			ctx.drawImage(
				images.ceiling,
				x,
				this.ceiling.padding,
				images.ceiling.width,
				images.ceiling.height
			);
			ctx.drawImage(
				images.floor,
				x,
				canvas.height - this.floor.padding - images.floor.height,
				images.floor.width,
				images.floor.height
			);
			x += images.ceiling.width;
		}
	},
};

const rocks = {
	current: 0,
	visible: [],
	vx: 4,
	width: 64,
	gap: { x: 224, y: 192 },
	init() {
		this.current = 0;
		this.visible = [{ x: canvas.width, height: Math.floor(canvas.height * 0.33) }];
	},
	draw() {
		ctx.beginPath();
		this.visible.forEach(({ x, height }) => {
			ctx.rect(x, cave.ceiling.height, this.width, height);
			ctx.rect(x, height + this.gap.y, this.width, canvas.height - height - this.gap.y - cave.floor.height);
		});
		ctx.fillStyle = '#5C486C';
		ctx.fill();
		ctx.closePath();	

		this.visible.forEach(({ x: rockX }) => {
			const x = rockX - images.ceilingMound.width / 2 + this.width / 2;
			ctx.drawImage(
				images.ceilingMound,
				x,
				cave.ceiling.height,
				images.ceilingMound.width,
				images.ceilingMound.height
			);
			ctx.drawImage(
				images.floorMound,
				x,
				canvas.height - cave.floor.height - images.floorMound.height,
				images.floorMound.width,
				images.floorMound.height
			);
		});
	},
};

const pateMaxY = canvas.height - cave.floor.height - pate.height;
const pateMinY = cave.ceiling.height;

const rockMinHeight = 96;
const rockMaxHeight = canvas.height - cave.floor.height - rocks.gap.y - rockMinHeight;

const startGame = () => {
	score.init();
	pate.init();
	rocks.init();
	cave.init();

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
		pate.y <= cave.ceiling.height + currentRock.height
		// collided with bottom rock
        || pate.y + pate.height >= currentRock.height + rocks.gap.y
	)) {
		endGame();
		return;
	}

	// animate fly/fall
	pate.vy += 0.3; // fall velocity
	pate.y = Math.min(pate.y + pate.vy, pateMaxY);

	// animate cave
	if (cave.x % images.ceiling.width === 0) {
		cave.x = -rocks.vx;
	} else {
		cave.x -= rocks.vx;
	}

	// animate rocks
	rocks.visible.forEach((rock) => {
		rock.x -= rocks.vx;
	});

	// remove rocks that are no longer visible
	if (rocks.visible.at(0).x + rocks.width + 32 < 0) { // 32 for mounds
		rocks.visible.shift();
		rocks.current -= 1;
	}

	// add rocks that will become visible
	const lastRock = rocks.visible.at(-1);
	if (lastRock.x + rocks.width < canvas.width) {
		const minHeight = Math.max(lastRock.height - 320, rockMinHeight);
		const maxHeight = Math.min(lastRock.height + 608, rockMaxHeight);

		rocks.visible.push({
			x: lastRock.x + rocks.width + rocks.gap.x,
			height: Math.floor(Math.random() * (maxHeight - minHeight) + minHeight)
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
images.ceiling.src = '/sprites/ceiling.png';
images.ceilingMound.src = '/sprites/ceiling-mound.png';
images.floor.src = '/sprites/floor.png';
images.floorMound.src = '/sprites/floor-mound.png';
images.pate.src = '/sprites/pate.png';

// sfx
sfxButton.title = 'Mute';
sfxButton.addEventListener('click', () => {
	sfx = !sfx;
	sfxButton.classList.toggle('muted', !sfx);
	sfxButton.title = sfx ? 'Mute' : 'Unmute';
});
