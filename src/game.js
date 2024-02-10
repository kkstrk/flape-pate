import { getScore, setScore } from './storage.js';

// html elements
const sfxButton = document.getElementById('sfx');
const playButton = document.getElementById('play');
const scoreElement = document.getElementById('score');
const highScoreElement = document.getElementById('high-score');
const currentScoreElement = document.getElementById('playing-ui');

// offscreen canvas
const canvas = document.querySelector('canvas');
const offscreen = canvas.transferControlToOffscreen();
offscreen.width = window.innerWidth;
offscreen.height = window.innerHeight;

// web worker
const worker = new Worker(new URL('./worker', import.meta.url), { type: 'module' });
worker.postMessage({ canvas: offscreen }, [offscreen]);

let sfx = true;

const states = {
	start: 0,
	playing: 1,
	over: 2,
};
let state = states.start;

const score = {
	value: 0,
	init() {
		this.value = 0;
	},
	update() {
		this.value += 1;
	},
	draw() {
		currentScoreElement.textContent = this.value;
	},
};

const highScore = {
	value: getScore(),
	update() {
		this.value = score.value;
		setScore(this.value);
	},
};

const startGame = () => {
	score.init();
	score.draw();

	state = states.playing;
	document.body.classList.replace('start', 'playing');
	document.body.classList.replace('over', 'playing');

	worker.postMessage({ playing: true });
};

const endGame = () => {
	state = states.over;
	document.body.classList.replace('playing', 'over');

	if (score.value > highScore.value) {
		highScore.update();
	}

	scoreElement.textContent = String(score.value).padStart(String(highScore.value).length, '0');
	highScoreElement.textContent = highScore.value;
};

const play = () => {
	if (state === states.start) {
		startGame();
	} else if (state === states.over) {
		// do nothing
	} else if (state === states.playing) {
		worker.postMessage({ fly: true });
	}
};

worker.addEventListener('message', ({ data }) => {
	if (data.loaded) {
		document.body.classList.replace('loading', 'start');

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
		
		// sfx
		sfxButton.title = 'Mute';
		sfxButton.addEventListener('click', () => {
			sfx = !sfx;
			sfxButton.classList.toggle('muted', !sfx);
			sfxButton.title = sfx ? 'Mute' : 'Unmute';
		});
	}
	if (data.over) {
		endGame();
	}
	if (data.updateScore) {
		score.update();
		score.draw();
	}
});
