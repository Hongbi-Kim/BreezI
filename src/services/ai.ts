import fetch from "node-fetch";

export async function generateAIResponse(prompt: string) {
  const response = await fetch("http://localhost:11434/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "llama3",
      prompt,
      stream: false
    }),
  });

  const data = (await response.json()) as { response?: string };
  return data.response?.trim() || "답변을 생성하지 못했어요 😢";
}
