export const GEMINI_TOOLS = [
  {
    functionDeclarations: [
      {
        name: "search_memory",
        description: "Tìm kiếm ký ức/tin nhắn cũ trong lịch sử chat.",
        parameters: {
          type: "OBJECT",
          properties: {
            keyword: { type: "STRING" }
          },
          required: ["keyword"]
        }
      },
      {
        name: "change_theme_color",
        description: "Đổi màu giao diện (hường, tím, tối, đỏ đô, xanh ngọc...).",
        parameters: {
          type: "OBJECT",
          properties: {
            colorName: { type: "STRING" }
          },
          required: ["colorName"]
        }
      },
      {
        name: "get_weather",
        description: "Xem dự báo thời tiết chính xác tại một thành phố.",
        parameters: {
          type: "OBJECT",
          properties: {
            city: { type: "STRING" }
          },
          required: ["city"]
        }
      }
    ]
  }
];