import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { NotificationContext } from "./NotificationContext"
import "./style/notifications.css"

const NOTIFICATION_DURATION = 2000
const NOTIFICATION_EXIT_DURATION = 320
const MAX_VISIBLE_NOTIFICATIONS = 4

// Respeita a preferência do sistema por movimento reduzido na animação de saída.
function getNotificationExitDuration() {
    const prefersReducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false
    return prefersReducedMotion ? 0 : NOTIFICATION_EXIT_DURATION
}

export function NotificationProvider({ children }) {
    // O estado atual alimenta a renderização; refs permitem coordenar timers sem atraso.
    const [notifications, setNotifications] = useState([])
    const notificationsRef = useRef([])
    const timeoutsRef = useRef(new Map())
    const removalTimeoutsRef = useRef(new Map())
    const nextIdRef = useRef(0)

    // Marca a notificação para saída animada e remove-a após o tempo correspondente.
    const dismissNotification = useCallback((id) => {
        const notification = notificationsRef.current.find((item) => item.id === id)
        if (!notification || notification.isDismissing) return

        window.clearTimeout(timeoutsRef.current.get(id))
        timeoutsRef.current.delete(id)

        const nextNotifications = notificationsRef.current.map((item) => (
            item.id === id ? { ...item, isDismissing: true } : item
        ))
        notificationsRef.current = nextNotifications
        setNotifications(nextNotifications)

        const exitDuration = getNotificationExitDuration()
        removalTimeoutsRef.current.set(id, window.setTimeout(() => {
            removalTimeoutsRef.current.delete(id)
            const remainingNotifications = notificationsRef.current.filter((item) => item.id !== id)
            notificationsRef.current = remainingNotifications
            setNotifications(remainingNotifications)
        }, exitDuration))
    }, [])

    // Adiciona uma notificação, limita a fila visível e agenda sua remoção automática.
    const notify = useCallback((title, message, type = "success") => {
        const id = ++nextIdRef.current
        const nextNotifications = [
            ...notificationsRef.current,
            { id, title, message, type },
        ].slice(-MAX_VISIBLE_NOTIFICATIONS)
        const visibleIds = new Set(nextNotifications.map((notification) => notification.id))

        for (const notificationId of timeoutsRef.current.keys()) {
            if (!visibleIds.has(notificationId)) {
                window.clearTimeout(timeoutsRef.current.get(notificationId))
                timeoutsRef.current.delete(notificationId)
                window.clearTimeout(removalTimeoutsRef.current.get(notificationId))
                removalTimeoutsRef.current.delete(notificationId)
            }
        }

        notificationsRef.current = nextNotifications
        setNotifications(nextNotifications)
        timeoutsRef.current.set(id, window.setTimeout(
            () => dismissNotification(id),
            Math.max(0, NOTIFICATION_DURATION - getNotificationExitDuration())
        ))
    }, [dismissNotification])

    // Expõe ações tipadas estáveis para que os componentes reportem sucesso e erro.
    const notifySuccess = useCallback((title, message) => notify(title, message, "success"), [notify])
    const notifyError = useCallback((title, message) => notify(title, message, "error"), [notify])
    const contextValue = useMemo(() => ({ notifySuccess, notifyError }), [notifySuccess, notifyError])

    // Cancela timers pendentes ao desmontar o provedor para evitar atualizações tardias.
    useEffect(() => () => {
        for (const timeout of timeoutsRef.current.values()) {
            window.clearTimeout(timeout)
        }
        for (const timeout of removalTimeoutsRef.current.values()) {
            window.clearTimeout(timeout)
        }
        timeoutsRef.current.clear()
        removalTimeoutsRef.current.clear()
    }, [])

    return (
        <NotificationContext.Provider value={contextValue}>
            {children}
            {/* Região global que apresenta feedback acessível por leitor de tela. */}
            <div className="notification-viewport" aria-label="Notificações">
                {notifications.map((notification) => (
                    <div
                        key={notification.id}
                        className={`app-notification app-notification--${notification.type}${notification.isDismissing ? " app-notification--dismissing" : ""}`}
                        role={notification.type === "error" ? "alert" : "status"}
                        aria-atomic="true"
                        style={{
                            "--notification-duration": `${NOTIFICATION_DURATION}ms`,
                            "--notification-exit-duration": `${NOTIFICATION_EXIT_DURATION}ms`,
                        }}
                    >
                        <span className="app-notification__icon" aria-hidden="true">
                            {notification.type === "error" ? (
                                <svg viewBox="0 0 24 24"><path d="m7 7 10 10M17 7 7 17" /></svg>
                            ) : (
                                <svg viewBox="0 0 24 24"><path d="m5 12 4.5 4.5L19 7" /></svg>
                            )}
                        </span>
                        <div className="app-notification__content">
                            <p className="app-notification__title">{notification.title}</p>
                            <p className="app-notification__message">{notification.message}</p>
                        </div>
                        <button
                            type="button"
                            className="app-notification__close"
                            onClick={() => dismissNotification(notification.id)}
                            aria-label="Fechar notificação"
                        >
                            <span aria-hidden="true">×</span>
                        </button>
                        <span className="app-notification__timer" aria-hidden="true" />
                    </div>
                ))}
            </div>
        </NotificationContext.Provider>
    )
}
