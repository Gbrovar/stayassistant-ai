import { useContext } from "react";
import { AppContext } from "../context/AppContext";

export default function CopyButton({ text, onClick, onCopy, copied }) {

  const { showToast } = useContext(AppContext);

  function copy() {

    navigator.clipboard.writeText(text)

    showToast("Script copied!");

    if (onClick) onClick()
    if (onCopy) onCopy()

  }

  return (

    <button
      onClick={copy}
      className={`btn btn-primary btn-copy ${copied ? "is-copied" : ""}`}
    >
      <span className="btn-copy-inner">

        <span className="btn-copy-text">
          Copy script
        </span>

        <span className="btn-copy-success-icon">
          ✓
        </span>

      </span>
    </button>

  )

}