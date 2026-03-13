export function getToken(){
  return localStorage.getItem("token")
}

export function getPropertyId(){
  return localStorage.getItem("propertyId")
}

export function logout(){
  localStorage.removeItem("token")
  localStorage.removeItem("propertyId")
  window.location.href="/login"
}