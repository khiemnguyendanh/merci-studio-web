// Danh sách dịch vụ ở form Đặt lịch - dùng chung cho form (client) và API kiểm tra (server).
export const BOOKING_SERVICES = [
  { value: 'Chụp ảnh cưới (Pre-wedding)', label: 'Chụp ảnh cưới (Pre-wedding)' },
  { value: 'Phóng sự ngày cưới', label: 'Phóng sự ngày cưới (ăn hỏi / cưới)' },
  { value: 'Quay phim cưới (Wedding Film)', label: 'Quay phim cưới (Wedding Film)' },
  { value: 'Thuê váy cưới / áo dài / vest', label: 'Thuê váy cưới / áo dài / vest' },
  { value: 'Makeup cô dâu', label: 'Makeup & làm tóc cô dâu' },
  { value: 'Concept / Beauty / Couple', label: 'Chụp concept / beauty / couple' },
  { value: 'Gia đình / Baby', label: 'Chụp gia đình / baby' },
  { value: 'Kỷ yếu / Sự kiện', label: 'Kỷ yếu / Sự kiện' },
  { value: 'Dịch vụ khác / Cần tư vấn thêm', label: 'Dịch vụ khác / Cần tư vấn thêm' }
] as const;

export const DEFAULT_BOOKING_SERVICE = BOOKING_SERVICES[0].value;

// Giá trị của form cũ - vẫn nhận để trang đang mở bản cũ gửi được.
const LEGACY_SERVICES = [
  'Chụp ảnh cưới (Wedding)',
  'Chụp ảnh ngoại cảnh / couple',
  'Phóng sự cưới (Pre-wedding)',
  'Kỷ yếu / Sự kiện / Graduation'
];

export const ALLOWED_BOOKING_SERVICES = new Set<string>([
  ...BOOKING_SERVICES.map((s) => s.value),
  ...LEGACY_SERVICES
]);
