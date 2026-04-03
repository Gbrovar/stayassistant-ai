export function renderNav() {
    return `
        <nav class="nav">
            <div class="logo">StayAssistant</div>

            <button class="menu-toggle" onclick="toggleMenu()">☰</button>

            <div class="nav-links" id="navLinks">
                <a href="/" class="btn ghost">Home</a>
                <a href="/chat.html" class="btn ghost">Demo</a>
                <a href="/dashboard/login" class="btn ghost">Login</a>
                <a href="/dashboard/register" class="btn primary">Start</a>
            </div>
        </nav>
    `;
}

export function renderFooter(isLanding = false) {

    // 🔥 IMPORTANTE: comportamiento distinto
    if (isLanding) {
        return `
            <div class="footer">
                <div class="footer-inner">
                    <div class="footer-brand">
                        © 2026 StayAssistant AI
                    </div>

                    <div class="footer-links">
                        <a href="/legal/privacy">Privacy</a>
                        <a href="/legal/cookies">Cookies</a>
                        <a href="/legal/terms">Terms</a>
                    </div>
                </div>
            </div>
        `;
    }

    // 🔥 Legal pages → footer normal (NO scroll snap)
    return `
        <div class="footer" style="margin-top:80px;">
            <div class="footer-inner">
                <div>© 2026 StayAssistant AI</div>

                <div class="footer-links">
                    <a href="/legal/privacy">Privacy</a>
                    <a href="/legal/cookies">Cookies</a>
                    <a href="/legal/terms">Terms</a>
                </div>
            </div>
        </div>
    `;
}