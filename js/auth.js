// Auth guard — redirect to login if no session
if (!sessionStorage.getItem("elevate_user")) {
  window.location.href = "login.html";
}

/** Get the current logged-in username. */
function getCurrentUser() {
  return sessionStorage.getItem("elevate_user") || "Unknown";
}

/** Log out and redirect to login. */
function logout() {
  sessionStorage.removeItem("elevate_user");
  window.location.href = "login.html";
}
