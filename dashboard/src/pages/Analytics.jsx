import { useEffect, useState } from "react"
import { API_URL } from "../api/config"
import useAnalytics from "../hooks/useAnalytics"
import { useContext } from "react";
import { AppContext } from "../context/AppContext";

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

  const { showToast } = useContext(AppContext);

  /* --- PREPARE CHART DATA --- */

  const intentData = topIntents.map(i => ({
    name: i.intent,
    value: i.count
  }))

  const hourData = Object.keys(peakHours).map(h => ({
    hour: h,
    messages: Number(peakHours[h])
  }))

  if (loading) {

    return (
      <div className="stack">
        <p>Loading analytics...</p>
      </div>
    )

  }

  if (!hasData) {

    return (
      <div>
        <h2>Analytics</h2>

        <div className="analytics-card">
          Analytics will appear once guests start using the assistant.
        </div>

      </div>
    )

  }

  return (

    <div>

      <h2>Analytics</h2>

      {/* 🚀 UPGRADE SIGNAL */}

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

      {upgradeSignal === "upgrade_soft" && (
        <div style={{
          background: "#1e3a8a",
          color: "white",
          padding: 14,
          borderRadius: 8,
          marginTop: 20
        }}>
          ⚡ Your property is getting good traction.
          Consider upgrading to handle more guest requests smoothly.
        </div>
      )}

      {upgradeSignal === "upgrade_strong" && (
        <div style={{
          background: "#7f1d1d",
          color: "white",
          padding: 14,
          borderRadius: 8,
          marginTop: 20
        }}>
          🚀 High usage detected.
          Upgrade now to avoid service interruptions.
        </div>
      )}

      {/* 🔥 URGENCY BOOST */}

      {upgradeSignal === "upgrade_strong" && (
        <div style={{
          marginTop: 10,
          padding: 12,
          borderRadius: 8,
          background: "#dc2626",
          color: "white",
          fontWeight: "bold"
        }}>
          ⚠️ Risk of degraded responses — upgrade recommended
        </div>
      )}

      {/* 💰 UPGRADE IMPACT CARD */}

      {upgradeSignal && (
        <div style={{
          marginTop: 20,
          padding: 20,
          borderRadius: 12,
          background: "#0f172a",
          color: "white"
        }}>

          <h3 style={{ marginBottom: 10 }}>
            🚀 Unlock more value from your concierge
          </h3>

          <p style={{ opacity: 0.8 }}>
            You're approaching system limits. Upgrading ensures:
          </p>

          <ul style={{ marginTop: 10, paddingLeft: 20 }}>
            <li>✔️ More guest conversations</li>
            <li>✔️ Faster AI responses</li>
            <li>✔️ Advanced insights & automation</li>
          </ul>

          <button
            style={{
              marginTop: 15,
              background: "#22c55e",
              color: "black",
              padding: "10px 16px",
              borderRadius: 8,
              fontWeight: "bold",
              cursor: "pointer"
            }}
            onClick={() => window.location.href = "/dashboard/billing"}
          >
            Upgrade Plan
          </button>

        </div>
      )}

      {isPro ? (

        alerts.length > 0 && (
          <div style={{ marginTop: 20 }}>
            {alerts.map((a, idx) => (
              <div
                key={idx}
                style={{
                  background: a.level === "critical" ? "#7f1d1d" : "#78350f",
                  padding: 12,
                  borderRadius: 8,
                  marginBottom: 10
                }}
              >
                ⚠️ {a.text}
              </div>
            ))}
          </div>
        )

      ) : (

        <div className="analytics-card" style={{ marginTop: 20 }}>
          <p>⚠️ Unlock alerts to detect issues automatically</p>
          <button onClick={() => window.location.href = "/dashboard/billing"}>
            Upgrade to Pro
          </button>
        </div>

      )}

      {insights.length > 0 && (
        <div className="analytics-card" style={{ marginTop: 20 }}>

          <h3>📊 Business Insights</h3>

          {insights.map((i, idx) => (
            <p key={idx} style={{ marginTop: 10 }}>
              {i.text}
            </p>
          ))}

        </div>
      )}

      {isPro ? (

        aiInsights.length > 0 && (
          <div className="analytics-card" style={{ marginTop: 20 }}>
            <h3>🤖 AI Insights</h3>

            {aiInsights.map((text, idx) => (
              <div key={idx} style={{ marginTop: 15 }}>
                <p>{text.replace(/\*\*/g, "")}</p>
              </div>
            ))}
          </div>
        )

      ) : (

        <div className="analytics-card" style={{ marginTop: 20 }}>
          <h3>🤖 AI Insights</h3>
          <p>Unlock AI-powered recommendations to improve your property</p>

          <button onClick={() => window.location.href = "/dashboard/billing"}>
            Upgrade to Pro
          </button>
        </div>

      )}

      {semanticInsights.length > 0 && (
        <div className="analytics-card" style={{ marginTop: 20 }}>

          <h3>🧠 Conversation Insights</h3>

          {semanticInsights.map((text, idx) => (
            <div key={idx} style={{ marginTop: 15 }}>
              <p>{text.replace(/\*\*/g, "")}</p>
            </div>
          ))}

        </div>
      )}

      {conversationScore && (
        <div className="analytics-card" style={{ marginTop: 20 }}>

          <h3>📊 Conversation Quality</h3>

          <p>Clarity: {conversationScore.clarity?.toFixed(1)} / 10</p>
          <p>Satisfaction: {conversationScore.satisfaction?.toFixed(1)} / 10</p>
          <p>Friction: {conversationScore.friction?.toFixed(1)} / 10</p>

        </div>
      )}

      <div className="card">

        <h3>⚡ Optimization</h3>

        <p>Improve your assistant performance automatically</p>

        <button
          className="btn-primary btn-full"
          onClick={async () => {

            const propertyId = localStorage.getItem("propertyId")
            const token = localStorage.getItem("token")

            const res = await fetch(
              `${API_URL}/analytics/${propertyId}/auto-optimize`,
              {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${token}`
                }
              }
            )

            await res.json()

            showToast("Optimizations applied 🚀")
            window.location.reload()

          }}
        >
          ⚡ Auto Optimize Property
        </button>

      </div>

      <div className="analytics-grid">

        {/* TOP INTENTS */}
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

        {/* PEAK HOURS */}
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

    </div>

  )

}