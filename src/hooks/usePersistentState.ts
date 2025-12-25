import { useState, useEffect } from 'react';

export const usePersistentState = <T,>(key: string, initialValue: T): [T, React.Dispatch<React.SetStateAction<T>>] => {
    const [state, setState] = useState<T>(() => {
        try {
            if (typeof window !== 'undefined') {
                const item = window.localStorage.getItem(key);
                return item ? JSON.parse(item) : initialValue;
            }
            return initialValue;
        } catch (error) {
            console.error(error);
            return initialValue;
        }
    });

    useEffect(() => {
        try {
            if (typeof window !== 'undefined') {
                window.localStorage.setItem(key, JSON.stringify(state));
            }
        } catch (error) {
            console.error(error);
        }
    }, [key, state]);

    return [state, setState];
};
