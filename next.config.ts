import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Gốc dự án là chính thư mục app/. Không khai báo thì Next đi tìm lockfile ở thư mục cha và có thể chọn nhầm gốc.
  turbopack: { root: __dirname },
  // Ẩn nút tròn của Next ở góc trái dưới: nó đè lên hàng tài khoản trong sidebar.
  devIndicators: false,
};

export default nextConfig;
