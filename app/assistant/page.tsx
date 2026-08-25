import type { Metadata } from "next";
import AssistantPage from "@/components/assistant-page";

export const metadata: Metadata = {
  title: "AI 助手",
  description: "基于站内文章知识库的uswrite智能问答助手",
};

export default function Page() {
  return <AssistantPage />;
}
