import { useState, useEffect } from 'react';

/**
 * Zustand persist와 SSR/SSG 환경(Next.js)에서 발생하는 
 * Hydration Mismatch 에러를 방지하기 위한 커스텀 훅.
 */
export const useStore = <T, F>(
    store: (callback: (state: T) => unknown) => unknown,
    callback: (state: T) => F
) => {
    const result = store(callback) as F;
    const [data, setData] = useState<F>();

    useEffect(() => {
        setData(result);
    }, [result]);

    return data;
};
