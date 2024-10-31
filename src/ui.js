import { getScores, postScore } from './db';
import { getName, setName } from './storage.js';

const table = document.getElementById('table');
const loader = document.getElementById('loader');
const loadingError = document.getElementById('error');

const onLeaderboardOpen = async () => {
	const { error, scores } = await getScores();
	loader.style.display = 'none';

	if (error) {
		loadingError.style.display = 'block';
	} else {
		table.style.display = 'grid';
		const fragment = document.createDocumentFragment();
		scores.forEach(({ name, score }, index) => {
			const rankElement = document.createElement('span');
			rankElement.textContent = index + 1;
			const nameElement = document.createElement('span');
			nameElement.textContent = name;
			const scoreElement = document.createElement('span');
			scoreElement.textContent = score;
			fragment.append(rankElement, nameElement, scoreElement);
		});
		table.appendChild(fragment);
	}
};

const onLeaderboardClose = () => {
	loader.style.display = 'block';
	loadingError.style.display = 'none';
	table.style.display = 'none';
	table.replaceChildren(table.children[0], table.children[1], table.children[2]);
};

[
	{ id: 'info' },
	{ id: 'leaderboard', onOpen: onLeaderboardOpen, onClose: onLeaderboardClose }
].forEach(({ id, onOpen, onClose }) => {
	const dialog = document.getElementById(id);
	const open = document.getElementById(`open-${id}`);
	const [close] = dialog.getElementsByClassName('close');

	const closeDialog = () => {
		dialog.close();
		if (onClose) onClose();
	};

	dialog.addEventListener('click', (event) => {
		if (event.target == dialog) {
			closeDialog();
		}
	});

	open.addEventListener('click', (event) => {
		event.stopPropagation();
		if (dialog.open) {
			closeDialog();
		} else {
			dialog.showModal();
			if (onOpen) onOpen();
		}
	});
	
	close.addEventListener('click', closeDialog);
});

const form = document.getElementById('form');
const formResult = document.getElementById('form-result');
const nameInput = document.getElementById('name');
const submitButton = form.querySelector('button[type="submit"]');

nameInput.value = getName();
submitButton.disabled = !nameInput.checkValidity();

form.addEventListener('submit', async (event) => {
	event.preventDefault();
	submitButton.disabled = true;
	nameInput.disabled = true;
	setName(nameInput.value);
	const score = Number(document.getElementById('score').textContent);
	const error = await postScore(nameInput.value, score);
	if (error) {
		submitButton.disabled = false;
		nameInput.disabled = false;
		formResult.textContent = 'Something went wrong. Try again.';
		formResult.style.color = '#E3170A';
		formResult.style.visibility = 'visible';
	} else {
		formResult.textContent = 'Score submitted!';
		formResult.style.color = '#20C20E';
		formResult.style.visibility = 'visible';
	}
});

nameInput.addEventListener('input', () => {
	submitButton.disabled = !nameInput.checkValidity();
});

nameInput.addEventListener('keydown', (event) => {
	if (!/[a-z0-9@_-]/i.test(event.key)) {
		event.preventDefault();
	}
});
