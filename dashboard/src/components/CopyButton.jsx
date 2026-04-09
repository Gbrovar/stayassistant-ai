import { useContext } from "react";
import { AppContext } from "../context/AppContext";

export default function CopyButton({text}){

  const { showToast } = useContext(AppContext);

  function copy(){

    navigator.clipboard.writeText(text)

    showToast("Script copied!");

  }

  return(

    <button onClick={copy} className="btn-primary">
      Copy script
    </button>

  )

}