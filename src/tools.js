export const GEMINI_TOOLS = [
  {
    function_declarations: [
      { name: "search_memory", description: "Tìm kiếm ký ức/tin nhắn cũ.", parameters: { type: "OBJECT", properties: { keyword: { type: "STRING" } }, required: ["keyword"] } },
      { name: "change_theme_color", description: "Đổi màu giao diện.", parameters: { type: "OBJECT", properties: { colorName: { type: "STRING" } }, required: ["colorName"] } },
      { name: "get_weather", description: "Xem dự báo thời tiết.", parameters: { type: "OBJECT", properties: { city: { type: "STRING" } }, required: ["city"] } }
    ]
  }
];