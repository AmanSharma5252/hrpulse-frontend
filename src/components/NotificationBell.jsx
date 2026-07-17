import { useState, useEffect } from "react";
import toast from "react-hot-toast";

function NotificationBell({ user }) {
  const [notifs, setNotifs] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    loadNotifications();
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, [user?.id]);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/v1/notifications/unread", {
        headers: { "Authorization": `Bearer ${localStorage.getItem("hp_at")}` }
      });
      const data = await res.json();
      setNotifs(data.notifications || []);
      setUnreadCount(data.notifications?.filter(n => !n.is_read).length || 0);
    } catch (err) {
      console.error("Load notifications error:", err);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id) => {
    try {
      await fetch(`/api/v1/notifications/${id}/read`, {
        method: "PATCH",
        headers: { "Authorization": `Bearer ${localStorage.getItem("hp_at")}` }
      });
      setNotifs(p => p.map(n => n.id === id ? { ...n, is_read: true } : n));
      setUnreadCount(c => Math.max(0, c - 1));
    } catch (err) {
      console.error("Mark as read error:", err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await fetch("/api/v1/notifications/read-all", {
        method: "PATCH",
        headers: { "Authorization": `Bearer ${localStorage.getItem("hp_at")}` }
      });
      setNotifs(p => p.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
      toast.success("All marked as read");
    } catch (err) {
      console.error("Mark all as read error:", err);
    }
  };

  const deleteNotif = async (id) => {
    try {
      await fetch(`/api/v1/notifications/${id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${localStorage.getItem("hp_at")}` }
      });
      setNotifs(p => p.filter(n => n.id !== id));
    } catch (err) {
      console.error("Delete notification error:", err);
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case "checkin": return "✅";
      case "checkout": return "✔️";
      case "early_checkout": return "⚠️";
      case "leave_apply": return "📋";
      default: return "🔔";
    }
  };

  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => {
          setShowDropdown(!showDropdown);
          if (!showDropdown) loadNotifications();
        }}
        style={{
          width: 40,
          height: 40,
          borderRadius: 8,
          background: "var(--s2)",
          border: "1px solid var(--border2)",
          color: "#3ECF8E",
          fontSize: 18,
          cursor: "pointer",
          position: "relative",
          transition: "all .2s",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = "var(--s3)")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "var(--s2)")}
        title={`${unreadCount} unread notifications`}
      >
        🔔
        {unreadCount > 0 && (
          <span
            style={{
              position: "absolute",
              top: -8,
              right: -8,
              background: "#EF4444",
              color: "white",
              borderRadius: "50%",
              width: 24,
              height: 24,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 12,
              fontWeight: 700,
              border: "2px solid var(--s1)",
            }}
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {showDropdown && (
        <div
          style={{
            position: "absolute",
            top: 50,
            right: 0,
            width: 380,
            maxHeight: 500,
            background: "var(--s1)",
            border: "1px solid var(--border2)",
            borderRadius: 12,
            boxShadow: "0 10px 40px rgba(0,0,0,0.3)",
            zIndex: 1000,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              padding: "14px 16px",
              borderBottom: "1px solid var(--border)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              background: "var(--s2)",
            }}
          >
            <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text)" }}>
              🔔 Notifications ({unreadCount})
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                style={{
                  background: "none",
                  border: "none",
                  color: "#3ECF8E",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  padding: "4px 8px",
                }}
              >
                Mark all as read
              </button>
            )}
          </div>

          <div style={{ overflowY: "auto", flex: 1, maxHeight: 420 }}>
            {loading ? (
              <div style={{ padding: 24, textAlign: "center", color: "var(--text3)" }}>
                ⏳ Loading...
              </div>
            ) : notifs.length === 0 ? (
              <div style={{ padding: 24, textAlign: "center", color: "var(--text3)" }}>
                🎉 All caught up!
              </div>
            ) : (
              notifs.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => markAsRead(notif.id)}
                  style={{
                    padding: "12px 16px",
                    borderBottom: "1px solid var(--border)",
                    cursor: "pointer",
                    background: notif.is_read ? "transparent" : "rgba(62,207,142,0.05)",
                    transition: "background .2s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--s2)")}
                  onMouseLeave={(e) => (
                    (e.currentTarget.style.background = notif.is_read ? "transparent" : "rgba(62,207,142,0.05)")
                  )}
                >
                  <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <div style={{ fontSize: 18, flexShrink: 0, marginTop: 2 }}>
                      {getIcon(notif.type)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: notif.is_read ? 400 : 700, fontSize: 13, color: "var(--text)", marginBottom: 4 }}>
                        {notif.title}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--text3)", marginBottom: 6, lineHeight: 1.4 }}>
                        {notif.message}
                      </div>
                      <div style={{ fontSize: 10, color: "var(--text3)" }}>
                        {new Date(notif.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteNotif(notif.id);
                      }}
                      style={{
                        background: "none",
                        border: "none",
                        color: "var(--text3)",
                        fontSize: 14,
                        cursor: "pointer",
                        flexShrink: 0,
                      }}
                    >
                      ✕
                    </button>
                  </div>
                  {!notif.is_read && (
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#3ECF8E", marginTop: 8, marginLeft: 28 }} />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default NotificationBell;
