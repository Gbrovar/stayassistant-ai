export function computeCustomerScore({
  usage,
  cost,
  revenue,
  messages,
  conversations,
  plan
}) {

  const usageRatio = revenue > 0 ? usage / (plan === "pro" ? 1500 : 5000) : usage / 100

  const profit = revenue - cost
  const margin = revenue > 0 ? profit / revenue : -1

  return {
    usage_level:
      usageRatio > 1 ? "very_high" :
      usageRatio > 0.8 ? "high" :
      usageRatio > 0.4 ? "medium" :
      "low",

    revenue_level:
      revenue > 80 ? "high" :
      revenue > 20 ? "medium" :
      "low",

    growth:
      messages > 500 ? "high" :
      messages > 100 ? "medium" :
      "low",

    risk:
      margin < 0 ? "high" :
      margin < 0.3 ? "medium" :
      "low",

    margin,
    profit
  }
}


export function getUpgradeStrategy(score, plan) {

  // 🚨 HIGH RISK (pierdes dinero)
  if (score.risk === "high") {
    return {
      type: "strong",
      message: "Your usage is exceeding your plan. Upgrade recommended.",
      urgency: "high"
    }
  }

  // 🚀 HIGH USAGE
  if (score.usage_level === "very_high" || score.usage_level === "high") {
    return {
      type: "strong",
      message: "You're reaching your limits. Upgrade to avoid interruptions.",
      urgency: "high"
    }
  }

  // 📈 GROWING USER
  if (score.growth === "high" && plan === "free") {
    return {
      type: "soft",
      message: "You're getting great traction. Unlock more with Pro.",
      urgency: "medium"
    }
  }

  return null
}