/**
 * @file websocket.ts
 * @description Gestion des connexions temps réel via WebSockets et envoi de notifications.
 */

// Map pour suivre les utilisateurs connectés via WebSocket (userId -> WebSocket)
export const connectedUsers = new Map<number, WebSocket>();

// Heartbeat : intervalle de ping pour détecter les connexions mortes (30 secondes)
const HEARTBEAT_INTERVAL_MS = 30000;
const HEARTBEAT_TIMEOUT_MS = 35000;
export const userLastPong = new Map<number, number>();

let heartbeatInterval: number | null = null;

/**
 * Lance le heartbeat pour nettoyer les sockets mortes.
 */
export function startHeartbeat() {
  if (heartbeatInterval) return;

  heartbeatInterval = setInterval(() => {
    const now = Date.now();
    for (const [userId, socket] of connectedUsers.entries()) {
      const lastPong = userLastPong.get(userId) || 0;
      if (now - lastPong > HEARTBEAT_TIMEOUT_MS) {
        console.log(
          `⚠️ WebSocket zombie détecté pour user ${userId}, déconnexion.`,
        );
        socket.close();
        connectedUsers.delete(userId);
        userLastPong.delete(userId);
      } else {
        try {
          socket.send(JSON.stringify({ type: "ping" }));
        } catch (_err) {
          // Ignorer l'échec de l'envoi de ping (la socket sera nettoyée au prochain timeout)
        }
      }
    }
  }, HEARTBEAT_INTERVAL_MS) as unknown as number;
}

/**
 * Notification WebSocket helper - envoie un message en temps réel à un utilisateur connecté.
 */
export function notifyUser(
  userId: number,
  eventType: string,
  data: Record<string, unknown>,
) {
  const socket = connectedUsers.get(userId);
  if (socket) {
    try {
      socket.send(JSON.stringify({ type: eventType, data }));
    } catch (e) {
      console.error(`⚠️ Erreur d'envoi WS à user ${userId}:`, e);
    }
  }
}
