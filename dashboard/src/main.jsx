import React from "react"
import ReactDOM from "react-dom/client"
import { BrowserRouter } from "react-router-dom"
import { AppProvider } from "./context/AppContext";
import App from "./App"
import "./styles/dashboard.css"


const basename =
  import.meta.env.MODE === "production"
    ? "/dashboard"
    : "/"

ReactDOM.createRoot(document.getElementById("root")).render(

  <React.StrictMode>

    <AppProvider>

      <BrowserRouter basename={basename}>

        <App />

      </BrowserRouter>

    </AppProvider>

  </React.StrictMode>

)