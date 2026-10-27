// Nạp biến môi trường từ .env.local / .env cho các script chạy ngoài Next.js
for (const f of [".env.local", ".env"]) {
  try {
    process.loadEnvFile(f);
  } catch {
    // không có file thì bỏ qua
  }
}
