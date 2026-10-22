import { createContext } from "react";

// Compartilha as ações de feedback entre componentes sem repassar props em cada nível.
export const NotificationContext = createContext(null);
