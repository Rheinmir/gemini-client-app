export const GEMINI_TOOLS = [
  {
    function_declarations: [
      { name: "search_memory", description: "Tìm kiếm ký ức/tin nhắn cũ.", parameters: { type: "OBJECT", properties: { keyword: { type: "STRING" } }, required: ["keyword"] } },
      { name: "change_theme_color", description: "Đổi màu giao diện.", parameters: { type: "OBJECT", properties: { colorName: { type: "STRING" } }, required: ["colorName"] } },
      { name: "get_weather", description: "Xem dự báo thời tiết CHÍNH XÁC tại thành phố.", parameters: { type: "OBJECT", properties: { city: { type: "STRING" } }, required: ["city"] } },
      { name: "get_app_insights", description: "Lấy dữ liệu phân tích (insights) về hành vi người dùng, tần suất sử dụng tool và độ phổ biến của các theme màu để hiểu hành vi người dùng.", parameters: { type: "OBJECT", properties: {} } }
    ]
  }
];