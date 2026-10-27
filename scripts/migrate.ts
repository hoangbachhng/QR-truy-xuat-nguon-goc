import "./load-env";
import { getDb } from "../lib/db";

// Tạo/cập nhật cấu trúc CSDL. Website cũng tự chạy bước này khi khởi động; script dùng khi muốn chạy trước.
getDb()
  .then(() => {
    console.log("CSDL đã sẵn sàng.");
    process.exit(0);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
