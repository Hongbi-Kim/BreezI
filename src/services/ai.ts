export async function generateAIResponse(history: any[], userMessage: string) {
  const systemPrompt = `
  You are Calmi, a warm and empathetic AI friend.
  Respond shortly in Korean with supportive, comforting messages.
  Use the conversation history for context.
  `;

  const messages = [
    { role: "system", content: systemPrompt },
    ...history.map((m) => ({
      role: m.type === "user" ? "user" : "assistant",
      content: m.message,
    })),
    { role: "user", content: userMessage },
  ];

  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages,
    temperature: 0.8,
    max_tokens: 150,
  });

  return completion.choices[0].message.content || "제가 잘 듣고 있어요.";
}
