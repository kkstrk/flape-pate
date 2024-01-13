import { createClient } from '@supabase/supabase-js';

const supabase = createClient(import.meta.env.VITE_DB_URL, import.meta.env.VITE_DB_API_KEY);

export const getScores = async () => {
	const { data, error } = await supabase
		.from('scores')
		.select('*')
		.order('score', { ascending: false })
		.range(0, 9);
	return { scores: data, error };
};

export const postScore = async (name, score) => {
	const { error } = await supabase
		.from('scores')
		.insert({ name, score });
	return error;
};
