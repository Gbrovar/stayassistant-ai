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
      className={`btn btn-primary ${copied ? "btn-copy-success animate" : ""}`}
    >
      {copied ? "Copied ✓" : "Copy script"}
    </button>

  )

}