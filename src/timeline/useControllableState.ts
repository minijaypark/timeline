import { useMemo, useState } from 'react';

export const useControllableState = <T,>({
  value,
  defaultValue,
  onChange,
}: {
  value: T | undefined;
  defaultValue: T;
  onChange?: (value: T) => void;
}) => {
  const [internalValue, setInternalValue] = useState(defaultValue);

  const resolvedValue = useMemo(
    () => (value === undefined ? internalValue : value),
    [internalValue, value],
  );

  const setValue = (nextValue: T) => {
    if (value === undefined) {
      setInternalValue(nextValue);
    }
    onChange?.(nextValue);
  };

  return [resolvedValue, setValue] as const;
};
