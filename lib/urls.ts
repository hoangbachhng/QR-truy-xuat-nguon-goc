// Địa chỉ công khai của mô hình. Mã QR in ra chứa địa chỉ này, nên PUBLIC_BASE_URL phải là tên miền cố định.
export function baseUrl() {
  return (process.env.PUBLIC_BASE_URL || "http://localhost:3000").replace(/\/+$/, "");
}

export function publicModelUrl(code: string, fromQr = false) {
  return `${baseUrl()}/m/${encodeURIComponent(code)}${fromQr ? "?qr=1" : ""}`;
}
