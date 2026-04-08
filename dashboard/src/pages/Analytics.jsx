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
    return <div className="stack-lg"><p>Loading analytics...</p></div>
  }

  if (!hasData) {
    return (
      <div className="card-v2">
        Analytics will appear once guests start using the assistant.
      </div>
    )
  }

  return (
    <div className="stack-lg">

      {/* KPIs */}
      <div className="grid-dashboard">
        <div className="kpi-card col-3">
          <div className="kpi-label">Total Messages</div>
          <div className="kpi-value-lg">{totalMessages}</div>
        </div>

        <div className="kpi-card col-3">
          <div className="kpi-label">Top Intent</div>
          <div className="kpi-value-lg">{topIntents[0]?.intent || "-"}</div>
        </div>

        <div className="kpi-card col-3">
          <div className="kpi-label">Peak Hour</div>
          <div className="kpi-value-lg">
            {Object.entries(peakHours)[0]?.[0] || "-"}:00
          </div>
        </div>

        <div className="kpi-card col-3">
          <div className="kpi-label">Status</div>
          <div className="kpi-value-lg">
            {totalMessages > 0 ? "Active" : "Idle"}
          </div>
        </div>
      </div>

      {/* 🚀 UPGRADE SIGNAL */}
      {upgradeSignal && (
        <div className={`card-v2 card-highlight upgrade-card ${upgradeSignal === "upgrade_strong" ? "urgent" : ""}`}>
          <div className="upgrade-content">
            <h3 className="title-md">
              {upgradeSignal === "upgrade_strong"
                ? "High usage detected"
                : "Growing usage"}
            </h3>
            <p>
              Upgrade to handle more guests and unlock full performance.
            </p>
          </div>

          <Button onClick={() => navigate("/billing")}>
            Upgrade
          </Button>
        </div>
      )}

      {/* ALERTS */}
      {isPro ? (
        alerts.length > 0 && (
          <div className="stack-md">
            {alerts.map((a, idx) => {
              const level = a.level === "critical" ? "danger" : a.level

              return (
                <div
                  key={idx}
                  className={`card-v2 alert alert-${level}`}
                >
                  ⚠️ {a.text}
                </div>
              )
            })}
          </div>
        )
      ) : (
        <div className="card-v2">
          <p>Unlock alerts to detect issues automatically</p>
          <Button onClick={() => navigate("/billing")}>
            Upgrade to Pro
          </Button>
        </div>
      )}

      {/* BUSINESS INSIGHTS */}
      {insights.length > 0 && (
        <div className="card-v2">
          <h3 className="title-md">Business Insights</h3>

          <div className="stack-md">
            {insights.map((i, idx) => (
              <p key={idx}>{i.text}</p>
            ))}
          </div>
        </div>
      )}

      {/* AI INSIGHTS */}
      {isPro ? (
        aiInsights.length > 0 && (
          <div className="card-v2">
            <h3 className="title-md">AI Insights</h3>

            <div className="stack-md">
              {aiInsights.map((text, idx) => (
                <p key={idx}>
                  {text.replace(/\*\*/g, "")}
                </p>
              ))}
            </div>
          </div>
        )
      ) : (
        <div className="card-v2">
          <h3 className="title-md">AI Insights</h3>
          <p>Unlock AI-powered recommendations</p>
          <Button onClick={() => navigate("/billing")}>
            Upgrade to Pro
          </Button>
        </div>
      )}

      {/* CONVERSATION INSIGHTS */}
      {semanticInsights.length > 0 && (
        <div className="card-v2">
          <h3 className="title-md">Conversation Insights</h3>

          <div className="stack-md">
            {semanticInsights.map((text, idx) => (
              <p key={idx}>
                {text.replace(/\*\*/g, "")}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* QUALITY */}
      {conversationScore && (
        <div className="card-v2">
          <h3 className="title-md">Conversation Quality</h3>

          <div className="stack-md">
            <p>Clarity: {conversationScore.clarity?.toFixed(1)} / 10</p>
            <p>Satisfaction: {conversationScore.satisfaction?.toFixed(1)} / 10</p>
            <p>Friction: {conversationScore.friction?.toFixed(1)} / 10</p>
          </div>
        </div>
      )}

      {/* OPTIMIZATION */}
      <div className="card-v2">
        <h3 className="title-md">Optimization</h3>

        <Button
          variant="primary"
          full
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
          Auto Optimize Property
        </Button>
      </div>

      {/* LOCKED ANALYTICS */}
      <LockedFeature title="Unlock advanced analytics">
        <div className="grid grid-2">

          <div className="card-v2">
            <h3 className="title-md">Top guest requests</h3>

            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={intentData}>
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#22c55e" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="card-v2">
            <h3 className="title-md">Peak hours</h3>

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