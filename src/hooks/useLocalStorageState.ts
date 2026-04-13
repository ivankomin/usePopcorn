import { useState, useEffect, type Dispatch, type SetStateAction } from "react";

export function useLocalStorageState<T>(
  initialState: T,
  key: string,
): [T, Dispatch<SetStateAction<T>>] {
  //only executed on the initial render
  const [value, setValue] = useState<T>(() => { 
    //if there is a value in the local storage, return it as the initial value
    const storedValue = localStorage.getItem(key);
    return storedValue ? (JSON.parse(storedValue) as T) : initialState;
  });

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value));
  }, [value, key]);

  return [value, setValue];
}
