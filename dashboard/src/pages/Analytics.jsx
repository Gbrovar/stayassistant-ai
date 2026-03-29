import { useContext } from "react"
import { useNavigate } from "react-router-dom"
import { API_URL } from "../api/config"
import useAnalytics from "../hooks/useAnalytics"
import { AppContext } from "../context/AppContext"
import Button from "../components/UI/Button"
import LockedFeature from "../components/monetization/LockedFeature"

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer
} from "recharts"

export default function Analytics() {

  const {
    plan,
    loading,
    totalMessages,
    topIntents,
    peakHours,
    hasData,
    insights,
    aiInsights,
    semanticInsights,
    conversationScore,
    alerts,
    upgradeSignal
  } = useAnalytics()

  const isPro = plan !== "free"
  const { showToast } = useContext(AppContext)
  const navigate = useNavigate()

  const intentData = topIntents.map(i => ({
    name: i.intent,
    value: i.count
  }))

  const hourData = Object.keys(peakHours).map(h => ({
    hour: h,
    messages: Number(peakHours[h])
  }))

  if (loading) {
    return <div className="stack"><p>Loading analytics...</p></div>
  }

  if (!hasData) {
    return (
      <div className="card">
        Analytics will appear once guests start using the assistant.
      </div>
    )
  }

  return (
    <div className="stack">

      {/* KPIs */}
      <div className="kpis">
        <div className="card">
          <div className="label">Total Messages</div>
          <div className="value">{totalMessages}</div>
        </div>

        <div className="card">
          <div className="label">Top Intent</div>
          <div className="value">{topIntents[0]?.intent || "-"}</div>
        </div>

        <div className="card">
          <div className="label">Peak Hour</div>
          <div className="value">
            {Object.entries(peakHours)[0]?.[0] || "-"}:00
          </div>
        </div>

        <div className="card">
          <div className="label">Status</div>
          <div className="value">
            {totalMessages > 0 ? "Active" : "Idle"}
          </div>
        </div>
      </div>

      {/* 🚀 UPGRADE SIGNAL */}
      {upgradeSignal && (
        <div className={`upgrade-card ${upgradeSignal === "upgrade_strong" ? "urgent" : ""}`}>
          <div className="upgrade-content">
            <h3>
              {upgradeSignal === "upgrade_strong"
                ? "🚀 High usage detected"
                : "⚡ Growing usage"}
            </h3>
            <p>
              Upgrade to handle more guests and unlock full performance.
            </p>
          </div>

          <button
            className="upgrade-btn"
            onClick={() => navigate("/billing")}
          >
            Upgrade
          </button>
        </div>
      )}

      {/* ALERTS */}
      {isPro ? (
        alerts.length > 0 && (
          <div className="stack">
            {alerts.map((a, idx) => (
              <div
                key={idx}
                className="card alert"
                style={{
                  borderLeft: a.level === "critical"
                    ? "2px solid #ef4444"
                    : "2px solid #f59e0b"
                }}
              >
                ⚠️ {a.text}
              </div>
            ))}
          </div>
        )
      ) : (
        <div className="card">
          <p>⚠️ Unlock alerts to detect issues automatically</p>
          <Button onClick={() => navigate("/billing")}>
            Upgrade to Pro
          </Button>
        </div>
      )}

      {/* INSIGHTS */}
      {insights.length > 0 && (
        <div className="card">
          <h3>📊 Business Insights</h3>

          {insights.map((i, idx) => (
            <p key={idx} style={{ marginTop: 10 }}>
              {i.text}
            </p>
          ))}
        </div>
      )}

      {/* AI INSIGHTS */}
      {isPro ? (
        aiInsights.length > 0 && (
          <div className="card">
            <h3>🤖 AI Insights</h3>

            {aiInsights.map((text, idx) => (
              <p key={idx} style={{ marginTop: 10 }}>
                {text.replace(/\*\*/g, "")}
              </p>
            ))}
          </div>
        )
      ) : (
        <div className="card">
          <h3>🤖 AI Insights</h3>
          <p>Unlock AI-powered recommendations</p>
          <Button onClick={() => navigate("/billing")}>
            Upgrade to Pro
          </Button>
        </div>
      )}

      {/* CONVERSATION INSIGHTS */}
      {semanticInsights.length > 0 && (
        <div className="card">
          <h3>🧠 Conversation Insights</h3>

          {semanticInsights.map((text, idx) => (
            <p key={idx} style={{ marginTop: 10 }}>
              {text.replace(/\*\*/g, "")}
            </p>
          ))}
        </div>
      )}

      {/* QUALITY */}
      {conversationScore && (
        <div className="card">
          <h3>📊 Conversation Quality</h3>
          <p>Clarity: {conversationScore.clarity?.toFixed(1)} / 10</p>
          <p>Satisfaction: {conversationScore.satisfaction?.toFixed(1)} / 10</p>
          <p>Friction: {conversationScore.friction?.toFixed(1)} / 10</p>
        </div>
      )}

      {/* OPTIMIZATION */}
      <div className="card">
        <h3>⚡ Optimization</h3>

        <button
          className="btn-primary btn-full"
          onClick={async () => {

            const propertyId = localStorage.getItem("propertyId")
            const token = localStorage.getItem("token")

            await fetch(`${API_URL}/analytics/${propertyId}/auto-optimize`, {
              method: "POST",
              headers: { Authorization: `Bearer ${token}` }
            })

            showToast("Optimizations applied 🚀")
          }}
        >
          ⚡ Auto Optimize Property
        </button>
      </div>

      {/* LOCKED ANALYTICS */}
      <LockedFeature title="Unlock advanced analytics">
        <div className="analytics-grid">

          <div className="card">
            <h3>Top guest requests</h3>

            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={intentData}>
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#22c55e" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="card">
            <h3>Peak hours</h3>

            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={hourData}>
                <XAxis dataKey="hour" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="messages" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </div>

        </div>
      </LockedFeature>

    </div>
  )
}