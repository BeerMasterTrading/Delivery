function showNotification(message, type = "info") {
  const notification = document.getElementById("notification");
  const text = document.getElementById("notification-text");

  // Reset classes
  notification.className = `notification ${type}`;
  text.textContent = message;

  // Show with animation
  requestAnimationFrame(() => {
    notification.classList.add("show");
  });

  // Hide after 3 seconds
  setTimeout(() => {
    notification.classList.remove("show");
  }, 3000);
}
