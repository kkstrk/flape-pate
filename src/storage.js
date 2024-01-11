const HIGH_SCORE_STORAGE_KEY = 'flapepate.highscore';
const NAME_STORAGE_KEY = 'flapepate.name';

export const getScore = () => {
	const score = Number(localStorage.getItem(HIGH_SCORE_STORAGE_KEY));
	return Number.isNaN(score) ? 0 : score;
};

export const setScore = (score) => {
	localStorage.setItem(HIGH_SCORE_STORAGE_KEY, `${score}`);
};

export const getName = () => {
	return localStorage.getItem(NAME_STORAGE_KEY) || '';
};

export const setName = (name) => {
	localStorage.setItem(NAME_STORAGE_KEY, name);
};
