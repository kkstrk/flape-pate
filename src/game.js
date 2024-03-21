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
	loading: 'loading',
	start: 'start',
	playing: 'playing',
	over: 'over',
};
let state = states.loading;
const setState = (nextState) => {
	if (state === nextState) return;
	document.body.classList.remove(state);
	document.body.classList.add(nextState);
	state = nextState;
};

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

	setState(states.playing);

	worker.postMessage({ playing: true });
};

const endGame = () => {
	setState(states.over);

	if (score.value > highScore.value) {
		highScore.update();
	}

	scoreElement.textContent = String(score.value).padStart(String(highScore.value).length, '0');
	highScoreElement.textContent = highScore.value;
};

const play = () => {
	if (state === states.loading) {
		// do nothing
	} else if (state === states.start) {
		startGame();
	} else if (state === states.playing) {
		worker.postMessage({ fly: true });
	} else if (state === states.over) {
		// do nothing
	}
};

worker.addEventListener('message', ({ data }) => {
	if (data.loaded) {
		setState(states.start);

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
			setState(states.start);
			play();
		});
		
		// sfx
		sfxButton.title = 'Mute';
		sfxButton.addEventListener('click', () => {
			sfx = !sfx;
			sfxButton.classList.toggle('muted', !sfx);
			sfxButton.title = sfx ? 'Mute' : 'Unmute';
		});

		const resize = debounce(() => {
			worker.postMessage({ resize: { height: window.innerHeight, width: window.innerWidth } });
			setState(states.start);
		}, 1000);
		const observer = new ResizeObserver(([entry]) => {
			const { contentRect: { height, width } } = entry;
			if (
				canvas.height && canvas.width
				&& (height !== canvas.height || width !== canvas.width)
			) {
				setState(states.loading);
				resize();
			}
		});
		observer.observe(document.body);
	}
	if (data.over) {
		if (state === states.playing) {
			endGame();
		}
	}
	if (data.updateScore) {
		score.update();
		score.draw();
	}
});

const debounce = (callback, ms) => {
	let timeout = null;
	return (...args) => {
		clearTimeout(timeout);
		timeout = setTimeout(callback, ms, ...args);
	};
};
