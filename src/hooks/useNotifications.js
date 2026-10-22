import { useContext } from "react";
import { NotificationContext } from "../../components/ui/NotificationContext";

// Acessa as ações de notificação e falha cedo caso o hook esteja fora do provedor.
export function useNotifications() {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error("useNotifications deve ser usado dentro de NotificationProvider.");
    }

    return context;
}