// Loads Razorpay's checkout script once, on demand. Resolves when it's ready
// so we can do `new window.Razorpay(...)`.
let loaded = false;

export function loadRazorpay() {
  return new Promise((resolve, reject) => {
    if (loaded || window.Razorpay) return resolve();
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => {
      loaded = true;
      resolve();
    };
    script.onerror = () => reject(new Error("Failed to load Razorpay checkout"));
    document.body.appendChild(script);
  });
}
