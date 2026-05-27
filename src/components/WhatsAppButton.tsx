import { MessageCircle } from "lucide-react";

const WA_NUMBER = "919172782265";
const WA_MSG = encodeURIComponent("Hi, I'm interested in Campus Connect for my college. Can you share more details?");

export default function WhatsAppButton() {
  return (
    <a
      href={`https://wa.me/${WA_NUMBER}?text=${WA_MSG}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat on WhatsApp"
      className="fixed right-4 z-[9999] flex h-12 w-12 items-center justify-center rounded-full bg-action-primary text-action-primary-foreground border border-action-primary shadow-lg transition-transform hover:bg-action-primary-hover active:scale-95"
      style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 24px)" }}
    >
      <MessageCircle className="h-6 w-6" />
    </a>
  );
}
