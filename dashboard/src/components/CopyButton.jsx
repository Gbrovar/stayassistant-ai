export default function CopyButton({text}){

  function copy(){

    navigator.clipboard.writeText(text)

    alert("Script copied!")

  }

  return(

    <button className="copy-btn" onClick={copy}>
      Copy Script
    </button>

  )

}