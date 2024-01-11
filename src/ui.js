import { getName, setName } from './storage.js';

['info', 'leaderboard'].forEach((id) => {
	const dialog = document.getElementById(id);
	const open = document.getElementById(`open-${id}`);
	const [close] = dialog.getElementsByClassName('close');

	dialog.addEventListener('click', (event) => {
		if (event.target == dialog) {
			dialog.close();
		}
	});

	open.addEventListener('click', (event) => {
		event.stopPropagation();
		if (dialog.open) {
			dialog.close();
		} else {
			dialog.showModal();
		}
	});
	
	close.addEventListener('click', () => dialog.close());
});

const form = document.getElementById('form');
const input = document.getElementById('name');
const submit = form.querySelector('button[type="submit"]');

input.value = getName();
submit.disabled = !input.checkValidity();

form.addEventListener('submit', (event) => {
	event.preventDefault();
	submit.disabled = true;
	setName(input.value);
});

input.addEventListener('input', () => {
	submit.disabled = !input.checkValidity();
});

input.addEventListener('keydown', (event) => {
	if (!/[a-z0-9@_-]/i.test(event.key)) {
		event.preventDefault();
	}
});
