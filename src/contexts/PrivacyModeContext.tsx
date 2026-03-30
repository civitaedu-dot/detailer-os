import { createContext, useContext, useState, useCallback, ReactNode } from "react";

interface PrivacyModeContextType {
  isPrivate: boolean;
  togglePrivacy: () => void;
  maskValue: (value: string) => string;
  maskCurrency: (value: number) => string;
}

const PrivacyModeContext = createContext<PrivacyModeContextType>({
  isPrivate: false,
  togglePrivacy: () => {},
  maskValue: (v) => v,
  maskCurrency: () => "",
});

export const usePrivacyMode = () => useContext(PrivacyModeContext);

const MASK = "•••••";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

export function PrivacyModeProvider({ children }: { children: ReactNode }) {
  const [isPrivate, setIsPrivate] = useState(false);

  const togglePrivacy = useCallback(() => setIsPrivate((p) => !p), []);

  const maskValue = useCallback(
    (value: string) => (isPrivate ? MASK : value),
    [isPrivate]
  );

  const maskCurrency = useCallback(
    (value: number) => (isPrivate ? `R$ ${MASK}` : formatCurrency(value)),
    [isPrivate]
  );

  return (
    <PrivacyModeContext.Provider value={{ isPrivate, togglePrivacy, maskValue, maskCurrency }}>
      {children}
    </PrivacyModeContext.Provider>
  );
}
