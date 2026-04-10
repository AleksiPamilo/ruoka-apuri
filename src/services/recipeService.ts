import { supabase } from './supabaseClient';
import { type Protein } from '../types/protein';

export const getProteins = async (): Promise<Protein[]> => {
    const { data, error } = await supabase
        .from('proteins')
        .select('*')
        .order('label', { ascending: true });

    if (error) {
        console.error('Error fetching proteins:', error);
        return [];
    }

    return data as Protein[];
}