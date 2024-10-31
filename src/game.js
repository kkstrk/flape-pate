import {
	getScore,
	setScore,
	getSfx,
	setSfx,
} from './storage.js';

// html elements
const sfxButton = document.getElementById('sfx');
const leaderboardButton = document.getElementById('open-leaderboard');
const replayButton = document.getElementById('replay');
const scoreElement = document.getElementById('score');
const highScoreElement = document.getElementById('high-score');
const nameInput = document.getElementById('name');
const submitButton = document.getElementById('form').querySelector('button[type="submit"]');
const currentScoreElement = document.getElementById('playing-ui');
const formResultElement = document.getElementById('form-result');

// offscreen canvas
const canvas = document.querySelector('canvas');
const offscreen = canvas.transferControlToOffscreen();
offscreen.width = window.innerWidth;
offscreen.height = window.innerHeight;

// web worker
const worker = new Worker(new URL('./worker', import.meta.url), { type: 'module' });
worker.postMessage({ canvas: offscreen }, [offscreen]);

// audio
const backgroundAudio = document.getElementById('bg-audio');
backgroundAudio.volume = 0.25;

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

	// start audio if autoplay didn't work
	if (getSfx() && (backgroundAudio.paused || !backgroundAudio.currentTime)) {
		backgroundAudio.play();
	}
};

const endGame = () => {
	setState(states.over);

	if (score.value > highScore.value) {
		highScore.update();
	}

	scoreElement.textContent = String(score.value).padStart(String(highScore.value).length, '0');
	highScoreElement.textContent = highScore.value;
	submitButton.disabled = !nameInput.checkValidity();
	nameInput.disabled = false;
	nameInput.focus();
	formResultElement.style.visibility = 'hidden';
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
			if (state === states.over && document.activeElement !== nameInput) {
				if (code == 'KeyL') {
					leaderboardButton.click();
				}
				if (code == 'KeyR') {
					replayButton.click();
				}
			}
		});

		if ('ontouchstart' in window
			|| navigator.maxTouchPoints > 0
			|| navigator.msMaxTouchPoints > 0) {
			canvas.addEventListener('touchstart', play);
		} else {
			canvas.addEventListener('mousedown', play);
		}

		replayButton.addEventListener('click', () => {
			setState(states.start);
			play();
		});
		
		// sfx
		const initialSfx = getSfx();
		sfxButton.title = initialSfx ? 'Mute' : 'Unmute';
		sfxButton.classList.toggle('muted', !initialSfx);
		sfxButton.addEventListener('click', () => {
			const sfx = !getSfx();
			sfx ? backgroundAudio.play() : backgroundAudio.pause();
			sfxButton.title = sfx ? 'Mute' : 'Unmute';
			sfxButton.classList.toggle('muted', !sfx);
			setSfx(sfx);
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
