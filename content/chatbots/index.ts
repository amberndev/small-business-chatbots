import type { ChatbotConfig, ChatbotId } from "@/lib/types";
import { dental } from "./dental";
import { realEstate } from "./real-estate";
import { homeServices } from "./home-services";

// Consume this registry on the server; pass only ChatbotClientConfig to the UI.
export const chatbots: Record<ChatbotId, ChatbotConfig> = {
  dental,
  "real-estate": realEstate,
  "home-services": homeServices,
};
