export default function CopyButton({text}){

  function copy(){

    navigator.clipboard.writeText(text)

    alert("Script copied!")

  }

  return(

    <button onClick={copy} className="copy-btn">
      Copy script
    </button>

  )

}